-- Auto-assign ascending numeric usernames on profile creation
-- and backfill missing usernames

begin;

-- Ensure sequence exists (starts at 2 to reserve 0000001)
create sequence if not exists public.username_seq start 2 increment 1;

-- Set default on profiles.username to auto-generate 7-digit usernames
alter table public.profiles
  alter column username set default lpad((nextval('public.username_seq'))::text, 7, '0');

-- Backfill: assign usernames where missing
update public.profiles
  set username = lpad((nextval('public.username_seq'))::text, 7, '0')
  where (username is null or username = '');

commit;