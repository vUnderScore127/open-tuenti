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
