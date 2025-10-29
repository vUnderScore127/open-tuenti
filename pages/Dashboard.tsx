import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { ProfileSidebar } from "@/components/ProfileSidebar";
import { RightSidebar } from "@/components/RightSidebar";
import { SimpleFeed } from "@/components/SimpleFeed";
import { StatusUpdater } from "@/components/StatusUpdater";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import EmailVerificationBanner from '@/components/EmailVerificationBanner'

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedFilter, setFeedFilter] = useState<'all' | 'friends'>('all');

  // Función actualizada para cargar posts con filtro
  const loadRealPosts = async (userId: string, filterType: 'all' | 'friends' = 'all') => {
    try {
      console.log('🔍 Cargando posts reales para usuario:', userId, 'filtro:', filterType);
      
      let query = supabase
        .from('posts')
        .select(`
          id,
          content,
          created_at,
          user_id,
          users(first_name, last_name, avatar_url)
        `)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (filterType === 'friends') {
        // Solo posts de otros usuarios (simulando amigos)
        query = query.neq('user_id', userId);
      }
      // Si es 'all', incluimos todos los posts (propios y de otros)
      
      const { data: postsData, error: postsError } = await query;
      
      if (postsError) {
        console.error('❌ Error obteniendo posts:', postsError);
        return;
      }
      
      console.log('📊 Posts obtenidos:', postsData?.length || 0);
      
      // Para cada post, buscar su imagen
      const postsWithImages = await Promise.all(
        (postsData || []).map(async (post) => {
          console.log('🔍 Post completo:', post);
          console.log('👤 Usuario del post:', post.users);
          
          const { data: mediaData, error: mediaError } = await supabase
            .from('media_uploads')
            .select(`
              thumbnail_url, 
              file_url, 
              file_type,
              user_id,
              users!media_uploads_user_id_fkey(first_name, last_name, avatar_url)
            `)
            .eq('post_id', post.id)
            .limit(1)
            .single();
          
          if (mediaError && mediaError.code !== 'PGRST116') {
            console.error('❌ Error obteniendo media:', mediaError);
          }
          
          const hasMedia = mediaData?.thumbnail_url;
          const isVideo = mediaData?.file_type?.startsWith('video/');
          const mediaUser = mediaData?.users;
          
          return {
            id: post.id,
            user: `${(post.users as any)?.first_name || ''} ${(post.users as any)?.last_name || ''}`.trim() || 'Usuario',
            content: post.content,
            image: hasMedia || undefined,
            videoUrl: isVideo ? mediaData?.file_url : undefined,
            isVideo: isVideo || false,
            mediaUser: {
              name: `${(post.users as any)?.first_name || ''} ${(post.users as any)?.last_name || ''}`.trim() || 'Usuario',
              avatar: (post.users as any)?.avatar_url || ''
            },
            time: getTimeAgo(new Date(post.created_at))
          };
        })
      );
      
      console.log('✅ Posts procesados:', postsWithImages.length);
      setPosts(postsWithImages);
      
    } catch (error) {
      console.error('❌ Error en loadRealPosts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Función para formatear tiempo
  const getTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diffInMs = now.getTime() - timestamp.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) return "ahora mismo";
    if (diffInMinutes < 60) return `hace ${diffInMinutes} minuto${diffInMinutes > 1 ? 's' : ''}`;
    if (diffInHours < 24) return `hace ${diffInHours} hora${diffInHours > 1 ? 's' : ''}`;
    return `hace ${diffInDays} día${diffInDays > 1 ? 's' : ''}`;
  };

  useEffect(() => {
    const userData = localStorage.getItem('tuentis_user');
    if (!userData) {
      navigate('/');
      return;
    }
    
    const rawUser = JSON.parse(userData);
    const mappedUser = {
      id: rawUser.id,
      name: `${rawUser.first_name || ''} ${rawUser.last_name || ''}`.trim() || rawUser.name || 'Usuario',
      email: rawUser.email || '',
      avatar: rawUser.avatar_url || rawUser.avatar || ''
    };
    
    console.log('👤 Usuario mapeado:', mappedUser);
    setUser(mappedUser);
    
    // Cargar posts reales
    if (mappedUser.id) {
      loadRealPosts(mappedUser.id, feedFilter);
    }
  }, [navigate, feedFilter]);

  if (!user || loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-blue-600 mb-2">Tuentis</h1>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  const reloadPosts = () => {
    console.log('🔄 Recargando posts...');
    if (user?.id) {
      loadRealPosts(user.id, feedFilter);
    }
  };

  const handleFilterChange = (newFilter: 'all' | 'friends') => {
    setFeedFilter(newFilter);
    if (user?.id) {
      setLoading(true);
      loadRealPosts(user.id, newFilter);
    }
  };

  const handleStatusUpdate = async (statusText: string) => {
    try {
      console.log('💾 Guardando nuevo estado:', statusText);
      
      const { data, error } = await supabase
        .from('posts')
        .insert({
          content: statusText,
          user_id: user.id
        })
        .select()
        .single();
      
      if (error) {
        console.error('❌ Error guardando estado:', error);
        return;
      }
      
      console.log('✅ Estado guardado exitosamente');
      // Recargar posts para mostrar el nuevo
      reloadPosts();
      
    } catch (error) {
      console.error('❌ Error en handleStatusUpdate:', error);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Header user={user} onPostCreated={reloadPosts} />
  
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-[2.9fr_7fr_2.5fr] gap-4">
          <div>
            <ProfileSidebar />
          </div>
          
          <div>
            {/* Actualizador de estado */}
            <StatusUpdater onStatusUpdate={handleStatusUpdate} userId={user.id} />
            
            <div className="bg-white shadow-sm border border-gray-200 p-4 mb-4">
              <h2 className="text-lg font-semibold mb-2">Novedades</h2>
              {/* Separador */}
              <hr className="border-gray-200 mb-2" />
              {/* Filtros estilo botones como en Profile */}
              <div className="flex space-x-4 mb-4 text-sm">
                <button 
                  onClick={() => handleFilterChange('all')}
                  className={`hover:underline font-medium ${
                    feedFilter === 'all' ? 'text-blue-600' : 'text-gray-600'
                  }`}
                >
                  Todas
                </button>
                <button 
                  onClick={() => handleFilterChange('friends')}
                  className={`hover:underline font-medium ${
                    feedFilter === 'friends' ? 'text-blue-600' : 'text-gray-600'
                  }`}
                >
                  Amigos
                </button>
              </div>
              <SimpleFeed posts={posts} filterType={feedFilter} />
            </div>
          </div>
          
          <div>
            <RightSidebar />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
