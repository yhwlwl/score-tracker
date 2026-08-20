# Preview test: image import

This branch experiments with image-to-exam import without changing the production data flow.

Test path: open **记录一次考试** → **📷 识图填入** → choose 1–3 screenshots → review recognition summary → **填入当前表单** → manually verify → save.

The isolated preview Edge Function is `score-tracker-vision-preview`. It requires `OPENAI_API_KEY` in the Supabase project environment. Optional: `OPENAI_VISION_MODEL`; default is `gpt-5.6-luna`.

Images are sent directly for recognition and are not stored in the score-tracker database.
