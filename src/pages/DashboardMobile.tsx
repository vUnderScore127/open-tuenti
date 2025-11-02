import React, { useState, useEffect } from 'react';
import { 
  IonPage, 
  IonContent, 
  IonHeader, 
  IonToolbar, 
  IonTitle, 
  IonButton, 
  IonIcon,
  IonFab,
  IonFabButton,
  IonAvatar,
  IonChip,
  IonLabel,
  IonRefresher,
  IonRefresherContent
} from '@ionic/react';
import { 
  addOutline,
  notificationsOutline
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import BottomNavBar from '../components/BottomNavBar';
import '../styles/tuenti-dashboard-mobile.css';

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

const DashboardMobile: React.FC = () => {
  const history = useHistory();
  const { user, signOut } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [lastStatusText, setLastStatusText] = useState<string>('');
  const [feedFilter, setFeedFilter] = useState<'all' | 'friends'>('all');

  useEffect(() => {
    if (user?.id) {
      loadPosts();
      loadLastStatus();
    }
  }, [user, feedFilter]);

  const loadPosts = async () => {
    if (!user?.id) return;
    
    setPostsLoading(true);
    try {
      let query = supabase
        .from('posts')
        .select(`
          id,
          content,
          image_url,
          video_url,
          created_at,
          user_id,
          profiles!posts_user_id_fkey (
            first_name,
            last_name,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (feedFilter === 'friends') {
        const { data: friendships } = await supabase
          .from('friendships')
          .select('friend_id')
          .eq('user_id', user.id)
          .eq('status', 'accepted');
        
        const friendIds = friendships?.map(f => f.friend_id) || [];
        if (friendIds.length > 0) {
          query = query.in('user_id', [...friendIds, user.id]);
        } else {
          query = query.eq('user_id', user.id);
        }
      }

      const { data, error } = await query;
      
      if (error) throw error;

      const formattedPosts: Post[] = (data || []).map(post => ({
        id: post.id,
        user: post.user_id,
        content: post.content,
        image: post.image_url,
        videoUrl: post.video_url,
        isVideo: !!post.video_url,
        mediaUser: {
          name: `${post.profiles?.[0]?.first_name || ''} ${post.profiles?.[0]?.last_name || ''}`.trim() || 'Usuario',
          avatar: post.profiles?.[0]?.avatar_url
        },
        time: new Date(post.created_at).toLocaleString(),
        authorId: post.user_id
      }));

      setPosts(formattedPosts);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setPostsLoading(false);
    }
  };

  const loadLastStatus = async () => {
    if (!user?.id) return;
    
    try {
      const { data } = await supabase
        .from('posts')
        .select('content, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        setLastStatusText(data[0].content || '');
      }
    } catch (error) {
      console.error('Error loading last status:', error);
    }
  };

  const handleRefresh = async (event: CustomEvent) => {
    await loadPosts();
    event.detail.complete();
  };

  const handleLogout = async () => {
    await signOut();
    history.push('/login');
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>Tuenti</IonTitle>
          <IonButton 
            fill="clear" 
            slot="end"
            onClick={() => history.push('/notifications')}
          >
            <IonIcon icon={notificationsOutline} />
          </IonButton>
        </IonToolbar>
      </IonHeader>

      <IonContent className="has-bottom-nav">
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent></IonRefresherContent>
        </IonRefresher>

        {/* Filter Chips */}
        <div className="mobile-filter-container">
          <IonChip 
            color={feedFilter === 'all' ? 'primary' : 'medium'}
            onClick={() => setFeedFilter('all')}
          >
            <IonLabel>Todos</IonLabel>
          </IonChip>
          <IonChip 
            color={feedFilter === 'friends' ? 'primary' : 'medium'}
            onClick={() => setFeedFilter('friends')}
          >
            <IonLabel>Amigos</IonLabel>
          </IonChip>
        </div>

        {/* Status Update Section */}
        <div className="mobile-status-section">
          <div className="mobile-status-input">
            <IonAvatar className="mobile-user-avatar">
              {user?.user_metadata?.first_name?.charAt(0) || 'U'}
            </IonAvatar>
            <div 
              className="mobile-status-placeholder"
              onClick={() => history.push('/create-post')}
            >
              ¿Qué estás pensando?
            </div>
          </div>
        </div>

        {/* Posts Feed */}
        <div className="mobile-posts-container">
          {postsLoading ? (
            <div className="mobile-loading">
              <div className="mobile-loading-spinner"></div>
              <p>Cargando publicaciones...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="mobile-empty-feed">
              <p>No hay publicaciones para mostrar</p>
              <IonButton 
                fill="outline" 
                onClick={() => history.push('/people')}
              >
                Buscar amigos
              </IonButton>
            </div>
          ) : (
            posts.map((post) => (
              <div key={post.id} className="mobile-post">
                <div className="mobile-post-header">
                  <IonAvatar className="mobile-post-avatar">
                    {post.mediaUser.avatar ? (
                      <img src={post.mediaUser.avatar} alt={post.mediaUser.name} />
                    ) : (
                      post.mediaUser.name.charAt(0)
                    )}
                  </IonAvatar>
                  <div className="mobile-post-user-info">
                    <h3>{post.mediaUser.name}</h3>
                    <p>{post.time}</p>
                  </div>
                </div>
                
                <div className="mobile-post-content">
                  <p>{post.content}</p>
                  {post.image && (
                    <img src={post.image} alt="Post image" className="mobile-post-image" />
                  )}
                  {post.isVideo && post.videoUrl && (
                    <video controls className="mobile-post-video">
                      <source src={post.videoUrl} type="video/mp4" />
                    </video>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </IonContent>

      {/* Floating Action Button */}
      <IonFab vertical="bottom" horizontal="end" slot="fixed">
        <IonFabButton onClick={() => history.push('/create-post')}>
          <IonIcon icon={addOutline} />
        </IonFabButton>
      </IonFab>



      {/* Bottom Navigation Bar */}
      <BottomNavBar />
    </IonPage>
  );
};

export default DashboardMobile;