-- Private account workspace; all access goes through the existing session-authenticated API.
alter table public.score_tracker_paper_reviews drop constraint score_tracker_paper_reviews_status_check;
alter table public.score_tracker_paper_reviews add constraint score_tracker_paper_reviews_status_check check(status in ('running','paused','succeeded','failed'));
alter table public.score_tracker_paper_reviews add column title text not null default '' check(length(title)<=100), add column options jsonb, add column pause_requested boolean not null default false;
create index score_tracker_paper_reviews_all_idx on public.score_tracker_paper_reviews(user_id,created_at desc);
create table public.score_tracker_paper_materials (
 request_id uuid primary key, user_id uuid not null references public.score_tracker_users(id) on delete cascade,
 draft_id uuid not null, exam_id uuid references public.score_tracker_exams(id) on delete set null,
 subject text not null check(length(subject) between 1 and 40), title text not null default '' check(length(title)<=100),
 options jsonb not null default '{}', pages jsonb not null default '[]' check(jsonb_typeof(pages)='array' and jsonb_array_length(pages)<=8),
 regions jsonb not null default '{}' check(jsonb_typeof(regions)='object'), revision integer not null default 0,
 submitted boolean not null default false, created_at timestamptz not null default now()
);
create index score_tracker_paper_materials_user_idx on public.score_tracker_paper_materials(user_id,created_at desc);
create index score_tracker_paper_materials_exam_idx on public.score_tracker_paper_materials(exam_id) where exam_id is not null;
create table public.score_tracker_paper_preferences (user_id uuid primary key references public.score_tracker_users(id) on delete cascade, settings jsonb not null default '{}');
alter table public.score_tracker_paper_materials enable row level security;
alter table public.score_tracker_paper_preferences enable row level security;
revoke all on public.score_tracker_paper_materials,public.score_tracker_paper_preferences from public,anon,authenticated;
grant select,insert,update,delete on public.score_tracker_paper_materials,public.score_tracker_paper_preferences to service_role;
-- Custom sessions are checked by the API. No public read or upload policy is added.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('score-tracker-paper-scans','score-tracker-paper-scans',false,2100000,array['image/jpeg','image/png','image/webp']);

-- Deleting an exam unlinks its analyses; it does not erase a learner's report archive.
alter table public.score_tracker_paper_reviews drop constraint score_tracker_paper_reviews_exam_id_fkey;
alter table public.score_tracker_paper_reviews add constraint score_tracker_paper_reviews_exam_id_fkey foreign key(exam_id) references public.score_tracker_exams(id) on delete set null;
