import { reviewSettings } from "./options.ts";
import { readDatabase } from "../score-tracker-vision-preview/reliability.ts";
import { paperAudit } from "./audit.ts";
import { nextBatch, REVIEW_VERSION, extractionPrompt, normalizeEvidence, diagnosisPrompt, normalizeDiagnoses, verificationPrompt, reconcileEvidence, synthesisPrompt, assembleReport, checkScores } from "./analysis.ts";
import { analysisQueue, fullCredit, answerCorrect, needsConfirmation } from "./learner.ts";
import { reviewModel, imageContent } from "./runtime.ts";
import { inventoryPrompt, normalizeInventory, workPrompt, normalizeWork, scoreTargets, scoreReadViews, scoreViewContent, scoreReadingPrompt, mergeScoreReading } from "./reading.ts";
import { gradingTargets, gradingPrompt, mergeGrading, gradingChecks } from './grading.ts';

const REVIEW_TABLE = "score_tracker_paper_reviews";
export function progressFor(state: any) {
  if (state.phase === 'grade') return { version: 3, phase: 'grade', updated_at: new Date().toISOString(), active_ms: state.active_ms || 0,
    steps: ['核对作答与答案', '独立复核AI判分', '更新报告'], completed_steps: state.grading_round ? 1 : 0,
    message: `核对答案并判分（第${(state.grading_round || 0) + 1}轮）`, detail: '有答案先核对；没有答案独立求解。AI判分与老师批改分分开，不自动改考试成绩。' };
  if (state.flow === "score_refresh") return { version: 3, phase: state.phase, updated_at: new Date().toISOString(),
    steps: ["重新读取分数与满分", "更新报告与历史对照"], completed_steps: state.phase === "synthesize" ? 1 : 0,
    message: state.phase === "read_scores" ? `重新核对分数（第${(state.score_read_round || 0) + 1}轮，第${(state.score_read_view || 0) + 1}块）` : "更新总览和学习建议",
    detail: "补读分数并核对答案，保留手动核对内容；若修正作答转录，会更新受影响的讲解。", active_ms: state.active_ms || 0 };
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
    completed_steps: split && state.has_work === false ? (state.phase === "extract" ? 0 : state.phase === "diagnose" ? 1 : 2) : state.phase === "extract" ? 0 : state.phase === "read_work" ? 1 : (["verify", "read_scores"].includes(state.phase) ? 1 : ["diagnose", "recheck"].includes(state.phase) ? 2 : 3) + (split ? 1 : 0),
    active_ms: state.active_ms || 0, resume_remaining: Math.max(0, 2 - (state.resume_count || 0)),
    message: state.phase === "extract" ? (split ? "录入题目与印刷分值" : "录入题目、作答与批改分") : state.phase === "read_work" ? (state.work_retry ? "复核批改位置与分数合计" : "匹配作答、批改与成绩信息") : state.phase === "read_scores" ? `补读缺失的得分与满分（第${(state.score_read_round || 0) + 1}轮）` : state.phase === "diagnose" ? (positive ? "提炼已得分题目的优势" : confirming ? "整理待核对信息与题目挑战" : "分析失分步骤与可能原因") : state.phase === "verify" ? "独立核对批改位置与填涂" : state.phase === "recheck" ? "复查有歧义的作答" : "综合试卷要求、优势与复习路线",
    detail: state.phase === "extract" ? "保留作答原文；模糊字符和未批改分数会单独标记。" : state.phase === "verify" ? "核对题号与分数的对应关系，避免把相邻题的批改读错。" : state.phase === "diagnose" ? (positive ? "关注已展示的能力与解题亮点。" : confirming ? "作答或批改对应还不明确，先标出需要核对的位置。" : "区分可见错误和当时原因，找出已写对的步骤、关键问题和下一步改法。") : "结合已有证据整理结论、待确认的问题与不同原因对应的建议。" };
}

