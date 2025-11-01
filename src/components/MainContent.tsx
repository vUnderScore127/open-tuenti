import { useEffect, useState } from 'react';
import { supabase, getUserProfile, createStatusCommentNotification } from '../lib/supabase';
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
  authorId?: string;
};

export default function MainContent({ posts, onStatusSave, lastStatusText = '', lastStatusTime = '' }: { posts: FeedPost[]; onStatusSave?: (text: string) => void | Promise<void>; lastStatusText?: string; lastStatusTime?: string }) {
  const [statusText, setStatusText] = useState('');
  const [saving, setSaving] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [commentBoxOpen, setCommentBoxOpen] = useState<Record<string, boolean>>({});
  const [commentsOpen, setCommentsOpen] = useState<Record<string, boolean>>({});
  const [commentsByPost, setCommentsByPost] = useState<Record<string, { id: string; content: string; created_at: string; updated_at?: string; is_edited?: boolean; edit_history?: any[]; user_id: string; profiles?: { first_name?: string; last_name?: string } }[]>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [commentSubmitting, setCommentSubmitting] = useState<Record<string, boolean>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<string>('');
  const [showHistory, setShowHistory] = useState<Record<string, boolean>>({});
  const maxLength = 320;
  const remainingChars = maxLength - statusText.length;
  const isNearLimit = remainingChars <= 20;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data?.user?.id || null);
    });
  }, []);

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
    if (commentSubmitting[postId]) return;
    const text = (commentDrafts[postId] || '').trim();
    console.log('📝 submitComment: start', { postId, textLen: text.length, typeOfPostId: typeof postId });
    if (!text) return;
    setCommentSubmitting((prev) => ({ ...prev, [postId]: true }));
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) return;
    const userId = userData.user.id;
    const { data: inserted, error } = await supabase
      .from('post_comments')
      .insert([{ post_id: postId, user_id: userId, content: text }])
      .select('id, content, created_at, user_id')
      .single();
    if (!error) {
      console.log('✅ submitComment: insert ok');
      // Clear and close box
      setCommentDrafts((prev) => ({ ...prev, [postId]: '' }));
      setCommentBoxOpen((prev) => ({ ...prev, [postId]: false }));
      // Abrir comentarios y refrescar lista para mostrar el nuevo comentario
      setCommentsOpen((prev) => ({ ...prev, [postId]: true }));
      // Añadir optimista con nombre del perfil actual para mostrar de inmediato
      try {
        const profile = await getUserProfile(userId);
        setCommentsByPost((prev) => ({
          ...prev,
          [postId]: [
            {
              id: (inserted as any)?.id || crypto.randomUUID(),
              content: (inserted as any)?.content || text,
              created_at: (inserted as any)?.created_at || new Date().toISOString(),
              user_id: userId,
              profiles: profile ? { first_name: profile.first_name, last_name: profile.last_name } : undefined,
            },
            ...(prev[postId] || []),
          ],
        }));
      } catch (optErr) {
        console.warn('⚠️ submitComment: optimistic add failed', optErr);
      }

      // Crear notificación para el autor del estado (si distinto del comentarista)
      try {
        const post = (posts || []).find(p => String(p.id) === String(postId));
        const authorId = post?.authorId;
        if (authorId && authorId !== userId) {
          await createStatusCommentNotification(
            userId,
            authorId,
            String(postId),
            String((inserted as any)?.id || ''),
            text
          );
        }
      } catch (e) {
        console.warn('⚠️ Error creando notificación de comentario de estado:', e);
      }
      console.log('🔄 submitComment: fetching comments after insert');
      const { data: commentsData, error: fetchErr } = await supabase
        .from('post_comments')
        .select('id, content, created_at, updated_at, is_edited, edit_history, user_id')
        .eq('post_id', postId)
        .order('created_at', { ascending: false })
        .limit(20);
      if (!fetchErr) {
        console.log('📥 submitComment: fetched comments count', (commentsData as any)?.length ?? 0);
        // Enriquecer con nombres de perfiles en un segundo fetch
        const userIds = Array.from(new Set(((commentsData as any) || []).map((c: any) => c.user_id).filter(Boolean)));
        let profileMap: Record<string, { first_name?: string; last_name?: string }> = {};
        if (userIds.length > 0) {
          const { data: profilesData, error: profilesErr } = await supabase
            .from('profiles')
            .select('id, first_name, last_name')
            .in('id', userIds);
          if (!profilesErr) {
            (profilesData as any || []).forEach((p: any) => {
              profileMap[p.id] = { first_name: p.first_name, last_name: p.last_name };
            });
          } else {
            console.warn('⚠️ submitComment: profiles fetch error', profilesErr);
          }
        }
        const merged = ((commentsData as any) || []).map((c: any) => ({
          ...c,
          profiles: profileMap[c.user_id],
        }));
        setCommentsByPost((prev) => ({ ...prev, [postId]: merged }));
      }
      if (fetchErr) {
        console.error('❌ submitComment: fetch comments error', fetchErr);
      }
    }
    if (error) {
      console.error('❌ submitComment: insert error', error);
    }
    setCommentSubmitting((prev) => ({ ...prev, [postId]: false }));
  };

  const toggleComments = async (postId: string) => {
    const willOpen = !commentsOpen[postId];
    console.log('🔧 toggleComments:', { postId, willOpen });
    setCommentsOpen((prev) => ({ ...prev, [postId]: willOpen }));
    if (willOpen && !commentsByPost[postId]) {
      console.log('🔄 toggleComments: fetching comments');
      const { data: commentsData, error } = await supabase
        .from('post_comments')
        .select('id, content, created_at, updated_at, is_edited, edit_history, user_id')
        .eq('post_id', postId)
        .order('created_at', { ascending: false })
        .limit(20);
      if (!error) {
        console.log('📥 toggleComments: fetched comments count', (commentsData as any)?.length ?? 0);
        // Cargar nombres de perfiles en un segundo paso
        const userIds = Array.from(new Set(((commentsData as any) || []).map((c: any) => c.user_id).filter(Boolean)));
        let profileMap: Record<string, { first_name?: string; last_name?: string }> = {};
        if (userIds.length > 0) {
          const { data: profilesData, error: profilesErr } = await supabase
            .from('profiles')
            .select('id, first_name, last_name')
            .in('id', userIds);
          if (!profilesErr) {
            (profilesData as any || []).forEach((p: any) => {
              profileMap[p.id] = { first_name: p.first_name, last_name: p.last_name };
            });
          } else {
            console.warn('⚠️ toggleComments: profiles fetch error', profilesErr);
          }
        }
        const merged = ((commentsData as any) || []).map((c: any) => ({
          ...c,
          profiles: profileMap[c.user_id],
        }));
        setCommentsByPost((prev) => ({ ...prev, [postId]: merged }));
      }
      if (error) {
        console.error('❌ toggleComments: fetch error', error);
      }
    }
  };

  const toggleMenu = (commentId: string) => {
    setOpenMenus((prev) => ({ ...prev, [commentId]: !prev[commentId] }));
  };

  const startEdit = (commentId: string, content: string) => {
    setEditingId(commentId);
    setEditingDraft(content);
    setOpenMenus((prev) => ({ ...prev, [commentId]: false }));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingDraft('');
  };

  const saveEdit = async (postId: string, commentId: string) => {
    const newText = editingDraft.trim();
    if (!newText || !currentUserId) return;
    const existing = (commentsByPost[postId] || []).find((c) => c.id === commentId);
    if (!existing) return;
    const prevText = existing.content;
    try {
      // Obtener historial previo si existe
      const { data: row, error: selErr } = await supabase
        .from('post_comments')
        .select('edit_history')
        .eq('id', commentId)
        .single();
      if (selErr) console.warn('⚠️ saveEdit: no edit_history', selErr);
      const history = Array.isArray(row?.edit_history) ? row?.edit_history : [];
      const entry = { at: new Date().toISOString(), from: prevText, to: newText };
      const { error: updErr } = await supabase
        .from('post_comments')
        .update({ content: newText, updated_at: new Date().toISOString(), is_edited: true, edit_history: [...history, entry] })
        .eq('id', commentId)
        .eq('user_id', currentUserId);
      if (updErr) throw updErr;
      // Actualizar en UI
      setCommentsByPost((prev) => ({
        ...prev,
        [postId]: (prev[postId] || []).map((c) => (c.id === commentId ? { ...c, content: newText, updated_at: new Date().toISOString(), is_edited: true, edit_history: [...history, entry] } : c)),
      }));
      cancelEdit();
    } catch (e) {
      console.error('❌ saveEdit error', e);
    }
  };

  const deleteComment = async (postId: string, commentId: string) => {
    if (!currentUserId) return;
    try {
      const { error } = await supabase
        .from('post_comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', currentUserId);
      if (error) throw error;
      setCommentsByPost((prev) => ({
        ...prev,
        [postId]: (prev[postId] || []).filter((c) => c.id !== commentId),
      }));
    } catch (e) {
      console.error('❌ deleteComment error', e);
    } finally {
      setOpenMenus((prev) => ({ ...prev, [commentId]: false }));
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
                        <button className="tuenti-post-action-button" onClick={() => submitComment(p.id)} disabled={commentSubmitting[p.id] || !(commentDrafts[p.id] || '').trim()}>
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
                        <li key={c.id} style={{ fontSize: 12, color: '#111', padding: '4px 0', borderBottom: '1px solid #f0f0f0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <span style={{ fontWeight: 600 }}>{c.profiles?.first_name || ''} {c.profiles?.last_name || ''}</span>
                              <span style={{ color: '#999', marginLeft: 6 }}>{new Date(c.created_at).toLocaleString()}</span>
                              {c.is_edited && (
                                <span style={{ color: '#999', marginLeft: 6 }}>
                                  • editado
                                  <button style={{ marginLeft: 6, background: 'none', border: 'none', color: '#3571b4', cursor: 'pointer' }} onClick={() => setShowHistory((prev) => ({ ...prev, [c.id]: !prev[c.id] }))}>
                                    Ver cambios
                                  </button>
                                </span>
                              )}
                            </div>
                            {currentUserId === c.user_id && editingId !== c.id && (
                              <div style={{ position: 'relative' }}>
                                <button onClick={() => toggleMenu(c.id)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}>⋯</button>
                                {openMenus[c.id] && (
                                  <div style={{ position: 'absolute', right: 0, top: '100%', background: '#fff', border: '1px solid #e5e5e5', boxShadow: '0 4px 8px rgba(0,0,0,0.06)', borderRadius: 4, zIndex: 10 }}>
                                    <button className="tuenti-post-action-button" style={{ padding: '6px 12px', display: 'block', width: '100%' }} onClick={() => startEdit(c.id, c.content)}>Editar</button>
                                    <button className="tuenti-post-action-button" style={{ padding: '6px 12px', display: 'block', width: '100%', color: '#b91c1c' }} onClick={() => deleteComment(p.id, c.id)}>Eliminar</button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          {editingId === c.id ? (
                            <div style={{ marginTop: 6 }}>
                              <textarea value={editingDraft} onChange={(e) => setEditingDraft(e.target.value)} rows={2} style={{ width: '100%', fontSize: 12, padding: 8, border: '1px solid #ddd', borderRadius: 3 }} />
                              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                                <button className="tuenti-post-action-button" onClick={() => saveEdit(p.id, c.id)}>Guardar</button>
                                <button className="tuenti-post-action-button" onClick={cancelEdit}>Cancelar</button>
                              </div>
                            </div>
                          ) : (
                            <div style={{ marginTop: 4 }}>{c.content}</div>
                          )}
                          {showHistory[c.id] && Array.isArray(c.edit_history) && c.edit_history.length > 0 && (
                            <div style={{ background: '#fafafa', border: '1px solid #eee', borderRadius: 3, padding: '6px 8px', marginTop: 6 }}>
                              <div style={{ fontWeight: 600, marginBottom: 4 }}>Historial de cambios</div>
                              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                {c.edit_history.map((h: any, idx: number) => (
                                  <li key={idx} style={{ marginBottom: 6 }}>
                                    <div style={{ color: '#666' }}>{new Date(h.at).toLocaleString()}</div>
                                    <div><span style={{ color: '#b91c1c' }}>Antes:</span> {h.from}</div>
                                    <div><span style={{ color: '#047857' }}>Después:</span> {h.to}</div>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </li>
                      ))}
                      </ul>
                      )}
                    </div>
                  )}
                  {/* Notificaciones por post eliminadas para priorizar comentarios inline */}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}