import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from './config'

// Configuración segura de Supabase
const supabaseConfig = getSupabaseConfig()
export const supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey)

// Interfaz para el usuario
export interface UserProfile {
  id: string
  first_name: string
  last_name: string
  avatar_url: string
  username: string
  bio: string | null
  location: string | null
  website: string | null
  birth_date: string | null
  phone: string | null
  is_private: boolean
  is_online: boolean
  created_at: string
  updated_at: string
}

// Interfaz para las visitas
export interface UserVisit {
  id: string
  visitor_id: string
  visited_user_id: string
  visited_at: string
  ip_address?: string
  user_agent?: string
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  console.log('🔍 Getting user profile for:', userId)
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error getting user profile:', error)
      return null
    }

    if (!data) {
      console.log('No profile data found')
      return null
    }

    console.log('🔄 Raw profile data:', data)
    return data as UserProfile

  } catch (error) {
    console.error('Error getting user profile:', error)
    return null
  }
}

// Función para registrar una visita (con control de una por día)
export async function recordUserVisit(visitedUserId: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user || user.id === visitedUserId) {
      return false // No registrar visita propia
    }

    // Verificar si ya visitó hoy
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    const { data: existingVisit } = await supabase
      .from('user_visits')
      .select('id')
      .eq('visitor_id', user.id)
      .eq('visited_user_id', visitedUserId)
      .gte('visited_at', `${today}T00:00:00.000Z`)
      .lt('visited_at', `${today}T23:59:59.999Z`)
      .single()

    if (existingVisit) {
      return false // Ya visitó hoy
    }

    const { error } = await supabase
      .from('user_visits')
      .insert({
        visitor_id: user.id,
        visited_user_id: visitedUserId
      })
    
    if (error) {
      console.error('Error recording visit:', error)
      return false
    }
    
    return true
  } catch (error) {
    console.error('Error recording visit:', error)
    return false
  }
}

// Función para obtener las visitas de un usuario
export async function getUserVisits(userId: string, limit: number = 10): Promise<UserVisit[]> {
  const { data, error } = await supabase
    .from('user_visits')
    .select('*')
    .eq('visited_user_id', userId)
    .order('visited_at', { ascending: false })
    .limit(limit)
  
  if (error) {
    console.error('Error getting user visits:', error)
    return []
  }
  
  return data || []
}

// Nueva interfaz para mensajes de chat
export interface ChatMessage {
  unread_count: number
  id: string
  conversation_id: string
  sender_id: string
  receiver_id: string
  content: string
  message_type: 'text' | 'image' | 'file'
  is_read: boolean
  created_at: string
  updated_at: string
  sender?: UserProfile
}

export async function getTotalUnreadCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('chat_messages')
    .select('*', { count: 'exact', head: true })
    .eq('receiver_id', userId)
    .eq('is_read', false)
  
  if (error) {
    console.error('Error getting unread count:', error)
    return 0
  }
  
  return count || 0
}

// Agregar después de la interfaz UserProfile existente
export interface ExtendedUserProfile extends UserProfile {
  email?: string
  gender?: 'boy' | 'girl' | 'prefer_not_to_say' | 'other'
  birth_day?: number
  birth_month?: number
  birth_year?: number
  age?: number
  marital_status?: 'single' | 'married' | 'divorced' | 'widowed' | 'relationship' | ''
  city?: string
  province?: string
  country?: string
  origin_country?: string
  looking_for?: 'looking_for_guy' | 'looking_for_girl' | 'looking_for_both' | 'do_not_show' | ''
}

// Función para actualizar el perfil del usuario
export async function updateUserProfile(userId: string, profileData: Partial<ExtendedUserProfile>): Promise<void> {
  // Calcular edad si se proporcionan los datos de nacimiento
  if (profileData.birth_day && profileData.birth_month && profileData.birth_year) {
    profileData.age = calculateAge(
      profileData.birth_day,
      profileData.birth_month,
      profileData.birth_year
    )
  }

  const { error } = await supabase
    .from('profiles')
    .update(profileData)
    .eq('id', userId)
  
  if (error) {
    console.error('Error updating user profile:', error)
    throw error
  }
}

// Función auxiliar para calcular la edad
function calculateAge(day: number, month: number, year: number): number {
  const today = new Date()
  const birthDate = new Date(year, month - 1, day)
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  
  return age
}

