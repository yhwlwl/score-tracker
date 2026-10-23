import { reviewSettings } from "./options.ts";
import { workspaceAction, WorkspaceError, materialFor, storedPages, deleteMaterials } from "./workspace.ts";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { readDatabase } from "../score-tracker-vision-preview/reliability.ts";
import { MAX_BODY, UUID, text, validateStart, normalizeCorrections } from "./model.ts";
import { examContext } from "./learner.ts";
import { paperFailure } from "./audit.ts";
import { runReviewStage, initialState, progressFor, revisionInput, revisionState, MAX_REPORT_UPDATES, canRecoverText, checkpointInput, recoveryInfo } from "./pipeline.ts";

const WORKER_STARTED_AT = Date.now();
const db = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", { auth: { persistSession: false, autoRefreshToken: false } });
const TABLE = "score_tracker_paper_reviews";
const PUBLIC_FIELDS = "request_id,draft_id,exam_id,subject,status,created_at,completed_at,result,corrections,revision,error_message,error_code,error_stage,duration_ms,progress,title,options,pause_requested";
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
  const exam = await query(() => db.from("score_tracker_exams").select("id,exam_date,total_rank,total_participants,total_class_rank,total_class_participants").eq("id", id).eq("user_id", user).maybeSingle());
  if (!exam) throw new Failure("考试不存在或无权访问", 404);
  return exam;
}
async function reportFor(user: string, id: string) {
  if (!UUID.test(id || "")) throw new Failure("报告编号无效");
  let report = await query(() => db.from(TABLE).select(PUBLIC_FIELDS).eq("request_id", id).eq("user_id", user).maybeSingle());
  if (!report) throw new Failure("报告不存在或已删除", 404);
  if (report.status === "running" && Date.now() - Date.parse(report.progress?.updated_at || report.created_at) > 240000) {
    const expired = await query(() => db.from(TABLE).update({ status: "failed", completed_at: new Date().toISOString(),
      error_code: "analysis_incomplete", error_stage: "background",
      error_message: paperFailure("analysis_incomplete") }).eq("request_id", id).eq("user_id", user).eq("status", "running").select("request_id").maybeSingle());
    if (expired) console.error("paper_review_incomplete", JSON.stringify({ request_id: id, code: "analysis_incomplete", stage: "background" }));
    report = await query(() => db.from(TABLE).select(PUBLIC_FIELDS).eq("request_id", id).eq("user_id", user).maybeSingle());
  }
  if (["failed", "paused"].includes(report.status)) {
    const privateRow = await query(() => db.from(TABLE).select("analysis_state,status").eq("request_id", id).eq("user_id", user).maybeSingle());
    report.recovery = recoveryInfo(privateRow || {});
    if (report.status === "paused") { report.input_review = privateRow?.analysis_state?.pause_reason === "review"; report.input_selection = { ...report.options, ...privateRow?.analysis_state?.analysis_selection }; }
    const materials = await materialFor(db, user, id);
    if (materials?.pages?.length) { report.recovery.mode = "saved"; }
  }
  return report;
}
function background(task: Promise<unknown>) { if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(task); return task; }
async function configForReview() {
  const config = await query(() => db.from("score_tracker_paper_settings").select("enabled,api_key,model,base_url").eq("id", "default").single());
  if (!config?.enabled || !config.api_key || !config.model) throw new Failure("试卷分析暂未开放，请稍后再来", 503);
  let url: URL;
  try { url = new URL(config.base_url); } catch { throw new Failure("分析服务配置暂不可用", 503); }
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) throw new Failure("分析服务配置暂不可用", 503);
  return { ...config, stage_deadline: WORKER_STARTED_AT + 140000 };
}
async function fingerprintFor(input: any) { return sha(JSON.stringify({ subject: input.subject, draft: input.draft_id, exam: input.exam_id, work_on_paper: input.work_on_paper, pages: input.pages, ...(input.options ? { options: input.options } : {}), exam_context: examContext(input.exam_context, input.exam_context?.source) })); }
async function dispatchStage(input: any, claim: string) {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(Deno.env.get("SUPABASE_URL") + "/functions/v1/score-tracker-paper-review", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") },
      body: JSON.stringify({ action: "continue", request_id: input.request_id, claim, pages: input.pages, work_on_paper: input.work_on_paper, options: input.options }), signal: controller.signal });
    if (!response.ok) throw new Error("continuation_http_" + response.status);
    await response.body?.cancel();
  } finally { clearTimeout(timer); }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return out({ error: "请求方式不支持" }, 405);
  const startedAt = Date.now();
  let action = "unknown", stage = "read_body", requestId = crypto.randomUUID();
  try {
    const body = await readBody(req);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Failure("请求格式不正确");
    if (body.action === "continue") {
      // Internal delivery only. A user's session can never select another owner or advance a task.
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (!serviceKey || await sha(req.headers.get("authorization") || "") !== await sha("Bearer " + serviceKey)) throw new Failure("无权执行此操作", 401);
      if (!UUID.test(body.request_id || "") || !UUID.test(body.claim || "")) throw new Failure("分析编号无效");
      const row = await query(() => db.from(TABLE).select("*").eq("request_id", body.request_id).maybeSingle());
      if (!row || row.status !== "running" || row.analysis_state?.claim !== body.claim) return out({ accepted: false }, 202);
      const input: any = row.analysis_state.flow === "revision" ? revisionInput(row) : row.analysis_state.text_recovery && canRecoverText(row.analysis_state) ? checkpointInput(row) : validateStart({ ...body, draft_id: row.draft_id, exam_id: row.exam_id, subject: row.subject, consent: true });
      // Use the original attachment scope even if the user saved the exam mid-analysis.
      input.exam_context = row.analysis_state.exam_context; input.options = row.options || row.analysis_state.options ? reviewSettings(row.options || row.analysis_state.options) : undefined;
      const scope = row.analysis_state.original_exam_id;
      if (scope !== undefined) input.exam_id = scope;
      if (row.analysis_state.flow !== "revision" && !input.text_recovery && await fingerprintFor(input) !== row.fingerprint) throw new Failure("分析资料与原请求不一致", 409);
      const config = await configForReview();
      background(runReviewStage(db, input, row.user_id, config, row, body.claim, claim => dispatchStage(input, claim)));
      return out({ accepted: true }, 202);
    }
    action = ["start", "resume", "get", "list", "attach", "correct", "delete", "quota"].includes(body.action) ? body.action : "unknown";
    if (UUID.test(body.request_id || "")) requestId = body.request_id;
    stage = "authentication";
    const user = await userFor(body.token);
    stage = action;
    const workspace = await workspaceAction(db, user, body, ownedExam);
    if (workspace !== undefined) return out(workspace);
    if (body.action === "quota") return out({ quota: await query(() => db.rpc("score_tracker_paper_quota", { p_user_id: user })) });
    if (body.action === "resume") {
      if (!UUID.test(body.request_id || "")) throw new Failure("报告编号无效");
      const row = await query(() => db.from(TABLE).select("*").eq("request_id", body.request_id).eq("user_id", user).maybeSingle());
      if (!row) throw new Failure("报告不存在或无权访问", 404);
      if (row.status === "running") return out({ request_id: row.request_id }, 202);
      const state = row.analysis_state;
      if (!["failed", "paused"].includes(row.status) || !state?.phase || (row.status === "failed" && (state.resume_count || 0) >= 2)) throw new Failure("这份报告无法继续，请重新开始分析", 409);
      if (!canRecoverText(state) && state.flow !== "revision" && !body.pages?.length) { body.pages = await storedPages(db, user, row.request_id); body.consent = true; body.work_on_paper = state.source_input?.work_on_paper; }
      const recoverSaved = canRecoverText(state) && (state.text_recovery || body.mode === "saved" || !body.pages?.length);
      let input: any;
      try { input = state.flow === "revision" ? revisionInput(row) : recoverSaved ? checkpointInput(row) : validateStart({ ...body, draft_id: row.draft_id, exam_id: state.original_exam_id ?? null, subject: row.subject }); }
      catch (e) { throw new Failure((e as Error).message); }
      input.exam_context = state.exam_context; input.options = row.options || state.options ? reviewSettings(row.options || state.options) : undefined;
      if (state.flow !== "revision" && !recoverSaved && await fingerprintFor(input) !== row.fingerprint) throw new Failure("资料与原请求不一致，请使用相同图片和页序", 409);
      const config = await configForReview();
      if (recoverSaved) { state.text_recovery = true; state.source_input ||= { work_on_paper: input.work_on_paper, pages: input.pages.map((p: any) => ({ page: p.page, role: p.role })) }; }
      const oldClaim = state.claim; state.claim = crypto.randomUUID(); state.resume_count = (state.resume_count || 0) + (row.status === "failed" ? 1 : 0); state.budget_start_ms = state.active_ms || 0; state.input_confirmed = state.input_confirmed || state.pause_reason !== "review"; delete state.pause_reason; state.phase_started_at = new Date().toISOString();
      state.run_started_at = state.phase_started_at;
      if (state.phase === "verify" && /upstream_timeout|model_output_truncated/.test(row.error_code || "")) state.verification_batch_limit ||= Math.max(1, Math.min(5, Math.floor(state.evidence.questions.length / 2)));
      if (state.phase === "extract" && !state.evidence) { state.flow = "split_reading"; state.has_work = input.work_on_paper || input.pages.some((p: any) => p.role === "work"); }
      if (!state.verification_done && state.evidence && (input.work_on_paper || input.pages.some((p: any) => p.role === "work"))) state.phase = "verify";
      const resumed = await query(() => db.from(TABLE).update({ status: "running", pause_requested: false, completed_at: null, error_code: null, error_stage: null, error_detail: null, error_message: null, analysis_state: state, progress: progressFor(state) }).eq("request_id", row.request_id).eq("user_id", user).eq("status", row.status).eq("analysis_state->>claim", oldClaim).select("*").maybeSingle());
      if (resumed) background(runReviewStage(db, input, user, config, resumed, state.claim, claim => dispatchStage(input, claim)));
      return out({ request_id: row.request_id }, 202);
    }
    if (body.action === "start") {
      stage = "input_validation";
      let input: any;
      if (body.use_saved === true) { const m = await materialFor(db, user, body.request_id); if (!m) throw new Failure("请先保存资料"); body.pages = await storedPages(db, user, body.request_id); body.subject = m.subject; body.draft_id = m.draft_id; body.exam_id = m.exam_id; body.options = m.options; body.title = m.title; }
      try { input = validateStart(body); } catch (e) { throw new Failure((e as Error).message); }
      input.exam_context = examContext(body.exam_context);
      if (input.exam_id) {
        const owned = await ownedExam(user, input.exam_id);
        const score = await query(() => db.from("score_tracker_scores").select("id,actual_score,max_score,raw_score,raw_max_score,target_score,rank_position,participant_count,class_rank_position,class_participant_count").eq("exam_id", input.exam_id).eq("user_id", user).eq("subject", input.subject).maybeSingle());
        if (!score) throw new Failure("请先保存新增科目，再关联试卷");
        input.exam_context = examContext({ score: score.actual_score, max: score.max_score, raw_score: score.raw_score, raw_max: score.raw_max_score, target: score.target_score,
          year_rank: score.rank_position, year_count: score.participant_count || owned.total_participants, class_rank: score.class_rank_position, class_count: score.class_participant_count || owned.total_class_participants,
          total_year_rank: owned.total_rank, total_year_count: owned.total_participants, total_class_rank: owned.total_class_rank, total_class_count: owned.total_class_participants, exam_date: owned.exam_date }, "saved_exam");
      }
      stage = "configuration";
      const config = await configForReview();
      const fingerprint = await fingerprintFor(input);
      stage = "quota_reservation";
      const reserved = await query(() => db.rpc("score_tracker_paper_reserve", { p_user_id: user, p_request_id: input.request_id, p_draft_id: input.draft_id, p_exam_id: input.exam_id, p_subject: input.subject, p_fingerprint: fingerprint }));
      if (!reserved.allowed) {
        console.log("paper_review_request", JSON.stringify({ request_id: requestId, action, stage, code: reserved.reason, http_status: reserved.reason === "conflict" ? 409 : 429, duration_ms: Date.now() - startedAt }));
        return out({ error: reserved.message, code: reserved.reason, quota: reserved.quota }, reserved.reason === "conflict" ? 409 : 429);
      }
      console.log("paper_review_request", JSON.stringify({ request_id: requestId, action, stage: reserved.created ? "accepted" : "deduplicated", http_status: 202, duration_ms: Date.now() - startedAt }));
      if (reserved.created) {
        const state = { ...initialState(input.work_on_paper || input.pages.some((p: any) => p.role === "work")), original_exam_id: input.exam_id, exam_context: input.exam_context, options: input.options, source_input: { work_on_paper: input.work_on_paper, pages: input.pages.map((p: any) => ({ page: p.page, role: p.role })) } };
        const row = await query(() => db.from(TABLE).update({ analysis_state: state, progress: progressFor(state), options: input.options, title: text(body.title, 100) }).eq("request_id", input.request_id).eq("user_id", user).eq("status", "running").select("*").single());
        if (body.use_saved) await query(() => db.from("score_tracker_paper_materials").update({ submitted: true }).eq("request_id", input.request_id).eq("user_id", user));
        const task = background(runReviewStage(db, input, user, config, row, state.claim, claim => dispatchStage(input, claim)));
        if (typeof EdgeRuntime === "undefined") await task;
      }
      return out({ request_id: input.request_id, quota: reserved.quota }, 202);
    }
    if (body.action === "get") return out({ review: await reportFor(user, body.request_id) });
    if (body.action === "list") {
      if (!UUID.test(body.draft_id || "")) throw new Failure("草稿编号无效");
      if (body.exam_id) await ownedExam(user, body.exam_id);
      const subject = text(body.subject, 40);
      // Unattached reports belong to the account, not to one browser's local draft ID.
      const scope = body.exam_id ? `exam_id.eq.${body.exam_id},exam_id.is.null` : "exam_id.is.null";
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
      if (!report.result || report.status === "running") throw new Failure("请等待分析完成", 409);
      if (body.revision !== report.revision) throw new Failure("报告已更新，请重新打开后核对", 409);
      let corrections: any;
      try {
        const incoming = normalizeCorrections(body.corrections, report.result);
        corrections = [...(report.corrections || []).filter((c: any) => !incoming.some((v: any) => v.id === c.id)), ...incoming];
      } catch (e) { throw new Failure((e as Error).message); }
      const state = revisionState(report.result, corrections);
      const reanalyse = body.reanalyze === true && state.changed_labels.length > 0;
      const count = report.result.update_count || 0;
      if (reanalyse && count >= MAX_REPORT_UPDATES) throw new Failure("本报告的5次分析更新已用完，可继续保存核对记录", 409);
      const config = reanalyse ? await configForReview() : null;
      const patch: any = { corrections, revision: report.revision + 1,
        result: { ...report.result, analysis_stale: state.changed_labels.length > 0, update_count: count + (reanalyse ? 1 : 0) } };
      if (report.result.record_only) {
        patch.result.questions = report.result.questions.map((q: any) => ({ ...q, ...state.evidence.questions.find((f: any) => f.label === q.label) }));
        patch.result.score_check = state.evidence.score_check;
        patch.result.analysis_stale = false;
      }
      if (!reanalyse && report.status === "failed") Object.assign(patch, { status: "succeeded", analysis_state: {}, error_message: null, error_code: null, error_stage: null, progress: { phase: "completed", message: "核对已保存" } });
      if (reanalyse) patch.result.original_readings = report.result.original_readings || report.result.questions.map((q: any) => ({ label: q.label, answer: q.answer, subparts: q.subparts || [], teacher_score: q.teacher_score, max_score: q.max_score, score_mark: q.score_mark || null }));
      if (reanalyse) Object.assign(patch, { status: "running", completed_at: null, error_message: null, error_code: null, error_stage: null, error_detail: null, analysis_state: state, progress: progressFor(state) });
      const changed = await query(() => db.from(TABLE).update(patch).eq("request_id", report.request_id).eq("user_id", user).eq("revision", report.revision).eq("status", report.status).select("*").maybeSingle());
      if (!changed) throw new Failure("报告已更新，请重新打开后核对", 409);
      if (reanalyse) {
        const input = revisionInput(changed);
        background(runReviewStage(db, input, user, config, changed, state.claim, claim => dispatchStage(input, claim)));
      }
      return out({ review: Object.fromEntries(PUBLIC_FIELDS.split(",").filter(k => k in changed).map(k => [k, changed[k]])) }, reanalyse ? 202 : 200);
    }

    if (body.action === "delete") {
      const report = await reportFor(user, body.request_id);
      if (report.status === "running") throw new Failure("请等待本次分析结束后删除", 409);
      await deleteMaterials(db, user, report.request_id);
      await query(() => db.from(TABLE).delete().eq("request_id", report.request_id).eq("user_id", user));
      return out({ ok: true });
    }
    throw new Failure("不支持的操作");
  } catch (e) {
    const status = (e instanceof Failure || e instanceof WorkspaceError) ? e.status : 503;
    console.error("paper_review_request_failed", JSON.stringify({ request_id: requestId, action, stage, http_status: status, duration_ms: Date.now() - startedAt }));
    return out({ error: (e instanceof Failure || e instanceof WorkspaceError) ? e.message : "试卷分析暂时不可用，请稍后重试", request_id: requestId }, status);
  }
});