export async function runReviewStage(db: any, input: any, user: string, config: any, row: any, expectedClaim: string, dispatch: (claim: string) => Promise<void>) {
  const original = row.analysis_state || {}, state = structuredClone(original);
  input.options = reviewSettings(input.options || row.options || state.options);
  input.account_context ??= state.account_context;
  if (state.flow === "score_refresh") {
    input.score_refresh_count = (state.previous_result?.score_refresh_count || 0) + 1;
    input.update_count = state.previous_result?.update_count || 0;
    input.analysis_revision = row.revision;
  }
  if (state.analysis_selection && (input.options as any).config_version === 2) input.options = reviewSettings({ ...input.options, ...state.analysis_selection });
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
    const settings = reviewSettings(input.options);
    const pauseReason = row.pause_requested ? "manual" : state.phase === "diagnose" && (settings.review_before_analysis || (settings as any).analysis_scope === "selected") && !state.input_confirmed ? "review" : (state.active_ms || 0) - (state.budget_start_ms || 0) >= settings.time_budget_minutes * 60000 ? "budget" : null;
    if (pauseReason) {
      state.pause_reason = pauseReason;
      await readDatabase(() => db.from(REVIEW_TABLE).update({ status: "paused", pause_requested: false, analysis_state: state, progress: { ...progressFor(state), message: pauseReason === "review" ? "资料已录入，等待核对" : "已保存进度，可随时继续" } }).eq("request_id", input.request_id).eq("user_id", user).eq("status", "running").eq("analysis_state->>claim", state.claim));
      return;
    }
    if (state.phase === "diagnose" && (settings.purpose === "record" || !(settings as any).config_version && !settings.modules.length)) {
      const result = assembleReport({ overview: "题目、作答与批改已录入。可展开逐题核对文字和对应扫描件。", warnings: [] }, state.evidence, { ...input, options: { ...settings, purpose: "record" } }, state.evidence.questions.map((q: any) => ({ label: q.label })));
      await audit.finish("succeeded", { ok: true, result });
      await readDatabase(() => db.from(REVIEW_TABLE).update({ analysis_state: {}, progress: { phase: "completed", message: "录入完成" } }).eq("request_id", input.request_id).eq("user_id", user).eq("status", "succeeded"));
      return;
    }
    if (state.phase === 'synthesize' && !state.grading_complete && settings.purpose !== 'record' && state.has_work !== false) {
      const candidates = gradingTargets(state.evidence);
      if (candidates.length) { state.phase = 'grade'; state.grading_targets = candidates.map((q: any) => q.label); state.grading_done = []; }
      else state.grading_complete = true;
    }
    const stage = state.phase === 'grade' ? `grade_${state.grading_round || 0}_${state.grading_done?.length || 0}_${state.grading_view || 0}` : state.phase === "diagnose" ? `diagnose_${state.diagnoses?.length || 0}` : state.phase === "recheck" ? `recheck_${state.rechecked || 0}` : state.phase === "read_scores" ? `read_scores_${state.score_read_round || 0}_${state.score_read_done?.length || 0}_${state.score_read_view || 0}` : state.phase === "verify" && state.verification_batch_limit ? `verify_${state.verification_readings?.length || 0}` : state.phase;
    await audit.mark(stage + "_started");
    let promptText: string, selected: number[] | undefined, validate: (raw: any) => any, batch: any[] = [], scoreLabels: string[] = [], gradeLabels: string[] = [], gradeImage = false;
    if (state.phase === 'grade') {
      gradeLabels = state.grading_batch || state.grading_targets.filter((l: string) => !(state.grading_done || []).includes(l)).slice(0, 3);
      state.grading_batch = gradeLabels;
      const questions = state.evidence.questions.filter((q: any) => gradeLabels.includes(q.label));
      if (!state.grading_views) { state.grading_uses_images = input.pages.some((p: any) => p.url); state.grading_views = state.grading_uses_images ? scoreReadViews(input, state.evidence, gradeLabels) : [{ text_only: true }]; }
      gradeImage = !state.grading_views[state.grading_view || 0].text_only;
      promptText = gradingPrompt(input, questions, gradeImage);
      validate = raw => mergeGrading(raw, state.evidence, gradeLabels, state.grading_readings, gradeImage);
    } else if (state.phase === "extract") {
      promptText = state.flow === "split_reading" ? inventoryPrompt(input) : extractionPrompt(input, state.extraction_retry ? state.evidence?.score_check?.issues : undefined);
      if (state.flow === "split_reading") selected = input.pages.filter((p: any) => p.role !== "work").map((p: any) => p.page);
      validate = raw => state.flow === "split_reading" ? normalizeInventory(raw, input) : normalizeEvidence(raw, input);
    } else if (state.phase === "read_work") {
      promptText = workPrompt(input, state.evidence, !!state.work_retry);
      selected = input.pages.filter((p: any) => p.role === "work" || input.work_on_paper && p.role === "paper").map((p: any) => p.page);
      validate = raw => normalizeWork(raw, state.evidence, input);
    } else if (state.phase === "read_scores") {
      scoreLabels = state.score_batch_labels || (state.score_read_targets || scoreTargets(state.evidence, state.has_work !== false)).filter((l: string) => !(state.score_read_done || []).includes(l)).slice(0, state.score_batch_limit || 6);
      state.score_batch_labels = scoreLabels;
      state.score_views ||= scoreReadViews(input, state.evidence, scoreLabels, state.score_read_round || 0);
      promptText = scoreReadingPrompt(input, state.evidence, scoreLabels, !!state.score_read_round);
      validate = raw => mergeScoreReading(raw, state.evidence, input, scoreLabels);
    } else if (state.phase === "diagnose" || state.phase === "recheck") {
      batch = (state.phase === "diagnose" ? nextBatch(analysisQueue(state.evidence).filter((q: any) => !state.diagnoses.some((d: any) => d.label === q.label)), 0) : nextBatch(state.evidence.questions.filter((q: any) => state.recheck_labels.includes(q.label)), state.rechecked || 0)).slice(0, state.batch_limit || 8);
      promptText = diagnosisPrompt(state.grading_text_recheck ? { ...input, answer_reread: true } : input, state.evidence, batch);
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
    const effort = state.phase === 'grade' ? state.evidence.questions.filter((q: any) => gradeLabels.includes(q.label)).some((q: any) => !q.provided_reference) ? 'high' : 'low' : batch.length && (batch.every((q: any) => fullCredit(q) || answerCorrect(q) || needsConfirmation(q)) || batch.length === 1 && state.focused_retries?.includes(batch[0].label)) ? "low" : undefined;
    outcome = await reviewModel({ config, content: [{ type: "text", text: promptText }, ...(state.phase === 'grade' ? gradeImage ? scoreViewContent(input, state.grading_views[state.grading_view || 0]) : [] : state.phase === 'read_scores' ? scoreViewContent(input, state.score_views[state.score_read_view || 0]) : state.phase === "synthesize" || (state.phase === 'recheck' && state.grading_text_recheck) || (state.flow === "revision" || state.text_recovery) ? [] : imageContent(input, selected))], requestId: input.request_id, stage, effort, repairOutput: state.pending_repair?.stage === stage ? state.pending_repair.text : undefined, validate, mark: audit.mark });
    if (state.phase === 'grade' && !outcome.ok && /upstream_timeout|model_output_truncated|invalid_model_output/.test(outcome.code)) {
      // A failed answer check must not erase the original report or invent a mark.
      outcome = { ...outcome, ok: true, result: { evidence: state.evidence, readings: state.grading_readings || {}, changed: [] } };
      await audit.mark('grading_view_unresolved');
    }
    const handoff = !outcome.ok && outcome.code === "worker_deadline" && (state.deadline_handoffs || 0) < 3;
    if (handoff) {
      state.deadline_handoffs = (state.deadline_handoffs || 0) + 1;
      if (outcome.raw_output && /invalid_model_output|JSON|property|token/i.test(outcome.detail || "")) state.pending_repair = { stage, text: outcome.raw_output };
      await audit.mark("worker_deadline_checkpoint");
    }
    const verifyRecovery = state.phase === "verify" && !outcome.ok && /upstream_timeout|model_output_truncated|invalid_model_output/.test(outcome.code);
    const scoreRecovery = state.phase === "read_scores" && !outcome.ok && /upstream_timeout|model_output_truncated|invalid_model_output/.test(outcome.code);
    if (scoreRecovery) {
      delete state.pending_repair;
      if (!state.score_batch_limit) { state.score_batch_limit = 3; delete state.score_batch_labels; }
      else if (state.score_batch_limit > 1) { state.score_batch_limit = 1; delete state.score_batch_labels; }
      else outcome = { ...outcome, ok: true, result: { evidence: state.evidence, changed: [] } };
      await audit.mark("smaller_score_reading_recovery");
    }
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
    if (handoff) { /* Persist before the instance expires, then continue with another delivery. */ }
    else if (scoreRecovery && !outcome.ok) { /* Retry only this unread score batch at a smaller size. */ }
    else if (verifyRecovery && !outcome.ok) { /* Save progress and continue with fewer independent readings. */ }
    else if (focusRetry) { /* Continue the same question once with a shorter, still-thinking pass. */ }
    else if (!outcome.ok && /upstream_timeout|model_output_truncated|invalid_model_output/.test(outcome.code) && batch.length > 1) {
      state.batch_limit = 1;
      delete state.pending_repair; // A whole-batch repair cannot be reused for the first individual question.
      await audit.mark("smaller_batch_recovery");
    } else if (!outcome.ok && !outcome.partial) { await audit.finish("failed", outcome); return; }
    else if (state.phase === 'grade') {
      state.evidence = outcome.result.evidence; state.grading_readings = outcome.result.readings;
      state.grading_changed = [...new Set([...(state.grading_changed || []), ...outcome.result.changed])];
      state.grading_view = (state.grading_view || 0) + 1;
      const confirmed = gradeLabels.every(l => state.evidence.questions.find((q: any) => q.label === l)?.ai_grading?.status === 'confirmed');
      if (confirmed || state.grading_view >= state.grading_views.length) {
        state.grading_done = [...(state.grading_done || []), ...gradeLabels]; delete state.grading_batch; delete state.grading_views; state.grading_view = 0;
        if (state.grading_targets.every((l: string) => state.grading_done.includes(l))) {
          let remaining = gradingTargets(state.evidence);
          const conflicts = gradingChecks(state.evidence.questions, state.evidence.score_groups).filter((g: any) => g.status === 'conflict');
          if (conflicts.length && !state.grading_group_retry && (state.grading_round || 0) < 2) {
            state.grading_group_retry = true;
            for (const q of state.evidence.questions) if (q.teacher_score === null && q.ai_grading?.status === 'confirmed' && conflicts.some((g: any) => g.questions.includes(q.label))) q.ai_grading.status = 'group_recheck';
            remaining = gradingTargets(state.evidence);
          }
          if (remaining.length && (state.grading_round || 0) < 2) { state.grading_round = (state.grading_round || 0) + 1; state.grading_targets = remaining.map((q: any) => q.label); state.grading_done = []; }
          else {
            state.grading_complete = true;
            state.recheck_labels = (state.grading_changed || []).filter((l: string) => state.diagnoses.some((q: any) => q.label === l)); state.rechecked = 0;
            state.grading_text_recheck = true; state.phase = state.recheck_labels.length ? 'recheck' : 'synthesize';
          }
        }
      }
    } else if (state.phase === "extract") {
      state.evidence = outcome.result;
      if (state.flow === "split_reading") { state.phase = input.work_on_paper || input.pages.some((p: any) => p.role === "work") ? "read_work" : "diagnose"; state.diagnoses = []; }
      else if (outcome.result.score_check.status === "conflict" && !state.extraction_retry) state.extraction_retry = 1;
      else { state.phase = input.work_on_paper || input.pages.some((p: any) => p.role === "work") ? "verify" : "diagnose"; state.diagnoses = []; }
    } else if (state.phase === "read_work") {
      state.evidence = outcome.result;
      if (outcome.result.score_check.status === "conflict" && !state.work_retry) state.work_retry = 1;
      else state.phase = "verify";
    } else if (state.phase === "read_scores") {
      state.evidence = outcome.result.evidence;
      state.score_changed = [...new Set([...(state.score_changed || []), ...outcome.result.changed])];
      state.score_read_view = (state.score_read_view || 0) + 1;
      if (state.score_read_view < state.score_views.length) { /* Read one image per delivery, preserving every successful view. */ }
      else {
      state.score_read_done = [...(state.score_read_done || []), ...scoreLabels];
      delete state.score_views; delete state.score_batch_labels; state.score_read_view = 0;
      const pending = (state.score_read_targets || []).filter((l: string) => !state.score_read_done.includes(l));
      if (!pending.length) {
        const missing = scoreTargets(state.evidence, state.has_work !== false);
        if (missing.length && (state.score_read_round || 0) < 2) { state.score_read_round = (state.score_read_round || 0) + 1; state.score_read_done = []; state.score_read_targets = missing; }
        else {
          for (const q of state.evidence.questions) if (q.max_verification === 'single_read') {
            q.max_candidates = [q.max_score]; q.max_score = null; q.max_mark = null; q.max_verification = 'unconfirmed';
            q.uncertainties.push('满分尚未得到独立复核，请核对本题题头分值');
          }
          state.score_read_complete = true;
          state.recheck_labels = (state.score_changed || []).filter((l: string) => state.diagnoses.some((q: any) => q.label === l)); state.rechecked = 0;
          state.phase = state.flow === "score_refresh" ? "synthesize" : state.recheck_labels.length ? "recheck" : state.diagnoses.length >= state.evidence.questions.length ? "synthesize" : "diagnose";
        }
      }
      }
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
      const missingScores = scoreTargets(state.evidence, state.has_work !== false);
      if (!state.score_read_complete && missingScores.length) { state.phase = "read_scores"; state.score_read_targets = missingScores; state.score_read_done = []; }
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
    if (outcome.ok || outcome.partial) { delete state.pending_repair; delete state.deadline_handoffs; }
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
export function scoreRefreshState(row: any, input: any) {
  const state: any = revisionState(row.result, row.corrections || []);
  const hasWork = input.work_on_paper || input.pages.some((p: any) => p.role === 'work'), targets = scoreTargets(state.evidence, hasWork);
  return { ...state, flow: "score_refresh", phase: "read_scores", has_work: hasWork, input_confirmed: true,
    original_exam_id: row.exam_id, options: input.options, exam_context: input.exam_context, account_context: input.account_context,
    source_input: { work_on_paper: input.work_on_paper, pages: input.pages.map((p: any) => ({ page: p.page, role: p.role })) },
    diagnoses: row.result.questions, score_read_targets: targets.length ? targets : state.evidence.questions.map((q: any) => q.label), score_read_done: [],
    previous_result: row.result, update_count: row.result.update_count || 0 };
}
export function revisionInput(row: any) {
  const report = row.result, stored = report.source_pages;
  const count = Math.max(1, ...report.questions.flatMap((q: any) => [...(q.pages || []), ...(q.work_pages || []), ...(q.reference_pages || [])]));
  const source = stored?.length ? stored : Array.from({ length: count }, (_, i) => ({ page: i + 1, role: report.questions.some((q: any) => q.reference_pages?.includes(i + 1)) ? "reference" : report.questions.some((q: any) => q.work_pages?.includes(i + 1)) && !report.questions.some((q: any) => q.pages?.includes(i + 1)) ? "work" : "paper" }));
  return { request_id: row.request_id, draft_id: row.draft_id, exam_id: row.exam_id, subject: row.subject,
    pages: source.map((p: any) => ({ page: p.page, role: p.role, url: "" })),
    work_on_paper: report.work_on_paper === true || (row.corrections || []).some((c: any) => c.answer || c.teacher_score !== null) || report.questions.some((q: any) => q.answer || q.teacher_score != null),
    options: reviewSettings(row.options || report.options), original_readings: report.original_readings, exam_context: report.exam_context, account_context: report.account_context,
    score_refresh_count: report.score_refresh_count || 0, text_revision: true, update_count: report.update_count || 0, analysis_revision: row.revision };
}
export function revisionState(report: any, corrections: any[]) {
  const meaningfulReflection = (r: any) => r && (r.cause !== "uncertain" || r.note) ? { cause: r.cause, note: r.note || "", source: "student_recollection" } : null;
  const changed: string[] = [];
  const questions = report.questions.map((q: any) => {
    const c = corrections.find((c: any) => c.id === q.id);
    const fields = ["label", "stem", "source_regions", "pages", "work_pages", "reference_pages", "answer", "status", "confidence", "subparts", "teacher_score", "max_score", "score_mark", "max_mark", "max_verification", "max_candidates", "provided_reference", "kind", "score_verification", "answer_verification", "evidence_verified", "score_candidates", "answer_candidates", "student_reflection", "uncertainties", "ai_grading"];
    const fact: any = Object.fromEntries(fields.filter(k => q[k] !== undefined).map(k => [k, structuredClone(q[k])]));
    fact.subparts ||= []; fact.pages ||= []; fact.work_pages ||= []; fact.reference_pages ||= []; fact.uncertainties ||= [];
    if (!c) return fact;
    if (c.verified) fact.answer_verification = 'user_corrected';
    const reflection = meaningfulReflection(c.reflection);
    if (c.stem) fact.stem = c.stem;
    if ((c.stem !== undefined && c.stem !== q.stem) || c.answer !== q.answer || c.teacher_score !== q.teacher_score || c.max_score !== q.max_score || JSON.stringify(reflection) !== JSON.stringify(meaningfulReflection(q.student_reflection))) changed.push(q.label);
    if (c.answer !== q.answer || c.max_score !== q.max_score || c.stem && c.stem !== q.stem) delete fact.ai_grading;
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
    if (c.max_score !== q.max_score) fact.max_mark = c.max_score === null ? null : { page: q.max_mark?.page || q.pages?.[0] || 1, quote: `用户核对满分：${c.max_score}`, source: 'user' };
    fact.max_score = c.max_score; fact.student_reflection = reflection;
    return fact;
  });
  const evidence = { questions, total: report.total || { score: null, max: null }, complete: report.complete, coverage: report.coverage,
    score_groups: report.score_groups || [], context: report.context || [], warnings: [], score_check: checkScores(questions, report.total || { score: null, max: null }, report.complete) };
  return { ...initialState(), flow: "revision", phase: "diagnose", changed_labels: changed, evidence, verification_done: true,
    diagnoses: report.questions.filter((q: any) => !changed.includes(q.label)), exam_context: report.exam_context, account_context: report.account_context };
}

export function canRecoverText(state: any) {
  return !!state?.evidence?.questions?.length && ["diagnose", "recheck", "grade", "synthesize"].includes(state.phase)
    && !(state.phase === 'grade' && state.grading_uses_images)
    && (state.verification_done === true || state.has_work === false)
    && state.evidence.questions.every((q: any) => typeof q.label === "string" && typeof q.stem === "string" && q.stem);
}
export function checkpointInput(row: any) {
  const state = row.analysis_state, source = state.source_input;
  const meta = source?.pages || row.image_meta || [];
  const pages = meta.length ? meta.map((p: any) => ({ page: p.page, role: p.role, url: "" })) : [{ page: 1, role: "paper", url: "" }];
  return { request_id: row.request_id, draft_id: row.draft_id, exam_id: state.original_exam_id ?? row.exam_id ?? null,
    subject: row.subject, options: reviewSettings(row.options || state.options), pages, work_on_paper: source?.work_on_paper ?? state.has_work !== false,
    exam_context: state.exam_context, account_context: state.account_context, text_recovery: true };
}
export function recoveryInfo(row: any) {
  const state = row.analysis_state || {}, available = !!state.phase && (row.status === "paused" || (state.resume_count || 0) < 2);
  return { available, mode: state.flow === "revision" || canRecoverText(state) ? "saved" : "images",
    completed: state.diagnoses?.length || 0, total: state.evidence?.questions?.length || 0,
    questions: (state.evidence?.questions || []).map((q: any) => ({ label: q.label, stem: q.stem, answer: q.answer, teacher_score: q.teacher_score, max_score: q.max_score, pages: q.pages, work_pages: q.work_pages, source_regions: q.source_regions })) };
}
