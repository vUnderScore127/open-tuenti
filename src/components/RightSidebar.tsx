import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageCircle, Send, Settings, Volume2, VolumeX, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useChatContext } from '@/contexts/ChatContext';
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [recentConversations, setRecentConversations] = useState<any[]>([]);
  
  // Estado para el selector de emojis
  const [showEmojiPicker, setShowEmojiPicker] = useState<{[key: string]: boolean}>({});

  // Estado para chats minimizados
  const [minimizedChats, setMinimizedChats] = useState<string[]>([]);
  
  // Estado para notificaciones de mensajes no leídos - AHORA USANDO BASE DE DATOS
  const [unreadMessages, setUnreadMessages] = useState<{[userId: string]: number}>({});

  // NUEVA FUNCIÓN: Cargar mensajes no leídos desde la base de datos
  const loadUnreadMessages = async () => {
    if (!currentUser?.id) return;
    
    try {
      const unreadData = await getUnreadMessages(currentUser.id);
      const unreadCounts: {[userId: string]: number} = {};
      
      unreadData.forEach(item => {
        unreadCounts[item.sender_id] = item.unread_count;
      });
      
      setUnreadMessages(unreadCounts);
      console.log('✅ Mensajes no leídos cargados desde BD:', unreadCounts);
    } catch (error) {
      console.error('❌ Error cargando mensajes no leídos:', error);
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
    console.error('Error loading messages:', error);
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
    console.log('✅ Mensajes marcados como leídos para:', friend.first_name);
    } catch (error) {
    console.error('❌ Error marcando mensajes como leídos:', error);
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

  // Suscripción en tiempo real para mensajes
  useEffect(() => {
    if (!currentUser?.id) return;

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
      subscription.unsubscribe();
    };
  }, [currentUser?.id, playNotificationSound, minimizedChats, openChats]);

  // Suscripción para estado online de amigos
  useEffect(() => {
    if (!currentUser?.id) return;

    const subscription = supabase
      .channel('friends_online_status')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles'
        },
        () => {
          // Recargar lista de amigos cuando cambie el estado online
          loadFriends();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [currentUser?.id]);

  // Auto scroll - REEMPLAZAR el useEffect existente (líneas 406-408)
  useEffect(() => {
    // Hacer scroll al final cuando se abren chats o cambian mensajes
    openChats.forEach((chat) => {
      const messagesContainer = document.getElementById(`messages-${chat.friend.id}`);
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    });
  }, [openChats]);

  // Scroll automático cuando se envían nuevos mensajes
  useEffect(() => {
    openChats.forEach((chat) => {
      const messagesContainer = document.getElementById(`messages-${chat.friend.id}`);
      if (messagesContainer && chat.messages.length > 0) {
        setTimeout(() => {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, 100);
      }
    });
  }, [openChats.map(chat => chat.messages.length)]);

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
    setOnlineStatus(!isOnline);
    setShowSettings(false);
  };

  const loadFriends = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      const { data: friendships, error } = await supabase
        .from('friendships')
        .select(`
          *,
          friend:profiles!friend_id(
            id,
            first_name,
            last_name,
            avatar_url,
            is_online
          )
        `)
        .eq('user_id', currentUser.id)
        .eq('status', 'accepted');

      if (error) {
        console.error('Error loading friends:', error);
        return;
      }

      if (friendships) {
        setFriends(friendships.map(f => f.friend));
      }
    } catch (error) {
      console.error('Error in loadFriends:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="right-sidebar">
      {/* Encabezado */}
      <div className="right-sidebar-header">
        <div className="right-sidebar-title">
          <div className="online-indicator"></div>
          <h3 className="chat-title">Chat</h3>
          <span className="friends-count">({friends.length})</span>
        </div>
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

      {/* Buscar amigo */}
      <div className="search-section">
        <input
          placeholder="Buscar amigo"
          className="search-input"
        />
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
              className="friend-item"
            >
              <div className="friend-info">
                <div className="friend-status-indicator friend-status-online"></div>
                <span className="friend-name">{friend.first_name} {friend.last_name}</span>
                {unreadMessages[friend.id] > 0 && (
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
              className="friend-item"
            >
              <div className="friend-info">
                <div className="friend-status-indicator friend-status-offline"></div>
                <span className="friend-name friend-name-offline">{friend.first_name} {friend.last_name}</span>
              </div>
              {unreadMessages[friend.id] > 0 && (
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
            throw new Error('Function not implemented.');
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
                          <div className="message-container">
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
    </div>
  );
};

export default RightSidebar;


