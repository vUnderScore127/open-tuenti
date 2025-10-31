
import React, { useEffect, useState } from 'react';
import { IonHeader, IonToolbar, IonTitle, IonButton, IonIcon, IonSearchbar } from '@ionic/react';
import { logOutOutline, settingsOutline, helpCircleOutline, cloudUploadOutline } from 'ionicons/icons';
import { useAuth } from '../lib/auth';
import { supabase } from '@/lib/supabase';
import { useHistory, useLocation } from 'react-router-dom';
import '../styles/tuenti-header.css';

const Header: React.FC = () => {
  const { signOut, user } = useAuth();
  const history = useHistory();
  const location = useLocation();
  const [searchText, setSearchText] = useState('');
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const loadRole = async () => {
      try {
        // Usa el usuario del contexto para reaccionar a cambios de sesión
        const uid = user?.id ?? (await supabase.auth.getUser()).data?.user?.id;
        if (!uid) {
          setIsAdmin(false);
          return;
        }
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', uid)
          .single();
        if (error) {
          setIsAdmin(false);
          return;
        }
        const role = (data as any)?.role;
        setIsAdmin(role === 'admin');
      } catch (e) {
        setIsAdmin(false);
      }
    };
    loadRole();
  }, [user?.id]);

  const handleLogout = async () => {
    await signOut();
    history.push('/login');
  };

  const handlePreferences = () => {
    handleNavigation('/settings');
    setShowSettingsDropdown(false);
  };

  const handleNavigation = (path: string) => {
    history.push(path);
  };

  const menuItems = [
    { name: 'Inicio', path: '/dashboard' },
    { name: 'Perfil', path: '/profile' },
    { name: 'Mensajes', path: '/privatemessages' },
    { name: 'Gente', path: '/people' },
    { name: 'Vídeos', path: '/videos' },
    { name: 'Juegos', path: '/games' }
  ];
  const adminItem = { name: 'Admin', path: '/admin' };

  const isActiveMenu = (path: string) => {
    return location.pathname === path;
  };

  return (
    <IonHeader className="ion-no-border">
      <div className="tuenti-header">
        <div className="tuenti-header-container">
          <div className="tuenti-header-content">
            {/* Logo */}
            <div className="tuenti-logo">
              <img 
                src={`${import.meta.env.BASE_URL}Logo_tuenti_positivo_color.png`} 
                alt="Tuenti" 
                onClick={() => handleNavigation('/dashboard')}
              />
            </div>

            {/* Vertical Divider after Logo */}
            <div className="tuenti-divider"></div>

            {/* Navigation Menu */}
            <nav className="tuenti-nav">
              {menuItems.map((item) => (
                <button
                  key={item.name}
                  onClick={() => handleNavigation(item.path)}
                  className={`tuenti-nav-item ${isActiveMenu(item.path) ? 'active' : ''}`}
                >
                  {item.name}
                </button>
              ))}
            </nav>

            {/* Right Section */}
            <div className="tuenti-header-right">
              {/* Search Bar */}
              <div className="tuenti-search-container">
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="tuenti-search-input"
                />
                <button className="tuenti-search-button tuenti-search-icon">
                  <img src={`${import.meta.env.BASE_URL}search.svg`} alt="Buscar" />
                </button>
              </div>

              {/* Upload Button */}
              <button className="tuenti-upload-button">
                <span>Subir fotos</span>
                <span className="tuenti-upload-icon">
                  <img src={`${import.meta.env.BASE_URL}arrow-bold-up.svg`} alt="Subir" />
                </span>
              </button>

              {/* Vertical Divider */}
              <div className="tuenti-divider-small"></div>

              {/* Settings Dropdown */}
              <div className="tuenti-settings-container">
                <button
                  onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
                  className="tuenti-settings-button"
                >
                  <span className="tuenti-settings-icon">
                    <img src={`${import.meta.env.BASE_URL}tray-gear-26.svg`} alt="Ajustes" />
                  </span>
                  <span className="tuenti-dropdown-icon"></span>
                </button>

                {showSettingsDropdown && (
                  <div className="tuenti-settings-dropdown">
                    <button 
                      onClick={handlePreferences}
                      className="tuenti-dropdown-item"
                    >
                      <span>Preferencias</span>
                    </button>
                    <button className="tuenti-dropdown-item">
                      <span>Ayuda</span>
                    </button>
                    <div className="tuenti-dropdown-divider"></div>
                    <button 
                      onClick={handleLogout}
                      className="tuenti-dropdown-item"
                    >
                      <span>Cerrar sesión</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Admin button moved after settings */}
              {isAdmin && (
                <button
                  className="tuenti-upload-button"
                  onClick={() => handleNavigation(adminItem.path)}
                >
                  <span>Admin</span>
                  <span className="tuenti-upload-icon">
                    <img src={`${import.meta.env.BASE_URL}shield-check.svg`} alt="Admin" />
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </IonHeader>
  );
};

export default Header;
