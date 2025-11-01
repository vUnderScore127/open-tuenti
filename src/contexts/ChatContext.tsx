import { createContext, useContext, useState, ReactNode, useRef, useEffect } from 'react';
import { dbg, group } from '@/lib/debug';
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
  const lastUserIdRef = useRef<string | null>(null);
  const [soundEnabled, setSoundEnabledState] = useState(() => {
    const saved = localStorage.getItem('chatSoundEnabled');
    return saved ? JSON.parse(saved) : true;
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);

  dbg('ChatContext', 'render', { userId: currentUser?.id, isOnline, soundEnabled });

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
        dbg('ChatContext', 'initializeOnlineStatus:start', currentUser.id);
        const { error } = await supabase
          .from('profiles')
          .update({ is_online: true })
          .eq('id', currentUser.id);
        
        if (error) throw error;
        setIsOnline(true);
        dbg('ChatContext', 'initializeOnlineStatus:done', currentUser.id);
      } catch (error) {
        dbg('ChatContext', 'initializeOnlineStatus:error', error);
      }
    }
  };

  useEffect(() => {
    const prev = lastUserIdRef.current;
    const next = currentUser?.id || null;
    (async () => {
      // Si el usuario anterior existe y cambió (o se desconectó), marcarlo offline
      if (prev && (!next || prev !== next)) {
        try {
          await supabase
            .from('profiles')
            .update({ is_online: false })
            .eq('id', prev);
        } catch (_) {}
        setIsOnline(false);
      }
      lastUserIdRef.current = next;
      if (next) {
        await initializeOnlineStatus();
      }
    })();
  }, [currentUser?.id]);

  // Persistir configuración de sonido
  useEffect(() => {
    localStorage.setItem('chatSoundEnabled', JSON.stringify(soundEnabled));
  }, [soundEnabled]);

  // Manejar desconexión SOLO al cerrar página
  useEffect(() => {
    if (!currentUser?.id) return;

    const handleDisconnect = async () => {
      try {
        dbg('ChatContext', 'beforeunload:disconnect', currentUser.id);
        await supabase
          .from('profiles')
          .update({ is_online: false })
          .eq('id', currentUser.id);
      } catch (e) {
        // Ignorar errores durante navegación/cierre
      }
    };

    // Solo se desconecta al cerrar la página/pestaña
    window.addEventListener('beforeunload', handleDisconnect);
    window.addEventListener('pagehide', handleDisconnect);

    return () => {
      window.removeEventListener('beforeunload', handleDisconnect);
      window.removeEventListener('pagehide', handleDisconnect);
    };
  }, [currentUser?.id]);

  // Actualizar inmediatamente el estado online al cambiar el estado de auth
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (event === 'SIGNED_OUT') {
          const prev = lastUserIdRef.current || session?.user?.id || null;
          if (prev) {
            try {
              await supabase
                .from('profiles')
                .update({ is_online: false })
                .eq('id', prev);
            } catch (_) {}
            setIsOnline(false);
          }
        } else if (event === 'SIGNED_IN') {
          const id = session?.user?.id || null;
          if (id) {
            try {
              await supabase
                .from('profiles')
                .update({ is_online: true })
                .eq('id', id);
            } catch (_) {}
            setIsOnline(true);
          }
        }
      } catch {}
    });
    return () => subscription.unsubscribe();
  }, []);

  // Eliminado: no enviar cambios de estado al perder visibilidad para evitar "refrescos" al cambiar de pestaña
  // La desconexión se gestiona con beforeunload y el toggle manual.

  const setOnlineStatus = async (status: boolean) => {
    group.start('ChatContext:setOnlineStatus', { status, userId: currentUser?.id });
    const prev = isOnline;
    // Actualizar UI inmediatamente para reflejar el estado seleccionado
    setIsOnline(status);
    if (currentUser?.id) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ is_online: status })
          .eq('id', currentUser.id);
        if (error) throw error;
        group.end();
      } catch (error) {
        // Si falla la actualización en DB, mantener la UI coherente revirtiendo el estado
        dbg('ChatContext', 'setOnlineStatus:error', error);
        setIsOnline(prev);
        group.end();
      }
    } else {
      group.end();
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