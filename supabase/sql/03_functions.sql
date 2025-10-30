-- RPC functions to verify and accept invitations (security definer to bypass RLS)

create or replace function public.verify_invitation(invite_token text)
returns public.invitations
language sql
security definer
set search_path = public
as $$
  select * from public.invitations where token = invite_token limit 1;
$$;

grant execute on function public.verify_invitation(invite_token text) to anon, authenticated;

create or replace function public.accept_invitation(invite_token text)
returns public.invitations
language plpgsql
security definer
set search_path = public
as $$
declare inv public.invitations;
begin
  select * into inv from public.invitations where token = invite_token for update;
  if not found then
    raise exception 'Invalid invitation token';
  end if;
  update public.invitations
    set status = 'accepted', invited_user_id = auth.uid()
    where id = inv.id
    returning * into inv;
  return inv;
end;
$$;

grant execute on function public.accept_invitation(invite_token text) to authenticated;
