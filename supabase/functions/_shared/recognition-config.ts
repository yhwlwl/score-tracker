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
  return {
    apiKey: row?.enabled === false ? "" : String(row?.openrouter_api_key || env("OPENROUTER_API_KEY") || "").trim(),
    baseUrl: normalizeBaseUrl(row?.base_url || env("OPENROUTER_BASE_URL") || DEFAULT_VISION_BASE_URL),
    model: String(row?.model || DEFAULT_VISION_MODEL).trim() || DEFAULT_VISION_MODEL,
    configured: !!row?.openrouter_api_key || !!env("OPENROUTER_API_KEY"),
    disabled: row?.enabled === false,
    betaOnly: row?.beta_only !== false,
  };
}
