import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Header from '../components/Header';
import { supabase, createStatusCommentNotification } from '@/lib/supabase';

type ProfileInfo = { first_name?: string; last_name?: string; avatar_url?: string };

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

const Status: React.FC = () => {
  const { postId } = useParams<{ postId: string }>();
  const [post, setPost] = useState<PostRow | null>(null);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // 1) Cargar el post sin join complejo
        const { data: postRow, error: postErr } = await supabase
          .from('posts')
          .select('id, user_id, content, created_at')
          .eq('id', postId)
          .maybeSingle();
        if (postErr) {
          console.warn('⚠️ Status: error loading post', postErr);
        }

        let postWithProfile: PostRow | null = (postRow as any) || null;
        // 2) Cargar perfil del autor para mostrar nombre y avatar
        if (postRow?.user_id) {
          const { data: prof, error: profErr } = await supabase
            .from('profiles')
            .select('first_name, last_name, avatar_url')
            .eq('id', postRow.user_id)
            .maybeSingle();
          if (profErr) {
            console.warn('⚠️ Status: error loading post author profile', profErr);
          }
          postWithProfile = { ...(postRow as any), profiles: (prof as any) };
        }
        setPost(postWithProfile);

        // 3) Cargar comentarios y mapear perfiles de autores de comentario
        const { data: commentRows, error: commentsErr } = await supabase
          .from('post_comments')
          .select('id, content, created_at, user_id')
          .eq('post_id', postId)
          .order('created_at', { ascending: false });
        if (commentsErr) {
          console.warn('⚠️ Status: error loading comments', commentsErr);
        }
        const rows = (commentRows as any) || [];
        const userIds = Array.from(new Set(rows.map((r: any) => r.user_id).filter(Boolean)));
        let profileMap: Record<string, { first_name?: string; last_name?: string }> = {};
        if (userIds.length > 0) {
          const { data: profs, error: profsErr } = await supabase
            .from('profiles')
            .select('id, first_name, last_name')
            .in('id', userIds);
          if (profsErr) {
            console.warn('⚠️ Status: error loading comment authors profiles', profsErr);
          }
          (profs as any || []).forEach((p: any) => { profileMap[p.id] = { first_name: p.first_name, last_name: p.last_name }; });
        }
        const merged = rows.map((r: any) => ({ ...r, profile: profileMap[r.user_id] }));
        setComments(merged);
      } finally {
        setLoading(false);
      }
    };
    if (postId) load();
  }, [postId]);

  const submitComment = async () => {
    const text = newComment.trim();
    if (!text) return;
    setSubmitting(true);
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData?.user) return;
      const userId = userData.user.id;
      const { data, error } = await supabase
        .from('post_comments')
        .insert([{ post_id: postId, user_id: userId, content: text }])
        .select()
        .single();
      if (!error && data) {
        setComments(prev => [data as any, ...prev]);
        setNewComment('');
        // Crear notificación para el autor del estado si el comentarista es distinto
        try {
          const toUserId = (post as any)?.user_id;
          const commentId = (data as any)?.id;
          if (toUserId && toUserId !== userId && commentId) {
            await createStatusCommentNotification(userId, toUserId, String(postId), String(commentId), text);
          }
        } catch (e) {
          console.warn('⚠️ Status: error creando notificación de comentario:', e);
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <Header />
      <main style={{ maxWidth: 720, margin: '24px auto', padding: '0 16px' }}>
        {loading ? (
          <div style={{ fontSize: 14, color: '#666' }}>Cargando…</div>
        ) : !post ? (
          <div style={{ fontSize: 14, color: '#666' }}>Estado no encontrado.</div>
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
              <div className="tuenti-post-content">
                <div className="tuenti-post-meta">
                  <span className="tuenti-post-author">{`${post.profiles?.first_name || ''} ${post.profiles?.last_name || ''}`.trim() || post.user_id}</span>
                </div>
                <p className="tuenti-post-time">{new Date(post.created_at).toLocaleString()}</p>
                {post.content && (
                  <div style={{ background: '#f7f7f7', border: '1px solid #eee', borderRadius: 4, padding: 12, marginTop: 8 }}>
                    {post.content}
                  </div>
                )}

                {/* Comentarios */}
                <div style={{ marginTop: 16 }}>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: 14 }}>Comentarios</h3>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Escribe un comentario…"
                      rows={2}
                      style={{ flex: 1, fontSize: 12, padding: 8, border: '1px solid #ddd', borderRadius: 3 }}
                    />
                    <button className="tuenti-post-action-button" disabled={submitting || !newComment.trim()} onClick={submitComment}>
                      {submitting ? 'Enviando…' : 'Enviar'}
                    </button>
                  </div>
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

export default Status;