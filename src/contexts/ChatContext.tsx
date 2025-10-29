import { createContext, useContext, useState, ReactNode, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

interface ChatContextType {
  isOnline: boolean;
  soundEnabled: boolean;
  setOnlineStatus: (status: boolean) => void;
  setSoundEnabled: (enabled: boolean) => void;
  playNotificationSound: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
};

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const { user: currentUser } = useAuth();
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabledState] = useState(() => {
    const saved = localStorage.getItem('chatSoundEnabled');
    return saved ? JSON.parse(saved) : true;
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Inicializar audio con la ruta correcta
  useEffect(() => {
    audioRef.current = new Audio(`${import.meta.env.BASE_URL}audio/notification_sound.wav`);
    audioRef.current.volume = 1.0;
  }, []);

  // Función para inicializar el estado online del usuario
  const initializeOnlineStatus = async () => {
    if (currentUser?.id) {
      try {
        console.log('🟢 Inicializando estado online para:', currentUser.id);
        const { error } = await supabase
          .from('profiles')
          .update({ is_online: true })
          .eq('id', currentUser.id);
        
        if (error) throw error;
        setIsOnline(true);
      } catch (error) {
        console.error('Error al inicializar estado online:', error);
      }
    }
  };

  useEffect(() => {
    if (!currentUser?.id) return;
    
    initializeOnlineStatus();
  }, [currentUser?.id]);

  // Persistir configuración de sonido
  useEffect(() => {
    localStorage.setItem('chatSoundEnabled', JSON.stringify(soundEnabled));
  }, [soundEnabled]);

  // TODO: is_online field doesn't exist in database - temporarily disabled
  // // Manejar desconexión SOLO al cerrar página
  useEffect(() => {
    if (!currentUser?.id) return;
  
    const handleDisconnect = async () => {
      console.log('🔌 Desconectando usuario:', currentUser.id);
      await supabase
        .from('profiles')
        .update({ is_online: false })
        .eq('id', currentUser.id);
    };
    
    // Solo se desconecta al cerrar la página/pestaña
    window.addEventListener('beforeunload', handleDisconnect);
    
    return () => {
      window.removeEventListener('beforeunload', handleDisconnect);
    };
  }, [currentUser?.id]);

  const setOnlineStatus = async (status: boolean) => {
    if (currentUser?.id) {
      try {
        console.log('🔄 Cambiando estado online a:', status);
        const { error } = await supabase
          .from('profiles')
          .update({ is_online: status })
          .eq('id', currentUser.id);
        
        if (error) throw error;
        setIsOnline(status);
      } catch (error) {
        console.error('Error al cambiar estado online:', error);
      }
    }
  };

  const setSoundEnabled = (enabled: boolean) => {
    setSoundEnabledState(enabled);
  };

  const playNotificationSound = () => {
    // Reproducir sonido siempre que esté habilitado y el usuario esté online
    if (audioRef.current && isOnline && soundEnabled) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(error => {
        console.error('Error reproduciendo sonido:', error);
      });
    }
  };

  return (
    <ChatContext.Provider value={{
      isOnline,
      soundEnabled,
      setOnlineStatus,
      setSoundEnabled,
      playNotificationSound
    }}>
      {children}
    </ChatContext.Provider>
  );
};