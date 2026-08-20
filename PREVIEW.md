# Preview test: image import

This branch experiments with image-to-exam import without changing the production data flow.

Test path: open **记录一次考试** → **📷 识图填入** → choose 1–3 screenshots → review recognition summary → **填入当前表单** → manually verify → save.

The isolated preview Edge Function is `score-tracker-vision-preview`.

Vision now uses OpenRouter's **`openrouter/free`** router instead of a fixed paid model. OpenRouter automatically filters the current free pool for models that can handle the request's image input and structured JSON output. The Supabase project only needs `OPENROUTER_API_KEY`.

For student-data privacy, the request also asks OpenRouter to route only to providers with `data_collection: deny`. If no compatible free vision provider is available at that moment, recognition fails cleanly instead of silently falling back to a provider that may retain prompts.

Images are compressed in the browser, sent only for recognition, and are not stored in the score-tracker database. Recognition never saves directly; users must review and save through the normal exam editor.
