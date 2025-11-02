-- Crear tabla de posts (feed de estados)
-- Ejecuta este archivo en el SQL editor de Supabase antes de 06_posts_policies.sql

begin;

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

-- Índices útiles para consultas por usuario y orden cronológico
create index if not exists idx_posts_user_id on public.posts(user_id);
create index if not exists idx_posts_created_at on public.posts(created_at);

-- Habilitar RLS (las políticas se aplican en 06_posts_policies.sql)
alter table public.posts enable row level security;

commit;