# Trajectory history qualification coverage — 2026-10-07

Read-only coverage snapshot from the active ScoreTracker database. It includes visible, non-hidden shared exams dated on or before 2026-10-07 and users with sharing enabled. It counts users who qualify for at least one subject or total-score trajectory; qualification does not guarantee that a comparable peer is available.

| Scope | Existing rule: 3-point sequence | Proposed rule: 3 valid observations | Proposed preliminary: 2 valid observations |
|---|---:|---:|---:|
| Any trajectory | 1,111 | 1,469 | 2,215 |
| Total score, year rank | 562 | 853 | — |

The snapshot contains 4,380 users with shared exams. Under the existing rule, a missing value or category/context change breaks a run. Under the proposed rule, a subject trajectory skips exams without that subject and skips missing values, while continuing the same subject across category changes. Total-score histories remain separated by subject-basket context. Two valid observations qualify for a preliminary display only; a formal forecast requires at least three.

The shared-user total increased from 4,379 to 4,380 since the earlier snapshot. Formal qualification stayed at 1,469 users; preliminary qualification increased from 2,213 to 2,215. These are coverage counts from current stored data, not a prospective forecast-quality measure.

## Production diagnosis: language history and matching policies

Read-only verification on 2026-10-07 found the production Edge Function still at version 5, calling `score_tracker_trajectory_match_configured`. Neither the ensemble nor v2 matching functions from this branch were installed. GitHub `main` was still `9746eb3`.

The authorized `admin1` account has eight exam records, seven with language scores. All seven language records have usable year ranks, class ranks and score rates. The eighth exam, the physics-only test dated 2026-03-27, has no language record. The production function converts it to a null value and stops the own-history run there. Only 2026-04-22, 2026-05-29 and 2026-07-06 survive: three usable records from seven.

With three own observations and the default minimum of three, every candidate comparison window is exactly three observations. The balanced, long and recent policies then have the same support penalty and ordering. Settings are transmitted correctly; the truncated history removes every opportunity for the policies to differ.

The companion `trajectory-policy-diagnostic.sql` reproduces the proposed default v2 selection using read-only production data. It skips the unrelated exam, preserves seven language observations and finds twenty references for each policy. Balanced and long have the same first three references in this case, but their complete twenty-reference selections and comparison windows differ. Recent selects a different first three references, using four-observation windows. Policies can legitimately share optimal references; different settings do not guarantee different visible curves.

Regression checks compile and execute the migration in PGlite. Synthetic fixtures cover an eight-exam/seven-language history in all three metrics, equal policy results with only three own observations, different balanced/long selections when a tradeoff exists, and recent windows limited to five observations. DOM checks verify fresh requests on policy changes and the short-history explanation. These checks do not apply migrations or deploy the Edge Function.

## Authorized production deployment — 2026-10-07

After explicit authorization, both `trajectory_ensemble_forecast` and `trajectory_history_qualification` migrations were applied successfully, and `score-tracker-trajectories` was deployed as version 6. The diagnosis above describes the production state before this deployment.

Production RPC verification now returns all seven valid language observations from admin1's eight exams, skipping the physics-only exam. Balanced, long and recent each return twenty references. Their complete selections differ; balanced and long still share the first three, while recent's first three differ. This is expected behavior rather than a promise that every preference must produce different curves.

The new helper, v2 matching function and ensemble function execute as the invoker and are callable only by `service_role`, not `anon` or `authenticated`. Post-deployment security advisor categories and finding counts match the pre-deployment snapshot. API, forecast, migration and DOM regressions plus bundle consistency checks passed. These are functional and deployment checks, not a new historical forecast backtest or mobile visual acceptance.

Frontend changes remain on `fix/trajectory-history-qualification`; deploying the backend does not merge or deploy that branch's frontend. Existing clients retain their legacy request routing until the frontend branch is released.
