import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageCircle, Send, Settings, Volume2, VolumeX, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useChatContext } from '@/contexts/ChatContext';
import { dbg, group, count } from '@/lib/debug';
import EmojiPicker, { EmojiStyle, Theme } from 'emoji-picker-react';
import { getUnreadMessages, markMessagesAsRead, getTotalUnreadCount, generateConversationId } from '../lib/supabase';
import '../styles/tuenti-right-sidebar.css';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  created_at: string;
  sender_name?: string;
}

interface Friend {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  is_online?: boolean;
}

interface ChatWindow {
  friend: Friend;
  messages: Message[];
  newMessage: string;
}

const RightSidebar: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { isOnline, soundEnabled, setOnlineStatus, setSoundEnabled, playNotificationSound } = useChatContext();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [openChats, setOpenChats] = useState<ChatWindow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const settingsWrapperRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [recentConversations, setRecentConversations] = useState<any[]>([]);
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; friendId: string | null }>({ visible: false, x: 0, y: 0, friendId: null });
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  
  // Estado para el selector de emojis
  const [showEmojiPicker, setShowEmojiPicker] = useState<{[key: string]: boolean}>({});

  // Estado para chats minimizados
  const [minimizedChats, setMinimizedChats] = useState<string[]>([]);
  
  // Estado para notificaciones de mensajes no leídos - AHORA USANDO BASE DE DATOS
  const [unreadMessages, setUnreadMessages] = useState<{[userId: string]: number}>({});
  // Avisos de desconexión por chat abierto
  const [disconnectNotices, setDisconnectNotices] = useState<{[userId: string]: string}>({});

  // Polling de estado online (ref para el intervalo)
  const onlinePollRef = useRef<number | null>(null);

  // Refresco ligero del estado online de amigos
  const refreshFriendsOnlineStatus = async () => {
    if (!currentUser?.id) return;
    try {
      const ids = friends.map(f => f.id).filter(Boolean);
      if (ids.length === 0) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('id, is_online')
        .in('id', ids);
      if (error) {
        dbg('RightSidebar', 'poll:is_online:error', error);
        return;
      }
      const map: {[key: string]: boolean} = {};
      (data || []).forEach((r: any) => { map[r.id] = !!r.is_online; });
      setFriends(prev => prev.map(f => (map[f.id] !== undefined ? { ...f, is_online: map[f.id] } : f)));
    } catch (e) {
      dbg('RightSidebar', 'poll:is_online:catch', e);
    }
  };

  // NUEVA FUNCIÓN: Cargar mensajes no leídos desde la base de datos
  const loadUnreadMessages = async () => {
    if (!currentUser?.id) return;
    
    try {
      group.start('RightSidebar:loadUnreadMessages');
      const unreadData = await getUnreadMessages(currentUser.id);
      const unreadCounts: {[userId: string]: number} = {};
      
      unreadData.forEach(item => {
        unreadCounts[item.sender_id] = item.unread_count;
      });
      
      setUnreadMessages(unreadCounts);
      dbg('RightSidebar', 'unreadMessages:loaded', unreadCounts);
      group.end();
    } catch (error) {
      dbg('RightSidebar', 'unreadMessages:error', error);
      group.end();
    }
  };
  
   // Función para minimizar chat
  const minimizeChat = (friendId: string) => {
    setMinimizedChats(prev => [...prev, friendId]);
  };

  // Función para restaurar chat minimizado
  const restoreChat = (friendId: string) => {
    setMinimizedChats(prev => prev.filter(id => id !== friendId));
  };

  // FUNCIÓN MODIFICADA: Abrir chat y marcar mensajes como leídos
  const openChat = async (friend: Friend) => {
    dbg('RightSidebar', 'openChat', friend.id);
    // Verificar si ya está abierto
    if (openChats.find(chat => chat.friend.id === friend.id)) {
      // Si ya está abierto, solo marcar como leído
      await markMessagesAsRead(currentUser?.id!, friend.id);
      setUnreadMessages(prev => ({
        ...prev,
        [friend.id]: 0
      }));
      return;
    }
    
    // Generar conversation_id
    const conversationId = generateConversationId(currentUser?.id!, friend.id);
    
    // Cargar mensajes existentes usando conversation_id
    const { data: messages, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
    
    if (error) {
    dbg('RightSidebar', 'openChat:loadMessages:error', error);
    return;
    }
    
    const newChat: ChatWindow = {
    friend,
    messages: messages || [],
    newMessage: ''
    };
    
    setOpenChats(prev => [...prev, newChat]);
    
    // Marcar mensajes como leídos
    try {
    await markMessagesAsRead(currentUser?.id!, friend.id);
    setUnreadMessages(prev => ({
    ...prev,
    [friend.id]: 0
    }));
    dbg('RightSidebar', 'markRead:ok', friend.id);
    } catch (error) {
    dbg('RightSidebar', 'markRead:error', error);
    }
  };

  // En la función sendMessage
  const sendMessage = async (friendId: string) => {
  const chat = openChats.find(c => c.friend.id === friendId);
  if (!chat || !chat.newMessage.trim() || !currentUser?.id) return;
  
  const messageContent = chat.newMessage.trim();
  const conversationId = generateConversationId(currentUser.id, friendId);
  
  // Crear mensaje temporal para feedback inmediato
  const tempMessage: Message = {
  id: `temp-${Date.now()}`,
  content: messageContent,
  sender_id: currentUser.id,
  receiver_id: friendId,
  created_at: new Date().toISOString(),
  sender_name: 'Tú'
  };
  
  // Agregar mensaje temporalmente
  setOpenChats(prev => prev.map(c => 
  c.friend.id === friendId 
    ? { 
        ...c, 
        messages: [...c.messages, tempMessage],
        newMessage: '' 
      }
    : c
  ));
  
  try {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      conversation_id: conversationId,
      content: messageContent,
      sender_id: currentUser.id,
      receiver_id: friendId
    })
    .select()
    .single();
  
  if (error) throw error;
  
  // Reemplazar mensaje temporal con el real
  setOpenChats(prev => prev.map(c => 
    c.friend.id === friendId 
      ? { 
          ...c, 
          messages: c.messages.map(m => 
            m.id === tempMessage.id ? data : m
          )
        }
      : c
  ));
  
  console.log('✅ Mensaje enviado:', data);
  
  } catch (error) {
  console.error('❌ Error enviando mensaje:', error);
  
  // Remover mensaje temporal en caso de error
  setOpenChats(prev => prev.map(c => 
    c.friend.id === friendId 
      ? { 
          ...c, 
          messages: c.messages.filter(m => m.id !== tempMessage.id),
          newMessage: messageContent // Restaurar el mensaje
        }
      : c
  ));
  }
  };

  // Actualizar mensaje en input
  const updateMessage = (friendId: string, message: string) => {
    setOpenChats(prev => prev.map(c => 
      c.friend.id === friendId 
        ? { ...c, newMessage: message }
        : c
    ));
  };

  // Función para toggle del emoji picker
  const toggleEmojiPicker = (friendId: string) => {
    setShowEmojiPicker(prev => ({
      ...prev,
      [friendId]: !prev[friendId]
    }));
  };

  // Cargar contadores de no leídos al iniciar sesión o recargar
  useEffect(() => {
    if (currentUser?.id) {
      loadUnreadMessages();
    }
  }, [currentUser?.id]);

  // Polling periódico de estado online como fallback cuando la suscripción no refleja cambios
  useEffect(() => {
    if (!isOnline || !currentUser?.id) {
      if (onlinePollRef.current) {
        clearInterval(onlinePollRef.current);
        onlinePollRef.current = null;
      }
      return;
    }
    if (onlinePollRef.current) {
      clearInterval(onlinePollRef.current);
    }
    // Refresco inmediato y cada 10s
    refreshFriendsOnlineStatus();
    onlinePollRef.current = window.setInterval(() => {
      refreshFriendsOnlineStatus();
    }, 10000);
    return () => {
      if (onlinePollRef.current) {
        clearInterval(onlinePollRef.current);
        onlinePollRef.current = null;
      }
    };
  }, [isOnline, currentUser?.id, friends.length]);

  // Función para manejar selección de emoji
  const onEmojiClick = (emojiData: any, friendId: string) => {
    setOpenChats(prev => prev.map(chat => 
      chat.friend.id === friendId 
        ? { ...chat, newMessage: chat.newMessage + emojiData.emoji }
        : chat
    ));
    setShowEmojiPicker(prev => ({
      ...prev,
      [friendId]: false
    }));
  };

  // Suscripción en tiempo real para mensajes (evitar resuscripciones frecuentes)
  useEffect(() => {
    if (!currentUser?.id || !isOnline) return;

    dbg('RightSidebar', 'subscribe:chat_messages');
    const subscription = supabase
      .channel('chat_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages'
        },
        async (payload) => {
          dbg('RightSidebar', 'chat_messages:event', payload?.new);
          const newMessage = payload.new as Message;
          
          // Solo procesar mensajes relevantes para el usuario actual
          if (newMessage.sender_id === currentUser.id || newMessage.receiver_id === currentUser.id) {
            // Reproducir sonido si el mensaje es de otro usuario
            if (newMessage.sender_id !== currentUser.id) {
              // Verificar si el chat del remitente está abierto y visible
              const senderChat = openChats.find(chat => chat.friend.id === newMessage.sender_id);
              const isChatMinimized = minimizedChats.includes(newMessage.sender_id);
              const isChatClosed = !senderChat;
              
              // El chat está "visible" si existe y NO está minimizado
              const isChatVisible = senderChat && !isChatMinimized;
              
              // Reproducir sonido SOLO si el chat NO está visible
              if (!isChatVisible) {
                playNotificationSound();
              }
              
              // ACTUALIZAR CONTADORES DESDE LA BASE DE DATOS
              if (isChatClosed || isChatMinimized) {
                // Recargar contadores desde la base de datos
                await loadUnreadMessages();
              }
            }
            
            // Actualizar el chat correspondiente
            setOpenChats(prev => prev.map(chat => {
              const isRelevantChat = 
                (chat.friend.id === newMessage.sender_id && newMessage.receiver_id === currentUser.id) ||
                (chat.friend.id === newMessage.receiver_id && newMessage.sender_id === currentUser.id);
              
              if (isRelevantChat) {
                // Evitar duplicados
                const messageExists = chat.messages.some(m => m.id === newMessage.id);
                if (!messageExists) {
                  return {
                    ...chat,
                    messages: [...chat.messages, newMessage]
                  };
                }
              }
              return chat;
            }));
          }
        }
      )
      .subscribe();

    return () => {
      dbg('RightSidebar', 'unsubscribe:chat_messages');
      subscription.unsubscribe();
    };
  }, [currentUser?.id, isOnline]);

  // Suscripción para estado online de amigos (actualización en memoria, sin recargar lista completa)
  useEffect(() => {
    if (!currentUser?.id) return;

    dbg('RightSidebar', 'subscribe:friends_online_status');
    const subscription = supabase
      .channel('friends_online_status')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles'
        },
        (payload: any) => {
          const updated = payload?.new;
          const updatedId = updated?.id;
          if (!updatedId) return;
          dbg('RightSidebar', 'profiles:update', { id: updatedId, is_online: updated?.is_online });
          // Solo actualiza si el usuario actualizado está en tu lista de amigos
          setFriends(prev => {
            let changed = false;
            const next = prev.map(f => {
              if (f.id === updatedId) {
                changed = true;
                return { ...f, is_online: !!updated?.is_online };
              }
              return f;
            });
            // Si no encontramos al usuario en memoria, evitamos refrescos globales
            return changed ? next : prev;
          });
          // Si el usuario actualizado está en un chat abierto y se desconecta, mostrar aviso
          const isChatOpen = openChats.some(c => c.friend.id === updatedId);
          if (isChatOpen && updated?.is_online === false) {
            const timeStr = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            setDisconnectNotices(prev => ({ ...prev, [updatedId]: timeStr }));
          }
          // Si vuelve a conectarse, eliminar el aviso
          if (isChatOpen && updated?.is_online === true) {
            setDisconnectNotices(prev => {
              const { [updatedId]: _, ...rest } = prev;
              return rest;
            });
          }
        }
      )
      .subscribe();

    return () => {
      dbg('RightSidebar', 'unsubscribe:friends_online_status');
      subscription.unsubscribe();
    };
  }, [currentUser?.id]);

  // Auto scroll - REEMPLAZAR el useEffect existente (líneas 406-408)
  useEffect(() => {
    // Hacer scroll al final cuando se abren chats o cambian mensajes
    dbg('RightSidebar', 'scroll:onOpenChatsChange', openChats.map(c => c.friend.id));
    openChats.forEach((chat) => {
      const messagesContainer = document.getElementById(`messages-${chat.friend.id}`);
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    });
  }, [openChats]);

  // Scroll automático cuando se envían nuevos mensajes (dependencia estable)
  useEffect(() => {
    openChats.forEach((chat) => {
      const messagesContainer = document.getElementById(`messages-${chat.friend.id}`);
      if (messagesContainer && chat.messages.length > 0) {
        setTimeout(() => {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, 100);
      }
    });
  }, [openChats]);

  useEffect(() => {
    if (isOnline && currentUser?.id) {
      loadFriends();
      // loadRecentConversations(); // ← ELIMINAR ESTA LÍNEA
      
      // Suscripción para actualizaciones - CAMBIAR AQUÍ
      const conversationSubscription = supabase
        .channel('chat_messages_updates')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages'  // Cambiar de 'conversations' a 'chat_messages'
          },
          () => {
            // loadRecentConversations(); // ← ELIMINAR ESTA LÍNEA
            // En su lugar, podemos recargar los mensajes no leídos
            loadUnreadMessages();
          }
        )
        .subscribe();
      
      // Cleanup
      return () => {
        conversationSubscription.unsubscribe();
      };
    }
  }, [currentUser?.id, isOnline]);

  const handleSoundToggle = () => {
    setSoundEnabled(!soundEnabled);
    setShowSettings(false);
  };

  const handleDisconnect = () => {
    const nextOnline = !isOnline;
    setOnlineStatus(nextOnline);
    setShowSettings(false);
    // Al reconectar, refrescar amigos y contadores inmediatamente
    if (nextOnline && currentUser?.id) {
      loadFriends();
      loadUnreadMessages();
    }
  };

  // Cerrar el menú de opciones al hacer clic fuera
  useEffect(() => {
    if (!showSettings) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsWrapperRef.current && !settingsWrapperRef.current.contains(event.target as Node)) {
        setShowSettings(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSettings]);

  const loadFriends = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      const { data: rows, error } = await supabase
        .from('friendships')
        .select(`
          user_id,
          friend_id,
          status,
          user:profiles!user_id(
            id,
            first_name,
            last_name,
            avatar_url,
            is_online
          ),
          friend:profiles!friend_id(
            id,
            first_name,
            last_name,
            avatar_url,
            is_online
          )
        `)
        .or(`user_id.eq.${currentUser.id},friend_id.eq.${currentUser.id}`)
        .eq('status', 'accepted');

      if (error) {
        console.error('Error loading friends:', error);
        return;
      }

      const list: Friend[] = (rows || []).map((r: any) => {
        const other = r.user_id === currentUser.id ? r.friend : r.user;
        return {
          id: other?.id,
          first_name: other?.first_name || '',
          last_name: other?.last_name || '',
          avatar_url: other?.avatar_url || undefined,
          is_online: !!other?.is_online,
        } as Friend;
      }).filter(f => !!f.id);

      setFriends(list);
    } catch (error) {
      console.error('Error in loadFriends:', error);
    } finally {
      setLoading(false);
    }
  };

  // Trazas de render (dentro del componente)
  dbg('RightSidebar', 'render', {
    userId: currentUser?.id,
    isOnline,
    friendsCount: friends.length,
    openChatsIds: openChats.map((chat) => chat.friend.id),
  });
  count('RightSidebar:render');

  return (
    <div className={`right-sidebar ${isOnline ? '' : 'offline'}`}>
      {/* Encabezado */}
      <div className="right-sidebar-header">
        <div className="right-sidebar-title">
          <div className={`online-indicator ${isOnline ? 'friend-status-online' : 'friend-status-offline'}`}></div>
          <h3 className="chat-title">Chat</h3>
          {isOnline && (
            <span className="friends-count">({friends.length})</span>
          )}
        </div>
        <div className="options-wrapper" ref={settingsWrapperRef}>
          <button
            className="options-button"
            onClick={() => setShowSettings(!showSettings)}
          >
            Opciones
          </button>
          {showSettings && (
            <div className="settings-dropdown">
              <div className="settings-dropdown-content">
                <button
                  onClick={handleSoundToggle}
                  className="settings-option"
                >
                  {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                  {soundEnabled ? 'Silenciar' : 'Activar sonido'}
                </button>
                <button
                  onClick={handleDisconnect}
                  className="settings-option"
                >
                  <LogOut className="h-4 w-4" />
                  {isOnline ? 'Desconectarse' : 'Conectarse'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {!isOnline && (
        <div className="chat-offline">Chat desconectado</div>
      )}

      {/* Buscar amigo */}
      <div className="search-section" onBlur={() => setTimeout(() => { setShowSearchResults(false); }, 150)}>
        <input
          placeholder="Buscar amigo"
          className="search-input"
          value={searchQuery}
          onChange={(e) => {
            const q = e.target.value;
            setSearchQuery(q);
            setShowSearchResults(q.trim().length > 0);
          }}
          onFocus={() => setShowSearchResults(searchQuery.trim().length > 0)}
        />
        {showSearchResults && (
          <div className="search-results">
            {friends
              .filter(f => (`${f.first_name} ${f.last_name}`).toLowerCase().includes(searchQuery.toLowerCase()))
              .slice(0, 8)
              .map(friend => (
                <div
                  key={friend.id}
                  className="search-result-item"
                  onMouseDown={() => {
                    openChat(friend);
                    setUnreadMessages(prev => ({ ...prev, [friend.id]: 0 }));
                    setShowSearchResults(false);
                    setSearchQuery('');
                  }}
                >
                  <span className={`search-result-status ${friend.is_online ? 'online' : 'offline'}`}></span>
                  <span className="search-result-name">{friend.first_name} {friend.last_name}</span>
                </div>
              ))}
            {friends.filter(f => (`${f.first_name} ${f.last_name}`).toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
              <div className="search-result-empty">Sin resultados</div>
            )}
          </div>
        )}
      </div>

      {/* Lista de amigos */}
      <div>
        <h4 className="friends-section-title">Amigos</h4>
        <div className="friends-list">
          {/* Online primero */}
          {friends.filter(f=>f.is_online).map(friend => (
            <div
              key={friend.id}
              onClick={() => {
                openChat(friend);
                setUnreadMessages(prev => ({
                  ...prev,
                  [friend.id]: 0
                }));
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu({ visible: true, x: e.pageX, y: e.pageY, friendId: friend.id });
              }}
              className="friend-item"
            >
              <div className="friend-info">
                <div className="friend-status-indicator friend-status-online"></div>
                <span className="friend-name">{friend.first_name} {friend.last_name}</span>
                {isOnline && unreadMessages[friend.id] > 0 && (
                  <div className="unread-badge">
                    {unreadMessages[friend.id] > 99 ? '99+' : unreadMessages[friend.id]}
                  </div>
                )}
              </div>
            </div>
          ))}
          {/* Offline después */}
          {friends.filter(f=>!f.is_online).map(friend => (
            <div
              key={friend.id}
              onClick={() => {
                openChat(friend);
                setUnreadMessages(prev => ({
                  ...prev,
                  [friend.id]: 0
                }));
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu({ visible: true, x: e.pageX, y: e.pageY, friendId: friend.id });
              }}
              className="friend-item"
            >
              <div className="friend-info">
                <div className="friend-status-indicator friend-status-offline"></div>
                <span className="friend-name friend-name-offline">{friend.first_name} {friend.last_name}</span>
              </div>
              {isOnline && unreadMessages[friend.id] > 0 && (
                <div className="unread-badge">
                  {unreadMessages[friend.id] > 99 ? '99+' : unreadMessages[friend.id]}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Ventanas de chat flotantes */}
      <div className="chat-windows-container">
        {openChats.map((chat, chatIndex) => {
          const isMinimized = minimizedChats.includes(chat.friend.id);
          
          function formatTime(created_at: string): string {
            const date = new Date(created_at);
            return date.toLocaleTimeString('es-ES', {
              hour: '2-digit',
              minute: '2-digit'
            });
          }

          function closeChat(id: string) {
            // Cerrar la ventana de chat y limpiar si estaba minimizada
            setOpenChats(prev => prev.filter(c => c.friend.id !== id));
            setMinimizedChats(prev => prev.filter(fid => fid !== id));
          }

          return (
            <div
              key={chat.friend.id}
              className={`chat-window ${
                isMinimized ? 'chat-window-minimized' : 'chat-window-expanded'
              }`}
              style={{
                left: `${20 + chatIndex * (isMinimized ? 60 : 400)}px`,
              }}
            >
              {/* Cabecera del chat */}
              <div className={`chat-header ${
                isMinimized ? 'chat-header-minimized' : 'chat-header-expanded'
              }`}>
                {isMinimized ? (
                  <img
                src={chat.friend.avatar_url || `${import.meta.env.BASE_URL}placeholder.svg`}
                    alt={chat.friend.first_name}
                    className="chat-avatar-minimized"
                    onClick={() => restoreChat(chat.friend.id)}
                  />
                ) : (
                  <>
                    <div className="chat-user-info">
                      <img
                src={chat.friend.avatar_url || `${import.meta.env.BASE_URL}placeholder.svg`}
                        alt={chat.friend.first_name}
                        className="chat-avatar-small"
                      />
                      <span className="chat-user-name">
                        {chat.friend.first_name} {chat.friend.last_name}
                      </span>
                    </div>
                    <div className="chat-controls">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          minimizeChat(chat.friend.id);
                        }}
                        className="chat-control-button"
                      >
                        –
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          closeChat(chat.friend.id);
                        }}
                        className="chat-control-button"
                      >
                        ×
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Contenido del chat (solo visible si no está minimizado) */}
              {!isMinimized && (
                <>
                  {/* Aviso de desconexión */}
                  {disconnectNotices[chat.friend.id] && (
                    <div className="disconnect-notice" style={{ fontSize: '12px', color: '#666', padding: '4px 8px' }}>
                      {chat.friend.first_name} se ha desconectado {disconnectNotices[chat.friend.id]}
                    </div>
                  )}
                  {/* Messages Area */}
                  <div 
                    id={`messages-${chat.friend.id}`}
                    className="messages-area custom-scrollbar"
                  >
                    {chat.messages.map((message, index) => {
                      const isCurrentUser = message.sender_id === currentUser?.id;
                      const messageDate = new Date(message.created_at).toDateString();
                      const prevMessageDate = index > 0 ? new Date(chat.messages[index - 1].created_at).toDateString() : null;
                      const showDateSeparator = messageDate !== prevMessageDate;
                      
                      function formatDateSeparator(created_at: string): React.ReactNode {
                        const date = new Date(created_at);
                        return date.toLocaleDateString('es-ES', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        });
                      }
                      function formatTime(created_at: string): React.ReactNode {
                        const date = new Date(created_at);
                        return date.toLocaleTimeString('es-ES', {
                          hour: '2-digit',
                          minute: '2-digit'
                        });
                      }

                      return (
                        <div key={index}>
                          {/* Separador de fecha */}
                          {showDateSeparator && (
                            <div className="date-separator">
                              <div className="date-separator-text">
                                {formatDateSeparator(message.created_at)}
                              </div>
                            </div>
                          )}
                          
                          {/* Mensaje */}
                          <div className={`message-container ${isCurrentUser ? 'message-right' : 'message-left'}`}>
                            <div className="message-content">
                              <img
                src={isCurrentUser ? `${import.meta.env.BASE_URL}placeholder.svg` : chat.friend.avatar_url || `${import.meta.env.BASE_URL}placeholder.svg`}
                                alt="Avatar"
                                className="message-avatar"
                              />
                              <div className="message-text-container">
                                <div className="message-text">
                                  {isCurrentUser ? (
                                    <span className="message-sender-current">Yo: </span>
                                  ) : (
                                    <span className="message-sender-other">{chat.friend.first_name}: </span>
                                  )}
                                  <span className="message-content-text">{message.content}</span>
                                  <span className="message-time">
                                    {formatTime(message.created_at)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Input Area con emoji integrado */}
                  <div className="input-area">
                    <div className="input-container">
                      <input
                        type="text"
                        value={chat.newMessage}
                        onChange={(e) => updateMessage(chat.friend.id, e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            sendMessage(chat.friend.id);
                          }
                        }}
                        className="message-input"
                        placeholder=""
                      />
                      
                      {/* Divisor y emoji dentro del input */}
                      <div className="input-controls">
                        <div className="input-divider"></div>
                        <button 
                          onClick={() => toggleEmojiPicker(chat.friend.id)}
                          className="emoji-button"
                        >
                          <span className="text-lg">😊</span>
                        </button>
                      </div>
                      
                      {/* Emoji Picker */}
                      {showEmojiPicker[chat.friend.id] && (
                        <div className="emoji-picker-container">
                          <EmojiPicker
                            onEmojiClick={(emojiData) => onEmojiClick(emojiData, chat.friend.id)}
                            width={300}
                            height={400}
                            theme={Theme.LIGHT}
                            emojiStyle={EmojiStyle.NATIVE}
                            searchDisabled={false}
                            skinTonesDisabled={false}
                            previewConfig={{
                              showPreview: false
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Menú contextual para amigos */}
      {contextMenu.visible && (
        <div
          className="context-menu"
          style={{ position: 'fixed', top: contextMenu.y, left: contextMenu.x, zIndex: 1000 }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="context-menu-item"
            onClick={async () => {
              if (contextMenu.friendId && currentUser?.id) {
                try {
                  await markMessagesAsRead(currentUser.id, contextMenu.friendId);
                  setUnreadMessages(prev => ({
                    ...prev,
                    [contextMenu.friendId!]: 0
                  }));
                } catch (err) {
                  console.error('Error marcando como leído:', err);
                }
              }
              setContextMenu({ visible: false, x: 0, y: 0, friendId: null });
            }}
          >
            Marcar como leído
          </button>
          <button
            className="context-menu-item"
            onClick={() => setContextMenu({ visible: false, x: 0, y: 0, friendId: null })}
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
};

export default RightSidebar;


