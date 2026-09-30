create extension if not exists pg_trgm with schema extensions;

create table public.score_tracker_school_directory (
  name text not null check (char_length(name) between 1 and 100),
  province text not null check (char_length(province) between 1 and 50),
  city text not null check (char_length(city) between 1 and 50),
  area text not null default '' check (char_length(area) <= 50),
  name_search text not null,
  name_key text not null,
  sort_order integer not null,
  primary key (name, province, city, area)
);
alter table public.score_tracker_school_directory enable row level security;
revoke all on public.score_tracker_school_directory from public, anon, authenticated;
grant select, insert, update, delete on public.score_tracker_school_directory to service_role;

create index score_tracker_school_name_search_idx on public.score_tracker_school_directory using gin (name_search extensions.gin_trgm_ops);
create index score_tracker_school_name_key_idx on public.score_tracker_school_directory using gin (name_key extensions.gin_trgm_ops);
create index score_tracker_school_region_idx on public.score_tracker_school_directory (province, city, sort_order);
create index score_tracker_school_order_idx on public.score_tracker_school_directory (sort_order);

-- Session authentication stays in score-tracker-setup; these RPCs are service-only.
create function public.score_tracker_search_schools(p_text text, p_key text, p_province text, p_city text)
returns table (name text, province text, city text, area text)
language sql stable security invoker set search_path = ''
as $$
  select s.name, s.province, s.city, s.area
  from public.score_tracker_school_directory s
  where (p_province = '' or s.province = p_province)
    and (p_city = '' or s.city = p_city)
    and (p_text = ''
      or s.name_search like '%' || replace(replace(replace(p_text, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%' escape E'\\'
      or (p_key <> '' and s.name_key like '%' || replace(replace(replace(p_key, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%' escape E'\\'))
  order by case
    when p_text = '' or s.name_search = p_text then 0
    when s.name_key = p_key then 1
    when s.name_search like '%' || replace(replace(replace(p_text, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%' escape E'\\' then 2
    else 3 end,
    s.sort_order
  limit 31;
$$;

create function public.score_tracker_school_regions()
returns table (province text, city text)
language sql stable security invoker set search_path = ''
as $$
  select s.province, s.city from public.score_tracker_school_directory s
  group by s.province, s.city order by min(s.sort_order);
$$;
revoke all on function public.score_tracker_search_schools(text, text, text, text) from public, anon, authenticated;
revoke all on function public.score_tracker_school_regions() from public, anon, authenticated;
grant execute on function public.score_tracker_search_schools(text, text, text, text) to service_role;
grant execute on function public.score_tracker_school_regions() to service_role;
