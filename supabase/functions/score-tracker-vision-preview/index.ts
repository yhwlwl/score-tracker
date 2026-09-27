import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const db = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const DEFAULT_VISION_MODEL = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free";
const DEFAULT_VISION_BASE_URL = "https://openrouter.ai/api/v1";

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

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 90000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function visionConfig() {
  let row: any = null;
  try {
    const result = await db.from("score_tracker_ai_configs")
      .select("openrouter_api_key,base_url,model,enabled")
      .eq("id", "score_vision")
      .maybeSingle();
    if (result.error) throw result.error;
    row = result.data;
  } catch (error) {
    console.error("vision config read", error instanceof Error ? error.message : error);
  }
  return {
    apiKey: row?.enabled === false ? "" : String(row?.openrouter_api_key || Deno.env.get("OPENROUTER_API_KEY") || "").trim(),
    baseUrl: normalizeBaseUrl(row?.base_url || Deno.env.get("OPENROUTER_BASE_URL") || DEFAULT_VISION_BASE_URL),
    model: String(row?.model || DEFAULT_VISION_MODEL).trim() || DEFAULT_VISION_MODEL,
    configured: !!row?.openrouter_api_key || !!Deno.env.get("OPENROUTER_API_KEY"),
    disabled: row?.enabled === false,
  };
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
  const category = cleanText(examRaw.category, 40);
  const exam = {
    name: cleanText(examRaw.name, 60),
    date: /^\d{4}-\d{2}-\d{2}$/.test(String(examRaw.date ?? "")) ? String(examRaw.date) : null,
    category: category && allowedCategories.includes(category) ? category : null,
    finalTotal: cleanNum(examRaw.finalTotal),
    rawTotal: cleanNum(examRaw.rawTotal),
    yearRank: cleanInt(examRaw.yearRank),
    yearParticipants: cleanInt(examRaw.yearParticipants),
    classRank: cleanInt(examRaw.classRank),
    classParticipants: cleanInt(examRaw.classParticipants),
  };
  if (category && !exam.category) warnings.push(`识别到分类“${category}”，但它不在当前分类选项中，请手动选择。`);

  const seen = new Set<string>();
  const subjects = (Array.isArray(raw?.subjects) ? raw.subjects : []).map((item: any) => {
    const name = cleanText(item?.name, 40);
    if (!name || seen.has(name)) return null;
    seen.add(name);
    const subject = {
      name,
      target: cleanNum(item.target),
      rawScore: cleanNum(item.rawScore),
      rawMax: cleanNum(item.rawMax),
      finalScore: cleanNum(item.finalScore),
      finalMax: cleanNum(item.finalMax),
      yearRank: cleanInt(item.yearRank),
      yearParticipants: cleanInt(item.yearParticipants),
      classRank: cleanInt(item.classRank),
      classParticipants: cleanInt(item.classParticipants),
      ambiguousScore: cleanNum(item.ambiguousScore),
    };
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
  try {
    const body = await req.json().catch(() => ({}));
    const user = await auth(String(body.token ?? ""));
    if (!user) return json({ error: "登录已失效，请重新登录" }, 401);

    const images = Array.isArray(body.images) ? body.images : [];
    if (!images.length || images.length > 6) return json({ error: "请选择 1～6 张图片" }, 400);
    let totalSize = 0;
    for (const image of images) {
      if (typeof image !== "string" || !/^data:image\/(?:jpeg|jpg|png|webp);base64,/i.test(image)) return json({ error: "仅支持 JPG、PNG、WEBP 图片" }, 400);
      if (image.length > 3_800_000) return json({ error: "单张图片处理后仍过大，请裁剪后再试" }, 400);
      totalSize += image.length;
    }
    if (totalSize > 18_000_000) return json({ error: "图片总大小过大，请分批识别" }, 400);

    const config = await visionConfig();
    if (config.disabled) return json({ error: "识图功能当前未启用，请联系管理员" }, 503);
    if (!config.apiKey) return json({ error: "识图服务尚未配置 OpenRouter Key，请联系管理员" }, 503);

    const context = body.context ?? {};
    const prompt = `你是一个中文学生成绩单识别器。请从用户提供的 1～6 张同一次考试的截图或照片中提取明确可见的数据。\n\n重要规则：\n1. 绝不猜测看不清、没有明确标注或无法确认的数据；不确定就返回 null，并在 warnings 说明。\n2. “原始分/卷面分”和“赋分/等级分/最终分”必须根据图片文字语义区分。若某科只有一个分数或一组“分数/满分”，且没有明确写原始分，默认放到 finalScore/finalMax；只有明确出现原始分时才填写 rawScore/rawMax。\n3. “年排/年级排名”和“班排/班级排名”必须按图片标注区分；不要把校次、联考名次等其他排名擅自当成年排；无法判断范围时放 null，并加入 warnings。\n4. 参考人数只在图片明确出现时提取，不要用其他字段的数字补全。\n5. 科目/模块名称按图片原文，可包含自定义题型；${JSON.stringify(context.subjectNames || [])} 是当前录入表已有科目，仅用于辅助匹配，不要凭空新增图片中不存在的科目。\n6. 不要根据常识补满分；图片没有满分就返回 null。\n7. 日期必须转换成 YYYY-MM-DD；年份不明确则返回 null。\n8. 分类只允许从这些选项里选择：${JSON.stringify(context.classificationOptions || [])}；不明确就 null。\n9. 多张图若内容重复，合并为一个考试，不要重复科目。\n10. 总分只从图片明确标注“总分/总成绩”的位置提取；不要把某一科成绩或排名填入总分。\n\n只返回 JSON，不要 Markdown，不要解释。格式：\n{\n  "exam": {"name": string|null, "date": string|null, "category": string|null, "finalTotal": number|null, "rawTotal": number|null, "yearRank": number|null, "yearParticipants": number|null, "classRank": number|null, "classParticipants": number|null},\n  "subjects": [{"name": string, "target": number|null, "rawScore": number|null, "rawMax": number|null, "finalScore": number|null, "finalMax": number|null, "yearRank": number|null, "yearParticipants": number|null, "classRank": number|null, "classParticipants": number|null, "ambiguousScore": number|null}],\n  "warnings": [string]\n}`;    const content: any[] = [{ type: "text", text: prompt }];
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

    let response: Response;
    try {
      response = await fetchWithTimeout(config.baseUrl + "/chat/completions", {
        method: "POST",
        headers: requestHeaders,
        body: JSON.stringify(requestBody),
      });
    } catch (error) {
      const timedOut = error instanceof Error && error.name === "AbortError";
      return json({
        error: timedOut ? "识别服务请求超时" : "识别服务网络错误",
        code: timedOut ? "upstream_timeout" : "upstream_network_error",
        request_status: 0,
        upstream_status: 0,
        upstream_message: cleanText(error instanceof Error ? error.message : error, 240),
      }, timedOut ? 504 : 502);
    }    const payload = await response.json().catch(() => ({}));
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
    if (!text) return json({ error: "没有识别到可用内容，请换一张更清晰的图片" }, 422);
    return json(normalize(parseJson(text), context));
  } catch (error) {
    const message = cleanText(error instanceof Error ? error.message : error, 240) || "识别失败，请稍后再试";
    console.error("vision handler error", message);
    return json({ error: "识别失败，请稍后再试", code: "vision_handler_error", request_status: 0, upstream_status: 0, upstream_message: message }, 500);
  }
});
