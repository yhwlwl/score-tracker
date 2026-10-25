// Shared by the recognizer and its tests. Never log request bodies or credentials.
export const OUTPUT_TOKENS = 9600;
export const RECOVERY_TOKENS = 12800;
export const UPSTREAM_BUDGET_MS = 90000;
export const ATTEMPT_TIMEOUT_MS = 60000;

export function safeMessage(value: unknown, max = 600): string {
  return String(value ?? "").replace(/Bearer\s+\S+/gi, "Bearer [hidden]")
    .replace(/(?:sb_secret_|sk-)[\w-]+/g, "[hidden]")
    .replace(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/gi, "[image]")
    .replace(/((?:password|token|api[_-]?key|authorization)["']?\s*[:=]\s*["']?)[^\s,}"']+/gi, "$1[hidden]")
    .slice(0, max);
}

export async function readDatabase(operation: () => PromiseLike<any>): Promise<any> {
  // This specific error is rejected by the gateway before SQL executes. Do not
  // replay arbitrary failed writes, quota consumption, or actual invalid tokens.
  let result: any;
  for (let attempt = 0; ; attempt++) {
    result = await operation();
    if (attempt >= 2 || result.error?.code !== "PGRST303" || !/issued at future/i.test(result.error?.message || "")) return result;
    await new Promise(resolve => setTimeout(resolve, attempt ? 900 : 300));
  }
}

export function requestOptions(model: string, openRouter: boolean) {
  const options: Record<string, unknown> = { response_format: { type: "json_object" } };
  if (/deepseek/i.test(model)) {
    if (openRouter) options.reasoning = { enabled: false };
    else options.thinking = { type: "disabled" };
  }
  return options;
}

export function modelText(payload: any): string {
  const content = payload?.choices?.[0]?.message?.content;
  const text = typeof content === "string" ? content : Array.isArray(content)
    ? content.map((item: any) => typeof item?.text === "string" ? item.text : "").join("") : "";
  return text.replace(/^\uFEFF/, "").replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

export async function recognizeWithRecovery(options: {
  url: string; headers: Record<string, string>; body: Record<string, any>;
  requestId: string; validate: (text: string) => any;
  mark: (phase: string, extra?: Record<string, unknown>) => void;
  budgetMs?: number; attemptTimeoutMs?: number; maxAttempts?: number;
}) {
  const started = Date.now(), attempts: any[] = [];
  const budget = Math.min(options.budgetMs ?? UPSTREAM_BUDGET_MS, UPSTREAM_BUDGET_MS);
  const maxAttempts = options.maxAttempts === 1 ? 1 : 2;
  const body = { ...options.body };
  const apiKey = (options.headers.Authorization || "").replace(/^Bearer\s+/i, "");
  const sanitize = (value: unknown, max = 600) => safeMessage(apiKey ? String(value ?? "").split(apiKey).join("[hidden]") : value, max);

  let last: any = { code: "upstream_timeout", error: "识别服务响应较慢，请稍后再试", status: 504, upstream_status: 0 };
  for (let index = 0; index < maxAttempts; index++) {
    const remaining = budget - (Date.now() - started);
    if (remaining <= 0) break;
    const timeoutMs = Math.min(options.attemptTimeoutMs ?? ATTEMPT_TIMEOUT_MS, remaining);
    const attempt: any = { attempt: index + 1, started_at: new Date().toISOString(), timeout_ms: timeoutMs, max_tokens: body.max_tokens,
      thinking: body.thinking || body.reasoning || null, json_mode: !!body.response_format };
    const attemptStarted = Date.now(), controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let retry = false, retryDelay = 350;
    try {
      const response = await fetch(options.url, {
        method: "POST", headers: { ...options.headers, "X-Client-Request-Id": options.requestId },
        body: JSON.stringify(body), signal: controller.signal,
      });
      attempt.upstream_status = response.status;
      attempt.upstream_request_id = sanitize(response.headers.get("x-request-id") || response.headers.get("request-id") || response.headers.get("cf-ray") || "", 240) || null;
      attempt.content_type = response.headers.get("content-type");
      const raw = await response.text();
      let payload: any;
      try { payload = JSON.parse(raw); } catch { payload = null; }
      if (!response.ok) {
        const detail = sanitize(typeof payload?.error === "string" ? payload.error : payload?.error?.message || payload?.message || raw);
        attempt.upstream_error_code = sanitize(payload?.error?.code || "", 100);
        attempt.upstream_message = detail;
        const status = response.status;
        last = { error: status === 401 || status === 403 ? "识别服务暂时无法验证，请稍后再试"
          : status === 429 ? "识别服务较忙，请稍后再试" : status === 402 ? "识别服务额度暂时不足，请联系管理员" : "识别服务暂不可用，请稍后再试",
          code: status === 401 || status === 403 ? "upstream_auth_failed" : status === 429 ? "upstream_rate_limited"
            : status === 402 ? "upstream_billing_or_model_error" : "upstream_error",
          status: status === 429 ? 429 : status === 402 ? 503 : 502, upstream_status: status, upstream_message: detail };
        // Some OpenAI-compatible providers reject otherwise standard controls.
        if ((status === 400 || status === 422) && /thinking|reasoning|response_format|json_object|unsupported.{0,30}parameter|unknown.{0,30}parameter/i.test(detail)) {
          if (/thinking|reasoning/i.test(detail)) { delete body.thinking; delete body.reasoning; }
          if (/response_format|json_object/i.test(detail)) delete body.response_format;
          retry = true; attempt.recovery = "parameter_compatibility";
        } else {
          const retryAfter = Number(response.headers.get("retry-after") || 0);
          retry = [408, 425, 429, 500, 502, 503, 504].includes(status) && retryAfter <= 3;
          retryDelay = Math.max(350, retryAfter * 1000);
          if (retry) attempt.recovery = "transient_upstream_error";
        }
      } else if (!payload || payload.error) {
        last = { error: "识别服务返回异常，正在尝试重新读取", code: "invalid_upstream_response", status: 502, upstream_status: response.status,
          upstream_message: sanitize(payload?.error?.message || payload?.error || raw) };
        attempt.upstream_message = last.upstream_message; retry = true;
      } else {
        const text = modelText(payload), finish = payload?.choices?.[0]?.finish_reason;
        Object.assign(attempt, { finish_reason: finish ?? null, model: payload.model || body.model,
          prompt_tokens: payload.usage?.prompt_tokens ?? null, completion_tokens: payload.usage?.completion_tokens ?? null,
          reasoning_tokens: payload.usage?.completion_tokens_details?.reasoning_tokens ?? payload.usage?.reasoning_tokens ?? null,
          reasoning_chars: typeof payload?.choices?.[0]?.message?.reasoning_content === "string" ? payload.choices[0].message.reasoning_content.length : 0,
          output_chars: text.length });
        last = { error: "识别结果格式异常，请稍后重试", code: "invalid_model_output", status: 422, upstream_status: 200, raw_output: text.slice(0, 100000) };
        try {
          if (!text) throw new Error("empty_model_output");
          const result = options.validate(text);
          attempt.duration_ms = Date.now() - attemptStarted; attempt.outcome = "succeeded";
          attempts.push(attempt); options.mark("upstream_attempt", attempt);
          return { ok: true, result, raw_output: text.slice(0, 100000), attempts, upstream_status: 200 };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          const truncated = finish === "length" || finish === "max_tokens";
          last.code = truncated ? "model_output_truncated" : message === "empty_model_output" ? "empty_model_output"
            : message === "no_usable_fields" ? "no_usable_fields" : "invalid_model_output";
          last.error = truncated ? "识别结果还没完整返回，请稍后再试" : last.code === "no_usable_fields" ? "还没读到成绩或考试信息，可以裁剪成绩区域后再试"
            : last.code === "empty_model_output" ? "识别服务没有返回结果，请稍后重试" : "识别结果格式异常，请稍后重试";
          attempt.parse_error = sanitize(message);
          retry = last.code !== "no_usable_fields";
          if (truncated) body.max_tokens = RECOVERY_TOKENS;
          attempt.recovery = truncated ? "larger_output_budget" : "read_result_again";
        }
      }
    } catch (error) {
      const timedOut = controller.signal.aborted;
      last = { error: timedOut ? "识别服务响应较慢，请稍后再试" : "识别服务连接中断，请稍后重试",
        code: timedOut ? "upstream_timeout" : "upstream_network_error", status: timedOut ? 504 : 502,
        upstream_status: attempt.upstream_status || 0, upstream_message: sanitize(error instanceof Error ? error.message : error) };
      attempt.network_error = last.upstream_message;
      attempt.network_code = sanitize((error as any)?.cause?.code || (error as any)?.code || "", 80);
      retry = true; attempt.recovery = "retry_connection";
    } finally { clearTimeout(timer); }
    attempt.duration_ms = Date.now() - attemptStarted; attempt.outcome = last.code;
    attempts.push(attempt); options.mark("upstream_attempt", attempt);
    if (!retry || index + 1 === maxAttempts || budget - (Date.now() - started) < retryDelay + 500) break;
    await new Promise(resolve => setTimeout(resolve, retryDelay));
  }
  return { ok: false, ...last, attempts };
}

