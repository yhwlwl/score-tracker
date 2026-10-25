-- Optional raw-mark breakdowns; preserve existing exams and their access policies.
alter table public.score_tracker_exams
  add column if not exists question_type_scores jsonb not null default '{}'::jsonb;

do $$ begin
  if not exists (select 1 from pg_constraint where conrelid='public.score_tracker_exams'::regclass and conname='score_tracker_exams_question_type_scores_check') then
    alter table public.score_tracker_exams add constraint score_tracker_exams_question_type_scores_check
      check (jsonb_typeof(question_type_scores)='object' and octet_length(question_type_scores::text)<=240000);
  end if;
end $$;

comment on column public.score_tracker_exams.question_type_scores is
  'Optional subject -> [{name, score, max}] raw-mark breakdowns. Null marks are unknown; zero is explicit. Not included again in totals.';
