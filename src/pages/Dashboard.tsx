import { useState, useEffect } from "react";
import { IonPage, IonContent } from '@ionic/react';
import Header from "@/components/Header";
import { useHistory } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

import LeftSidebar from "../components/LeftSidebar";
import MainContent from "@/components/MainContent";
import RightSidebar from "../components/RightSidebar";
import '../styles/tuenti-dashboard.css';
import NotificationModal from "@/components/ui/NotificationModal";

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
  const [feedFilter, setFeedFilter] = useState<'all' | 'friends'>('friends');
  const [postsLoading, setPostsLoading] = useState(true);
  const [lastStatusText, setLastStatusText] = useState<string>('');
  const [lastStatusTime, setLastStatusTime] = useState<string>('');
  const [friendIds, setFriendIds] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalItems, setModalItems] = useState<{ id: string; title: string; description?: string; timestamp?: string }[]>([]);
  


  const loadRealPosts = async (userId: string, filterType: 'all' | 'friends' = 'friends') => {
    try {
      let computedFriendIds: string[] = [];
      if (filterType === 'friends') {
        const { data: friendships, error: fsErr } = await supabase
          .from('friendships')
          .select('user_id, friend_id, status')
          .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
          .eq('status', 'accepted');
        if (!fsErr && friendships) {
          computedFriendIds = friendships.map((f: any) => (f.user_id === userId ? f.friend_id : f.user_id));
        }
        console.debug('[Feed] Friendships fetched:', { userId, count: (friendships||[]).length, computedFriendIds, error: fsErr?.message });
      }
      // Mantén en estado los IDs de amigos para suscripciones en tiempo real
      if (computedFriendIds.length > 0) {
        setFriendIds(computedFriendIds);
      } else {
        setFriendIds([]);
      }

      let query = supabase
        .from('posts')
        .select(`
          id,
          content,
          created_at,
          user_id,
          profiles(first_name, last_name, avatar_url)
        `)
        .order('created_at', { ascending: false })
        .limit(10);
      if (filterType === 'friends') {
        if (computedFriendIds.length === 0) {
          console.debug('[Feed] No friendIds, showing empty friends feed');
          setPosts([]);
          return;
        }
        console.debug('[Feed] Applying friends filter', { computedFriendIds });
        query = query.in('user_id', computedFriendIds);
      }
      const { data: postsData, error: postsError } = await query;
      if (postsError) {
        console.error('[Feed] Error fetching posts:', postsError);
        if ((postsError as any)?.message?.toLowerCase().includes('permission')) {
          console.error('[Feed] Permission error likely due to RLS. Ensure posts policies allow viewing friends posts.');
        }
      }
      if (postsError) return;
      const postIds = (postsData || []).map(p => p.id);

      // Cargar conteo de comentarios por post
      let commentsCountByPost: Record<string, number> = {};
      if (postIds.length > 0) {
        const { data: commentsRows, error: commentsErr } = await supabase
          .from('post_comments')
          .select('id, post_id')
          .in('post_id', postIds);
        if (commentsErr) {
          console.error('[Feed] Error fetching comments count:', commentsErr);
        } else {
          (commentsRows || []).forEach((r: any) => {
            const pid = r.post_id;
            commentsCountByPost[pid] = (commentsCountByPost[pid] || 0) + 1;
          });
        }
      }

      // Cargar IDs de media por post
      let mediaIdsByPost: Record<string, string[]> = {};
      let allMediaIds: string[] = [];
      if (postIds.length > 0) {
        const { data: mediaRows, error: mediaRowsErr } = await supabase
          .from('media_uploads')
          .select('id, post_id')
          .in('post_id', postIds);
        if (mediaRowsErr) {
          console.error('[Feed] Error fetching media ids:', mediaRowsErr);
        } else {
          (mediaRows || []).forEach((m: any) => {
            const pid = m.post_id;
            const mid = m.id;
            if (!mediaIdsByPost[pid]) mediaIdsByPost[pid] = [];
            mediaIdsByPost[pid].push(mid);
            allMediaIds.push(mid);
          });
        }
      }

      // Cargar conteo de fotos etiquetadas por post (tags en media)
      let tagsCountByPost: Record<string, number> = {};
      if (allMediaIds.length > 0) {
        const { data: tagRows, error: tagsErr } = await supabase
          .from('photo_tags')
          .select('id, media_upload_id')
          .in('media_upload_id', allMediaIds);
        if (tagsErr) {
          console.error('[Feed] Error fetching photo tags count:', tagsErr);
        } else {
          (tagRows || []).forEach((t: any) => {
            const mid = t.media_upload_id;
            // Encontrar post asociado a este media id
            const postIdForMedia = Object.keys(mediaIdsByPost).find(pid => (mediaIdsByPost[pid] || []).includes(mid));
            if (postIdForMedia) {
              tagsCountByPost[postIdForMedia] = (tagsCountByPost[postIdForMedia] || 0) + 1;
            }
          });
        }
      }
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
            user: name || 'Usuario',
            content: post.content,
            image: hasMedia || undefined,
            videoUrl: isVideo ? mediaData?.file_url : undefined,
            isVideo: isVideo || false,
            mediaUser: {
              name: `${(post.profiles as any)?.first_name || ''} ${(post.profiles as any)?.last_name || ''}`.trim() || 'Usuario',
              avatar: (post.profiles as any)?.avatar_url || ''
            },
            time: getTimeAgo(new Date(post.created_at)),
            commentsCount: commentsCountByPost[post.id] || 0,
            taggedPhotosCount: tagsCountByPost[post.id] || 0
          };
        })
      );
      console.debug('[Feed] Posts loaded:', { filterType, count: postsWithImages.length });
      setPosts(postsWithImages);
    } catch (error) {
      console.error('[Feed] Unexpected error loading posts:', error);
    } finally {
      setPostsLoading(false);
    }
  };

  const loadLastStatus = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('id, content, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);
      if (!error && data && data.length > 0) {
        setLastStatusText(data[0].content || '');
        setLastStatusTime(getTimeAgo(new Date(data[0].created_at)));
        console.debug('[Status] Last status loaded:', { text: data[0].content, time: data[0].created_at });
      }
    } catch (_) {}
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
      loadLastStatus(user.id);
    }
  }, [user, loading, feedFilter, navigate]);

  // Escuchar eventos globales para refrescar el feed tras subir fotos
  useEffect(() => {
    const handler = () => {
      if (user?.id) {
        setPostsLoading(true);
        loadRealPosts(user.id, feedFilter);
      }
    };
    document.addEventListener('posts:refresh', handler);
    return () => {
      document.removeEventListener('posts:refresh', handler);
    };
  }, [user?.id, feedFilter]);

  // Suscripción en tiempo real: refresca el feed de amigos cuando publiquen
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`friends_posts_feed_${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, (payload) => {
        try {
          const newUserId = (payload.new as any)?.user_id;
          console.debug('[Realtime] New post inserted:', { newUserId, feedFilter, friendIds });
          if (feedFilter === 'friends') {
            // Refresca si el nuevo post es de tus amigos
            if (friendIds.includes(newUserId)) {
              setPostsLoading(true);
              loadRealPosts(user.id, 'friends');
            }
          } else if (feedFilter === 'all') {
            setPostsLoading(true);
            loadRealPosts(user.id, 'all');
          }
        } catch {}
      });
    channel.subscribe((status: any, err: any) => {
      console.debug('[Realtime] Channel status:', status, err ? { err } : {});
    });
    return () => {
      channel.unsubscribe();
    };
  }, [user?.id, friendIds, feedFilter]);

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
      loadLastStatus(user.id);
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
      console.debug('[Status] Inserted post from current user, error?', error);
      if (!error) reloadPosts();
    } catch (error) {}
  };

  const openCommentsModalForPost = async (postId: string) => {
    const { data, error } = await supabase
      .from('post_comments')
      .select('id, content, created_at, user_id, profiles!post_comments_user_id_fkey(first_name, last_name)')
      .eq('post_id', postId)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) return;
    const items = (data || []).map((c: any) => ({
      id: c.id,
      title: `${(c.profiles?.first_name || '')} ${(c.profiles?.last_name || '')}`.trim() || 'Usuario',
      description: c.content,
      timestamp: getTimeAgo(new Date(c.created_at)),
    }));
    setModalTitle('Comentarios del estado');
    setModalItems(items);
    setModalOpen(true);
  };

  const openTagsModalForPost = async (postId: string) => {
    const { data: mediaRows } = await supabase
      .from('media_uploads')
      .select('id')
      .eq('post_id', postId);
    const mediaIds = (mediaRows || []).map((m: any) => m.id);
    if (mediaIds.length === 0) {
      setModalTitle('Etiquetas');
      setModalItems([]);
      setModalOpen(true);
      return;
    }
    const { data, error } = await supabase
      .from('photo_tags')
      .select('id, created_at, tagged_user_id, profiles!photo_tags_tagged_user_id_fkey(first_name, last_name)')
      .in('media_upload_id', mediaIds)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) return;
    const items = (data || []).map((t: any) => ({
      id: t.id,
      title: `Etiqueta: ${(t.profiles?.first_name || '')} ${(t.profiles?.last_name || '')}`.trim() || 'Usuario',
      description: 'Foto etiquetada en tu estado',
      timestamp: getTimeAgo(new Date(t.created_at)),
    }));
    setModalTitle('Fotos etiquetadas');
    setModalItems(items);
    setModalOpen(true);
  };

  const openNotification = (type: 'comments' | 'tags', postId?: string) => {
    if (type === 'comments') {
      if (postId) return openCommentsModalForPost(postId);
      return openAllCommentsModal();
    }
    if (type === 'tags') {
      if (postId) return openTagsModalForPost(postId);
      return openAllTagsModal();
    }
  };

  const openAllCommentsModal = async () => {
    if (!user?.id) return;
    const { data: postRows } = await supabase
      .from('posts')
      .select('id')
      .eq('user_id', user.id);
    const postIds = (postRows || []).map((p: any) => p.id);
    if (postIds.length === 0) {
      setModalTitle('Comentarios');
      setModalItems([]);
      setModalOpen(true);
      return;
    }
    const { data, error } = await supabase
      .from('post_comments')
      .select('id, content, created_at, user_id, post_id, profiles!post_comments_user_id_fkey(first_name, last_name)')
      .in('post_id', postIds)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) return;
    const items = (data || []).map((c: any) => ({
      id: c.id,
      title: `${(c.profiles?.first_name || '')} ${(c.profiles?.last_name || '')}`.trim() || 'Usuario',
      description: c.content,
      timestamp: getTimeAgo(new Date(c.created_at)),
    }));
    setModalTitle('Comentarios en tus estados');
    setModalItems(items);
    setModalOpen(true);
  };

  const openAllTagsModal = async () => {
    if (!user?.id) return;
    const { data: postRows } = await supabase
      .from('posts')
      .select('id')
      .eq('user_id', user.id);
    const postIds = (postRows || []).map((p: any) => p.id);
    const { data: mediaRows } = await supabase
      .from('media_uploads')
      .select('id')
      .in('post_id', postIds);
    const mediaIds = (mediaRows || []).map((m: any) => m.id);
    if (mediaIds.length === 0) {
      setModalTitle('Etiquetas');
      setModalItems([]);
      setModalOpen(true);
      return;
    }
    const { data, error } = await supabase
      .from('photo_tags')
      .select('id, created_at, tagged_user_id, profiles!photo_tags_tagged_user_id_fkey(first_name, last_name)')
      .in('media_upload_id', mediaIds)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) return;
    const items = (data || []).map((t: any) => ({
      id: t.id,
      title: `Etiqueta: ${(t.profiles?.first_name || '')} ${(t.profiles?.last_name || '')}`.trim() || 'Usuario',
      description: 'Foto etiquetada en tus estados',
      timestamp: getTimeAgo(new Date(t.created_at)),
    }));
    setModalTitle('Etiquetas en tus fotos');
    setModalItems(items);
    setModalOpen(true);
  };

  return (
    <IonPage>
      <Header />
      <IonContent className="dashboard-container">
        <div className="dashboard-content">
          <div className="tuenti-layout">
            {/* Columna izquierda */}
            <div className="tuenti-left-sidebar">
              <LeftSidebar onOpenNotification={openNotification} />
            </div>

            {/* Columna central */}
            <div className="tuenti-main-content">
              <MainContent posts={posts} onStatusSave={handleStatusUpdate} lastStatusText={lastStatusText} lastStatusTime={lastStatusTime} onOpenNotification={openNotification} />
            </div>

            {/* Columna derecha */}
            <div className="tuenti-right-sidebar">
              <RightSidebar />
            </div>
          </div>
        </div>
      {/* Modal de notificaciones */}
      <NotificationModal open={modalOpen} title={modalTitle} items={modalItems} onClose={() => setModalOpen(false)} />
      {/* Footer eliminado */}
      </IonContent>
    </IonPage>
  );
};

export default Dashboard;

