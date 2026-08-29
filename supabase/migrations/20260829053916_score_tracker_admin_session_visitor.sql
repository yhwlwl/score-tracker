-- Session / Visitor 证据链使用的覆盖索引。详情查询仍由已认证的管理员 Edge Function 执行。
create index if not exists score_tracker_visit_logs_session_timeline_idx
  on public.score_tracker_visit_logs (session_id, occurred_at asc, id);
create index if not exists score_tracker_visit_logs_visitor_timeline_idx
  on public.score_tracker_visit_logs (visitor_id, occurred_at asc, id);
create index if not exists score_tracker_visit_logs_event_id_idx
  on public.score_tracker_visit_logs (event_id);
