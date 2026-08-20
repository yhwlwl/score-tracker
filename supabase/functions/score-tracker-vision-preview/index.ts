import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const db = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false, autoRefreshToken: false } },
);

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
  for (const item of payload?.output ?? []) {
    for (const content of item?.content ?? []) {
      if (content?.type === "output_text" && typeof content.text === "string") return content.text;
    }
  }
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
    if (!images.length || images.length > 3) return json({ error: "请选择 1～3 张图片" }, 400);
    for (const image of images) {
      if (typeof image !== "string" || !/^data:image\/(?:jpeg|jpg|png|webp);base64,/i.test(image)) return json({ error: "仅支持 JPG、PNG、WEBP 图片" }, 400);
      if (image.length > 2_800_000) return json({ error: "单张图片处理后仍过大，请裁剪后再试" }, 400);
    }

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return json({ error: "预览识图服务尚未配置模型密钥，请联系管理员后再试" }, 503);
    const model = Deno.env.get("OPENAI_VISION_MODEL") || "gpt-5.6-luna";
    const context = body.context ?? {};
    const prompt = `你是一个中文学生成绩单识别器。请从用户提供的 1～3 张同一次考试的截图/照片中提取明确可见的数据。\n\n重要规则：\n1. 绝不猜测看不清或没有明确标注的数字；不确定就返回 null，并在 warnings 说明。\n2. “原始分/卷面分”和“赋分/等级分/最终分”必须根据图片文字语义区分。若只有一个分数且无法确定是哪一种，放到 ambiguousScore，不要擅自归类。\n3. “年排/年级排名”和“班排/班级排名”必须按图片标注区分；只写“排名”而无法判断范围时，不要擅自归类，并加入 warnings。\n4. 参考人数只在图片明确出现时提取。\n5. 科目/模块名称按图片原文，可包含自定义题型。\n6. 不要根据常识补满分；图片没有满分就返回 null。\n7. 日期必须转换成 YYYY-MM-DD；年份不明确则返回 null。\n8. 分类只允许从这些选项里选择：${JSON.stringify(context.classificationOptions || [])}；不明确就 null。\n9. 多张图若内容重复，合并为一个考试，不要重复科目。\n\n只返回 JSON，不要 Markdown，不要解释。格式：\n{\n  "exam": {"name": string|null, "date": string|null, "category": string|null, "yearRank": number|null, "yearParticipants": number|null, "classRank": number|null, "classParticipants": number|null},\n  "subjects": [{"name": string, "target": number|null, "rawScore": number|null, "rawMax": number|null, "finalScore": number|null, "finalMax": number|null, "yearRank": number|null, "yearParticipants": number|null, "classRank": number|null, "classParticipants": number|null, "ambiguousScore": number|null}],\n  "warnings": [string]\n}`;

    const content: any[] = [{ type: "input_text", text: prompt }];
    for (const image of images) content.push({ type: "input_image", image_url: image, detail: "high" });
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, input: [{ role: "user", content }], max_output_tokens: 2600 }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("vision upstream", response.status, payload?.error?.type, payload?.error?.code);
      return json({ error: response.status === 429 ? "识别请求较多，请稍后再试" : "识别服务暂时不可用，请稍后再试" }, 502);
    }
    const text = outputText(payload);
    if (!text) return json({ error: "没有识别到可用内容，请换一张更清晰的图片" }, 422);
    return json(normalize(parseJson(text), context));
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : "识别失败，请稍后再试" }, 500);
  }
});
