-- 用户列表需要按 user_id 聚合 Session、活跃天数和最后活动时间。
-- 覆盖索引避免每次打开管理页都回表扫描访问日志。
create index if not exists score_tracker_visit_logs_admin_user_stats_idx
  on public.score_tracker_visit_logs (user_id, session_id, occurred_at desc, id);
