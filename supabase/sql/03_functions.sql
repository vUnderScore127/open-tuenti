-- RPC functions to verify and accept invitations (security definer to bypass RLS)

create or replace function public.verify_invitation(invite_token text)
returns public.invitations
language sql
security definer
set search_path = public
as $$
  select * from public.invitations where token = invite_token limit 1;
$$;

grant execute on function public.verify_invitation(invite_token text) to anon, authenticated;

create or replace function public.accept_invitation(invite_token text)
returns public.invitations
language plpgsql
security definer
set search_path = public
as $$
declare inv public.invitations;
begin
  select * into inv from public.invitations where token = invite_token for update;
  if not found then
    raise exception 'Invalid invitation token';
  end if;
  update public.invitations
    set status = 'accepted', invited_user_id = auth.uid()
    where id = inv.id
    returning * into inv;
  return inv;
end;
$$;

grant execute on function public.accept_invitation(invite_token text) to authenticated;

-- Helper: check if current user is admin (bypasses RLS to avoid recursion)
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.admins a
    where a.user_id = auth.uid()
  );
$$;

grant execute on function public.is_admin() to anon, authenticated;

-- Post-signup: crear perfil sin username
-- Reemplaza cualquier función/trigger existentes que dependan de username
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Insertar perfil mínimo sin columna username
  insert into public.profiles (id, email, created_at, updated_at)
  values (new.id, new.email, now(), now())
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Trigger sobre auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- RPC: publicar alerta global (persiste y puede activar Realtime si se usa postgres_changes)
create or replace function public.publish_global_alert(p_message text, p_ttl_seconds int default 0)
returns public.global_alerts
language plpgsql
security definer
set search_path = public
as $$
declare new_alert public.global_alerts;
begin
  -- Solo admins pueden publicar
  if not public.is_admin() then
    raise exception 'Only admins can publish global alerts';
  end if;

  insert into public.global_alerts (message, created_by, expires_at)
  values (
    p_message,
    auth.uid(),
    case when p_ttl_seconds > 0 then now() + (p_ttl_seconds || ' seconds')::interval else null end
  )
  returning * into new_alert;

  return new_alert;
end;
$$;

grant execute on function public.publish_global_alert(p_message text, p_ttl_seconds int) to authenticated;

-- RPC: aceptar/rechazar amistad de forma segura bajo RLS
create or replace function public.accept_friendship(p_user_id uuid, p_friend_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare updated_count int;
begin
  -- Solo participantes pueden aceptar
  if auth.uid() <> p_user_id and auth.uid() <> p_friend_id then
    raise exception 'Unauthorized';
  end if;

  update public.friendships
    set status = 'accepted', updated_at = now()
    where status = 'pending'
      and ((user_id = p_friend_id and friend_id = p_user_id) or (user_id = p_user_id and friend_id = p_friend_id));

  get diagnostics updated_count = ROW_COUNT;
  return updated_count > 0;
end;
$$;

grant execute on function public.accept_friendship(p_user_id uuid, p_friend_id uuid) to authenticated;

create or replace function public.reject_friendship(p_user_id uuid, p_friend_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare updated_count int;
begin
  -- Solo participantes pueden rechazar
  if auth.uid() <> p_user_id and auth.uid() <> p_friend_id then
    raise exception 'Unauthorized';
  end if;

  update public.friendships
    set status = 'rejected', updated_at = now()
    where status = 'pending'
      and ((user_id = p_friend_id and friend_id = p_user_id) or (user_id = p_user_id and friend_id = p_friend_id));

  get diagnostics updated_count = ROW_COUNT;
  return updated_count > 0;
end;
$$;

grant execute on function public.reject_friendship(p_user_id uuid, p_friend_id uuid) to authenticated;

-- RPC: obtener o crear username directamente en profiles
create or replace function public.get_or_create_username(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare current_username text;
begin
  -- Leer username actual
  select username into current_username from public.profiles where id = p_user_id;

  if current_username is not null and current_username <> '' then
    return current_username;
  end if;

  -- Generar nuevo username numérico (7 dígitos, con padding)
  update public.profiles
    set username = lpad((nextval('public.username_seq'))::text, 7, '0')
    where id = p_user_id
    returning username into current_username;

  return current_username;
end;
$$;

grant execute on function public.get_or_create_username(p_user_id uuid) to authenticated;
