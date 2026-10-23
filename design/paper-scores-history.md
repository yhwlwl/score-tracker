# Score rereading and own-account context

The score reader is a generic transcription stage, not a grader. It has no subject-specific totals, question-number exceptions, answer-card column assumptions, or score allocations inferred from answers.

- Read printed maxima from both question and answer-card pages. A total maximum may come from an explicitly printed total, a complete question sum, an exact disjoint section partition, or the authenticated linked exam. Preserve the provenance and disclose account-derived maxima.
- Keep group scores separate from question marks. Do not divide a group mark into unseen individual marks. Explicit zero marks are valid; unreadable is not zero.
- Reread missing or conflicting numbers in independent passes. New maxima and scores require another observation; a disagreement becomes candidates, not a silent overwrite. Retain unresolved values for user confirmation after bounded retries.
- Preserve source originals and existing answers. Store geometry-based overlapping close-ups privately. For old reports, regenerate close-ups from the owned original and verify its SHA-256 before attaching them. Process one close-up per background delivery, with a saved cursor; do not resend every full-page image and duplicate close-up in one call.
- Only score transcription uses the provider's explicit non-thinking mode when supported by the existing DeepSeek integration. Mathematical diagnosis and all other analysis stages retain their reasoning configuration.
- The separate score-refresh action uses revision compare-and-set, retains manual corrections, consumes no additional analysis reservation, and does not reduce the existing text-update allowance. Internal saved-material continuations carry identifiers rather than a large base64 request body.
- Own-account context defaults on in setup. Off means no history queries or saved-exam score context, not merely hiding a section. Every query remains owner-scoped and same-subject; numeric snapshots exclude account, student and school identifiers.
- Use the same canonical score-worth kernel as the scores page. The bundle builder generates its Edge mirror, and the bundle guard checks byte equality.
- Historical comparison separates retrospective relative difficulty, dated same-cohort trajectories, and the existing deep-analysis point forecast reconstructed strictly from earlier exams. Do not label a reconstruction as a historical saved prediction or an accuracy percentage.

## AI answer grading (separate from teacher-mark transcription)

Missing teacher marks do not prevent automatic grading of clearly scorable closed-response tasks. Prefer provided answers; otherwise independently solve and verify. Re-read the student's actual answer without anchoring on old OCR, compare equivalent mathematical forms, and require two independent agreeing observations before repairing OCR or accepting an AI score. Preserve manually verified answers and the original transcription. Process/essay partial credit still requires explicit supplied scoring rules.

Store AI verdicts separately in `ai_grading`; expose their score through the existing `estimated_score`, never `teacher_score` or saved exam scores. Show the source and comparison prominently, and reconcile each complete group against its actual group mark. A mismatch causes one bounded additional check, not a guessed allocation. Refresh only analyses affected by corrected answers. Correct objective answers receive positive feedback rather than invented loss diagnoses. Budget pauses and image-backed checkpoints continue to work.

Regression coverage: `test-paper-ai-grading.cjs`, `test-paper-scores-history.cjs`, `test-paper-design-ui.cjs`, existing paper handler/workspace/diagnostics/deadline/recovery/update suites, and `test-score-worth.cjs`. Live image probes are read-only and must be retired after verification; never check credentials or source images into the repository.
