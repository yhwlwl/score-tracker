import { readDatabase, safeMessage } from "../score-tracker-vision-preview/reliability.ts";

const PAPER_AUDIT_TABLE = "score_tracker_paper_reviews";
const ATTEMPT_FIELDS = ["attempt", "started_at", "timeout_ms", "max_tokens", "thinking", "json_mode", "duration_ms", "outcome", "recovery",
  "upstream_status", "upstream_request_id", "upstream_error_code", "upstream_message", "content_type", "finish_reason", "model",
  "prompt_tokens", "completion_tokens", "reasoning_tokens", "reasoning_chars", "output_chars", "parse_error", "network_error", "network_code"];

export function paperFailure(code: string, status = 0) {
  const messages: Record<string, string> = {
    upstream_timeout: "AI 分析等待超时，本次 90 秒内未能完成，请稍后重试",
    upstream_network_error: "连接 AI 服务时发生网络中断，请稍后重试",
    upstream_rate_limited: "AI 服务触发限流，请稍后重试",
    upstream_auth_failed: "AI 服务鉴权失败，请联系管理员检查服务配置",
    upstream_billing_or_model_error: "AI 服务额度不足或模型配置不可用，请联系管理员",
    invalid_upstream_response: "AI 服务返回了异常响应，请稍后重试",
    empty_model_output: "AI 服务没有返回分析内容，请稍后重试",
    invalid_model_output: "AI 返回的分析结果格式异常或内容不完整，请稍后重试",
    model_output_truncated: "AI 输出达到长度限制，分析结果未完整返回，请减少分析范围后重试",
    no_usable_fields: "未能识别到有效题目或作答，请核对上传资料后重试",
    result_save_failed: "分析结果已生成，但报告保存失败，请稍后查看或重试",
    analysis_incomplete: "后台任务未能在预期时间内完成，可能发生超时或中断，请重试",
    paper_handler_error: "试卷分析后台发生异常，请稍后重试",
  };
  return messages[code] || (code === "upstream_error" ? `AI 服务返回错误${status ? `（HTTP ${status}）` : ""}，请稍后重试` : messages.paper_handler_error);
}

