import { useState } from 'react';
import '../styles/tuenti-main-content.css';

export default function MainContent() {
  const [statusText, setStatusText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const maxLength = 320;
  const remainingChars = maxLength - statusText.length;
  const isNearLimit = remainingChars <= 20;

  const handleTextareaInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    target.style.height = 'auto';
    target.style.height = target.scrollHeight + 'px';
  };

  return (
    <main className="tuenti-main-content">
      {/* Status Update Section */}
      <div className="tuenti-status-container">
        <div className="tuenti-status-input-container">
          <div className="tuenti-status-icon"></div>
          <textarea
            value={statusText}
            onChange={(e) => setStatusText(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onInput={handleTextareaInput}
            placeholder="Actualiza tu estado"
            className="tuenti-status-textarea"
            maxLength={maxLength}
            rows={1}
          />
        </div>
        
        {/* Character Counter */}
        {isFocused && (
          <div className={`tuenti-char-counter ${isNearLimit ? 'near-limit' : ''}`}>
            {remainingChars}
          </div>
        )}
      </div>
      
      {/* Status Actions Section */}
      <div className="tuenti-status-actions">
        <div className="tuenti-last-update">
          <span className="tuenti-last-update-label">Última actualización:</span>
          <span className="tuenti-last-update-text">Oh shit k' calor, Lima esta ardiendooo</span>
          <span className="tuenti-last-update-time">hace 32 minutos</span>
        </div>
        <button className="tuenti-save-button">Guardar</button>
      </div>
      
      {/* News Feed Section */}
      <div className="tuenti-news-feed">
        <h2 className="tuenti-news-title">Novedades de tus amigos</h2>
        
        <div className="tuenti-posts-container">
          {/* Post 1 */}
          <div className="tuenti-post">
            <div className="tuenti-post-header">
              <div className="tuenti-post-avatar">
                <div className="tuenti-post-avatar-placeholder">👤</div>
              </div>
              <div className="tuenti-post-content">
                <div className="tuenti-post-meta">
                  <span className="tuenti-post-author">Irene Asensio</span>
                  <span className="tuenti-post-action">cambió su foto de perfil</span>
                </div>
                <p className="tuenti-post-time">hace 15 minutos</p>
                <div className="tuenti-post-image">
                  <div className="tuenti-post-image-placeholder">📷 Imagen</div>
                </div>
                <div className="tuenti-post-actions">
                  <button className="tuenti-post-action-button">
        <img src={`${import.meta.env.BASE_URL}arrow-bold-up.svg`} alt="Me gusta" className="tuenti-post-action-icon" />
                    Me gusta
                  </button>
                  <button className="tuenti-post-action-button">
        <img src={`${import.meta.env.BASE_URL}comment.svg`} alt="Comentar" className="tuenti-post-action-icon" />
                    Comentar
                  </button>
                  <button className="tuenti-post-action-button">
        <img src={`${import.meta.env.BASE_URL}arrow-bold-up.svg`} alt="Compartir" className="tuenti-post-action-icon" />
                    Compartir
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Post 2 */}
          <div className="tuenti-post">
            <div className="tuenti-post-header">
              <div className="tuenti-post-avatar">
                <div className="tuenti-post-avatar-placeholder">👤</div>
              </div>
              <div className="tuenti-post-content">
                <div className="tuenti-post-meta">
                  <span className="tuenti-post-author">Rocío Pereira</span>
                  <span className="tuenti-post-action">¡Qué me voy a ver a Michael Ignatieff!</span>
                </div>
                <p className="tuenti-post-time">hace 23 minutos</p>
                <div className="tuenti-post-actions">
                  <button className="tuenti-post-action-button">
        <img src={`${import.meta.env.BASE_URL}arrow-bold-up.svg`} alt="Me gusta" className="tuenti-post-action-icon" />
                    Me gusta
                  </button>
                  <button className="tuenti-post-action-button">
        <img src={`${import.meta.env.BASE_URL}comment.svg`} alt="Comentar" className="tuenti-post-action-icon" />
                    Comentar
                  </button>
                  <button className="tuenti-post-action-button">
        <img src={`${import.meta.env.BASE_URL}arrow-bold-up.svg`} alt="Compartir" className="tuenti-post-action-icon" />
                    Compartir
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Post 3 */}
          <div className="tuenti-post">
            <div className="tuenti-post-header">
              <div className="tuenti-post-avatar">
                <div className="tuenti-post-avatar-placeholder">👤</div>
              </div>
              <div className="tuenti-post-content">
                <div className="tuenti-post-meta">
                  <span className="tuenti-post-author">Verónica Miranda</span>
                  <span className="tuenti-post-action">Me puesto mucha esperanza en la Blackberry Buchones 8.9700</span>
                </div>
                <p className="tuenti-post-time">hace 31 minutos</p>
                <div className="tuenti-post-actions">
                  <button className="tuenti-post-action-button">
        <img src={`${import.meta.env.BASE_URL}arrow-bold-up.svg`} alt="Me gusta" className="tuenti-post-action-icon" />
                    Me gusta
                  </button>
                  <button className="tuenti-post-action-button">
        <img src={`${import.meta.env.BASE_URL}comment.svg`} alt="Comentar" className="tuenti-post-action-icon" />
                    Comentar
                  </button>
                  <button className="tuenti-post-action-button">
        <img src={`${import.meta.env.BASE_URL}arrow-bold-up.svg`} alt="Compartir" className="tuenti-post-action-icon" />
                    Compartir
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Load More Section */}
          <div className="tuenti-load-more">
            <button className="tuenti-load-more-button">Ver más</button>
          </div>
        </div>
      </div>
    </main>
  );
}