// Función para obtener el perfil extendido del usuario
export async function getExtendedUserProfile(userId: string): Promise<ExtendedUserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  
  if (error) {
    console.error('Error getting extended user profile:', error)
    return null
  }
  
  return data
}

// Función para generar conversation_id consistente
export function generateConversationId(userId1: string, userId2: string): string {
  return userId1 < userId2 ? `${userId1}-${userId2}` : `${userId2}-${userId1}`;
}

// Función para marcar mensajes como leídos
export async function markMessagesAsRead(currentUserId: string, otherUserId: string): Promise<void> {
  const conversationId = generateConversationId(currentUserId, otherUserId);
  
  const { error } = await supabase
    .from('chat_messages')
    .update({ is_read: true })
    .eq('conversation_id', conversationId)
    .eq('receiver_id', currentUserId)
    .eq('is_read', false)
  
  if (error) {
    console.error('Error marking messages as read:', error)
  }
}

// Función para obtener mensajes no leídos agrupados por conversación
export async function getUnreadMessages(userId: string): Promise<{sender_id: string, unread_count: number}[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('sender_id')
    .eq('receiver_id', userId)
    .eq('is_read', false)
  
  if (error) {
    console.error('Error getting unread messages:', error)
    return []
  }
  
  // Agrupar por sender_id y contar
  const unreadCounts = data?.reduce((acc: {[key: string]: number}, message) => {
    acc[message.sender_id] = (acc[message.sender_id] || 0) + 1;
    return acc;
  }, {}) || {};
  
  return Object.entries(unreadCounts).map(([sender_id, unread_count]) => ({
    sender_id,
    unread_count
  }));
}

// Interfaces para el sistema de amistad
export interface Friendship {
  id: string
  user_id: string
  friend_id: string
  status: 'pending' | 'accepted' | 'rejected' | 'blocked'
  created_at: string
  updated_at: string
  user?: UserProfile
  friend?: UserProfile
}

export interface FriendshipRequest {
  id: string
  user_id: string
  friend_id: string
  status: 'pending'
  created_at: string
  requester: UserProfile
}

// Tipos de notificaciones
export type NotificationType = 
  | 'friend_request'
  | 'profile_comment'
  | 'photo_comment'
  | 'photo_tag'
  | 'page_invitation'
  | 'event_invitation'
  | 'private_message'
  | 'status_comment'
  | 'game_invitation'

// Interface para notificaciones
export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message: string
  from_user_id?: string
  related_id?: string
  related_type?: string
  action_url?: string
  metadata?: Record<string, any>
  is_read: boolean
  created_at: string
  updated_at: string
  from_user?: UserProfile
}

// Funciones del sistema de amistad
export async function getFriendshipStatus(userId: string, friendId: string): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('friendships')
      .select('status')
      .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`)
      .single()
    
    if (error || !data) {
      return 'none'
    }
    
    return data.status
  } catch (error) {
    console.error('Error getting friendship status:', error)
    return 'none'
  }
}

export async function sendFriendRequest(fromUserId: string, toUserId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('friendships')
      .insert({
        user_id: fromUserId,
        friend_id: toUserId,
        status: 'pending'
      })
    
    if (error) {
      console.error('Error sending friend request:', error)
      return false
    }
    
    // Crear notificación
    await createFriendRequestNotification(fromUserId, toUserId)
    
    return true
  } catch (error) {
    console.error('Error sending friend request:', error)
    return false
  }
}

export async function acceptFriendRequest(userId: string, friendId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('user_id', friendId)
      .eq('friend_id', userId)
    
    if (error) {
      console.error('Error accepting friend request:', error)
      return false
    }
    
    return true
  } catch (error) {
    console.error('Error accepting friend request:', error)
    return false
  }
}

export async function rejectFriendRequest(userId: string, friendId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('friendships')
      .update({ status: 'rejected' })
      .eq('user_id', friendId)
      .eq('friend_id', userId)
    
    if (error) {
      console.error('Error rejecting friend request:', error)
      return false
    }
    
    return true
  } catch (error) {
    console.error('Error rejecting friend request:', error)
    return false
  }
}

export async function cancelFriendRequest(userId: string, friendId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('user_id', userId)
      .eq('friend_id', friendId)
    
    if (error) {
      console.error('Error canceling friend request:', error)
      return false
    }
    
    return true
  } catch (error) {
    console.error('Error canceling friend request:', error)
    return false
  }
}

export async function getUserFriends(userId: string): Promise<UserProfile[]> {
  try {
    const { data, error } = await supabase
      .from('friendships')
      .select(`
        id,
        user_id,
        friend_id,
        friend:profiles!friend_id(
          id, 
          first_name, 
          last_name, 
          avatar_url, 
          username, 
          bio, 
          location, 
          website, 
          birth_date, 
          phone, 
          is_private, 
          is_online, 
          created_at, 
          updated_at
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'accepted')
    
    if (error) {
      console.error('Error getting user friends:', error)
      return []
    }
    
    return data?.map(item => {
      // Si friend es un array, tomar el primer elemento; si no, usar directamente
      const friend = Array.isArray(item.friend) ? item.friend[0] : item.friend
      return friend
    }).filter(Boolean) || []
  } catch (error) {
    console.error('Error getting user friends:', error)
    return []
  }
}

