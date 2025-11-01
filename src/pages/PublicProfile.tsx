import { useEffect, useMemo, useState } from 'react'
import { IonPage, IonContent } from '@ionic/react'
import Header from '@/components/Header'
import { useParams, useHistory } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { getExtendedUserProfile, type ExtendedUserProfile, type UserProfile, friendshipService, getUserFriends } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import '@/styles/tuenti-dashboard.css'
import '@/styles/tuenti-profile.css'

type RouteParams = { userId?: string; username?: string }

const PublicProfile: React.FC = () => {
  const { user } = useAuth()
  const { userId, username } = useParams<RouteParams>()
  const history = useHistory()
  const [targetId, setTargetId] = useState<string | null>(null)
  const [profile, setProfile] = useState<ExtendedUserProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [relationship, setRelationship] = useState<'none'|'pending'|'accepted'|'rejected'|'blocked'>('none')
  const [friends, setFriends] = useState<UserProfile[]>([])
  const [mutualFriends, setMutualFriends] = useState<UserProfile[]>([])
  const [photos, setPhotos] = useState<any[]>([])
  const [posts, setPosts] = useState<any[]>([])

  // Resolver el ID destino a partir de username o userId
  useEffect(() => {
    const resolveTarget = async () => {
      try {
        if (username) {
          const { data, error } = await supabase
            .from('profiles')
            .select('id')
            .eq('username', username)
            .single()
          if (error || !data) {
            setTargetId(null)
            return
          }
          setTargetId((data as any).id)
          return
        }
        if (userId) {
          setTargetId(userId)
          return
        }
        setTargetId(null)
      } catch (e) {
        setTargetId(null)
      }
    }
    resolveTarget()
  }, [userId, username])

  // Cargar perfil del usuario destino
  useEffect(() => {
    const loadProfile = async () => {
      if (!targetId) {
        setProfile(null)
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        // Fallback con timeout para evitar quedarse colgado en "Cargando perfil..."
        const timeoutMs = 4000
        const p = await Promise.race([
          getExtendedUserProfile(targetId),
          new Promise<ExtendedUserProfile | null>(resolve => setTimeout(() => resolve(null), timeoutMs))
        ])
        setProfile(p)
      } catch (e) {
        setProfile(null)
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  }, [targetId])

  // Cargar relación y amigos
  useEffect(() => {
    const loadRelations = async () => {
      if (!targetId) return
      try {
        if (user?.id) {
          const status = await friendshipService.getFriendshipStatus(user.id, targetId)
          setRelationship((status as any) || 'none')
        } else {
          setRelationship('none')
        }
        const fr = await getUserFriends(targetId)
        setFriends(fr || [])
        // amigos en común
        if (user?.id) {
          const myFriends = await getUserFriends(user.id)
          const mineIds = new Set((myFriends||[]).map(f => f.id))
          const mutual = (fr||[]).filter(f => mineIds.has(f.id))
          setMutualFriends(mutual)
        } else {
          setMutualFriends([])
        }
      } catch (e) {
        console.error('Error loading relations', e)
      }
    }
    loadRelations()
  }, [targetId, user?.id])

  // Cargar fotos recientes del usuario
  useEffect(() => {
    const loadPhotos = async () => {
      if (!targetId) { setPhotos([]); return }
      try {
        const { data, error } = await supabase
          .from('media_uploads')
          .select('id, thumbnail_url, file_url, created_at')
          .eq('user_id', targetId)
          .order('created_at', { ascending: false })
          .limit(9)
        if (error) throw error
        setPhotos((data as any[]) || [])
      } catch (e) {
        console.error('Error loading photos', e)
        setPhotos([])
      }
    }
    loadPhotos()
  }, [targetId])

  // Cargar posts del usuario
  useEffect(() => {
    const loadPosts = async () => {
      if (!targetId) { setPosts([]); return }
      try {
        const { data, error } = await supabase
          .from('posts')
          .select('id, content, created_at, user_id')
          .eq('user_id', targetId)
          .order('created_at', { ascending: false })
          .limit(10)
        if (error) throw error
        setPosts((data as any[]) || [])
      } catch (e) {
        console.error('Error loading posts', e)
        setPosts([])
      }
    }
    loadPosts()
  }, [targetId])

  const displayName = useMemo(() => {
    if (profile) {
      const full = `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
      if (full) return full
      if (profile.username && profile.username.length > 0) return profile.username
    }
    return username || targetId || ''
  }, [profile, username, targetId])


  if (!targetId) {
    const goToMyProfile = () => {
      try {
        history.push('/profile')
      } catch (e) {
        console.error('Error navegando a mi perfil:', e)
      }
    }
    return (
      <IonPage>
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-blue-600 mb-2">Tuentis</h1>
            <p className="text-gray-600 mb-4">Perfil no encontrado.</p>
            <div className="flex items-center justify-center gap-4">
              <button className="link-blue" onClick={() => history.push('/people')}>Volver a Personas</button>
              {user && (
                <button className="link-blue" onClick={goToMyProfile}>Ir a mi perfil</button>
              )}
            </div>
          </div>
        </div>
      </IonPage>
    )
  }

  // Botón de mensaje privado visible si el visitante está autenticado y no es el mismo usuario
  const canMessage = !!(user && user.id !== targetId)

  const goToPhoto = (mediaId: string) => {
    history.push(`/photo/${mediaId}`)
  }

  const goToPublicProfile = (u: UserProfile) => {
    try {
      const path = `profile/${u.id}`
      window.location.assign(`${import.meta.env.BASE_URL}${path}`)
    } catch (e) {
      console.error('Error abriendo perfil:', e)
    }
  }

  return (
    <IonPage>
      <Header />
      <IonContent className="dashboard-container">
        <div className="dashboard-content">
          <div className="tuenti-layout">
            {/* Columna Izquierda */}
            <div className="tuenti-left-sidebar">
              {/* Foto de perfil */}
              <div className="profile-photo-section">
                <img
                  src={profile?.avatar_url || `${import.meta.env.BASE_URL}people.svg`}
                  alt={displayName}
                  className="profile-main-photo"
                />
              </div>

              {/* Redes / Información básica */}
              <div className="profile-section">
                <h3 className="section-title">Redes</h3>
                <div className="section-content">
                  <p className="empty-message">Sin redes configuradas.</p>
                </div>
              </div>

              <div className="profile-section">
                <h3 className="section-title">Información</h3>
                <div className="section-content info-subsection">
                  <div className="info-row"><span className="info-label">Ciudad</span><span className="info-value">{profile?.city || '—'}</span></div>
                  <div className="info-row"><span className="info-label">País</span><span className="info-value">{profile?.country || '—'}</span></div>
                  <div className="info-row"><span className="info-label">Web</span><span className="info-value">{profile?.website || '—'}</span></div>
                </div>
              </div>
            </div>

            {/* Columna Central */}
            <div className="tuenti-main-content profile-center">
              <div className="profile-topbar">
                <div className="profile-title-row">
                  <h1 className="profile-name">{displayName}</h1>
                  {canMessage && (
                    <button className="profile-private-message" onClick={() => history.push('/privatemessages')}>
                      Mensaje privado
                    </button>
                  )}
                </div>
                <div className="profile-subnav">
                  <a className="profile-subnav-link" href="#">Ver álbumes de fotos</a>
                  <span className="profile-separator">|</span>
                  <a className="profile-subnav-link" href="#">Vídeos</a>
                </div>
              </div>

              {/* Espacio personal: último estado */}
              <div className="profile-section">
                <h3 className="section-title">
                  <span className="icon">🎵</span>
                  Espacio personal
                </h3>
                <div className="section-content">
                  {posts.length > 0 ? (
                    <div className="personal-space-card">
                      <div className="personal-space-title">Último estado</div>
                      <div className="personal-space-body">{posts[0].content}</div>
                    </div>
                  ) : (
                    <p className="empty-message">Aún no hay actividad visible.</p>
                  )}
                </div>
              </div>

              {/* Tablón: posts del usuario */}
              <div className="profile-section">
                <h3 className="section-title">Tablón</h3>
                <div className="section-content">
                  {posts.length === 0 && (
                    <p className="empty-message">No hay publicaciones.</p>
                  )}
                  {posts.map(p => (
                    <div key={p.id} className="post-item">
                      <div className="post-header">
                        <img src={profile?.avatar_url || `${import.meta.env.BASE_URL}people.svg`} alt="avatar" className="post-avatar" />
                        <div className="post-meta">
                          <div className="post-author">{displayName}</div>
                          <div className="post-time">{new Date(p.created_at).toLocaleString()}</div>
                        </div>
                      </div>
                      <div className="post-content">{p.content}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Columna Derecha */}
            <div className="tuenti-right-sidebar">
              <div className="profile-section">
                <h3 className="section-title">
                  <span className="icon">👥</span>
                  Relación
                </h3>
                <div className="section-content">
                  {relationship === 'accepted' && (<p className="empty-message">Ya sois amigos</p>)}
                  {relationship === 'pending' && (<p className="empty-message">Solicitud pendiente</p>)}
                  {relationship === 'none' && (
                    <button className="link-blue" onClick={() => history.push('/people')}>Enviar solicitud</button>
                  )}
                </div>
              </div>

              {/* Fotos */}
              <div className="profile-section">
                <h3 className="section-title">Fotos</h3>
                <div className="section-content photos-grid">
                  {photos.length === 0 && <p className="empty-message">Sin fotos.</p>}
                  {photos.map(ph => (
                    <button key={ph.id} className="photo-thumb" onClick={() => goToPhoto(ph.id)} title="Ver foto">
                      <img src={ph.thumbnail_url || ph.file_url || `${import.meta.env.BASE_URL}default_tuenties.webp`} alt="foto" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Amigos en común */}
              {user?.id && (
                <div className="profile-section">
                  <h3 className="section-title">Amigos en común</h3>
                  <div className="section-content friends-grid">
                    {mutualFriends.length === 0 && <p className="empty-message">No hay amigos en común.</p>}
                    {mutualFriends.slice(0,6).map(f => (
                      <div key={f.id} className="friend-card">
                        <img className="friend-avatar" src={f.avatar_url || `${import.meta.env.BASE_URL}default_tuenties.webp`} alt="amigo" />
                        <button className="friend-name" onClick={() => goToPublicProfile(f)}>
                          {(f.first_name||'')}{(f.last_name?` ${f.last_name}`:'')}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Amigos del usuario */}
              <div className="profile-section">
                <h3 className="section-title">Mis amigos</h3>
                <div className="section-content friends-grid">
                  {friends.length === 0 && <p className="empty-message">No tiene amigos públicos.</p>}
                  {friends.slice(0,8).map(f => (
                    <div key={f.id} className="friend-card">
                      <img className="friend-avatar" src={f.avatar_url || `${import.meta.env.BASE_URL}default_tuenties.webp`} alt="amigo" />
                      <button className="friend-name" onClick={() => goToPublicProfile(f)}>
                        {(f.first_name||'')}{(f.last_name?` ${f.last_name}`:'')}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </IonContent>
    </IonPage>
  )
}

export default PublicProfile