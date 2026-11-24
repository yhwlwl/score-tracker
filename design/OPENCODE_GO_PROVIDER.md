# OpenCode Go provider (opt-in; no live requests in CI)

Official references (2026-11-24):
- https://opencode.ai/docs/console/go/
- https://opencode.ai/docs/console/api/inference
- https://api-docs.deepseek.com/guides/thinking_mode/
- https://api-docs.deepseek.com/guides/vision/

Go's public docs describe coding-agent use. Obtain written approval covering Score Tracker's intended workload and data processing before enabling it. The current Go endpoint and model ID differ from direct DeepSeek. The adapter preserves the app's actual identity and an opaque stable conversation session, uses the OpenAI-compatible chat route, and refuses redirects. Do not fake coding prompts or other clients' identities. DeepSeek's native thinking field is preserved; JSON/vision support through the Go route still requires provider-side validation.

## Settings (server-side only)

- `SCORE_TRACKER_STUDY_PROVIDER`: `legacy` (default) or `opencode-go`
- `SCORE_TRACKER_VISION_PROVIDER`: `legacy` (default) or `opencode-go`
- `OPENCODE_GO_API_KEY`: separate backend secret; never a browser setting.
- `SCORE_TRACKER_GO_VISION_VERIFIED`: leave unset until a synthetic image test confirms actual Go image input and JSON behavior.

Existing score_vision config, enabled flag and shared credit caps remain intact. Missing Go secret/vision validation makes the selected route unavailable, not a silent fallback to another key. Keep both switches on legacy until verification; existing evaluation credential is not automatically copied or activated. Paper entry and analysis stay disabled in this release, regardless of provider. All metered calls continue reserving and settling the current conservative reference credit budget; subscription usage and actual Go charges must be reconciled separately. Extra Usage must be reviewed before activation. No live model requests from CI or scheduled tasks.

## Admin readiness panel

The service and quota settings page displays the independent provider selection, whether the backend has a Go credential, and image activation flag. It does not send an upstream request, report live connectivity as successful, display credentials or change routing. Both real connection tests remain unverified. The normal original provider settings remain available.
