import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../lib/auth'
import { getUserProfile, UserProfile } from '../lib/supabase'
import { supabase } from '@/lib/supabase'
import '../styles/tuenti-left-sidebar.css'

export default function LeftSidebar() {
  const { user: authUser } = useAuth()
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const sidebarRef = useRef<HTMLDivElement | null>(null)
  const profileCardRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const loadUserProfile = async () => {
      console.log('🔍 LeftSidebar - authUser:', authUser)
      
      if (!authUser?.id) {
        console.log('❌ No authUser.id found')
        setLoading(false)
        return
      }

      console.log('📡 Loading profile for userId:', authUser.id)
      
      try {
        const profile = await getUserProfile(authUser.id)
        console.log('📊 Profile loaded:', profile)
        setUserProfile(profile)
      } catch (error) {
        console.error('❌ Error loading user profile:', error)
      } finally {
        setLoading(false)
      }
    }

    loadUserProfile()
  }, [authUser?.id])

  const displayName = userProfile 
    ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || 'Usuario'
    : 'Usuario'
  
  console.log('🏷️ Display name:', displayName, 'from profile:', userProfile)
  console.log('🔍 Name parts:', {
    first_name: userProfile?.first_name,
    last_name: userProfile?.last_name,
    combined: userProfile ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() : 'No profile'
  })
  
  // Note: total_visits field doesn't exist in database, using placeholder
  const totalVisits = 0

  useEffect(() => {
    const updateGaps = () => {
      const sidebarEl = sidebarRef.current
      const cardEl = profileCardRef.current
      if (!sidebarEl || !cardEl) return
      const start = cardEl.offsetTop
      const end = start + cardEl.offsetHeight
      const sidebarRect = sidebarEl.getBoundingClientRect()
      const cardRect = cardEl.getBoundingClientRect()
      const connector = Math.max(0, Math.round(sidebarRect.right - cardRect.right))
      sidebarEl.style.setProperty('--gap-start', `${start}px`)
      sidebarEl.style.setProperty('--gap-end', `${end}px`)
      sidebarEl.style.setProperty('--connector-width', `${connector}px`)
    }
    updateGaps()
    const onResize = () => updateGaps()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [loading, userProfile])

  return (
    <div className="tuenti-left-sidebar" ref={sidebarRef}>
      {/* Línea de conexión horizontal al menú */}
      <div className="tuenti-header-connector"></div>
      {/* Profile Section */}
      <div className="tuenti-profile-section">
        <div className="tuenti-profile-card" ref={profileCardRef}>
          <div className="tuenti-profile-header">
            <div className="tuenti-profile-avatar">
              {loading ? (
                <div className="tuenti-loading-skeleton" style={{ width: '100%', height: '100%' }} />
              ) : userProfile?.avatar_url ? (
                <img 
                  src={userProfile.avatar_url} 
                  alt={displayName}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              ) : (
                <div className="tuenti-profile-avatar-placeholder">
                  👤
                </div>
              )}
            </div>
            <div className="tuenti-profile-info">
              <div className="tuenti-profile-name">
                {loading ? (
                  <div className="tuenti-loading-skeleton tuenti-loading-name" />
                ) : (
                  displayName
                )}
              </div>
              <div className="tuenti-profile-stats">
                <div className="tuenti-profile-stats-icon">
                  <img src={`${import.meta.env.BASE_URL}bar-chart.svg`} alt="Visitas" />
                </div>
                <span className="tuenti-profile-stats-number">
                  {loading ? (
                    <div className="tuenti-loading-skeleton tuenti-loading-stats" />
                  ) : (
                    totalVisits
                  )}
                </span>
                <span>visitas a tu perfil</span>
              </div>
            </div>
          </div>
            
          <div className="tuenti-profile-divider"></div>
          
          <ul className="tuenti-notifications">
            <li>
                   <span className="tuenti-notification-icon">
                     <img src={`${import.meta.env.BASE_URL}message.svg`} alt="Mensajes" />
                   </span>
                   8 mensajes privados
                 </li>
                 <li>
                   <span className="tuenti-notification-icon">
                     <img src={`${import.meta.env.BASE_URL}comment.svg`} alt="Comentarios" />
                   </span>
                   1 estado con comentarios
                 </li>
                 <li>
                   <span className="tuenti-notification-icon">
                     <img src={`${import.meta.env.BASE_URL}comment.svg`} alt="Comentarios" />
                   </span>
                   35 comentarios
                 </li>
                 <li>
                   <span className="tuenti-notification-icon">
                     <img src={`${import.meta.env.BASE_URL}calendar.svg`} alt="Eventos" />
                   </span>
                   16 invitaciones a eventos
                 </li>
                 <li>
                   <span className="tuenti-notification-icon">
                     <img src={`${import.meta.env.BASE_URL}tag.svg`} alt="Etiquetas" />
                   </span>
                   13 etiquetas
                 </li>
                 <li>
                   <span className="tuenti-notification-icon">
                     <img src={`${import.meta.env.BASE_URL}comment.svg`} alt="Fotos" />
                   </span>
                   18 fotos con comentarios
                 </li>
                 <li>
                   <span className="tuenti-notification-icon">
                     <img src={`${import.meta.env.BASE_URL}people.svg`} alt="Invitaciones" />
                   </span>
                   2 invitaciones a páginas
                </li>
          </ul>
        </div>
      </div>
      
      {/* Bloque inferior (Invitaciones, calendario, etc.) */}
      <div className="tuenti-lower-wrapper tuenti-sidebar-content">
        {/* Invite Friends Section */}
        <div className="tuenti-sidebar-section">
          <div className="tuenti-title-row">
            <h3 className="tuenti-sidebar-title">Invitar a tus amigos</h3>
            <div className="tuenti-settings-link">
              <a href="/settings">Ajustes</a>
            </div>
          </div>
          <div className="tuenti-invitations-count">5 invitaciones</div>
          <div className="tuenti-invite-form">
            <InviteForm />
          </div>
        </div>
        
        <div className="tuenti-sidebar-divider"></div>
        
        {/* Sponsored Events Section */}
        <div className="tuenti-sidebar-section">
          <h3 className="tuenti-sidebar-title">Eventos patrocinados</h3>
          <p className="tuenti-event-description">Ocurre hoy cerca de Sevilla</p>
        </div>
        
        <div className="tuenti-sidebar-divider"></div>
        
        {/* Calendar Section */}
        <div className="tuenti-sidebar-section">
          <h3 className="tuenti-sidebar-title">Calendario</h3>
          <div className="tuenti-calendar-events">
            <div className="tuenti-calendar-event">
              <span className="tuenti-calendar-date">Hoy:</span>
              <span className="tuenti-calendar-description">Cumpleaños de Antonio Díaz.</span>
            </div>
            <div className="tuenti-calendar-event">
              <span className="tuenti-calendar-date">Mañana:</span>
              <span className="tuenti-calendar-description">No tienes ningún evento.</span>
            </div>
            <div className="tuenti-calendar-event">
              <span className="tuenti-calendar-date">Pasado mañana:</span>
              <span className="tuenti-calendar-description">Reunión de trabajo a las 15:00.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function InviteForm() {
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState<string>('')

  const handleInvite = async () => {
    setMessage('')
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setMessage('Introduce un email válido')
      return
    }
    setSending(true)
    try {
      const token = (crypto as any)?.randomUUID ? (crypto as any).randomUUID() : Math.random().toString(36).slice(2)
      const { data: { user } } = await supabase.auth.getUser()
      const invitedBy = user?.id || null
      const { error } = await supabase
        .from('invitations')
        .insert({ email, token, invited_by: invitedBy })
      if (error) throw error
      try {
        await supabase.functions.invoke('send-invite', { body: { email, token } })
        setMessage('Invitación creada y email enviado.')
      } catch {
        setMessage('Invitación creada. El email se enviará desde el backend.')
      }
      setEmail('')
    } catch (e) {
      setMessage('No se pudo crear la invitación (configura la tabla y función).')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="tuenti-invite-row">
      <input
        type="email"
        placeholder="E-mail"
        className="tuenti-invite-input"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={sending}
      />
      <button className="tuenti-invite-button" onClick={handleInvite} disabled={sending}>
        {sending ? 'Enviando…' : 'Invitar'}
      </button>
      {message && <div style={{ fontSize: 12, color: '#666' }}>{message}</div>}
    </div>
  )
}
