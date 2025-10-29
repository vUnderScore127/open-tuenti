import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { SimpleFeed } from '@/components/SimpleFeed';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, Edit, Users, X, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from "react-router-dom";
import { getUserProfile, friendshipService, postsService } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { updateUserProfile } from '@/lib/supabase';
import { storageService } from '@/lib/storageService';

interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  gender?: string;
  birthday?: string;
  age?: number | string;
  location?: string;
  maritalStatus?: string;
  looking?: string;
  city?: string;
  province?: string;
  country?: string;
  registeredDate?: string;
  interests?: string[];
}

interface Friend {
  id: string;
  name: string;
  avatar: string;
}

interface Album {
  id: string;
  name: string;
  thumbnail: string;
  photoCount: number;
}

const Profile = () => {
  const navigate = useNavigate();
  const { user: authUser } = useAuth(); // Usuario autenticado
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [showProfilePicModal, setShowProfilePicModal] = useState(false);
  const [statusUpdate, setStatusUpdate] = useState('');
  const [showAlbums, setShowAlbums] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file || !authUser?.id) return;
  
  // Validar tipo de archivo
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    toast({
      title: "Archivo no válido",
      description: "Solo se permiten imágenes (JPEG, PNG, GIF, WebP)",
      variant: "destructive"
    });
    return;
  }
  
  // Validar tamaño (máximo 10MB)
  if (file.size > 10 * 1024 * 1024) {
    toast({
      title: "Archivo muy grande",
      description: "La imagen no puede superar los 10MB",
      variant: "destructive"
    });
    return;
  }
  
  setIsUploadingAvatar(true);
  
  try {
    // Subir imagen usando el servicio de storage
    const imageVersions = await storageService.uploadImageWithVersions(file, authUser.id);
    
    // Actualizar el perfil del usuario con la nueva URL del avatar
    await updateUserProfile(authUser.id, {
      avatar_url: imageVersions.full
    });
  
    // Actualizar el estado local
    if (user) {
      setUser({
        ...user,
        avatar: imageVersions.full
      });
    }
  
    // Actualizar localStorage
    const userData = localStorage.getItem('tuentis_user');
    if (userData) {
      const parsedData = JSON.parse(userData);
      parsedData.avatar_url = imageVersions.full;
      localStorage.setItem('tuentis_user', JSON.stringify(parsedData));
    }
  
    toast({
      title: "Foto actualizada",
      description: "Tu foto de perfil se ha actualizado correctamente"
    });
  
    setShowProfilePicModal(false);
  } catch (error) {
    console.error('Error uploading avatar:', error);
    toast({
      title: "Error",
      description: "No se pudo actualizar la foto de perfil",
      variant: "destructive"
    });
  } finally {
    setIsUploadingAvatar(false);
  }
};

  useEffect(() => {
    const loadUserData = async () => {
      if (!authUser?.id) return;
      
      try {
        setLoading(true);
        
        // Cargar datos actualizados desde la base de datos
        const userData = await getUserProfile(authUser.id);
        
        if (userData) {
          // Mapear los datos de la base de datos al formato del perfil
          const mappedUser = {
            id: userData.id,
            name: `${userData.first_name} ${userData.last_name}`.trim() || 'Usuario',
            email: userData.email || '',
            ...userData,
            gender: userData.gender || 'No especificado',
            birthday: userData.birth_day && userData.birth_month && userData.birth_year 
              ? `${userData.birth_day} de ${getMonthName(userData.birth_month)}` 
              : 'No especificado',
            age: userData.age || 'No especificado',
            location: userData.city || 'No especificado',
            maritalStatus: getMaritalStatusText(userData.marital_status),
            looking: getLookingForText(userData.looking_for),
            city: userData.city || 'No especificado',
            province: userData.province || 'No especificado',
            country: userData.country || 'No especificado',
            registeredDate: userData.created_at 
              ? new Date(userData.created_at).toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })
              : 'No disponible',
            interests: userData.hobbies ? userData.hobbies.split(',').map(h => h.trim()) : [],
            avatar: userData.avatar_url || '/src/lib/img/default_tuenties.webp'
          };
          
          setUser(mappedUser);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        // Fallback a datos de localStorage si hay error
        const localData = localStorage.getItem('tuentis_user');
        if (localData) {
          const parsedUser = JSON.parse(localData);
          setUser({
            ...parsedUser,
            avatar: parsedUser.avatar_url || '/src/lib/img/default_tuenties.webp'
          });
        }
      } finally {
        setLoading(false);
      }
    };

    loadUserData();


    setFriends([
      { id: '1', name: 'Ana García', avatar: '/src/lib/img/default_tuenties.webp' },
      { id: '2', name: 'Carlos López', avatar: '/src/lib/img/default_tuenties.webp' },
      { id: '3', name: 'María Rodríguez', avatar: '/src/lib/img/default_tuenties.webp' },
      { id: '4', name: 'David Martín', avatar: '/src/lib/img/default_tuenties.webp' },
      { id: '5', name: 'Laura Sánchez', avatar: '/src/lib/img/default_tuenties.webp' },
      { id: '6', name: 'Javier Ruiz', avatar: '/src/lib/img/default_tuenties.webp' }
    ]);

    // Datos de ejemplo para álbumes
    setAlbums([
      { id: '1', name: 'Vacaciones 2024', thumbnail: '/src/lib/img/default_tuenties.webp', photoCount: 15 },
      { id: '2', name: 'Cumpleaños', thumbnail: '/src/lib/img/default_tuenties.webp', photoCount: 8 },
      { id: '3', name: 'Concierto', thumbnail: '/src/lib/img/default_tuenties.webp', photoCount: 12 },
      { id: '4', name: 'Familia', thumbnail: '/src/lib/img/default_tuenties.webp', photoCount: 25 }
    ]);
  }, [authUser?.id]);

  // Funciones auxiliares para mapear los datos
  const getMonthName = (month: number) => {
    const months = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];
    return months[month - 1] || 'mes';
  };

  const getMaritalStatusText = (status: string) => {
    const statusMap = {
      'single': 'Soltero/a',
      'married': 'Casado/a',
      'divorced': 'Divorciado/a',
      'widowed': 'Viudo/a',
      'relationship': 'En una relación'
    };
    return statusMap[status] || 'No especificado';
  };

  const getLookingForText = (looking: string) => {
    const lookingMap = {
      'chico para rollo': 'Chico para rollo',
      'chica para rollo': 'Chica para rollo',
      'chic@ para rollo': 'Chic@ para rollo',
      'no_indicar': 'No especificado'
    };
    return lookingMap[looking] || 'No especificado';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Cargando perfil...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <div>Error al cargar el perfil</div>;
  }

  const handleStatusUpdate = () => {
    if (statusUpdate.trim()) {
      toast({
        title: "Estado actualizado",
        description: "Tu estado se ha actualizado correctamente"
      });
      setStatusUpdate('');
    }
  };

  const handleProfilePicClick = () => {
    setShowProfilePicModal(true);
  };

  if (!user) {
    return <div>Cargando...</div>;
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Columna izquierda - Perfil e información */}
          <div className="lg:col-span-1 space-y-4">
            {/* Foto de perfil */}
            <Card className="border border-gray-200">
              <CardContent className="p-4">
                <div 
                  className="relative group cursor-pointer"
                  onClick={handleProfilePicClick}
                >
                  <img 
                    src={user.avatar || '/placeholder.svg'} 
                    alt="Foto de perfil"
                    className="w-full aspect-square object-cover rounded-lg"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-white text-sm font-medium flex items-center">
                      <Camera className="w-4 h-4 mr-2" />
                      Cambiar foto de perfil
                    </div>
                  </div>
                </div>
                
                {/* Enlaces */}
                <div className="mt-4 space-y-2">
                  <button 
                    onClick={() => navigate('/settings')}
                    className="text-blue-600 hover:underline text-sm font-medium flex items-center"
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    Editar mi perfil
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Información personal */}
            <Card className="border border-gray-200 bg-gray-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold text-gray-800">Información</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="space-y-3">
                  {/* Separador después del título Información */}
                  <hr className="border-gray-200" />
                  
                  <div>
                    <h3 className="font-bold text-gray-800 mb-2">Personal</h3>
                    <div className="space-y-1 text-sm">
                      <div><span className="text-gray-600">Sexo:</span> {user.gender}</div>
                      <div><span className="text-gray-600">Cumpleaños:</span> {user.birthday}</div>
                      <div><span className="text-gray-600">Edad:</span> {user.age} años</div>
                      <div><span className="text-gray-600">De:</span> {user.location}</div>
                      <div><span className="text-gray-600">Estado:</span> {user.maritalStatus}</div>
                      <div><span className="text-gray-600">Buscando:</span> {user.looking}</div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-gray-800 mb-2">Contacto</h3>
                    <div className="space-y-1 text-sm">
                      <div><span className="text-gray-600">Ciudad:</span> {user.city}</div>
                      <div><span className="text-gray-600">Provincia:</span> {user.province}</div>
                      <div><span className="text-gray-600">País:</span> {user.country}</div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-gray-800 mb-2">Más detalles</h3>
                    <div className="space-y-1 text-sm">
                      <div><span className="text-gray-600">Registrado:</span> {user.registeredDate}</div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-gray-800 mb-2">Intereses</h3>
                    {/* Separador después del título Intereses */}
                    <hr className="border-gray-200 mb-2" />
                    <div className="flex flex-wrap gap-1">
                      {user.interests?.map((interest, index) => (
                        <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Columna central - Feed */}
          <div className="lg:col-span-2">
            {/* Actualizar estado */}
            <Card className="mb-4 border border-gray-200 bg-gray-50">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <img 
                    src={user.avatar || '/placeholder.svg'} 
                    alt="Tu foto"
                    className="w-8 h-8 rounded object-cover"
                  />
                  <div className="flex-1">
                    <textarea 
                      placeholder="¿Qué estás haciendo?"
                      className="w-full p-2 border border-gray-300 rounded resize-none text-sm"
                      rows={2}
                      value={statusUpdate}
                      onChange={(e) => setStatusUpdate(e.target.value)}
                    />
                    <button 
                      onClick={handleStatusUpdate}
                      className="mt-2 bg-blue-600 text-white px-4 py-1 rounded text-sm hover:bg-blue-700"
                    >
                      Actualizar
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Mi tablón */}
            <Card className="border border-gray-200 bg-gray-50">
              <CardHeader className="pb-2">
                <CardTitle className="font-semibold text-gray-700">Mi tablón</CardTitle>
                <div className="flex space-x-4 mt-2 text-sm">
                  <button className="text-blue-600 hover:underline font-medium">Todo</button>
                  <button className="text-gray-600 hover:underline">Estados</button>
                  <button className="text-gray-600 hover:underline">Comentarios</button>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <SimpleFeed posts={posts} />
              </CardContent>
            </Card>
          </div>

          {/* Columna derecha - Fotos y amigos */}
          <div className="lg:col-span-1 space-y-4">
            {/* Fotos */}
            <Card className="border border-gray-200 bg-gray-50">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-semibold text-sm text-gray-700">Fotos</CardTitle>
                  <button 
                    onClick={() => setShowAlbums(!showAlbums)}
                    className="text-blue-600 text-sm flex items-center hover:underline"
                  >
                    Álbumes ({albums.length})
                    {showAlbums ? 
                      <ChevronDown className="w-3 h-3 ml-1" /> : 
                      <ChevronRight className="w-3 h-3 ml-1" />
                    }
                  </button>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {showAlbums && (
                  <div className="mb-3">
                    <div className="space-y-1">
                      {albums.map((album) => (
                        <button 
                          key={album.id}
                          className="w-full text-left text-sm text-blue-600 hover:underline py-1"
                          onClick={() => {
                            toast({
                              title: "Álbum seleccionado",
                              description: `Mostrando álbum: ${album.name}`
                            });
                          }}
                        >
                          {album.name} ({album.photoCount})
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-2">
                  {albums.slice(0, 4).map((album) => (
                    <div key={album.id} className="relative group cursor-pointer">
                      <img 
                        src={album.thumbnail} 
                        alt={album.name}
                        className="w-full aspect-square object-cover rounded"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded flex items-center justify-center">
                        <span className="text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          {album.photoCount}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="text-blue-600 hover:underline text-sm mt-2">
                  Ver todas ({albums.reduce((total, album) => total + album.photoCount, 0)})
                </button>
              </CardContent>
            </Card>

            {/* Mis amigos */}
            <Card className="border border-gray-200 bg-gray-50">
              <CardHeader className="pb-2">
                <CardTitle className="font-semibold text-sm text-gray-700">Mis amigos</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="grid grid-cols-3 gap-2">
                  {friends.slice(0, 6).map((friend) => (
                    <div key={friend.id} className="text-center">
                      <img 
                        src={friend.avatar} 
                        alt={friend.name}
                        className="w-12 h-12 rounded object-cover mx-auto mb-1"
                      />
                      <span className="text-xs text-blue-600 hover:underline cursor-pointer">
                        {friend.name.split(' ')[0]}
                      </span>
                    </div>
                  ))}
                </div>
                <button className="text-blue-600 hover:underline text-sm mt-3 flex items-center">
                  <Users className="w-3 h-3 mr-1" />
                  Ver todos los amigos
                </button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Modal de foto de perfil */}
      {showProfilePicModal && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
          <div className="relative max-w-2xl max-h-[90vh] bg-white rounded-lg overflow-hidden">
            {/* Header del modal */}
            <div className="bg-gray-50 px-4 py-3 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Foto de perfil</h3>
              <button 
                onClick={() => setShowProfilePicModal(false)}
                className="p-1 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            {/* Contenido del modal */}
            <div className="p-6">
              <div className="flex flex-col items-center space-y-4">
                {/* Imagen actual */}
                <div className="relative">
                  <img 
                    src={user?.avatar || '/src/lib/img/default_tuenties.webp'} 
                    alt="Foto de perfil"
                    className="w-64 h-64 object-cover rounded-lg border-2 border-gray-200"
                  />
                </div>
                
                {/* Botones de acción */}
                <div className="flex space-x-3">
                  <input 
                    id="avatar-upload" 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleAvatarUpload}
                    disabled={isUploadingAvatar}
                  />
                  <button
                    onClick={() => document.getElementById('avatar-upload')?.click()}
                    disabled={isUploadingAvatar}
                    className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isUploadingAvatar ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Subiendo...</span>
                      </>
                    ) : (
                      <>
                        <Camera className="w-4 h-4" />
                        <span>Cambiar foto</span>
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={() => setShowProfilePicModal(false)}
                    className="flex items-center space-x-2 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    <span>Cancelar</span>
                  </button>
                </div>
                
                {/* Información adicional */}
                <p className="text-sm text-gray-500 text-center max-w-sm">
                  Formatos soportados: JPEG, PNG, GIF, WebP. Tamaño máximo: 10MB.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;

