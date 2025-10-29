import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { SimpleFeed } from '@/components/SimpleFeed';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, ChevronDown, ChevronRight, MessageCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { getUserProfile, postsService } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { AddFriendButton } from '@/components/AddFriendButton';

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

const UserProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user: authUser, loading: authLoading } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [showAlbums, setShowAlbums] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debug: Log inicial del componente
  console.log('🚀 UserProfile component mounted/updated:', {
    userId,
    authUser: authUser ? { id: authUser.id, name: authUser.name } : null,
    authLoading,
    loading,
    error
  });

  useEffect(() => {
    console.log('🔄 useEffect triggered:', {
      userId,
      authUserId: authUser?.id,
      authLoading,
      userIdExists: !!userId,
      authUserExists: !!authUser
    });

    // Esperar a que termine la carga de autenticación
    if (authLoading) {
      console.log('⏳ Waiting for auth to complete...');
      return;
    }

    if (!userId) {
      console.log('❌ No userId provided, redirecting to /profile');
      navigate('/profile');
      return;
    }

    // Si el userId es el mismo que el usuario autenticado, redirigir al perfil propio
    if (authUser?.id === userId) {
      console.log('🔄 Same user as authenticated, redirecting to /profile');
      navigate('/profile');
      return;
    }

    console.log('✅ All checks passed, loading user data...');
    loadUserData();
  }, [userId, authUser?.id, authLoading, navigate]);

  const loadUserData = async () => {
    if (!userId) {
      console.log('❌ loadUserData: No userId provided');
      return;
    }
    
    try {
      console.log('🔄 loadUserData: Starting data load for userId:', userId);
      setLoading(true);
      setError(null);
      
      // Cargar datos del usuario
      console.log('📡 Calling getUserProfile...');
      const userData = await getUserProfile(userId);
      
      console.log('📊 getUserProfile response:', {
        userData,
        hasData: !!userData,
        userDataKeys: userData ? Object.keys(userData) : []
      });
      
      if (userData) {
        console.log('✅ User data found, mapping user...');
        
        // Mapear los datos de la base de datos al formato del perfil
        const mappedUser = {
          id: userData.id,
          name: `${userData.first_name} ${userData.last_name}`.trim() || 'Usuario',
          email: userData.email || '',
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
        
        console.log('👤 Mapped user data:', mappedUser);
        setUser(mappedUser);

        try {
          console.log('📝 Loading user posts...');
          const userPosts = await postsService.getUserFeedPosts(userId);
          console.log('📝 Posts loaded:', { count: userPosts?.length || 0, posts: userPosts });
          
          const mappedPosts = userPosts?.map(post => ({
            id: post.id,
            user: post.user ? `${post.user.first_name} ${post.user.last_name}`.trim() : 'Usuario',
            content: post.content || '',
            image: post.image_url || undefined,

            mediaUser: post.user ? {
              name: `${post.user.first_name} ${post.user.last_name}`.trim(),
              avatar: post.user.avatar_url
            } : null,
            time: post.created_at ? new Date(post.created_at).toLocaleDateString('es-ES', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit'
            }) : 'Fecha no disponible'
          })) || [];
          
          setPosts(mappedPosts);
        } catch (postError) {
          console.error('❌ Error loading user posts:', postError);
          // No es crítico, continuar sin posts
          setPosts([]);
        }
      } else {
        console.log('❌ No user data returned from getUserProfile');
        setError('Usuario no encontrado');
        toast({
          title: "Usuario no encontrado",
          description: "El perfil que buscas no existe",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('💥 Error in loadUserData:', error);
      console.error('💥 Error stack:', error.stack);
      setError('Error al cargar el perfil');
      toast({
        title: "Error",
        description: "No se pudo cargar el perfil del usuario",
        variant: "destructive"
      });
    } finally {
      console.log('🏁 loadUserData finished, setting loading to false');
      setLoading(false);
    }
  };

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

  const handleSendMessage = () => {
    navigate(`/messages?user=${userId}`);
  };

  // Debug: Log antes de cada render
  console.log('🎨 About to render:', {
    authLoading,
    loading,
    error,
    hasUser: !!user,
    userName: user?.name
  });

  // Mostrar loading mientras se autentica
  if (authLoading) {
    console.log('🎨 Rendering: Auth loading state');
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Verificando autenticación...</div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    console.log('🎨 Rendering: Loading state');
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

  if (error || !user) {
    console.log('🎨 Rendering: Error state', { error, hasUser: !!user });
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <div className="text-gray-500">{error || 'Usuario no encontrado'}</div>
            <button 
              onClick={() => navigate('/people')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Volver a buscar personas
            </button>
          </div>
        </div>
      </div>
    );
  }

  console.log('🎨 Rendering: Main profile content');
  
  // Datos de ejemplo para amigos y álbumes (igual que en Profile.tsx)
  const exampleFriends = [
    { id: '1', name: 'Ana García', avatar: '/src/lib/img/default_tuenties.webp' },
    { id: '2', name: 'Carlos López', avatar: '/src/lib/img/default_tuenties.webp' },
    { id: '3', name: 'María Rodríguez', avatar: '/src/lib/img/default_tuenties.webp' },
    { id: '4', name: 'David Martín', avatar: '/src/lib/img/default_tuenties.webp' },
    { id: '5', name: 'Laura Sánchez', avatar: '/src/lib/img/default_tuenties.webp' },
    { id: '6', name: 'Javier Ruiz', avatar: '/src/lib/img/default_tuenties.webp' }
  ];

  const exampleAlbums = [
    { id: '1', name: 'Vacaciones 2024', thumbnail: '/src/lib/img/default_tuenties.webp', photoCount: 15 },
    { id: '2', name: 'Cumpleaños', thumbnail: '/src/lib/img/default_tuenties.webp', photoCount: 8 },
    { id: '3', name: 'Concierto', thumbnail: '/src/lib/img/default_tuenties.webp', photoCount: 12 },
    { id: '4', name: 'Familia', thumbnail: '/src/lib/img/default_tuenties.webp', photoCount: 25 }
  ];

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
                <div className="relative">
                  <img 
                    src={user.avatar || '/placeholder.svg'} 
                    alt="Foto de perfil"
                    className="w-full aspect-square object-cover rounded-lg"
                  />
                </div>
                
                {/* Botones de acción */}
                <div className="mt-4 space-y-2">
                  <AddFriendButton 
                    targetUserId={user.id}
                    targetUserName={user.name}
                    className="w-full justify-center"
                  />
                  
                  <button 
                    onClick={handleSendMessage}
                    className="w-full flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Enviar mensaje</span>
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
            {/* Tablón del usuario */}
            <Card className="border border-gray-200 bg-gray-50">
              <CardHeader className="pb-2">
                <CardTitle className="font-semibold text-gray-700">Tablón de {user.name}</CardTitle>
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
                    Álbumes ({exampleAlbums.length})
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
                      {exampleAlbums.map((album) => (
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
                  {exampleAlbums.slice(0, 4).map((album) => (
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
                  Ver todas ({exampleAlbums.reduce((total, album) => total + album.photoCount, 0)})
                </button>
              </CardContent>
            </Card>

            {/* Amigos */}
            <Card className="border border-gray-200 bg-gray-50">
              <CardHeader className="pb-2">
                <CardTitle className="font-semibold text-sm text-gray-700">Amigos de {user.name}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="grid grid-cols-3 gap-2">
                  {exampleFriends.slice(0, 6).map((friend) => (
                    <div key={friend.id} className="text-center">
                      <img 
                        src={friend.avatar} 
                        alt={friend.name}
                        className="w-12 h-12 rounded object-cover mx-auto mb-1 cursor-pointer hover:opacity-80"
                        onClick={() => navigate(`/user/${friend.id}`)}
                      />
                      <span 
                        className="text-xs text-blue-600 hover:underline cursor-pointer"
                        onClick={() => navigate(`/user/${friend.id}`)}
                      >
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
    </div>
  );
};

export default UserProfile;