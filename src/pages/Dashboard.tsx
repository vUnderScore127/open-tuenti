import { useState, useEffect } from "react";
import { IonPage, IonContent } from '@ionic/react';
import Header from "@/components/Header";
import { useHistory } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

import LeftSidebar from "../components/LeftSidebar";
import MainContent from "../components/MainContent";
import RightSidebar from "../components/RightSidebar";
import Footer from "../components/Footer";
import '../styles/tuenti-dashboard.css';

// Primero define la interfaz para el tipo de post
interface Post {
  id: any;
  user: string;
  content: any;
  image?: any;
  videoUrl?: any;
  isVideo: boolean;
  mediaUser: {
    name: string;
    avatar: any;
  };
  time: string;
}

const Dashboard: React.FC = () => {
  const navigate = useHistory();
  const { user, loading } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [feedFilter, setFeedFilter] = useState<'all' | 'friends'>('all');
  const [postsLoading, setPostsLoading] = useState(true);
  


  const loadRealPosts = async (userId: string, filterType: 'all' | 'friends' = 'all') => {
    try {
      let query = supabase
        .from('posts')
        .select(`
          id,
          content,
          created_at,
          user_id,
          profiles(first_name, last_name, avatar_url, username)
        `)
        .order('created_at', { ascending: false })
        .limit(10);
      if (filterType === 'friends') {
        query = query.neq('user_id', userId);
      }
      const { data: postsData, error: postsError } = await query;
      if (postsError) return;
      const postsWithImages = await Promise.all(
        (postsData || []).map(async (post) => {
          const { data: mediaData, error: mediaError } = await supabase
            .from('media_uploads')
            .select(`
              thumbnail_url, 
              file_url, 
              file_type,
              user_id,
              profiles!media_uploads_user_id_fkey(first_name, last_name, avatar_url)
            `)
            .eq('post_id', post.id)
            .limit(1)
            .single();
          const hasMedia = mediaData?.thumbnail_url;
          const isVideo = mediaData?.file_type?.startsWith('video/');
          const name = `${(post.profiles as any)?.first_name || ''} ${(post.profiles as any)?.last_name || ''}`.trim()
          return {
            id: post.id,
            user: name || (post.profiles as any)?.username || 'Usuario',
            content: post.content,
            image: hasMedia || undefined,
            videoUrl: isVideo ? mediaData?.file_url : undefined,
            isVideo: isVideo || false,
            mediaUser: {
              name: `${(post.profiles as any)?.first_name || ''} ${(post.profiles as any)?.last_name || ''}`.trim() || 'Usuario',
              avatar: (post.profiles as any)?.avatar_url || ''
            },
            time: getTimeAgo(new Date(post.created_at))
          };
        })
      );
      setPosts(postsWithImages);
    } catch (error) {
    } finally {
      setPostsLoading(false);
    }
  };

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
    if (!user && !loading) {
      navigate.push('/login');
      return;
    }
    if (user?.id) {
      setPostsLoading(true);
      loadRealPosts(user.id, feedFilter);
    }
  }, [user, loading, feedFilter, navigate]);

  // Elimina completamente estos bloques:
  // const profileSidebarRef = useRef<HTMLDivElement>(null);
  // const [profileSidebarHeight, setProfileSidebarHeight] = useState(0);
  // useLayoutEffect(() => { ... });
  // useLayoutEffect(() => { ... });

  if (!user || loading || postsLoading) {
    return (
      <IonPage>
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-blue-600 mb-2">Tuentis</h1>
            <p className="text-gray-600">Cargando...</p>
          </div>
        </div>
      </IonPage>
    );
  }

  const reloadPosts = () => {
    if (user?.id) {
      setPostsLoading(true);
      loadRealPosts(user.id, feedFilter);
    }
  };

  const handleFilterChange = (newFilter: 'all' | 'friends') => {
    setFeedFilter(newFilter);
    if (user?.id) {
      setPostsLoading(true);
      loadRealPosts(user.id, newFilter);
    }
  };

  const handleStatusUpdate = async (statusText: string) => {
    try {
      const { error } = await supabase
        .from('posts')
        .insert({
          content: statusText,
          user_id: user.id
        });
      if (!error) reloadPosts();
    } catch (error) {}
  };

  return (
    <IonPage>
      <Header />
      <IonContent className="dashboard-container">
        <div className="dashboard-content">
          <div className="tuenti-layout">
            {/* Columna izquierda */}
            <div className="tuenti-left-sidebar">
              <LeftSidebar />
            </div>

            {/* Columna central */}
            <div className="tuenti-main-content">
              <MainContent />
            </div>

            {/* Columna derecha */}
            <div className="tuenti-right-sidebar">
              <RightSidebar />
            </div>
          </div>
        </div>
        <Footer />
      </IonContent>
    </IonPage>
  );
};

export default Dashboard;

