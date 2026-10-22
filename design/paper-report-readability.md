# Report readability pass

## Student reading order

1. **先看重点**: known score facts, a short overview (older long overviews remain available behind a disclosure), up to two immediate tasks, and two examples of successful work. Further tasks and examples remain available.
2. **逐题看懂**: filter all / needs correction / needs confirmation; show the actual issue and next step before sources. Separate optional worked solutions, practice answers, difficulty details, and student recollection. Keep original transcripts, scans, and editable OCR fields together in their own disclosure.
3. **资料与说明**: all saved scans, exam context, settings, difficulty breakdown, cross-question observations, coverage, and score reconciliation. No data is deleted or rewritten by the presentation layer.

Report navigation is in-page navigation, not another workspace tab. A task's question link resets filters, opens the target, moves keyboard focus, and scrolls to it. No navigation rerenders the editor or discards edits.

## Formatting and wording

- Safe paragraph/list/bold formatting for generated explanations; no HTML, scripts, links, or image execution from model output.
- Protect complete LaTeX spans before splitting prose into blocks, including multiline display equations. Keep citations and editable transcripts unchanged.
- Maintain old 5-point and new 10-point difficulty scales; use compact cards on narrow screens rather than five compressed columns.
- Prompt v9: short, concrete teacher-to-student explanations; separate observation, reason, correction, next step. The detailed preference expands the solution, not every summary. Preserve necessary conditions and evidence checks.
- Existing reports immediately receive the layout; they are not silently regenerated or linguistically rewritten. New/updated analysis uses the new prompt. No model call or quota use on viewing.

## Regression coverage

- `test-paper-report-prose.cjs`: paragraphs, ordered/unordered lists, emphasis, escaping, placeholder isolation, multiline LaTeX, repeat rendering, wording contract.
- `test-paper-review.cjs`: legacy mount, section order, closed source/edit disclosures, filters and focus links, saved corrections, protected exam scores.
- `test-paper-workspace-browser.cjs`: actual browser → real handler → isolated database/storage → report; mobile, desktop, dark theme; scanning, recovery, archive, old entry, filters, no errors or page overflow.
- Existing diagnostics, learner, updates, workspace, recovery and tab-isolation suites retained.

Tests use synthetic model replies, not an admin account or live student report. A prompt contract test does not prove every future model response reads naturally; collect concrete awkward phrases for subsequent review.
