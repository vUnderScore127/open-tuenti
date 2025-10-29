import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Header } from '@/components/Header';
import { supabase, friendshipService } from '@/lib/supabase';
import { FaUser, FaFileAlt, FaGlobe, FaGamepad } from 'react-icons/fa';
import { toast } from '@/hooks/use-toast';

export default function People() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchParams] = useSearchParams();
  const query = searchParams.get('query')?.toLowerCase() || '';
  const navigate = useNavigate();

  // Estados para los filtros
  const [searchType, setSearchType] = useState('Todo Tuenti: Gente');
  const [relation, setRelation] = useState('Mis amigos');
  const [genderFilter, setGenderFilter] = useState('');
  const [ageFrom, setAgeFrom] = useState('');
  const [ageTo, setAgeTo] = useState('');
  const [country, setCountry] = useState('');
  const [category, setCategory] = useState('Gente');
  const [currentUserId, setCurrentUserId] = useState(null);
  const [friendshipStatuses, setFriendshipStatuses] = useState({});

  // Añadir estado para el usuario actual:
  useEffect(() => {
    async function fetchUsers() {
      // Obtener usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
      
      const { data, error } = await supabase.from('profiles').select('id, first_name, last_name, avatar_url, city, gender, bio, age, country');
      console.log('Datos obtenidos:', data);
      console.log('Error:', error);
      if (!error && data) {
        setUsers(data);
      }
    }
    fetchUsers();
  }, []);

 useEffect(() => {
  console.log('Usuarios originales:', users.length);
  console.log('Query de búsqueda:', query);
  console.log('Filtro de relación:', relation);
  console.log('Usuario actual ID:', currentUserId);
  let filtered = users;
  if (currentUserId) {
    filtered = filtered.filter(u => u.id !== currentUserId);
  }
  // Mostrar todos los usuarios en "Todo Tuenti" sin importar estado de amistad
  if (relation !== 'Todo tuenti') {
    if (relation === 'Mis amigos') {
      filtered = filtered.filter(user => {
        const friendshipStatus = friendshipStatuses[user.id] || 'none';
        return friendshipStatus === 'friends';
      });
    } else if (relation === 'Solicitudes pendientes') {
      filtered = filtered.filter(user => {
        const friendshipStatus = friendshipStatuses[user.id] || 'none';
        return friendshipStatus === 'pending_received';
      });
    }
  }
  if (query) {
    filtered = filtered.filter(u =>
      (u.first_name && u.first_name.toLowerCase().includes(query)) ||
      (u.last_name && u.last_name.toLowerCase().includes(query)) ||
      (u.city && u.city.toLowerCase().includes(query)) ||
      (u.country && u.country.toLowerCase().includes(query))
    );
  }
  if (genderFilter) {
    const genderValue = genderFilter === 'Chico' ? 'male' : genderFilter === 'Chica' ? 'female' : genderFilter;
    filtered = filtered.filter(u => u.gender === genderValue);
  }
  if (ageFrom) {
    filtered = filtered.filter(u => u.age >= parseInt(ageFrom));
  }
  if (ageTo) {
    filtered = filtered.filter(u => u.age <= parseInt(ageTo));
  }
  if (country) {
    filtered = filtered.filter(u => 
      u.country && u.country.toLowerCase().includes(country.toLowerCase())
    );
  }
  console.log('Usuarios filtrados finales:', filtered.length);
  setFilteredUsers(filtered);
}, [users, query, relation, genderFilter, ageFrom, ageTo, country, currentUserId, friendshipStatuses, searchType]);
  const getTitle = () => {
    switch (relation) {
      case 'Mis amigos':
        return 'Mis amigos';
      case 'Amigos de amigos':
        return 'Amigos de amigos';
      case 'Todo tuenti':
        return 'Todo Tuenti';
      default:
        return 'Mis amigos';
    }
  };

  // Cambiar el useEffect (líneas 109-112)
  useEffect(() => {
    if (filteredUsers.length > 0 && currentUserId) {
      loadFriendshipStatuses(filteredUsers);
    }
  }, [filteredUsers, currentUserId]); // ✅ AGREGAR filteredUsers como dependencia
  const loadFriendshipStatuses = async (usersList) => {
    if (!currentUserId) return;
    
    const statuses = {};
    let hasChanges = false;
    
    for (const user of usersList) {
      try {
        const status = await friendshipService.getFriendshipStatus(currentUserId, user.id);
        console.log(`Estado de amistad con ${user.first_name} ${user.last_name}:`, status); // Log temporal
        statuses[user.id] = status;
        
        // Verificar si hay cambios reales
        if (friendshipStatuses[user.id] !== status) {
          hasChanges = true;
        }
      } catch (error) {
        console.error('Error loading friendship status:', error);
        statuses[user.id] = 'none';
      }
    }
    
    // Solo actualizar si hay cambios reales
    if (hasChanges) {
      setFriendshipStatuses(prev => ({ ...prev, ...statuses }));
    }
  };

  // Función para enviar solicitud de amistad
  const handleSendFriendRequest = async (userId, userName, userGender) => {
    if (!currentUserId) return;
    
    try {
      const success = await friendshipService.sendFriendRequest(currentUserId, userId);
      if (success) {
        setFriendshipStatuses(prev => ({ ...prev, [userId]: 'pending_sent' }));
        const genderText = userGender === 'female' ? 'amiga' : 'amigo';
        toast({
          title: "Solicitud enviada",
          description: `Se ha enviado una solicitud para agregar como ${genderText} a ${userName}`
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo enviar la solicitud de amistad",
        variant: "destructive"
      });
    }
  };

  // Función para enviar mensaje privado
  const handleSendMessage = (userId) => {
    navigate(`/messages?user=${userId}`);
  };

  // Función para ver perfil de usuario
  const handleViewProfile = (userId) => {
    navigate(`/user/${userId}`);
  };

  // Función para ver amigos
  const handleViewFriends = (userId) => {
    navigate(`/user/${userId}#friends`);
  };

  // Función para eliminar amigo
  const handleRemoveFriend = async (userId, userName) => {
    if (!currentUserId) return;
    
    try {
      const success = await friendshipService.removeFriend(currentUserId, userId);
      if (success) {
        setFriendshipStatuses(prev => ({ ...prev, [userId]: 'none' }));
        toast({
          title: "Amigo eliminado",
          description: `${userName} ha sido eliminado de tu lista de amigos`
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el amigo",
        variant: "destructive"
      });
    }
  };

  // Función para responder solicitud de amistad (agregar después de handleRemoveFriend)
  const handleRespondFriendRequest = (userId) => {
    navigate('/notifications?type=friend_request'); // Cambiar de friend_requests a friend_request
  };

  // Función para renderizar botones según el estado de amistad
  const renderActionButtons = (user) => {
    const friendshipStatus = friendshipStatuses[user.id] || 'none';
    const userName = `${user.first_name} ${user.last_name}`;
    const genderText = user.gender === 'female' ? 'amiga' : 'amigo';

    return (
      <div className="flex gap-2 mt-2">
        <Button 
          onClick={() => handleSendMessage(user.id)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded shadow-sm text-sm font-semibold"
        >
          Mensaje privado
        </Button>
        
        {friendshipStatus === 'friends' ? (
          <>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleViewFriends(user.id)}
            >
              Ver amigos
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">Más opciones</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleRemoveFriend(user.id, userName)}>
                  Eliminar de amigos
                </DropdownMenuItem>
                <DropdownMenuItem>Bloquear</DropdownMenuItem>
                <DropdownMenuItem>Reportar usuario</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleViewProfile(user.id)}
            >
              Ver perfil
            </Button>
            {friendshipStatus === 'none' && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleSendFriendRequest(user.id, userName, user.gender)}
                className="bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
              >
                Agregar como {genderText}
              </Button>
            )}
            {friendshipStatus === 'pending_sent' && (
              <Button 
                variant="outline" 
                size="sm"
                disabled
                className="bg-yellow-50 text-yellow-700 border-yellow-300"
              >
                Solicitud enviada
              </Button>
            )}
            {friendshipStatus === 'pending_received' && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleRespondFriendRequest(user.id)}
                className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300"
              >
                Responder solicitud
              </Button>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <>
      <Header />
      <div className="max-w-5xl mx-auto flex gap-8 px-8 py-6">
        {/* Main content */}
        <div className="flex-1">
          <h1 className="text-2xl font-bold mb-2">{getTitle()} <span className="font-normal">({filteredUsers.length} resultados)</span></h1>
          <div className="space-y-6">
            {category === 'Gente' ? (
              filteredUsers.map(user => (
                <div key={user.id} className="flex gap-4 items-start bg-white rounded-lg shadow p-4">
                  <img 
                    src={user.avatar_url || '/src/lib/img/default_tuenties.webp'} 
                    alt={`${user.first_name} ${user.last_name}`} 
                    className="w-28 h-28 object-cover cursor-pointer" 
                    style={{ borderRadius: 0 }}
                    onClick={() => handleViewProfile(user.id)}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span 
                        className="text-blue-700 font-bold text-lg cursor-pointer hover:underline"
                        onClick={() => handleViewProfile(user.id)}
                      >
                        {user.first_name} {user.last_name}
                      </span>
                    </div>
                    <div className="text-gray-600 text-sm mt-1">
                      {user.city} · {user.gender === 'male' ? 'Chico' : user.gender === 'female' ? 'Chica' : user.gender} · {user.age} · {user.country}
                    </div>
                    {renderActionButtons(user)}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-gray-500 text-center py-8">No hay resultados para esta categoría todavía.</div>
            )}
          </div>
        </div>
        {/* Sidebar */}
        <aside className="w-80 bg-white rounded-lg shadow p-4">
          <div className="mb-6">
            <div className="text-lg font-bold text-gray-900 mb-2">Buscar en</div>
            <hr className="mb-3" />
            <div className="text-sm text-gray-700">Todo Tuenti</div>
          </div>
          
          <div className="flex flex-col gap-1 mb-4">
            {categories.map((cat) => (
              <button
                key={cat.label}
                onClick={() => setCategory(cat.label)}
                className={`flex items-center gap-2 px-1 py-1 text-sm transition border-none bg-transparent shadow-none hover:bg-transparent focus:outline-none ${category === cat.label ? 'font-bold text-blue-700' : 'text-gray-700 font-normal'}`}
                style={{minHeight: 'unset'}}
              >
                <span className="text-base">{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
          
          {/* El resto de filtros igual que antes, pero asegúrate de que todos usan onChange y estados controlados */}
          <div className="font-bold mb-2">Filtros</div>
          <hr className="mb-2" />
          <div className="font-bold mb-1">Buscar entre</div>
          <div className="flex flex-col gap-2 mb-2">
            <label><input type="radio" name="buscar" value="Mis amigos" checked={relation === 'Mis amigos'} onChange={e => setRelation(e.target.value)} /> Mis amigos</label>
            <label><input type="radio" name="buscar" value="Amigos de amigos" checked={relation === 'Amigos de amigos'} onChange={e => setRelation(e.target.value)} /> Amigos de amigos</label>
            <label><input type="radio" name="buscar" value="Todo tuenti" checked={relation === 'Todo tuenti'} onChange={e => setRelation(e.target.value)} /> Todo tuenti</label>
          </div>
          <div className="font-bold mb-1">Por sexo</div>
          <div className="flex gap-2 mb-2">
            <label><input type="radio" name="sexo" value="Chico" checked={genderFilter === 'Chico'} onChange={e => setGenderFilter(e.target.value)} /> Chico</label>
            <label><input type="radio" name="sexo" value="Chica" checked={genderFilter === 'Chica'} onChange={e => setGenderFilter(e.target.value)} /> Chica</label>
            <label><input type="radio" name="sexo" value="" checked={genderFilter === ''} onChange={e => setGenderFilter('')} /> Cualquiera</label>
          </div>
          <div className="font-bold mb-1">Por edad</div>
          <div className="flex items-center gap-2 mb-2">
            De <select className="w-16" value={ageFrom} onChange={e => setAgeFrom(e.target.value)}><option value=""></option>{Array.from({length: 83}, (_, i) => <option key={i+14} value={i+14}>{i+14}</option>)}</select>
            a <select className="w-16" value={ageTo} onChange={e => setAgeTo(e.target.value)}><option value=""></option>{Array.from({length: 83}, (_, i) => <option key={i+14} value={i+14}>{i+14}</option>)}</select>
          </div>
          <div className="font-bold mb-1">Por país</div>
          <input type="text" placeholder="País" className="w-full border rounded p-1" value={country} onChange={e => setCountry(e.target.value)} />
        </aside>
      </div>
    </>
  );
}

const categories = [
  { label: 'Gente', icon: <FaUser /> },
  { label: 'Páginas', icon: <FaFileAlt /> },
  { label: 'Sitios', icon: <FaGlobe /> },
  { label: 'Juegos', icon: <FaGamepad /> },
];