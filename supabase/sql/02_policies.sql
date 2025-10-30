-- Policies: admin full access on invitations; limited exposure via RPC for verification

-- Admin select/insert/update/delete on invitations
create policy invitations_admin_select on public.invitations
  for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy invitations_admin_insert on public.invitations
  for insert
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy invitations_admin_update on public.invitations
  for update
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy invitations_admin_delete on public.invitations
  for delete
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Opcional: permitir al usuario ver sus propias invitaciones por email
-- create policy invitations_select_by_email on public.invitations
--   for select
--   using ((select email from public.profiles where id = auth.uid()) = email);

-- Policies para profiles: admin global select/update
alter table public.profiles enable row level security;

create policy profiles_admin_select on public.profiles
  for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy profiles_admin_update on public.profiles
  for update
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Usuario puede ver y actualizar su propio perfil
create policy profiles_self_select on public.profiles
  for select
  using (id = auth.uid());

create policy profiles_self_update on public.profiles
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- Usuario puede insertar su propio perfil (id debe ser su uid)
create policy profiles_self_insert on public.profiles
  for insert
  with check (id = auth.uid());
