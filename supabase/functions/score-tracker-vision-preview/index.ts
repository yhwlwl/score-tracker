import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const db = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const DEFAULT_VISION_MODEL = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free";
const DEFAULT_VISION_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_AI_DAILY_LIMIT = 10;
const DEFAULT_AI_GLOBAL_DAILY_LIMIT = 100;
const DEFAULT_AI_COOLDOWN_SECONDS = 15;
const DEFAULT_UPSTREAM_TIMEOUT_MS = 30000;
const DATABASE_TIMEOUT_MS = 8000;
const CACHE_TTL_MS = 30000;

function safeConfigInt(value: unknown, fallback: number, min: number, max: number) {
  const n = Number(value);
  return Number.isInteger(n) && n >= min && n <= max ? n : fallback;
}

function normalizeBaseUrl(value: unknown) {
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

function isOpenRouterBase(baseUrl: string) {
  try {
    const hostname = new URL(baseUrl).hostname.toLowerCase();
    return hostname === "openrouter.ai" || hostname.endsWith(".openrouter.ai");
  } catch (_) {
    return false;
  }
}

class VisionServiceError extends Error {
  code: string;
  status: number;
  constructor(message: string, code: string, status = 503) {
    super(message);
    this.name = "VisionServiceError";
    this.code = code;
    this.status = status;
  }
}

async function withTimeout<T>(operation: PromiseLike<T>, timeoutMs: number, code: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(operation),
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new VisionServiceError("服务请求超时", code)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = DEFAULT_UPSTREAM_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const payload = await response.json().catch(() => ({}));
    return { response, payload };
  } finally {
    clearTimeout(timer);
  }
}

let visionConfigCache: { expiresAt: number; value: any } | null = null;

async function visionConfig() {
  const now = Date.now();
  if (visionConfigCache && visionConfigCache.expiresAt > now) return visionConfigCache.value;

  const result = await withTimeout(
    db.from("score_tracker_ai_configs")
      .select("openrouter_api_key,base_url,model,enabled,beta_only,daily_limit,global_daily_limit,cooldown_seconds")
      .eq("id", "score_vision")
      .maybeSingle(),
    DATABASE_TIMEOUT_MS,
    "vision_config_timeout",
  );
  if (result.error) throw result.error;

  const row: any = result.data;
  const value = {
    apiKey: row?.enabled === false ? "" : String(row?.openrouter_api_key || Deno.env.get("OPENROUTER_API_KEY") || "").trim(),
    baseUrl: normalizeBaseUrl(row?.base_url || Deno.env.get("OPENROUTER_BASE_URL") || DEFAULT_VISION_BASE_URL),
    model: String(row?.model || DEFAULT_VISION_MODEL).trim() || DEFAULT_VISION_MODEL,
    configured: !!row?.openrouter_api_key || !!Deno.env.get("OPENROUTER_API_KEY"),
    disabled: row?.enabled === false,
    betaOnly: row?.beta_only !== false,
    dailyLimit: safeConfigInt(row?.daily_limit, DEFAULT_AI_DAILY_LIMIT, 1, 1000),
    globalDailyLimit: safeConfigInt(row?.global_daily_limit, DEFAULT_AI_GLOBAL_DAILY_LIMIT, 1, 10000),
    cooldownSeconds: safeConfigInt(row?.cooldown_seconds, DEFAULT_AI_COOLDOWN_SECONDS, 0, 86400),
  };
  visionConfigCache = { expiresAt: now + CACHE_TTL_MS, value };
  return value;
}
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
});

