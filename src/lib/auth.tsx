import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from './supabase'
import type { User } from '@supabase/supabase-js'
import { useAlert } from '@/contexts/AlertContext'

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const { showAlert } = useAlert()
  const [profileEnsuredUid, setProfileEnsuredUid] = useState<string | null>(null)

  const MAX_SESSION_AGE_MS = 5 * 24 * 60 * 60 * 1000 // 5 días
  const BASE_URL = (import.meta as any).env?.BASE_URL || import.meta.env.BASE_URL || '/'

  const redirectToLogin = () => {
    const loginPath = `${BASE_URL}login`
    try {
      // Preferir router si está disponible
      window.location.assign(loginPath)
    } catch {
      window.location.href = loginPath
    }
  }

  useEffect(() => {
    console.log('🔐 AuthProvider: Iniciando verificación de sesión');
    supabase.auth.getSession().then(({ data, error }) => {
      console.log('🔐 AuthProvider: Sesión obtenida:', { data, error });
      if (error && (error as any)?.message?.toLowerCase().includes('invalid refresh token')) {
        // Sesión inválida: forzar sign out para limpiar estado y evitar bucles de refresco
        showAlert('Tu sesión ha caducado. Vuelve a iniciar sesión.')
        supabase.auth.signOut().then(() => redirectToLogin()).catch(() => redirectToLogin())
      }
      const session = data?.session
      console.log('🔐 AuthProvider: Usuario de la sesión:', session?.user);
      // Inicializar o comprobar antigüedad de la sesión
      if (session?.user) {
        const key = 'lastAuthAt'
        const stored = localStorage.getItem(key)
        const now = Date.now()
        if (!stored) {
          localStorage.setItem(key, String(now))
        } else {
          const age = now - Number(stored)
          if (age > MAX_SESSION_AGE_MS) {
            showAlert('Tu sesión ha caducado por seguridad (5 días).')
            supabase.auth.signOut().then(() => redirectToLogin()).catch(() => redirectToLogin())
          }
        }
      }
      setUser(session?.user || null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔐 AuthProvider: Cambio de estado de auth:', { event, user: session?.user });
      // Si el SDK nos notifica que se cerró sesión, reflejarlo en UI
      if (event === 'SIGNED_OUT') {
        console.log('🔐 AuthProvider: Usuario desconectado');
        setUser(null)
      } else {
        console.log('🔐 AuthProvider: Estableciendo usuario:', session?.user);
        setUser(session?.user || null)
      }
      // Actualizar marca temporal al iniciar sesión
      if (event === 'SIGNED_IN' && session?.user) {
        localStorage.setItem('lastAuthAt', String(Date.now()))
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Asegurar que exista un perfil para el usuario autenticado (centralizado)
  useEffect(() => {
    const ensureProfileExists = async (uid: string, email?: string | null) => {
      // Evitar repetir para el mismo usuario en esta sesión
      if (profileEnsuredUid === uid) return
      try {
        const { data: row, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', uid)
          .maybeSingle()
        if (!error && row && row.id) {
          setProfileEnsuredUid(uid)
          return
        }
        // Crear perfil mínimo autorizado por RLS (id = auth.uid())
        const payload: any = { id: uid }
        if (email) payload.email = email
        const { error: insErr } = await supabase
          .from('profiles')
          .insert(payload)
        if (insErr) {
          console.warn('AuthProvider: error creando perfil mínimo', insErr)
        } else {
          console.debug('AuthProvider: perfil mínimo creado para', uid)
        }
      } catch (e) {
        console.warn('AuthProvider: excepción asegurando perfil', e)
      } finally {
        setProfileEnsuredUid(uid)
      }
    }

    if (user?.id) {
      // Ejecutar sin bloquear la UI
      ensureProfileExists(user.id, (user as any)?.email || null)
    }
  }, [user?.id])

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    if (error) throw error
  }

  const signOut = async () => {
    console.log('🔐 signOut: Iniciando proceso de logout');
    try {
      // Marcar offline ANTES de cerrar sesión, para que se propague al instante
      const uid = user?.id || (await supabase.auth.getUser()).data?.user?.id || null
      console.log('🔐 signOut: UID para marcar offline:', uid);
      if (uid) {
        try {
          await supabase.from('profiles').update({ is_online: false }).eq('id', uid)
          console.log('🔐 signOut: Usuario marcado como offline');
        } catch (e) {
          console.warn('Error marcando offline:', e);
        }
      }
    } finally {
      console.log('🔐 signOut: Limpiando localStorage y estado');
      // Limpiar localStorage
      localStorage.removeItem('lastAuthAt');
      
      // Cerrar sesión en Supabase
      console.log('🔐 signOut: Cerrando sesión en Supabase');
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('❌ Error en supabase.auth.signOut:', error);
        throw error;
      }
      
      console.log('🔐 signOut: Sesión cerrada, actualizando estado local');
      // Forzar actualización del estado local
      setUser(null);
      setProfileEnsuredUid(null);
      console.log('🔐 signOut: Proceso completado');
    }
  }

  return (
   <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
  {children ?? null}
</AuthContext.Provider>
  )
}

export const authService = {
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) throw error
    return data
  },

  async signOut() {
    try {
      const uid = (await supabase.auth.getUser()).data?.user?.id || null
      if (uid) {
        try { await supabase.from('profiles').update({ is_online: false }).eq('id', uid) } catch (_) {}
      }
    } finally {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    }
  },

  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) throw error
  }
}