export async function getPendingFriendRequests(userId: string): Promise<FriendshipRequest[]> {
  try {
    const { data, error } = await supabase
      .from('friendships')
      .select(`
        id,
        user_id,
        friend_id,
        status,
        created_at,
        requester:profiles!user_id(
          id, 
          first_name, 
          last_name, 
          avatar_url, 
          username, 
          bio, 
          location, 
          website, 
          birth_date, 
          phone, 
          is_private, 
          is_online, 
          created_at, 
          updated_at
        )
      `)
      .eq('friend_id', userId)
      .eq('status', 'pending')
    
    if (error) {
      console.error('Error getting pending friend requests:', error)
      return []
    }
    
    return data?.map(item => ({
      id: item.id,
      user_id: item.user_id,
      friend_id: item.friend_id,
      status: item.status as 'pending',
      created_at: item.created_at,
      requester: Array.isArray(item.requester) ? item.requester[0] : item.requester
    })).filter(item => item.requester) || []
  } catch (error) {
    console.error('Error getting pending friend requests:', error)
    return []
  }
}

export async function getSentFriendRequests(userId: string): Promise<FriendshipRequest[]> {
  try {
    const { data, error } = await supabase
      .from('friendships')
      .select(`
        id,
        user_id,
        friend_id,
        status,
        created_at,
        requester:profiles!friend_id(
          id, 
          first_name, 
          last_name, 
          avatar_url, 
          username, 
          bio, 
          location, 
          website, 
          birth_date, 
          phone, 
          is_private, 
          is_online, 
          created_at, 
          updated_at
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'pending')
    
    if (error) {
      console.error('Error getting sent friend requests:', error)
      return []
    }
    
    return data?.map(item => ({
      id: item.id,
      user_id: item.user_id,
      friend_id: item.friend_id,
      status: item.status as 'pending',
      created_at: item.created_at,
      requester: Array.isArray(item.requester) ? item.requester[0] : item.requester
    })).filter(item => item.requester) || []
  } catch (error) {
    console.error('Error getting sent friend requests:', error)
    return []
  }
}

export async function removeFriend(userId: string, friendId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('friendships')
      .delete()
      .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`)
    
    if (error) {
      console.error('Error removing friend:', error)
      return false
    }
    
    return true
  } catch (error) {
    console.error('Error removing friend:', error)
    return false
  }
}

// Funciones para crear diferentes tipos de notificaciones

// 1. Solicitud de amistad
export async function createFriendRequestNotification(fromUserId: string, toUserId: string): Promise<void> {
  try {
    const { data: fromUser } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', fromUserId)
      .single()
    
    if (fromUser) {
      await supabase
        .from('notifications')
        .insert({
          user_id: toUserId,
          type: 'friend_request',
          title: 'Nueva solicitud de amistad',
          message: `${fromUser.first_name} ${fromUser.last_name} te ha enviado una solicitud de amistad`,
          from_user_id: fromUserId,
          action_url: '/notifications?type=friend_request',
          is_read: false
        })
    }
  } catch (error) {
    console.error('Error creating friend request notification:', error)
  }
}

// 2. Comentario en perfil
export async function createProfileCommentNotification(
  fromUserId: string, 
  toUserId: string, 
  commentId: string,
  commentText: string
): Promise<void> {
  try {
    const { data: fromUser } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', fromUserId)
      .single()
    
    if (fromUser) {
      await supabase
        .from('notifications')
        .insert({
          user_id: toUserId,
          type: 'profile_comment',
          title: 'Nuevo comentario en tu perfil',
          message: `${fromUser.first_name} ${fromUser.last_name} comentó en tu perfil: "${commentText.substring(0, 50)}${commentText.length > 50 ? '...' : ''}"`,
          from_user_id: fromUserId,
          related_id: commentId,
          related_type: 'comment',
          action_url: `/profile/${toUserId}#comments`,
          is_read: false
        })
    }
  } catch (error) {
    console.error('Error creating profile comment notification:', error)
  }
}

