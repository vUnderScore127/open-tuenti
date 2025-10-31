import React, { useState, useEffect, ChangeEvent } from 'react';
import { IonContent, IonPage, IonToast } from '@ionic/react';
import { useHistory, useLocation } from 'react-router-dom';
import { useChatContext } from '../contexts/ChatContext';
import { useAuth } from '../lib/auth';
import Header from '../components/Header';
import { ImageCropper } from '../components/ImageCropper';
import { supabase, createInvitation, updateInvitationStatus, getProfilesByIds, updateUserProfile } from '../lib/supabase';
import type { Invitation } from '../lib/supabase';

// Función auxiliar para calcular la edad - MOVER AQUÍ
const calculateAge = (day: number, month: number, year: number): number => {
  const today = new Date();
  const birthDate = new Date(year, month - 1, day);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

// Interfaces
interface ExtendedUserProfile {
  id: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  email?: string;
  gender?: 'boy' | 'girl' | 'prefer_not_to_say' | 'other';
  birth_day?: number;
  birth_month?: number;
  birth_year?: number;
  age?: number;
  country?: string;
  city?: string;
  province?: string;
  marital_status?: string;
  website?: string;
  phone?: string;
  origin_country?: string;
  looking_for?: 'looking_for_guy' | 'looking_for_girl' | 'looking_for_both' | 'do_not_show' | '';
}

const Settings: React.FC = () => {
  const { soundEnabled, setSoundEnabled } = useChatContext();
  const { user, signOut } = useAuth();
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeSection, setActiveSection] = useState('info');
  const [userProfile, setUserProfile] = useState<ExtendedUserProfile | null>(null);
  const [uploading, setUploading] = useState(false);
  // Invitaciones
  const MAX_INVITES = 10;
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [invites, setInvites] = useState<Invitation[]>([]);
  const [inviteProfiles, setInviteProfiles] = useState<Record<string, any>>({});
  const remainingInvites = Math.max(0, MAX_INVITES - invites.filter(i => i.status === 'pending').length);
  
  // Add these missing state variables:
  const [showCropper, setShowCropper] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string>('');
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    gender: '',
    birth_day: '',
    birth_month: '',
    birth_year: '',
    country: '',
    city: '',
    province: '',
    marital_status: '',
    website: '',
    phone: '',
    origin_country: '',
    looking_for: ''
  });
  const history = useHistory();
  const location = useLocation();


  // Cargar perfil del usuario
  useEffect(() => {
    const loadUserProfile = async () => {
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (data) {
          setUserProfile(data);
          setFormData({
            first_name: data.first_name || '',
            last_name: data.last_name || '',
            email: data.email || '',
            gender: data.gender || '',
            birth_day: data.birth_day?.toString() || '',
            birth_month: data.birth_month?.toString() || '',
            birth_year: data.birth_year?.toString() || '',
            country: data.country || '',
            city: data.city || '',
            province: data.province || '',
            marital_status: data.marital_status || '',
            website: data.website || '',
            phone: data.phone || '',
            origin_country: data.origin_country || '',
            looking_for: data.looking_for || ''
          });
        }
      }
    };
    
    loadUserProfile();
  }, [user]);

  // Leer sección desde query param
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const section = params.get('section');
    const validSections = new Set(['info','invitaciones']);
    if (section && validSections.has(section)) {
      setActiveSection(section);
    }
  }, [location.search]);

  // Cargar invitaciones del usuario
  useEffect(() => {
    const loadInvites = async () => {
      if (!user) return;
      setInvitesLoading(true);
      try {
        const { data, error } = await supabase
          .from('invitations')
          .select('*')
          .eq('invited_by', user.id)
          .order('created_at', { ascending: false })
          .limit(100);
        const rows: Invitation[] = (error || !data) ? [] : (data as Invitation[]);
        setInvites(rows);
        const ids = rows.map(r => r.invited_user_id).filter(Boolean) as string[];
        if (ids.length > 0) {
          const profiles = await getProfilesByIds(ids);
          setInviteProfiles(profiles);
        } else {
          setInviteProfiles({});
        }
      } finally {
        setInvitesLoading(false);
      }
    };
    loadInvites();
  }, [user]);

  const handleCreateInvite = async () => {
    if (!user) return;
    const email = inviteEmail.trim();
    if (!email) {
      setToastMessage('Introduce un correo para crear la invitación');
      setShowToast(true);
      return;
    }
    if (remainingInvites <= 0) {
      setToastMessage('Has alcanzado el límite de invitaciones');
      setShowToast(true);
      return;
    }
    setIsLoading(true);
    try {
      const inv = await createInvitation(email, user.id);
      if (inv) {
        setInvites(prev => [inv, ...prev]);
        setInviteEmail('');
      }
    } catch (e) {
      setToastMessage('Error al crear la invitación');
      setShowToast(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelInvite = async (id: string) => {
    setIsLoading(true);
    try {
      const ok = await updateInvitationStatus(id, 'revoked');
      if (ok) {
        setInvites(prev => prev.map(i => i.id === id ? { ...i, status: 'revoked' } : i));
      } else {
        setToastMessage('No se pudo cancelar la invitación');
        setShowToast(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSoundToggle = () => {
    setSoundEnabled(!soundEnabled);
    setToastMessage(soundEnabled ? 'Sonido desactivado' : 'Sonido activado');
    setShowToast(true);
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await signOut();
      history.push('/login');
    } catch (error: any) {
      setToastMessage('Error al cerrar sesión');
      setShowToast(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Manejar cambios en los campos del formulario
  const handleInputChange = (field: string, value: string) => {
  setFormData(prev => {
    const newFormData = {
      ...prev,
      [field]: value
    };
    
    // Calcular edad automáticamente cuando se cambien los campos de fecha
    if (field === 'birth_day' || field === 'birth_month' || field === 'birth_year') {
      const day = field === 'birth_day' ? parseInt(value) : parseInt(newFormData.birth_day);
      const month = field === 'birth_month' ? parseInt(value) : parseInt(newFormData.birth_month);
      const year = field === 'birth_year' ? parseInt(value) : parseInt(newFormData.birth_year);
      
      // Solo calcular si todos los campos están completos
      if (day && month && year && !isNaN(day) && !isNaN(month) && !isNaN(year)) {
        const calculatedAge = calculateAge(day, month, year);
      }
    }
    
    return newFormData;
  });
};

  // Guardar cambios del perfil
const handleSaveProfile = async () => {
  if (!user) return;
  
  setIsLoading(true);
  try {
    // Convertir strings a números para los campos de fecha
    const updateData: any = {
      ...formData,
      birth_day: formData.birth_day ? parseInt(formData.birth_day) : null,
      birth_month: formData.birth_month ? parseInt(formData.birth_month) : null,
      birth_year: formData.birth_year ? parseInt(formData.birth_year) : null,
    };
    
    // Calcular y añadir la edad si todos los campos de fecha están presentes
    if (updateData.birth_day && updateData.birth_month && updateData.birth_year) {
      updateData.age = calculateAge(updateData.birth_day, updateData.birth_month, updateData.birth_year);
   
    }
    
    // Usar función centralizada que normaliza género y calcula edad
    let error: any = null
    try {
      await updateUserProfile(user.id, updateData)
    } catch (e) {
      error = e
    }
          
    if (error) {
      console.error('Error detallado de Supabase:', error);
      throw error;
    }
    
    setToastMessage('Perfil actualizado correctamente');
    setShowToast(true);
  } catch (error) {
    console.error('Error al actualizar el perfil:', error);
    setToastMessage(`Error al actualizar el perfil: ${(error as Error).message || 'Error desconocido'}`);
    setShowToast(true);
  } finally {
    setIsLoading(false);
  }
};

  const menuItems = [
    { id: 'info', label: 'Mi información personal', icon: '' },
    { id: 'intereses', label: 'Mis intereses', icon: '' },
    { id: 'redes', label: 'Redes', icon: '' },
    { id: 'peticiones', label: 'Peticiones', icon: '' },
    { id: 'privacidad', label: 'Privacidad', icon: '' },
    { id: 'otros', label: 'Otros servicios', icon: '' },
    { id: 'notificaciones', label: 'Notificaciones', icon: '' },
    { id: 'tuenti-movil', label: 'Tuenti Móvil', icon: '' },
    { id: 'preferencias', label: 'Preferencias de mi cuenta', icon: '' },
    { id: 'invitaciones', label: 'Invitaciones', icon: '' }
  ];
  
const renderContent = () => {
  switch (activeSection) {
    // Reemplazar todo el caso 'info' en renderContent (líneas 175-350 aproximadamente)
    case 'info':
      return (
        <div className="info-content">
          <div className="content-layout">
            <div className="form-sections">
              <h2><strong>Información personal</strong></h2>
              <div className="section-divider"></div>
              
              {/* Nueva sección: Información básica */}
              <div className="form-section">
                <h3>Información básica</h3>
                <div className="form-row">
                  <label>Nombre:</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.first_name}
                    onChange={(e) => handleInputChange('first_name', e.target.value)}
                    placeholder="Tu nombre"
                  />
                </div>
                <div className="form-row">
                  <label>Apellido:</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.last_name}
                    onChange={(e) => handleInputChange('last_name', e.target.value)}
                    placeholder="Tu apellido"
                  />
                </div>
                
                
                <div className="form-row">
                  <label>Género:</label>
                  <select 
                    className="form-select"
                    value={formData.gender}
                    onChange={(e) => handleInputChange('gender', e.target.value)}
                  >
                    <option value="">Seleccionar género</option>
                    <option value="boy">Chico</option>
                    <option value="girl">Chica</option>
                    <option value="prefer_not_to_say">Prefiero no decirlo</option>
                    <option value="other">Otro</option>
                  </select>
                </div>
              </div>
              
            
              
              {/* Nueva sección: Fecha de nacimiento */}
              <div className="form-section">
                <h3>Fecha de nacimiento</h3>
                <div className="form-row-horizontal">
                  <label>Fecha:</label>
                  <div className="date-selectors">
                    <select 
                      className="form-select date-select"
                      value={formData.birth_day}
                      onChange={(e) => handleInputChange('birth_day', e.target.value)}
                    >
                      <option value="">Día</option>
                      {Array.from({length: 31}, (_, i) => i + 1).map(day => (
                        <option key={day} value={day}>{day}</option>
                      ))}
                    </select>
                    <select 
                      className="form-select date-select"
                      value={formData.birth_month}
                      onChange={(e) => handleInputChange('birth_month', e.target.value)}
                    >
                      <option value="">Mes</option>
                      <option value="1">Enero</option>
                      <option value="2">Febrero</option>
                      <option value="3">Marzo</option>
                      <option value="4">Abril</option>
                      <option value="5">Mayo</option>
                      <option value="6">Junio</option>
                      <option value="7">Julio</option>
                      <option value="8">Agosto</option>
                      <option value="9">Septiembre</option>
                      <option value="10">Octubre</option>
                      <option value="11">Noviembre</option>
                      <option value="12">Diciembre</option>
                    </select>
                    <select 
                      className="form-select date-select"
                      value={formData.birth_year}
                      onChange={(e) => handleInputChange('birth_year', e.target.value)}
                    >
                      <option value="">Año</option>
                      {Array.from({length: 100}, (_, i) => new Date().getFullYear() - i).map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="section-divider"></div>
            
              <div className="form-section">
                <h3>Dónde vivo</h3>
                <div className="form-row">
                  <label>País:</label>
                  <input 
                    type="text" 
                    className="form-input"
                    value={formData.country}
                    onChange={(e) => handleInputChange('country', e.target.value)}
                    placeholder="Introduce tu país"
                  />
                </div>
                <div className="form-row">
                  <label>Provincia:</label>
                  <input 
                    type="text" 
                    className="form-input"
                    value={formData.province}
                    onChange={(e) => handleInputChange('province', e.target.value)}
                    placeholder="Introduce tu provincia"
                  />
                </div>
                <div className="form-row">
                  <label>Ciudad:</label>
                  <input 
                    type="text" 
                    className="form-input"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    placeholder="Introduce tu ciudad"
                  />
                </div>
              </div>
              
              <div className="section-divider"></div>
              
              
              <div className="form-section">
                <h3>De donde soy</h3>
                <div className="form-row">
                  <label>País:</label>
                  <input 
                    type="text" 
                    className="form-input"
                    value={formData.origin_country}
                    onChange={(e) => handleInputChange('origin_country', e.target.value)}
                    placeholder="Introduce tu país de origen"
                  />
                </div>
              </div>
              
              
              <div className="form-section">
                <h3>Estado</h3>
                <div className="form-row">
                  <label>Estado civil:</label>
                  <select 
                    className="form-select"
                    value={formData.marital_status}
                    onChange={(e) => handleInputChange('marital_status', e.target.value)}
                  >
                    <option value="">Seleccionar estado</option>
                    <option value="single">Soltero/a</option>
                    <option value="relationship">En una relación</option>
                    <option value="married">Casado/a</option>
                    <option value="divorced">Divorciado/a</option>
                    <option value="widowed">Viudo/a</option>
                    <option value="do_not_show">No mostrar</option>
                  </select>
                </div>
                <div className="form-row">
                  <label>Busco:</label>
                  <select 
                    className="form-select"
                    value={formData.looking_for}
                    onChange={(e) => handleInputChange('looking_for', e.target.value)}
                  >
                    <option value="">Seleccionar opción</option>
                    <option value="looking_for_guy">Chico para rollo</option>
                    <option value="looking_for_girl">Chica para rollo</option>
                    <option value="looking_for_both">Ambos</option>
                    <option value="do_not_show">No mostrar</option>
                  </select>
                </div>
              </div>

              <div className="section-divider"></div>

              <div className="form-section">
                <h3>Información de la web</h3>
                <div className="form-row">
                  <label>Página web:</label>
                  <input 
                    type="url" 
                    className="form-input"
                    value={formData.website}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    placeholder="https://"
                  />
                </div>
              </div>

              <div className="section-divider"></div>

              <div className="form-section">
                <h3>Números de teléfono</h3>
                <div className="form-row">
                  <label>Teléfono:</label>
                  <input 
                    type="tel" 
                    className="form-input"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="Número de teléfono"
                  />
                </div>
                <p className="section-note">Esta información solo la verán tus amigos</p>
              </div>

              <div className="form-section">
                <button 
                  onClick={handleSaveProfile}
                  disabled={isLoading}
                  className="btn-save"
                >
                  {isLoading ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </div>
            
            <div className="profile-photo-section">
              <h3 className="photo-title"><strong>Foto de perfil</strong></h3>
              <div className="section-divider"></div>
              <div className="photo-placeholder">
                {userProfile?.avatar_url ? (
                  <img 
                    src={userProfile.avatar_url} 
                    alt="Foto de perfil" 
                    style={{ width: '140px', height: '150px', objectFit: 'cover' }}
                  />
                ) : (
                  <span>Foto de perfil</span>
                )}
              </div>
              <label className="change-photo-btn">
                <img src={`${import.meta.env.BASE_URL}arrow-bold-up.svg`} alt="Subir" style={{width: '12px', height: '12px'}} />
                {uploading ? 'Subiendo...' : 'Cambiar foto'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarSelect}
                  disabled={uploading}
                  style={{ display: 'none' }}
                  id="avatar-upload"
                />
              </label>
            </div>
          </div>
        </div>
      );
      case 'preferencias':
        return (
          <div className="settings-content">
            <h2>Preferencias de mi cuenta</h2>
            
            <div className="form-section">
              <h3>Información de la cuenta</h3>
              <div className="form-row">
                <label>Email:</label>
                <input 
                  type="email" 
                  className="form-input"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="tu@email.com"
                />
              </div>
            </div>
            
            <div className="section-divider"></div>
            
            <div className="setting-item">
              <label>Sonido de notificaciones</label>
              <div className="setting-control">
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={soundEnabled}
                    onChange={handleSoundToggle}
                  />
                  <span className="slider"></span>
                </label>
                <span className="setting-description">
                  {soundEnabled ? 'Activado' : 'Desactivado'}
                </span>
              </div>
            </div>

            {/* Modo oscuro movido a la sección "Diseño" */}

            <div className="setting-actions">
              <button
                onClick={handleSaveProfile}
                disabled={isLoading}
                className="btn-save"
                style={{marginRight: '10px'}}
              >
                {isLoading ? 'Guardando...' : 'Guardar cambios'}
              </button>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoading}
                className="btn-logout"
              >
                {isLoading ? 'Cerrando...' : 'Cerrar sesión'}
              </button>
            </div>
            </div>
          );
      case 'invitaciones':
        return (
          <div className="settings-content">
            <h2>Invitaciones</h2>
            <p className="invite-summary">Te quedan <strong>{remainingInvites}</strong> invitaciones disponibles (máximo {MAX_INVITES}).</p>
            <div className="invite-create">
              <input
                type="email"
                className="form-input"
                placeholder="Correo del invitado"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                disabled={remainingInvites <= 0}
              />
              <button className="btn-primary" disabled={remainingInvites <= 0 || !inviteEmail} onClick={handleCreateInvite}>
                Crear enlace
              </button>
            </div>
            {remainingInvites <= 0 && (
              <p className="invite-warning">Has alcanzado el límite. No puedes crear más invitaciones.</p>
            )}

            <div className="section-divider"></div>

            {invitesLoading ? (
              <p>Cargando invitaciones...</p>
            ) : invites.length === 0 ? (
              <p>No has creado ninguna invitación todavía.</p>
            ) : (
              <div className="invite-list">
                {invites.map((inv) => {
                  const redeemedBy = inv.invited_user_id ? inviteProfiles[inv.invited_user_id] : null;
                  const link = `${window.location.origin}/invite?token=${inv.token}`;
                  return (
                    <div key={inv.id} className="invite-item">
                      <div className="invite-row">
                        <div className="invite-col">
                          <div className="invite-label">Correo</div>
                          <div className="invite-value">{inv.email || '—'}</div>
                        </div>
                        <div className="invite-col">
                          <div className="invite-label">Enlace</div>
                          <div className="invite-value invite-link">
                            <a href={link} target="_blank" rel="noreferrer">{link}</a>
                            <button className="btn-secondary" onClick={() => navigator.clipboard.writeText(link)}>Copiar</button>
                          </div>
                        </div>
                        <div className="invite-col">
                          <div className="invite-label">Estado</div>
                          <div className={`invite-value status-${inv.status}`}>{inv.status}</div>
                        </div>
                        <div className="invite-col">
                          <div className="invite-label">Canjeado por</div>
                          <div className="invite-value">{redeemedBy ? `${redeemedBy.username || redeemedBy.display_name || redeemedBy.full_name || redeemedBy.id}` : '—'}</div>
                        </div>
                        <div className="invite-actions">
                          {inv.status === 'pending' ? (
                            <button className="btn-danger" onClick={() => handleCancelInvite(inv.id)}>Cancelar</button>
                          ) : (
                            <span className="invite-note">No disponible</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      
      default:
        return (
          <div className="settings-content">
            <h2>{menuItems.find(item => item.id === activeSection)?.label}</h2>
            <p>Esta sección está en desarrollo.</p>
          </div>
        );
    }
  };
  // Función para manejar selección de avatar
  const handleAvatarSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('Debes seleccionar una imagen para subir.');
      }
      
      const file = event.target.files[0];
      
      if (!file.type.startsWith('image/')) {
        throw new Error('El archivo debe ser una imagen.');
      }
      
      const imageUrl = URL.createObjectURL(file);
      setSelectedImageSrc(imageUrl);
      setShowCropper(true);
      
    } catch (error: any) {
      console.error('Error al seleccionar avatar:', error);
      setToastMessage(error.message || 'Error al seleccionar la imagen');
      setShowToast(true);
    }
  };

  // Función para manejar el recorte completado
  const handleCropComplete = async (croppedImageBlob: Blob) => {
    try {
      setUploading(true);
      setShowCropper(false);
      
      // Crear nombre único con fecha y hora
      const now = new Date();
      const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const fileName = `avatar_${timestamp}.jpg`;
      
      const croppedFile = new File([croppedImageBlob], fileName, {
        type: 'image/jpeg',
        lastModified: Date.now()
      });
      
      const filePath = `${user?.id}/avatar/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('tuenties-archive')
        .upload(filePath, croppedFile, {
          upsert: true
        });
      
      if (uploadError) {
        throw uploadError;
      }
      

      
      // ✅ CAMBIO: Usar createSignedUrl en lugar de getPublicUrl
      const { data: signedUrlData, error: urlError } = await supabase.storage
        .from('tuenties-archive')
        .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 año de duración
      
      if (urlError || !signedUrlData?.signedUrl) {
        throw urlError || new Error('No se pudo generar URL firmada');
      }
      

      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: signedUrlData.signedUrl })
        .eq('id', user?.id);
      
      if (updateError) {
        throw updateError;
      }
      
      setUserProfile(prev => prev ? { ...prev, avatar_url: signedUrlData.signedUrl } : null);
      setToastMessage('Foto de perfil actualizada correctamente');
      setShowToast(true);
      
    } catch (error: any) {
      console.error('Error al subir avatar:', error);
      setToastMessage(error.message || 'Error al subir la foto');
      setShowToast(true);
    } finally {
      setUploading(false);
      if (selectedImageSrc) {
        URL.revokeObjectURL(selectedImageSrc);
        setSelectedImageSrc('');
      }
    }
  };

  // Función para cancelar el recorte
  const handleCropCancel = () => {
    setShowCropper(false);
    if (selectedImageSrc) {
      URL.revokeObjectURL(selectedImageSrc);
      setSelectedImageSrc('');
    }
  };

  return (
    <IonPage>
      <Header />
      
      <IonContent className="bg-white">
        <div className="tuenti-container">
          <div className="tuenti-layout">
            {/* Sidebar izquierdo */}
            <div className="tuenti-sidebar">
              <ul className="tuenti-menu">
                {menuItems.map((item) => (
                  <li 
                    key={item.id}
                    className={`tuenti-menu-item ${activeSection === item.id ? 'active' : ''}`}
                    onClick={() => setActiveSection(item.id)}
                  >
                    <span className="menu-label">{item.label}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="tuenti-main">
              {renderContent()}
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
<ImageCropper
        isOpen={showCropper}
        imageSrc={selectedImageSrc}
        onCropComplete={handleCropComplete}
        onCancel={handleCropCancel}
      />
      <style>{`
        .tuenti-container {
          background: #f0f0f0;
          min-height: calc(100vh - 56px);
          padding: 0;
        }
        
        .tuenti-layout {
          display: flex;
          max-width: 1000px;
          margin: 0 auto;
          background: white;
          min-height: calc(100vh - 56px);
        }
        
        .tuenti-sidebar {
          width: 250px;
          background: #e8e8e8;
          border-right: 1px solid #d0d0d0;
        }
        
        .tuenti-menu {
          list-style: none;
          margin: 0;
          padding: 0;
        }
        
        .tuenti-menu-item {
          padding: 12px 20px;
          cursor: pointer;
          border-bottom: 1px solid #d0d0d0;
          font-size: 13px;
          color: #0066cc;
          background: #e8e8e8;
        }
        
        .tuenti-menu-item:hover {
          background: #ddd;
        }
        
        .tuenti-menu-item.active {
          background: white;
          font-weight: bold;
          color: #000;
        }
        
        .tuenti-main {
          flex: 1;
          background: white;
          padding: 20px 30px;
        }
        
        .info-content {
          max-width: 600px;
        }
        
        .content-layout {
          display: flex;
          gap: 30px;
          align-items: flex-start;
        }

        .form-sections {
          flex: 1;
        }
        
        .photo-content {
          width: 150px;
          flex-shrink: 0;
        }
        
        .info-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 30px;
        }

                .form-row-horizontal {
          display: flex;
          align-items: center;
          margin-bottom: 15px;
        }
        
        .form-row-horizontal label {
          width: 80px;
          font-size: 13px;
          color: #333;
          text-align: right;
          margin-right: 15px;
        }
        
        .date-selectors {
          display: flex;
          gap: 10px;
        }
        
        .date-selectors .date-select {
          padding: 4px 8px;
          border: 1px solid #ccc;
          font-size: 13px;
          background: white;
          width: 70px !important;
          min-width: unset !important;
          max-width: unset !important;
        }
        
        .personal-info-section {
          flex: 1;
        }
        
        .info-header h2 {
          margin: 0 0 15px 0;
          font-size: 24px;
          color: #333;
          font-weight: bold;
        }

        .photo-header h3 {
          font-size: 16px;
          color: #666;
          margin: 0 0 15px 0;
          font-weight: bold;
        }

        .section-divider {
          height: 1px;
          background: #d0d0d0;
          margin: 0 0 20px 0;
          width: 100%;
        }

        .change-photo-btn {
          background-image: 
            url("/noise.KmQE111qYh.png"),
            linear-gradient(to bottom, #F9F9F9 0%, #DCDCDD 100%);
          border: 1px solid rgba(0, 0, 0, 0.12);
          box-shadow: 
            inset 0 1px 0 rgba(255, 255, 255, 0.3),
            inset 0 -1px 0 rgba(0, 0, 0, 0.2);
          color: #000;
          padding: 6px 12px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: normal;
          cursor: pointer;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          width: auto;
        }
        
        .change-photo-btn:hover {
          background-image: 
            url("/noise.KmQE111qYh.png"),
            linear-gradient(to bottom,rgb(255, 255, 255) 0%, #C8C8C9 100%);
        }
        
        .form-section h3 {
          font-size: 16px;
          color: #666;
          margin: 0 0 15px 0;
          font-weight: normal;
        }
        
        .form-row {
          display: flex;
          align-items: center;
          margin-bottom: 15px;
        }
        
        .form-row label {
          width: 80px;
          font-size: 13px;
          color: #333;
          text-align: right;
          margin-right: 15px;
        }
        
        .form-select, .form-input {
          padding: 4px 8px;
          border: 1px solid #ccc;
          font-size: 13px;
          background: white;
          min-width: 200px;
        }
        
        .form-select {
          background: white;
        }
        
        .section-note {
          font-size: 12px;
          color: #666;
          margin: 10px 0;
          font-style: italic;
        }
        
        .btn-save {
          background: linear-gradient(to bottom, #90ceea 0%, #73c5ef 100%);
          border: none;
          border-radius: 4px;
          color: white;
          padding: 8px 16px;
          font-size: 12px;
          font-weight: bold;
          cursor: pointer;
          text-shadow: 0 -1px #8bc0d9;
          transition: opacity 0.2s;
        }
        
        .btn-save:hover {
          opacity: 0.9;
        }
        
        .btn-save:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .settings-content h2 {
          margin: 0 0 20px 0;
          font-size: 18px;
          color: #333;
          border-bottom: 1px solid #ddd;
          padding-bottom: 10px;
        }
        
        .setting-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px 0;
          border-bottom: 1px solid #f0f0f0;
        }
        
        .setting-item label {
          font-size: 14px;
          color: #333;
          font-weight: 500;
        }
        
        .setting-control {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .setting-description {
          font-size: 12px;
          color: #666;
        }
        
        .toggle-switch {
          position: relative;
          display: inline-block;
          width: 50px;
          height: 24px;
        }
        
        .toggle-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        
        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #ccc;
          transition: .4s;
          border-radius: 24px;
        }
        
        .slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: .4s;
          border-radius: 50%;
        }
        
        input:checked + .slider {
          background-color: #73c5ef;
        }
        
        input:checked + .slider:before {
          transform: translateX(26px);
        }
        
        .setting-actions {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
        }
        
        .btn-logout {
          padding: 8px 16px;
          border: none;
          border-radius: 3px;
          font-size: 12px;
          font-weight: bold;
          cursor: pointer;
          background: linear-gradient(to bottom, #90ceea 0%, #73c5ef 100%);
          color: white;
          text-shadow: 0 -1px #8bc0d9;
        }
        
        .btn-logout:hover {
          opacity: 0.9;
        }
        
        .btn-logout:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Dark mode (global overrides for Settings layout) */
        .dark .tuenti-container { background: #0f172a; }
        .dark .tuenti-layout { background: #111827; }
        .dark .tuenti-sidebar { background: #1f2937; border-right-color: #374151; }
        .dark .tuenti-menu-item { background: #1f2937; border-bottom-color: #374151; color: #93c5fd; }
        .dark .tuenti-menu-item:hover { background: #111827; }
        .dark .tuenti-menu-item.active { background: #111827; color: #ffffff; }
        .dark .tuenti-main { background: #111827; color: #e5e7eb; }
        .dark .form-row label { color: #e5e7eb; }
        .dark .form-input, .dark .form-select { background: #111827; color: #e5e7eb; border-color: #374151; }
        .dark .section-divider { background: #374151; }
        .dark .settings-content h2 { color: #e5e7eb; border-bottom-color: #374151; }
        .dark .setting-item { border-bottom-color: #374151; }
        .dark .setting-item label { color: #e5e7eb; }
        .dark .setting-description { color: #9ca3af; }

        /* Invitaciones */
        .invite-summary { color: #666; }
        .invite-create { display: flex; gap: 8px; align-items: center; }
        .invite-warning { color: #B45309; background: #FEF3C7; border: 1px solid #F59E0B; padding: 8px; border-radius: 4px; }
        .invite-list { display: flex; flex-direction: column; gap: 8px; }
        .invite-item { background: white; border: 1px solid #D1D5DB; border-radius: 6px; }
        .invite-row { display: grid; grid-template-columns: 1.2fr 2fr 1fr 1.2fr auto; gap: 12px; padding: 12px; align-items: center; }
        .invite-col { display: flex; flex-direction: column; gap: 4px; }
        .invite-label { font-size: 12px; color: #6B7280; }
        .invite-value { font-size: 14px; color: #111827; }
        .invite-link { display: flex; align-items: center; gap: 8px; }
        .invite-actions { display: flex; gap: 8px; justify-content: flex-end; }
        .invite-note { font-size: 12px; color: #6B7280; }

        /* Dark mode - invitaciones */
        .dark .invite-summary { color: #9CA3AF; }
        .dark .invite-warning { color: #F59E0B; background: #1F2937; border-color: #F59E0B; }
        .dark .invite-item { background: #0b1220; border-color: #374151; }
        .dark .invite-label { color: #9CA3AF; }
        .dark .invite-value { color: #E5E7EB; }
        .dark .invite-link a { color: #93C5FD; }
      `}</style>
    </IonPage>
  );
};


export default Settings;



