# Trajectory ensemble validation — 2026-10-06

The proposed prediction combines 75% of the requester's last-three median with 25% of a similarity/history-weighted mean of up to 20 distinct peers. Twenty candidates participate even when only three are visible. Exams containing none of the requested subjects are omitted rather than breaking a single-subject trajectory; genuinely missing values for a present subject still break it.

## Method

The source is the score-tracker database, using the existing ranking denominator, visibility and context rules. A read-only extract reproduces `score_tracker_trajectory_points_for_request` for mathematics/year-rank and total/year-rank. Snapshot IDs are hashed; the only named targets are the two authorized test accounts. Raw records are not committed.

Replay each continuous comparable sequence after at least three observations. The target is the next dated exam. Peer histories **and their observed subsequent outcome** must be on or before the last observed own exam's date. The target user's records are excluded from the pool. Same-day own predictions are omitted because day-level timestamps cannot establish exam order. Only points with at least one eligible peer are scored. Select one segment per peer with the same fit threshold, evidence penalty and balanced sorting as SQL.

There are 2,292 scored prediction points across 557 users. Excluding all showcase/admin1 cases leaves 1,785 earlier selection cases and 487 later evaluation cases (325 evaluation users). The temporal boundary is 2026-07-06, with dates before it used for selection. Candidate peer contributions were fixed at 0%, 25%, 50%, 75%, 100%; 25% had the lowest earlier mean absolute error (11.062 percentage points). The later evaluation results do not change that choice.

## Later evaluation: 487 points

Errors are percentage points of rank position, not raw rank counts or accuracy percentages.

| Method | MAE | RMSE |
|---|---:|---:|
| Keep latest own level | 12.485 | 17.359 |
| Own last-three median | 11.568 | 16.255 |
| Three-peer weighted mean | 12.689 | 17.223 |
| Twenty-peer weighted mean | 11.548 | 15.802 |
| Selected 75% own median + 25% twenty-peer mean | 11.258 | 15.721 |

The selected method reduces MAE by about 11.3% relative to the three-peer weighted mean on these points. This is a retrospective comparison, not a prospective guarantee or a statistically independent trial: users can contribute multiple points, and the two domains can overlap.

## Every eligible admin1 mathematics/year-rank case

Lower position percentages mean better ranks. Predictions use only earlier exam dates, including earlier peer outcomes.

| Actual exam date | Three-peer mean | Selected method | Actual |
|---|---:|---:|---:|
| 2026-01-22 | 24.2% | 25.2% | 29.8% |
| 2026-04-22 | 10.2% | 25.6% | 19.1% |
| 2026-05-29 | 23.9% | 27.4% | 58.9% |
| 2026-07-06 | 43.6% | 33.4% | 29.6% |

The large May deterioration remains a failed forecast. Seven mathematics observations are available after omitting the unrelated physics-only exam. The current proposed next center is 31.8125%, with 20 peers, an own baseline of 29.6173%, and a peer mean of 38.3982%. Read-only SQL running the proposed candidate selection and the independent JavaScript replay agree on the center for both authorized accounts. The current showcase mathematics/year-rank center is 9.2912%.

## Limits and verification

Replay is by exam date using today's stored records. It cannot recover historical edits, import times, sharing choices, or what users had actually entered on a historical day. The two test accounts have all-database test access; ordinary accounts' shared pool can be smaller. No-match histories are excluded from the error average, so this is not a measurement of coverage. Rank percentages normalize cohort sizes but cannot remove changing cohorts or exam difficulty. The chosen coefficient was evaluated on year-rank data; no numerical accuracy improvement is asserted for class-rank or score-rate modes.

The displayed range preserves peer disagreement and own variability; it is descriptive and has no calibrated coverage claim. Synthetic boundary/weighting tests, the actual Edge handler with custom-auth stubs, and DOM integration cover selection, 20-reference expansion, collapse, colors, empty states, account isolation and legacy API compatibility. No production schema or Edge Function was changed: automatic approval rejected the migration. Deployment requires explicit authorization and includes the migration and backward-compatible Edge update.

## Reproduction

Save read-only extracts as `backtest-math.json` and `backtest-total.json` in a private scratch directory. Each file contains rows `{uid,target,points:[{v,ctx,date}]}`, sorted by exam date, creation time and exam ID. `ctx` is the JSON text of `[category,subjectBasket]`; unknown `v` is null. Export via the companion read-only SQL, once for mathematics and once for total rank. `target` is `admin1`, `showcase`, or null. Keep other identities hashed and do not commit raw snapshots.

Run `node design/backtest-trajectories.cjs INPUT_DIRECTORY OUTPUT_DIRECTORY > summary.json`. The output directory must exist. Unit/integration checks: `node design/test-trajectory-forecast.cjs`, `node design/test-trajectory-api.cjs`, `node design/test-similar-trajectories.cjs`, and `node design/bundle-check.js`.
