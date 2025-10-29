import { useState, useEffect } from "react";
import { IonPage, IonContent } from '@ionic/react';
import Header from "@/components/Header";
import { useHistory, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { getUserProfile, UserProfile } from '../lib/supabase';
import Footer from "@/components/Footer";
import '../styles/tuenti-dashboard.css';

interface Friend {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  is_online: boolean;
}

const Profile: React.FC = () => {
  const { user } = useAuth();
  const { userId } = useParams<{ userId: string }>();
  const history = useHistory();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [statusText, setStatusText] = useState("");

  useEffect(() => {
    if (user) {
      loadProfile();
      loadFriends();
    }
  }, [user, userId]);

  const loadProfile = async () => {
    try {
      const profileId = userId || user?.id;
      if (profileId) {
        const profile = await getUserProfile(profileId);
        setUserProfile(profile);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFriends = async () => {
    try {
      const { data, error } = await supabase
        .from('friends')
        .select(`
          friend_id,
          profiles!friends_friend_id_fkey (
            id,
            first_name,
            last_name,
            avatar_url,
            is_online
          )
        `)
        .eq('user_id', user?.id)
        .eq('status', 'accepted')
        .limit(8);

      if (error) throw error;

      const friendsList = data?.map(item => ({
        id: (item.profiles as any).id,
        first_name: (item.profiles as any).first_name,
        last_name: (item.profiles as any).last_name,
        avatar_url: (item.profiles as any).avatar_url,
        is_online: (item.profiles as any).is_online
      })) || [];

      setFriends(friendsList);
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  };

  const displayName = userProfile 
    ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || 'Usuario'
    : 'Usuario';

  if (!user || loading) {
    return (
      <IonPage>
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-blue-600 mb-2">Tuentis</h1>
            <p className="text-gray-600">Cargando...</p>
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
              <div className="profile-photo-section">
                <img 
                  src={userProfile?.avatar_url || `${import.meta.env.BASE_URL}default_tuenties.webp`} 
                  alt={displayName}
                  className="profile-main-photo"
                />
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
            <div className="tuenti-main-content">
              {/* Header del perfil */}
              <div className="profile-header">
                <div className="profile-tabs">
                  <a href="#" className="tab-link">Mis álbumes de fotos (4)</a>
                  <a href="#" className="tab-link">Mis canales ▼</a>
                  <a href="#" className="tab-link edit-profile">Editar mi perfil</a>
                </div>
              </div>

              {/* Campo ¿Qué estás haciendo? */}
              <div className="status-update-section">
                <div className="status-input-container">
                  <input 
                    type="text" 
                    placeholder="¿Qué estás haciendo?"
                    value={statusText}
                    onChange={(e) => setStatusText(e.target.value)}
                    className="status-input"
                  />
                  <div className="status-actions">
                    <button className="status-btn">📷</button>
                    <button className="status-btn">📹</button>
                  </div>
                </div>
              </div>

              {/* Mi espacio personal */}
              <div className="personal-space-section">
                <h3 className="section-title">Mi espacio personal</h3>
                <div className="section-content">
                  <p className="empty-message">Tu espacio personal está vacío. <a href="#" className="link-blue">Crea tu primera entrada.</a></p>
                </div>
              </div>

              {/* Mi tablón */}
              <div className="board-section">
                <h3 className="section-title">Mi tablón</h3>
                <div className="board-tabs">
                  <span className="board-tab">Mostrar</span>
                  <a href="#" className="board-tab-link">Todo</a>
                  <a href="#" className="board-tab-link">Estados</a>
                  <a href="#" className="board-tab-link">Comentarios</a>
                </div>
                <div className="section-content">
                  <p className="empty-message">Este tablón está vacío.</p>
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
                      <span className="friend-name">
                        {friend.first_name}<br />
                        {friend.last_name}
                      </span>
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
        <Footer />
      </IonContent>
    </IonPage>
  );
};

export default Profile;