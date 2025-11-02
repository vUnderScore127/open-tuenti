import { useState, useEffect } from "react";
import { IonPage, IonContent } from '@ionic/react';
import Header from "@/components/Header";
import { useHistory, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { getUserProfile, UserProfile } from '../lib/supabase';
import '../styles/tuenti-dashboard.css';
import '../styles/tuenti-profile.css';

interface Friend {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  is_online: boolean;
  username?: string;
}

const Profile: React.FC = () => {
  const { user } = useAuth();
  const { userId } = useParams<{ userId: string }>();
  const history = useHistory();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false); // Cambiado a false para eliminar pantalla de carga
  const [friends, setFriends] = useState<Friend[]>([]);
  const [statusText, setStatusText] = useState("");



  useEffect(() => {
    if (user) {
      loadProfile();
      loadFriends();
    }
  }, [user, userId]);

  const loadProfile = async (retryCount = 0) => {
    try {
      const profileId = userId || user?.id;
      if (!profileId) return;

      // Intentar cargar desde caché primero
      const cacheKey = `profile_${profileId}`;
      const cachedProfile = localStorage.getItem(cacheKey);
      
      if (cachedProfile) {
        try {
          const parsed = JSON.parse(cachedProfile);
          // Verificar si el caché tiene el nuevo formato con timestamp
          if (parsed.profile && parsed.expires) {
            // Verificar si el caché no ha expirado
            if (Date.now() < parsed.expires) {
              setUserProfile(parsed.profile);
            } else {
              // Caché expirado, limpiar
              localStorage.removeItem(cacheKey);
            }
          } else {
            // Formato antiguo, usar directamente pero actualizar después
            setUserProfile(parsed);
          }
        } catch (e) {
          console.warn('Error parsing cached profile:', e);
          // Limpiar caché corrupto
          localStorage.removeItem(cacheKey);
        }
      }

      // Cargar desde la base de datos con reintentos
      setLoading(true);
      const profile = await getUserProfile(profileId);
      if (profile) {
        setUserProfile(profile);
        // Guardar en caché con timestamp para expiración
        const cacheData = {
          profile,
          timestamp: Date.now(),
          expires: Date.now() + (5 * 60 * 1000) // 5 minutos
        };
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      } else if (retryCount < 2) {
        // Reintentar hasta 2 veces si falla
        console.warn(`Retrying profile load, attempt ${retryCount + 1}`);
        setTimeout(() => loadProfile(retryCount + 1), 1000);
        return;
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      if (retryCount < 2) {
        // Reintentar en caso de error
        console.warn(`Retrying profile load after error, attempt ${retryCount + 1}`);
        setTimeout(() => loadProfile(retryCount + 1), 1000);
        return;
      }
    } finally {
      setLoading(false);
    }
  };

  const loadFriends = async (retryCount = 0) => {
    try {
      const profileId = userId || user?.id;
      if (!profileId) return;

      // Intentar cargar amigos desde caché
      const friendsCacheKey = `friends_${profileId}`;
      const cachedFriends = localStorage.getItem(friendsCacheKey);
      
      if (cachedFriends) {
        try {
          const parsed = JSON.parse(cachedFriends);
          // Verificar si el caché tiene el nuevo formato con timestamp
          if (parsed.friends && parsed.expires) {
            // Verificar si el caché no ha expirado
            if (Date.now() < parsed.expires) {
              setFriends(parsed.friends);
            } else {
              // Caché expirado, limpiar
              localStorage.removeItem(friendsCacheKey);
            }
          } else {
            // Formato antiguo, usar directamente
            setFriends(parsed);
          }
        } catch (e) {
          console.warn('Error parsing cached friends:', e);
          localStorage.removeItem(friendsCacheKey);
        }
      }

      // Cargar amigos desde la base de datos con reintentos
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          friend_id,
          profiles!friendships_friend_id_fkey (
            id,
            first_name,
            last_name,
            avatar_url,
            is_online,
            username
          )
        `)
        .eq('user_id', profileId)
        .eq('status', 'accepted')
        .limit(8);

      if (error) {
        if (retryCount < 2) {
          console.warn(`Retrying friends load, attempt ${retryCount + 1}`);
          setTimeout(() => loadFriends(retryCount + 1), 1000);
          return;
        }
        throw error;
      }

      const friendsList = data?.map(item => ({
        id: (item.profiles as any).id,
        first_name: (item.profiles as any).first_name,
        last_name: (item.profiles as any).last_name,
        avatar_url: (item.profiles as any).avatar_url,
        is_online: (item.profiles as any).is_online,
        username: (item.profiles as any).username
      })) || [];

      setFriends(friendsList);
      // Guardar en caché con timestamp para expiración
      const cacheData = {
        friends: friendsList,
        timestamp: Date.now(),
        expires: Date.now() + (3 * 60 * 1000) // 3 minutos para amigos
      };
      localStorage.setItem(friendsCacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error loading friends:', error);
      if (retryCount < 2) {
        console.warn(`Retrying friends load after error, attempt ${retryCount + 1}`);
        setTimeout(() => loadFriends(retryCount + 1), 1000);
      }
    }
  };

  const goToPublicProfile = (f: Friend) => {
    try {
      const path = `profile/${f.id}`
      window.location.assign(`${import.meta.env.BASE_URL}${path}`)
    } catch (e) {
      console.error('Error abriendo perfil:', e)
      alert('No se pudo abrir el perfil. Inténtalo más tarde.')
    }
  }

  const displayName = (() => {
    if (userProfile) {
      const full = `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim()
      if (full) return full
      if (userProfile.username && userProfile.username.length > 0) return userProfile.username
    }
    return user?.email || user?.id || ''
  })();

  // Eliminar la pantalla de carga - mostrar directamente el contenido
  if (!user) {
    return (
      <IonPage>
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-blue-600 mb-2">Tuentis</h1>
            <p className="text-gray-600">Debes iniciar sesión para ver tu perfil.</p>
          </div>
        </div>
      </IonPage>
    );
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
              <div className="profile-photo-section" style={{ position: 'relative' }}>
                {loading && !userProfile?.avatar_url ? (
                  <div className="profile-main-photo bg-gray-200 animate-pulse"></div>
                ) : (
                  <img 
                    src={userProfile?.avatar_url || '/people.svg'} 
                    alt={displayName}
                    className="profile-main-photo"
                    onError={(e) => {
                      // Fallback a imagen por defecto si hay error
                      const target = e.target as HTMLImageElement
                      if (target.src !== '/people.svg') {
                        target.src = '/people.svg'
                      }
                    }}
                  />
                )}
                
                {/* Botón "Cambiar foto de perfil" - solo para el perfil propio */}
                {!userId && user && userProfile && (
                  <div 
                    className="change-photo-button"
                    style={{
                      position: 'absolute',
                      top: '10px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      backgroundColor: 'rgba(0, 0, 0, 0.7)',
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      zIndex: 10,
                      whiteSpace: 'nowrap'
                    }}
                    onClick={() => {
                      // TODO: Implementar funcionalidad de cambio de foto
                      alert('Funcionalidad de cambio de foto próximamente')
                    }}
                  >
                    Cambiar foto de perfil
                  </div>
                )}
              </div>

              {/* Mis sitios */}
              <div className="profile-section">
                <h3 className="section-title">
                  <span className="icon">🌐</span>
                  Mis sitios
                </h3>
                <div className="section-content">
                  <p className="empty-message">Aún no sigues ningún sitio.</p>
                  <a href="#" className="link-blue">Mostrar sitios recomendados</a>
                </div>
              </div>

              {/* Mis páginas */}
              <div className="profile-section">
                <h3 className="section-title">
                  <span className="icon">📄</span>
                  Mis páginas
                </h3>
                <div className="section-content">
                  <p className="empty-message">No eres seguidor de ninguna página</p>
                  <a href="#" className="link-blue">Ver disponibles</a>
                </div>
              </div>

              {/* Redes */}
              <div className="profile-section">
                <h3 className="section-title">Redes</h3>
                <div className="section-content">
                  <p className="empty-message">Puedes rellenar tus redes haciendo clic <a href="#" className="link-blue">aquí</a></p>
                </div>
              </div>

              {/* Información */}
              <div className="profile-section">
                <h3 className="section-title">Información</h3>
                <div className="section-content">
                  <div className="info-subsection">
                    <h4 className="subsection-title">Personal</h4>
                    <div className="info-row">
                      <span className="info-label">Sexo</span>
                      <span className="info-value">Chica</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Fecha de nacimiento</span>
                      <span className="info-value">16 Oct, 1981</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Edad</span>
                      <span className="info-value">31 años</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Columna Central */}
            <div className="tuenti-main-content profile-center">
              {/* Encabezado de perfil con nombre grande y acciones */}
              <div className="profile-topbar">
                <div className="profile-title-row">
                  <h1 className="profile-name">{displayName}</h1>
                  <button className="profile-private-message">Mensaje privado</button>
                </div>
                <div className="profile-subnav">
                  <a className="profile-subnav-link" href="#">Ver álbumes de fotos (10)</a>
                  <span className="profile-separator">|</span>
                  <a className="profile-subnav-link" href="#">Vídeos</a>
                  <span className="profile-separator">▼</span>
                </div>
              </div>

              {/* Estado tipo burbuja */}
              <div className="profile-status-bubble">
                <span className="profile-status-text">{userProfile?.bio || statusText || 'Escribe aquí tu estado'}</span>
                <span className="profile-status-time">hace 15 horas</span>
              </div>

              {/* Espacio personal */}
              <div className="profile-personal">
                <h3 className="profile-section-title">Espacio personal</h3>
                <div className="profile-personal-content">
                  <div className="personal-item">
                    <div className="personal-thumb" />
                    <div className="personal-text">
                      <strong>Martha And The Muffins - Echo Beach</strong>
                      <div className="personal-meta">14 vistas</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tablón */}
              <div className="profile-board">
                <div className="board-header">
                  <div className="board-avatar" />
                  <input className="board-input" type="text" placeholder="Escribe aquí..." />
                </div>
                <div className="board-list">
                  <div className="board-post">
                    <div className="board-post-avatar" />
                    <div className="board-post-body">
                      <div className="board-post-author">Sara Sanz</div>
                      <div className="board-post-text">Tienes que recordarme otra vez la peli mala de ayer, que tengo muchísimas ganas de verla :P</div>
                      <div className="board-post-time">13 de Dic de 2009, a las 02:12</div>
                    </div>
                  </div>
                  <div className="board-post">
                    <div className="board-post-avatar" />
                    <div className="board-post-body">
                      <div className="board-post-author">Lara Castro</div>
                      <div className="board-post-text">siii, está genial esa mezcla, la primera vez que la oí en un bar me encantó y la estuve tarareando durante mucho tiempo! :)</div>
                      <div className="board-post-time">16 de Dic de 2009, a las 22:06</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Columna Derecha */}
            <div className="tuenti-right-sidebar">
              {/* Fotos */}
              <div className="profile-section">
                <h3 className="section-title">Fotos</h3>
                <div className="section-content">
                  <p className="empty-message">Aún no has sido etiquetado en ninguna foto.</p>
                </div>
              </div>

              {/* Mis amigos */}
              <div className="profile-section">
                <h3 className="section-title">Mis amigos</h3>
                <div className="friends-grid">
                  {friends.slice(0, 6).map((friend) => (
                    <div key={friend.id} className="friend-item">
                      <img 
                        src={friend.avatar_url || `${import.meta.env.BASE_URL}default_tuenties.webp`} 
                        alt={`${friend.first_name} ${friend.last_name}`}
                        className="friend-avatar"
                      />
                      <button
                        className="friend-name"
                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
                        onClick={() => goToPublicProfile(friend)}
                        title="Ver perfil"
                      >
                        {friend.first_name}<br />
                        {friend.last_name}
                      </button>
                    </div>
                  ))}
                </div>
                <div className="friends-footer">
                  <a href="#" className="link-blue">Ver todos ({friends.length})</a>
                </div>
              </div>
            </div>

          </div>
        </div>
        {/* Footer eliminado */}
      </IonContent>
    </IonPage>
  );
};

export default Profile;
