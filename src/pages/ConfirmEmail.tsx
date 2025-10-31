import React, { useMemo, useState } from 'react'
import { useLocation, useHistory } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import '../styles/tuenti-login.css'

function useQuery() {
  const { search } = useLocation()
  return useMemo(() => new URLSearchParams(search), [search])
}

export default function ConfirmEmail() {
  const query = useQuery()
  const history = useHistory()
  const { toast } = useToast()
  const [sending, setSending] = useState(false)

  const email = query.get('email') || ''
  const token = query.get('token') || ''

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
    <div className="need-invite-container">
      <div className="need-invite-panel">
        <div className="need-invite-logo" aria-label="Tuenti" />
        <h1 className="need-invite-title">Confirma tu email para crear tu cuenta</h1>
        <p className="need-invite-description">
          Te hemos enviado un correo de confirmación{email ? ` a ${email}` : ''}. Abre ese correo y pulsa el enlace para activar tu cuenta.
          {token ? ' Tras confirmar te devolveremos a la invitación para finalizar el acceso.' : ''}
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

        <div className="need-invite-button-container" style={{ gap: 12, display: 'flex', justifyContent: 'center' }}>
          <Button className="need-invite-button" onClick={handleResend} disabled={sending}>
            {sending ? 'Reenviando…' : 'Reenviar correo de confirmación'}
          </Button>
          <Button variant="outline" onClick={goBack}>Volver al login</Button>
        </div>
      </div>
    </div>
  )
}