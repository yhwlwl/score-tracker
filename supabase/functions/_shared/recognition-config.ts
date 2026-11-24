const DEFAULT_VISION_MODEL = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free";
const DEFAULT_VISION_BASE_URL = "https://openrouter.ai/api/v1";
export function normalizeBaseUrl(value: unknown) {
  const raw = String(value ?? DEFAULT_VISION_BASE_URL).trim().replace(/\/+$/, "");
  if (!raw) return null;
  let parsed: URL;
  try { parsed = new URL(raw); } catch (_) { return null; }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash) return null;
  let path = parsed.pathname.replace(/\/+$/, "");
  path = path.replace(/\/(?:chat\/completions|models)$/i, "");
  parsed.pathname = path || "/";
  return parsed.toString().replace(/\/+$/, "");
}

export function recognitionConfig(row: any, env = (key: string) => Deno.env.get(key)) {
  const selected = goOverride("vision", env);
  if (selected) return {...selected, apiKey: row?.enabled === false ? "" : selected.apiKey,
    disabled: row?.enabled === false, betaOnly: row?.beta_only !== false};
  return {
    apiKey: row?.enabled === false ? "" : String(row?.openrouter_api_key || env("OPENROUTER_API_KEY") || "").trim(),
    baseUrl: normalizeBaseUrl(row?.base_url || env("OPENROUTER_BASE_URL") || DEFAULT_VISION_BASE_URL),
    model: String(row?.model || DEFAULT_VISION_MODEL).trim() || DEFAULT_VISION_MODEL,
    configured: !!row?.openrouter_api_key || !!env("OPENROUTER_API_KEY"),
    disabled: row?.enabled === false,
    betaOnly: row?.beta_only !== false,
  };
}

// Go is an opt-in, independently configured provider. Never reuse the legacy
// credential for Go or silently fail over when a subscription is unavailable.
export const GO_BASE_URL = "https://opencode.ai/inference/go/openai/v1";
export const GO_MODEL = "deepseek-v4.1-flash";
export function goOverride(feature: "study" | "vision", env = (key: string) => Deno.env.get(key)) {
  const selected = String(env(feature === "study" ? "SCORE_TRACKER_STUDY_PROVIDER" : "SCORE_TRACKER_VISION_PROVIDER") || "legacy").trim();
  if (selected === "legacy") return null;
  if (selected !== "opencode-go") throw new Error("unsupported_ai_provider");
  const ready = feature !== "vision" || env("SCORE_TRACKER_GO_VISION_VERIFIED") === "true";
  const apiKey = ready ? String(env("OPENCODE_GO_API_KEY") || "").trim() : "";
  return {apiKey, baseUrl: GO_BASE_URL, model: GO_MODEL, configured: Boolean(apiKey)};
}

// Normalize only the documented Go route. Other providers retain their exact
// existing request options. No account identifiers or scores in session headers.
export async function prepareModelRequest(url: string, init: any, user: string, session: string) {
  const target = new URL(url);
  if (target.origin !== "https://opencode.ai" || !target.pathname.startsWith("/inference/go/")) return init;
  if (url !== GO_BASE_URL + "/chat/completions") throw new Error("unsupported_go_endpoint");
  const body = JSON.parse(String(init.body || "{}"));
  if (body.model !== GO_MODEL) throw new Error("unsupported_go_model");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(user + ":" + session));
  const sessionId = "ses_" + Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
  const headers = new Headers(init.headers);
  headers.set("User-Agent", "Score-Tracker/1.0");
  headers.set("x-opencode-session", sessionId);
  // Prevent credential forwarding to another origin on a redirect.
  return {...init, headers, redirect: "error"};
}

/** Admin-only readiness information. Never returns credentials or sends a request. */
export function goProviderReadiness(env = (key: string) => Deno.env.get(key)) {
  const provider = (key: string) => {
    const value = String(env(key) || "legacy").trim();
    return value === "legacy" || value === "opencode-go" ? value : "invalid";
  };
  return {
    configured: Boolean(String(env("OPENCODE_GO_API_KEY") || "").trim()),
    study_provider: provider("SCORE_TRACKER_STUDY_PROVIDER"),
    vision_provider: provider("SCORE_TRACKER_VISION_PROVIDER"),
    vision_enabled_by_config: env("SCORE_TRACKER_GO_VISION_VERIFIED") === "true",
    model: GO_MODEL,
    text_live: "unverified",
    vision_live: "unverified",
    // Historical independent evaluation evidence, not a health check of this backend.
    independent_eval: {"date":"2026-11-24","scope":"independent_evaluation","model":"deepseek-v4.1-flash","commit":"40144c1557933789a62650960949c35975081951","scenarios":42,"success":42,"model_calls":86,"quality_passed":35,"report_path":"design/study-agent-live-report-2026-11-24.json"}
  };
}
