import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import {
  IonPage,
  IonContent,
  IonToast,
  IonLoading,
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButton,
  IonInput,
  IonItem,
  IonLabel,
  IonButtons
} from '@ionic/react';
import { useAuth } from '../lib/auth';
import '../styles/tuenti-login-mobile.css';

const LoginMobile: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showLoadingScreen, setShowLoadingScreen] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [progressTimerActive, setProgressTimerActive] = useState(false);
  const { signIn, user } = useAuth();
  const history = useHistory();

  // Efecto para manejar el progreso de carga
  useEffect(() => {
    if (showLoadingScreen && loadingProgress >= 100) {
      setTimeout(() => {
        history.push('/dashboard');
      }, 500);
    }
  }, [showLoadingScreen, loadingProgress, history]);

  // Efecto para redirigir cuando el usuario se autentica exitosamente
  useEffect(() => {
    if (user && showLoadingScreen) {
      console.log('🔐 LoginMobile: Usuario autenticado, redirigiendo...');
      setTimeout(() => {
        window.location.href = `${window.location.origin}${import.meta.env.BASE_URL}dashboard`;
      }, 1000);
    }
  }, [user, showLoadingScreen]);

  const showLoginFormHandler = () => {
    setShowLoginForm(true);
  };

  const hideLoginForm = () => {
    setShowLoginForm(false);
    setEmail('');
    setPassword('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔐 LoginMobile: handleLogin iniciado', { email, password: '***' });
    
    if (!email || !password) {
      console.log('🔐 LoginMobile: Campos vacíos');
      setToastMessage('Por favor, completa todos los campos');
      setShowToast(true);
      return;
    }

    console.log('🔐 LoginMobile: Estableciendo loading = true');
    setLoading(true);
    try {
      console.log('🔐 LoginMobile: Llamando signIn...');
      await signIn(email, password);
      console.log('🔐 LoginMobile: signIn exitoso');
      
      // Mostrar pantalla de carga
      setShowLoadingScreen(true);
      setLoadingProgress(0);
      hideLoginForm();
      
      // Iniciar progreso visual mientras esperamos la redirección
      if (!progressTimerActive) {
        setProgressTimerActive(true);
        const progressInterval = setInterval(() => {
          setLoadingProgress(prev => (prev >= 100 ? 100 : prev + 5));
        }, 100);
        
        setTimeout(() => {
          clearInterval(progressInterval);
          setProgressTimerActive(false);
        }, 2000);
      }
    } catch (error: any) {
      console.error('🔐 LoginMobile: Error en signIn:', error);
      setLoading(false);
      setToastMessage(error.message || 'Error al iniciar sesión');
      setShowToast(true);
    }
  };

  // Pantalla de carga móvil
  if (showLoadingScreen) {
    return (
      <IonPage>
        <IonContent className="ion-no-padding">
          <div className="mobile-loading-container">
            {/* Header con texto de carga */}
            <div className="mobile-loading-header">
              <div className="mobile-loading-text">
                Cargando <span className="mobile-loading-email">{email}</span> <span className="mobile-loading-progress">{loadingProgress}%</span>
              </div>
            </div>
            
            {/* Barra de progreso móvil */}
            <div className="mobile-progress-container">
              <div 
                className="mobile-progress-bar" 
                style={{
                  width: `${loadingProgress}%`
                }}
              ></div>
            </div>
            
            {/* Contenido principal móvil - cumpleaños estilo Tuenti */}
            <div className="mobile-loading-content">
              <div className="mobile-birthday-card">
                <div className="mobile-birthday-header">
                  {/* Logo de Tuenti */}
                  <div className="mobile-birthday-logo">
                    <img 
                      src={`${import.meta.env.BASE_URL}Logo_tuenti_positivo_color.png`} 
                      alt="Tuenti" 
                      className="mobile-logo-small"
                    />
                  </div>
                  
                  {/* Contenido del mensaje */}
                  <div className="mobile-birthday-text">
                    <p>
                      En los próximos días cumplen años <strong>Nuria Montero</strong> y <strong>Beatriz Blanco González</strong>.
                    </p>
                    <p>
                      ¡No te olvides de felicitarles!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonContent className="ion-no-padding">
        <div className="mobile-login-container" style={{
          backgroundImage: `url("${import.meta.env.BASE_URL}noise.KmQE111qYh.png"), radial-gradient(circle at center, #6e90bc 0%, #426990 100%)`
        }}>
          {/* Logo centrado en la parte superior */}
          <div className="mobile-logo-container">
            <img 
              src={`${import.meta.env.BASE_URL}Logo_tuenti_positivo_color.png`} 
              alt="tuenti" 
              className="mobile-logo"
            />
          </div>

          {/* Secciones Social y Local */}
          <div className="mobile-features">
            <div className="mobile-feature">
              <div className="mobile-feature-header">
                <img 
                  src={`${import.meta.env.BASE_URL}person-alt.svg`} 
                  alt="Social" 
                  className="mobile-feature-icon"
                />
                <h3>Social</h3>
              </div>
              <p>Conecta con tus amigos de forma segura y divertida. Comparte fotos, vídeos y mensajes.</p>
            </div>
            
            <div className="mobile-feature">
              <div className="mobile-feature-header">
                <img 
                  src={`${import.meta.env.BASE_URL}map-pin-2-fill.svg`} 
                  alt="Local" 
                  className="mobile-feature-icon"
                />
                <h3>Local</h3>
              </div>
              <p>Descubre eventos y lugares cerca de ti.</p>
            </div>
          </div>

          {/* Botones de acción o formulario de login */}
          {!showLoginForm ? (
            <div className="mobile-actions">
              <button 
                className="mobile-btn mobile-btn-primary"
                onClick={showLoginFormHandler}
              >
                Iniciar Sesión
              </button>
              
              <div className="mobile-separator">
                <div className="mobile-separator-line"></div>
                <span className="mobile-separator-text">o</span>
                <div className="mobile-separator-line"></div>
              </div>
              
              <button 
                className="mobile-btn mobile-btn-secondary"
                onClick={() => history.push('/signup')}
              >
                Regístrate
              </button>
            </div>
          ) : (
            <div className="mobile-login-form">
              <div className="login-form-header">
                <h2 className="login-form-title">Iniciar Sesión</h2>
                <button 
                  className="login-form-back"
                  onClick={hideLoginForm}
                >
                  ← Volver
                </button>
              </div>
              
              <form onSubmit={handleLogin} className="login-form">
                <div className="input-group">
                  <label className="field-label">Correo electrónico</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    className="field-input"
                    required
                  />
                </div>
                
                <div className="input-group">
                  <label className="field-label">Contraseña</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Introduce tu contraseña"
                    className="field-input"
                    required
                  />
                </div>
                
                <IonButton 
                  type="submit" 
                  expand="block" 
                  className="login-submit-btn"
                  disabled={loading}
                >
                  {loading ? 'Iniciando...' : 'Entrar'}
                </IonButton>
              </form>
              
              <div className="login-form-footer">
                <p className="forgot-password">
                  <a href={`${import.meta.env.BASE_URL}reset-password`} className="forgot-link">¿Olvidaste tu contraseña?</a>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Toast para mensajes */}
        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={3000}
        />

        {/* Loading overlay */}
        <IonLoading
          isOpen={loading}
          message="Iniciando sesión..."
        />
      </IonContent>
    </IonPage>
  );
};

export default LoginMobile;