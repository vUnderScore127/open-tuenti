import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

type AlertMessage = {
  id?: string
  message: string
}

type AlertState = {
  visible: boolean
  message: string | null
}

type AlertContextType = {
  showAlert: (msg: string) => void
  closeAlert: () => void
  state: AlertState
}

const AlertContext = createContext<AlertContextType | undefined>(undefined)

export const useAlert = () => {
  const ctx = useContext(AlertContext)
  if (!ctx) throw new Error('useAlert must be used within AlertProvider')
  return ctx
}

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AlertState>({ visible: false, message: null })
  const timerRef = useRef<number | null>(null)

  const closeAlert = useCallback(() => {
    setState((s) => ({ ...s, visible: false }))
    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const showAlert = useCallback((msg: string) => {
    setState({ visible: true, message: msg })
    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => {
      setState((s) => ({ ...s, visible: false }))
      timerRef.current = null
    }, 5000)
  }, [])

  useEffect(() => {
    // Suscripción a eventos broadcast en el canal 'global-alerts'
    const channel = supabase
      .channel('global-alerts')
      .on('broadcast', { event: 'global_alert' }, (payload: any) => {
        const msg = payload?.payload?.message
        if (typeof msg === 'string' && msg.trim()) {
          showAlert(msg)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      if (timerRef.current) {
        window.clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [showAlert])

  const value: AlertContextType = { showAlert, closeAlert, state }
  return <AlertContext.Provider value={value}>{children}</AlertContext.Provider>
}