-- Use clock_timestamp() so rows written in the same transaction get distinct, ordered
-- server_updated_at values (keeps the client's pull cursor from skipping rows).
create or replace function public.gz_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.updated_at < old.updated_at then
    return null;
  end if;
  new.server_updated_at := clock_timestamp();
  return new;
end;
$$;
