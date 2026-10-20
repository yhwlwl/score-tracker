import { readDatabase } from "../score-tracker-vision-preview/reliability.ts";
import { paperAudit } from "./audit.ts";
import { nextBatch, REVIEW_VERSION, extractionPrompt, normalizeEvidence, diagnosisPrompt, normalizeDiagnoses, verificationPrompt, reconcileEvidence, synthesisPrompt, assembleReport, checkScores } from "./analysis.ts";
import { analysisQueue, fullCredit, needsConfirmation } from "./learner.ts";
import { reviewModel, imageContent } from "./runtime.ts";
import { inventoryPrompt, normalizeInventory, workPrompt, normalizeWork } from "./reading.ts";

const REVIEW_TABLE = "score_tracker_paper_reviews";
export function progressFor(state: any) {
  if (state.flow === "revision") return {
    version: 3, flow: "revision", phase: state.phase, updated_at: new Date().toISOString(),
    phase_started_at: state.phase_started_at, run_started_at: state.run_started_at,
    steps: ["更新相关题目", "更新整体建议"], completed_steps: state.phase === "synthesize" ? 1 : 0,
    current_questions: state.changed_labels, resume_remaining: Math.max(0, 2 - (state.resume_count || 0)),
    message: state.phase === "synthesize" ? "正在更新整体建议" : "正在结合你的补充更新题目分析",
    detail: "根据核对后的文字和回忆调整建议，完成后替换下方上一版分析。"
  };
  const total = state.evidence?.questions?.length || 0, done = state.diagnoses?.length || 0;
  const pending = state.evidence ? analysisQueue(state.evidence).filter((q: any) => !state.diagnoses?.some((d: any) => d.label === q.label)) : [];
  const batch = state.phase === "diagnose" ? nextBatch(pending, 0).slice(0, state.batch_limit || 8) : [];
  const positive = batch.length && batch.every(fullCredit), confirming = batch.length && batch.every(needsConfirmation);
  const split = state.flow === "split_reading";
  return { version: 3, phase: state.phase, completed_questions: done, total_questions: total, updated_at: new Date().toISOString(),
    phase_started_at: state.phase_started_at || new Date().toISOString(), current_questions: state.phase === "verify" && state.verification_batch_limit ? state.evidence.questions.slice(state.verification_readings?.length || 0, (state.verification_readings?.length || 0) + state.verification_batch_limit).map((q: any) => q.label) : batch.map((q: any) => q.label),
    run_started_at: state.run_started_at,
    recognized_questions: total, readable_marks: state.evidence?.questions?.filter((q: any) => q.teacher_score !== null).length || 0,
    strength_questions: state.diagnoses?.filter((d: any) => state.evidence?.questions?.some((q: any) => q.label === d.label && fullCredit(q))).length || 0,
    steps: split ? state.has_work === false ? ["录入试题", "分析题目要求", "综合学习路线"] : ["录入试题", "匹配作答与批改", "独立核对资料", "分析优势和原因", "综合复盘与建议"] : undefined,
    completed_steps: split && state.has_work === false ? (state.phase === "extract" ? 0 : state.phase === "diagnose" ? 1 : 2) : state.phase === "extract" ? 0 : state.phase === "read_work" ? 1 : (state.phase === "verify" ? 1 : ["diagnose", "recheck"].includes(state.phase) ? 2 : 3) + (split ? 1 : 0),
    active_ms: state.active_ms || 0, resume_remaining: Math.max(0, 2 - (state.resume_count || 0)),
    message: state.phase === "extract" ? (split ? "录入题目与印刷分值" : "录入题目、作答与批改分") : state.phase === "read_work" ? (state.work_retry ? "复核批改位置与分数合计" : "匹配作答、批改与成绩信息") : state.phase === "diagnose" ? (positive ? "提炼已得分题目的优势" : confirming ? "整理待核对信息与题目挑战" : "分析失分步骤与可能原因") : state.phase === "verify" ? "独立核对批改位置与填涂" : state.phase === "recheck" ? "复查有歧义的作答" : "综合试卷要求、优势与复习路线",
    detail: state.phase === "extract" ? "保留作答原文；模糊字符和未批改分数会单独标记。" : state.phase === "verify" ? "核对题号与分数的对应关系，避免把相邻题的批改读错。" : state.phase === "diagnose" ? (positive ? "关注已展示的能力与解题亮点。" : confirming ? "作答或批改对应还不明确，先标出需要核对的位置。" : "区分可见错误和当时原因，检查难度、正确前缀与下一步验证。") : "结合已有证据整理结论、待确认的问题与不同原因对应的建议。" };
}