// 3. Comentario en foto
export async function createPhotoCommentNotification(
  fromUserId: string, 
  toUserId: string, 
  photoId: string,
  commentId: string,
  commentText: string
): Promise<void> {
  try {
    const { data: fromUser } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', fromUserId)
      .single()
    
    if (fromUser) {
      await supabase
        .from('notifications')
        .insert({
          user_id: toUserId,
          type: 'photo_comment',
          title: 'Nuevo comentario en tu foto',
          message: `${fromUser.first_name} ${fromUser.last_name} comentó en tu foto: "${commentText.substring(0, 50)}${commentText.length > 50 ? '...' : ''}"`,
          from_user_id: fromUserId,
          related_id: photoId,
          related_type: 'photo',
          action_url: `/photo/${photoId}`,
          metadata: { comment_id: commentId },
          is_read: false
        })
    }
  } catch (error) {
    console.error('Error creating photo comment notification:', error)
  }
}

// 4. Etiqueta en foto
export async function createPhotoTagNotification(
  fromUserId: string, 
  toUserId: string, 
  photoId: string
): Promise<void> {
  try {
    const { data: fromUser } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', fromUserId)
      .single()
    
    if (fromUser) {
      await supabase
        .from('notifications')
        .insert({
          user_id: toUserId,
          type: 'photo_tag',
          title: 'Te han etiquetado en una foto',
          message: `${fromUser.first_name} ${fromUser.last_name} te ha etiquetado en una foto`,
          from_user_id: fromUserId,
          related_id: photoId,
          related_type: 'photo',
          action_url: `/photo/${photoId}`,
          is_read: false
        })
    }
  } catch (error) {
    console.error('Error creating photo tag notification:', error)
  }
}

// 5. Invitación a página
export async function createPageInvitationNotification(
  fromUserId: string, 
  toUserId: string, 
  pageId: string,
  pageName: string
): Promise<void> {
  try {
    const { data: fromUser } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', fromUserId)
      .single()
    
    if (fromUser) {
      await supabase
        .from('notifications')
        .insert({
          user_id: toUserId,
          type: 'page_invitation',
          title: 'Invitación a página',
          message: `${fromUser.first_name} ${fromUser.last_name} te ha invitado a que te guste la página "${pageName}"`,
          from_user_id: fromUserId,
          related_id: pageId,
          related_type: 'page',
          action_url: `/page/${pageId}`,
          metadata: { page_name: pageName },
          is_read: false
        })
    }
  } catch (error) {
    console.error('Error creating page invitation notification:', error)
  }
}

// 6. Invitación a evento
export async function createEventInvitationNotification(
  fromUserId: string, 
  toUserId: string, 
  eventId: string,
  eventName: string
): Promise<void> {
  try {
    const { data: fromUser } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', fromUserId)
      .single()
    
    if (fromUser) {
      await supabase
        .from('notifications')
        .insert({
          user_id: toUserId,
          type: 'event_invitation',
          title: 'Invitación a evento',
          message: `${fromUser.first_name} ${fromUser.last_name} te ha invitado al evento "${eventName}"`,
          from_user_id: fromUserId,
          related_id: eventId,
          related_type: 'event',
          action_url: `/event/${eventId}`,
          metadata: { event_name: eventName },
          is_read: false
        })
    }
  } catch (error) {
    console.error('Error creating event invitation notification:', error)
  }
}

// 7. Mensaje privado
export async function createPrivateMessageNotification(
  fromUserId: string, 
  toUserId: string, 
  messageId: string,
  messagePreview: string
): Promise<void> {
  try {
    const { data: fromUser } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', fromUserId)
      .single()
    
    if (fromUser) {
      await supabase
        .from('notifications')
        .insert({
          user_id: toUserId,
          type: 'private_message',
          title: 'Nuevo mensaje privado',
          message: `${fromUser.first_name} ${fromUser.last_name} te ha enviado un mensaje: "${messagePreview.substring(0, 50)}${messagePreview.length > 50 ? '...' : ''}"`,
          from_user_id: fromUserId,
          related_id: messageId,
          related_type: 'message',
          action_url: `/messages/${fromUserId}`,
          is_read: false
        })
    }
  } catch (error) {
    console.error('Error creating private message notification:', error)
  }
}

