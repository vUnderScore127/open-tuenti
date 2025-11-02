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
  authorId?: string;
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
      let friendFetchOk = true;
      if (filterType === 'friends') {
        const { data: friendships, error: fsErr } = await supabase
          .from('friendships')
          .select('user_id, friend_id, status')
          .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
          .eq('status', 'accepted');
        friendFetchOk = !fsErr;
        if (!fsErr && friendships) {
          computedFriendIds = friendships.map((f: any) => (f.user_id === userId ? f.friend_id : f.user_id));
        }
        console.debug('[Feed] Friendships fetched:', { userId, count: (friendships||[]).length, computedFriendIds, error: fsErr?.message });
      }
      // Mantener IDs de amigos para Realtime; no limpiar si la carga falló
      if (friendFetchOk) {
        setFriendIds(computedFriendIds.length > 0 ? computedFriendIds : []);
      }

      // Si el filtro es "friends":
      // - si la petición de amistades falló, no vaciar el feed; mantener el estado actual.
      // - si fue correcta y no hay amigos, vaciar el feed.
      if (filterType === 'friends') {
        if (!friendFetchOk) {
          console.warn('[Feed] Friendships fetch failed. Keeping current posts to avoid empty feed.');
          setPostsLoading(false);
          return;
        }
        if (computedFriendIds.length === 0) {
          console.debug('[Feed] No accepted friends. Empty feed for friends filter');
          setPosts([]);
          setPostsLoading(false);
          return;
        }
      }

      // 1) Posts básicos sin joins implícitos
      let postsQuery = supabase
        .from('posts')
        .select('id, content, created_at, user_id')
        .order('created_at', { ascending: false })
        .limit(10);
      if (filterType === 'friends' && computedFriendIds.length > 0) {
        postsQuery = postsQuery.in('user_id', computedFriendIds);
      }
      const { data: postsData, error: postsError } = await postsQuery;
      if (postsError) {
        console.error('[Feed] Error fetching posts:', postsError);
        return;
      }
      const rows = (postsData || []) as any[];
      const postIds = rows.map(r => r.id);
      const authorIds = Array.from(new Set(rows.map(r => r.user_id).filter(Boolean)));

      // 2) Perfiles de autores en una sola consulta
      let profileMap: Record<string, { first_name?: string; last_name?: string; avatar_url?: string; email?: string }> = {};
      if (authorIds.length > 0) {
        const { data: profilesData, error: profErr } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, avatar_url, email')
          .in('id', authorIds);
        if (!profErr) {
          (profilesData as any || []).forEach((p: any) => {
            profileMap[p.id] = { first_name: p.first_name, last_name: p.last_name, avatar_url: p.avatar_url, email: p.email };
          });
        } else {
          console.warn('[Feed] Profiles fetch error', profErr);
        }
      }

      // 3) Media por post en una sola consulta
      let mediaByPost: Record<string, { thumbnail_url?: string | null; file_url?: string | null; file_type?: string | null } | null> = {};
      let mediaRowsAll: any[] = [];
      if (postIds.length > 0) {
        const { data: mediaRows, error: mediaErr } = await supabase
          .from('media_uploads')
          .select('id, post_id, thumbnail_url, file_url, file_type')
          .in('post_id', postIds);
        if (!mediaErr) {
          mediaRowsAll = mediaRows as any[];
          // Elegir el primer media por post
          const firstByPost: Record<string, boolean> = {};
          (mediaRows as any || []).forEach((m: any) => {
            if (!firstByPost[m.post_id]) {
              mediaByPost[m.post_id] = { thumbnail_url: m.thumbnail_url, file_url: m.file_url, file_type: m.file_type };
              firstByPost[m.post_id] = true;
            }
          });
        } else {
          console.warn('[Feed] Media fetch error', mediaErr);
        }
      }

      // 4) Conteo de comentarios por post
      let commentsCountByPost: Record<string, number> = {};
      if (postIds.length > 0) {
        const { data: commentsRows, error: commentsErr } = await supabase
          .from('post_comments')
          .select('post_id')
          .in('post_id', postIds);
        if (!commentsErr) {
          (commentsRows as any || []).forEach((r: any) => {
            const pid = r.post_id;
            commentsCountByPost[pid] = (commentsCountByPost[pid] || 0) + 1;
          });
        } else {
          console.warn('[Feed] Comments count error', commentsErr);
        }
      }

      // 5) Conteo de etiquetas por post usando media_ids
      let tagsCountByPost: Record<string, number> = {};
      const mediaIds = mediaRowsAll.map(m => m.id);
      if (mediaIds.length > 0) {
        const { data: tagRows, error: tagsErr } = await supabase
          .from('photo_tags')
          .select('id, media_upload_id')
          .in('media_upload_id', mediaIds);
        if (!tagsErr) {
          (tagRows as any || []).forEach((t: any) => {
            const mid = t.media_upload_id;
            const postIdForMedia = mediaRowsAll.find((mr: any) => mr.id === mid)?.post_id;
            if (postIdForMedia) {
              tagsCountByPost[postIdForMedia] = (tagsCountByPost[postIdForMedia] || 0) + 1;
            }
          });
        } else {
          console.warn('[Feed] Photo tags count error', tagsErr);
        }
      }

      // 6) Construcción final
      const postsWithData = rows.map((post) => {
        const prof = profileMap[post.user_id] || {};
        const fullName = `${prof.first_name || ''} ${prof.last_name || ''}`.trim();
        const displayName = fullName || (prof.email ? String(prof.email).split('@')[0] : post.user_id);
        const media = mediaByPost[post.id] || null;
        const isVideo = !!(media?.file_type && String(media.file_type).startsWith('video/'));
        return {
          id: post.id,
          user: displayName,
          content: post.content,
          image: media?.thumbnail_url || undefined,
          videoUrl: isVideo ? media?.file_url || undefined : undefined,
          isVideo: isVideo,
          mediaUser: {
            name: displayName,
            avatar: prof.avatar_url || ''
          },
          time: getTimeAgo(new Date(post.created_at)),
          commentsCount: commentsCountByPost[post.id] || 0,
          taggedPhotosCount: tagsCountByPost[post.id] || 0,
          authorId: post.user_id
        };
      });
      console.debug('[Feed] Posts loaded:', { filterType, count: postsWithData.length });
      setPosts(postsWithData);
    } catch (error) {
      console.error('[Feed] Unexpected error loading posts:', error);
    } finally {
      setPostsLoading(false);
    }
  };

  const loadLastStatus = async (userId: string) => {
    try {
      console.log('[Status] loadLastStatus start', { userId });
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
    } catch (e) {
      console.error('[Status] loadLastStatus error', e);
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
      // Cargar siempre al montar/cambiar filtros para asegurar último estado visible
      setPostsLoading(true);
      loadRealPosts(user.id, feedFilter);
      loadLastStatus(user.id);
    }
  }, [user, loading, feedFilter]);

  // Escuchar eventos globales para refrescar el feed tras subir fotos
  useEffect(() => {
    const handler = () => {
      if (user?.id) {
        // No disparar si ya estamos cargando
        if (postsLoading) return;
        setPostsLoading(true);
        loadRealPosts(user.id, feedFilter);
      }
    };
    document.addEventListener('posts:refresh', handler);
    return () => {
      document.removeEventListener('posts:refresh', handler);
    };
  }, [user?.id, feedFilter, postsLoading]);

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
              if (!postsLoading) {
                setPostsLoading(true);
                loadRealPosts(user.id, 'friends');
              }
            }
          } else if (feedFilter === 'all') {
            if (!postsLoading) {
              setPostsLoading(true);
              loadRealPosts(user.id, 'all');
            }
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

  // Eliminamos el overlay de carga para permitir que la UI se muestre
  // mientras las peticiones se realizan en background.

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
    if (!user?.id) return;
    try {
      console.log('[Dashboard] handleStatusUpdate start', { userId: user.id, len: statusText.length, preview: statusText.slice(0, 80) });
      const start = Date.now();
      // Usar array y select+single para forzar retorno inmediato del row insertado
      const insertPromise = supabase
        .from('posts')
        .insert([{ content: statusText, user_id: user.id }])
        .select('id, content, created_at')
        .single();

      const { data, error }: any = await insertPromise;
      const tookMs = Date.now() - start;
      console.debug('[Status] Inserted post from current user', { tookMs, data: data ? { id: data.id, created_at: data.created_at } : null, error: error ? { code: error.code, message: error.message, details: error.details, hint: error.hint } : null });
      if (!error) {
        // Actualiza inmediatamente el último estado para reflejarlo en la UI sin esperar a la carga
        setLastStatusText(data?.content || statusText);
        setLastStatusTime('ahora mismo');
        reloadPosts();
      } else {
        throw error;
      }
    } catch (err) {
      const e: any = err;
      console.error('[Dashboard] handleStatusUpdate error', { code: e?.code, message: e?.message, details: e?.details, hint: e?.hint, stack: e?.stack });
      throw err;
    }
  };

  const openCommentsModalForPost = async (postId: string) => {
    const { data: commentsData, error } = await supabase
      .from('post_comments')
      .select('id, content, created_at, user_id')
      .eq('post_id', postId)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) return;
    const userIds = Array.from(new Set(((commentsData || []) as any).map((c: any) => c.user_id).filter(Boolean)));
    let profileMap: Record<string, { first_name?: string; last_name?: string }> = {};
    if (userIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', userIds);
      (profilesData as any || []).forEach((p: any) => {
        profileMap[p.id] = { first_name: p.first_name, last_name: p.last_name };
      });
    }
    const items = ((commentsData || []) as any).map((c: any) => ({
      id: c.id,
      title: `${(profileMap[c.user_id]?.first_name || '')} ${(profileMap[c.user_id]?.last_name || '')}`.trim() || c.user_id,
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
      title: `Etiqueta: ${(t.profiles?.first_name || '')} ${(t.profiles?.last_name || '')}`.trim() || t.tagged_user_id,
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
    // Traer notificaciones no leídas de comentarios de estado y agrupar por estado
    const { data: notifRows, error } = await supabase
      .from('notifications')
      .select('id, related_id, created_at')
      .eq('user_id', user.id)
      .eq('type', 'status_comment')
      .eq('is_read', false)
      .order('created_at', { ascending: false });
    if (error) return;
    const byPost: Record<string, { latestAt: string; count: number }> = {};
    (notifRows || []).forEach((n: any) => {
      const pid = n.related_id;
      if (!pid) return;
      const current = byPost[pid];
      if (!current) byPost[pid] = { latestAt: n.created_at, count: 1 };
      else byPost[pid] = { latestAt: (new Date(n.created_at) > new Date(current.latestAt) ? n.created_at : current.latestAt), count: current.count + 1 };
    });
    const items = Object.entries(byPost).map(([postId, v]) => ({
      id: postId,
      title: `Comentarios en tu estado (${v.count})`,
      description: 'Haz clic para ver el estado',
      timestamp: getTimeAgo(new Date(v.latestAt)),
    }));
    setModalTitle('Estados con comentarios');
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
      title: `Etiqueta: ${(t.profiles?.first_name || '')} ${(t.profiles?.last_name || '')}`.trim() || t.tagged_user_id,
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
      <MainContent posts={posts} onStatusSave={handleStatusUpdate} lastStatusText={lastStatusText} lastStatusTime={lastStatusTime} />
            </div>

            {/* Columna derecha */}
            <div className="tuenti-right-sidebar">
              <RightSidebar />
            </div>
          </div>
        </div>
      {/* Modal de notificaciones */}
      <NotificationModal
        open={modalOpen}
        title={modalTitle}
        items={modalItems}
        onClose={() => setModalOpen(false)}
        onItemClick={async (postId: string) => {
          try {
            if (user?.id) {
              await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', user.id)
                .eq('type', 'status_comment')
                .eq('related_id', postId)
                .eq('is_read', false);
            }
          } catch (_) {}
          setModalOpen(false);
          navigate.push(`/status/${postId}`);
        }}
      />
      {/* Footer eliminado */}
      </IonContent>
    </IonPage>
  );
};

export default Dashboard;

