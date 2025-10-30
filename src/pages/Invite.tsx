import { useEffect, useState } from 'react'
import { IonPage, IonContent } from '@ionic/react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { useParams, useHistory } from 'react-router-dom'
import { acceptInvitation, verifyInvitationToken } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'

interface RouteParams { token: string }

const Invite: React.FC = () => {
  const { token } = useParams<RouteParams>()
  const history = useHistory()
  const [status, setStatus] = useState<'checking'|'valid'|'invalid'>('checking')
  const [email, setEmail] = useState<string>('')
  const [accepting, setAccepting] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    const checkToken = async () => {
      try {
        const inv = token ? await verifyInvitationToken(token) : null
        if (!inv || inv.status !== 'pending') {
          setStatus('invalid')
          return
        }
        setEmail(inv.email)
        setStatus('valid')
        // Si no está autenticado, redirigir a la página de registro con el token
        if (!user) {
          history.replace(`/signup?token=${token}`)
        }
      } catch (e) {
        setStatus('invalid')
      }
    }
    checkToken()
  }, [token])

  const handleAccept = async () => {
    if (!token || !user) return
    setAccepting(true)
    const res = await acceptInvitation(token)
    setAccepting(false)
    if (res) setAccepted(true)
  }

  return (
    <IonPage>
      <Header />
      <IonContent className="ion-padding">
        <div className="dashboard-main-content" style={{ padding: 16 }}>
          <h2 style={{ marginBottom: 12 }}>Invitación</h2>
          {status === 'checking' && <div>Verificando tu invitación…</div>}
          {status === 'invalid' && (
            <div style={{ color: '#b91c1c' }}>Esta invitación no es válida o ha expirado.</div>
          )}
          {status === 'valid' && (
            <div>
              <p>Invitación válida para: <strong>{email}</strong></p>
              {!user && (
                <div style={{ marginTop: 12 }}>
                  <p>Para aceptar la invitación, inicia sesión o regístrate.</p>
                  <a href={`${import.meta.env.BASE_URL}login`} className="tuenti-invite-button" style={{ marginRight: 8 }}>Iniciar sesión</a>
                  <a href={`${import.meta.env.BASE_URL}signup?token=${token}`} className="tuenti-invite-button">Registrarse</a>
                </div>
              )}
              {user && (
                <div style={{ marginTop: 12 }}>
                  <button onClick={handleAccept} className="tuenti-invite-button" disabled={accepting || accepted}>
                    {accepted ? 'Invitación aceptada' : (accepting ? 'Aceptando…' : 'Aceptar invitación')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </IonContent>
      <Footer />
    </IonPage>
  )
}

export default Invite