export async function runReviewStage(db: any, input: any, user: string, config: any, row: any, expectedClaim: string, dispatch: (claim: string) => Promise<void>) {
  const original = row.analysis_state || {}, state = structuredClone(original);
  if (!expectedClaim || original.claim !== expectedClaim || row.status !== "running") return;
  // Each token can be claimed once. Duplicate deliveries cannot call the model twice.
  state.claim = crypto.randomUUID();
  state.phase_started_at ||= new Date().toISOString();
  const stageStarted = Date.now(), phaseBefore = state.phase;
  const audit = paperAudit(db, input, user, config, Date.parse(state.run_started_at || row.created_at), row);
  let outcome: any, ownsClaim = false;
  try {
    const claimed = await readDatabase(() => db.from(REVIEW_TABLE).update({ analysis_state: state, progress: progressFor(state) }).eq("request_id", input.request_id).eq("user_id", user).eq("status", "running").eq("analysis_state->>claim", expectedClaim).select("request_id").maybeSingle());
    if (claimed.error) throw claimed.error;
    if (!claimed.data) return;
    ownsClaim = true;
    const stage = state.phase === "diagnose" ? `diagnose_${state.diagnoses?.length || 0}` : state.phase === "recheck" ? `recheck_${state.rechecked || 0}` : state.phase === "verify" && state.verification_batch_limit ? `verify_${state.verification_readings?.length || 0}` : state.phase;
    await audit.mark(stage + "_started");
    let promptText: string, selected: number[] | undefined, validate: (raw: any) => any, batch: any[] = [];
    if (state.phase === "extract") {
      promptText = state.flow === "split_reading" ? inventoryPrompt(input) : extractionPrompt(input, state.extraction_retry ? state.evidence?.score_check?.issues : undefined);
      if (state.flow === "split_reading") selected = input.pages.filter((p: any) => p.role !== "work").map((p: any) => p.page);
      validate = raw => state.flow === "split_reading" ? normalizeInventory(raw, input) : normalizeEvidence(raw, input);
    } else if (state.phase === "read_work") {
      promptText = workPrompt(input, state.evidence, !!state.work_retry);
      selected = input.pages.filter((p: any) => p.role === "work" || input.work_on_paper && p.role === "paper").map((p: any) => p.page);
      validate = raw => normalizeWork(raw, state.evidence, input);
    } else if (state.phase === "diagnose" || state.phase === "recheck") {
      batch = (state.phase === "diagnose" ? nextBatch(analysisQueue(state.evidence).filter((q: any) => !state.diagnoses.some((d: any) => d.label === q.label)), 0) : nextBatch(state.evidence.questions.filter((q: any) => state.recheck_labels.includes(q.label)), state.rechecked || 0)).slice(0, state.batch_limit || 8);
      promptText = diagnosisPrompt(input, state.evidence, batch);
      selected = [...new Set(batch.flatMap((q: any) => [...q.pages, ...q.work_pages, ...q.reference_pages]))] as number[];
      validate = raw => normalizeDiagnoses(raw, batch);
    } else if (state.phase === "verify") {
      const verifying = state.verification_batch_limit ? state.evidence.questions.slice(state.verification_readings?.length || 0, (state.verification_readings?.length || 0) + state.verification_batch_limit) : state.evidence.questions;
      promptText = verificationPrompt(input, { ...state.evidence, questions: verifying });
      selected = input.pages.filter((p: any) => p.role === "work" || input.work_on_paper && p.role === "paper").map((p: any) => p.page);
      validate = raw => {
        if (!state.verification_batch_limit) return reconcileEvidence(raw, state.evidence, input);
        if (!Array.isArray(raw?.questions) || raw.questions.length !== verifying.length || new Set(raw.questions.map((q: any) => q.label)).size !== verifying.length || raw.questions.some((q: any) => !verifying.some((v: any) => v.label === q.label))) throw new Error("独立复核缺少本轮题号");
        return { readings: raw.questions };
      };
    } else if (state.phase === "synthesize") {
      promptText = synthesisPrompt(input, state.evidence, state.diagnoses);
      validate = raw => assembleReport(raw, state.evidence, input, state.diagnoses);
    } else throw new Error("unknown_pipeline_stage");
    const effort = batch.length && (batch.every((q: any) => fullCredit(q) || needsConfirmation(q)) || batch.length === 1 && state.focused_retries?.includes(batch[0].label)) ? "low" : undefined;
    outcome = await reviewModel({ config, content: [{ type: "text", text: promptText }, ...(state.phase === "synthesize" || state.flow === "revision" ? [] : imageContent(input, selected))], requestId: input.request_id, stage, effort, validate, mark: audit.mark });
    const verifyRecovery = state.phase === "verify" && !outcome.ok && /upstream_timeout|model_output_truncated|invalid_model_output/.test(outcome.code);
    if (verifyRecovery) {
      if (!state.verification_batch_limit) state.verification_batch_limit = Math.max(1, Math.min(5, Math.floor(state.evidence.questions.length / 2)));
      else if (state.verification_batch_limit > 1) state.verification_batch_limit = 1;
      else {
        const q = state.evidence.questions[state.verification_readings?.length || 0];
        outcome = { ...outcome, ok: true, result: { readings: [{ label: q.label, kind: "unclear", teacher_score: null, uncertainties: ["此题批改位置未能独立核对，暂不确认分数"] }] } };
      }
      await audit.mark("smaller_verification_recovery");
    }
    const focusRetry = !outcome.ok && /upstream_timeout|model_output_truncated|invalid_model_output/.test(outcome.code) && batch.length === 1 && effort !== "low" && !state.focused_retries?.includes(batch[0].label);
    if (focusRetry) {
      state.focused_retries = [...(state.focused_retries || []), batch[0].label];
      await audit.mark("focused_question_recovery");
    }
    if (state.flow !== "revision" && !focusRetry && !outcome.ok && /upstream_timeout|model_output_truncated|invalid_model_output/.test(outcome.code) && batch.length === 1) {
      const q = batch[0];
      state.evidence.complete = false;
      state.evidence.warnings.push(`第${q.label}题暂未得到可靠解答，保留识别和批改信息，不据此判断失分原因`);
      outcome.partial = true;
      outcome.result = normalizeDiagnoses({ questions: [{ label: q.label, reference: q.provided_reference || "", reference_source: q.provided_reference ? "provided" : "ai", correct_steps: [], first_issue: { certainty: "uncertain" }, loss_reason: "暂未得到可靠诊断，不判断具体失分原因", suggestion: "请补充本题参考答案，或先与老师核对关键条件和作答后再复盘", uncertainties: ["本题解答尚待核验"], review_status: "unresolved" }] }, batch);
      await audit.mark("question_analysis_unresolved");
    }
    if (verifyRecovery && !outcome.ok) { /* Save progress and continue with fewer independent readings. */ }
    else if (focusRetry) { /* Continue the same question once with a shorter, still-thinking pass. */ }
    else if (!outcome.ok && /upstream_timeout|model_output_truncated|invalid_model_output/.test(outcome.code) && batch.length > 1) {
      state.batch_limit = 1;
      await audit.mark("smaller_batch_recovery");
    } else if (!outcome.ok && !outcome.partial) { await audit.finish("failed", outcome); return; }
    else if (state.phase === "extract") {
      state.evidence = outcome.result;
      if (state.flow === "split_reading") { state.phase = input.work_on_paper || input.pages.some((p: any) => p.role === "work") ? "read_work" : "diagnose"; state.diagnoses = []; }
      else if (outcome.result.score_check.status === "conflict" && !state.extraction_retry) state.extraction_retry = 1;
      else { state.phase = input.work_on_paper || input.pages.some((p: any) => p.role === "work") ? "verify" : "diagnose"; state.diagnoses = []; }
    } else if (state.phase === "read_work") {
      state.evidence = outcome.result;
      if (outcome.result.score_check.status === "conflict" && !state.work_retry) state.work_retry = 1;
      else state.phase = "verify";
    } else if (state.phase === "diagnose") {
      state.diagnoses.push(...outcome.result);
      if (state.diagnoses.length >= state.evidence.questions.length) state.phase = !state.verification_done && (input.work_on_paper || input.pages.some((p: any) => p.role === "work")) ? "verify" : "synthesize";
    } else if (state.phase === "verify") {
      if (outcome.result.readings) {
        state.verification_readings = [...(state.verification_readings || []), ...outcome.result.readings];
        if (state.verification_readings.length === state.evidence.questions.length) outcome.result = reconcileEvidence({ questions: state.verification_readings }, state.evidence, input);
      }
      if (!outcome.result.evidence) { /* More independent readings remain. */ }
      else {
      state.evidence = outcome.result.evidence;
      state.verification_done = true;
      state.recheck_labels = outcome.result.changed.filter((label: string) => state.diagnoses.some((d: any) => d.label === label)); state.rechecked = 0;
      state.phase = state.recheck_labels.length ? "recheck" : state.diagnoses.length >= state.evidence.questions.length ? "synthesize" : "diagnose";
      delete state.verification_readings;
      }
    } else if (state.phase === "recheck") {
      for (const d of outcome.result) state.diagnoses[state.diagnoses.findIndex((q: any) => q.label === d.label)] = d;
      state.rechecked += outcome.result.length;
      if (state.rechecked >= state.recheck_labels.length) state.phase = state.diagnoses.length >= state.evidence.questions.length ? "synthesize" : "diagnose";
    } else {
      await audit.mark("result_validated");
      await audit.finish("succeeded", outcome);
      await readDatabase(() => db.from(REVIEW_TABLE).update({ analysis_state: {}, progress: { version: 2, phase: "completed", updated_at: new Date().toISOString(), message: state.flow === "revision" ? "分析已更新" : "报告已完成" } }).eq("request_id", input.request_id).eq("user_id", user).eq("status", "succeeded"));
      return;
    }
    state.claim = crypto.randomUUID();
    state.active_ms = (state.active_ms || 0) + Date.now() - stageStarted;
    if (state.phase !== phaseBefore || state.phase === "diagnose") state.phase_started_at = new Date().toISOString();
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

export function initialState(hasWork = true) { return { version: REVIEW_VERSION, flow: "split_reading", has_work: hasWork, phase: "extract", run_started_at: new Date().toISOString(), phase_started_at: new Date().toISOString(), claim: crypto.randomUUID(), diagnoses: [] }; }

// Text-only revisions retain the original evidence and never claim to reread discarded images.
export const MAX_REPORT_UPDATES = 5;
export function revisionInput(row: any) {
  const report = row.result, stored = report.source_pages;
  const count = Math.max(1, ...report.questions.flatMap((q: any) => [...(q.pages || []), ...(q.work_pages || []), ...(q.reference_pages || [])]));
  const source = stored?.length ? stored : Array.from({ length: count }, (_, i) => ({ page: i + 1, role: report.questions.some((q: any) => q.reference_pages?.includes(i + 1)) ? "reference" : report.questions.some((q: any) => q.work_pages?.includes(i + 1)) && !report.questions.some((q: any) => q.pages?.includes(i + 1)) ? "work" : "paper" }));
  return { request_id: row.request_id, draft_id: row.draft_id, exam_id: row.exam_id, subject: row.subject,
    pages: source.map((p: any) => ({ page: p.page, role: p.role, url: "" })),
    work_on_paper: report.work_on_paper === true || (row.corrections || []).some((c: any) => c.answer || c.teacher_score !== null) || report.questions.some((q: any) => q.answer || q.teacher_score != null),
    original_readings: report.original_readings, exam_context: report.exam_context, text_revision: true, update_count: report.update_count || 0, analysis_revision: row.revision };
}
export function revisionState(report: any, corrections: any[]) {
  const meaningfulReflection = (r: any) => r && (r.cause !== "uncertain" || r.note) ? { cause: r.cause, note: r.note || "", source: "student_recollection" } : null;
  const changed: string[] = [];
  const questions = report.questions.map((q: any) => {
    const c = corrections.find((c: any) => c.id === q.id);
    const fields = ["label", "stem", "pages", "work_pages", "reference_pages", "answer", "status", "confidence", "subparts", "teacher_score", "max_score", "score_mark", "max_mark", "provided_reference", "kind", "score_verification", "answer_verification", "evidence_verified", "score_candidates", "answer_candidates", "student_reflection", "uncertainties"];
    const fact: any = Object.fromEntries(fields.filter(k => q[k] !== undefined).map(k => [k, structuredClone(q[k])]));
    fact.subparts ||= []; fact.pages ||= []; fact.work_pages ||= []; fact.reference_pages ||= []; fact.uncertainties ||= [];
    if (!c) return fact;
    const reflection = meaningfulReflection(c.reflection);
    if (c.answer !== q.answer || c.teacher_score !== q.teacher_score || c.max_score !== q.max_score || JSON.stringify(reflection) !== JSON.stringify(meaningfulReflection(q.student_reflection))) changed.push(q.label);
    if (c.answer !== q.answer) {
      fact.answer = c.answer; fact.status = c.answer ? "answered" : "blank";
      fact.subparts = []; fact.answer_verification = "user_corrected"; delete fact.answer_candidates;
      fact.uncertainties = fact.uncertainties.filter((u: string) => !/填涂|选项读取|作答原文|写法/.test(u));
    }
    if (c.teacher_score !== q.teacher_score) {
      fact.teacher_score = c.teacher_score; fact.score_verification = "user_corrected"; delete fact.score_candidates;
      fact.score_mark = c.teacher_score === null ? null : { page: q.score_mark?.page || q.work_pages?.[0] || q.pages?.[0] || 1, quote: `用户核对：${c.teacher_score}分`, scope: "question", label: q.label, source: "user" };
      fact.uncertainties = fact.uncertainties.filter((u: string) => !/批改分|分数|得分/.test(u));
    }
    fact.max_score = c.max_score; fact.student_reflection = reflection;
    return fact;
  });
  const evidence = { questions, total: report.total || { score: null, max: null }, complete: report.complete, coverage: report.coverage,
    score_groups: report.score_groups || [], context: report.context || [], warnings: [], score_check: checkScores(questions, report.total || { score: null, max: null }, report.complete) };
  return { ...initialState(), flow: "revision", phase: "diagnose", changed_labels: changed, evidence, verification_done: true,
    diagnoses: report.questions.filter((q: any) => !changed.includes(q.label)), exam_context: report.exam_context };
}
