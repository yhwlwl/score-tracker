-- Keep the private scan ledger aligned with the 15-page API/upload limit.
-- This version is the migration already applied to the hosted database.
alter table public.score_tracker_paper_materials
  drop constraint if exists score_tracker_paper_materials_pages_check,
  add constraint score_tracker_paper_materials_pages_check
    check (jsonb_typeof(pages) = 'array' and jsonb_array_length(pages) <= 15);
