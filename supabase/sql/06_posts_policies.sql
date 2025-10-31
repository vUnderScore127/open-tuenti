-- Políticas y publicación Realtime para posts (feed de estados)

-- Habilitar RLS si la tabla existe
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'posts'
  ) then
    -- Asegurar RLS activa
    execute 'alter table public.posts enable row level security';

    -- Limpiar políticas previas si existen
    execute 'drop policy if exists posts_user_insert on public.posts';
    execute 'drop policy if exists posts_authenticated_select on public.posts';
    execute 'drop policy if exists posts_authenticated_select_own_or_friends on public.posts';

    -- Insert: solo el autor puede insertar su propio post
    execute 'create policy posts_user_insert on public.posts
      for insert
      with check (user_id = auth.uid())';

    -- Select: el usuario puede ver sus propios posts o los de amigos aceptados
    -- Nota: requiere tabla public.friendships con estados y columnas user_id/friend_id
    execute 'create policy posts_authenticated_select_own_or_friends on public.posts
      for select
      using (
        user_id = auth.uid()
        or exists (
          select 1 from public.friendships f
          where f.status = ''accepted''
            and (
              (f.user_id = auth.uid() and f.friend_id = public.posts.user_id)
              or
              (f.friend_id = auth.uid() and f.user_id = public.posts.user_id)
            )
        )
      )';

    -- Añadir la tabla a la publicación Realtime si no está incluida
    -- Esto hace que INSERT/UPDATE/DELETE generen eventos para canales postgres_changes
    begin
      execute 'alter publication supabase_realtime add table public.posts';
    exception when others then
      -- Ignorar si ya estaba añadida
      null;
    end;
  end if;
end$$;