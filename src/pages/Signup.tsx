import React, { useEffect, useState } from 'react'
import { useLocation, useHistory } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { supabase, verifyInvitationToken, acceptInvitation } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import '../styles/tuenti-signup.css'
import '../styles/tuenti-login.css'
import '../styles/tuenti-forms.css'

export default function Signup() {
  const location = useLocation()
  const history = useHistory()
  const { user } = useAuth()
  const { toast } = useToast()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [country, setCountry] = useState('España')
  const [city, setCity] = useState('')
  const [dobDay, setDobDay] = useState('')
  const [dobMonth, setDobMonth] = useState('')
  const [dobYear, setDobYear] = useState('')
  const [gender, setGender] = useState<'male' | 'female' | ''>('')
  const [acceptTerms, setAcceptTerms] = useState(false)
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
    // Validaciones básicas del formulario clásico
    if (!firstName || !lastName || !email || !password || !confirm || !country || !city || !dobDay || !dobMonth || !dobYear || !gender) {
      toast({ title: 'Campos incompletos', description: 'Completa todos los campos del registro.', variant: 'destructive' })
      return
    }
    if (!acceptTerms) {
      toast({ title: 'Condiciones', description: 'Debes aceptar las condiciones de uso.', variant: 'destructive' })
      return
    }
    if (password !== confirm) {
      toast({ title: 'Error', description: 'Las contraseñas no coinciden', variant: 'destructive' })
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

  // El email debe ser editable incluso con token de invitación
  const disabledEmail = false
  // Fuerza booleano: si no hay invitación, no está inválida
  const inviteInvalid = inviteStatus ? inviteStatus !== 'pending' : false

  const days = Array.from({ length: 31 }, (_, i) => String(i + 1))
  const months = [
    'enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'
  ]
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 100 }, (_, i) => String(currentYear - 14 - i))

  return (
    <div className="nSplash">
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
              <label className="field-label">Nombre</label>
              <Input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="field-input" required />
            </div>
            <div className="input-group">
              <label className="field-label">Apellidos</label>
              <Input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className="field-input" required />
            </div>
          </div>
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
              <label className="field-label">País</label>
              <select className="field-input" value={country} onChange={(e) => setCountry(e.target.value)}>
                <option>España</option>
                <option>México</option>
                <option>Argentina</option>
                <option>Chile</option>
                <option>Colombia</option>
                <option>Perú</option>
                <option>Otro</option>
              </select>
            </div>
            <div className="input-group">
              <label className="field-label">Ciudad</label>
              <Input type="text" value={city} onChange={(e) => setCity(e.target.value)} className="field-input" />
            </div>
          </div>

          <div className="form-row">
            <div className="input-group">
              <label className="field-label">Fecha de nacimiento</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <select className="field-input" style={{ maxWidth: 80 }} value={dobDay} onChange={(e) => setDobDay(e.target.value)}>
                  <option value="">Día</option>
                  {days.map(d => (<option key={d} value={d}>{d}</option>))}
                </select>
                <select className="field-input" style={{ maxWidth: 140 }} value={dobMonth} onChange={(e) => setDobMonth(e.target.value)}>
                  <option value="">Mes</option>
                  {months.map(m => (<option key={m} value={m}>{m}</option>))}
                </select>
                <select className="field-input" style={{ maxWidth: 100 }} value={dobYear} onChange={(e) => setDobYear(e.target.value)}>
                  <option value="">Año</option>
                  {years.map(y => (<option key={y} value={y}>{y}</option>))}
                </select>
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="input-group">
              <label className="field-label">Sexo</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '6px 0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input type="radio" name="gender" value="male" checked={gender==='male'} onChange={() => setGender('male')} /> Hombre
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input type="radio" name="gender" value="female" checked={gender==='female'} onChange={() => setGender('female')} /> Mujer
                </label>
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="input-group">
              <label className="field-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} />
                Aceptas las Condiciones de uso y la Política de privacidad.
              </label>
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
              {loading ? 'Creando cuenta…' : 'Continuar'}
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
