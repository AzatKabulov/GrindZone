-- GrindZone core schema: goals, tasks, schedule blocks, notes.
-- Every table is user-scoped (RLS) and sync-friendly:
--   updated_at        -> set by the client, used for last-write-wins
--   deleted           -> soft delete (tombstone) so deletions sync across devices
--   server_updated_at -> set by the server, used as the pull cursor

create or replace function public.gz_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- server-side last-write-wins: ignore stale updates coming from another device
  if tg_op = 'UPDATE' and new.updated_at < old.updated_at then
    return null;
  end if;
  new.server_updated_at := now();
  return new;
end;
$$;

create table public.goals (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null default '',
  why text not null default '',
  category text not null default 'mind',
  target_date date,
  status text not null default 'active',
  achieved_at timestamptz,
  sort_order double precision not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted boolean not null default false,
  server_updated_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null default '',
  notes text not null default '',
  priority smallint not null default 2,
  due_date date,
  goal_id uuid,
  done boolean not null default false,
  done_at timestamptz,
  sort_order double precision not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted boolean not null default false,
  server_updated_at timestamptz not null default now()
);

create table public.blocks (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date date not null,
  start_min smallint not null,
  end_min smallint not null,
  title text not null default '',
  category text not null default 'deep',
  note text not null default '',
  done boolean not null default false,
  done_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted boolean not null default false,
  server_updated_at timestamptz not null default now()
);

create table public.notes (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null default '',
  body text not null default '',
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted boolean not null default false,
  server_updated_at timestamptz not null default now()
);

do $$
declare
  t text;
begin
  foreach t in array array['goals', 'tasks', 'blocks', 'notes'] loop
    execute format('create index %I on public.%I (user_id, server_updated_at)', t || '_user_sync_idx', t);
    execute format('create trigger %I before insert or update on public.%I for each row execute function public.gz_touch()', t || '_touch', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "own rows: select" on public.%I for select to authenticated using ((select auth.uid()) = user_id)', t);
    execute format('create policy "own rows: insert" on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "own rows: update" on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "own rows: delete" on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', t);
  end loop;
end;
$$;
