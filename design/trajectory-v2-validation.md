# Trajectory v2: coverage and retrospective validation — 2026-10-07

## Rules delivered

The version-2 interface skips missing selected metrics and unrelated-subject exams. All categories connects valid own records across category labels; explicitly selecting one category filters own records and references. A valid change of total subject basket still separates comparable histories. “Only same category” restricts references independently to the latest own category and defaults off. Category labels are user-entered, not verified school grades.

Two own observations enable preliminary references, using absolute percentage-point change similarity (10pp tolerance) rather than normalized correlation. They have no match-score percentage and no formal prediction center. Three observations enable formal matching, with at least three peer historical points plus an observed subsequent point; higher chosen minimums remain honored. Up to 20 different users participate, initially showing three. Expansion/collapse never changes selected references.

The formal center is 75% own last-three median plus 25% similarity/history-weighted peer mean. Defaults: similarity exponent 1, history exponent 0.5, width 1. Adaptive weighting and robust peer alternatives were not demonstrated superior and are not adopted. The range is descriptive, not a calibrated confidence interval.

Qualification cards show valid count, preliminary/formal history eligibility, chosen setting requirements, skipped missing/unrelated observations, and incompatible old baskets. History insufficiency, no suitable reference, sharing off, and request failure stay distinct. Own exam dates are displayed; horizontal spacing is by valid observation order, not elapsed time. Forecast target: the next exam with a usable selected metric.

The client opts into v2 only when status advertises it. Old deployments keep the legacy >=3 contract with an upgrade notice. Legacy SQL functions/privileges are unchanged. New functions are SECURITY INVOKER and executable only by service_role. Edge custom-session ownership checks and ordinary sharing restrictions remain; clients cannot request all-database test access.

## History eligibility: current versus proposed rules

The read-only any-metric SQL evaluates old and new rules on identical rows in one statement. It includes enabled-sharing users, total plus each individual subject, and year/class/score metrics. Duplicate exam/subject groups: zero. These are history qualifications, not actual matches.

| Scope | Legacy >=3 | New >=2 including formal | New formal >=3 |
|---|---:|---:|---:|
| Any individual-subject or total metric | 1,111 | 2,213 | 1,469 |
| Default total/year | 562 | 1,264 | 829 |
| Mathematics/year | 449 | 1,062 | 714 |

The last two rows replay fixed extracts from the actual legacy points function: 4,380 users with visible dated exam rows and 13,094 observations per extract. These eligibility rows include test accounts. The any-metric statement is an adjacent separate snapshot. Do not sum overlapping rows or equate them with recent visitors.

### Actual reference coverage, excluding showcase entirely

The fixed shared-pool extracts retain 4,379 users after removing showcase from targets and references. Coverage includes admin1; accuracy metrics below exclude it. Read-only replicas avoid live exposure-log writes.

| Scope | Legacy eligible / matched | New >=2 eligible / matched | New >=3 eligible / matched |
|---|---:|---:|---:|
| Total/year | 561 / 492 | 1,263 / 1,223 | 828 / 801 |
| Mathematics/year | 448 / 430 | 1,061 / 1,061 | 713 / 713 |

Extract SHA-256: total `3a139747538bb3b6168eac1463027e8642c8b18a9da742eb2bfa2eb6791c5e10`; math `a6ca0e9107619372411c82c825710cbba9d43d2ac72682024eecf160bd56147e`.

## Chronological accuracy

Keep the previously chosen 75/25 coefficient and evaluation cutoff 2026-07-06. Each prediction uses only earlier own observations and peer histories **including their known subsequent outcomes** dated on/before the own anchor. Same-day own targets are excluded. Showcase is removed entirely; admin1 is excluded from cohort metrics. Predict the next valid metric in the comparable basket, even across missing observations/categories.

The legacy method is the actual main-branch three-reference KDE **mode**, not a peer mean or a 75/25 three-reference blend. Paired comparisons score the same later events both methods could forecast.

| Paired events | Cases | Legacy MAE, pp | New MAE, pp | Legacy error >20pp | New error >20pp |
|---|---:|---:|---:|---:|---:|
| Total/year | 386 | 9.772 | 7.813 | 11.66% | 5.44% |
| Mathematics/year | 338 | 18.220 | 13.900 | 39.64% | 26.92% |

All new-method later forecastable events include newly eligible histories:

| Scope | Cases / users | Own median MAE | New MAE | New RMSE |
|---|---:|---:|---:|---:|
| Total/year | 484 / 377 | 8.029 | 7.865 | 10.897 |
| Mathematics/year | 431 / 342 | 13.951 | 13.491 | 18.131 |

Long-history events (>=8 previous valid observations): total 113 events, new MAE 8.470 versus own-median 8.801; math 93 events, new MAE 12.750 versus own-median 13.446.

Admin1 math: seven valid observations, own median 29.617%, peer mean 38.673%, center **31.881%**, 20 references. This uses the ordinary shared pool, not an all-database test-only pool. It is compatible with the earlier subjective 25–35% plausibility band, which is not a blind benchmark. The May deterioration remains a failed prediction (28.90% predicted versus 58.92% actual).

## Verification and limits

Actual migration executed in isolated PGlite/Postgres: null skipping, category controls, basket boundaries, preliminary matches, opt-out, input boundaries and execute privileges. Actual SQL snapshot matching is independently compared with JS on admin1, three distinct long histories and two preliminary histories. Edge-handler tests exercise custom auth and routing; DOM tests cover selection/20-reference expansion, preliminary states, preferences, optional category restriction, account isolation, stale responses and legacy fallback. Forecast invariance/boundary and bundle checks pass.

Chromium launch failed (SIGTRAP). Browser/mobile visual acceptance was not obtained; DOM tests are not a substitute.

Retrospective stored exam dates do not reconstruct historical entry/edit times or sharing choices. Recovered/copied accounts can contribute identical trajectories; multiple events per user are not independent samples. No significance/prospective-accuracy claim. Qualification increases do not guarantee references or better accuracy for each user. Score/class accuracy is not quantified. Preliminary references have no numeric forecast to score. Raw snapshots and browser/dependency files are not committed.

## Deployment and reproduction

Production DB/Edge are **not deployed** by this code commit. Apply `20261007074147_trajectory_eligibility_v2.sql`, deploy `score-tracker-trajectories` preserving custom-auth configuration, then merge/publish the frontend. This migration is self-contained and does not depend on the earlier unmerged ensemble branch. Until backend deployment, the client uses its legacy fallback.

Run `design/trajectory-v2-any-eligibility.sql` read-only for any-metric eligibility. Run `design/trajectory-v2-snapshot.sql` twice, with subjects null (total) and array['数学'] (math), saving row arrays privately as `private-total.json` and `private-math.json`. Save main `9746eb3583e0b7b52722342d775255ee0f9ea49f`'s `trajectory-forecast.js` as `private-old-forecast.js`. Run `node design/backtest-trajectory-v2.cjs`.

Test-only dependencies: jsdom@26.1.0, @electric-sql/pglite@0.3.14. Run five scripts in design: test-trajectory-api.cjs, test-trajectory-forecast.cjs, test-similar-trajectories.cjs, test-trajectory-sql-v2.cjs, test-trajectory-snapshot-v2.cjs; then bundle-check.js. SQL snapshot tests require the private extracts. Do not commit user data.

