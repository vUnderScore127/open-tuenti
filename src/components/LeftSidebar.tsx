import React, { useState, useEffect, useRef } from 'react'
import { useHistory } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { getBasicProfile } from '../lib/supabase'
import { supabase } from '@/lib/supabase'
import '../styles/tuenti-left-sidebar.css'

type BasicUserProfile = { id: string; first_name?: string; last_name?: string; avatar_url?: string }

export default function LeftSidebar({ onOpenNotification }: { onOpenNotification?: (type: 'comments' | 'tags') => void }) {
  const { user: authUser, loading: authLoading } = useAuth()
  const history = useHistory()
  const [userProfile, setUserProfile] = useState<BasicUserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [displayName, setDisplayName] = useState<string>('')
  const sidebarRef = useRef<HTMLDivElement | null>(null)
  const profileCardRef = useRef<HTMLDivElement | null>(null)
  const [notifCounts, setNotifCounts] = useState<{ postsWithComments: number; photoTags: number; photoComments: number }>({ postsWithComments: 0, photoTags: 0, photoComments: 0 })
  const [postsWithCommentsIds, setPostsWithCommentsIds] = useState<string[]>([])
  const [singlePhotoWithCommentsMediaId, setSinglePhotoWithCommentsMediaId] = useState<string | null>(null)
  // Evitar bucles de creación de perfil (eliminado fallback de creación)
  // const triedCreateProfileRef = useRef<boolean>(false)

  const getInstantNameFromMetadata = (): string => {
    try {
      const meta: any = (authUser as any)?.user_metadata || {}
      const fn = String(meta.first_name || '').trim()
      const ln = String(meta.last_name || '').trim()
      const full = `${fn} ${ln}`.trim()
      if (full) return full
      const alt = String(meta.full_name || meta.name || '').trim()
      return alt || ''
    } catch {
      return ''
    }
  }

  useEffect(() => {
    const loadUserProfile = async () => {
      // Esperar a que el estado de autenticación termine de inicializarse
      if (authLoading) {
        return
      }

      if (!authUser?.id) {
        // Usuario no autenticado cuando ya terminó la inicialización de auth
        setUserProfile(null)
        setLoading(false)
        return
      }

      setLoading(true)
      // Fijar nombre instantáneo desde metadatos si existe (sin email)
      const metaName = getInstantNameFromMetadata()
      if (metaName) setDisplayName(metaName)

      // Cargar del caché local instantáneamente si existe
      try {
        const cacheKey = `basic_profile_${authUser.id}`
        const cachedRaw = localStorage.getItem(cacheKey)
        if (cachedRaw) {
          const cached: BasicUserProfile = JSON.parse(cachedRaw)
          setUserProfile(cached)
          const name = `${cached.first_name || ''} ${cached.last_name || ''}`.trim()
          if (name) {
            setDisplayName(name)
          }
        }
      } catch (_) {}

      try {
        const profile = await getBasicProfile(authUser.id)
        console.log('📊 Profile loaded:', profile)
        setUserProfile(profile || null)
        // Actualizar caché y nombre
        if (profile) {
          try {
            localStorage.setItem(`basic_profile_${authUser.id}`, JSON.stringify(profile))
          } catch (_) {}
          const name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
          if (name) {
            setDisplayName(name)
          }
        }
      } catch (error) {
        console.error('❌ Error loading user profile:', error)
      } finally {
        setLoading(false)
      }
    }

    loadUserProfile()
  }, [authUser?.id, authLoading])

  // Recalcular nombre si cambia el perfil recibido
  useEffect(() => {
    if (!userProfile) return
    const name = `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim()
    if (name) setDisplayName(name)
  }, [userProfile?.first_name, userProfile?.last_name])
  
  // Visitas fijadas (hardcoded)

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

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        if (!authUser?.id) return;
        // Estados con comentarios (notificaciones no leídas tipo 'status_comment')
        const { data: notifRows } = await supabase
          .from('notifications')
          .select('id, related_id')
          .eq('user_id', authUser.id)
          .eq('type', 'status_comment')
          .eq('is_read', false);
        const unreadStatusPostIds = Array.from(new Set((notifRows || []).map((n: any) => n.related_id).filter(Boolean)));
        const postsWithComments = unreadStatusPostIds.length;
        setPostsWithCommentsIds(unreadStatusPostIds);

        // Fotos con etiquetas/comentarios: mantenemos lógica previa (podemos migrar más tarde)
        let photoComments = 0;
        let photoTags = 0;
        const { data: postRows } = await supabase
          .from('posts')
          .select('id')
          .eq('user_id', authUser.id);
        const postIds = (postRows || []).map((p: any) => p.id);
        if (postIds.length > 0) {
          const { data: mediaRows } = await supabase
            .from('media_uploads')
            .select('id, post_id')
            .in('post_id', postIds);
          const mediaIds = (mediaRows || []).map((m: any) => m.id);
          if (mediaIds.length > 0) {
            const { data: tagRows } = await supabase
              .from('photo_tags')
              .select('id')
              .in('media_upload_id', mediaIds);
            photoTags = (tagRows || []).length;
            const postsWithMedia = new Set((mediaRows || []).map((m: any) => m.post_id));
            // Aproximación: contamos posts con media que tienen al menos un comentario en general
            const { data: commentsRows } = await supabase
              .from('post_comments')
              .select('post_id')
              .in('post_id', Array.from(postsWithMedia));
            const byPost: Record<string, number> = {};
            (commentsRows || []).forEach((c: any) => { byPost[c.post_id] = (byPost[c.post_id] || 0) + 1; });
            photoComments = Object.keys(byPost).length;

            // Si sólo hay una foto comentada, capturamos su mediaId para navegación directa
            const commentedPostIds = new Set(Object.keys(byPost));
            const mediaOnCommentedPosts = (mediaRows || []).filter((m: any) => commentedPostIds.has(m.post_id));
            const uniquePostsWithMediaAndComments = new Set(mediaOnCommentedPosts.map((m: any) => m.post_id));
            if (uniquePostsWithMediaAndComments.size === 1) {
              const onlyPostId = Array.from(uniquePostsWithMediaAndComments)[0];
              const firstMediaForPost = mediaOnCommentedPosts.find((m: any) => m.post_id === onlyPostId);
              setSinglePhotoWithCommentsMediaId(firstMediaForPost?.id || null);
            } else {
              setSinglePhotoWithCommentsMediaId(null);
            }
          }
        }

        setNotifCounts({
          postsWithComments,
          photoTags,
          photoComments,
        });
      } catch (e) {
        console.error('Error loading notifications:', e);
      }
    };
    loadNotifications();

    // Suscripción para refrescar automáticamente cuando cambien las notificaciones
    if (authUser?.id) {
      const sub = supabase
        .channel('status_comment_notifications')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, (payload: any) => {
          const row = payload?.new || payload?.old;
          if (row && row.user_id === authUser.id && row.type === 'status_comment') {
            loadNotifications();
          }
        })
        .subscribe();
      return () => { supabase.removeChannel(sub); };
    }
  }, [authUser?.id]);


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
                  alt={displayName || 'Perfil'}
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
                {displayName}
              </div>
              <div className="tuenti-profile-stats">
                <div className="tuenti-profile-stats-icon">
                  <img src={`${import.meta.env.BASE_URL}bar-chart.svg`} alt="Visitas" />
                </div>
                <span className="tuenti-profile-stats-number">
                  0
                </span>
                <span>visitas a tu perfil</span>
              </div>
            </div>
          </div>
            
          <div className="tuenti-profile-divider"></div>
          
          <ul className="tuenti-notifications">
            {notifCounts.postsWithComments > 0 && (
              <li>
                <span className="tuenti-notification-icon">
                  <img src={`${import.meta.env.BASE_URL}comment.svg`} alt="Comentarios" />
                </span>
                <button
                  onClick={() => {
                    if (notifCounts.postsWithComments === 1 && postsWithCommentsIds[0]) {
                      const postId = postsWithCommentsIds[0];
                      // Marcar como leídas las notificaciones de comentarios de ese estado
                      (async () => {
                        try {
                          if (authUser?.id) {
                            await supabase
                              .from('notifications')
                              .update({ is_read: true })
                              .eq('user_id', authUser.id)
                              .eq('type', 'status_comment')
                              .eq('related_id', postId)
                              .eq('is_read', false);
                          }
                        } catch (_) {}
                        history.push(`/status/${postId}`);
                      })();
                    } else {
                      onOpenNotification?.('comments')
                    }
                  }}
                  style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}
                >
                  {notifCounts.postsWithComments} estados con comentarios
                </button>
              </li>
            )}
            {notifCounts.photoTags > 0 && (
              <li>
                <span className="tuenti-notification-icon">
                  <img src={`${import.meta.env.BASE_URL}tag.svg`} alt="Etiquetas" />
                </span>
                <button onClick={() => onOpenNotification?.('tags')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}>
                  {notifCounts.photoTags} etiquetas
                </button>
              </li>
            )}
            {notifCounts.photoComments > 0 && (
              <li>
                <span className="tuenti-notification-icon">
                  <img src={`${import.meta.env.BASE_URL}comment.svg`} alt="Fotos" />
                </span>
                <button
                  onClick={() => {
                    if (notifCounts.photoComments === 1 && singlePhotoWithCommentsMediaId) {
                      history.push(`/photo/${singlePhotoWithCommentsMediaId}`)
                    } else {
                      onOpenNotification?.('comments')
                    }
                  }}
                  style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}
                >
                  {notifCounts.photoComments} fotos con comentarios
                </button>
              </li>
            )}
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
              <a href={`${import.meta.env.BASE_URL}settings?section=invitaciones`}>Ajustes</a>
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
