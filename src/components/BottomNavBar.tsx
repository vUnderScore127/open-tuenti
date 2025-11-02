import React from 'react';
import { IonIcon } from '@ionic/react';
import { useHistory, useLocation } from 'react-router-dom';
import { 
  homeOutline, 
  home,
  personOutline, 
  person,
  peopleOutline, 
  people,
  chatbubbleOutline,
  chatbubble
} from 'ionicons/icons';
import '../styles/tuenti-bottom-nav.css';

interface BottomNavBarProps {
  className?: string;
}

const BottomNavBar: React.FC<BottomNavBarProps> = ({ className }) => {
  const history = useHistory();
  const location = useLocation();

  const navItems = [
    {
      label: 'Inicio',
      path: '/dashboard',
      iconOutline: homeOutline,
      iconFilled: home
    },
    {
      label: 'Perfil',
      path: '/profile',
      iconOutline: personOutline,
      iconFilled: person
    },
    {
      label: 'Gente',
      path: '/people',
      iconOutline: peopleOutline,
      iconFilled: people
    },
    {
      label: 'Mensajes',
      path: '/privatemessages',
      iconOutline: chatbubbleOutline,
      iconFilled: chatbubble
    }
  ];

  const handleNavigation = (path: string) => {
    history.push(path);
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className={`tuenti-bottom-nav ${className || ''}`}>
      <div className="tuenti-bottom-nav-container">
        {navItems.map((item) => (
          <button
            key={item.path}
            className={`tuenti-bottom-nav-item ${isActive(item.path) ? 'active' : ''}`}
            onClick={() => handleNavigation(item.path)}
          >
            <IonIcon 
              icon={isActive(item.path) ? item.iconFilled : item.iconOutline}
              className="tuenti-bottom-nav-icon"
            />
            <span className="tuenti-bottom-nav-label">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default BottomNavBar;