import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, Send, Plus, Trash2, Archive, Mic, Edit, Inbox, Mail, Users, Volume2, X, ArrowUp } from 'lucide-react';
import { Header } from '@/components/Header';
import { privateMessagesService, friendshipService, supabase, notificationsService } from '@/lib/supabase';
import type { PrivateMessage, PrivateConversation, User } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';

type MessageSection = 'inbox';

const Messages = () => {
  // Estados principales
  const [conversations, setConversations] = useState<PrivateConversation[]>([]);
  const [messages, setMessages] = useState<PrivateMessage[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<PrivateConversation | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false); // Agregar este estado
  
  // Estados de UI
  const [showChatView, setShowChatView] = useState(false);
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  
  // Estados para nuevo mensaje
  const [newMessage, setNewMessage] = useState('');
  const [newMessageContent, setNewMessageContent] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchUsers, setSearchUsers] = useState('');
  const [foundUsers, setFoundUsers] = useState<User[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  
  // Estados de navegación
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeSection] = useState<MessageSection>('inbox');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Cargar usuario actual al montar el componente
  useEffect(() => {
    const user = localStorage.getItem('tuentis_user');
    if (user) {
      const parsedUser = JSON.parse(user);
      setCurrentUser(parsedUser);
      loadConversations(parsedUser.id);
    } else {
      setLoading(false);
    }
  }, []);

  // Función para cargar conversaciones
  const loadConversations = async (userId?: string) => {
    const userIdToUse = userId || currentUser?.id;
    if (!userIdToUse) return;
    
    try {
      setLoading(true);
      const convs = await privateMessagesService.getUserConversations(userIdToUse);
      setConversations(convs);
      
      // Calcular paginación
      const itemsPerPage = 10;
      setTotalPages(Math.max(1, Math.ceil(convs.length / itemsPerPage)));
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las conversaciones.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Función para cargar mensajes de una conversación
  const loadMessages = async (conversation: PrivateConversation) => {
    if (!currentUser) return
    
    setLoadingMessages(true)
    try {
      const messages = await privateMessagesService.getConversationMessages(conversation.id)
      setMessages(messages)
      setSelectedConversation(conversation)
      
      // Marcar mensajes como leídos
      await privateMessagesService.markMessagesAsRead(conversation.id, currentUser.id)
      
      // Recargar conversaciones para actualizar contadores
      await loadConversations()
      
      // Emitir evento para actualizar notificaciones en otros componentes
      window.dispatchEvent(new CustomEvent('notificationsUpdated'))
      
    } catch (error) {
      console.error('Error loading messages:', error)
    } finally {
      setLoadingMessages(false)
    }
  };

  // Función para abrir vista de chat
  const openChatView = (conversation: PrivateConversation) => {
    setSelectedConversation(conversation);
    loadMessages(conversation);
    setSelectedMessages([]);
    setShowChatView(true);
  };

  // Función para cerrar vista de chat
  const closeChatView = () => {
    setShowChatView(false);
    setSelectedConversation(null);
    setMessages([]);
  };

  // Función para enviar mensaje en conversación existente
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !currentUser) return;

    const receiverId = selectedConversation.participant_1_id === currentUser.id 
      ? selectedConversation.participant_2_id 
      : selectedConversation.participant_1_id;

    try {
      await privateMessagesService.sendPrivateMessage(
        selectedConversation.id,
        currentUser.id,
        receiverId,
        newMessage.trim()
      );
      
      setNewMessage('');
      await loadMessages(selectedConversation);
      await loadConversations();
      
      toast({
        title: "Mensaje enviado",
        description: "Tu mensaje ha sido enviado correctamente.",
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "No se pudo enviar el mensaje. Inténtalo de nuevo.",
        variant: "destructive",
      });
    }
  };

  // Función para buscar usuarios
  const handleUserSearch = async (query: string) => {
    setSearchUsers(query);
    if (query.trim().length < 2) {
      setFoundUsers([]);
      return;
    }

    setIsSearchingUsers(true);
    try {
      const users = await privateMessagesService.searchUsers(query, currentUser?.id || '');
      setFoundUsers(users.filter(user => user.id !== currentUser?.id));
    } catch (error) {
      console.error('Error searching users:', error);
      setFoundUsers([]);
    } finally {
      setIsSearchingUsers(false);
    }
  };

  // Función para seleccionar usuario
  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    setSearchUsers('');
    setFoundUsers([]);
  };

  // Función para enviar nuevo mensaje
  const handleSendNewMessage = async () => {
    if (!selectedUser || !newMessageContent.trim() || !currentUser) return;

    console.log('📤 DEBUG - Enviando mensaje:', {
      from: currentUser.id,
      to: selectedUser.id,
      content: newMessageContent.trim()
    });

    try {
      // Crear o obtener conversación
      console.log('🔄 DEBUG - Creando/obteniendo conversación...');
      const conversation = await privateMessagesService.createOrGetConversation(
        currentUser.id,
        selectedUser.id
      );
      console.log('✅ DEBUG - Conversación obtenida:', conversation);
  
      // Enviar mensaje
      console.log('📨 DEBUG - Enviando mensaje...');
      const sentMessage = await privateMessagesService.sendPrivateMessage(
        conversation.id,
        currentUser.id,
        selectedUser.id,
        newMessageContent.trim()
      );
      console.log('✅ DEBUG - Mensaje enviado:', sentMessage);
  
      // Limpiar formulario y cerrar modal
      resetNewMessageModal();
      
      // Recargar conversaciones
      await loadConversations();
  
      toast({
        title: "Mensaje enviado",
        description: "Tu mensaje ha sido enviado correctamente.",
      });
    } catch (error) {
      console.error('❌ ERROR completo al enviar mensaje:', error);
      console.error('❌ ERROR detalles:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      
      toast({
        title: "Error",
        description: `No se pudo enviar el mensaje: ${error.message || 'Error desconocido'}`,
        variant: "destructive",
      });
    }
  };

  // Función para resetear modal de nuevo mensaje
  const resetNewMessageModal = () => {
    setNewMessageContent('');
    setSelectedUser(null);
    setSearchUsers('');
    setFoundUsers([]);
    setShowNewMessageModal(false);
  };

  // Funciones de selección de mensajes
  const toggleMessageSelection = (conversationId: string) => {
    setSelectedMessages(prev => 
      prev.includes(conversationId) 
        ? prev.filter(id => id !== conversationId)
        : [...prev, conversationId]
    );
  };

  const selectAllMessages = () => {
    if (selectedMessages.length === conversations.length) {
      setSelectedMessages([]);
    } else {
      setSelectedMessages(conversations.map(c => c.id));
    }
  };

  const selectNone = () => {
    setSelectedMessages([]);
  };

  // Función para eliminar conversaciones seleccionadas
  const deleteSelectedMessages = async () => {
    if (selectedMessages.length === 0) return;
    
    try {
      // Eliminar las conversaciones seleccionadas
      const deletePromises = selectedMessages.map(id => 
        privateMessagesService.deleteConversation(id)
      );
      
      await Promise.all(deletePromises);
      
      // Limpiar selección y recargar conversaciones
      setSelectedMessages([]);
      await loadConversations();
      
      toast({
        title: "Conversaciones eliminadas",
        description: `Se eliminaron ${selectedMessages.length} conversaciones.`,
      });
    } catch (error) {
      console.error('Error deleting conversations:', error);
      toast({
        title: "Error",
        description: "No se pudieron eliminar las conversaciones.",
        variant: "destructive",
      });
    }
  };

  // Funciones de utilidad
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      return `${date.getDate()} de ${date.toLocaleDateString('es-ES', { month: 'short' })}, ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return `${date.getDate()} de ${date.toLocaleDateString('es-ES', { month: 'short' })}, ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
    }
  };

  const truncateMessage = (message: string, maxLength: number = 50): string => {
    if (!message || message.trim() === '') {
      return 'Sin mensajes'
    }
    return message.length > maxLength ? `${message.substring(0, maxLength)}...` : message
  };

  const getSectionTitle = () => 'Mensajes';
  const getSectionIcon = () => <Inbox className="w-4 h-4" />;

  // Obtener conversaciones paginadas
  const getPaginatedConversations = () => {
    const itemsPerPage = 10;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return conversations.slice(startIndex, endIndex);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="text-center py-8">
            <div className="text-gray-500">Cargando mensajes...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="text-center py-8">
            <div className="text-gray-500">Debes iniciar sesión para ver los mensajes.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Vista de chat individual */}
        {showChatView && selectedConversation ? (
          <div className="bg-white border border-gray-200 rounded-lg">
            {/* Header del chat con botón cerrar */}
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">
                Conversación con {selectedConversation.other_user?.first_name} {selectedConversation.other_user?.last_name}
              </h3>
              <button
                onClick={closeChatView}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Mensajes */}
            <div className="h-96 overflow-y-auto p-4 divide-y divide-gray-100">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 mt-8 text-sm">
                  No hay mensajes en esta conversación
                </div>
              ) : (
                messages.map((message) => {
                  const isOwnMessage = message.sender_id === currentUser?.id;
                  return (
                    <div
                      key={message.id}
                      className={`flex py-px first:pt-0 last:pb-0 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className="flex items-start max-w-xs lg:max-w-md">
                        {!isOwnMessage && (
                          <div className="w-6 h-6 bg-gray-300 overflow-hidden flex-shrink-0 mr-2">
                            {message.sender?.avatar_url ? (
                              <img
                                src={message.sender.avatar_url}
                                alt={`${message.sender.first_name} ${message.sender.last_name}`.trim()}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-400 flex items-center justify-center text-white font-semibold text-xs">
                                {message.sender?.first_name?.charAt(0).toUpperCase() || message.sender?.last_name?.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                        )}
                        <div className="flex flex-col">
                          {!isOwnMessage && (
                            <span className="text-xs text-gray-500 mb-px ml-8">
                              {`${message.sender?.first_name} ${message.sender?.last_name}`.trim()}
                            </span>
                          )}
                          <div
                            className={`px-3 py-1 text-sm rounded-none ${
                              isOwnMessage
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-200 text-gray-900 ml-8'
                            }`}
                          >
                            <p>{message.content}</p>
                            <p className={`text-xs mt-px ${
                              isOwnMessage ? 'text-blue-100' : 'text-gray-500'
                            }`}>
                              {formatDate(message.created_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Input de mensaje */}
            <div className="p-4 bg-gray-50">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Escribe tu mensaje..."
                  className="flex-1 px-3 py-2 border border-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className="text-white px-3 py-1 rounded border shadow-sm transition-all duration-200 flex items-center text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: 'linear-gradient(to bottom, #3b82f6 0%, #1e40af 100%)',
                    borderColor: '#1e3a8a',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                  }}
                >
                  Enviar
                  <ArrowUp className="w-3 h-3 ml-2" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Vista principal de lista de conversaciones */
          <div className="flex">
            {/* Sidebar izquierdo */}
            <div className="w-64 bg-white border-t border-r border-gray-200">
              <div className="p-4">
                <button
                  onClick={() => setShowNewMessageModal(true)}
                  className="flex items-center rounded-lg overflow-hidden border border-gray-300"
                  style={{
                    height: '32px',
                    minWidth: '140px',
                    background: '#fff',
                    padding: 0,
                    boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px, rgba(0, 0, 0, 0.1) 0px 1px 1px, inset 0px -1px 1px rgba(0, 0, 0, 0.15)'
                  }}
                >
                  <span
                    className="flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(180deg, #fbbf24 0%, #f59e0b 100%)',
                      width: '32px',
                      height: '32px',
                      borderRight: '1px solid rgba(0,0,0,0.1)',
                      boxShadow: 'inset 0px -1px 0px rgba(0,0,0,0.15)'
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  </span>
                  <span 
                    className="flex-1 text-gray-800 text-sm font-normal pl-3 pr-4 whitespace-nowrap overflow-hidden text-ellipsis"
                    style={{
                      background: 'linear-gradient(180deg, #ffffff 0%, #f9fafb 100%)',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      boxShadow: 'inset 0px -1px 0px rgba(0,0,0,0.08)'
                    }}
                  >
                    Escribir nuevo mensaje
                  </span>
                </button>
              </div>
              
              {/* Navegación */}
              <nav className="p-2">
                <button
                  className="w-full flex items-center px-3 py-2 text-left bg-blue-50 text-blue-600"
                >
                  {getSectionIcon()}
                  <span className="ml-2">Mensajes</span>
                </button>
              </nav>
            </div>

            {/* Contenido principal */}
            <div className="flex-1 bg-white border-t border-gray-200">
              {/* Título */}
              <div className="p-4 border-b border-gray-200">
                <h1 className="text-xl font-semibold text-gray-900">{getSectionTitle()}</h1>
              </div>
              
              {/* Controles */}
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-600">Seleccionar:</span>
                    <button 
                      onClick={selectAllMessages}
                      className="text-sm text-blue-600 hover:text-blue-800 underline"
                    >
                      Todos
                    </button>
                    <button 
                      onClick={selectNone}
                      className="text-sm text-blue-600 hover:text-blue-800 underline"
                    >
                      Ninguno
                    </button>
                    <button
                      onClick={deleteSelectedMessages}
                      disabled={selectedMessages.length === 0}
                      className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4 inline mr-1" />
                      Borrar seleccionados ({selectedMessages.length})
                    </button>
                  </div>
                  
                  {/* Paginación */}
                  <div className="flex items-center space-x-1">
                    <span className="text-sm text-gray-600 mr-2">{currentPage} de {totalPages}</span>
                    <button 
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="px-2 py-1 border border-gray-300 hover:bg-gray-100 text-lg font-bold disabled:opacity-50"
                    >
                      ‹‹
                    </button>
                    <button 
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="px-2 py-1 border border-gray-300 hover:bg-gray-100 text-lg font-bold disabled:opacity-50"
                    >
                      ‹
                    </button>
                    <button 
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="px-2 py-1 border border-gray-300 hover:bg-gray-100 text-lg font-bold disabled:opacity-50"
                    >
                      ›
                    </button>
                    <button 
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="px-2 py-1 border border-gray-300 hover:bg-gray-100 text-lg font-bold disabled:opacity-50"
                    >
                      ››
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Lista de conversaciones */}
              <div className="divide-y divide-gray-200">
                {conversations.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    No hay mensajes
                  </div>
                ) : (
                  getPaginatedConversations().map((conversation) => (
                    <div
                      key={conversation.id}
                      className={`flex items-center p-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedConversation?.id === conversation.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <input 
                        type="checkbox" 
                        checked={selectedMessages.includes(conversation.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleMessageSelection(conversation.id);
                        }}
                        className="mr-3" 
                      />
                      
                      <div 
                        onClick={() => openChatView(conversation)}
                        className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium text-gray-900 truncate">
  {conversation.other_user?.first_name} {conversation.other_user?.last_name}
</h3>
{conversation.unread_count > 0 && (
  <span className="bg-green-500 text-white text-xs rounded-full px-2 py-1 ml-2">
    {conversation.unread_count}
  </span>
)}
                          </div>
                          <p className="text-sm text-gray-500 truncate">
                            {conversation.last_message ? truncateMessage(conversation.last_message) : 'Sin mensajes'}
                          </p>
                          {conversation.last_message_at && (
                            <p className="text-xs text-gray-400">
                              {formatDate(conversation.last_message_at)}
                            </p>
                          )}
                        </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal para nuevo mensaje */}
      {showNewMessageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            {/* Header del modal */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Enviar nuevo mensaje</h2>
              <button
                onClick={resetNewMessageModal}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Contenido del modal */}
            <div className="p-4 space-y-4">
              {/* Campo Destinatario */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Destinatario
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchUsers}
                    onChange={(e) => handleUserSearch(e.target.value)}
                    placeholder="Buscar usuario..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                  
                  {/* Usuario seleccionado */}
                  {selectedUser && (
                    <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md flex items-center justify-between">
                      <span className="text-sm text-blue-800">{`${selectedUser.first_name} ${selectedUser.last_name}`.trim()}</span>
                      <button
                        onClick={() => {
                          setSelectedUser(null);
                          setSearchUsers('');
                        }}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  
                  {/* Resultados de búsqueda */}
                  {foundUsers.length > 0 && !selectedUser && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
                      {foundUsers.map((user) => (
                        <button
                          key={user.id}
                          onClick={() => handleUserSelect(user)}
                          className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                        >
                          {`${user.first_name} ${user.last_name}`.trim()}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {/* No se encontraron resultados */}
                  {searchUsers.trim() && foundUsers.length === 0 && !isSearchingUsers && !selectedUser && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                      <div className="px-3 py-2 text-sm text-gray-500">
                        No se han encontrado resultados
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Campo Mensaje */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Mensaje
                </label>
                <textarea
                  value={newMessageContent}
                  onChange={(e) => setNewMessageContent(e.target.value)}
                  placeholder="Escribe tu mensaje..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>
            </div>

            {/* Footer del modal */}
            <div className="p-4 border-t border-gray-200 flex justify-end space-x-2">
              <button
                onClick={resetNewMessageModal}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSendNewMessage}
                disabled={!selectedUser || !newMessageContent.trim()}
                className="text-white px-3 py-1 rounded border shadow-sm transition-all duration-200 flex items-center text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: 'linear-gradient(to bottom, #3b82f6 0%, #1e40af 100%)',
                  borderColor: '#1e3a8a',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                }}
              >
                Enviar
                <ArrowUp className="w-3 h-3 ml-2" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Messages;


