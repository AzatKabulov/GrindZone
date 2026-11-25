-- Goal steps are their own checklist inside the goal ([{ id, title, done, done_at }]),
-- separate from day-to-day tasks.
alter table public.goals add column if not exists steps jsonb not null default '[]'::jsonb;
