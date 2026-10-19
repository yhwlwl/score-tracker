import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { readDatabase, requestOptions, recognizeWithRecovery } from "../score-tracker-vision-preview/reliability.ts";
import { MAX_BODY, UUID, text, validateStart, normalizeReport, normalizeCorrections, prompt } from "./model.ts";
import { paperAudit, paperFailure } from "./audit.ts";

const db = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", { auth: { persistSession: false, autoRefreshToken: false } });
const TABLE = "score_tracker_paper_reviews";
const PUBLIC_FIELDS = "request_id,draft_id,exam_id,subject,status,created_at,completed_at,result,corrections,revision,error_message,error_code,error_stage,duration_ms";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type,authorization,apikey,x-score-request-id", "Access-Control-Allow-Methods": "POST,OPTIONS" };
function out(data: any, status = 200) { return new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "private, no-store" } }); }
class Failure extends Error { status: number; constructor(message: string, status = 400) { super(message); this.status = status; } }
async function query(operation: () => PromiseLike<any>) {
  const r = await readDatabase(operation);
  if (r.error) throw new Failure("分析记录暂时无法读取或保存，请稍后重试", 503);
  return r.data;
}
async function sha(value: string) {
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)))].map(b => b.toString(16).padStart(2, "0")).join("");
}
async function readBody(req: Request) {
  if (Number(req.headers.get("content-length") || 0) > MAX_BODY) throw new Failure("上传内容过大", 413);
  if (!(req.headers.get("content-type") || "").startsWith("application/json")) throw new Failure("请求格式不正确", 415);
  const reader = req.body?.getReader();
  if (!reader) throw new Failure("请求内容为空");
  const decoder = new TextDecoder(); let size = 0, raw = "";
  try {
    while (true) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > MAX_BODY) { await reader.cancel(); throw new Failure("上传内容过大", 413); } raw += decoder.decode(value, { stream: true }); }
    raw += decoder.decode();
    try { return JSON.parse(raw); } catch { throw new Failure("请求内容不是有效 JSON"); }
  } finally { reader.releaseLock(); }
}
async function userFor(token: any) {
  if (typeof token !== "string" || !token || token.length > 512) throw new Failure("请先登录", 401);
  const hash = await sha(token);
  const user = await query(() => db.from("score_tracker_users").select("id,session_expires_at").eq("session_token_hash", hash).maybeSingle());
  if (!user || !(Date.parse(user.session_expires_at) > Date.now())) throw new Failure("登录已过期，请重新登录", 401);
  return user.id;
}
async function ownedExam(user: string, id: string) {
  if (!UUID.test(id || "")) throw new Failure("考试编号无效");
  const exam = await query(() => db.from("score_tracker_exams").select("id").eq("id", id).eq("user_id", user).maybeSingle());
  if (!exam) throw new Failure("考试不存在或无权访问", 404);
  return exam;
}
async function reportFor(user: string, id: string) {
  if (!UUID.test(id || "")) throw new Failure("报告编号无效");
  let report = await query(() => db.from(TABLE).select(PUBLIC_FIELDS).eq("request_id", id).eq("user_id", user).maybeSingle());
  if (!report) throw new Failure("报告不存在或已删除", 404);
  if (report.status === "running" && Date.now() - Date.parse(report.created_at) > 180000) {
    const expired = await query(() => db.from(TABLE).update({ status: "failed", completed_at: new Date().toISOString(),
      error_code: "analysis_incomplete", error_stage: "background", duration_ms: Date.now() - Date.parse(report.created_at),
      error_message: paperFailure("analysis_incomplete") }).eq("request_id", id).eq("user_id", user).eq("status", "running").select("request_id").maybeSingle());
    if (expired) console.error("paper_review_incomplete", JSON.stringify({ request_id: id, code: "analysis_incomplete", stage: "background" }));
    report = await query(() => db.from(TABLE).select(PUBLIC_FIELDS).eq("request_id", id).eq("user_id", user).maybeSingle());
  }
  return report;
}
async function analyze(input: any, user: string, config: any, startedAt: number) {
  const audit = paperAudit(db, input, user, config, startedAt);
  let stage = "request_preparation", outcome: any = null;
  try {
    await audit.mark("reserved");
    const content: any[] = [{ type: "text", text: prompt(input) }];
    const names: any = { paper: "试卷题目", work: "学生作答/答题卡", reference: "参考答案/评分细则" };
    input.pages.forEach((p: any) => content.push({ type: "text", text: `第 ${p.page} 页 · ${names[p.role]}` }, { type: "image_url", image_url: { url: p.url, detail: "high" } }));
    stage = "upstream";
    await audit.mark("upstream_started");
    const result = outcome = await recognizeWithRecovery({
      url: config.base_url.replace(/\/+$/, "") + "/chat/completions",
      headers: { Authorization: "Bearer " + config.api_key, "Content-Type": "application/json" },
      body: { model: config.model, messages: [{ role: "user", content }], max_tokens: 12800, ...requestOptions(config.model, new URL(config.base_url).hostname === "openrouter.ai") },
      requestId: input.request_id, budgetMs: 90000, attemptTimeoutMs: 60000, mark: audit.mark,
      validate: (raw: string) => {
        audit.mark("output_validation_started");
        const parsed = normalizeReport(JSON.parse(raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")), input);
        audit.mark("result_validated");
        return parsed;
      },
    });
    if (!result.ok) {
      stage = /model_output|usable_fields/.test(result.code) ? "output_validation" : "upstream";
      await audit.finish("failed", { ...result, stage });
      return;
    }
    stage = "result_save";
    await audit.mark("result_save_started");
    await audit.finish("succeeded", result);
  } catch (e) {
    const code = stage === "result_save" ? "result_save_failed" : outcome?.ok === false ? outcome.code : "paper_handler_error";
    try { await audit.finish("failed", { code, stage, detail: (e as any)?.message || e, upstream_status: outcome?.upstream_status, raw_output: outcome?.raw_output }); }
    catch (_) { /* Structured fallback was already logged by audit.finish. */ }
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return out({ error: "请求方式不支持" }, 405);
  const startedAt = Date.now();
  let action = "unknown", stage = "read_body", requestId = crypto.randomUUID();
  try {
    const body = await readBody(req);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Failure("请求格式不正确");
    action = ["start", "get", "list", "attach", "correct", "delete", "quota"].includes(body.action) ? body.action : "unknown";
    if (UUID.test(body.request_id || "")) requestId = body.request_id;
    stage = "authentication";
    const user = await userFor(body.token);
    stage = action;
    if (body.action === "quota") return out({ quota: await query(() => db.rpc("score_tracker_paper_quota", { p_user_id: user })) });
    if (body.action === "start") {
      stage = "input_validation";
      let input: any;
      try { input = validateStart(body); } catch (e) { throw new Failure((e as Error).message); }
      if (input.exam_id) {
        await ownedExam(user, input.exam_id);
        const score = await query(() => db.from("score_tracker_scores").select("id").eq("exam_id", input.exam_id).eq("user_id", user).eq("subject", input.subject).maybeSingle());
        if (!score) throw new Failure("请先保存新增科目，再关联试卷");
      }
      stage = "configuration";
      const config = await query(() => db.from("score_tracker_paper_settings").select("enabled,api_key,model,base_url").eq("id", "default").single());
      if (!config?.enabled || !config.api_key || !config.model) throw new Failure("试卷分析暂未开放，请稍后再来", 503);
      let url: URL;
      try { url = new URL(config.base_url); } catch { throw new Failure("分析服务配置暂不可用", 503); }
      if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) throw new Failure("分析服务配置暂不可用", 503);
      const fingerprint = await sha(JSON.stringify({ subject: input.subject, draft: input.draft_id, exam: input.exam_id, work_on_paper: input.work_on_paper, pages: input.pages }));
      stage = "quota_reservation";
      const reserved = await query(() => db.rpc("score_tracker_paper_reserve", { p_user_id: user, p_request_id: input.request_id, p_draft_id: input.draft_id, p_exam_id: input.exam_id, p_subject: input.subject, p_fingerprint: fingerprint }));
      if (!reserved.allowed) {
        console.log("paper_review_request", JSON.stringify({ request_id: requestId, action, stage, code: reserved.reason, http_status: reserved.reason === "conflict" ? 409 : 429, duration_ms: Date.now() - startedAt }));
        return out({ error: reserved.message, code: reserved.reason, quota: reserved.quota }, reserved.reason === "conflict" ? 409 : 429);
      }
      console.log("paper_review_request", JSON.stringify({ request_id: requestId, action, stage: reserved.created ? "accepted" : "deduplicated", http_status: 202, duration_ms: Date.now() - startedAt }));
      if (reserved.created) {
        const task = analyze(input, user, config, startedAt);
        if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(task); else await task;
      }
      return out({ request_id: input.request_id, quota: reserved.quota }, 202);
    }
    if (body.action === "get") return out({ review: await reportFor(user, body.request_id) });
    if (body.action === "list") {
      if (!UUID.test(body.draft_id || "")) throw new Failure("草稿编号无效");
      if (body.exam_id) await ownedExam(user, body.exam_id);
      const subject = text(body.subject, 40);
      const scope = body.exam_id ? `exam_id.eq.${body.exam_id},and(draft_id.eq.${body.draft_id},exam_id.is.null)` : `draft_id.eq.${body.draft_id}`;
      const reviews = await query(() => db.from(TABLE).select("request_id,subject,status,created_at,exam_id").eq("user_id", user).eq("subject", subject).or(scope).order("created_at", { ascending: false }).limit(20));
      return out({ reviews });
    }
    if (body.action === "attach") {
      await ownedExam(user, body.exam_id);
      if (!UUID.test(body.draft_id || "")) throw new Failure("草稿编号无效");
      const scores = await query(() => db.from("score_tracker_scores").select("subject").eq("exam_id", body.exam_id).eq("user_id", user));
      const subjects = scores.map((s: any) => s.subject);
      if (subjects.length) await query(() => db.from(TABLE).update({ exam_id: body.exam_id }).eq("user_id", user).eq("draft_id", body.draft_id).is("exam_id", null).in("subject", subjects));
      return out({ ok: true });
    }
    if (body.action === "correct") {
      const report = await reportFor(user, body.request_id);
      if (report.status !== "succeeded") throw new Failure("请等待分析完成", 409);
      if (body.revision !== report.revision) throw new Failure("报告已更新，请重新打开后核对", 409);
      let corrections: any;
      try { corrections = normalizeCorrections(body.corrections, report.result); } catch (e) { throw new Failure((e as Error).message); }
      const changed = await query(() => db.from(TABLE).update({ corrections, revision: report.revision + 1 }).eq("request_id", report.request_id).eq("user_id", user).eq("revision", report.revision).select(PUBLIC_FIELDS).maybeSingle());
      if (!changed) throw new Failure("报告已更新，请重新打开后核对", 409);
      return out({ review: changed });
    }
    if (body.action === "delete") {
      const report = await reportFor(user, body.request_id);
      if (report.status === "running") throw new Failure("请等待本次分析结束后删除", 409);
      await query(() => db.from(TABLE).delete().eq("request_id", report.request_id).eq("user_id", user));
      return out({ ok: true });
    }
    throw new Failure("不支持的操作");
  } catch (e) {
    const status = e instanceof Failure ? e.status : 503;
    console.error("paper_review_request_failed", JSON.stringify({ request_id: requestId, action, stage, http_status: status, duration_ms: Date.now() - startedAt }));
    return out({ error: e instanceof Failure ? e.message : "试卷分析暂时不可用，请稍后重试", request_id: requestId }, status);
  }
});
