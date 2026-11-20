-- Old clients rewrite options without knowing about the preview enrollment.
-- Once a record has a mirror, preserve enrollment until the record is deleted.
create or replace function public.score_tracker_paper_mirror_preview_preserve_enrollment()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin
  if coalesce(old.options->>'ecs_mirror','') = 'preview-v1'
     and coalesce(new.options->>'ecs_mirror','') <> 'preview-v1' then
    new.options := jsonb_set(coalesce(new.options,'{}'::jsonb),'{ecs_mirror}','"preview-v1"'::jsonb,true);
  end if;
  return new;
end;
$$;
revoke all on function public.score_tracker_paper_mirror_preview_preserve_enrollment() from public, anon, authenticated;
create trigger score_tracker_paper_mirror_preview_preserve_enrollment
before update of options on public.score_tracker_paper_materials
for each row execute function public.score_tracker_paper_mirror_preview_preserve_enrollment();
