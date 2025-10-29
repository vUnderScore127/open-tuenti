import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { Header } from '@/components/Header'
import { Users, MessageSquare, MessageCircle, Tag, Calendar, Check, UserX, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { notificationsService, friendshipService, supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { toast } from '@/hooks/use-toast'
import type { Notification, NotificationType } from '@/lib/supabase'

const Notifications = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const notificationType = searchParams.get('type') as NotificationType
  
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [processingNotifications, setProcessingNotifications] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (user?.id) {
      loadNotifications()
    }
  }, [user?.id, notificationType])

  const loadNotifications = async () => {
    if (!user?.id) return
    
    setLoading(true)
    try {
      const allNotifications = await notificationsService.getUserNotifications(user.id)
      
      // Filtrar por tipo si se especifica
      const filteredNotifications = notificationType 
        ? allNotifications.filter(n => n.type === notificationType)
        : allNotifications
      
      setNotifications(filteredNotifications)
    } catch (error) {
      console.error('Error loading notifications:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar las notificaciones",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'friend_request':
        return <Users className="w-6 h-6 text-blue-600" />
      case 'message':
      case 'private_messages': // Agregar este caso
        return <MessageSquare className="w-6 h-6 text-green-600" />
      case 'comment':
        return <MessageCircle className="w-6 h-6 text-purple-600" />
      case 'tag':
        return <Tag className="w-6 h-6 text-orange-600" />
      case 'event_invitation':
        return <Calendar className="w-6 h-6 text-red-600" />
      default:
        return <div className="w-6 h-6 bg-gray-400 rounded-full" />
    }
  }

  const getTypeTitle = (type: NotificationType | null) => {
    const titles = {
      'friend_request': 'Peticiones de Amistad',
      'message': 'Mensajes',
      'private_messages': 'Mensajes Privados', // Agregar este caso
      'comment': 'Comentarios',
      'tag': 'Etiquetas',
      'event_invitation': 'Invitaciones a Eventos'
    }
    return type ? titles[type] || 'Notificaciones' : 'Todas las Notificaciones'
  }

  const handleAcceptFriendRequest = async (notification: Notification) => {
    if (!notification.from_user_id || !user?.id) return
    
    setProcessingNotifications(prev => new Set(prev).add(notification.id))
    
    try {
      // Buscar la solicitud de amistad
      const { data: friendship } = await supabase
        .from('friendships')
        .select('id')
        .eq('user_id', notification.from_user_id)
        .eq('friend_id', user.id)
        .eq('status', 'pending')
        .single()
      
      if (friendship) {
        const success = await friendshipService.acceptFriendRequest(friendship.id)
        
        if (success) {
          // Marcar notificación como leída
          await notificationsService.markAsRead(notification.id)
          
          toast({
            title: "Solicitud aceptada",
            description: `Ahora eres amigo de ${notification.from_user_name}`
          })
          
          // Recargar notificaciones
          loadNotifications()
        } else {
          throw new Error('No se pudo aceptar la solicitud')
        }
      }
    } catch (error) {
      console.error('Error accepting friend request:', error)
      toast({
        title: "Error",
        description: "No se pudo aceptar la solicitud de amistad",
        variant: "destructive"
      })
    } finally {
      setProcessingNotifications(prev => {
        const newSet = new Set(prev)
        newSet.delete(notification.id)
        return newSet
      })
    }
  }

  const handleRejectFriendRequest = async (notification: Notification) => {
    if (!notification.from_user_id || !user?.id) return
    
    setProcessingNotifications(prev => new Set(prev).add(notification.id))
    
    try {
      const { data: friendship } = await supabase
        .from('friendships')
        .select('id')
        .eq('user_id', notification.from_user_id)
        .eq('friend_id', user.id)
        .eq('status', 'pending')
        .single()
      
      if (friendship) {
        const success = await friendshipService.rejectFriendRequest(friendship.id)
        
        if (success) {
          await notificationsService.markAsRead(notification.id)
          
          toast({
            title: "Solicitud rechazada",
            description: `Has rechazado la solicitud de ${notification.from_user_name}`
          })
          
          loadNotifications()
        } else {
          throw new Error('No se pudo rechazar la solicitud')
        }
      }
    } catch (error) {
      console.error('Error rejecting friend request:', error)
      toast({
        title: "Error",
        description: "No se pudo rechazar la solicitud de amistad",
        variant: "destructive"
      })
    } finally {
      setProcessingNotifications(prev => {
        const newSet = new Set(prev)
        newSet.delete(notification.id)
        return newSet
      })
    }
  }

  const handleNotificationClick = (notification: Notification) => {

  if (notification.type === 'friend_request') {
    return 
  }
  
  switch (notification.type) {
    case 'message':
    case 'private_messages': // Agregar este caso
      navigate('/messages')
      break
    case 'comment':
      navigate('/')
      break
    case 'tag':
      navigate('/')
      break
    case 'event_invitation':
      navigate('/')
      break
    default:
      break
  }
}

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) {
      return 'Hace unos minutos'
    } else if (diffInHours < 24) {
      return `Hace ${diffInHours} hora${diffInHours > 1 ? 's' : ''}`
    } else {
      const diffInDays = Math.floor(diffInHours / 24)
      if (diffInDays < 7) {
        return `Hace ${diffInDays} día${diffInDays > 1 ? 's' : ''}`
      } else {
        return date.toLocaleDateString('es-ES', {
          day: 'numeric',
          month: 'short',
          year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        })
      }
    }
  }

  const markAllAsRead = async () => {
    const unreadNotifications = notifications.filter(n => !n.is_read)
    if (unreadNotifications.length === 0) return
    
    try {
      await Promise.all(
        unreadNotifications.map(n => notificationsService.markAsRead(n.id))
      )
      
      toast({
        title: "Notificaciones marcadas",
        description: `${unreadNotifications.length} notificaciones marcadas como leídas`
      })
      
      loadNotifications()
    } catch (error) {
      console.error('Error marking notifications as read:', error)
      toast({
        title: "Error",
        description: "No se pudieron marcar las notificaciones como leídas",
        variant: "destructive"
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header user={user ? {
          name: user.name,
          email: user.email,
          avatar: user.avatar || '/placeholder.svg'
        } : undefined} />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando notificaciones...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user ? {
        name: user.name,
        email: user.email,
        avatar: user.avatar || '/placeholder.svg'
      } : undefined} />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header de la página */}
        <div className="mb-6">
          <div className="flex items-center space-x-4 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/')}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver al inicio</span>
            </Button>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {notificationType && getNotificationIcon(notificationType)}
              <h1 className="text-2xl font-bold text-gray-900">
                {getTypeTitle(notificationType)}
              </h1>
              <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded-full">
                {notifications.length}
              </span>
            </div>
            
            {notifications.some(n => !n.is_read) && (
              <Button
                variant="outline"
                size="sm"
                onClick={markAllAsRead}
              >
                Marcar todas como leídas
              </Button>
            )}
          </div>
        </div>

        {/* Lista de notificaciones */}
        {notifications.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                {notificationType ? getNotificationIcon(notificationType) : <Users className="w-8 h-8 text-gray-400" />}
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay notificaciones
              </h3>
              <p className="text-gray-600">
                {notificationType 
                  ? `No tienes notificaciones de tipo "${getTypeTitle(notificationType)}"`
                  : 'No tienes notificaciones en este momento'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => {
              const isProcessing = processingNotifications.has(notification.id)
              
              return (
                <Card
                  key={notification.id}
                  className={`transition-all hover:shadow-md ${
                    !notification.is_read ? 'border-l-4 border-l-blue-500 bg-blue-50' : ''
                  }`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div 
                          className="cursor-pointer"
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <h3 className="text-lg font-medium text-gray-900 mb-1">
                            {notification.title}
                          </h3>
                          <p className="text-gray-700 mb-2">
                            {notification.description}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatDate(notification.created_at)}
                          </p>
                        </div>
                        
                        {/* Botones específicos para peticiones de amistad */}
                        {notification.type === 'friend_request' && !notification.is_read && (
                          <div className="flex space-x-3 mt-4">
                            <Button
                              onClick={() => handleAcceptFriendRequest(notification)}
                              disabled={isProcessing}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              <Check className="w-4 h-4 mr-2" />
                              Aceptar solicitud
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => handleRejectFriendRequest(notification)}
                              disabled={isProcessing}
                              className="border-red-300 text-red-600 hover:bg-red-50"
                            >
                              <UserX className="w-4 h-4 mr-2" />
                              Rechazar
                            </Button>
                          </div>
                        )}
                        
                        {/* Indicador de petición ya procesada */}
                        {notification.type === 'friend_request' && notification.is_read && (
                          <div className="mt-3 text-sm text-gray-500">
                            ✓ Solicitud procesada
                          </div>
                        )}
                      </div>
                      
                      {!notification.is_read && (
                        <div className="flex-shrink-0">
                          <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default Notifications