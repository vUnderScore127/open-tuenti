import { createContext, useContext, useState, ReactNode, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { getSupabaseConfig } from '@/lib/config';

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

  // Inicializar audio apuntando al archivo en public/audio
  useEffect(() => {
    const base = import.meta.env.BASE_URL || '/';
    const src = `${base}audio/notification_sound.wav`;
    audioRef.current = new Audio(src);
    audioRef.current.volume = 1.0;
    audioRef.current.preload = 'auto';
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

  // Desconexión fiable usando eventos de visibilidad y pagehide con keepalive
  useEffect(() => {
    if (!currentUser?.id) return;

    const { url, anonKey } = getSupabaseConfig();

    const sendOfflineKeepalive = async () => {
      try {
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;

        const endpoint = `${url}/rest/v1/profiles?id=eq.${currentUser.id}`;
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'apikey': anonKey,
        };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        await fetch(endpoint, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ is_online: false }),
          keepalive: true,
        });
      } catch (e) {
        // Silently ignore; browser may terminate the request during navigation
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        sendOfflineKeepalive();
      }
    };

    const onPageHide = () => {
      sendOfflineKeepalive();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', onPageHide);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', onPageHide);
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
    if (!isOnline || !soundEnabled) return;
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(error => {
      console.error('Error reproduciendo sonido:', error);
    });
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