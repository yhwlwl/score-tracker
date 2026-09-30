-- Configuration and receipts are accessed only through the custom authenticated Edge Function.
create table public.score_tracker_notification_config (
  id smallint primary key check (id = 1),
  version text not null check (version ~ '^v[0-9]{1,4}(\.[0-9]{1,4}){0,2}$'),
  enabled boolean not null default true,
  title text not null check (length(title) between 1 and 120),
  content text not null check (length(content) between 1 and 6000),
  tip_enabled boolean not null default false,
  tip_content text not null default '' check (length(tip_content) <= 1000),
  announcement_enabled boolean not null default false,
  announcement_title text not null default '公告' check (length(announcement_title) <= 120),
  announcement_content text not null default '' check (length(announcement_content) <= 6000),
  revision integer not null default 1 check (revision > 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.score_tracker_users(id) on delete set null
);
create table public.score_tracker_notification_receipts (
  user_id uuid not null references public.score_tracker_users(id) on delete cascade,
  kind text not null check (kind in ('release','announcement','tip')),
  notice_id text not null check (length(notice_id) between 1 and 40),
  shown_at timestamptz not null default now(),
  primary key (user_id,kind,notice_id)
);
create index score_tracker_notification_receipts_recent
  on public.score_tracker_notification_receipts(user_id,shown_at desc);
alter table public.score_tracker_notification_config enable row level security;
alter table public.score_tracker_notification_receipts enable row level security;
revoke all on public.score_tracker_notification_config from anon, authenticated;
revoke all on public.score_tracker_notification_receipts from anon, authenticated;
grant select, insert, update, delete on public.score_tracker_notification_config to service_role;
grant select, insert, update, delete on public.score_tracker_notification_receipts to service_role;
insert into public.score_tracker_notification_config(id,version,title,content,tip_content)
values (1,'v7.0','v7.0 更新内容',E'我们好高兴地告诉大家，图片识别功能正式上线了！\n\n新建考试时，进入「快速录入」，选择「图片识别」模式，上传图片即可自动解析。\n\n功能刚刚上线，还有些不稳定。如果遇到识别错误等情况，欢迎大家及时反馈哦。','自然语言快速录入功能已上线，欢迎在新建考试时体验。');
