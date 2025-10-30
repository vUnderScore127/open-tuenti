import React, { useEffect, useState } from 'react'
import { useLocation, useHistory } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { supabase, verifyInvitationToken, acceptInvitation } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'

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
        await supabase.from('profiles').upsert({ id: userId, email })
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
  const inviteInvalid = inviteStatus && inviteStatus !== 'pending'

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="w-full max-w-md border border-gray-200 p-6">
        <h1 className="text-xl font-semibold mb-4">Crear cuenta</h1>

        {inviteInvalid && (
          <div className="text-red-600 text-sm mb-4">
            Esta invitación no es válida o ha expirado.
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={disabledEmail}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">Contraseña</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">Confirmar contraseña</label>
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>

          <Button type="submit" disabled={loading || inviteInvalid} className="w-full">
            {loading ? 'Creando cuenta…' : 'Registrarme'}
          </Button>
        </form>

        {user && (
          <div className="text-xs text-gray-500 mt-4">
            Ya has iniciado sesión.
          </div>
        )}
      </div>
    </div>
  )
}
