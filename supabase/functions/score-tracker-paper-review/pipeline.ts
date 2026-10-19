import { readDatabase } from "../score-tracker-vision-preview/reliability.ts";
import { paperAudit } from "./audit.ts";
import { nextBatch, REVIEW_VERSION, extractionPrompt, normalizeEvidence, diagnosisPrompt, normalizeDiagnoses, verificationPrompt, reconcileEvidence, synthesisPrompt, assembleReport } from "./analysis.ts";
import { reviewModel, imageContent } from "./runtime.ts";

const REVIEW_TABLE = "score_tracker_paper_reviews";
export function progressFor(state: any) {
  const total = state.evidence?.questions?.length || 0, done = state.diagnoses?.length || 0;
  return { version: 2, phase: state.phase, completed_questions: done, total_questions: total, updated_at: new Date().toISOString(),
    resume_remaining: Math.max(0, 2 - (state.resume_count || 0)),
    message: state.phase === "extract" ? (state.extraction_retry ? "正在复核批改数字与分数合计" : "正在核对题目、作答和批改分") : state.phase === "diagnose" ? `正在逐题推导与定位卡点（${done}/${total}）` : state.phase === "verify" ? "正在独立核对批改位置与填涂" : state.phase === "recheck" ? "正在复查有歧义的作答" : "正在复核解答与安排复习" };
}