export function paperAudit(db: any, input: any, user: string, config: any, startedAt = Date.now()) {
  const secret = String(config.api_key || "");
  const redact = (value: unknown, max = 1200) => safeMessage(secret ? String(value ?? "").split(secret).join("[hidden]") : value, max);
  const attempts: any[] = [], phases: any[] = [], writeErrors: any[] = [];
  let queue: Promise<unknown> = Promise.resolve();
  const imageMeta = input.pages.map((p: any) => {
    const encoded = p.url.slice(p.url.indexOf(",") + 1);
    return { page: p.page, role: p.role, mime: p.url.slice(5, p.url.indexOf(";")), bytes: Math.floor(encoded.length * 3 / 4) - (encoded.endsWith("==") ? 2 : encoded.endsWith("=") ? 1 : 0) };
  });
  const base = { model: String(config.model).slice(0, 200), provider_host: new URL(config.base_url).hostname,
    started_at: new Date(startedAt).toISOString(), image_count: imageMeta.length,
    image_bytes: imageMeta.reduce((n: number, p: any) => n + p.bytes, 0), image_meta: imageMeta };
  const diagnostics: any = { version: 1, start_http_status: 202, budget_ms: 90000, attempt_timeout_ms: 60000, output_tokens: 12800,
    work_on_paper: input.work_on_paper, page_roles: Object.fromEntries(["paper", "work", "reference"].map(role => [role, imageMeta.filter((p: any) => p.role === role).length])),
    phases, audit_write_errors: writeErrors, last_stage: "reserved" };
  function fields() { return { ...base, attempts: JSON.parse(JSON.stringify(attempts)), diagnostics: JSON.parse(JSON.stringify(diagnostics)), duration_ms: Date.now() - startedAt }; }
  function log(event: string, extra: any = {}) {
    // Console logs intentionally omit image data, model text and provider error bodies.
    console.log("paper_review_event", JSON.stringify({ request_id: input.request_id, event, elapsed_ms: Date.now() - startedAt, ...extra }));
  }
  function writeProblem(error: any, stage: string) {
    writeErrors.push({ stage, code: redact(error?.code || "audit_write_failed", 100), message: redact(error?.message || error, 600), at: new Date().toISOString() });
    console.error("paper_review_audit_write_failed", JSON.stringify({ request_id: input.request_id, stage, code: redact(error?.code || "audit_write_failed", 100) }));
  }
  function mark(phase: string, extra: any = {}) {
    diagnostics.last_stage = phase;
    if (phase === "upstream_attempt") {
      const attempt: any = {};
      for (const key of ATTEMPT_FIELDS) {
        const value = extra[key];
        if (typeof value === "string") attempt[key] = redact(value, ["upstream_message", "parse_error", "network_error"].includes(key) ? 2000 : 240);
        else if (value === null || typeof value === "boolean" || typeof value === "number" && Number.isFinite(value)) attempt[key] = value;
        else if (key === "thinking" && value && typeof value === "object") attempt[key] = { type: value.type, enabled: value.enabled };
      }
      attempts.push(attempt);
      log(phase, { attempt: attempt.attempt, outcome: attempt.outcome, upstream_status: attempt.upstream_status, duration_ms: attempt.duration_ms,
        upstream_request_id: attempt.upstream_request_id, recovery: attempt.recovery });
    } else log(phase);
    phases.push({ phase, at: new Date().toISOString(), elapsed_ms: Date.now() - startedAt });
    // Serialize writes so an earlier checkpoint cannot overwrite a later attempt.
    const snapshot = fields();
    queue = queue.then(async () => {
      try {
        const r = await readDatabase(() => db.from(PAPER_AUDIT_TABLE).update(snapshot).eq("request_id", input.request_id).eq("user_id", user).eq("status", "running"));
        if (r.error) writeProblem(r.error, phase);
      } catch (e) { writeProblem(e, phase); }
    });
    return queue;
  }
  async function finish(status: "succeeded" | "failed", result: any = {}) {
    await queue;
    const code = status === "failed" ? String(result.code || "paper_handler_error") : null;
    const stage = status === "failed" ? String(result.stage || "upstream") : null;
    const lastAttempt = attempts[attempts.length - 1];
    const detail = status === "failed" ? redact(result.detail || result.upstream_message || lastAttempt?.upstream_message || lastAttempt?.network_error || lastAttempt?.parse_error || result.error || code, 2400) : null;
    const patch: any = { ...fields(), status, completed_at: new Date().toISOString(),
      upstream_status: result.upstream_status || lastAttempt?.upstream_status || null,
      error_code: code, error_stage: stage, error_message: code ? paperFailure(code, result.upstream_status) : null,
      error_detail: detail, raw_output: redact(result.raw_output || "", 100000) || null };
    patch.diagnostics.last_stage = status;
    patch.diagnostics.phases.push({ phase: status, at: new Date().toISOString(), elapsed_ms: Date.now() - startedAt });
    if (status === "succeeded") patch.result = result.result;
    log("outcome_save_started", { outcome: status, error_code: code, error_stage: stage, upstream_status: patch.upstream_status, attempts: attempts.length });
    try {
      const saved = await readDatabase(() => db.from(PAPER_AUDIT_TABLE).update(patch).eq("request_id", input.request_id).eq("user_id", user).eq("status", "running").select("request_id").maybeSingle());
      if (saved.error) { writeProblem(saved.error, "finish"); throw saved.error; }
      if (!saved.data) log("completion_not_applied"); // Deleted, stale, or already completed by another handler.
      else log(status, { error_code: code, error_stage: stage, upstream_status: patch.upstream_status, attempts: attempts.length });
    } catch (e) { console.error("paper_review_result_write_failed", JSON.stringify({ request_id: input.request_id, code: redact((e as any)?.code || "database_error", 100), stage })); throw e; }
  }
  return { mark, finish, redact };
}
