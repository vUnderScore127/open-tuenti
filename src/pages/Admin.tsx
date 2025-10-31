import { useEffect, useState, useRef } from 'react'
import { IonPage, IonContent } from '@ionic/react'
import AdminHeader, { TabKey } from '@/components/AdminHeader'
import Footer from '@/components/Footer'
import { useAuth } from '@/lib/auth'
import { supabase, listInvitations, updateInvitationStatus, Invitation, searchProfiles, getExtendedUserProfile, updateUserProfile, getProfilesByIds, ExtendedUserProfile, createInvitation, listSupportTickets, updateSupportTicket, createSupportTicket, listPages, createPage, updatePage, deletePage, listEvents, createEvent, updateEvent, deleteEvent, listBlogPosts, createBlogPost, updateBlogPost, deleteBlogPost, generateConversationId, markMessagesAsRead } from '@/lib/supabase'
import { uploadPostImage } from '@/lib/storageService'
import '../styles/tuenti-forms.css'

// Usar el TabKey exportado por AdminHeader para evitar tipos duplicados

const Admin: React.FC = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey | null>(null)
  const [invites, setInvites] = useState<Invitation[]>([])
  const [loadingInvites, setLoadingInvites] = useState(false)
  const [inviteFilter, setInviteFilter] = useState<'todas'|'pendientes'|'aceptadas'|'revocadas'|'caducadas'>('todas')
  const [profileMap, setProfileMap] = useState<Record<string, any>>({})

  // Estado para gestión de usuarios
  const [userQuery, setUserQuery] = useState('')
  const [searchingUsers, setSearchingUsers] = useState(false)
  const [userResults, setUserResults] = useState<ExtendedUserProfile[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [selectedProfile, setSelectedProfile] = useState<ExtendedUserProfile | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviterType, setInviterType] = useState<'equipo'|'otro'>('equipo')
  const [inviterUserId, setInviterUserId] = useState<string | null>(null)
  const [inviterSearch, setInviterSearch] = useState('')
  const [inviterResults, setInviterResults] = useState<ExtendedUserProfile[]>([])
  const [creatingInvite, setCreatingInvite] = useState(false)
  const [inviterInviteCount, setInviterInviteCount] = useState<number | null>(null)
  const [inviteLink, setInviteLink] = useState('')
  
  // Estados para mostrar/ocultar secciones de invitaciones
  const [showCreateInvitation, setShowCreateInvitation] = useState(false)
  const [showManageInvitations, setShowManageInvitations] = useState(false)
  // Invitaciones: búsqueda por usuario
  const [inviteUserSearch, setInviteUserSearch] = useState('')
  const [inviteUserResults, setInviteUserResults] = useState<ExtendedUserProfile[]>([])
  const [inviteSelectedUserId, setInviteSelectedUserId] = useState<string | null>(null)
  const [inviteUserFilterMode, setInviteUserFilterMode] = useState<'todas'|'emitidas'|'para'>('todas')

  // Stats en directo
  const [statsLoading, setStatsLoading] = useState(false)
  const [stats, setStats] = useState({
    usersRegistered: 0,
    usersOnline: 0,
    usersSuspended: 0,
    photoCount: 0,
    messageCount: 0,
    reportsOpen: 0,
  })
  const [localTime, setLocalTime] = useState<Date>(new Date())

  // Moderación: reportes
  const [reportsLoading, setReportsLoading] = useState(false)
  const [reports, setReports] = useState<any[]>([])
  const [reportFilter, setReportFilter] = useState<'todos'|'pendientes'|'en_revision'|'resueltos'|'rechazados'>('pendientes')
  const [updatingReport, setUpdatingReport] = useState<string | null>(null)

  // Estados para ficha de moderación
  const [showModerationProfile, setShowModerationProfile] = useState(false)
  const [moderationUserId, setModerationUserId] = useState<string | null>(null)
  const [moderationUserProfile, setModerationUserProfile] = useState<ExtendedUserProfile | null>(null)
  const [userReports, setUserReports] = useState<any[]>([])
  const [userReportsLoading, setUserReportsLoading] = useState(false)

  useEffect(() => {
    const loadRole = async () => {
      try {
        const { data: authUser } = await supabase.auth.getUser()
        const uid = authUser?.user?.id || user?.id
        if (!uid) {
          setIsAdmin(false)
          return
        }
        // Prefer server-side check via RPC to avoid RLS recursion and ensure accuracy
        const { data: isAdminFlag, error: rpcError } = await supabase.rpc('is_admin')
        if (!rpcError && typeof isAdminFlag === 'boolean') {
          setIsAdmin(Boolean(isAdminFlag))
        } else {
          // Fallback: check role from own profile if RPC not available
          const { data } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', uid)
            .single()
          const role = (data as any)?.role
          setIsAdmin(role === 'admin')
        }
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
      // Enriquecer con nombres
      const ids: string[] = []
      rows.forEach(r => {
        if (r.invited_by) ids.push(r.invited_by)
        if (r.invited_user_id) ids.push(r.invited_user_id as string)
      })
      if (ids.length > 0) {
        const map = await getProfilesByIds(ids)
        setProfileMap(map)
      } else {
        setProfileMap({})
      }
      setLoadingInvites(false)
    }
    loadInvites()
  }, [isAdmin, activeTab])

  const revoke = async (id: string) => {
    const ok = await updateInvitationStatus(id, 'revoked')
    if (ok) setInvites(prev => prev.map(i => i.id === id ? { ...i, status: 'revoked' } : i))
  }

  // Búsqueda de usuarios
  const doSearchUsers = async () => {
    if (!isAdmin || !userQuery.trim()) { setUserResults([]); return }
    setSearchingUsers(true)
    const results = await searchProfiles(userQuery.trim(), 50)
    setUserResults(results)
    setSearchingUsers(false)
  }

  // Búsqueda en vivo con debounce
  useEffect(() => {
    const t = setTimeout(() => { doSearchUsers() }, 300)
    return () => clearTimeout(t)
  }, [userQuery])

  const loadSelectedProfile = async (uid: string) => {
    setSelectedUserId(uid)
    const prof = await getExtendedUserProfile(uid)
    setSelectedProfile(prof)
  }

  const saveSelectedProfile = async () => {
    if (!selectedUserId || !selectedProfile) return
    setSavingProfile(true)
    try {
      await updateUserProfile(selectedUserId, selectedProfile)
    } finally {
      setSavingProfile(false)
    }
  }

  // Búsqueda del emisor (otro usuario) para las invitaciones
  const doSearchInviter = async () => {
    const q = inviterSearch.trim()
    if (inviterType !== 'otro' || !q) { setInviterResults([]); return }
    const results = await searchProfiles(q, 20)
    setInviterResults(results)
  }
  // Búsqueda de usuario para invits
  const doSearchInviteUser = async () => {
    const q = inviteUserSearch.trim()
    if (!q) { setInviteUserResults([]); return }
    const results = await searchProfiles(q, 20)
    setInviteUserResults(results)
  }
  useEffect(() => {
    const t = setTimeout(() => { doSearchInviteUser() }, 300)
    return () => clearTimeout(t)
  }, [inviteUserSearch])
  useEffect(() => {
    const t = setTimeout(() => { doSearchInviter() }, 300)
    return () => clearTimeout(t)
  }, [inviterSearch, inviterType])

  // Contador de invitaciones del emisor para mostrar su cupo
  const refreshInviterCount = async (uid: string | null) => {
    if (!uid) { setInviterInviteCount(null); return }
    const { count } = await supabase
      .from('invitations')
      .select('*', { count: 'exact', head: true })
      .eq('invited_by', uid)
    setInviterInviteCount(count || 0)
  }
  useEffect(() => {
    const run = async () => {
      if (inviterType === 'otro') {
        refreshInviterCount(inviterUserId)
      } else {
        refreshInviterCount(null)
      }
    }
    run()
  }, [inviterType, inviterUserId])

  // Carga de estadísticas en directo (cuando no hay pestaña activa)
  const loadStats = async () => {
    try {
      setStatsLoading(true)
      const { count: regCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })

      const { count: onlineCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_online', true)

      let suspendedCount = 0
      try {
        const { count: suspCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'suspended')
        suspendedCount = suspCount || 0
      } catch {}

      let photoCount = 0
      try {
        const { count: pcount } = await supabase
          .from('photos')
          .select('*', { count: 'exact', head: true })
        photoCount = pcount || 0
      } catch {}

      const { count: msgCount } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })

      let reportsCount = 0
      try {
        const { count: rcount } = await supabase
          .from('reports')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending')
        reportsCount = rcount || 0
      } catch {}

      setStats({
        usersRegistered: regCount || 0,
        usersOnline: onlineCount || 0,
        usersSuspended: suspendedCount,
        photoCount,
        messageCount: msgCount || 0,
        reportsOpen: reportsCount,
      })
    } finally {
      setStatsLoading(false)
    }
  }

  useEffect(() => {
    if (!isAdmin || activeTab) return
    loadStats()
    const si = setInterval(loadStats, 10000)
    const ti = setInterval(() => setLocalTime(new Date()), 1000)
    return () => { clearInterval(si); clearInterval(ti) }
  }, [isAdmin, activeTab])

  const createInvite = async () => {
    const email = inviteEmail.trim()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return
    setCreatingInvite(true)
    try {
      let invitedBy: string | undefined
      if (inviterType === 'otro') {
        invitedBy = inviterUserId || undefined
      } else {
        invitedBy = undefined // Equipo tuenti
      }
      const newInv = await createInvitation(email, invitedBy)
      if (newInv) {
        try {
          await supabase.functions.invoke('send-invite', { body: { email: newInv.email, token: newInv.token } })
        } catch {}
        setInvites(prev => [newInv, ...prev])
        setInviteEmail('')
      }
    } finally {
      setCreatingInvite(false)
    }
  }

  const createInviteLinkOnly = async () => {
    // Para enlace sin email, permitir vacío usando placeholder
    const raw = inviteEmail.trim();
    const email = raw || 'link-only';
    setCreatingInvite(true);
    try {
      let invitedBy: string | undefined;
      if (inviterType === 'otro') {
        invitedBy = inviterUserId || undefined;
      } else {
        invitedBy = undefined; // Equipo tuenti
      }
      const newInv = await createInvitation(email, invitedBy);
      if (newInv) {
        // No enviar email: solo crear el enlace
        const url = `${window.location.origin}${import.meta.env.BASE_URL}invite/${newInv.token}`
        setInviteLink(url)
        try { await navigator.clipboard.writeText(url) } catch {}
        setInvites(prev => [newInv, ...prev]);
        setInviteEmail('');
      }
    } finally {
      setCreatingInvite(false);
    }
  }

  // Carga de reportes para moderación
  const loadReports = async () => {
    if (!isAdmin || activeTab !== 'moderacion') return
    setReportsLoading(true)
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)
      if (!error) setReports(data || [])
    } finally {
      setReportsLoading(false)
    }
  }
  useEffect(() => {
    if (activeTab === 'moderacion' && isAdmin) {
      loadReports()
    }
  }, [activeTab, isAdmin])

  const updateReportStatus = async (id: string, status: 'in_review'|'resolved'|'rejected') => {
    setUpdatingReport(id)
    try {
      let notes: string | undefined = undefined
      if (status === 'resolved' || status === 'rejected') {
        notes = window.prompt('Notas de resolución (opcional):') || undefined
      }
      const payload: any = { status, updated_at: new Date().toISOString() }
      if (notes) payload.resolution_notes = notes
      if (status === 'resolved') payload.resolved_at = new Date().toISOString()
      const { error } = await supabase
        .from('reports')
        .update(payload)
        .eq('id', id)
      if (!error) setReports(prev => prev.map(r => r.id === id ? { ...r, ...payload } : r))
    } finally {
      setUpdatingReport(null)
    }
  }

  // Funciones para ficha de moderación
  const loadModerationProfile = async (userId: string) => {
    setModerationUserId(userId)
    setShowModerationProfile(true)
    setUserReportsLoading(true)
    
    try {
      // Cargar perfil del usuario
      const profile = userResults.find(u => u.id === userId)
      if (profile) {
        setModerationUserProfile(profile)
      } else {
        // Si no está en los resultados, cargar desde la base de datos
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()
        if (data) setModerationUserProfile(data)
      }

      // Cargar todos los reportes relacionados con este usuario
      const { data: reportsData, error } = await supabase
        .from('reports')
        .select('*')
        .or(`reporter_id.eq.${userId},target_id.eq.${userId}`)
        .order('created_at', { ascending: false })
      
      if (!error) setUserReports(reportsData || [])
    } finally {
      setUserReportsLoading(false)
    }
  }

  const closeModerationProfile = () => {
    setShowModerationProfile(false)
    setModerationUserId(null)
    setModerationUserProfile(null)
    setUserReports([])
  }

  return (
    <IonPage>
      <AdminHeader activeTab={activeTab} onSelectTab={(t) => setActiveTab(t)} />
      <IonContent className="ion-padding">
        <div className="dashboard-main-content" style={{ padding: 16, maxWidth: 1200, margin: '0 auto' }}>
          <h2 style={{ marginBottom: 12 }}>Zona de administración</h2>
          {loading && <div>Cargando permisos…</div>}
          {!loading && !isAdmin && (
            <div style={{ color: '#b91c1c' }}>
              No tienes permisos para acceder a esta zona.
            </div>
          )}
          {!loading && isAdmin && (
            <div>
              {!activeTab && (
                <div>
                  <h3 style={{ marginBottom: 8 }}>Stats en directo</h3>
                  {statsLoading && <div>Cargando estadísticas…</div>}
                  {!statsLoading && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                      <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 12 }}>
                        <div style={{ fontSize: 12, color: '#666' }}>Usuarios registrados</div>
                        <div style={{ fontSize: 22, fontWeight: 600 }}>{stats.usersRegistered}</div>
                      </div>
                      <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 12 }}>
                        <div style={{ fontSize: 12, color: '#666' }}>Usuarios en línea</div>
                        <div style={{ fontSize: 22, fontWeight: 600 }}>{stats.usersOnline}</div>
                      </div>
                      <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 12 }}>
                        <div style={{ fontSize: 12, color: '#666' }}>Usuarios suspendidos</div>
                        <div style={{ fontSize: 22, fontWeight: 600 }}>{stats.usersSuspended}</div>
                      </div>
                      <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 12 }}>
                        <div style={{ fontSize: 12, color: '#666' }}>Fotos</div>
                        <div style={{ fontSize: 22, fontWeight: 600 }}>{stats.photoCount}</div>
                      </div>
                      <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 12 }}>
                        <div style={{ fontSize: 12, color: '#666' }}>Mensajes</div>
                        <div style={{ fontSize: 22, fontWeight: 600 }}>{stats.messageCount}</div>
                      </div>
                      <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 12 }}>
                        <div style={{ fontSize: 12, color: '#666' }}>Reportes sin responder</div>
                        <div style={{ fontSize: 22, fontWeight: 600 }}>{stats.reportsOpen}</div>
                        <div style={{ marginTop: 8 }}>
                          <button className="dashboard-nav-item" onClick={() => setActiveTab('moderacion')}>Ir a Moderación</button>
                        </div>
                      </div>
                    </div>
                  )}
                  <div style={{ marginTop: 12, fontSize: 12, color: '#666' }}>Hora local: {localTime.toLocaleString()}</div>
                </div>
              )}
              {activeTab === 'usuarios' && (
                <div>
                  <h3 style={{ marginBottom: 8 }}>Gestión de usuarios</h3>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    <div className="input-group" style={{ flex: 1 }}>
                      <label className="field-label">Buscar usuarios</label>
                      <input type="text" className="field-input" placeholder="Nombre, apellidos, email, teléfono o UUID" value={userQuery} onChange={e => setUserQuery(e.target.value)} />
                    </div>
                  </div>
                  {searchingUsers && <div>Buscando…</div>}
                  {!searchingUsers && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
                      <div>
                        <h4>Resultados</h4>
                        {userResults.length === 0 ? (
                          <div>Sin resultados</div>
                        ) : (
                          <ul style={{ maxHeight: 240, overflow: 'auto' }}>
                            {userResults.map(u => (
                              <li key={u.id} style={{ padding: 6, borderBottom: '1px solid #eee', cursor: 'pointer' }} onClick={() => loadSelectedProfile(u.id)}>
                                {(u.first_name || '') + ' ' + (u.last_name || '') || u.email || u.id}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div>
                        <h4>Editar usuario</h4>
                        {!selectedProfile ? (
                          <div>Selecciona un usuario para editar</div>
                        ) : (
                          (() => {
                            const [editTab, setEditTab] = [undefined as any, undefined as any]
                            return (
                              <div>
                                <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                                  {/* Mini-tabs para editar */}
                                  {['datos','perfil','demograficos','preferencias'].map(k => (
                                    <button key={k as string} className={`dashboard-nav-item ${(selectedProfile as any)._editTab===k ? 'active' : ''}`}
                                      onClick={() => setSelectedProfile({ ...(selectedProfile as any), _editTab: k })}>
                                      {k==='datos' ? 'Datos personales' : k==='perfil' ? 'Perfil' : k==='demograficos' ? 'Demográficos' : 'Preferencias'}
                                    </button>
                                  ))}
                                </div>
                                {/* Contenido según pestaña */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                  {/* Datos personales */}
                                  {((selectedProfile as any)._editTab ?? 'datos') === 'datos' && (
                                    <>
                                      <label className="input-group">
                                        <span className="field-label">Nombre</span>
                                        <input className="field-input" type="text" value={selectedProfile.first_name || ''} onChange={e => setSelectedProfile({ ...selectedProfile!, first_name: e.target.value })} />
                                      </label>
                                      <label className="input-group">
                                        <span className="field-label">Apellidos</span>
                                        <input className="field-input" type="text" value={selectedProfile.last_name || ''} onChange={e => setSelectedProfile({ ...selectedProfile!, last_name: e.target.value })} />
                                      </label>
                                      <label className="input-group">
                                        <span className="field-label">Email</span>
                                        <input className="field-input" type="email" value={selectedProfile.email || ''} onChange={e => setSelectedProfile({ ...selectedProfile!, email: e.target.value })} />
                                      </label>
                                      <label className="input-group">
                                        <span className="field-label">Teléfono</span>
                                        <input className="field-input" type="text" value={selectedProfile.phone || ''} onChange={e => setSelectedProfile({ ...selectedProfile!, phone: e.target.value })} />
                                      </label>
                                      <label className="input-group">
                                        <span className="field-label">Ciudad</span>
                                        <input className="field-input" type="text" value={selectedProfile.city || ''} onChange={e => setSelectedProfile({ ...selectedProfile!, city: e.target.value })} />
                                      </label>
                                    </>
                                  )}

                                  {/* Perfil */}
                                  {((selectedProfile as any)._editTab) === 'perfil' && (
                                    <>
                                      <label className="input-group">
                                        <span className="field-label">Foto (URL)</span>
                                        <input className="field-input" type="text" value={selectedProfile.avatar_url || ''} onChange={e => setSelectedProfile({ ...selectedProfile!, avatar_url: e.target.value })} />
                                      </label>
                                      <label className="input-group">
                                        <span className="field-label">Subir nueva foto</span>
                                        <input className="field-input" type="file" accept="image/*" onChange={async (ev) => {
                                          const files = (ev.target as HTMLInputElement).files
                                          if (!files || files.length === 0 || !selectedUserId) return
                                          const file = files[0]
                                          try {
                                            const now = new Date()
                                            const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5)
                                            const fileName = `avatar_${timestamp}.jpg`
                                            const filePath = `${selectedUserId}/avatar/${fileName}`
                                            const { error: uploadError } = await supabase.storage
                                              .from('tuenties-archive')
                                              .upload(filePath, file, { upsert: true })
                                            if (uploadError) throw uploadError
                                            const { data: signedUrlData, error: urlError } = await supabase.storage
                                              .from('tuenties-archive')
                                              .createSignedUrl(filePath, 60 * 60 * 24 * 365)
                                            if (urlError || !signedUrlData?.signedUrl) throw urlError || new Error('No se pudo generar URL firmada')
                                            await updateUserProfile(selectedUserId, { ...selectedProfile!, avatar_url: signedUrlData.signedUrl })
                                            setSelectedProfile(prev => prev ? { ...prev, avatar_url: signedUrlData.signedUrl } : prev)
                                          } catch (e) {
                                            console.error('Error subiendo avatar en Admin', e)
                                          } finally {
                                            (ev.target as HTMLInputElement).value = ''
                                          }
                                        }} />
                                      </label>
                                      <label className="input-group" style={{ gridColumn: '1 / span 2' }}>
                                        <span className="field-label">Bio</span>
                                        <textarea className="field-input" value={selectedProfile.bio || ''} onChange={e => setSelectedProfile({ ...selectedProfile!, bio: e.target.value })} />
                                      </label>
                                      <label className="input-group">
                                        <span className="field-label">Ubicación</span>
                                        <input className="field-input" type="text" value={selectedProfile.location || ''} onChange={e => setSelectedProfile({ ...selectedProfile!, location: e.target.value })} />
                                      </label>
                                      <label className="input-group">
                                        <span className="field-label">Web</span>
                                        <input className="field-input" type="text" value={selectedProfile.website || ''} onChange={e => setSelectedProfile({ ...selectedProfile!, website: e.target.value })} />
                                      </label>
                                    </>
                                  )}

                                  {/* Demográficos */}
                                  {((selectedProfile as any)._editTab) === 'demograficos' && (
                                    <>
                                      <label className="input-group">
                                        <span className="field-label">Sexo</span>
                                        <select className="field-input" value={selectedProfile.gender || ''} onChange={e => setSelectedProfile({ ...selectedProfile!, gender: e.target.value as any })}>
                                          <option value="">No indicado</option>
                                          <option value="boy">Chico</option>
                                          <option value="girl">Chica</option>
                                          <option value="other">Otro</option>
                                          <option value="prefer_not_to_say">Prefiero no decir</option>
                                        </select>
                                      </label>
                                      <label className="input-group">
                                        <span className="field-label">Día nacimiento</span>
                                        <input className="field-input" type="number" value={selectedProfile.birth_day || ''} onChange={e => setSelectedProfile({ ...selectedProfile!, birth_day: Number(e.target.value) })} />
                                      </label>
                                      <label className="input-group">
                                        <span className="field-label">Mes nacimiento</span>
                                        <input className="field-input" type="number" value={selectedProfile.birth_month || ''} onChange={e => setSelectedProfile({ ...selectedProfile!, birth_month: Number(e.target.value) })} />
                                      </label>
                                      <label className="input-group">
                                        <span className="field-label">Año nacimiento</span>
                                        <input className="field-input" type="number" value={selectedProfile.birth_year || ''} onChange={e => setSelectedProfile({ ...selectedProfile!, birth_year: Number(e.target.value) })} />
                                      </label>
                                      <label className="input-group">
                                        <span className="field-label">Edad</span>
                                        <input className="field-input" type="number" value={selectedProfile.age || ''} onChange={e => setSelectedProfile({ ...selectedProfile!, age: Number(e.target.value) })} />
                                      </label>
                                      <label className="input-group">
                                        <span className="field-label">País</span>
                                        <input className="field-input" type="text" value={selectedProfile.country || ''} onChange={e => setSelectedProfile({ ...selectedProfile!, country: e.target.value })} />
                                      </label>
                                      <label className="input-group">
                                        <span className="field-label">Provincia</span>
                                        <input className="field-input" type="text" value={selectedProfile.province || ''} onChange={e => setSelectedProfile({ ...selectedProfile!, province: e.target.value })} />
                                      </label>
                                      <label className="input-group">
                                        <span className="field-label">País de origen</span>
                                        <input className="field-input" type="text" value={selectedProfile.origin_country || ''} onChange={e => setSelectedProfile({ ...selectedProfile!, origin_country: e.target.value })} />
                                      </label>
                                      <label className="input-group">
                                        <span className="field-label">Estado civil</span>
                                        <select className="field-input" value={selectedProfile.marital_status || ''} onChange={e => setSelectedProfile({ ...selectedProfile!, marital_status: e.target.value as any })}>
                                          <option value="">No indicado</option>
                                          <option value="single">Soltero/a</option>
                                          <option value="married">Casado/a</option>
                                          <option value="divorced">Divorciado/a</option>
                                          <option value="widowed">Viudo/a</option>
                                          <option value="relationship">En pareja</option>
                                        </select>
                                      </label>
                                    </>
                                  )}

                                  {/* Preferencias */}
                                  {((selectedProfile as any)._editTab) === 'preferencias' && (
                                    <>
                                      <label className="input-group">
                                        <span className="field-label">Busco</span>
                                        <select className="field-input" value={selectedProfile.looking_for || ''} onChange={e => setSelectedProfile({ ...selectedProfile!, looking_for: e.target.value as any })}>
                                          <option value="">No mostrar</option>
                                          <option value="looking_for_guy">Chico</option>
                                          <option value="looking_for_girl">Chica</option>
                                          <option value="looking_for_both">Ambos</option>
                                          <option value="do_not_show">No mostrar</option>
                                        </select>
                                      </label>
                                      <label className="input-group">
                                        <span className="field-label">Privado</span>
                                        <select className="field-input" value={selectedProfile.is_private ? '1' : '0'} onChange={e => setSelectedProfile({ ...selectedProfile!, is_private: e.target.value === '1' })}>
                                          <option value="0">No</option>
                                          <option value="1">Sí</option>
                                        </select>
                                      </label>
                                      <label className="input-group">
                                        <span className="field-label">En línea</span>
                                        <select className="field-input" value={selectedProfile.is_online ? '1' : '0'} onChange={e => setSelectedProfile({ ...selectedProfile!, is_online: e.target.value === '1' })}>
                                          <option value="0">No</option>
                                          <option value="1">Sí</option>
                                        </select>
                                      </label>
                                    </>
                                  )}
                                </div>
                                <div style={{ gridColumn: '1 / span 2', display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                                  <button className="dashboard-nav-item active" onClick={saveSelectedProfile} disabled={savingProfile}>Guardar cambios</button>
                                </div>
                              </div>
                            )
                          })()
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {activeTab === 'moderacion' && (
                <div>
                  <h3 style={{ marginBottom: 8 }}>Moderación</h3>
                  
                  {!showModerationProfile && (
                    <>
                      <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                        <h4 style={{ marginBottom: 8 }}>Moderar usuarios</h4>
                        <div className="input-group" style={{ maxWidth: 480 }}>
                          <label className="field-label">Buscar usuario</label>
                          <input className="field-input" type="text" placeholder="Nombre, email, teléfono o UUID" value={userQuery} onChange={e => setUserQuery(e.target.value)} />
                        </div>
                        {userResults.length > 0 && (
                          <ul style={{ maxHeight: 160, overflow: 'auto', border: '1px solid #eee', borderRadius: 4, marginTop: 6 }}>
                            {userResults.map(u => (
                              <li key={u.id} style={{ padding: 6, borderBottom: '1px solid #f2f2f2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ cursor: 'pointer', color: '#0066cc', textDecoration: 'underline' }} onClick={() => loadModerationProfile(u.id)}>{(u.first_name||'')+' '+(u.last_name||'') || u.email || u.id}</span>
                                <span style={{ display: 'flex', gap: 6 }}>
                                  <button className="dashboard-nav-item" onClick={async () => { await supabase.from('profiles').update({ status: 'suspended' }).eq('id', u.id) }}>Suspender</button>
                                  <button className="dashboard-nav-item" onClick={async () => { await supabase.from('profiles').update({ status: 'active' }).eq('id', u.id) }}>Reactivar</button>
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </>
                  )}

                  {showModerationProfile && (
                    <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <h4>Ficha de Moderación</h4>
                        <button className="dashboard-nav-item" onClick={closeModerationProfile}>Volver</button>
                      </div>
                      
                      {moderationUserProfile && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                          <div>
                            <h5 style={{ marginBottom: 8 }}>Información del Usuario</h5>
                            <div style={{ fontSize: 14, lineHeight: 1.6 }}>
                              <div><strong>Nombre:</strong> {moderationUserProfile.first_name} {moderationUserProfile.last_name}</div>
                              <div><strong>Email:</strong> {moderationUserProfile.email}</div>
                              <div><strong>Teléfono:</strong> {moderationUserProfile.phone || 'No especificado'}</div>
                              <div><strong>Estado:</strong> <span style={{ textTransform: 'capitalize', color: moderationUserProfile.status === 'suspended' ? '#dc2626' : '#16a34a' }}>{moderationUserProfile.status}</span></div>
                              <div><strong>Verificado:</strong> {moderationUserProfile.is_verified ? 'Sí' : 'No'}</div>
                              <div><strong>En línea:</strong> {moderationUserProfile.is_online ? 'Sí' : 'No'}</div>
                              <div><strong>Registro:</strong> {new Date(moderationUserProfile.created_at).toLocaleString()}</div>
                            </div>
                          </div>
                          <div>
                            <h5 style={{ marginBottom: 8 }}>Acciones Rápidas</h5>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              <button className="dashboard-nav-item" onClick={async () => { 
                                await supabase.from('profiles').update({ status: 'suspended' }).eq('id', moderationUserId!)
                                setModerationUserProfile(prev => prev ? { ...prev, status: 'suspended' } : null)
                              }}>Suspender Usuario</button>
                              <button className="dashboard-nav-item" onClick={async () => { 
                                await supabase.from('profiles').update({ status: 'active' }).eq('id', moderationUserId!)
                                setModerationUserProfile(prev => prev ? { ...prev, status: 'active' } : null)
                              }}>Reactivar Usuario</button>
                              <button className="dashboard-nav-item" onClick={() => loadSelectedProfile(moderationUserId!)}>Editar Perfil</button>
                            </div>
                          </div>
                        </div>
                      )}

                      <h5 style={{ marginBottom: 8 }}>Reportes Relacionados</h5>
                      {userReportsLoading && <div>Cargando reportes del usuario...</div>}
                      {!userReportsLoading && userReports.length === 0 && <div>No hay reportes relacionados con este usuario.</div>}
                      {!userReportsLoading && userReports.length > 0 && (
                        <table style={{ width: '100%', fontSize: 14 }}>
                          <thead>
                            <tr>
                              <th style={{ textAlign: 'left' }}>Fecha</th>
                              <th>Tipo</th>
                              <th>Reportado por</th>
                              <th>Target</th>
                              <th>Motivo</th>
                              <th>Estado</th>
                              <th>Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {userReports.map(r => (
                              <tr key={r.id} style={{ backgroundColor: r.reporter_id === moderationUserId ? '#fef3c7' : r.target_id === moderationUserId ? '#fecaca' : 'transparent' }}>
                                <td style={{ textAlign: 'left' }}>{new Date(r.created_at).toLocaleString()}</td>
                                <td style={{ textTransform: 'capitalize' }}>{r.target_type}</td>
                                <td>{r.reporter_id === moderationUserId ? 'Este usuario' : r.reporter_id}</td>
                                <td>{r.target_id === moderationUserId ? 'Este usuario' : r.target_id}</td>
                                <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.reason || '-'}</td>
                                <td style={{ textTransform: 'capitalize' }}>{r.status}</td>
                                <td style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                                  <button className="dashboard-nav-item" disabled={updatingReport===r.id || r.status!=='pending'} onClick={() => updateReportStatus(r.id, 'in_review')}>Tomar</button>
                                  <button className="dashboard-nav-item" disabled={updatingReport===r.id || (r.status!=='pending' && r.status!=='in_review')} onClick={() => updateReportStatus(r.id, 'resolved')}>Resolver</button>
                                  <button className="dashboard-nav-item" disabled={updatingReport===r.id || (r.status!=='pending' && r.status!=='in_review')} onClick={() => updateReportStatus(r.id, 'rejected')}>Rechazar</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}

                  {!showModerationProfile && (
                    <>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                        {(['pendientes','en_revision','resueltos','rechazados','todos'] as const).map(k => (
                          <button key={k} className={`dashboard-nav-item ${reportFilter===k?'active':''}`} onClick={() => setReportFilter(k)}>
                            {k==='pendientes'?'Pendientes':k==='en_revision'?'En revisión':k==='resueltos'?'Resueltos':k==='rechazados'?'Rechazados':'Todos'}
                          </button>
                        ))}
                        <button className="dashboard-nav-item" onClick={loadReports}>Refrescar</button>
                      </div>
                    </>
                  )}
                  {!showModerationProfile && (
                    <>
                      {reportsLoading && <div>Cargando reportes…</div>}
                      {!reportsLoading && reports.length === 0 && <div>No hay reportes.</div>}
                      {!reportsLoading && reports.length > 0 && (
                    (() => {
                      const filtered = reports.filter(r => {
                        switch (reportFilter) {
                          case 'pendientes': return r.status === 'pending'
                          case 'en_revision': return r.status === 'in_review'
                          case 'resueltos': return r.status === 'resolved'
                          case 'rechazados': return r.status === 'rejected'
                          default: return true
                        }
                      })
                      return (
                        <table style={{ width: '100%', fontSize: 14 }}>
                          <thead>
                            <tr>
                              <th style={{ textAlign: 'left' }}>Fecha</th>
                              <th>Reportado por</th>
                              <th>Tipo</th>
                              <th>Target</th>
                              <th>Motivo</th>
                              <th>Estado</th>
                              <th>Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filtered.map(r => (
                              <tr key={r.id}>
                                <td style={{ textAlign: 'left' }}>{new Date(r.created_at).toLocaleString()}</td>
                                <td>{r.reporter_id || '-'}</td>
                                <td style={{ textTransform: 'capitalize' }}>{r.target_type}</td>
                                <td>{r.target_id}</td>
                                <td style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.reason || '-'}</td>
                                <td style={{ textTransform: 'capitalize' }}>{r.status}</td>
                                <td style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                                  <button className="dashboard-nav-item" disabled={updatingReport===r.id || r.status!=='pending'} onClick={() => updateReportStatus(r.id, 'in_review')}>Tomar</button>
                                  <button className="dashboard-nav-item" disabled={updatingReport===r.id || (r.status!=='pending' && r.status!=='in_review')} onClick={() => updateReportStatus(r.id, 'resolved')}>Resolver</button>
                                  <button className="dashboard-nav-item" disabled={updatingReport===r.id || (r.status!=='pending' && r.status!=='in_review')} onClick={() => updateReportStatus(r.id, 'rejected')}>Rechazar</button>
                                  {r.target_type === 'user' && (
                                    <>
                                      <button className="dashboard-nav-item" onClick={async () => { await supabase.from('profiles').update({ status: 'suspended' }).eq('id', r.target_id) }}>Suspender usuario</button>
                                      <button className="dashboard-nav-item" onClick={async () => { await supabase.from('profiles').update({ status: 'active' }).eq('id', r.target_id) }}>Reactivar usuario</button>
                                    </>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )
                    })()
                      )}
                    </>
                  )}
                </div>
              )}
              {activeTab === 'paginas' && (
                <PagesTab />
              )}
              {activeTab === 'eventos' && (
                <EventsTab />
              )}
              {activeTab === 'blog' && (
                <BlogTab />
              )}
              {activeTab === 'soporte' && (
                <SupportTab />
              )}
              {activeTab === 'invitaciones' && (
                <div>
                  <h3 style={{ marginBottom: 8 }}>Gestión de Invitaciones</h3>
                  <p style={{ fontSize: 12, color: '#666' }}>Administra las invitaciones del sistema.</p>
                  
                  {!showCreateInvitation && !showManageInvitations && (
                    <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                      <button className="dashboard-nav-item active" onClick={() => setShowCreateInvitation(true)}>
                        Crear Invitación
                      </button>
                      <button className="dashboard-nav-item active" onClick={() => setShowManageInvitations(true)}>
                        Administrar Invitaciones
                      </button>
                    </div>
                  )}

                  {showCreateInvitation && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16, marginBottom: 12 }}>
                        <button className="dashboard-nav-item" onClick={() => setShowCreateInvitation(false)}>
                          ← Volver
                        </button>
                        <h4>Crear invitación</h4>
                      </div>
                      <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 12 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, alignItems: 'end' }}>
                          <label className="input-group">
                            <span className="field-label">Para (email)</span>
                            <input className="field-input" type="email" placeholder="email@ejemplo.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
                          </label>
                          <div>
                            <div style={{ marginBottom: 8 }}>De quién</div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              <label><input type="radio" name="inviter" checked={inviterType==='equipo'} onChange={() => setInviterType('equipo')} /> Equipo tuenti</label>
                              <label><input type="radio" name="inviter" checked={inviterType==='otro'} onChange={() => setInviterType('otro')} /> Otro usuario</label>
                            </div>
                          </div>
                        </div>
                        {inviterType==='otro' && (
                          <div style={{ marginTop: 8 }}>
                            <div className="input-group">
                              <label className="field-label">Buscar emisor</label>
                              <input className="field-input" type="text" placeholder="Nombre, email, teléfono o UUID" value={inviterSearch} onChange={e => setInviterSearch(e.target.value)} />
                            </div>
                            {inviterResults.length > 0 && (
                              <ul style={{ maxHeight: 160, overflow: 'auto', border: '1px solid #eee', borderRadius: 4, marginTop: 6 }}>
                                {inviterResults.map(u => (
                                  <li key={u.id} style={{ padding: 6, borderBottom: '1px solid #f2f2f2', cursor: 'pointer' }} onClick={() => { setInviterUserId(u.id); setInviterSearch((u.first_name||'')+' '+(u.last_name||'')) }}>
                                    {(u.first_name || '') + ' ' + (u.last_name || '') || u.email || u.id}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}
                        <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
                          <button className="dashboard-nav-item active" onClick={createInvite} disabled={creatingInvite}>Crear invitación (envía email)</button>
                          <button className="dashboard-nav-item" onClick={createInviteLinkOnly} disabled={creatingInvite}>Crear enlace</button>
                          {inviterInviteCount !== null && (
                            <span style={{ fontSize: 12, color: '#666' }}>Invitaciones del emisor: {inviterInviteCount} (límite recomendado: 10)</span>
                          )}
                        </div>
                        {inviteLink && (
                          <div style={{ marginTop: 12 }}>
                            <label className="field-label">Enlace generado</label>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', maxWidth: 720 }}>
                              <input className="field-input" type="text" readOnly value={inviteLink} />
                              <button className="dashboard-nav-item" onClick={() => navigator.clipboard.writeText(inviteLink)}>Copiar</button>
                              <button className="dashboard-nav-item" onClick={() => setInviteLink('')}>Limpiar</button>
                            </div>
                            <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>Comparte este enlace con el invitado.</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {showManageInvitations && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16, marginBottom: 12 }}>
                        <button className="dashboard-nav-item" onClick={() => setShowManageInvitations(false)}>
                          ← Volver
                        </button>
                        <h4>Administrar invitaciones por usuario</h4>
                      </div>
                      <div className="input-group" style={{ maxWidth: 480 }}>
                        <label className="field-label">Buscar usuario</label>
                        <input className="field-input" type="text" placeholder="Nombre, email, teléfono o UUID" value={inviteUserSearch} onChange={e => setInviteUserSearch(e.target.value)} />
                      </div>
                      {inviteUserResults.length > 0 && (
                        <ul style={{ maxHeight: 160, overflow: 'auto', border: '1px solid #eee', borderRadius: 4, marginTop: 6 }}>
                          {inviteUserResults.map(u => (
                            <li key={u.id} style={{ padding: 6, borderBottom: '1px solid #f2f2f2', cursor: 'pointer' }} onClick={() => setInviteSelectedUserId(u.id)}>
                              {(u.first_name || '') + ' ' + (u.last_name || '') || u.email || u.id}
                            </li>
                          ))}
                        </ul>
                      )}
                      {inviteSelectedUserId && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                          {(['todas','emitidas','para'] as const).map(k => (
                            <button key={k} className={`dashboard-nav-item ${inviteUserFilterMode===k?'active':''}`} onClick={() => setInviteUserFilterMode(k)}>{k[0].toUpperCase()+k.slice(1)}</button>
                          ))}
                        </div>
                      )}
                      <div style={{ marginTop: 16 }}>
                        <h4>Invitaciones</h4>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                          {(['todas','pendientes','aceptadas','revocadas','caducadas'] as const).map(k => (
                            <button key={k} className={`dashboard-nav-item ${inviteFilter===k?'active':''}`} onClick={() => setInviteFilter(k)}>{k[0].toUpperCase()+k.slice(1)}</button>
                          ))}
                        </div>
                        {loadingInvites && <div>Cargando invitaciones…</div>}
                        {!loadingInvites && invites.length === 0 && <div>No hay invitaciones.</div>}
                        {!loadingInvites && invites.length > 0 && (
                          (() => {
                            const filtered = invites.filter(inv => {
                              switch (inviteFilter) {
                                case 'pendientes': return inv.status === 'pending'
                                case 'aceptadas': return inv.status === 'accepted'
                                case 'revocadas': return inv.status === 'revoked'
                                case 'caducadas': return inv.status === 'expired'
                                default: return true
                              }
                            }).filter(inv => {
                              if (!inviteSelectedUserId || inviteUserFilterMode === 'todas') return true
                              if (inviteUserFilterMode === 'emitidas') return inv.invited_by === inviteSelectedUserId
                              if (inviteUserFilterMode === 'para') return (inv.invited_user_id as string|undefined) === inviteSelectedUserId
                              return true
                            })
                            return (
                          <table style={{ width: '100%', fontSize: 14 }}>
                            <thead>
                              <tr>
                                <th style={{ textAlign: 'left' }}>Email</th>
                                <th>Estado</th>
                                <th>Creada</th>
                                <th>Expira</th>
                                <th>Invitada por</th>
                                <th>Usada por</th>
                                <th>Acciones</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filtered.map(inv => (
                                <tr key={inv.id}>
            <td style={{ textAlign: 'left' }}>{inv.email === 'link-only' ? '—' : inv.email}</td>
                                  <td style={{ textTransform: 'capitalize' }}>{inv.status}</td>
                                  <td>{new Date(inv.created_at).toLocaleString()}</td>
                                  <td>{inv.expires_at ? new Date(inv.expires_at).toLocaleString() : '-'}</td>
                                  <td>{inv.invited_by ? ((profileMap[inv.invited_by]?.first_name || '') + ' ' + (profileMap[inv.invited_by]?.last_name || '')).trim() || profileMap[inv.invited_by]?.email || inv.invited_by : 'Equipo tuenti'}</td>
                                  <td>{inv.invited_user_id ? ((profileMap[inv.invited_user_id as string]?.first_name || '') + ' ' + (profileMap[inv.invited_user_id as string]?.last_name || '')).trim() || profileMap[inv.invited_user_id as string]?.email || (inv.invited_user_id as string) : '-'}</td>
                                  <td>
                                    <button disabled={inv.status !== 'pending'} onClick={() => revoke(inv.id)} className="dashboard-nav-item">Revocar</button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                            )
                          })()
                        )}
                      </div>
                    </div>
                  )}
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

const SupportTab: React.FC = () => {
  const [tickets, setTickets] = useState<any[]>([])
  const [loadingTickets, setLoadingTickets] = useState(false)
  const [filter, setFilter] = useState<'open'|'in_progress'|'resolved'|'closed'|'all'>('open')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  // Vista y detalle
  const [supportView, setSupportView] = useState<'lista'|'crear'|'ticket'>('lista')
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null)
  const [ticketMessages, setTicketMessages] = useState<{id:string,content:string,sender_id:string,receiver_id:string,created_at:string}[]>([])
  const [newTicketMessage, setNewTicketMessage] = useState('')
  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null)
  // Crear ticket a usuario
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ExtendedUserProfile[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [creatingTicket, setCreatingTicket] = useState(false)
  // Búsqueda y asignación de tickets
  const [searchTicketId, setSearchTicketId] = useState('')
  const [searchAuthor, setSearchAuthor] = useState('')
  const [admins, setAdmins] = useState<{user_id: string, name: string}[]>([])
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null)
  const [authorProfiles, setAuthorProfiles] = useState<Record<string, { first_name: string; last_name: string }>>({})
  const [authorSearchIds, setAuthorSearchIds] = useState<Set<string>>(new Set())

  const loadTickets = async () => {
    setLoadingTickets(true)
    try {
      const rows = await listSupportTickets(filter)
      setTickets(rows)
      // Refrescar conversación si estamos en detalle
      if (supportView === 'ticket' && selectedTicket?.user_id) {
        await loadTicketConversation(selectedTicket)
      }
      const ids = [...new Set(rows.map(r => r.user_id).filter(Boolean))] as string[]
      if (ids.length > 0) {
        const profiles = await getProfilesByIds(ids)
        const map: Record<string, { first_name: string; last_name: string }> = {}
        for (const p of Object.values(profiles)) {
          if (p && p.id) map[p.id] = { first_name: p.first_name || '', last_name: p.last_name || '' }
        }
        setAuthorProfiles(map)
      } else {
        setAuthorProfiles({})
      }
    } finally {
      setLoadingTickets(false)
    }
  }

  useEffect(() => {
    loadTickets()
  }, [filter])

  // Cargar admins para asignación
  const loadAdmins = async () => {
    const { data, error } = await supabase
      .from('admins')
      .select('user_id, user:profiles!user_id(id, first_name, last_name)')
    if (!error && Array.isArray(data)) {
      const list = data.map((r: any) => ({
        user_id: r.user_id,
        name: r.user?.first_name || r.user?.last_name ? `${r.user?.first_name || ''} ${r.user?.last_name || ''}`.trim() : r.user_id
      }))
      setAdmins(list)
    }
  }
  useEffect(() => { loadAdmins() }, [])

  // Búsqueda de usuario para abrir ticket
  useEffect(() => {
    const t = setTimeout(async () => {
      const q = searchQuery.trim()
      if (!q) { setSearchResults([]); return }
      const results = await searchProfiles(q, 20)
      setSearchResults(results)
    }, 300)
    return () => clearTimeout(t)
  }, [searchQuery])

  // Búsqueda por autor para filtrar lista de tickets
  useEffect(() => {
    const t = setTimeout(async () => {
      const q = searchAuthor.trim()
      if (!q) { setAuthorSearchIds(new Set()); return }
      try {
        const results = await searchProfiles(q, 20)
        setAuthorSearchIds(new Set(results.map(r => r.id)))
      } catch {}
    }, 300)
    return () => clearTimeout(t)
  }, [searchAuthor])

  const takeTicket = async (id: string) => {
    setUpdatingId(id)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      await updateSupportTicket(id, { status: 'in_progress', assigned_admin_id: user?.id || null })
      await loadTickets()
    } finally { setUpdatingId(null) }
  }

  const resolveTicket = async (id: string) => {
    setUpdatingId(id)
    try {
      await updateSupportTicket(id, { status: 'resolved', resolved_at: new Date().toISOString() })
      await loadTickets()
    } finally { setUpdatingId(null) }
  }

  const closeTicket = async (id: string) => {
    setUpdatingId(id)
    try {
      await updateSupportTicket(id, { status: 'closed' })
      await loadTickets()
    } finally { setUpdatingId(null) }
  }

  const assignTicket = async (id: string, adminId: string | null) => {
    setUpdatingId(id)
    try {
      await updateSupportTicket(id, { assigned_admin_id: adminId || null, status: adminId ? 'in_progress' : 'open' })
      await loadTickets()
    } finally { setUpdatingId(null); setOpenActionMenu(null) }
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setCurrentAdminId(user?.id || null))
  }, [])

  // Cerrar menú Acciones al hacer clic fuera
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!openActionMenu) return
      const target = e.target as HTMLElement
      if (target.closest('.admin-action-dropdown') || target.closest('.admin-action-button')) return
      setOpenActionMenu(null)
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [openActionMenu])

  // Conversación de ticket usando chat_messages

  const loadTicketConversation = async (t: any) => {
    const { data: { user } } = await supabase.auth.getUser()
    const convId = (t?.user_id && user?.id) ? generateConversationId(t.user_id, user.id) : null
    if (!convId) { setTicketMessages([]); return }
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })
    if (!error) setTicketMessages(Array.isArray(data) ? data : [])
  }

  useEffect(() => {
    // Suscripción en tiempo real cuando estamos en detalle
    let channel: any
    async function sub() {
      if (supportView !== 'ticket' || !selectedTicket) return
      const { data: { user } } = await supabase.auth.getUser()
      const convId = (selectedTicket?.user_id && user?.id) ? generateConversationId(selectedTicket.user_id, user.id) : null
      if (!convId) return
      channel = supabase
        .channel(`support_ticket_${selectedTicket.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => {
          const msg = payload.new as any
          if (msg.conversation_id === convId) {
            setTicketMessages(prev => [...prev, msg])
          }
        })
        .subscribe()
    }
    sub()
    return () => { if (channel) channel.unsubscribe() }
  }, [supportView, selectedTicket])

  const openTicketDetail = async (t: any) => {
    setSelectedTicket(t)
    setSupportView('ticket')
    await loadTicketConversation(t)
    if (currentAdminId && t?.user_id) {
      await markMessagesAsRead(currentAdminId, t.user_id)
    }
  }

  const sendTicketMessage = async () => {
    if (!selectedTicket || !selectedTicket.user_id || !newTicketMessage.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) return
    const convId = generateConversationId(selectedTicket.user_id, user.id)
    if (!convId) return
    const messageContent = newTicketMessage.trim()
    setNewTicketMessage('')
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({ conversation_id: convId, content: messageContent, sender_id: user.id, receiver_id: selectedTicket.user_id })
      .select()
      .single()
    if (!error && data) setTicketMessages(prev => [...prev, data])
  }

  const openTicketForUser = async () => {
    if (!selectedUserId || !newTitle.trim()) return
    setCreatingTicket(true)
    try {
      await createSupportTicket(selectedUserId, newTitle.trim(), newDescription.trim() || undefined)
      setNewTitle('')
      setNewDescription('')
      setSelectedUserId(null)
      setSearchQuery('')
      await loadTickets()
    } finally { setCreatingTicket(false) }
  }

  return (
    <div>
      <h3 style={{ marginBottom: 8 }}>Soporte: tickets de usuarios</h3>
      {/* Filtros y búsqueda por ID/autor */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
        <label className="input-group">
          <span className="field-label">Buscar por ID</span>
          <input className="field-input" type="text" placeholder="UUID del ticket" value={searchTicketId} onChange={e => setSearchTicketId(e.target.value)} />
        </label>
        <label className="input-group">
          <span className="field-label">Buscar por autor</span>
          <input className="field-input" type="text" placeholder="UUID o nombre del usuario" value={searchAuthor} onChange={e => setSearchAuthor(e.target.value)} />
        </label>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
          {(['open','in_progress','resolved','closed','all'] as const).map(k => (
            <button key={k} className={`dashboard-nav-item ${filter===k?'active':''}`} onClick={() => setFilter(k)} style={{ whiteSpace: 'nowrap' }}>
              {k==='open'?'Sin asignar':k==='in_progress'?'En curso':k==='resolved'?'Resueltos':k==='closed'?'Cerrados':'Todos'}
            </button>
          ))}
          <button className="dashboard-nav-item" onClick={loadTickets}>Refrescar</button>
        </div>
      </div>
      <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 12, marginBottom: 12 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h4 style={{ marginBottom: 8 }}>Soporte</h4>
          {supportView !== 'crear' && (
            <button className="dashboard-nav-item" onClick={() => setSupportView('crear')}>Crear Ticket</button>
          )}
          {supportView !== 'lista' && (
            <button className="dashboard-nav-item" onClick={() => { setSupportView('lista'); setSelectedTicket(null); }}>Volver</button>
          )}
        </div>

        {supportView === 'crear' && (
          <div>
            <div className="input-group" style={{ maxWidth: 480 }}>
              <label className="field-label">Buscar usuario</label>
              <input className="field-input" type="text" placeholder="Nombre, email, teléfono o UUID" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            {searchResults.length > 0 && (
              <ul style={{ maxHeight: 160, overflow: 'auto', border: '1px solid #eee', borderRadius: 4, marginTop: 6 }}>
                {searchResults.map(u => (
                  <li key={u.id} style={{ padding: 6, borderBottom: '1px solid #f2f2f2', cursor: 'pointer' }} onClick={() => setSelectedUserId(u.id)}>
                    {(u.first_name || '') + ' ' + (u.last_name || '') || u.email || u.id}
                  </li>
                ))}
              </ul>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8, marginTop: 8 }}>
              <label className="input-group">
                <span className="field-label">Título</span>
                <input className="field-input" type="text" placeholder="Breve título del ticket" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
              </label>
              <label className="input-group">
                <span className="field-label">Descripción</span>
                <textarea className="field-input" placeholder="Describe el problema" value={newDescription} onChange={e => setNewDescription(e.target.value)} />
              </label>
            </div>
            <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
              <button className={`dashboard-nav-item ${selectedUserId && newTitle.trim() ? 'active' : ''}`} disabled={!selectedUserId || !newTitle.trim() || creatingTicket} onClick={openTicketForUser}>Abrir ticket</button>
              {selectedUserId && <span style={{ fontSize: 12, color: '#666' }}>Usuario seleccionado: {selectedUserId}</span>}
            </div>
          </div>
        )}

        {supportView === 'ticket' && selectedTicket && (
          <div>
            <h4 style={{ marginTop: 8 }}>Ticket #{selectedTicket.id} — Usuario: {selectedTicket.user_id || '-'}</h4>
            <div style={{ border: '1px solid #eee', borderRadius: 6, padding: 8, maxHeight: 360, overflow: 'auto', marginTop: 8 }}>
              {ticketMessages.length === 0 ? (
                <div style={{ color:'#666' }}>No hay mensajes aún.</div>
              ) : (
                ticketMessages.map((m) => (
                  <div key={m.id} style={{ display:'flex', justifyContent: (m.sender_id===currentAdminId? 'flex-end':'flex-start'), marginBottom: 6 }}>
                    <div style={{ background:'#f8fafc', border:'1px solid #e5e7eb', borderRadius: 6, padding: '6px 8px', maxWidth: 560 }}>
                      <div style={{ fontSize: 11, color:'#555', marginBottom: 4 }}>
                        {m.sender_id===currentAdminId
                          ? 'Tú'
                          : (admins.find(a => a.user_id===m.sender_id)?.name || (authorProfiles[m.sender_id || ''] ? `${authorProfiles[m.sender_id!].first_name} ${authorProfiles[m.sender_id!].last_name}`.trim() : m.sender_id))}
                      </div>
                      <div style={{ fontSize: 13 }}>{m.content}</div>
                      <div style={{ fontSize: 11, color:'#666', marginTop: 4 }}>{new Date(m.created_at).toLocaleString('es-ES', { hour:'2-digit', minute:'2-digit' })}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div style={{ display:'flex', gap: 8, marginTop: 8 }}>
              <input className="dashboard-input" placeholder="Escribe un mensaje" value={newTicketMessage} onChange={e => setNewTicketMessage(e.target.value)} onKeyDown={e => { if (e.key==='Enter') sendTicketMessage() }} />
              <button className="dashboard-nav-item active" onClick={sendTicketMessage}>Enviar</button>
            </div>
          </div>
        )}
      </div>
      {/* Crear ticket */}
      {loadingTickets && <div>Cargando tickets…</div>}
      {!loadingTickets && tickets.length === 0 && <div>No hay tickets.</div>}
      {!loadingTickets && supportView==='lista' && tickets.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>ID</th>
              <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Fecha</th>
              <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Usuario</th>
              <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Título</th>
              <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Estado</th>
              <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Asignado a</th>
              <th style={{ textAlign: 'center', padding: 8, borderBottom: '1px solid #eee' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {tickets
              .filter(t => {
                const idQuery = searchTicketId.trim().toLowerCase()
                const authorQuery = searchAuthor.trim().toLowerCase()
                const idMatch = idQuery ? (t.id || '').toLowerCase().includes(idQuery) : true
                const authorId = (t.user_id || '').toLowerCase()
                const prof = authorProfiles[t.user_id || '']
                const authorName = prof ? `${prof.first_name} ${prof.last_name}`.trim().toLowerCase() : ''
                const authorMatch = authorQuery ? (authorId.includes(authorQuery) || authorName.includes(authorQuery) || authorSearchIds.has(t.user_id || '')) : true
                return idMatch && authorMatch
              })
              .map(t => (
              <tr key={t.id}>
                <td style={{ padding: 8, fontFamily: 'monospace' }}>{t.id}</td>
                <td style={{ padding: 8 }}>{new Date(t.created_at).toLocaleString()}</td>
                <td style={{ padding: 8 }}>
                  {authorProfiles[t.user_id || ''] ? `${authorProfiles[t.user_id!].first_name} ${authorProfiles[t.user_id!].last_name}`.trim() : (t.user_id || '-')}
                </td>
                <td style={{ padding: 8, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</td>
                <td style={{ padding: 8, whiteSpace:'nowrap' }}>
                  {t.status === 'open' && !t.assigned_admin_id ? 'Sin asignar' : t.status === 'in_progress' ? 'En curso' : t.status === 'resolved' ? 'Resuelto' : t.status === 'closed' ? 'Cerrado' : t.status}
                </td>
                <td style={{ padding: 8 }}>
                  {t.assigned_admin_id ? (admins.find(a => a.user_id === t.assigned_admin_id)?.name || t.assigned_admin_id) : '-'}
                </td>
                <td style={{ padding: 8, textAlign: 'center' }}>
                  <div style={{ position: 'relative', display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                    <button className="dashboard-nav-item" onClick={() => openTicketDetail(t)}>
                      Detalle
                    </button>
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <button className="dashboard-nav-item admin-action-button" onClick={() => setOpenActionMenu(openActionMenu===t.id?null:t.id)} disabled={updatingId===t.id}>
                        Acciones ▾
                      </button>
                      {openActionMenu === t.id && (
                        <div className="admin-action-dropdown">
                          <button className="admin-action-item" onClick={() => takeTicket(t.id)} disabled={updatingId===t.id || t.status!=='open'}>Asignar a mí</button>
                          <div className="admin-action-divider"></div>
                          <div style={{ padding: '6px 8px', fontSize: 12, color: '#666', textAlign: 'left' }}>Asignar a admin:</div>
                          {admins.map(a => (
                            <button key={a.user_id} className="admin-action-item" onClick={() => assignTicket(t.id, a.user_id)} disabled={updatingId===t.id}>
                              {a.name}
                            </button>
                          ))}
                          <button className="admin-action-item" onClick={() => assignTicket(t.id, null)} disabled={updatingId===t.id}>Quitar asignación</button>
                          <div className="admin-action-divider"></div>
                          <button className="admin-action-item" onClick={() => resolveTicket(t.id)} disabled={updatingId===t.id || (t.status!=='open' && t.status!=='in_progress')}>Resolver</button>
                          <button className="admin-action-item" onClick={() => closeTicket(t.id)} disabled={updatingId===t.id || t.status==='closed'}>Cerrar</button>
                        </div>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

const PagesTab: React.FC = () => {
  const [pages, setPages] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [editing, setEditing] = useState<Record<string, { name: string; description: string }>>({})
  const load = async () => {
    setLoading(true)
    try {
      const rows = await listPages(100)
      setPages(rows)
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])
  const create = async () => {
    if (!name.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    const newItem = await createPage({ owner_id: user?.id || null, name: name.trim(), description: description.trim() || null })
    if (newItem) { setPages(prev => [newItem, ...prev]); setName(''); setDescription('') }
  }
  const startEdit = (p: any) => {
    setEditing(prev => ({ ...prev, [p.id]: { name: p.name || '', description: p.description || '' } }))
  }
  const cancelEdit = (id: string) => {
    setEditing(prev => { const cp = { ...prev }; delete cp[id]; return cp })
  }
  const saveEdit = async (id: string) => {
    const e = editing[id]
    if (!e) return
    await updatePage(id, { name: e.name.trim(), description: e.description.trim() || null })
    setPages(prev => prev.map(p => p.id === id ? { ...p, name: e.name.trim(), description: e.description.trim() || null } : p))
    cancelEdit(id)
  }
  const remove = async (id: string) => {
    await deletePage(id)
    setPages(prev => prev.filter(p => p.id !== id))
  }
  return (
    <div>
      <h3 style={{ marginBottom: 8 }}>Gestión de páginas</h3>
      <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 12, marginBottom: 12 }}>
        <h4>Crear página</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: 8 }}>
          <label className="input-group"><span className="field-label">Nombre</span><input className="field-input" value={name} onChange={e => setName(e.target.value)} /></label>
          <label className="input-group"><span className="field-label">Descripción</span><input className="field-input" value={description} onChange={e => setDescription(e.target.value)} /></label>
          <div />
        </div>
        <div style={{ marginTop: 8 }}>
          <button className={`dashboard-nav-item ${name.trim()?'active':''}`} onClick={create} disabled={!name.trim()}>Crear</button>
        </div>
      </div>
      {loading && <div>Cargando páginas…</div>}
      {!loading && pages.length === 0 && <div>No hay páginas.</div>}
      {!loading && pages.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Nombre</th>
              <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Descripción</th>
              
              <th style={{ textAlign: 'center', padding: 8, borderBottom: '1px solid #eee' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pages.map(p => (
              <tr key={p.id}>
                <td style={{ padding: 8 }}>
                  {editing[p.id] ? (
                    <input className="dashboard-input" value={editing[p.id].name} onChange={e => setEditing(prev => ({ ...prev, [p.id]: { ...prev[p.id], name: e.target.value } }))} />
                  ) : (
                    p.name
                  )}
                </td>
                <td style={{ padding: 8 }}>
                  {editing[p.id] ? (
                    <input className="dashboard-input" value={editing[p.id].description} onChange={e => setEditing(prev => ({ ...prev, [p.id]: { ...prev[p.id], description: e.target.value } }))} />
                  ) : (
                    p.description || '-'
                  )}
                </td>
                <td style={{ padding: 8, textAlign: 'center', display: 'flex', gap: 6, justifyContent: 'center' }}>
                  {!editing[p.id] ? (
                    <>
                      <button className="dashboard-nav-item" onClick={() => startEdit(p)}>Editar</button>
                      <button className="dashboard-nav-item" onClick={() => remove(p.id)}>Eliminar</button>
                    </>
                  ) : (
                    <>
                      <button className="dashboard-nav-item active" onClick={() => saveEdit(p.id)}>Guardar</button>
                      <button className="dashboard-nav-item" onClick={() => cancelEdit(p.id)}>Cancelar</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

const EventsTab: React.FC = () => {
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [visibility, setVisibility] = useState<'public'|'friends'|'private'>('public')
  const [editing, setEditing] = useState<Record<string, { title: string; description: string; event_date: string; visibility: 'public'|'friends'|'private' }>>({})
  const load = async () => { setLoading(true); try { setEvents(await listEvents(100)) } finally { setLoading(false) } }
  useEffect(() => { load() }, [])
  const create = async () => {
    if (!title.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    const newItem = await createEvent({ owner_id: user?.id || null, title: title.trim(), description: description.trim() || null, event_date: eventDate || null, visibility })
    if (newItem) { setEvents(prev => [newItem, ...prev]); setTitle(''); setDescription(''); setEventDate('') }
  }
  const changeVisibility = async (id: string, v: 'public'|'friends'|'private') => {
    await updateEvent(id, { visibility: v })
    setEvents(prev => prev.map(e => e.id === id ? { ...e, visibility: v } : e))
  }
  const startEdit = (e: any) => {
    setEditing(prev => ({ ...prev, [e.id]: { title: e.title || '', description: e.description || '', event_date: e.event_date ? new Date(e.event_date).toISOString().slice(0,16) : '', visibility: (e.visibility || 'public') } }))
  }
  const cancelEdit = (id: string) => {
    setEditing(prev => { const cp = { ...prev }; delete cp[id]; return cp })
  }
  const saveEdit = async (id: string) => {
    const e = editing[id]
    if (!e) return
    const payload: any = { title: e.title.trim(), description: e.description.trim() || null, visibility: e.visibility }
    if (e.event_date) { payload.event_date = new Date(e.event_date).toISOString() }
    await updateEvent(id, payload)
    setEvents(prev => prev.map(ev => ev.id === id ? { ...ev, ...payload } : ev))
    cancelEdit(id)
  }
  const remove = async (id: string) => { await deleteEvent(id); setEvents(prev => prev.filter(e => e.id !== id)) }
  return (
    <div>
      <h3 style={{ marginBottom: 8 }}>Gestión de eventos</h3>
      <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 12, marginBottom: 12 }}>
        <h4>Crear evento</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 1fr', gap: 8 }}>
          <label className="input-group"><span className="field-label">Título</span><input className="field-input" value={title} onChange={e => setTitle(e.target.value)} /></label>
          <label className="input-group"><span className="field-label">Descripción</span><input className="field-input" value={description} onChange={e => setDescription(e.target.value)} /></label>
          <label className="input-group"><span className="field-label">Fecha</span><input className="field-input" type="datetime-local" value={eventDate} onChange={e => setEventDate(e.target.value)} /></label>
          <label className="input-group"><span className="field-label">Visibilidad</span>
            <select className="field-input" value={visibility} onChange={e => setVisibility(e.target.value as any)}>
              <option value="public">Pública</option>
              <option value="friends">Amigos</option>
              <option value="private">Privada</option>
            </select>
          </label>
        </div>
        <div style={{ marginTop: 8 }}>
          <button className={`dashboard-nav-item ${title.trim()?'active':''}`} onClick={create} disabled={!title.trim()}>Crear</button>
        </div>
      </div>
      {loading && <div>Cargando eventos…</div>}
      {!loading && events.length === 0 && <div>No hay eventos.</div>}
      {!loading && events.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Título</th>
              <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Descripción</th>
              <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Fecha</th>
              <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Visibilidad</th>
              <th style={{ textAlign: 'center', padding: 8, borderBottom: '1px solid #eee' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {events.map(e => (
              <tr key={e.id}>
                <td style={{ padding: 8 }}>
                  {editing[e.id] ? (
                    <input className="dashboard-input" value={editing[e.id].title} onChange={vv => setEditing(prev => ({ ...prev, [e.id]: { ...prev[e.id], title: vv.target.value } }))} />
                  ) : e.title}
                </td>
                <td style={{ padding: 8 }}>
                  {editing[e.id] ? (
                    <input className="dashboard-input" value={editing[e.id].description} onChange={vv => setEditing(prev => ({ ...prev, [e.id]: { ...prev[e.id], description: vv.target.value } }))} />
                  ) : (e.description || '-')}
                </td>
                <td style={{ padding: 8 }}>
                  {editing[e.id] ? (
                    <input className="dashboard-input" type="datetime-local" value={editing[e.id].event_date} onChange={vv => setEditing(prev => ({ ...prev, [e.id]: { ...prev[e.id], event_date: vv.target.value } }))} />
                  ) : (e.event_date ? new Date(e.event_date).toLocaleString() : '-')}
                </td>
                <td style={{ padding: 8 }}>
                  {editing[e.id] ? (
                    <select className="field-input" value={editing[e.id].visibility} onChange={vv => setEditing(prev => ({ ...prev, [e.id]: { ...prev[e.id], visibility: vv.target.value as any } }))}>
                      <option value="public">Pública</option>
                      <option value="friends">Amigos</option>
                      <option value="private">Privada</option>
                    </select>
                  ) : (
                    <select className="field-input" value={e.visibility} onChange={vv => changeVisibility(e.id, vv.target.value as any)}>
                      <option value="public">Pública</option>
                      <option value="friends">Amigos</option>
                      <option value="private">Privada</option>
                    </select>
                  )}
                </td>
                <td style={{ padding: 8, textAlign: 'center', display: 'flex', gap: 6, justifyContent: 'center' }}>
                  {!editing[e.id] ? (
                    <>
                      <button className="dashboard-nav-item" onClick={() => startEdit(e)}>Editar</button>
                      <button className="dashboard-nav-item" onClick={() => remove(e.id)}>Eliminar</button>
                    </>
                  ) : (
                    <>
                      <button className="dashboard-nav-item active" onClick={() => saveEdit(e.id)}>Guardar</button>
                      <button className="dashboard-nav-item" onClick={() => cancelEdit(e.id)}>Cancelar</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

const BlogTab: React.FC = () => {
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  // Composer estado oculto tras botón
  const [showComposer, setShowComposer] = useState(false)
  const [title, setTitle] = useState('')
  const [contentHtml, setContentHtml] = useState('')
  const editorRef = useRef<HTMLDivElement | null>(null)
  const [editing, setEditing] = useState<Record<string, { title: string; content: string; status: 'published'|'hidden' }>>({})
  // Filtros internos en una sola pestaña "Entradas"
  const [filterKey, setFilterKey] = useState<'todas'|'publicadas'|'ocultas'>('todas')
  const [showSettings, setShowSettings] = useState(false)
  const [defaultBlogStatus, setDefaultBlogStatus] = useState<'published'|'hidden'>(() => (localStorage.getItem('blog.defaultStatus') as any) || 'published')
  const [previewLength, setPreviewLength] = useState<number>(() => parseInt(localStorage.getItem('blog.previewLength') || '80', 10))

  const stripHtml = (html: string) => (html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

  const load = async () => { setLoading(true); try { setPosts(await listBlogPosts(100)) } finally { setLoading(false) } }
  useEffect(() => { load() }, [])

  const create = async () => {
    if (!title.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    const newItem = await createBlogPost({ author_id: user?.id || null, title: title.trim(), content: contentHtml.trim() || null, status: defaultBlogStatus })
    if (newItem) { setPosts(prev => [newItem, ...prev]); setTitle(''); setContentHtml(''); setShowComposer(false) }
  }
  const changeStatus = async (id: string, status: 'published'|'hidden') => { await updateBlogPost(id, { status }); setPosts(prev => prev.map(p => p.id===id?{...p,status}:p)) }
  const startEdit = (p: any) => { setEditing(prev => ({ ...prev, [p.id]: { title: p.title || '', content: p.content || '', status: (p.status || 'published') } })) }
  const cancelEdit = (id: string) => { setEditing(prev => { const cp = { ...prev }; delete cp[id]; return cp }) }
  const saveEdit = async (id: string) => {
    const e = editing[id]
    if (!e) return
    await updateBlogPost(id, { title: e.title.trim(), content: e.content.trim(), status: e.status })
    setPosts(prev => prev.map(p => p.id===id?{...p, title: e.title.trim(), content: e.content.trim(), status: e.status}:p))
    cancelEdit(id)
  }
  const remove = async (id: string) => { await deleteBlogPost(id); setPosts(prev => prev.filter(p => p.id !== id)) }

  const exec = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value)
    setContentHtml(editorRef.current?.innerHTML || '')
  }
  const onEditorInput = (e: any) => { setContentHtml(e.currentTarget.innerHTML) }
  const insertImage = async (file: File) => {
    try {
      const { data: authUser } = await supabase.auth.getUser()
      const uid = authUser?.user?.id
      if (!uid) return
      const imageUrl = await uploadPostImage(file, uid)
      if (imageUrl && editorRef.current) {
        document.execCommand('insertImage', false, imageUrl)
        setContentHtml(editorRef.current.innerHTML)
      }
    } catch (e) {
      console.error('Error subiendo imagen del editor:', e)
    }
  }

  return (
    <div>
      <h3 style={{ marginBottom: 8 }}>Entradas</h3>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        <label className="input-group" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="field-label">Mostrar</span>
          <select className="field-input" value={filterKey} onChange={e => setFilterKey(e.target.value as 'todas'|'publicadas'|'ocultas')}>
            <option value="todas">Todas</option>
            <option value="publicadas">Publicadas</option>
            <option value="ocultas">Ocultas</option>
          </select>
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={`dashboard-nav-item ${showComposer?'active':''}`} onClick={() => setShowComposer(v => !v)}>Crear entrada</button>
          <button className={`dashboard-nav-item ${showSettings?'active':''}`} onClick={() => setShowSettings(v => !v)}>Ajustes</button>
        </div>
      </div>

      {showSettings && (
        <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 12, marginBottom: 12 }}>
          <h4>Ajustes del blog</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <label className="input-group">
              <span className="field-label">Estado por defecto al crear</span>
              <select className="field-input" value={defaultBlogStatus} onChange={e => { const v = e.target.value as 'published'|'hidden'; setDefaultBlogStatus(v); localStorage.setItem('blog.defaultStatus', v) }}>
                <option value="published">Publicado</option>
                <option value="hidden">Oculto</option>
              </select>
            </label>
            <label className="input-group">
              <span className="field-label">Longitud de previsualización</span>
              <input className="field-input" type="number" min={20} max={400} value={previewLength} onChange={e => { const v = parseInt(e.target.value||'80',10); setPreviewLength(v); localStorage.setItem('blog.previewLength', String(v)) }} />
            </label>
          </div>
        </div>
      )}

      {showComposer && (
        <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 12, marginBottom: 12 }}>
          <h4>Crear entrada</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
            <label className="input-group"><span className="field-label">Título</span><input className="field-input" value={title} onChange={e => setTitle(e.target.value)} /></label>
            <div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:6 }}>
                <button className="dashboard-nav-item" onClick={() => exec('bold')}>Negrita</button>
                <button className="dashboard-nav-item" onClick={() => exec('italic')}>Cursiva</button>
                <button className="dashboard-nav-item" onClick={() => exec('underline')}>Subrayado</button>
                <button className="dashboard-nav-item" onClick={() => exec('insertUnorderedList')}>Lista</button>
                <button className="dashboard-nav-item" onClick={() => exec('formatBlock', 'h2')}>H2</button>
                <button className="dashboard-nav-item" onClick={() => { const url = prompt('URL:'); if (url) exec('createLink', url) }}>Enlace</button>
                <label className="dashboard-nav-item" style={{ cursor: 'pointer' }}>
                  Subir imagen
                  <input type="file" accept="image/*" style={{ display:'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) insertImage(f) }} />
                </label>
              </div>
              <div
                ref={el => (editorRef.current = el)}
                className="field-input"
                contentEditable
                onInput={onEditorInput}
                style={{ minHeight: 160 }}
                dangerouslySetInnerHTML={{ __html: contentHtml }}
              />
            </div>
          </div>
          <div style={{ marginTop: 8 }}>
            <button className={`dashboard-nav-item ${title.trim()?'active':''}`} onClick={create} disabled={!title.trim()}>Publicar</button>
          </div>
        </div>
      )}

      {loading && <div>Cargando entradas…</div>}
      {!loading && posts.length === 0 && <div>No hay entradas.</div>}
      {!loading && posts.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Título</th>
              <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Contenido</th>
              <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Estado</th>
              <th style={{ textAlign: 'center', padding: 8, borderBottom: '1px solid #eee' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {posts.filter(p => filterKey==='publicadas'?p.status==='published':filterKey==='ocultas'?p.status==='hidden':true).map(p => (
              <tr key={p.id}>
                <td style={{ padding: 8 }}>
                  {editing[p.id] ? (
                    <input className="dashboard-input" value={editing[p.id].title} onChange={e => setEditing(prev => ({ ...prev, [p.id]: { ...prev[p.id], title: e.target.value } }))} />
                  ) : p.title}
                </td>
                <td style={{ padding: 8, maxWidth: 360 }}>
                  {editing[p.id] ? (
                    <textarea className="dashboard-input" value={editing[p.id].content} onChange={e => setEditing(prev => ({ ...prev, [p.id]: { ...prev[p.id], content: e.target.value } }))} />
                  ) : (p.content ? (() => { const txt = stripHtml(p.content); return txt.length > previewLength ? txt.slice(0,previewLength)+'…' : txt })() : '-')}
                </td>
                <td style={{ padding: 8 }}>
                  {editing[p.id] ? (
                    <select className="field-input" value={editing[p.id].status} onChange={e => setEditing(prev => ({ ...prev, [p.id]: { ...prev[p.id], status: e.target.value as any } }))}>
                      <option value="published">Publicado</option>
                      <option value="hidden">Oculto</option>
                    </select>
                  ) : (
                    <select className="field-input" value={p.status} onChange={e => changeStatus(p.id, e.target.value as any)}>
                      <option value="published">Publicado</option>
                      <option value="hidden">Oculto</option>
                    </select>
                  )}
                </td>
                <td style={{ padding: 8, display: 'flex', gap: 6, justifyContent: 'center' }}>
                  {!editing[p.id] ? (
                    <>
                      <button className="dashboard-nav-item" onClick={() => startEdit(p)}>Editar</button>
                      <button className="dashboard-nav-item" onClick={() => remove(p.id)}>Eliminar</button>
                    </>
                  ) : (
                    <>
                      <button className="dashboard-nav-item active" onClick={() => saveEdit(p.id)}>Guardar</button>
                      <button className="dashboard-nav-item" onClick={() => cancelEdit(p.id)}>Cancelar</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default Admin
