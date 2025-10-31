import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Header from '../components/Header';
import { supabase } from '@/lib/supabase';

type ProfileInfo = { first_name?: string; last_name?: string; avatar_url?: string };

type MediaRow = {
  id: string;
  post_id: string;
  file_url?: string | null;
  thumbnail_url?: string | null;
  file_type?: string | null;
};

type PostRow = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: ProfileInfo;
};

type CommentRow = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profile?: { first_name?: string; last_name?: string };
};

const Photo: React.FC = () => {
  const { mediaId } = useParams<{ mediaId: string }>();
  const [media, setMedia] = useState<MediaRow | null>(null);
  const [post, setPost] = useState<PostRow | null>(null);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data: mediaData } = await supabase
          .from('media_uploads')
          .select('id, post_id, file_url, thumbnail_url, file_type')
          .eq('id', mediaId)
          .single();
        setMedia(mediaData as any);

        const postId = (mediaData as any)?.post_id;
        if (postId) {
          const { data: postData } = await supabase
            .from('posts')
            .select('id, user_id, content, created_at, profiles:first_name, profiles:last_name, profiles:avatar_url')
            .eq('id', postId)
            .single();
          setPost(postData as any);

          const { data: commentRows } = await supabase
            .from('post_comments')
            .select('id, content, created_at, user_id, profiles:first_name, profiles:last_name')
            .eq('post_id', postId)
            .order('created_at', { ascending: false });
          setComments((commentRows as any) || []);
        }
      } finally {
        setLoading(false);
      }
    };
    if (mediaId) load();
  }, [mediaId]);

  const renderMedia = () => {
    if (!media) return null;
    const isVideo = (media.file_type || '').startsWith('video/');
    if (isVideo) {
      return (
        <video controls style={{ width: '100%', borderRadius: 6, background: '#000' }}>
          <source src={media.file_url || ''} type={media.file_type || 'video/mp4'} />
          Tu navegador no soporta video HTML5.
        </video>
      );
    }
    const src = media.file_url || media.thumbnail_url || '';
    return (
      <img src={src} alt="foto" style={{ width: '100%', borderRadius: 6, border: '1px solid #eee' }} />
    );
  };

  return (
    <div>
      <Header />
      <main style={{ maxWidth: 720, margin: '24px auto', padding: '0 16px' }}>
        {loading ? (
          <div style={{ fontSize: 14, color: '#666' }}>Cargando…</div>
        ) : !media || !post ? (
          <div style={{ fontSize: 14, color: '#666' }}>Foto no encontrada.</div>
        ) : (
          <div className="tuenti-post">
            <div className="tuenti-post-header">
              <div className="tuenti-post-avatar">
                {post.profiles?.avatar_url ? (
                  <img src={post.profiles.avatar_url} alt="avatar" className="tuenti-post-avatar-img" />
                ) : (
                  <div className="tuenti-post-avatar-placeholder">👤</div>
                )}
              </div>
              <div className="tuenti-post-content" style={{ width: '100%' }}>
                <div className="tuenti-post-meta">
                  <span className="tuenti-post-author">{`${post.profiles?.first_name || ''} ${post.profiles?.last_name || ''}`.trim() || 'Usuario'}</span>
                </div>
                <p className="tuenti-post-time">{new Date(post.created_at).toLocaleString()}</p>

                {renderMedia()}

                {post.content && (
                  <div style={{ background: '#f7f7f7', border: '1px solid #eee', borderRadius: 4, padding: 12, marginTop: 8 }}>
                    {post.content}
                  </div>
                )}

                {/* Comentarios del estado */}
                <div style={{ marginTop: 16 }}>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: 14 }}>Comentarios</h3>
                  {(comments || []).length === 0 ? (
                    <div style={{ fontSize: 12, color: '#666' }}>No hay comentarios aún.</div>
                  ) : (
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {comments.map((c) => (
                        <li key={c.id} style={{ fontSize: 12, color: '#333', background: '#f7f7f7', border: '1px solid #eee', borderRadius: 3, padding: '6px 8px' }}>
                          <span style={{ fontWeight: 600 }}>
                            {c.profile?.first_name || ''} {c.profile?.last_name || ''}
                          </span>
                          {(c.profile?.first_name || c.profile?.last_name) ? ': ' : ''}
                          {c.content}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Photo;