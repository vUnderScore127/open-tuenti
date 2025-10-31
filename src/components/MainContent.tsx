import { useState } from 'react';
import { supabase } from '../lib/supabase';
import '../styles/tuenti-main-content.css';

type FeedPost = {
  id: any;
  user: string;
  content: any;
  image?: any;
  videoUrl?: any;
  isVideo: boolean;
  mediaUser: { name: string; avatar: any };
  time: string;
  commentsCount?: number;
  taggedPhotosCount?: number;
};

export default function MainContent({ posts, onStatusSave, lastStatusText = '', lastStatusTime = '', onOpenNotification }: { posts: FeedPost[]; onStatusSave?: (text: string) => void | Promise<void>; lastStatusText?: string; lastStatusTime?: string; onOpenNotification?: (type: 'comments' | 'tags', postId?: string) => void }) {
  const [statusText, setStatusText] = useState('');
  const [saving, setSaving] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [commentBoxOpen, setCommentBoxOpen] = useState<Record<string, boolean>>({});
  const [commentsOpen, setCommentsOpen] = useState<Record<string, boolean>>({});
  const [commentsByPost, setCommentsByPost] = useState<Record<string, { id: string; content: string; created_at: string; user_id: string; profile?: { first_name?: string; last_name?: string } }[]>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const maxLength = 320;
  const remainingChars = maxLength - statusText.length;
  const isNearLimit = remainingChars <= 20;

  const handleTextareaInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    target.style.height = 'auto';
    target.style.height = target.scrollHeight + 'px';
  };

  const toggleCommentBox = (postId: string) => {
    setCommentBoxOpen((prev) => ({ ...prev, [postId]: !prev[postId] }));
    // Reset draft when closing
    if (commentBoxOpen[postId]) {
      setCommentDrafts((prev) => ({ ...prev, [postId]: '' }));
    }
  };

  const submitComment = async (postId: string) => {
    const text = (commentDrafts[postId] || '').trim();
    if (!text) return;
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) return;
    const userId = userData.user.id;
    const { error } = await supabase
      .from('post_comments')
      .insert([{ post_id: postId, user_id: userId, content: text }]);
    if (!error) {
      // Clear and close box
      setCommentDrafts((prev) => ({ ...prev, [postId]: '' }));
      setCommentBoxOpen((prev) => ({ ...prev, [postId]: false }));
      // If comments are open, optimistically add the comment
      if (commentsOpen[postId]) {
        setCommentsByPost((prev) => ({
          ...prev,
          [postId]: [
            { id: crypto.randomUUID(), content: text, created_at: new Date().toISOString(), user_id: userId },
            ...(prev[postId] || []),
          ],
        }));
      }
      // Abrir modal de comentarios para llevar al usuario a su comentario
      onOpenNotification?.('comments', postId);
    }
  };

  const toggleComments = async (postId: string) => {
    const willOpen = !commentsOpen[postId];
    setCommentsOpen((prev) => ({ ...prev, [postId]: willOpen }));
    if (willOpen && !commentsByPost[postId]) {
      const { data, error } = await supabase
        .from('post_comments')
        .select('id, content, created_at, user_id, profiles:first_name, profiles:last_name')
        .eq('post_id', postId)
        .order('created_at', { ascending: false })
        .limit(20);
      if (!error) {
        setCommentsByPost((prev) => ({ ...prev, [postId]: (data as any) || [] }));
      }
    }
  };

  return (
    <main className="tuenti-main-content">
      {/* Status Update Section */}
      <div className="tuenti-status-container">
        <div className="tuenti-status-input-container">
          <div className="tuenti-status-icon"></div>
          <textarea
            value={statusText}
            onChange={(e) => setStatusText(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onInput={handleTextareaInput}
            placeholder="Actualiza tu estado"
            className="tuenti-status-textarea"
            maxLength={maxLength}
            rows={1}
          />
        </div>
        {isFocused && (
          <div className={`tuenti-char-counter ${isNearLimit ? 'near-limit' : ''}`}>{remainingChars}</div>
        )}
      </div>

      {/* Status Actions placed OUTSIDE the status box */}
      <div className="tuenti-status-actions">
        <div className="tuenti-last-update">
          <span className="tuenti-last-update-label">Última actualización:</span>
          <span className="tuenti-last-update-text">{lastStatusText || '—'}</span>
          {lastStatusTime && <span className="tuenti-last-update-time">{lastStatusTime}</span>}
        </div>
        <button
          className="tuenti-save-button"
          disabled={saving || !statusText.trim()}
          onClick={async () => {
            if (!onStatusSave || !statusText.trim()) return;
            setSaving(true);
            try {
              await onStatusSave(statusText.trim());
              setStatusText('');
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>

      {/* News Feed Section */}
      <div className="tuenti-news-feed">
        <h2 className="tuenti-news-title">Novedades de tus amigos</h2>
        <div className="tuenti-posts-container">
          {posts.length === 0 && (
            <div className="tuenti-empty">Aún no hay novedades de tus amigos.</div>
          )}
          {posts.map((p) => (
            <div key={p.id} className="tuenti-post">
              <div className="tuenti-post-header">
                <div className="tuenti-post-avatar">
                  {p.mediaUser?.avatar ? (
                    <img src={p.mediaUser.avatar} alt={p.mediaUser.name} className="tuenti-post-avatar-img" />
                  ) : (
                    <div className="tuenti-post-avatar-placeholder">👤</div>
                  )}
                </div>
                <div className="tuenti-post-content">
                  <div className="tuenti-post-meta">
                    <span className="tuenti-post-author">{p.mediaUser?.name || p.user}</span>
                    {p.content && <span className="tuenti-post-action">{p.content}</span>}
                  </div>
                  <p className="tuenti-post-time">{p.time}</p>
                  {p.image && (
                    <div className="tuenti-post-image">
                      <img src={p.image} alt="imagen" className="tuenti-post-image-img" />
                    </div>
                  )}
                  {p.videoUrl && (
                    <div className="tuenti-post-image">
                      <video src={p.videoUrl} controls className="tuenti-post-image-img" />
                    </div>
                  )}
                  {/* Filas verdes de actividad bajo el post: comentarios y fotos etiquetadas */}
                  {(p.commentsCount || p.taggedPhotosCount) && (
                    <ul className="tuenti-notifications tuenti-post-activity">
                      {p.commentsCount ? (
                        <li>
                          <span className="tuenti-notification-icon">
                            <img src={`${import.meta.env.BASE_URL}comment.svg`} alt="Comentarios" />
                          </span>
                          <button onClick={() => onOpenNotification?.('comments', p.id)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}>
                            {p.commentsCount} comentarios
                          </button>
                        </li>
                      ) : null}
                      {p.taggedPhotosCount ? (
                        <li>
                          <span className="tuenti-notification-icon">
                            <img src={`${import.meta.env.BASE_URL}tag.svg`} alt="Etiquetas" />
                          </span>
                          <button onClick={() => onOpenNotification?.('tags', p.id)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}>
                            {p.taggedPhotosCount} fotos etiquetadas
                          </button>
                        </li>
                      ) : null}
                    </ul>
                  )}
                  <div className="tuenti-post-actions">
                    <button className="tuenti-post-action-button" onClick={() => toggleCommentBox(p.id)}>
                      <img src={`${import.meta.env.BASE_URL}comment.svg`} alt="Comentar" className="tuenti-post-action-icon" />
                      Comentar
                    </button>
                    <button className="tuenti-post-action-button" onClick={() => toggleComments(p.id)}>
                      <img src={`${import.meta.env.BASE_URL}comment.svg`} alt="Ver comentarios" className="tuenti-post-action-icon" />
                      {commentsOpen[p.id] ? 'Ocultar comentarios' : 'Ver comentarios'}
                    </button>
                  </div>
                  {commentBoxOpen[p.id] && (
                    <div style={{ marginTop: 8 }}>
                      <textarea
                        value={commentDrafts[p.id] || ''}
                        onChange={(e) => setCommentDrafts((prev) => ({ ...prev, [p.id]: e.target.value }))}
                        placeholder="Escribe un comentario…"
                        rows={2}
                        style={{ width: '100%', fontSize: 12, padding: 8, border: '1px solid #ddd', borderRadius: 3 }}
                      />
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <button className="tuenti-post-action-button" onClick={() => submitComment(p.id)}>
                          Enviar
                        </button>
                        <button className="tuenti-post-action-button" onClick={() => toggleCommentBox(p.id)}>
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                  {commentsOpen[p.id] && (
                    <div style={{ marginTop: 8 }}>
                      {(commentsByPost[p.id] || []).length === 0 ? (
                        <div style={{ fontSize: 12, color: '#666' }}>No hay comentarios aún.</div>
                      ) : (
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {(commentsByPost[p.id] || []).map((c) => (
                            <li key={c.id} style={{ fontSize: 12, color: '#333', background: '#f7f7f7', border: '1px solid #eee', borderRadius: 3, padding: '6px 8px' }}>
                              <span style={{ fontWeight: 600 }}>
                                {c.profile?.first_name || ''} {c.profile?.last_name || ''}
                              </span>
                              {c.profile?.first_name || c.profile?.last_name ? ': ' : ''}
                              {c.content}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}