-- Parche: añadir columnas faltantes y políticas a notifications

begin;

-- Añadir columnas usadas por el frontend si no existen
alter table public.notifications
  add column if not exists related_id text,
  add column if not exists related_type text,
  add column if not exists action_url text,
  add column if not exists metadata jsonb,
  add column if not exists from_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists is_read boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

-- Habilitar RLS (si no estaba habilitado)
alter table public.notifications enable row level security;

-- Políticas mínimas
drop policy if exists notifications_user_select_own on public.notifications;
create policy notifications_user_select_own on public.notifications
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists notifications_user_insert_emitter on public.notifications;
create policy notifications_user_insert_emitter on public.notifications
  for insert
  to authenticated
  with check (from_user_id = auth.uid());

drop policy if exists notifications_user_update_own on public.notifications;
create policy notifications_user_update_own on public.notifications
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Realtime publication para notificaciones
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.notifications;
    exception when others then null; end;
  end if;
end $$;

commit;