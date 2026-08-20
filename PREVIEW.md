# Preview test: image import

This branch experiments with image-to-exam import without changing the production data flow.

Test path: open **记录一次考试** → **📷 识图填入** → choose 1–3 screenshots → review recognition summary → **填入当前表单** → manually verify → save.

The isolated preview Edge Function is `score-tracker-vision-preview`.

Vision model is intentionally fixed to **Doubao-Seed-2.0-mini** (`doubao-seed-2-0-mini-260215`) to keep cost and behavior predictable. The Supabase project only needs `ARK_API_KEY`; there is no model override setting.

The backend calls Volcengine Ark Responses API with thinking disabled. Images are compressed in the browser, sent only for recognition, and are not stored in the score-tracker database.
