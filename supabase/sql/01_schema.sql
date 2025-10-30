-- Crear campo de rol en profiles y tabla invitations
alter table public.profiles
  add column if not exists role text not null default 'user' check (role in ('user','admin'));

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  token text unique not null,
  status text not null default 'pending' check (status in ('pending','accepted','revoked','expired')),
  invited_by uuid references auth.users(id) on delete set null,
  invited_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

alter table public.invitations enable row level security;
