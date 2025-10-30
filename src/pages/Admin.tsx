import { useEffect, useState } from 'react'
import { IonPage, IonContent } from '@ionic/react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { useAuth } from '@/lib/auth'
import { supabase, listInvitations, updateInvitationStatus, Invitation } from '@/lib/supabase'

type TabKey = 'usuarios' | 'moderacion' | 'reportes' | 'invitaciones'

const Admin: React.FC = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>('invitaciones')
  const [invites, setInvites] = useState<Invitation[]>([])
  const [loadingInvites, setLoadingInvites] = useState(false)

  useEffect(() => {
    const loadRole = async () => {
      try {
        const { data: authUser } = await supabase.auth.getUser()
        const uid = authUser?.user?.id || user?.id
        if (!uid) {
          setIsAdmin(false)
          return
        }
        const { data } = await supabase
          .from('profiles')
          .select('role, is_admin')
          .eq('id', uid)
          .single()
        const role = (data as any)?.role
        const flag = Boolean((data as any)?.is_admin)
        setIsAdmin(role === 'admin' || flag)
      } catch (e) {
        setIsAdmin(false)
      } finally {
        setLoading(false)
      }
    }
    loadRole()
  }, [user?.id])

  useEffect(() => {
    const loadInvites = async () => {
      if (!isAdmin || activeTab !== 'invitaciones') return
      setLoadingInvites(true)
      const rows = await listInvitations(100)
      setInvites(rows)
      setLoadingInvites(false)
    }
    loadInvites()
  }, [isAdmin, activeTab])

  const revoke = async (id: string) => {
    const ok = await updateInvitationStatus(id, 'revoked')
    if (ok) setInvites(prev => prev.map(i => i.id === id ? { ...i, status: 'revoked' } : i))
  }

  return (
    <IonPage>
      <Header />
      <IonContent className="ion-padding">
        <div className="dashboard-main-content" style={{ padding: 16 }}>
          <h2 style={{ marginBottom: 12 }}>Zona de administración</h2>
          {loading && <div>Cargando permisos…</div>}
          {!loading && !isAdmin && (
            <div style={{ color: '#b91c1c' }}>
              No tienes permisos para acceder a esta zona.
            </div>
          )}
          {!loading && isAdmin && (
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <button className={`dashboard-nav-item ${activeTab==='usuarios'?'active':''}`} onClick={() => setActiveTab('usuarios')}>Usuarios</button>
                <button className={`dashboard-nav-item ${activeTab==='moderacion'?'active':''}`} onClick={() => setActiveTab('moderacion')}>Moderación</button>
                <button className={`dashboard-nav-item ${activeTab==='reportes'?'active':''}`} onClick={() => setActiveTab('reportes')}>Reportes</button>
                <button className={`dashboard-nav-item ${activeTab==='invitaciones'?'active':''}`} onClick={() => setActiveTab('invitaciones')}>Invitaciones</button>
              </div>
              {activeTab === 'usuarios' && (
                <div>Gestión de usuarios (pendiente de implementación)</div>
              )}
              {activeTab === 'moderacion' && (
                <div>Zona de moderación (pendiente de implementación)</div>
              )}
              {activeTab === 'reportes' && (
                <div>Reportes y sanciones (pendiente de implementación)</div>
              )}
              {activeTab === 'invitaciones' && (
                <div>
                  <h3 style={{ marginBottom: 8 }}>Generar invitaciones por email</h3>
                  <p style={{ fontSize: 12, color: '#666' }}>Desde aquí podrás crear tokens y enviar emails (requiere Edge Function).</p>
                  <div style={{ marginTop: 16 }}>
                    <h4>Invitaciones recientes</h4>
                    {loadingInvites && <div>Cargando invitaciones…</div>}
                    {!loadingInvites && invites.length === 0 && <div>No hay invitaciones.</div>}
                    {!loadingInvites && invites.length > 0 && (
                      <table style={{ width: '100%', fontSize: 14 }}>
                        <thead>
                          <tr>
                            <th style={{ textAlign: 'left' }}>Email</th>
                            <th>Estado</th>
                            <th>Creada</th>
                            <th>Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {invites.map(inv => (
                            <tr key={inv.id}>
                              <td style={{ textAlign: 'left' }}>{inv.email}</td>
                              <td style={{ textTransform: 'capitalize' }}>{inv.status}</td>
                              <td>{new Date(inv.created_at).toLocaleString()}</td>
                              <td>
                                <button disabled={inv.status !== 'pending'} onClick={() => revoke(inv.id)} className="dashboard-nav-item">Revocar</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
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

export default Admin