async function sha(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function auth(token: string) {
  if (!token) return null;
  const { data, error } = await db.from("score_tracker_users")
    .select("id,username,session_expires_at")
    .eq("session_token_hash", await sha(token))
    .maybeSingle();
  if (error) throw error;
  if (!data?.session_expires_at || new Date(data.session_expires_at).getTime() < Date.now()) return null;
  return data;
}

const visionBetaCache = new Map<string, { expiresAt: number; allowed: boolean }>();

async function isVisionBetaUser(username: unknown) {
  const usernameKey = String(username ?? "").trim().toLowerCase();
  if (!usernameKey) return false;

  const cached = visionBetaCache.get(usernameKey);
  if (cached && cached.expiresAt > Date.now()) return cached.allowed;

  const result = await withTimeout(
    db.from("score_tracker_ai_beta_users")
      .select("username_key")
      .eq("username_key", usernameKey)
      .eq("enabled", true)
      .maybeSingle(),
    DATABASE_TIMEOUT_MS,
    "vision_beta_timeout",
  );
  if (result.error) throw result.error;

  const allowed = !!result.data;
  visionBetaCache.set(usernameKey, { expiresAt: Date.now() + CACHE_TTL_MS, allowed });
  return allowed;
}

async function claimAiRequest(userId: string, limits: { dailyLimit: number; globalDailyLimit: number; cooldownSeconds: number }) {
  const result = await db.rpc("claim_score_tracker_ai_request", {
    p_user_id: userId,
    p_daily_limit: limits.dailyLimit,
    p_global_daily_limit: limits.globalDailyLimit,
    p_cooldown_seconds: limits.cooldownSeconds,
  });
  if (result.error) throw result.error;
  return result.data?.[0] ?? null;
}

function cleanText(value: unknown, max = 80) {
  const text = String(value ?? "").trim();
  return text ? text.slice(0, max) : null;
}

function upstreamMessage(payload: any) {
  const value = typeof payload?.error === "string"
    ? payload.error
    : payload?.error?.message || payload?.message;
  return cleanText(value, 240) || "";
}
function cleanNum(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 && n <= 10000000 ? Math.round(n * 100) / 100 : null;
}
function cleanInt(value: unknown) {
  const n = cleanNum(value);
  return n !== null && Number.isInteger(n) && n >= 1 ? n : null;
}
function parseJson(text: string) {
  const stripped = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try { return JSON.parse(stripped); } catch (_) {
    const start = stripped.indexOf("{");
    const end = stripped.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(stripped.slice(start, end + 1));
    throw new Error("模型没有返回可解析的结构化结果");
  }
}
function outputText(payload: any) {
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((item: any) => typeof item?.text === "string" ? item.text : "").join("");
  return "";
}

function normalize(raw: any, context: any) {
  const warnings = Array.isArray(raw?.warnings) ? raw.warnings.map((x: unknown) => cleanText(x, 160)).filter(Boolean) : [];
  const allowedCategories = Array.isArray(context?.classificationOptions) ? context.classificationOptions.map((x: unknown) => String(x)) : [];
  const examRaw = raw?.exam ?? {};
  const examSchoolRank = cleanInt(examRaw.schoolRank);
  const examSchoolParticipants = cleanInt(examRaw.schoolParticipants);
  const examJointRank = cleanInt(examRaw.jointRank);
  const examJointParticipants = cleanInt(examRaw.jointParticipants);
  const category = cleanText(examRaw.category, 40);
  const exam = {
    name: cleanText(examRaw.name, 60),
    date: /^\d{4}-\d{2}-\d{2}$/.test(String(examRaw.date ?? "")) ? String(examRaw.date) : null,
    category: category && allowedCategories.includes(category) ? category : null,
    finalTotal: cleanNum(examRaw.finalTotal),
    rawTotal: cleanNum(examRaw.rawTotal),
    yearRank: cleanInt(examRaw.yearRank) ?? examSchoolRank,
    yearParticipants: cleanInt(examRaw.yearParticipants) ?? examSchoolParticipants,
    classRank: cleanInt(examRaw.classRank),
    classParticipants: cleanInt(examRaw.classParticipants),
  };
  if (category && !exam.category) warnings.push(`识别到分类“${category}”，但它不在当前分类选项中，请手动选择。`);
  if (examSchoolRank !== null || examSchoolParticipants !== null) warnings.push("识别到校次/校排名，已按年排使用。");
  if (examJointRank !== null || examJointParticipants !== null) warnings.push("识别到联考名次/联考排名，当前不作为年排或班排。");

  const seen = new Set<string>();
  const subjects = (Array.isArray(raw?.subjects) ? raw.subjects : []).map((item: any) => {
    const name = cleanText(item?.name, 40);
    if (!name || seen.has(name)) return null;
    seen.add(name);
    const subjectSchoolRank = cleanInt(item.schoolRank);
    const subjectSchoolParticipants = cleanInt(item.schoolParticipants);
    const subjectJointRank = cleanInt(item.jointRank);
    const subjectJointParticipants = cleanInt(item.jointParticipants);
    const subject = {
      name,
      target: cleanNum(item.target),
      rawScore: cleanNum(item.rawScore),
      rawMax: cleanNum(item.rawMax),
      finalScore: cleanNum(item.finalScore),
      finalMax: cleanNum(item.finalMax),
      yearRank: cleanInt(item.yearRank) ?? subjectSchoolRank,
      yearParticipants: cleanInt(item.yearParticipants) ?? subjectSchoolParticipants,
      classRank: cleanInt(item.classRank),
      classParticipants: cleanInt(item.classParticipants),
      ambiguousScore: cleanNum(item.ambiguousScore),
    };
    if (subjectSchoolRank !== null || subjectSchoolParticipants !== null) warnings.push(`${name} 识别到校次/校排名，已按年排使用。`);
    if (subjectJointRank !== null || subjectJointParticipants !== null) warnings.push(`${name} 识别到联考名次/联考排名，当前不作为年排或班排。`);
    if (subject.ambiguousScore !== null) warnings.push(`${name} 有一个分数 ${subject.ambiguousScore}，无法确定是原始分还是赋分/最终分，请手动确认。`);
    if (subject.rawScore !== null && subject.rawMax !== null && subject.rawScore > subject.rawMax) warnings.push(`${name} 的原始分高于识别到的原始满分，请核对。`);
    if (subject.finalScore !== null && subject.finalMax !== null && subject.finalScore > subject.finalMax) warnings.push(`${name} 的最终分高于识别到的最终满分，请核对。`);
    return subject;
  }).filter(Boolean).slice(0, 40);

  return { exam, subjects, warnings: [...new Set(warnings)].slice(0, 20) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  const mark = (phase: string, extra: Record<string, unknown> = {}) => {
    console.log("vision_timing", JSON.stringify({
      request_id: requestId,
      phase,
      elapsed_ms: Date.now() - startedAt,
      ...extra,
    }));
  };

  try {
    mark("request_received");
    const body = await req.json().catch(() => ({}));

    let user;
    try {
      user = await withTimeout(auth(String(body.token ?? "")), DATABASE_TIMEOUT_MS, "auth_timeout");
      mark(user ? "auth_ok" : "auth_rejected");
    } catch (error) {
      mark("auth_failed");
      console.error("vision auth error", JSON.stringify({
        request_id: requestId,
        message: error instanceof Error ? error.message : String(error),
      }));
      return json({ error: "登录状态检查暂不可用，请稍后再试", code: "auth_unavailable", request_status: 0 }, 503);
    }
    if (!user) return json({ error: "登录已失效，请重新登录" }, 401);

    let config;
    try {
      config = await withTimeout(visionConfig(), DATABASE_TIMEOUT_MS, "vision_config_timeout");
      mark("config_ok");
    } catch (error) {
      mark("config_failed");
      console.error("vision config error", JSON.stringify({
        request_id: requestId,
        message: error instanceof Error ? error.message : String(error),
      }));
      return json({ error: "识别服务配置暂不可用，请稍后再试", code: "vision_config_unavailable", request_status: 0 }, 503);
    }
    if (body.action === "beta_status") {
      if (config.disabled || !config.configured) {
        return json({ eligible: false, enabled: !config.disabled, beta_only: config.betaOnly });
      }
      let eligible = false;
      try {
        eligible = config.betaOnly && await isVisionBetaUser(user.username);
      } catch (error) {
        console.error("vision beta status", error instanceof Error ? error.message : error);
        return json({ error: "识别服务资格检查暂不可用", code: "beta_status_unavailable" }, 503);
      }
      return json({ eligible, enabled: !config.disabled, beta_only: config.betaOnly });
    }
    if (body.action === "connectivity_test") {
      const connectivityStartedAt = Date.now();
      if (config.disabled) return json({ error: "识图功能当前未启用，请联系管理员", code: "vision_disabled", request_status: 503 }, 503);
      if (!config.apiKey) return json({ error: "识图服务尚未配置识别服务 Key，请联系管理员", code: "missing_api_key", request_status: 503 }, 503);
      if (!config.baseUrl) return json({ error: "识别服务 Base URL 配置无效，请联系管理员", code: "invalid_base_url", request_status: 503 }, 503);
      if (config.betaOnly) {
        let allowed = false;
        try {
          allowed = await isVisionBetaUser(user.username);
        } catch (error) {
          console.error("vision beta connectivity", error instanceof Error ? error.message : error);
          return json({ error: "识别服务资格检查暂不可用，请稍后再试", code: "beta_access_unavailable", request_status: 0 }, 503);
        }
        if (!allowed) return json({ error: "图片识别目前处于内测阶段", code: "vision_beta_only", request_status: 403 }, 403);
      }

      const requestBody: Record<string, unknown> = {
        model: config.model,
        messages: [{ role: "user", content: "ping" }],
        temperature: 0,
        max_tokens: 1,
      };
      if (isOpenRouterBase(config.baseUrl)) requestBody.provider = { data_collection: "deny" };
      const requestHeaders: Record<string, string> = {
        "Authorization": `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      };
      if (isOpenRouterBase(config.baseUrl)) {
        requestHeaders["HTTP-Referer"] = "https://score.yhwlwl.xyz";
        requestHeaders["X-Title"] = "Score Tracker Preview";
      }
      mark("connectivity_test_start");
      try {
        const upstream = await fetchWithTimeout(config.baseUrl + "/chat/completions", {
          method: "POST",
          headers: requestHeaders,
          body: JSON.stringify(requestBody),
        }, 10000);
        const latencyMs = Date.now() - connectivityStartedAt;
        mark("connectivity_test_response", { status: upstream.response.status, latency_ms: latencyMs });
        if (!upstream.response.ok) {
          const detail = upstreamMessage(upstream.payload);
          return json({
            error: "识别服务连接测试失败",
            code: "connectivity_upstream_error",
            request_status: 502,
            upstream_status: upstream.response.status,
            upstream_message: detail || ("HTTP " + upstream.response.status),
            latency_ms: latencyMs,
          }, 502);
        }
        return json({ ok: true, status: upstream.response.status, latency_ms: latencyMs, model: config.model });
      } catch (error) {
        const timedOut = error instanceof Error && error.name === "AbortError";
        const latencyMs = Date.now() - connectivityStartedAt;
        mark("connectivity_test_failed", { status: timedOut ? 504 : 502, latency_ms: latencyMs });
        return json({
          error: timedOut ? "识别服务连接测试超时，请稍后再试" : "识别服务连接测试失败",
          code: timedOut ? "connectivity_timeout" : "connectivity_network_error",
          request_status: 0,
          upstream_status: 0,
          upstream_message: cleanText(error instanceof Error ? error.message : error, 240),
          latency_ms: latencyMs,
        }, timedOut ? 504 : 502);
      }
    }

    const images = Array.isArray(body.images) ? body.images : [];
    if (!images.length || images.length > 6) return json({ error: "请选择 1～6 张图片" }, 400);
    let totalSize = 0;
    for (const image of images) {
      if (typeof image !== "string" || !/^data:image\/(?:jpeg|jpg|png|webp);base64,/i.test(image)) return json({ error: "仅支持 JPG、PNG、WEBP 图片" }, 400);
      if (image.length > 3_800_000) return json({ error: "单张图片处理后仍过大，请裁剪后再试" }, 400);
      totalSize += image.length;
    }
    if (totalSize > 18_000_000) return json({ error: "图片总大小过大，请分批识别" }, 400);

    if (config.disabled) return json({ error: "识图功能当前未启用，请联系管理员" }, 503);
    if (!config.apiKey) return json({ error: "识图服务尚未配置识别服务 Key，请联系管理员" }, 503);
    if (config.betaOnly) {
      let allowed = false;
      try {
        allowed = await isVisionBetaUser(user.username);
      } catch (error) {
        console.error("vision beta access", error instanceof Error ? error.message : error);
        return json({ error: "识别服务资格检查暂不可用，请稍后再试", code: "beta_access_unavailable", request_status: 0 }, 503);
      }
      if (!allowed) {
        return json({ error: "图片识别目前处于内测阶段", code: "vision_beta_only", request_status: 403 }, 403);
      }
    }

    let quota;
    try {
      quota = await withTimeout(
        claimAiRequest(user.id, config),
        DATABASE_TIMEOUT_MS,
        "rate_limit_timeout",
      );
      mark("quota_checked");
    } catch (error) {
      console.error("vision quota check", error instanceof Error ? error.message : error);
      return json({ error: "识别服务限流检查暂不可用，请稍后再试", code: "rate_limit_unavailable", request_status: 0 }, 503);
    }
    if (!quota?.allowed) {
      const reason = quota?.reason === "global_limit"
        ? "当前识别服务今日总额度已用完，请明天再试"
        : quota?.reason === "daily_limit"
          ? "你今天的识别次数已用完，请明天再试"
          : "识别请求过于频繁，请稍后再试";
      return json({
        error: reason,
        code: "ai_rate_limited",
        request_status: 429,
        retry_after_seconds: Number(quota?.retry_after_seconds || 0),
      }, 429);
    }

    const context = body.context ?? {};
    const prompt = `你是一个中文学生成绩单识别器。请从用户提供的 1～6 张同一次考试的截图或照片中提取明确可见的数据。\n\n重要规则：\n1. 绝不猜测看不清、没有明确标注或无法确认的数据；不确定就返回 null，并在 warnings 说明。\n2. “原始分/卷面分”和“赋分/等级分/最终分”必须根据图片文字语义区分。若某科只有一个分数或一组“分数/满分”，且没有明确写原始分，默认放到 finalScore/finalMax；只有明确出现原始分时才填写 rawScore/rawMax。\n3. 排名不要机械依赖固定字段名，也不要要求标签必须和“年排/班排”完全一致；请结合整张表的表头、分组、相邻行以及同一科目的语义判断范围，再映射到系统字段：学校范围的“校次/校排/校排名/学校名次”等按 yearRank 处理（本系统将校内名次作为年排使用）；年级范围的年排/年级排名等也按 yearRank 处理；班级范围的班次/班排/班级排名等按 classRank 处理；联考/联考名次/联考排名等单独放 jointRank，当前不作为 yearRank 或 classRank。若同一组数据同时出现校次、班次、联考名次，优先把校次放 yearRank、班次放 classRank，联考名次放 jointRank。只有确实无法判断范围时才返回 null，并在 warnings 说明。\n4. 参考人数只在图片明确出现时提取，不要用其他字段的数字补全。\n5. 科目/模块名称按图片原文，可包含自定义题型；${JSON.stringify(context.subjectNames || [])} 是当前录入表已有科目，仅用于辅助匹配，不要凭空新增图片中不存在的科目。\n6. 不要根据常识补满分；图片没有满分就返回 null。\n7. 日期必须转换成 YYYY-MM-DD；年份不明确则返回 null。\n8. 分类只允许从这些选项里选择：${JSON.stringify(context.classificationOptions || [])}；不明确就 null。\n9. 多张图若内容重复，合并为一个考试，不要重复科目。\n10. 总分只从图片明确标注“总分/总成绩”的位置提取；不要把某一科成绩或排名填入总分。\n\n只返回 JSON，不要 Markdown，不要解释。格式：\n{\n  "exam": {"name": string|null, "date": string|null, "category": string|null, "finalTotal": number|null, "rawTotal": number|null, "yearRank": number|null, "yearParticipants": number|null, "classRank": number|null, "classParticipants": number|null, "jointRank": number|null, "jointParticipants": number|null},\n  "subjects": [{"name": string, "target": number|null, "rawScore": number|null, "rawMax": number|null, "finalScore": number|null, "finalMax": number|null, "yearRank": number|null, "yearParticipants": number|null, "classRank": number|null, "classParticipants": number|null, "jointRank": number|null, "jointParticipants": number|null, "ambiguousScore": number|null}],\n  "warnings": [string]\n}`;    const content: any[] = [{ type: "text", text: prompt }];
    for (const image of images) content.push({ type: "image_url", image_url: { url: image } });

    if (!config.baseUrl) return json({ error: "识别服务 Base URL 配置无效，请联系管理员", code: "invalid_base_url", request_status: 0 }, 503);

    const requestBody: Record<string, unknown> = {
      model: config.model,
      messages: [{ role: "user", content }],
      temperature: 0.1,
      max_tokens: 3200,
    };
    if (isOpenRouterBase(config.baseUrl)) requestBody.provider = { data_collection: "deny" };

    const requestHeaders: Record<string, string> = {
      "Authorization": `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    };
    if (isOpenRouterBase(config.baseUrl)) {
      requestHeaders["HTTP-Referer"] = "https://score.yhwlwl.xyz";
      requestHeaders["X-Title"] = "Score Tracker Preview";
    }

    mark("upstream_start", { image_count: images.length });
    let response: Response;
    let payload: any;
    try {
      const upstream = await fetchWithTimeout(config.baseUrl + "/chat/completions", {
        method: "POST",
        headers: requestHeaders,
        body: JSON.stringify(requestBody),
      });
      response = upstream.response;
      payload = upstream.payload;
      mark("upstream_response", { status: response.status });
    } catch (error) {
      const timedOut = error instanceof Error && error.name === "AbortError";
      mark("upstream_failed", { status: timedOut ? 504 : 502 });
      return json({
        error: timedOut ? "识别服务请求超时，请稍后再试" : "识别服务网络错误，请稍后再试",
        code: timedOut ? "upstream_timeout" : "upstream_network_error",
        request_status: 0,
        upstream_status: 0,
        upstream_message: cleanText(error instanceof Error ? error.message : error, 240),
      }, timedOut ? 504 : 502);
    }
    if (!response.ok) {
      const detail = upstreamMessage(payload);
      const upstreamStatus = response.status;
      console.error("vision upstream error", JSON.stringify({ status: upstreamStatus, code: payload?.error?.code, message: detail }));
      const shared = { status: upstreamStatus, upstream_status: upstreamStatus, upstream_message: detail || ("HTTP " + upstreamStatus) };
      if (upstreamStatus === 401 || upstreamStatus === 403) {
        return json({ ...shared, error: "识别服务鉴权失败，请检查 Base URL 和 Key", code: "upstream_auth_failed" }, 502);
      }
      if (upstreamStatus === 429) {
        return json({ ...shared, error: "识别服务请求过于频繁，请稍后再试", code: "upstream_rate_limited" }, 429);
      }
      if (upstreamStatus === 402) {
        return json({ ...shared, error: "识别服务额度不足或模型不可用", code: "upstream_billing_or_model_error" }, 503);
      }
      return json({ ...shared, error: "识别服务暂不可用", code: "upstream_error" }, 502);
    }
    const text = outputText(payload);
    if (!text) {
      mark("empty_model_output");
      return json({ error: "没有识别到可用内容，请换一张更清晰的图片", code: "empty_model_output" }, 422);
    }

    let parsed: any;
    try {
      parsed = parseJson(text);
    } catch (error) {
      mark("model_parse_failed");
      console.error("vision model output parse error", JSON.stringify({
        request_id: requestId,
        message: error instanceof Error ? error.message : String(error),
      }));
      return json({ error: "识别结果格式异常，请重试", code: "invalid_model_output", request_status: 200, upstream_status: 200 }, 422);
    }

    try {
      const normalized = normalize(parsed, context);
      mark("completed", { subject_count: normalized.subjects.length });
      return json(normalized);
    } catch (error) {
      mark("model_normalize_failed");
      console.error("vision normalize error", JSON.stringify({
        request_id: requestId,
        message: error instanceof Error ? error.message : String(error),
      }));
      return json({ error: "识别结果处理失败，请重试", code: "invalid_model_output", request_status: 200, upstream_status: 200 }, 422);
    }
  } catch (error) {
    const message = cleanText(error instanceof Error ? error.message : error) || "识别失败，请稍后再试";
    const isServiceError = error instanceof VisionServiceError;
    const status = isServiceError ? error.status : 500;
    const code = isServiceError ? error.code : "vision_handler_error";
    mark("handler_error", { status });
    console.error("vision handler error", JSON.stringify({ request_id: requestId, message }));
    return json({
      error: isServiceError ? "识别服务暂不可用，请稍后再试" : "识别失败，请稍后再试",
      code,
      request_status: 0,
      upstream_status: 0,
      upstream_message: message,
    }, status);
  }
});
