import React, { useState } from 'react';
import { IonContent, IonPage, IonButton, IonInput, IonItem, IonLabel, IonToast } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const ResetPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const history = useHistory();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setToastMessage('Por favor, introduce tu email');
      setShowToast(true);
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}reset-password`,
      });

      if (error) throw error;

      setToastMessage('Revisa tu bandeja de entrada para restablecer tu contraseña.');
      setShowToast(true);
      setTimeout(() => {
        window.location.href = `${window.location.origin}${import.meta.env.BASE_URL}login`;
      }, 2000);
    } catch (error: any) {
      setToastMessage(error.message || 'Error al enviar el email');
      setShowToast(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <IonPage>
      <IonContent 
        style={{
          '--background': '#54779f',
          backgroundImage: `
            url("${import.meta.env.BASE_URL}noise.KmQE111qYh.png"),
            radial-gradient(circle at center, #6e90bc 0%, #426990 100%)
          `,
          background: '#54779f'
        }}
      >
        <div className="tuenti-reset-container">
          <div className="canvas password">
            <div className="body">
              <form onSubmit={handleSubmit}>
                <fieldset>
                  <h2 style={{ 
                    borderBottom: '1px solid #d9d9d9',
                    fontSize: '16px',
                    fontWeight: 'normal',
                    lineHeight: '14px',
                    padding: '0 0 8px 0',
                    margin: '0 0 15px 0',
                    color: '#333',
                    textAlign: 'center'
                  }}>
                    Pedir nueva contraseña
                  </h2>
                  
                  <p style={{
                    fontSize: '12px',
                    lineHeight: '18px',
                    color: '#8a8a8a',
                    marginBottom: '15px',
                    textAlign: 'center'
                  }}>
                    Introduce tu dirección de email y te enviaremos un enlace para restablecer tu contraseña.
                  </p>

                  <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                    <li style={{ 
                      clear: 'both',
                      margin: '0 0 6px 0',
                      height: '1%',
                      overflow: 'hidden'
                    }}>
                      <label 
                        htmlFor="email"
                        style={{
                          display: 'block',
                          float: 'left',
                          fontSize: '12px',
                          margin: '0 10px 0 0',
                          padding: '8px 0',
                          textAlign: 'right',
                          width: '70px',
                          color: '#7e7e7e',
                          fontWeight: 'normal'
                        }}
                      >
                        Email
                      </label>
                      <span 
                        className="input"
                        style={{
                          padding: '3px',
                          backgroundColor: '#f5f5f5',
                          display: 'inline-block',
                          borderRadius: '3px',
                          width: '252px'
                        }}
                      >
                        <input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          disabled={isLoading}
                          style={{
                            width: '240px',
                            padding: '5px',
                            fontSize: '15px',
                            border: 'none',
                            backgroundColor: 'transparent',
                            outline: 'none'
                          }}
                          placeholder="tu@email.com"
                          required
                        />
                      </span>
                    </li>
                    
                    <li 
                      className="buttons"
                      style={{
                        padding: '10px 0 0 80px',
                        textAlign: 'left',
                        margin: 0
                      }}
                    >
                      <input
                        type="submit"
                        className="submit"
                        value={isLoading ? 'Enviando...' : 'Enviar'}
                        disabled={isLoading}
                        style={{
                          background: 'linear-gradient(to bottom, #90ceea 0%, #73c5ef 100%)',
                          border: '1px solid #426386',
                          borderRadius: '3px',
                          color: 'white',
                          textShadow: '0 -1px #8bc0d9',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          height: '32px',
                          padding: '0 15px',
                          cursor: isLoading ? 'not-allowed' : 'pointer',
                          opacity: isLoading ? 0.6 : 1,
                          marginRight: '10px'
                        }}
                      />
                      
                      <button
                        type="button"
                        onClick={() => window.location.href = `${window.location.origin}${import.meta.env.BASE_URL}login`}
                        disabled={isLoading}
                        style={{
                          background: '#f5f5f5',
                          border: '1px solid #ccc',
                          borderRadius: '3px',
                          color: '#666',
                          fontSize: '12px',
                          height: '32px',
                          padding: '0 15px',
                          cursor: isLoading ? 'not-allowed' : 'pointer',
                          opacity: isLoading ? 0.6 : 1
                        }}
                      >
                        Cancelar
                      </button>
                    </li>
                  </ul>
                </fieldset>
              </form>
            </div>
          </div>
        </div>

        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={3000}
          position="top"
        />
      </IonContent>

      <style>{`
        .tuenti-reset-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          padding: 20px;
        }
        
        .canvas.password {
          width: 392px;
          position: relative;
          z-index: 1;
        }
        
        .canvas .body {
          margin: auto;
          background: #4c759b;
          border: 6px solid #4c759b;
          margin: 15px 0 0;
          border-radius: 4px;
        }
        
        .canvas .body form {
          background: #FFF;
          padding: 15px;
          width: auto;
          border-radius: 3px;
        }
        
        .canvas .body form fieldset {
          border: none;
          margin: 0;
          padding: 0;
        }
        
        .canvas .body form ul li:hover .input {
          background-color: #eee;
        }
        
        .canvas .body form input.submit:hover {
          background: linear-gradient(to bottom, #7bb8e0 0%, #5fb0e8 100%);
        }
        
        .canvas .body form input.submit:active {
          background: linear-gradient(to bottom, #5fb0e8 0%, #7bb8e0 100%);
        }
      `}</style>
    </IonPage>
  );
};

export default ResetPassword;
