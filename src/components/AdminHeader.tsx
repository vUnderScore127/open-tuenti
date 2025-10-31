import React from 'react'
import { IonHeader } from '@ionic/react'
import '../styles/tuenti-header.css'

export type TabKey = 'usuarios' | 'invitaciones' | 'moderacion' | 'soporte' | 'paginas' | 'eventos' | 'blog'

interface Props {
  activeTab: TabKey | null
  onSelectTab: (tab: TabKey | null) => void
}

const AdminHeader: React.FC<Props> = ({ activeTab, onSelectTab }) => {
  const isActive = (tab: TabKey | null) => activeTab === tab

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
              />
            </div>

            {/* Vertical Divider after Logo */}
            <div className="tuenti-divider"></div>

            {/* Admin Navigation Menu */}
            <nav className="tuenti-nav">
              {([
                { name: 'Inicio', key: null },
                { name: 'Usuarios', key: 'usuarios' as TabKey },
                { name: 'Invitaciones', key: 'invitaciones' as TabKey },
                { name: 'Moderación', key: 'moderacion' as TabKey },
                { name: 'Soporte', key: 'soporte' as TabKey },
                { name: 'Páginas', key: 'paginas' as TabKey },
                { name: 'Eventos', key: 'eventos' as TabKey },
                { name: 'Blog', key: 'blog' as TabKey }
              ] as { name: string; key: TabKey | null }[]).map(item => (
                <button
                  key={String(item.key)}
                  onClick={() => onSelectTab(item.key)}
                  className={`tuenti-nav-item ${isActive(item.key) ? 'active' : ''}`}
                >
                  {item.name}
                </button>
              ))}
            </nav>

            {/* Right Section: Volver a Tuenti */}
            <div className="tuenti-header-right">
              <button
                className="tuenti-upload-button"
                onClick={() => (window.location.href = '/dashboard')}
              >
                <span>Volver a Tuenti</span>
                <span className="tuenti-upload-icon flip-arrow" aria-hidden="true">
                  {/* Inline SVG arrow that flips */}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 4l-8 8 8 8" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M20 12H5" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </IonHeader>
  )
}

export default AdminHeader