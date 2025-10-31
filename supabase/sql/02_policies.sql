-- Policies: admin full access on invitations; limited exposure via RPC for verification

-- Admin select/insert/update/delete on invitations
drop policy if exists invitations_admin_select on public.invitations;
create policy invitations_admin_select on public.invitations
  for select
  using (public.is_admin());

drop policy if exists invitations_admin_insert on public.invitations;
create policy invitations_admin_insert on public.invitations
  for insert
  with check (public.is_admin());

drop policy if exists invitations_admin_update on public.invitations;
create policy invitations_admin_update on public.invitations
  for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists invitations_admin_delete on public.invitations;
create policy invitations_admin_delete on public.invitations
  for delete
  using (public.is_admin());

-- Opcional: permitir al usuario ver sus propias invitaciones por email
-- create policy invitations_select_by_email on public.invitations
--   for select
--   using ((select email from public.profiles where id = auth.uid()) = email);

-- Policies para profiles: admin global select/update
alter table public.profiles enable row level security;

drop policy if exists profiles_admin_select on public.profiles;
create policy profiles_admin_select on public.profiles
  for select
  using (public.is_admin());

drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update on public.profiles
  for update
  using (public.is_admin())
  with check (public.is_admin());

-- Usuario puede ver y actualizar su propio perfil
drop policy if exists profiles_self_select on public.profiles;
create policy profiles_self_select on public.profiles
  for select
  using (id = auth.uid());

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- Usuario puede insertar su propio perfil (id debe ser su uid)
drop policy if exists profiles_self_insert on public.profiles;
create policy profiles_self_insert on public.profiles
  for insert
  with check (id = auth.uid());

-- NUEVA POLÍTICA: permitir a usuarios autenticados ver perfiles de otros usuarios
-- Nota: esto expone todas las columnas de profiles; para producción se recomienda
-- usar una vista o función SECURITY DEFINER que limite columnas. Para el prototipo,
-- esto habilita la página Gente.
drop policy if exists profiles_authenticated_select_all on public.profiles;
create policy profiles_authenticated_select_all on public.profiles
  for select
  using (auth.uid() is not null);

-- Policies para reports (moderación)
drop policy if exists reports_admin_select on public.reports;
create policy reports_admin_select on public.reports
  for select
  using (public.is_admin());

drop policy if exists reports_admin_insert on public.reports;
create policy reports_admin_insert on public.reports
  for insert
  with check (public.is_admin());

drop policy if exists reports_admin_update on public.reports;
create policy reports_admin_update on public.reports
  for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists reports_admin_delete on public.reports;
create policy reports_admin_delete on public.reports
  for delete
  using (public.is_admin());

-- Permitir a usuarios autenticados crear reportes
drop policy if exists reports_user_insert on public.reports;
create policy reports_user_insert on public.reports
  for insert
  with check (reporter_id = auth.uid());

-- Permitir a usuarios ver sus propios reportes
drop policy if exists reports_user_select_own on public.reports;
create policy reports_user_select_own on public.reports
  for select
  using (reporter_id = auth.uid());

-- Policies para photos (mínimas para estadísticas; ampliar según necesidades)
drop policy if exists photos_admin_select on public.photos;
create policy photos_admin_select on public.photos
  for select
  using (public.is_admin());

drop policy if exists photos_user_select_own on public.photos;
create policy photos_user_select_own on public.photos
  for select
  using (user_id = auth.uid());

drop policy if exists photos_user_insert on public.photos;
create policy photos_user_insert on public.photos
  for insert
  with check (user_id = auth.uid());

-- Policies para support_tickets (Soporte)
alter table public.support_tickets enable row level security;

drop policy if exists support_tickets_admin_select on public.support_tickets;
create policy support_tickets_admin_select on public.support_tickets
  for select
  using (public.is_admin());

drop policy if exists support_tickets_admin_insert on public.support_tickets;
create policy support_tickets_admin_insert on public.support_tickets
  for insert
  with check (public.is_admin());

drop policy if exists support_tickets_admin_update on public.support_tickets;
create policy support_tickets_admin_update on public.support_tickets
  for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists support_tickets_admin_delete on public.support_tickets;
create policy support_tickets_admin_delete on public.support_tickets
  for delete
  using (public.is_admin());

-- Usuario autenticado puede crear y ver sus propios tickets
drop policy if exists support_tickets_user_insert on public.support_tickets;
create policy support_tickets_user_insert on public.support_tickets
  for insert
  with check (user_id = auth.uid());

drop policy if exists support_tickets_user_select_own on public.support_tickets;
create policy support_tickets_user_select_own on public.support_tickets
  for select
  using (user_id = auth.uid());

drop policy if exists support_tickets_user_update_own on public.support_tickets;
create policy support_tickets_user_update_own on public.support_tickets
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Policies para pages
alter table public.pages enable row level security;

drop policy if exists pages_admin_all on public.pages;
create policy pages_admin_all on public.pages
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists pages_user_insert on public.pages;
create policy pages_user_insert on public.pages
  for insert
  with check (owner_id = auth.uid());

drop policy if exists pages_user_select_own on public.pages;
create policy pages_user_select_own on public.pages
  for select
  using (owner_id = auth.uid());

drop policy if exists pages_user_update_own on public.pages;
create policy pages_user_update_own on public.pages
  for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Policies para events
alter table public.events enable row level security;

drop policy if exists events_admin_all on public.events;
create policy events_admin_all on public.events
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists events_user_insert on public.events;
create policy events_user_insert on public.events
  for insert
  with check (owner_id = auth.uid());

drop policy if exists events_user_select_own on public.events;
create policy events_user_select_own on public.events
  for select
  using (owner_id = auth.uid());

drop policy if exists events_user_update_own on public.events;
create policy events_user_update_own on public.events
  for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Policies para blog_posts (admins únicamente)
alter table public.blog_posts enable row level security;

drop policy if exists blog_posts_admin_select on public.blog_posts;
create policy blog_posts_admin_select on public.blog_posts
  for select
  using (public.is_admin());

drop policy if exists blog_posts_admin_insert on public.blog_posts;
create policy blog_posts_admin_insert on public.blog_posts
  for insert
  with check (public.is_admin());

drop policy if exists blog_posts_admin_update on public.blog_posts;
create policy blog_posts_admin_update on public.blog_posts
  for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists blog_posts_admin_delete on public.blog_posts;
create policy blog_posts_admin_delete on public.blog_posts
  for delete
  using (public.is_admin());

-- Policies para global_alerts
alter table public.global_alerts enable row level security;

-- Admin: acceso total
drop policy if exists global_alerts_admin_all on public.global_alerts;
create policy global_alerts_admin_all on public.global_alerts
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- Usuarios autenticados: lectura (para historial)
drop policy if exists global_alerts_authenticated_select on public.global_alerts;
create policy global_alerts_authenticated_select on public.global_alerts
  for select
  using (true);
