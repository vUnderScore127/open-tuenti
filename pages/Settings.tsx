import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InvitationsManager } from "@/components/InvitationsManager";
import { Header } from "@/components/Header";
import { 
  Home, 
  Heart, 
  Shield, 
  Bell, 
  User,
  ArrowLeft,
  Camera
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { MiniChatButton } from '@/components/MiniChatButton';
import { updateUserProfile, getUserProfile } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

type SettingsSection = 'personal' | 'interests' | 'requests' | 'privacy' | 'notifications' | 'account';

interface City {
  id: string;
  name: string;
  province_name: string;
  autonomous_community_name: string;
}

interface PersonalInfoState {
  firstName: string
  lastName: string
  email: string
  gender: 'chico' | 'chica' | 'prefiero_no_decirlo' | 'otro' | ''
  birthDay: number | ''
  birthMonth: number | ''
  birthYear: number | ''
  maritalStatus: 'single' | 'married' | 'divorced' | 'widowed' | 'relationship' | ''
  lookingFor: 'chico para rollo' | 'chica para rollo' | 'chic@ para rollo' | 'no_indicar' | ''
  website: string
  phone: string
  country: string
  autonomousCommunity: string
  province: string
  city: string
  originCountry: string
  originAutonomousCommunity: string
  originProvince: string
  originCity: string
}

interface PrivacySettingsState {
  viewProfile: 'friends' | 'friends-of-friends' | 'everyone';
  viewWall: 'friends' | 'friends-of-friends' | 'everyone';
  downloadPhotos: 'nobody' | 'friends' | 'friends-of-friends' | 'everyone';
  sendMessages: 'nobody' | 'friends' | 'friends-of-friends' | 'everyone';
  viewPhone: 'nobody' | 'friends' | 'friends-of-friends' | 'everyone';
}

export default function Settings() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('personal');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Estados para información personal
  const [profileImage, setProfileImage] = useState<string>("/src/lib/img/default_tuenties.webp");
  // Cambiar la declaración del estado personalInfo
const [personalInfo, setPersonalInfo] = useState<PersonalInfoState>({
  firstName: '',
  lastName: '',
  email: '',
  gender: '',
  birthDay: '',
  birthMonth: '',
  birthYear: '',
  maritalStatus: '',
  lookingFor: '',
  website: '',
  phone: '',
  country: '',
  autonomousCommunity: '',
  province: '',
  city: '',
  originCountry: '',
  originAutonomousCommunity: '',
  originProvince: '',
  originCity: ''
});
  
  // Estados para intereses
  const [interests, setInterests] = useState({
    hobbies: '',
    music: '',
    quotes: '',
    books: ''
  });
  
  // Estados para privacidad
  // Cambiar la declaración del estado privacySettings
  const [privacySettings, setPrivacySettings] = useState<PrivacySettingsState>({
    viewProfile: 'friends',
    viewWall: 'friends',
    downloadPhotos: 'nobody',
    sendMessages: 'friends',
    viewPhone: 'nobody'
  });
  
  // Estados para notificaciones
  const [notificationSettings, setNotificationSettings] = useState({
    newMessages: true,
    newFollowers: true,
    postComments: true,
    weeklyDigest: false,
    friendRequests: true,
    photoTags: true,
    eventInvites: true
  });

  // Leer el parámetro 'section' de la URL al cargar el componente
  useEffect(() => {
    const sectionParam = searchParams.get('section') as SettingsSection;
    if (sectionParam && ['personal', 'interests', 'requests', 'privacy', 'notifications', 'account'].includes(sectionParam)) {
      setActiveSection(sectionParam);
    }
  }, [searchParams]);

  const sections = [
    { id: 'personal' as SettingsSection, name: 'Mi información personal', icon: Home },
    { id: 'interests' as SettingsSection, name: 'Mis intereses', icon: Heart },
    { id: 'requests' as SettingsSection, name: 'Peticiones', icon: User },
    { id: 'privacy' as SettingsSection, name: 'Privacidad', icon: Shield },
    { id: 'notifications' as SettingsSection, name: 'Notificaciones', icon: Bell },
    { id: 'account' as SettingsSection, name: 'Preferencias de mi cuenta', icon: User },
  ];

 
  useEffect(() => {
    const loadUserData = async () => {
      if (user?.id) {
        try {
          setLoading(true);
          const userData = await getUserProfile(user.id);
          
          if (userData) {
            // Cargar información personal
            setPersonalInfo({
  firstName: userData.first_name || '',
  lastName: userData.last_name || '',
  email: userData.email || '',
  gender: userData.gender || '',
  birthDay: userData.birth_day || '',
  birthMonth: userData.birth_month || '',
  birthYear: userData.birth_year || '',
  maritalStatus: userData.marital_status || '',
  lookingFor: (['chico para rollo', 'chica para rollo', 'chic@ para rollo', 'no_indicar'].includes(userData.looking_for)) ? userData.looking_for : 'no_indicar',
  website: userData.website || '',
  phone: userData.phone || '',
  country: userData.country || '',
  autonomousCommunity: userData.autonomous_community || '',
  province: userData.province || '',
  city: userData.city || '',
  originCountry: userData.origin_country || '',
  originAutonomousCommunity: userData.origin_autonomous_community || '',
  originProvince: userData.origin_province || '',
  originCity: userData.origin_city || ''
});
            
            // Cargar intereses
            setInterests({
              hobbies: userData.hobbies || '',
              music: userData.music || '',
              quotes: userData.quotes || '',
              books: userData.books || ''
            });
            
            // Cargar configuraciones de privacidad
            setPrivacySettings({
              viewProfile: userData.privacy_view_profile || 'friends',
              viewWall: userData.privacy_view_wall || 'friends',
              downloadPhotos: userData.privacy_download_photos || 'nobody',
              sendMessages: userData.privacy_send_messages || 'friends',
              viewPhone: userData.privacy_view_phone || 'nobody'
            });
            
            // Cargar configuraciones de notificaciones
            setNotificationSettings({
              newMessages: userData.notifications_new_messages ?? true,
              newFollowers: userData.notifications_new_followers ?? true,
              postComments: userData.notifications_post_comments ?? true,
              weeklyDigest: userData.notifications_weekly_digest ?? false,
              friendRequests: userData.notifications_friend_requests ?? true,
              photoTags: userData.notifications_photo_tags ?? true,
              eventInvites: userData.notifications_event_invites ?? true
            });
            
            // Cargar imagen de perfil
            if (userData.avatar_url) {
              setProfileImage(userData.avatar_url);
            }
          }
        } catch (error) {
          console.error('Error loading user data:', error);
          toast({
            title: "Error al cargar datos",
            description: "No se pudieron cargar los datos del usuario",
            variant: "destructive"
          });
        } finally {
          setLoading(false);
        }
      }
    };
    
    loadUserData();
  }, [user?.id]);

  const handleSave = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "No se pudo identificar al usuario",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      
      // Preparar datos para actualizar
      const updateData = {
        first_name: personalInfo.firstName,
        last_name: personalInfo.lastName,
        email: personalInfo.email,
        gender: personalInfo.gender || undefined,
        birth_day: personalInfo.birthDay || undefined,
        birth_month: personalInfo.birthMonth || undefined,
        birth_year: personalInfo.birthYear || undefined,
        marital_status: personalInfo.maritalStatus,
        looking_for: personalInfo.lookingFor,
        website: personalInfo.website,
        phone: personalInfo.phone,
        hobbies: interests.hobbies,
        music: interests.music,
        quotes: interests.quotes,
        books: interests.books,
        country: personalInfo.country,
        autonomous_community: personalInfo.autonomousCommunity,
        province: personalInfo.province,
        city: personalInfo.city,
        origin_country: personalInfo.originCountry,
        origin_autonomous_community: personalInfo.originAutonomousCommunity,
        origin_province: personalInfo.originProvince,
        origin_city: personalInfo.originCity,
        privacy_view_profile: privacySettings.viewProfile,
        privacy_view_wall: privacySettings.viewWall,
        privacy_download_photos: privacySettings.downloadPhotos,
        privacy_send_messages: privacySettings.sendMessages,
        privacy_view_phone: privacySettings.viewPhone,
        notifications_new_messages: notificationSettings.newMessages,
        notifications_new_followers: notificationSettings.newFollowers,
        notifications_post_comments: notificationSettings.postComments,
        notifications_weekly_digest: notificationSettings.weeklyDigest,
        notifications_friend_requests: notificationSettings.friendRequests,
        notifications_photo_tags: notificationSettings.photoTags,
        notifications_event_invites: notificationSettings.eventInvites,
        avatar_url: profileImage !== "/src/lib/img/default_tuenties.webp" ? profileImage : undefined
      };

      // Agregar logging para debug
      console.log('Datos a actualizar:', updateData);
      console.log('ID de usuario:', user.id);

      // Actualizar en la base de datos
      await updateUserProfile(user.id, updateData);
      
      // Actualizar localStorage con los nuevos datos
      const updatedUser = await getUserProfile(user.id);
      if (updatedUser) {
        localStorage.setItem('tuentis_user', JSON.stringify(updatedUser));
      }
      
      toast({
        title: "Configuración guardada",
        description: "Los cambios se han guardado correctamente en la base de datos"
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      // Agregar más detalles del error
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details
      });
      toast({
        title: "Error al guardar",
        description: "No se pudieron guardar los cambios. Inténtalo de nuevo.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Mostrar loading mientras se cargan los datos
  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Cargando configuración...</div>
          </div>
        </div>
      </div>
    );
  }
  
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfileImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const renderPersonalInfo = () => (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 space-y-6">
          {/* Información básica */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Información básica</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gender">Sexo</Label>
                <Select value={personalInfo.gender} onValueChange={(value) => setPersonalInfo({...personalInfo, gender: value as 'chico' | 'chica' | 'prefiero_no_decirlo' | 'otro' | ''})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona tu sexo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="chico">Chico</SelectItem>
                    <SelectItem value="chica">Chica</SelectItem>
                    <SelectItem value="prefiero_no_decirlo">Prefiero no decirlo</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Fecha de nacimiento */}
            <div className="mt-4">
              <Label className="text-sm font-medium">Fecha de nacimiento</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                <Select value={personalInfo.birthDay.toString()} onValueChange={(value) => setPersonalInfo({...personalInfo, birthDay: parseInt(value) || ''})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Día" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({length: 31}, (_, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()}>{i + 1}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={personalInfo.birthMonth.toString()} onValueChange={(value) => setPersonalInfo({...personalInfo, birthMonth: parseInt(value) || ''})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Mes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Enero</SelectItem>
                    <SelectItem value="2">Febrero</SelectItem>
                    <SelectItem value="3">Marzo</SelectItem>
                    <SelectItem value="4">Abril</SelectItem>
                    <SelectItem value="5">Mayo</SelectItem>
                    <SelectItem value="6">Junio</SelectItem>
                    <SelectItem value="7">Julio</SelectItem>
                    <SelectItem value="8">Agosto</SelectItem>
                    <SelectItem value="9">Septiembre</SelectItem>
                    <SelectItem value="10">Octubre</SelectItem>
                    <SelectItem value="11">Noviembre</SelectItem>
                    <SelectItem value="12">Diciembre</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={personalInfo.birthYear.toString()} onValueChange={(value) => setPersonalInfo({...personalInfo, birthYear: parseInt(value) || ''})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Año" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({length: new Date().getFullYear() - 1949}, (_, i) => {
                      const year = new Date().getFullYear() - i;
                      return <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          {/* Barra divisoria */}
          <hr className="border-gray-200" />
          
          {/* Dónde vivo */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Dónde vivo</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="country">País *</Label>
                <Input
                  id="country"
                  type="text"
                  placeholder="España"
                  value={personalInfo.country}
                  onChange={(e) => setPersonalInfo({...personalInfo, country: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="autonomousCommunity">Comunidad Autónoma</Label>
                <Input
                  id="autonomousCommunity"
                  type="text"
                  placeholder="Andalucía, Madrid, etc."
                  value={personalInfo.autonomousCommunity}
                  onChange={(e) => setPersonalInfo({...personalInfo, autonomousCommunity: e.target.value})}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="province">Provincia</Label>
                <Input
                  id="province"
                  type="text"
                  placeholder="Sevilla, Madrid, etc."
                  value={personalInfo.province}
                  onChange={(e) => setPersonalInfo({...personalInfo, province: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Ciudad</Label>
                <Input
                  id="city"
                  type="text"
                  placeholder="Tu ciudad"
                  value={personalInfo.city}
                  onChange={(e) => setPersonalInfo({...personalInfo, city: e.target.value})}
                />
              </div>
            </div>
          </div>
          
          {/* Barra divisoria */}
          <hr className="border-gray-200" />
          
          {/* De dónde soy */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">De dónde soy</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="originCountry">País</Label>
                <Input
                  id="originCountry"
                  type="text"
                  placeholder="País de origen"
                  value={personalInfo.originCountry}
                  onChange={(e) => setPersonalInfo({...personalInfo, originCountry: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="originAutonomousCommunity">Comunidad Autónoma</Label>
                <Input
                  id="originAutonomousCommunity"
                  type="text"
                  placeholder="Comunidad de origen"
                  value={personalInfo.originAutonomousCommunity}
                  onChange={(e) => setPersonalInfo({...personalInfo, originAutonomousCommunity: e.target.value})}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="originProvince">Provincia</Label>
                <Input
                  id="originProvince"
                  type="text"
                  placeholder="Provincia de origen"
                  value={personalInfo.originProvince}
                  onChange={(e) => setPersonalInfo({...personalInfo, originProvince: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="originCity">Ciudad</Label>
                <Input
                  id="originCity"
                  type="text"
                  placeholder="Ciudad de origen"
                  value={personalInfo.originCity}
                  onChange={(e) => setPersonalInfo({...personalInfo, originCity: e.target.value})}
                />
              </div>
            </div>
          </div>
          
          {/* Barra divisoria */}
          <hr className="border-gray-200" />
          
          {/* Página web */}
          <div>
            <div className="space-y-2">
              <Label htmlFor="website">Página web</Label>
              <Input 
                id="website" 
                type="url" 
                placeholder="¿Cuál es tu página web?" 
                value={personalInfo.website}
                onChange={(e) => setPersonalInfo({...personalInfo, website: e.target.value})}
              />
            </div>
          </div>
          
          {/* Barra divisoria */}
          <hr className="border-gray-200" />
          
          {/* Número de teléfono */}
          <div>
            <div className="space-y-2">
              <Label htmlFor="phone">Número de teléfono</Label>
              <Input 
                id="phone" 
                type="tel" 
                placeholder="Tu número de teléfono" 
                value={personalInfo.phone}
                onChange={(e) => setPersonalInfo({...personalInfo, phone: e.target.value})}
              />
            </div>
          </div>
        </div>
        
        {/* Foto de perfil - lado derecho */}
        <div className="lg:w-80">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Foto de perfil</h3>
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <img 
                src={profileImage} 
                alt="Foto de perfil" 
                className="w-48 h-48 object-cover rounded-lg border-4 border-gray-200"
              />
              <input 
                id="profile-upload" 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleImageUpload}
              />
            </div>
            <Button 
              variant="outline" 
              size="sm"
              className="px-3 py-1 text-xs"
              onClick={() => document.getElementById('profile-upload')?.click()}
            >
              <Camera className="w-3 h-3 mr-1" />
              Cambiar foto
            </Button>
          </div>
        </div>
      </div>
      
      {/* Separador después de Mi información personal */}
      <hr className="border-gray-200 my-6" />
      
      <Button onClick={handleSave} className="w-full">Guardar cambios</Button>
    </div>
  );

  const renderInterests = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="hobbies">Aficiones</Label>
          <Textarea 
            id="hobbies" 
            placeholder="Cuéntanos sobre tus aficiones..." 
            value={interests.hobbies}
            onChange={(e) => setInterests({...interests, hobbies: e.target.value})}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="music">Grupos musicales o discos</Label>
          <Textarea 
            id="music" 
            placeholder="Tus grupos o discos favoritos..." 
            value={interests.music}
            onChange={(e) => setInterests({...interests, music: e.target.value})}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="quotes">Citas famosas</Label>
          <Textarea 
            id="quotes" 
            placeholder="Tus citas o frases favoritas..." 
            value={interests.quotes}
            onChange={(e) => setInterests({...interests, quotes: e.target.value})}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="books">Libros, escritores, géneros</Label>
          <Textarea 
            id="books" 
            placeholder="Tus libros, escritores o géneros favoritos..." 
            value={interests.books}
            onChange={(e) => setInterests({...interests, books: e.target.value})}
          />
        </div>
      </div>
      <Button onClick={handleSave} className="w-full">Guardar intereses</Button>
    </div>
  );

  const renderRequests = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">¿Quién puede agregarme como amigo?</h3>
        <Select defaultValue="everyone">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="everyone">Todo Tuentis</SelectItem>
            <SelectItem value="friends-of-friends">Amigos de amigos</SelectItem>
            <SelectItem value="nobody">Nadie</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button onClick={handleSave} className="w-full">Guardar configuración</Button>
    </div>
  );

  const renderPrivacy = () => (
    <div className="space-y-6">
      <div className="space-y-6">
        <div className="space-y-2">
          <Label>Ver mi perfil</Label>
          <Select value={privacySettings.viewProfile} onValueChange={(value) => setPrivacySettings({...privacySettings, viewProfile: value as 'friends' | 'friends-of-friends' | 'everyone'})}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="friends">Solo mis amigos</SelectItem>
              <SelectItem value="friends-of-friends">Amigos de amigos</SelectItem>
              <SelectItem value="everyone">Todo Tuentis</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label>Ver mi tablón</Label>
          <Select value={privacySettings.viewWall} onValueChange={(value) => setPrivacySettings({...privacySettings, viewWall: value as 'friends' | 'friends-of-friends' | 'everyone'})}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="friends">Solo mis amigos</SelectItem>
              <SelectItem value="friends-of-friends">Amigos de amigos</SelectItem>
              <SelectItem value="everyone">Todo Tuentis</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label>Descargar mis fotos</Label>
          <Select value={privacySettings.downloadPhotos} onValueChange={(value) => setPrivacySettings({...privacySettings, downloadPhotos: value as 'nobody' | 'friends' | 'friends-of-friends' | 'everyone'})}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nobody">Nadie</SelectItem>
              <SelectItem value="friends">Solo mis amigos</SelectItem>
              <SelectItem value="friends-of-friends">Amigos de amigos</SelectItem>
              <SelectItem value="everyone">Todo Tuentis</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label>Enviarme mensajes</Label>
          <Select value={privacySettings.sendMessages} onValueChange={(value) => setPrivacySettings({...privacySettings, sendMessages: value as 'nobody' | 'friends' | 'friends-of-friends' | 'everyone'})}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nobody">Nadie</SelectItem>
              <SelectItem value="friends">Solo mis amigos</SelectItem>
              <SelectItem value="friends-of-friends">Amigos de amigos</SelectItem>
              <SelectItem value="everyone">Todo Tuentis</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label>Ver mis números de teléfono</Label>
          <Select value={privacySettings.viewPhone} onValueChange={(value) => setPrivacySettings({...privacySettings, viewPhone: value as 'nobody' | 'friends' | 'friends-of-friends' | 'everyone'})}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nobody">Nadie</SelectItem>
              <SelectItem value="friends">Solo mis amigos</SelectItem>
              <SelectItem value="friends-of-friends">Amigos de amigos</SelectItem>
              <SelectItem value="everyone">Todo Tuentis</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Secciones de bloqueo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Usuarios bloqueados</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Puedes evitar que otros usuarios te vean o se pongan en contacto contigo. Para bloquear a un usuario, visita su perfil y haz clic en "Bloquear".
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fotos bloqueadas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Puedes evitar que se muestren en fotos que no te gusten. Para bloquear una foto, ve a la página de la foto y haz clic en "Bloquear".
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invitaciones bloqueadas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Puedes evitar que otros usuarios te inviten a eventos, páginas o grupos. Para bloquear invitaciones de un usuario, ve a su perfil.
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Juegos bloqueados</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Puedes evitar que otros usuarios te inviten a jugar a los juegos que hayas bloqueado. Para bloquear invitaciones de un juego, ve a la página de mensajes de juegos.
            </p>
          </CardContent>
        </Card>
      </div>
      
      <Button onClick={handleSave} className="w-full">Guardar configuración</Button>
    </div>
  );

  const renderNotifications = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium">Nuevos mensajes</h3>
            <p className="text-sm text-gray-600">Recibir notificaciones de nuevos mensajes</p>
          </div>
          <Switch 
            checked={notificationSettings.newMessages}
            onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, newMessages: checked})}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium">Nuevos seguidores</h3>
            <p className="text-sm text-gray-600">Notificar cuando alguien te siga</p>
          </div>
          <Switch 
            checked={notificationSettings.newFollowers}
            onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, newFollowers: checked})}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium">Comentarios en posts</h3>
            <p className="text-sm text-gray-600">Notificar cuando comenten tus publicaciones</p>
          </div>
          <Switch 
            checked={notificationSettings.postComments}
            onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, postComments: checked})}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium">Solicitudes de amistad</h3>
            <p className="text-sm text-gray-600">Notificar cuando recibas solicitudes de amistad</p>
          </div>
          <Switch 
            checked={notificationSettings.friendRequests}
            onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, friendRequests: checked})}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium">Etiquetas en fotos</h3>
            <p className="text-sm text-gray-600">Notificar cuando te etiqueten en fotos</p>
          </div>
          <Switch 
            checked={notificationSettings.photoTags}
            onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, photoTags: checked})}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium">Invitaciones a eventos</h3>
            <p className="text-sm text-gray-600">Notificar cuando te inviten a eventos</p>
          </div>
          <Switch 
            checked={notificationSettings.eventInvites}
            onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, eventInvites: checked})}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium">Resumen semanal</h3>
            <p className="text-sm text-gray-600">Recibir un resumen de actividad cada semana</p>
          </div>
          <Switch 
            checked={notificationSettings.weeklyDigest}
            onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, weeklyDigest: checked})}
          />
        </div>
      </div>
      <Button onClick={handleSave} className="w-full">Guardar preferencias</Button>
    </div>
  );

  const renderAccount = () => (
    <div className="space-y-6">
      <InvitationsManager />
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600">Zona de peligro</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium">Desactivar cuenta</h3>
              <p className="text-sm text-gray-600">Desactiva temporalmente tu cuenta</p>
            </div>
            <Button variant="outline" size="sm">
              Desactivar
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium">Eliminar cuenta</h3>
              <p className="text-sm text-gray-600">Elimina permanentemente tu cuenta y todos tus datos</p>
            </div>
            <Button variant="destructive" size="sm">
              Eliminar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'personal':
        return renderPersonalInfo();
      case 'interests':
        return renderInterests();
      case 'requests':
        return renderRequests();
      case 'privacy':
        return renderPrivacy();
      case 'notifications':
        return renderNotifications();
      case 'account':
        return renderAccount();
      default:
        return renderPersonalInfo();
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <Header />
      
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="mb-4">
          <h1 className="text-3xl font-bold text-gray-900">Ajustes</h1>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="border border-gray-200">
              <CardContent className="p-0">
                <nav className="space-y-1">
                  {sections.map((section) => {
                    const Icon = section.icon;
                    return (
                      <button
                        key={section.id}
                        onClick={() => setActiveSection(section.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium rounded-none first:rounded-t-lg last:rounded-b-lg transition-colors ${
                          activeSection === section.id
                            ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {section.name}
                      </button>
                    );
                  })}
                </nav>
              </CardContent>
            </Card>
          </div>
          
          {/* Content */}
          <div className="lg:col-span-3">
            <Card className="border border-gray-200">
              <CardHeader className="pb-2">
                <CardTitle className="font-semibold text-gray-700">
                  {sections.find(s => s.id === activeSection)?.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {renderContent()}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      {/* Chat mínimo para páginas sin RightSidebar */}
      <MiniChatButton />
    </div>
  );
}
