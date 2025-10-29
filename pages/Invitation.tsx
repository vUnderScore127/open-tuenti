import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase, invitationsService, GENDER_OPTIONS, DAY_OPTIONS, MONTH_OPTIONS, YEAR_OPTIONS } from '../lib/supabase';
import type { Invitation } from '../lib/supabase';

const InvitationPage: React.FC = () => {
  const { code: pathCode } = useParams<{ code: string }>();
  const [searchParams] = useSearchParams();
  const queryCode = searchParams.get('code');
  const navigate = useNavigate();
  
  // Usar el código del path o del query parameter
  const code = pathCode || queryCode;
  
  const [step, setStep] = useState<'welcome' | 'disclaimer' | 'register'>('welcome');
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    gender: '',
    birthDay: '',
    birthMonth: '',
    birthYear: '',
    country: '',
    autonomousCommunity: '',
    province: '',
    city: '',
    acceptTerms: false
  });

  useEffect(() => {
    if (code) {
      validateInvitation();
    } else {
      // Si no hay código, establecer error y detener carga
      setError('Código de invitación requerido');
      setLoading(false);
    }
  }, [code]);

  const validateInvitation = async () => {
    try {
      setLoading(true);
      setError(''); // Limpiar errores previos
      const result = await invitationsService.validateInvitationCode(code!);
      setInvitation(result);
    } catch (err: any) {
      console.error('Error validating invitation:', err);
      setError('Código de invitación inválido o expirado');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
  if (formData.password !== formData.confirmPassword) {
    setError('Las contraseñas no coinciden');
    return;
  }

  if (!formData.acceptTerms) {
    setError('Debes aceptar los términos y condiciones');
    return;
  }

  if (!formData.country.trim()) {
    setError('El país es obligatorio');
    return;
  }

  try {
    setLoading(true);
    
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          first_name: formData.firstName,
          last_name: formData.lastName,
          gender: formData.gender,
          birth_day: formData.birthDay,
          birth_month: formData.birthMonth,
          birth_year: formData.birthYear,
          country: formData.country,
          autonomous_community: formData.autonomousCommunity,
          province: formData.province,
          city: formData.city
        }
      }
    });
    
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    
    // Si la confirmación de email está habilitada
    if (data.user && !data.user.email_confirmed_at) {
      setError('Se ha enviado un email de confirmación. Por favor, revisa tu bandeja de entrada.');
      return;
    }
    
    if (data.user) {
      // Crear el usuario en la tabla profiles personalizada
      const { data: userData, error: userInsertError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          email: formData.email,
          first_name: formData.firstName,
          last_name: formData.lastName,
          gender: formData.gender,
          birth_day: formData.birthDay,
          birth_month: formData.birthMonth,
          birth_year: formData.birthYear,
          country: formData.country,
          autonomous_community: formData.autonomousCommunity,
          province: formData.province,
          city: formData.city,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (userInsertError) {
        console.error('Error creating user record:', userInsertError);
        setError('Error al crear el perfil de usuario');
        return;
      }
      
      // Marcar la invitación como usada
      if (invitation) {
        await invitationsService.useInvitation(invitation.invitation_code, data.user.id);
      }
      
      // Guardar el usuario en localStorage para autenticación
      if (userData) {
        localStorage.setItem('tuentis_user', JSON.stringify(userData));
        
        // Disparar evento personalizado para notificar el cambio de autenticación
        window.dispatchEvent(new Event('tuentis-auth-change'));
      }
      
      navigate('/');
    }
  } catch (err: any) {
    setError(err.message || 'Error al crear la cuenta');
  } finally {
    setLoading(false);
  }
};

  if (loading) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
        minHeight: '100vh',
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '11px',
        color: '#333',
        margin: 0,
        padding: 0
      }}>
        <div style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: '392px',
          marginLeft: '-196px',
          marginTop: '-145px'
        }}>
          <div style={{
            background: '#1e3a8a',
            border: '6px solid #1e3a8a',
            borderRadius: '4px',
            margin: '15px 0 0'
          }}>
            <div style={{
              background: '#FFF',
              padding: '15px',
              borderRadius: '3px',
              textAlign: 'center'
            }}>
              Cargando...
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
        minHeight: '100vh',
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '11px',
        color: '#333',
        margin: 0,
        padding: 0
      }}>
        <div style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: '392px',
          marginLeft: '-196px',
          marginTop: '-145px'
        }}>
          <div style={{
            background: '#1e3a8a',
            border: '6px solid #1e3a8a',
            borderRadius: '4px',
            margin: '15px 0 0'
          }}>
            <div style={{
              background: '#FFF',
              padding: '15px',
              borderRadius: '3px',
              textAlign: 'center',
              color: '#E58080'
            }}>
              {error}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const renderWelcomeStep = () => (
    <div style={{
      background: '#FFF',
      padding: '15px',
      borderRadius: '3px'
    }}>
      <h2 style={{
        borderBottom: '1px solid #D9D9D9',
        fontSize: '16px',
        fontWeight: 'normal',
        lineHeight: '14px',
        padding: '0px 0px 8px 0px',
        margin: '0 0 15px 0',
        color: '#333'
      }}>
        ¡Bienvenido a Tuenties!
      </h2>
      <p style={{
  fontSize: '12px',
  lineHeight: '18px',
  color: '#8A8A8A',
  marginBottom: '15px'
}}>
  {invitation?.created_by_user?.first_name && invitation?.created_by_user?.last_name ? (
    <>
      <strong>{invitation.created_by_user.first_name} {invitation.created_by_user.last_name}</strong> te ha invitado a unirte a Tuenties.
      
      Tuenties es el lugar donde puedes 
      conectar con tus amigos, compartir fotos, enviar mensajes y descubrir 
      qué está pasando en tu círculo social.
    </>
  ) : (
    <>
      Has sido invitado a unirte a Tuenties, la red social más popular de España.
      Tuenties es el lugar donde puedes conectar con tus amigos, compartir fotos,
      enviar mensajes y descubrir qué está pasando en tu círculo social.
    </>
  )}
</p>
      <div style={{ textAlign: 'center' }}>
        <button
          onClick={() => setStep('disclaimer')}
          style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
            border: '1px solid #1e3a8a',
            padding: '8px 15px',
            fontSize: '12px',
            color: '#FFF',
            cursor: 'pointer',
            borderRadius: '3px'
          }}
        >
          Continuar
        </button>
      </div>
    </div>
  );

  const renderDisclaimerStep = () => (
    <div style={{
      background: '#FFF',
      padding: '15px',
      borderRadius: '3px'
    }}>
      <h2 style={{
        borderBottom: '1px solid #D9D9D9',
        fontSize: '16px',
        fontWeight: 'normal',
        lineHeight: '14px',
        padding: '0px 0px 8px 0px',
        margin: '0 0 15px 0',
        color: '#333'
      }}>
        Términos y Condiciones
      </h2>
      <div style={{
        maxHeight: '200px',
        overflowY: 'auto',
        border: '1px solid #D9D9D9',
        padding: '10px',
        marginBottom: '15px',
        fontSize: '11px',
        lineHeight: '1.4'
      }}>
        <p style={{ marginBottom: '10px' }}>
          Al registrarte en Tuenties, aceptas nuestros términos de uso y política de privacidad.
          Tuenties se compromete a proteger tu información personal y a proporcionar un entorno
          seguro para la interacción social.
        </p>
        <p style={{ marginBottom: '10px' }}>
          • Debes ser mayor de 14 años para usar Tuenties
        </p>
        <p style={{ marginBottom: '10px' }}>
          • No está permitido el contenido ofensivo o inapropiado
        </p>
        <p style={{ marginBottom: '10px' }}>
          • Respeta la privacidad de otros usuarios
        </p>
        <p>
          • Tuenties se reserva el derecho de suspender cuentas que violen estos términos
        </p>
      </div>
      <div style={{ textAlign: 'center' }}>
        <button
          onClick={() => setStep('register')}
          style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
            border: '1px solid #1e3a8a',
            padding: '8px 15px',
            fontSize: '12px',
            color: '#FFF',
            cursor: 'pointer',
            borderRadius: '3px',
            marginRight: '10px'
          }}
        >
          Acepto y continúo
        </button>
        <button
          onClick={() => setStep('welcome')}
          style={{
            background: 'transparent',
            border: '1px solid #D9D9D9',
            padding: '7px 15px',
            fontSize: '12px',
            color: '#666',
            cursor: 'pointer',
            borderRadius: '3px'
          }}
        >
          Volver
        </button>
      </div>
    </div>
  );

  const renderRegisterStep = () => (
    <div style={{
      background: '#FFF',
      padding: '15px',
      borderRadius: '3px'
    }}>
      <h2 style={{
        borderBottom: '1px solid #D9D9D9',
        fontSize: '16px',
        fontWeight: 'normal',
        lineHeight: '14px',
        padding: '0px 0px 8px 0px',
        margin: '0 0 15px 0',
        color: '#333'
      }}>
        Crear tu cuenta
      </h2>
      
      {error && (
        <div style={{
          color: '#E58080',
          fontSize: '11px',
          marginBottom: '10px',
          padding: '5px',
          backgroundColor: '#FFF0F0',
          border: '1px solid #E58080',
          borderRadius: '3px'
        }}>
          {error}
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); handleRegister(); }}>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          <li style={{ marginBottom: '10px', overflow: 'hidden' }}>
            <label style={{
              display: 'block',
              float: 'left',
              fontSize: '12px',
              margin: '0 10px 0 0',
              padding: '8px 0',
              textAlign: 'right',
              width: '70px',
              color: '#7E7E7E',
              fontWeight: 'normal'
            }}>
              Nombre:
            </label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => setFormData({...formData, firstName: e.target.value})}
              required
              style={{
                width: '240px',
                padding: '5px',
                fontSize: '15px',
                border: '1px solid #CCC',
                borderRadius: '2px',
                background: '#FFF'
              }}
            />
          </li>
          
          <li style={{ marginBottom: '10px', overflow: 'hidden' }}>
            <label style={{
              display: 'block',
              float: 'left',
              fontSize: '12px',
              margin: '0 10px 0 0',
              padding: '8px 0',
              textAlign: 'right',
              width: '70px',
              color: '#7E7E7E',
              fontWeight: 'normal'
            }}>
              Apellidos:
            </label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => setFormData({...formData, lastName: e.target.value})}
              required
              style={{
                width: '240px',
                padding: '5px',
                fontSize: '15px',
                border: '1px solid #CCC',
                borderRadius: '2px',
                background: '#FFF'
              }}
            />
          </li>

          <li style={{ marginBottom: '10px', overflow: 'hidden' }}>
            <label style={{
              display: 'block',
              float: 'left',
              fontSize: '12px',
              margin: '0 10px 0 0',
              padding: '8px 0',
              textAlign: 'right',
              width: '70px',
              color: '#7E7E7E',
              fontWeight: 'normal'
            }}>
              Email:
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required
              style={{
                width: '240px',
                padding: '5px',
                fontSize: '15px',
                border: '1px solid #CCC',
                borderRadius: '2px',
                background: '#FFF'
              }}
            />
          </li>

          <li style={{ marginBottom: '10px', overflow: 'hidden' }}>
            <label style={{
              display: 'block',
              float: 'left',
              fontSize: '12px',
              margin: '0 10px 0 0',
              padding: '8px 0',
              textAlign: 'right',
              width: '70px',
              color: '#7E7E7E',
              fontWeight: 'normal'
            }}>
              Género:
            </label>
            <select
              value={formData.gender}
              onChange={(e) => setFormData({...formData, gender: e.target.value})}
              required
              style={{
                width: '252px',
                padding: '5px',
                fontSize: '15px',
                border: '1px solid #CCC',
                borderRadius: '2px',
                background: '#FFF'
              }}
            >
              <option value="">Selecciona tu género</option>
              {GENDER_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </li>

          <li style={{ marginBottom: '10px', overflow: 'hidden' }}>
            <label style={{
              display: 'block',
              float: 'left',
              fontSize: '12px',
              margin: '0 10px 0 0',
              padding: '8px 0',
              textAlign: 'right',
              width: '70px',
              color: '#7E7E7E',
              fontWeight: 'normal'
            }}>
              Nacimiento:
            </label>
            <div style={{ display: 'flex', gap: '5px' }}>
              <select
                value={formData.birthDay}
                onChange={(e) => setFormData({...formData, birthDay: e.target.value})}
                required
                style={{
                  width: '75px',
                  padding: '5px',
                  fontSize: '15px',
                  border: '1px solid #CCC',
                  borderRadius: '2px',
                  background: '#FFF'
                }}
              >
                <option value="">Día</option>
                {DAY_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                value={formData.birthMonth}
                onChange={(e) => setFormData({...formData, birthMonth: e.target.value})}
                required
                style={{
                  width: '80px',
                  padding: '5px',
                  fontSize: '15px',
                  border: '1px solid #CCC',
                  borderRadius: '2px',
                  background: '#FFF'
                }}
              >
                <option value="">Mes</option>
                {MONTH_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                value={formData.birthYear}
                onChange={(e) => setFormData({...formData, birthYear: e.target.value})}
                required
                style={{
                  width: '75px',
                  padding: '5px',
                  fontSize: '15px',
                  border: '1px solid #CCC',
                  borderRadius: '2px',
                  background: '#FFF'
                }}
              >
                <option value="">Año</option>
                {YEAR_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </li>

          <li style={{ marginBottom: '10px', overflow: 'hidden' }}>
            <label style={{
              display: 'block',
              float: 'left',
              fontSize: '12px',
              margin: '0 10px 0 0',
              padding: '8px 0',
              textAlign: 'right',
              width: '70px',
              color: '#7E7E7E',
              fontWeight: 'normal'
            }}>
              País*:
            </label>
            <input
              type="text"
              value={formData.country}
              onChange={(e) => setFormData({...formData, country: e.target.value})}
              placeholder="España, México, etc."
              required
              style={{
                width: '240px',
                padding: '5px',
                fontSize: '15px',
                border: '1px solid #CCC',
                borderRadius: '2px',
                background: '#FFF'
              }}
            />
          </li>

          <li style={{ marginBottom: '10px', overflow: 'hidden' }}>
            <label style={{
              display: 'block',
              float: 'left',
              fontSize: '12px',
              margin: '0 10px 0 0',
              padding: '8px 0',
              textAlign: 'right',
              width: '70px',
              color: '#7E7E7E',
              fontWeight: 'normal'
            }}>
              CC.AA.
            </label>
            <input
              type="text"
              value={formData.autonomousCommunity}
              onChange={(e) => setFormData({...formData, autonomousCommunity: e.target.value})}
              placeholder="C. Valenciana, Asturias, etc."
              style={{
                width: '240px',
                padding: '5px',
                fontSize: '15px',
                border: '1px solid #CCC',
                borderRadius: '2px',
                background: '#FFF'
              }}
            />
          </li>

          <li style={{ marginBottom: '10px', overflow: 'hidden' }}>
            <label style={{
              display: 'block',
              float: 'left',
              fontSize: '12px',
              margin: '0 10px 0 0',
              padding: '8px 0',
              textAlign: 'right',
              width: '70px',
              color: '#7E7E7E',
              fontWeight: 'normal'
            }}>
              Provincia:
            </label>
            <input
              type="text"
              value={formData.province}
              onChange={(e) => setFormData({...formData, province: e.target.value})}
              placeholder="Sevilla, Madrid, etc."
              style={{
                width: '240px',
                padding: '5px',
                fontSize: '15px',
                border: '1px solid #CCC',
                borderRadius: '2px',
                background: '#FFF'
              }}
            />
          </li>

          <li style={{ marginBottom: '10px', overflow: 'hidden' }}>
            <label style={{
              display: 'block',
              float: 'left',
              fontSize: '12px',
              margin: '0 10px 0 0',
              padding: '8px 0',
              textAlign: 'right',
              width: '70px',
              color: '#7E7E7E',
              fontWeight: 'normal'
            }}>
              Ciudad:
            </label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({...formData, city: e.target.value})}
              placeholder="Tu ciudad"
              style={{
                width: '240px',
                padding: '5px',
                fontSize: '15px',
                border: '1px solid #CCC',
                borderRadius: '2px',
                background: '#FFF'
              }}
            />
          </li>

          <li style={{ marginBottom: '10px', overflow: 'hidden' }}>
            <label style={{
              display: 'block',
              float: 'left',
              fontSize: '12px',
              margin: '0 10px 0 0',
              padding: '8px 0',
              textAlign: 'right',
              width: '70px',
              color: '#7E7E7E',
              fontWeight: 'normal'
            }}>
              Contraseña:
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              required
              style={{
                width: '240px',
                padding: '5px',
                fontSize: '15px',
                border: '1px solid #CCC',
                borderRadius: '2px',
                background: '#FFF'
              }}
            />
          </li>

          <li style={{ marginBottom: '10px', overflow: 'hidden' }}>
            <label style={{
              display: 'block',
              float: 'left',
              fontSize: '12px',
              margin: '0 10px 0 0',
              padding: '8px 0',
              textAlign: 'right',
              width: '70px',
              color: '#7E7E7E',
              fontWeight: 'normal'
            }}>
              Repetir:
            </label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
              required
              style={{
                width: '240px',
                padding: '5px',
                fontSize: '15px',
                border: '1px solid #CCC',
                borderRadius: '2px',
                background: '#FFF'
              }}
            />
          </li>

          <li style={{ marginBottom: '15px', clear: 'both' }}>
            <label style={{
              width: '230px',
              padding: 0,
              margin: 0,
              textAlign: 'left',
              lineHeight: '17px',
              fontSize: '11px',
              height: '26px',
              color: '#7E7E7E',
              fontWeight: 'normal'
            }}>
              <input
                type="checkbox"
                checked={formData.acceptTerms}
                onChange={(e) => setFormData({...formData, acceptTerms: e.target.checked})}
                style={{
                  background: 'none',
                  width: 'auto',
                  border: 'none',
                  fontSize: 'small',
                  marginRight: '3px',
                  verticalAlign: 'middle',
                  padding: 0
                }}
              />
              Acepto los términos y condiciones
            </label>
          </li>

          <li style={{ textAlign: 'center', clear: 'both' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
                border: '1px solid #1e3a8a',
                padding: '8px 20px',
                fontSize: '12px',
                color: '#FFF',
                cursor: loading ? 'not-allowed' : 'pointer',
                borderRadius: '3px',
                marginRight: '10px'
              }}
            >
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
            <button
              type="button"
              onClick={() => setStep('disclaimer')}
              style={{
                background: 'transparent',
                border: '1px solid #D9D9D9',
                padding: '7px 15px',
                fontSize: '12px',
                color: '#666',
                cursor: 'pointer',
                borderRadius: '3px'
              }}
            >
              Volver
            </button>
          </li>
        </ul>
      </form>
    </div>
  );

  return (
    <div style={{
      background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
      minHeight: '100vh',
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '11px',
      color: '#333',
      margin: 0,
      padding: 0
    }}>
      {/* Logo de Tuenties */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '50%',
        marginLeft: '-136px',
        width: '273px',
        height: '69px',
        background: 'url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==) no-repeat',
        textIndent: '-10000px',
        textAlign: 'left'
      }}>
        Tuenties
      </div>

      {/* Canvas principal */}
      <div style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: '392px',
        marginLeft: '-196px',
        marginTop: step === 'register' ? '-250px' : '-145px'
      }}>
        <div style={{
          background: '#1e3a8a',
          border: '6px solid #1e3a8a',
          borderRadius: '4px',
          margin: '15px 0 0'
        }}>
          {step === 'welcome' && renderWelcomeStep()}
          {step === 'disclaimer' && renderDisclaimerStep()}
          {step === 'register' && renderRegisterStep()}
        </div>

        {/* Información legal */}
        <div style={{
          background: '#FFF',
          padding: '15px',
          borderRadius: '3px',
          marginTop: '15px'
        }}>
          <p style={{
            fontSize: '11px',
            color: '#666',
            textAlign: 'center',
            margin: 0
          }}>
            Al registrarte, aceptas nuestros términos de uso y política de privacidad.
            Tuenties es una red social segura y privada.
          </p>
        </div>
      </div>
    </div>
  );
};

export default InvitationPage;
