-- CLI-created migration, filename aligned with its applied database version.
-- History stays behind the existing service-only config row and revision check.
alter table public.score_tracker_notification_config
  add column release_history jsonb not null default '[]'::jsonb
  check (jsonb_typeof(release_history) = 'array');

-- Recover the shipped v7.0 announcement and retain the currently published one.
update public.score_tracker_notification_config
set release_history =
  case when version <> 'v7.0' then jsonb_build_array(jsonb_build_object(
    'version','v7.0','title','v7.0 更新内容',
    'content',E'我们好高兴地告诉大家，图片识别功能正式上线了！\n\n新建考试时，进入「快速录入」，选择「图片识别」模式，上传图片即可自动解析。\n\n功能刚刚上线，还有些不稳定。如果遇到识别错误等情况，欢迎大家及时反馈哦。'
  )) else '[]'::jsonb end
  || jsonb_build_array(jsonb_build_object('version',version,'title',title,'content',content))
where id = 1;
