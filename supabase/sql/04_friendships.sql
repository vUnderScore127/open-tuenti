-- Tabla y políticas para sistema de amistades

-- Crear enum de estados si se desea, pero usamos texto con check para alinearnos con el código existente

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  friend_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','rejected','blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint friendships_pair_unique unique (user_id, friend_id),
  constraint friendships_users_distinct check (user_id <> friend_id)
);

-- Índices de ayuda
create index if not exists idx_friendships_user_id on public.friendships(user_id);
create index if not exists idx_friendships_friend_id on public.friendships(friend_id);
create index if not exists idx_friendships_status on public.friendships(status);

-- Activar RLS
alter table public.friendships enable row level security;

-- Políticas: cada usuario ve y gestiona relaciones donde participa
drop policy if exists friendships_user_select on public.friendships;
create policy friendships_user_select on public.friendships
  for select
  using (user_id = auth.uid() or friend_id = auth.uid());

drop policy if exists friendships_user_insert on public.friendships;
create policy friendships_user_insert on public.friendships
  for insert
  with check (user_id = auth.uid() and friend_id <> auth.uid());

drop policy if exists friendships_user_update on public.friendships;
create policy friendships_user_update on public.friendships
  for update
  using (user_id = auth.uid() or friend_id = auth.uid())
  with check (user_id = auth.uid() or friend_id = auth.uid());

drop policy if exists friendships_user_delete on public.friendships;
create policy friendships_user_delete on public.friendships
  for delete
  using (user_id = auth.uid() or friend_id = auth.uid());