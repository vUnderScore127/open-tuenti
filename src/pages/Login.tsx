import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import {
  IonPage,
  IonContent,
  IonInput,
  IonButton,
  IonCheckbox,
  IonLabel,
  IonToast,
  IonLoading
} from '@ionic/react';
import { User, MapPin, Smartphone } from 'lucide-react';
import { useAuth } from '../lib/auth';
import '../styles/tuenti-login.css';

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const [showLoadingScreen, setShowLoadingScreen] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [userEmail, setUserEmail] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastColor, setToastColor] = useState('success');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  
  const { user, loading, signIn } = useAuth();
  const history = useHistory();

  // Modificar el useEffect para manejar sesiones existentes
  useEffect(() => {
    if (user && !loading) {
      // Si hay usuario, mostrar pantalla de carga
      setUserEmail(user.email || '');
      setShowLoadingScreen(true);
      
      // Simular progreso de carga
      const progressInterval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            history.push('/dashboard');
            return 100;
          }
          return prev + 2;
        });
      }, 90);
    }
  }, [user, loading, history]);

  const showToastMessage = (message: string, color: string = 'success') => {
    setToastMessage(message);
    setToastColor(color);
    setShowToast(true);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await signIn(email, password);
      
      // Guardar email para mostrar en pantalla de carga
      setUserEmail(email);
      
      // Mostrar pantalla de carga
      setShowLoadingScreen(true);
      
      // Simular progreso de carga
      const progressInterval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            // Navegar al dashboard después del login exitoso
            history.push('/dashboard');
            return 100;
          }
          return prev + 2;
        });
      }, 90);
      
      showToastMessage('¡Bienvenido a Tuentis!');
    } catch (error: any) {
      showToastMessage(error.message, 'danger');
      setIsLoading(false);
    }
  };

  // Pantalla de carga
  if (showLoadingScreen) {
    return (
      <IonPage>
        <IonContent className="ion-padding">
          <div className="min-h-screen bg-white flex flex-col">
            {/* Header con texto de carga */}
            <div className="p-4">
              <div className="text-black text-sm">
                Cargando <span className="font-bold">{userEmail}</span> <span className="font-bold">{loadingProgress}%</span>
              </div>
            </div>
            
            {/* Barra de progreso con borde grisáceo */}
            <div className="px-4">
              <div className="progress-container">
                <div 
                  className="progress-bar" 
                  style={{
                    width: `${loadingProgress}%`
                  }}
                ></div>
              </div>
            </div>
            
            {/* Contenido principal - cumpleaños estilo Tuenti */}
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                {/* Mensaje de cumpleaños estilo Tuenti más grande */}
                <div className="bg-white p-8 rounded-lg shadow-sm max-w-4xl mx-auto border border-gray-200">
                  <div className="flex items-start space-x-6">
                    {/* Logo de Tuenti */}
                    <div className="flex-shrink-0">
                      <div className="w-16 h-16 flex items-center justify-center">
                        <img 
                          src={`${import.meta.env.BASE_URL}Logo_tuenti_positivo_color.png`} 
                          alt="Tuenti" 
                          className="w-12 h-12 object-contain"
                        />
                      </div>
                    </div>
                    
                    {/* Contenido del mensaje más grande */}
                    <div className="flex-1 text-left">
                      <p className="text-gray-700 text-lg leading-relaxed">
                        En los próximos días cumplen años <strong>Nuria Montero</strong> y <strong>Beatriz Blanco González</strong>.
                      </p>
                    </div>
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
        <div className="nSplash" style={{
          backgroundImage: `url("${import.meta.env.BASE_URL}noise.KmQE111qYh.png"), radial-gradient(circle at center, #6e90bc 0%, #426990 100%)`
        }}>
          <div className="contLogin">
            {/* Cover section */}
            <div className="cover">
              <img src={`${import.meta.env.BASE_URL}Logo_tuenti_positivo_color.png`} alt="tuenti" />
              <div className="description">
                <h2>¿Qué es Tuenti?</h2>
                <p>Tuenti es una plataforma social privada, a la que sólo se accede únicamente por invitación. Cada día la usan millones de personas para comunicarse entre ellas y compartir información.</p>
              </div>
              <div className="mainPoints">
                <h3>Social</h3>
                <p className="social-text">Conecta con tus amigos de forma segura y divertida. Comparte fotos, vídeos y mensajes.</p>
                <h3>Local</h3>
                <p className="local-text">Descubre eventos y lugares cerca de ti</p>
              </div>
            </div>

            {/* Login section */}
            <div className="login">
              <div className="body">
                <form onSubmit={handleLogin}>
                  <ul>
                    <li className="form-row">
                      <div className="input-group">
                        <label className="field-label">Email</label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="field-input"
                        />
                      </div>
                      <div className="input-group">
                        <label className="field-label">Contraseña</label>
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="field-input"
                        />
                      </div>
                      <input type="submit" value="Entrar" className="submit" />
                    </li>
                    <li>
                      <input 
                        type="checkbox" 
                        id="recordarme" 
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                      />
                      <label htmlFor="recordarme">Recordarme</label>
                    </li>
                    <li className="forgot-password-row">
                      <a href={`${import.meta.env.BASE_URL}reset-password`}>¿Olvidaste tu contraseña?</a>
                    </li>
                  </ul>
                </form>
              </div>
            </div>
          </div>

          {/* Footer eliminado */}
        </div>

        {/* Toast para mensajes */}
        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={3000}
          color={toastColor}
        />

        {/* Loading overlay */}
        <IonLoading
          isOpen={isLoading && !showLoadingScreen}
          message="Iniciando sesión..."
        />
      </IonContent>
    </IonPage>
  );
}
