-- Post activity: comments and photo tags
-- Creates tables and RLS policies to allow reading activity counts for
-- own posts and accepted friends' posts.

begin;

-- Ensure media_uploads table and required columns exist
create table if not exists public.media_uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Columns used by the app/feed
alter table public.media_uploads
  add column if not exists post_id uuid references public.posts(id) on delete cascade,
  add column if not exists file_url text,
  add column if not exists thumbnail_url text,
  add column if not exists file_type text;

alter table public.media_uploads enable row level security;

-- Insert: only the owner can insert their media rows
drop policy if exists media_uploads_insert_self on public.media_uploads;
create policy media_uploads_insert_self
  on public.media_uploads for insert
  to authenticated
  with check (user_id = auth.uid());

-- Select: allow viewing media when you are the author of the post or an accepted friend
drop policy if exists media_uploads_select_friends on public.media_uploads;
create policy media_uploads_select_friends
  on public.media_uploads for select
  to authenticated
  using (
    exists (
      select 1
      from public.posts p
      where p.id = public.media_uploads.post_id
        and (
          p.user_id = auth.uid()
          or exists (
            select 1
            from public.friendships f
            where (
              (f.user_id = auth.uid() and f.friend_id = p.user_id)
              or (f.user_id = p.user_id and f.friend_id = auth.uid())
            )
            and f.status = 'accepted'
          )
        )
    )
  );

-- Comments on posts
create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.post_comments enable row level security;

-- Allow users to insert comments as themselves
drop policy if exists post_comments_insert_self on public.post_comments;
create policy post_comments_insert_self
  on public.post_comments for insert
  to authenticated
  with check (user_id = auth.uid());

-- Allow selecting comments if you are the post author or accepted friend of the author
drop policy if exists post_comments_select_friends on public.post_comments;
create policy post_comments_select_friends
  on public.post_comments for select
  to authenticated
  using (
    exists (
      select 1
      from public.posts p
      where p.id = post_comments.post_id
        and (
          p.user_id = auth.uid()
          or exists (
            select 1
            from public.friendships f
            where (
              (f.user_id = auth.uid() and f.friend_id = p.user_id)
              or (f.user_id = p.user_id and f.friend_id = auth.uid())
            )
            and f.status = 'accepted'
          )
        )
    )
  );

-- Tags on uploaded media (photos)
create table if not exists public.photo_tags (
  id uuid primary key default gen_random_uuid(),
  media_upload_id uuid not null references public.media_uploads(id) on delete cascade,
  tagged_user_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.photo_tags enable row level security;

-- Allow selecting tags if you are the post author or accepted friend of the author
drop policy if exists photo_tags_select_friends on public.photo_tags;
create policy photo_tags_select_friends
  on public.photo_tags for select
  to authenticated
  using (
    exists (
      select 1
      from public.media_uploads mu
      join public.posts p on p.id = mu.post_id
      where mu.id = photo_tags.media_upload_id
        and (
          p.user_id = auth.uid()
          or exists (
            select 1
            from public.friendships f
            where (
              (f.user_id = auth.uid() and f.friend_id = p.user_id)
              or (f.user_id = p.user_id and f.friend_id = auth.uid())
            )
            and f.status = 'accepted'
          )
        )
    )
  );

-- Optional: add to realtime publication for future live updates
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.post_comments;
    exception when others then null; end;
    begin
      alter publication supabase_realtime add table public.photo_tags;
    exception when others then null; end;
  end if;
end $$;

commit;