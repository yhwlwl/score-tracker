-- Replies inherit the existing comments table's RLS and service-role-only API.
alter table public.score_tracker_announcement_comments
  add column if not exists admin_reply text,
  add column if not exists admin_replied_at timestamptz,
  add column if not exists admin_replied_by uuid,
  add column if not exists reply_revision integer not null default 0;
alter table public.score_tracker_announcement_comments
  add constraint score_tracker_comment_reply_length check (admin_reply is null or char_length(admin_reply) between 1 and 2000);
-- No extra FK to users: keep the existing author embedding unambiguous for old clients.
