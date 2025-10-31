import React, { useEffect, useMemo, useState } from 'react';
import { IonPage, IonContent } from '@ionic/react';
import Header from '@/components/Header';
import { useAuth } from '@/lib/auth';
import { supabase, friendshipService, type ExtendedUserProfile } from '@/lib/supabase';
import '../styles/tuenti-dashboard.css';

const People: React.FC = () => {
  const { user } = useAuth();
  const currentUserId = user?.id || null;
  const [loading, setLoading] = useState(false);
  const [profiles, setProfiles] = useState<ExtendedUserProfile[]>([]);
  const [rels, setRels] = useState<{ user_id: string; friend_id: string; status: string }[]>([]);
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<'all'|'friends'|'fof'>('all');
  const [gender, setGender] = useState<'both'|'boy'|'girl'>('both');
  const [ageMin, setAgeMin] = useState<number>(14);
  const [ageMax, setAgeMax] = useState<number>(65);
  const [selCities, setSelCities] = useState<string[]>([]);
  const [selProvinces, setSelProvinces] = useState<string[]>([]);
  const [selCountries, setSelCountries] = useState<string[]>([]);
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set());
  const [fofIds, setFofIds] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = profiles.filter(p => p.id !== currentUserId);

    // Alcance: todos, amigos, amigos de amigos
    if (scope === 'friends') {
      list = list.filter(p => friendIds.has(p.id));
    } else if (scope === 'fof') {
      list = list.filter(p => fofIds.has(p.id));
    }

    // Género
    if (gender !== 'both') {
      list = list.filter(p => (p.gender || '').toLowerCase() === gender);
    }

    // Edad
    const year = new Date().getFullYear();
    list = list.filter(p => {
      const by = (p.birth_year as any) as number | undefined;
      if (!by) return true; // si no hay año, no filtramos
      const age = year - by;
      return age >= ageMin && age <= ageMax;
    });

    // Ubicación
    if (selCities.length) list = list.filter(p => p.city && selCities.includes(p.city));
    if (selProvinces.length) list = list.filter(p => p.province && selProvinces.includes(p.province));
    if (selCountries.length) list = list.filter(p => p.country && selCountries.includes(p.country));

    // Texto (nombre + email)
    if (q) {
      list = list.filter(p => (
        ((p.first_name || '') + ' ' + (p.last_name || '')).toLowerCase().includes(q) ||
        (p.email || '').toLowerCase().includes(q)
      ));
    }

    return list;
  }, [profiles, query, currentUserId, scope, gender, ageMin, ageMax, friendIds, fofIds, selCities, selProvinces, selCountries]);

  useEffect(() => {
    const load = async () => {
      if (!currentUserId) return;
      setLoading(true);
      try {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, avatar_url, is_online, email, gender, birth_year, city, province, country')
          .limit(50);
        // Aleatorizar el listado inicial
        const baseProfiles = ((profs as any) || []);
        const shuffled = [...baseProfiles];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        setProfiles(shuffled);

        const { data: fr } = await supabase
          .from('friendships')
          .select('user_id, friend_id, status')
          .or(`user_id.eq.${currentUserId},friend_id.eq.${currentUserId}`);
        const relData = (fr as any) || [];
        setRels(relData);
        const fids = new Set<string>();
        relData.filter((r:any)=>r.status==='accepted').forEach((r:any)=>{
          if (r.user_id === currentUserId) fids.add(r.friend_id); else fids.add(r.user_id);
        });
        setFriendIds(fids);

        // Amigos de amigos (fof): buscar relaciones aceptadas de tus amigos
        if (fids.size) {
          const ids = Array.from(fids);
          const { data: fofRels } = await supabase
            .from('friendships')
            .select('user_id, friend_id, status')
            .in('user_id', ids)
            .eq('status', 'accepted');
          const fof = new Set<string>();
          (fofRels as any || []).forEach((r:any)=>{
            if (r.friend_id !== currentUserId && !fids.has(r.friend_id)) fof.add(r.friend_id);
          });
          setFofIds(fof);
        } else {
          setFofIds(new Set());
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentUserId]);

  const statusFor = (otherId: string): { status: 'none'|'pending'|'accepted'|'rejected'|'blocked'; direction?: 'out'|'in'|'none' } => {
    const r = rels.find(r => (r.user_id === currentUserId && r.friend_id === otherId) || (r.user_id === otherId && r.friend_id === currentUserId));
    if (!r) return { status: 'none', direction: 'none' };
    if (r.status === 'pending') return { status: 'pending', direction: r.user_id === currentUserId ? 'out' : 'in' };
    if (r.status === 'accepted') return { status: 'accepted', direction: 'none' };
    if (r.status === 'rejected') return { status: 'rejected', direction: 'none' };
    if (r.status === 'blocked') return { status: 'blocked', direction: r.user_id === currentUserId ? 'out' : 'in' };
    return { status: 'none', direction: 'none' };
  };

  const refreshRels = async () => {
    if (!currentUserId) return;
    const { data: fr } = await supabase
      .from('friendships')
      .select('user_id, friend_id, status')
      .or(`user_id.eq.${currentUserId},friend_id.eq.${currentUserId}`);
    setRels((fr as any) || []);
  };

  const sendRequest = async (otherId: string) => {
    if (!currentUserId) return;
    await friendshipService.sendFriendRequest(currentUserId, otherId);
    await refreshRels();
  };
  const acceptRequest = async (otherId: string) => {
    if (!currentUserId) return;
    const ok = await friendshipService.acceptFriendRequest(currentUserId, otherId);
    if (!ok) {
      console.warn('Aceptar solicitud falló para', { currentUserId, otherId });
      alert('No se pudo aceptar la solicitud. Inténtalo de nuevo.');
      return;
    }
    // Optimista: reflejar en UI incluso si hay error de red al refrescar
    setRels(prev => prev.map(r => {
      if ((r.user_id === otherId && r.friend_id === currentUserId) || (r.user_id === currentUserId && r.friend_id === otherId)) {
        return { ...r, status: 'accepted' };
      }
      return r;
    }));
    await refreshRels();
  };
  const rejectRequest = async (otherId: string) => {
    if (!currentUserId) return;
    const ok = await friendshipService.rejectFriendRequest(currentUserId, otherId);
    if (!ok) {
      console.warn('Rechazar solicitud falló para', { currentUserId, otherId });
      alert('No se pudo rechazar la solicitud. Inténtalo de nuevo.');
      return;
    }
    setRels(prev => prev.map(r => {
      if ((r.user_id === otherId && r.friend_id === currentUserId) || (r.user_id === currentUserId && r.friend_id === otherId)) {
        return { ...r, status: 'rejected' };
      }
      return r;
    }));
    await refreshRels();
  };
  const cancelRequest = async (otherId: string) => {
    if (!currentUserId) return;
    await friendshipService.cancelFriendRequest(currentUserId, otherId);
    await refreshRels();
  };
  const removeFriend = async (otherId: string) => {
    if (!currentUserId) return;
    await friendshipService.removeFriend(currentUserId, otherId);
    await refreshRels();
  };
  const blockUser = async (otherId: string) => {
    if (!currentUserId) return;
    await supabase
      .from('friendships')
      .upsert({ user_id: currentUserId, friend_id: otherId, status: 'blocked' }, { onConflict: 'user_id,friend_id' as any });
    await refreshRels();
  };
  const unblockUser = async (otherId: string) => {
    if (!currentUserId) return;
    await supabase
      .from('friendships')
      .delete()
      .eq('user_id', currentUserId)
      .eq('friend_id', otherId)
      .eq('status', 'blocked');
    await refreshRels();
  };

  // Helpers para listas en filtros
  const cities = useMemo(() => {
    const s = new Set<string>();
    profiles.forEach(p => { if (p.city) s.add(p.city); });
    return Array.from(s).slice(0, 8);
  }, [profiles]);
  const provinces = useMemo(() => {
    const s = new Set<string>();
    profiles.forEach(p => { if (p.province) s.add(p.province); });
    return Array.from(s).slice(0, 8);
  }, [profiles]);
  const countries = useMemo(() => {
    const s = new Set<string>();
    profiles.forEach(p => { if (p.country) s.add(p.country); });
    return Array.from(s).slice(0, 8);
  }, [profiles]);

  const resetFilters = () => {
    setScope('all');
    setGender('both');
    setAgeMin(14);
    setAgeMax(65);
    setSelCities([]);
    setSelProvinces([]);
    setSelCountries([]);
  };

  return (
    <IonPage>
      <Header />
      <IonContent className="dashboard-container">
        <div className="dashboard-content">
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
            {/* Lista de personas (izquierda) */}
            <div>
              <div style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h2 style={{ marginBottom: 8 }}>Gente</h2>
                  <div style={{ color: '#b3d1f0' }}>{filtered.length} resultados</div>
                </div>
                <div style={{ color: '#f0f8ff', marginBottom: 12 }}>Explora usuarios y gestiona tu relación.</div>
                {loading && <span style={{ color: '#b3d1f0' }}>Cargando…</span>}
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {filtered.map(u => {
                    const st = statusFor(u.id);
                    const name = `${(u.first_name||'')} ${(u.last_name||'')}`.trim() || u.email || u.id;
                    const cityStr = [u.city, u.province, u.country].filter(Boolean).join(' · ');
                    return (
                      <li key={u.id} style={{ display: 'grid', gridTemplateColumns: '64px 1fr auto', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #3F6DA2' }}>
                        <div style={{ width: 64, height: 64, borderRadius: 4, overflow: 'hidden', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {u.avatar_url ? <img src={u.avatar_url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span>👤</span>}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <div style={{ color: '#5785B6', fontWeight: 600 }}>{name}</div>
                          <div style={{ color: '#b3d1f0', fontSize: 12 }}>{cityStr}</div>
                          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                {/* Opciones principales estilo Tuenti: Mensaje privado / Eliminar amigo */}
                <button className="tuenti-upload-button" onClick={() => window.location.assign(`${import.meta.env.BASE_URL}privatemessages`)}>Mensaje privado</button>
                            {st.status === 'accepted' ? (
                              <button className="tuenti-upload-button" onClick={() => removeFriend(u.id)}>Eliminar Amigo</button>
                            ) : (
                              st.status === 'none' && <button className="tuenti-upload-button" onClick={() => sendRequest(u.id)}>Agregar</button>
                            )}
                            {st.status === 'pending' && st.direction === 'in' && (
                              <>
                                <button className="tuenti-upload-button" onClick={() => acceptRequest(u.id)}>Aceptar</button>
                                <button className="tuenti-upload-button" onClick={() => rejectRequest(u.id)}>Rechazar</button>
                              </>
                            )}
                            {st.status === 'pending' && st.direction === 'out' && (
                              <button className="tuenti-upload-button" onClick={() => cancelRequest(u.id)}>Cancelar</button>
                            )}
                            {st.status !== 'blocked' ? (
                              <button className="tuenti-upload-button" onClick={() => blockUser(u.id)}>Bloquear</button>
                            ) : (
                              st.direction === 'out' ? <button className="tuenti-upload-button" onClick={() => unblockUser(u.id)}>Desbloquear</button> : <button className="tuenti-upload-button" disabled>Bloqueado</button>
                            )}
                          </div>
                        </div>
                        <div style={{ color: '#b3d1f0', fontSize: 12, textAlign: 'right' }}>
                          {/* Meta estilo tuenti */}
                          fotos(0) · comentarios(0)
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>

            {/* Panel de filtros (derecha) */}
            <div>
              <div style={{ padding: 12, border: '1px solid #3F6DA2', borderRadius: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0 }}>Filtro</h3>
                  <button className="tuenti-upload-button" onClick={resetFilters}>Borrar Filtro</button>
                </div>

                <div style={{ marginTop: 12 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>Ámbito</div>
                  <div style={{ display: 'grid', gap: 6 }}>
                    <label><input type="radio" name="scope" checked={scope==='friends'} onChange={()=>setScope('friends')} /> Mis Amigos</label>
                    <label><input type="radio" name="scope" checked={scope==='fof'} onChange={()=>setScope('fof')} /> Amigos de amigos</label>
                    <label><input type="radio" name="scope" checked={scope==='all'} onChange={()=>setScope('all')} /> Toda Tuenti</label>
                  </div>
                  {/* Buscador debajo de 'Toda Tuenti' */}
                  <div style={{ marginTop: 8 }}>
                    <input className="tuenti-search-input" style={{ width: '100%' }} placeholder="Buscar personas" value={query} onChange={e => setQuery(e.target.value)} />
                  </div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>Género</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <label><input type="radio" name="gender" checked={gender==='boy'} onChange={()=>setGender('boy')} /> Chicos</label>
                    <label><input type="radio" name="gender" checked={gender==='girl'} onChange={()=>setGender('girl')} /> Chicas</label>
                    <label><input type="radio" name="gender" checked={gender==='both'} onChange={()=>setGender('both')} /> Ambos</label>
                  </div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>Edad</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <label>de <input type="number" min={14} max={65} value={ageMin} onChange={e=>setAgeMin(Number(e.target.value)||14)} style={{ width: 64 }} /></label>
                    <label>a <input type="number" min={14} max={65} value={ageMax} onChange={e=>setAgeMax(Number(e.target.value)||65)} style={{ width: 64 }} /></label>
                  </div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>Ciudad</div>
                  <div style={{ display: 'grid', gap: 4 }}>
                    {cities.map(c => (
                      <label key={c}><input type="checkbox" checked={selCities.includes(c)} onChange={e=>{
                        setSelCities(prev => e.target.checked ? [...prev, c] : prev.filter(x=>x!==c))
                      }} /> {c}</label>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>Provincia</div>
                  <div style={{ display: 'grid', gap: 4 }}>
                    {provinces.map(c => (
                      <label key={c}><input type="checkbox" checked={selProvinces.includes(c)} onChange={e=>{
                        setSelProvinces(prev => e.target.checked ? [...prev, c] : prev.filter(x=>x!==c))
                      }} /> {c}</label>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>País</div>
                  <div style={{ display: 'grid', gap: 4 }}>
                    {countries.map(c => (
                      <label key={c}><input type="checkbox" checked={selCountries.includes(c)} onChange={e=>{
                        setSelCountries(prev => e.target.checked ? [...prev, c] : prev.filter(x=>x!==c))
                      }} /> {c}</label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Footer desactivado en esta página */}
      </IonContent>
    </IonPage>
  );
};

export default People;