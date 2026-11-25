-- Tasks: an optional emoji and a checklist of subtasks ([{ id, title, done }]).
alter table public.tasks add column if not exists emoji text not null default '';
alter table public.tasks add column if not exists subtasks jsonb not null default '[]'::jsonb;

-- Habits: one row per habit; `checks` holds the dates (YYYY-MM-DD) it was done.
create table if not exists public.habits (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null default '',
  emoji text not null default '',
  checks jsonb not null default '[]'::jsonb,
  sort_order double precision not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted boolean not null default false,
  server_updated_at timestamptz not null default now()
);

create index if not exists habits_user_sync_idx on public.habits (user_id, server_updated_at);
drop trigger if exists habits_touch on public.habits;
create trigger habits_touch before insert or update on public.habits for each row execute function public.gz_touch();
alter table public.habits enable row level security;
drop policy if exists "own rows: select" on public.habits;
drop policy if exists "own rows: insert" on public.habits;
drop policy if exists "own rows: update" on public.habits;
drop policy if exists "own rows: delete" on public.habits;
create policy "own rows: select" on public.habits for select to authenticated using ((select auth.uid()) = user_id);
create policy "own rows: insert" on public.habits for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own rows: update" on public.habits for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own rows: delete" on public.habits for delete to authenticated using ((select auth.uid()) = user_id);
