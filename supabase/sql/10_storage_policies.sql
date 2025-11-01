-- Configuración del bucket para fotos (las políticas se gestionan vía la UI de Storage)

begin;

-- Crear bucket público para fotos si no existe
insert into storage.buckets (id, name, public)
values ('tuentibucket', 'tuentibucket', true)
on conflict (id) do nothing;

-- IMPORTANTE:
-- No intentes crear/alterar políticas de storage.objects vía migraciones SQL.
-- Ese DDL suele fallar con "must be owner of table objects".
-- Gestiona las políticas desde el Dashboard → Storage → Buckets → tuentibucket → Policies.
-- Copia/pega estas condiciones en la UI (Target roles: authenticated):
--
-- Insert (usuario):
--   With Check: bucket_id = 'tuentibucket' and split_part(name, '/', 1) = auth.uid()::text
-- Update (usuario):
--   Using:      bucket_id = 'tuentibucket' and split_part(name, '/', 1) = auth.uid()::text
--   With Check: bucket_id = 'tuentibucket' and split_part(name, '/', 1) = auth.uid()::text
-- Delete (usuario):
--   Using:      bucket_id = 'tuentibucket' and split_part(name, '/', 1) = auth.uid()::text
--
-- Insert (admin):
--   With Check: bucket_id = 'tuentibucket' and public.is_admin()
-- Update (admin):
--   Using:      bucket_id = 'tuentibucket' and public.is_admin()
--   With Check: bucket_id = 'tuentibucket' and public.is_admin()
-- Delete (admin):
--   Using:      bucket_id = 'tuentibucket' and public.is_admin()

commit;
