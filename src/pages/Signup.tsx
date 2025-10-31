import React, { useEffect, useState } from 'react'
import { useLocation, useHistory } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { supabase, verifyInvitationToken, acceptInvitation } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import '../styles/tuenti-signup.css'

export default function Signup() {
  const location = useLocation()
  const history = useHistory()
  const { user } = useAuth()
  const { toast } = useToast()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [inviteStatus, setInviteStatus] = useState<'pending' | 'revoked' | 'expired' | 'accepted' | null>(null)
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const t = params.get('token')
    setToken(t)
    if (t) {
      verifyInvitationToken(t)
        .then(inv => {
          if (inv) {
            setEmail(inv.email || '')
            setInviteStatus(inv.status as any)
          } else {
            setInviteStatus('revoked')
          }
        })
        .catch(() => setInviteStatus('revoked'))
    }
  }, [location.search])

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      toast({ title: 'Error', description: 'Las contraseñas no coinciden', variant: 'destructive' })
      return
    }
    if (!email || !password) {
      toast({ title: 'Error', description: 'Email y contraseña son obligatorios', variant: 'destructive' })
      return
    }
    setLoading(true)
    try {
      const emailRedirectTo = token
        ? `${window.location.origin}${import.meta.env.BASE_URL}invite/${token}`
        : `${window.location.origin}${import.meta.env.BASE_URL}login`

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo }
      })
      if (error) throw error

      // Si ya hay sesión (por ejemplo, confirmación desactivada), crear perfil e intentar aceptar invitación
      if (data.session && data.user) {
        const userId = data.user.id
        // Solo almacenamos id y email; no usamos username en el esquema
        await supabase.from('profiles').upsert({ id: userId, email }, { onConflict: 'id' })
        if (token && inviteStatus === 'pending') {
          await acceptInvitation(token)
        }
        toast({ title: 'Registro completado', description: 'Tu cuenta ha sido creada.' })
        history.push('/dashboard')
        return
      }

      // Si requiere verificación por email
      toast({
        title: 'Verifica tu email',
        description: 'Te hemos enviado un enlace de confirmación. Al confirmarlo volverás a la invitación para finalizar el acceso.',
      })
    } catch (err: any) {
      toast({ title: 'Error al registrarte', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const disabledEmail = Boolean(token)
  // Fuerza booleano: si no hay invitación, no está inválida
  const inviteInvalid = inviteStatus ? inviteStatus !== 'pending' : false

  return (
    <div className="signup-page">
      <div className="signup">
        <h1 className="title">Crear cuenta</h1>

        {inviteInvalid && (
          <div className="notice">
            Esta invitación no es válida o ha expirado.
          </div>
        )}

        <form onSubmit={handleSignup} className="form">
          <div className="form-row">
            <div className="input-group">
              <label className="field-label">Email</label>
              {/* Forzamos estilos clásicos sobre el input */}
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="field-input"
                required
                disabled={disabledEmail}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="input-group">
              <label className="field-label">Contraseña</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="field-input"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="input-group">
              <label className="field-label">Confirmar contraseña</label>
              <Input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="field-input"
                required
              />
            </div>
          </div>

          <div className="form-row" style={{ justifyContent: 'flex-end' }}>
            <button type="submit" className="submit" disabled={loading || inviteInvalid}>
              {loading ? 'Creando cuenta…' : 'Registrarme'}
            </button>
          </div>
        </form>

        {user && (
          <div className="hint">
            Ya has iniciado sesión.
          </div>
        )}
      </div>
    </div>
  )
}
