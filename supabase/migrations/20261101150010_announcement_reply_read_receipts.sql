-- The existing service-only comments table keeps ownership checks in the Edge API.
alter table public.score_tracker_announcement_comments
  add column if not exists admin_reply_read_at timestamptz;

create index if not exists score_tracker_announcement_unread_replies
  on public.score_tracker_announcement_comments (user_id, admin_replied_at desc, sequence desc)
  where admin_reply is not null and admin_reply_read_at is null;

-- Also covers replies written directly by an administrator through SQL.
create or replace function public.score_tracker_reset_announcement_reply_read()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.admin_reply is distinct from old.admin_reply
    or new.admin_replied_at is distinct from old.admin_replied_at
    or new.reply_revision is distinct from old.reply_revision then
    new.admin_reply_read_at := null;
    new.reply_revision := greatest(new.reply_revision, old.reply_revision + 1);
  end if;
  return new;
end;
$$;
revoke all on function public.score_tracker_reset_announcement_reply_read() from public, anon, authenticated;
grant execute on function public.score_tracker_reset_announcement_reply_read() to service_role;

create trigger score_tracker_announcement_reply_read_reset
  before update of admin_reply, admin_replied_at, reply_revision
  on public.score_tracker_announcement_comments
  for each row execute function public.score_tracker_reset_announcement_reply_read();
