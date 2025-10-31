import React, { useMemo, useState, useEffect } from 'react'
import { useLocation, useHistory } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import '../styles/tuenti-login.css'
import '../styles/tuenti-confirm.css'

function useQuery() {
  const { search } = useLocation()
  return useMemo(() => new URLSearchParams(search), [search])
}

export default function ConfirmEmail() {
  const query = useQuery()
  const history = useHistory()
  const { toast } = useToast()
  const [sending, setSending] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const email = query.get('email') || ''
  const token = query.get('token') || ''
  
  // Manejar tokens de confirmación de email que vienen en la URL
  useEffect(() => {
    const handleEmailConfirmation = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')
      const type = hashParams.get('type')
      
      if (accessToken && refreshToken && type === 'signup') {
        setConfirming(true)
        try {
          // Establecer la sesión con los tokens recibidos
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })
          
          if (error) throw error
          
          toast({ 
            title: 'Email confirmado', 
            description: 'Tu cuenta ha sido activada exitosamente.' 
          })
          
          // Redirigir al dashboard después de un breve delay
          setTimeout(() => {
            history.replace('/dashboard')
          }, 1500)
          
        } catch (err: any) {
          console.error('Error confirming email:', err)
          toast({ 
            title: 'Error de confirmación', 
            description: err.message || 'No se pudo confirmar el email.', 
            variant: 'destructive' 
          })
        } finally {
          setConfirming(false)
        }
      }
    }
    
    handleEmailConfirmation()
  }, [])

  const handleResend = async () => {
    if (!email) {
      toast({ title: 'Falta email', description: 'No se encontró el email para reenviar.', variant: 'destructive' })
      return
    }
    setSending(true)
    try {
      const { data, error } = await supabase.auth.resend({ type: 'signup', email })
      if (error) throw error
      toast({ title: 'Correo reenviado', description: `Hemos reenviado el correo de confirmación a ${email}.` })
    } catch (err: any) {
      toast({ title: 'Error al reenviar', description: err.message || 'No se pudo reenviar el correo.', variant: 'destructive' })
    } finally {
      setSending(false)
    }
  }

  const goBack = () => {
    history.replace('/login')
  }

  return (
    <div className="nSplash">
      <div className="need-invite-container">
      <div className="need-invite-panel">
        <div className="need-invite-logo" aria-label="Tuenti" />
        <h1 className="need-invite-title">
          {confirming ? 'Confirmando tu email...' : 'Confirma tu email para crear tu cuenta'}
        </h1>
        <p className="need-invite-description">
          {confirming ? (
            'Estamos procesando la confirmación de tu email. Serás redirigido automáticamente.'
          ) : (
            <>
              Te hemos enviado un correo de confirmación{email ? ` a ${email}` : ''}. Abre ese correo y pulsa el enlace para activar tu cuenta.
              {token ? ' Tras confirmar te devolveremos a la invitación para finalizar el acceso.' : ''}
            </>
          )}
        </p>

        <div className="need-invite-steps">
          <div className="step">
            <div className="step-number">1</div>
            <div className="step-text">Abre tu bandeja de email (revisa Spam si no lo ves).</div>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <div className="step-text">Localiza el correo de Tuenti y pulsa en «Confirmar mi email».</div>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <div className="step-text">Vuelve automáticamente a la web y continúa con tu invitación.</div>
          </div>
        </div>

        {!confirming && (
          <div className="need-invite-button-container" style={{ gap: 12, display: 'flex', justifyContent: 'center' }}>
            <Button className="need-invite-button rounded-full" onClick={handleResend} disabled={sending}>
              {sending ? 'Reenviando…' : 'Reenviar correo de confirmación'}
            </Button>
            <Button variant="outline" className="rounded-full need-invite-button-outline" onClick={goBack}>Volver a intentar</Button>
          </div>
        )}
      </div>
      </div>
    </div>
  )
}