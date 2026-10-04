-- New users join the anonymous trajectory pool when they first view the feature.
-- Closing the feature still stores an explicit false choice.
alter table public.score_tracker_trajectory_sharing
  alter column enabled set default true;