export async function runReviewStage(db: any, input: any, user: string, config: any, row: any, expectedClaim: string, dispatch: (claim: string) => Promise<void>) {
  const original = row.analysis_state || {}, state = structuredClone(original);
  if (!expectedClaim || original.claim !== expectedClaim || row.status !== "running") return;
  // Each token can be claimed once. Duplicate deliveries cannot call the model twice.
  state.claim = crypto.randomUUID();
  const audit = paperAudit(db, input, user, config, Date.parse(row.created_at), row);
  let outcome: any, ownsClaim = false;
  try {
    const claimed = await readDatabase(() => db.from(REVIEW_TABLE).update({ analysis_state: state, progress: progressFor(state) }).eq("request_id", input.request_id).eq("user_id", user).eq("status", "running").eq("analysis_state->>claim", expectedClaim).select("request_id").maybeSingle());
    if (claimed.error) throw claimed.error;
    if (!claimed.data) return;
    ownsClaim = true;
    const stage = state.phase === "diagnose" ? `diagnose_${state.diagnoses?.length || 0}` : state.phase === "recheck" ? `recheck_${state.rechecked || 0}` : state.phase;
    await audit.mark(stage + "_started");
    let promptText: string, selected: number[] | undefined, validate: (raw: any) => any, batch: any[] = [];
    if (state.phase === "extract") {
      promptText = extractionPrompt(input, state.extraction_retry ? state.evidence?.score_check?.issues : undefined);
      validate = raw => normalizeEvidence(raw, input);
    } else if (state.phase === "diagnose" || state.phase === "recheck") {
      batch = (state.phase === "diagnose" ? nextBatch(state.evidence.questions, state.diagnoses.length) : nextBatch(state.evidence.questions.filter((q: any) => state.recheck_labels.includes(q.label)), state.rechecked || 0)).slice(0, state.batch_limit || 4);
      promptText = diagnosisPrompt(input, state.evidence, batch);
      selected = [...new Set(batch.flatMap((q: any) => [...q.pages, ...q.work_pages, ...q.reference_pages]))] as number[];
      validate = raw => normalizeDiagnoses(raw, batch);
    } else if (state.phase === "verify") {
      promptText = verificationPrompt(input, state.evidence);
      selected = input.pages.filter((p: any) => p.role === "work" || input.work_on_paper && p.role === "paper").map((p: any) => p.page);
      validate = raw => reconcileEvidence(raw, state.evidence, input);
    } else if (state.phase === "synthesize") {
      promptText = synthesisPrompt(input, state.evidence, state.diagnoses);
      validate = raw => assembleReport(raw, state.evidence, input, state.diagnoses);
    } else throw new Error("unknown_pipeline_stage");
    const effort = batch.length && batch.every((q: any) => q.teacher_score !== null && q.max_score !== null && q.teacher_score === q.max_score) ? "low" : undefined;
    outcome = await reviewModel({ config, content: [{ type: "text", text: promptText }, ...imageContent(input, selected)], requestId: input.request_id, stage, effort, validate, mark: audit.mark });
    if (!outcome.ok && /upstream_timeout|model_output_truncated/.test(outcome.code) && batch.length === 1) {
      const q = batch[0];
      state.evidence.complete = false;
      state.evidence.warnings.push(`第${q.label}题暂未得到可靠解答，保留识别和批改信息，不据此判断失分原因`);
      outcome.partial = true;
      outcome.result = normalizeDiagnoses({ questions: [{ label: q.label, reference: q.provided_reference || "", reference_source: q.provided_reference ? "provided" : "ai", correct_steps: [], first_issue: { certainty: "uncertain" }, loss_reason: "暂未得到可靠诊断，不判断具体失分原因", suggestion: "请补充本题参考答案，或先与老师核对关键条件和作答后再复盘", uncertainties: ["本题解答尚待核验"], review_status: "unresolved" }] }, batch);
      await audit.mark("question_analysis_unresolved");
    }
    if (!outcome.ok && /upstream_timeout|model_output_truncated/.test(outcome.code) && batch.length > 1) {
      state.batch_limit = 1;
      await audit.mark("smaller_batch_recovery");
    } else if (!outcome.ok && !outcome.partial) { await audit.finish("failed", outcome); return; }
    else if (state.phase === "extract") {
      state.evidence = outcome.result;
      if (outcome.result.score_check.status === "conflict" && !state.extraction_retry) state.extraction_retry = 1;
      else { state.phase = input.work_on_paper || input.pages.some((p: any) => p.role === "work") ? "verify" : "diagnose"; state.diagnoses = []; }
    } else if (state.phase === "diagnose") {
      state.diagnoses.push(...outcome.result);
      if (state.diagnoses.length >= state.evidence.questions.length) state.phase = !state.verification_done && (input.work_on_paper || input.pages.some((p: any) => p.role === "work")) ? "verify" : "synthesize";
    } else if (state.phase === "verify") {
      state.evidence = outcome.result.evidence;
      state.verification_done = true;
      state.recheck_labels = outcome.result.changed.filter((label: string) => state.diagnoses.some((d: any) => d.label === label)); state.rechecked = 0;
      state.phase = state.recheck_labels.length ? "recheck" : state.diagnoses.length >= state.evidence.questions.length ? "synthesize" : "diagnose";
    } else if (state.phase === "recheck") {
      for (const d of outcome.result) state.diagnoses[state.diagnoses.findIndex((q: any) => q.label === d.label)] = d;
      state.rechecked += outcome.result.length;
      if (state.rechecked >= state.recheck_labels.length) state.phase = state.diagnoses.length >= state.evidence.questions.length ? "synthesize" : "diagnose";
    } else {
      await audit.mark("result_validated");
      await audit.finish("succeeded", outcome);
      await readDatabase(() => db.from(REVIEW_TABLE).update({ analysis_state: {}, progress: { version: 2, phase: "completed", updated_at: new Date().toISOString(), message: "报告已完成" } }).eq("request_id", input.request_id).eq("user_id", user).eq("status", "succeeded"));
      return;
    }
    state.claim = crypto.randomUUID();
    await audit.mark(stage + "_completed");
    const saved = await readDatabase(() => db.from(REVIEW_TABLE).update({ analysis_state: state, progress: progressFor(state) }).eq("request_id", input.request_id).eq("user_id", user).eq("status", "running").select("request_id").maybeSingle());
    if (saved.error) throw saved.error;
    if (saved.data) await dispatch(state.claim);
  } catch (e) {
    console.error("paper_review_stage_failed", JSON.stringify({ request_id: input.request_id, phase: original.phase, code: ownsClaim ? "stage_error" : "claim_failed" }));
    const current = await readDatabase(() => db.from(REVIEW_TABLE).select("analysis_state,status").eq("request_id", input.request_id).eq("user_id", user).maybeSingle());
    // A missing acknowledgement must not mark an already-started successor failed.
    if (current.data?.status !== "running" || current.data?.analysis_state?.claim !== (ownsClaim ? state.claim : expectedClaim)) return;
    try { await audit.finish("failed", { code: original.phase === "synthesize" && outcome?.ok ? "result_save_failed" : "paper_handler_error", stage: original.phase === "synthesize" && outcome?.ok ? "result_save" : "pipeline_" + original.phase, detail: (e as Error).message, raw_output: outcome?.raw_output }); }
    catch (_) { /* audit.finish already emitted a structured write failure. */ }
  }
}

export function initialState() { return { version: REVIEW_VERSION, phase: "extract", claim: crypto.randomUUID(), diagnoses: [] }; }