// 8. Comentario en estado
export async function createStatusCommentNotification(
  fromUserId: string, 
  toUserId: string, 
  statusId: string,
  commentId: string,
  commentText: string
): Promise<void> {
  try {
    const { data: fromUser } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', fromUserId)
      .single()
    
    if (fromUser) {
      await supabase
        .from('notifications')
        .insert({
          user_id: toUserId,
          type: 'status_comment',
          title: 'Nuevo comentario en tu estado',
          message: `${fromUser.first_name} ${fromUser.last_name} comentó en tu estado: "${commentText.substring(0, 50)}${commentText.length > 50 ? '...' : ''}"`,
          from_user_id: fromUserId,
          related_id: statusId,
          related_type: 'status',
          action_url: `/status/${statusId}`,
          metadata: { comment_id: commentId },
          is_read: false
        })
    }
  } catch (error) {
    console.error('Error creating status comment notification:', error)
  }
}

// 9. Invitación a juego
export async function createGameInvitationNotification(
  fromUserId: string, 
  toUserId: string, 
  gameId: string,
  gameName: string
): Promise<void> {
  try {
    const { data: fromUser } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', fromUserId)
      .single()
    
    if (fromUser) {
      await supabase
        .from('notifications')
        .insert({
          user_id: toUserId,
          type: 'game_invitation',
          title: 'Invitación a juego',
          message: `${fromUser.first_name} ${fromUser.last_name} te ha invitado a jugar "${gameName}"`,
          from_user_id: fromUserId,
          related_id: gameId,
          related_type: 'game',
          action_url: `/game/${gameId}`,
          metadata: { game_name: gameName },
          is_read: false
        })
    }
  } catch (error) {
    console.error('Error creating game invitation notification:', error)
  }
}

// Funciones para gestionar notificaciones
export async function getUserNotifications(
  userId: string, 
  limit: number = 20
): Promise<Notification[]> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select(`
        *,
        from_user:profiles!from_user_id(id, first_name, last_name, avatar_url)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
      
    if (error) {
      console.error('Error getting user notifications:', error)
      return []
    }
    
    return data || []
  } catch (error) {
    console.error('Error getting user notifications:', error)
    return []
  }
}

export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
    
    if (error) {
      console.error('Error marking notification as read:', error)
      return false
    }
    
    return true
  } catch (error) {
    console.error('Error marking notification as read:', error)
    return false
  }
}

// Función para obtener notificaciones por tipo
export async function getNotificationsByType(
  userId: string, 
  type?: NotificationType, 
  limit: number = 20
): Promise<Notification[]> {
  try {
    let query = supabase
      .from('notifications')
      .select(`
        *,
        from_user:profiles!from_user_id(id, first_name, last_name, avatar_url)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (type) {
      query = query.eq('type', type)
    }
      
    const { data, error } = await query
      
    if (error) {
      console.error('Error getting notifications by type:', error)
      return []
    }
    
    return data || []
  } catch (error) {
    console.error('Error getting notifications by type:', error)
    return []
  }
}

// Función para contar notificaciones no leídas por tipo
export async function getUnreadNotificationCount(
  userId: string, 
  type?: NotificationType
): Promise<number> {
  try {
    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false)
    
    if (type) {
      query = query.eq('type', type)
    }
      
    const { count, error } = await query
      
    if (error) {
      console.error('Error getting unread notification count:', error)
      return 0
    }
    
    return count || 0
  } catch (error) {
    console.error('Error getting unread notification count:', error)
    return 0
  }
}

// Servicio de notificaciones
export const notificationService = {
  // Crear notificaciones
  createFriendRequestNotification,
  createProfileCommentNotification,
  createPhotoCommentNotification,
  createPhotoTagNotification,
  createPageInvitationNotification,
  createEventInvitationNotification,
  createPrivateMessageNotification,
  createStatusCommentNotification,
  createGameInvitationNotification,
  
  // Obtener notificaciones
  getUserNotifications,
  getNotificationsByType,
  getUnreadNotificationCount,
  
  // Gestionar notificaciones
  markNotificationAsRead
}

// Servicio de amistad
export const friendshipService = {
  getFriendshipStatus,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  getUserFriends,
  getPendingFriendRequests,
  getSentFriendRequests,
  removeFriend
}