-- Crear campo de rol en profiles y tabla invitations
alter table public.profiles
  add column if not exists role text not null default 'user' check (role in ('user','admin')),
  -- Estado de la cuenta para moderación
  add column if not exists status text not null default 'active' check (status in ('active','suspended','banned'));

-- Asegurar que existen las columnas usadas por Ajustes y el perfil
alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists avatar_url text,
  add column if not exists email text,
  add column if not exists gender text check (gender in ('boy','girl','prefer_not_to_say','other')),
  add column if not exists birth_day int,
  add column if not exists birth_month int,
  add column if not exists birth_year int,
  add column if not exists age int,
  add column if not exists country text,
  add column if not exists city text,
  add column if not exists province text,
  add column if not exists marital_status text check (marital_status in ('single','married','divorced','widowed','relationship','')),
  add column if not exists website text,
  add column if not exists phone text,
  add column if not exists origin_country text,
  add column if not exists looking_for text check (looking_for in ('looking_for_guy','looking_for_girl','looking_for_both','do_not_show','')),
  add column if not exists is_private boolean default false,
  add column if not exists is_online boolean default false,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

-- Tabla de admins para evitar recursión en políticas de profiles
create table if not exists public.admins (
  user_id uuid primary key,
  created_at timestamptz not null default now()
);

-- No habilitamos RLS en admins para permitir comprobación directa desde funciones SECURITY DEFINER

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

-- Tabla de reportes para moderación
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users(id) on delete set null,
  target_type text not null check (target_type in ('user','photo','message','page','event','comment','status')),
  target_id text not null,
  reason text,
  status text not null default 'pending' check (status in ('pending','in_review','resolved','rejected')),
  assigned_admin_id uuid references auth.users(id) on delete set null,
  resolution_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

alter table public.reports enable row level security;

-- Tabla mínima de fotos para conteo de estadísticas
create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  url text,
  created_at timestamptz not null default now()
);

alter table public.photos enable row level security;

-- Tabla de tickets de soporte personales
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  title text not null,
  description text,
  status text not null default 'open' check (status in ('open','in_progress','resolved','closed')),
  priority int default 0,
  assigned_admin_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

alter table public.support_tickets enable row level security;

-- Tabla de páginas
create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  name text not null,
  description text,
  visibility text not null default 'public' check (visibility in ('public','friends','private')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pages enable row level security;

-- Tabla de eventos
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  title text not null,
  description text,
  event_date timestamptz,
  visibility text not null default 'public' check (visibility in ('public','friends','private')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.events enable row level security;

-- Tabla de posts del blog (administración Tuenti)
create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references auth.users(id) on delete set null,
  title text not null,
  content text,
  status text not null default 'published' check (status in ('published','hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.blog_posts enable row level security;

-- Tabla de alertas globales (persistencia opcional)
create table if not exists public.global_alerts (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  constraint global_alerts_message_len check (char_length(message) <= 160)
);

alter table public.global_alerts enable row level security;

-- Habilitar Realtime para perfiles (necesario para propagar is_online al instante)
alter publication supabase_realtime add table public.profiles;
