-- Migración: username dentro de profiles

-- Añadir columna username a profiles (única)
alter table public.profiles
  add column if not exists username text unique;

-- Secuencia para generar usernames numéricos (reservamos 0000001 para el usuario indicado)
create sequence if not exists public.username_seq start 2 increment 1;

-- Asignar 0000001 al usuario especificado si no tiene aún username
update public.profiles
  set username = '0000001'
  where id = '24223355-b04d-4ad2-ae7a-54a0c6ba2be0'
    and (username is null or username = '');

-- Limpieza opcional: eliminar tabla previa si existe
drop table if exists public.usernames cascade;