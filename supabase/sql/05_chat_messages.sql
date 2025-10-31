-- Tabla y políticas para chat en tiempo real

-- Asegurar columna de estado online en profiles
alter table public.profiles
  add column if not exists is_online boolean default false;

-- Crear tabla de mensajes de chat
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  message_type text not null default 'text' check (message_type in ('text','image','file')),
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Asegurar columnas obligatorias si la tabla ya existía con otro esquema
alter table public.chat_messages add column if not exists conversation_id text;
alter table public.chat_messages add column if not exists message_type text default 'text';
alter table public.chat_messages add column if not exists is_read boolean default false;
alter table public.chat_messages add column if not exists created_at timestamptz default now();
alter table public.chat_messages add column if not exists updated_at timestamptz default now();

-- Rellenar conversation_id para filas existentes
update public.chat_messages
  set conversation_id = case
    when sender_id::text < receiver_id::text then sender_id::text || '-' || receiver_id::text
    else receiver_id::text || '-' || sender_id::text
  end
where conversation_id is null or char_length(conversation_id) = 0;

-- Forzar NOT NULL una vez relleno
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='chat_messages' and column_name='conversation_id') then
    alter table public.chat_messages alter column conversation_id set not null;
  end if;
end $$;

-- Índices para rendimiento
create index if not exists idx_chat_messages_conversation on public.chat_messages(conversation_id);
create index if not exists idx_chat_messages_receiver_unread on public.chat_messages(receiver_id, is_read);
create index if not exists idx_chat_messages_created_at on public.chat_messages(created_at);

-- Activar RLS
alter table public.chat_messages enable row level security;

-- Políticas: los participantes pueden ver/insertar/actualizar sus mensajes
drop policy if exists chat_messages_participants_select on public.chat_messages;
create policy chat_messages_participants_select on public.chat_messages
  for select
  using (sender_id = auth.uid() or receiver_id = auth.uid());

drop policy if exists chat_messages_sender_insert on public.chat_messages;
create policy chat_messages_sender_insert on public.chat_messages
  for insert
  with check (sender_id = auth.uid() and receiver_id <> auth.uid());

drop policy if exists chat_messages_participants_update on public.chat_messages;
create policy chat_messages_participants_update on public.chat_messages
  for update
  using (sender_id = auth.uid() or receiver_id = auth.uid())
  with check (sender_id = auth.uid() or receiver_id = auth.uid());

-- Habilitar la tabla en la publicación de Realtime
alter publication supabase_realtime add table public.chat_messages;