import { modelText, safeMessage } from "../score-tracker-vision-preview/reliability.ts";
import { STAGE_BUDGET_MS, REVIEW_OUTPUT_TOKENS } from "./analysis.ts";

export function reviewOptions(model: string, host: string, effort = "high") {
  const options: any = { response_format: { type: "json_object" } };
  if (host === "openrouter.ai") options.reasoning = { enabled: true, effort };
  else if (/deepseek/i.test(model)) { options.thinking = { type: "enabled" }; options.reasoning_effort = effort; }
  else if (/^(?:o[134]|gpt-5)/i.test(model)) options.reasoning_effort = effort;
  return options;
}

// Isolated from score recognition: never inherit its thinking=disabled or 90s cap.
export async function reviewModel(options: { config: any; content: any[]; requestId: string; stage: string; effort?: "low" | "high"; validate: (raw: any) => any; mark: (phase: string, extra?: any) => any }) {
  const { config } = options, started = Date.now();
  const clean = (v: unknown, max = 1200) => safeMessage(String(v ?? "").split(config.api_key).join("[hidden]"), max);
  const body: any = { model: config.model, messages: [{ role: "user", content: options.content }], max_tokens: REVIEW_OUTPUT_TOKENS, ...reviewOptions(config.model, new URL(config.base_url).hostname, options.effort || (/^(?:diagnose|recheck)_/.test(options.stage) ? "high" : "low")) };
  const promptHash = [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(options.content.filter(c => c.type === "text").map(c => c.text).join("\n"))))].map(b => b.toString(16).padStart(2, "0")).join("");
  const imageUrls = options.content.filter(c => c.type === "image_url").map(c => c.image_url.url);
  const imageBytes = imageUrls.reduce((n, url) => { const b64 = url.slice(url.indexOf(",") + 1); return n + Math.floor(b64.length * 3 / 4) - (b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0); }, 0);
  let last: any = { code: "upstream_timeout", stage: options.stage }, rawOutput = "";
  for (let i = 0; i < 2 && Date.now() - started < STAGE_BUDGET_MS - 500; i++) {
    const attempt: any = { stage: options.stage, attempt: i + 1, started_at: new Date().toISOString(), timeout_ms: STAGE_BUDGET_MS - (Date.now() - started), max_tokens: body.max_tokens, thinking: body.thinking || body.reasoning || null, reasoning_effort: body.reasoning_effort || body.reasoning?.effort || null, prompt_hash: promptHash, image_count: imageUrls.length, image_bytes: imageBytes, json_mode: !!body.response_format };
    const at = Date.now(), controller = new AbortController(), timer = setTimeout(() => controller.abort(), attempt.timeout_ms);
    let retry = false;
    try {
      const response = await fetch(config.base_url.replace(/\/+$/, "") + "/chat/completions", { method: "POST", headers: { Authorization: "Bearer " + config.api_key, "Content-Type": "application/json", "X-Client-Request-Id": options.requestId + ":" + options.stage }, body: JSON.stringify(body), signal: controller.signal });
      attempt.upstream_status = response.status;
      attempt.upstream_request_id = clean(response.headers.get("x-request-id") || response.headers.get("request-id") || response.headers.get("cf-ray"), 240);
      attempt.content_type = response.headers.get("content-type");
      const responseText = await response.text(); let payload: any;
      try { payload = JSON.parse(responseText); } catch { payload = null; }
      if (!attempt.upstream_request_id && typeof payload?.id === "string") attempt.upstream_request_id = clean(payload.id, 240);
      if (!response.ok || !payload || payload.error) {
        const status = response.status, message = clean(payload?.error?.message || payload?.error || payload?.message || responseText);
        last = { code: [401, 403].includes(status) ? "upstream_auth_failed" : status === 402 ? "upstream_billing_or_model_error" : status === 429 ? "upstream_rate_limited" : response.ok ? "invalid_upstream_response" : "upstream_error", upstream_status: status, detail: message, stage: options.stage };
        attempt.upstream_message = message; attempt.upstream_error_code = clean(payload?.error?.code || "", 100);
        // Do not silently switch reasoning off. JSON formatting alone may be relaxed.
        if ([400, 422].includes(status) && /response_format|json_object/i.test(message)) { delete body.response_format; retry = true; attempt.recovery = "json_format_compatibility"; }
        else if ([400, 422].includes(status) && /thinking|reasoning|effort/i.test(message)) last.code = "reasoning_not_supported";
        else retry = [408, 425, 429, 500, 502, 503, 504].includes(status) && Number(response.headers.get("retry-after") || 0) <= 3;
      } else {
        const content = modelText(payload), finish = payload.choices?.[0]?.finish_reason;
        rawOutput = clean(content, 100000);
        Object.assign(attempt, { finish_reason: finish, model: payload.model || config.model, prompt_tokens: payload.usage?.prompt_tokens ?? null, completion_tokens: payload.usage?.completion_tokens ?? null,
          reasoning_tokens: payload.usage?.completion_tokens_details?.reasoning_tokens ?? payload.usage?.reasoning_tokens ?? null,
          reasoning_chars: typeof payload.choices?.[0]?.message?.reasoning_content === "string" ? payload.choices[0].message.reasoning_content.length : 0, output_chars: content.length });
        try {
          if (!content) throw new Error("empty_model_output");
          if (finish === "length" || finish === "max_tokens") throw new Error("model_output_truncated");
          const result = options.validate(JSON.parse(content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")));
          attempt.outcome = "succeeded"; attempt.duration_ms = Date.now() - at;
          await options.mark("upstream_attempt", attempt);
          return { ok: true, result, raw_output: rawOutput, upstream_status: response.status };
        } catch (e) {
          const message = clean((e as Error).message);
          last = { code: ["empty_model_output", "model_output_truncated"].includes(message) ? message : "invalid_model_output", detail: message, upstream_status: response.status, stage: options.stage };
          attempt.parse_error = message; retry = last.code !== "model_output_truncated";
          // A repair attempt receives the actual validation failure, not the same blind request.
          body.messages = [{ role: "user", content: options.content.concat({ type: "text", text: "上一响应未通过结构校验，请完整重新输出JSON并修正：" + message }) }];
        }
      }
    } catch (e) {
      last = { code: controller.signal.aborted ? "upstream_timeout" : "upstream_network_error", stage: options.stage, detail: clean((e as Error).message), upstream_status: attempt.upstream_status || 0 };
      attempt.network_error = last.detail; attempt.network_code = clean((e as any)?.cause?.code || "", 100); retry = true;
    } finally { clearTimeout(timer); }
    attempt.outcome = last.code; attempt.duration_ms = Date.now() - at;
    await options.mark("upstream_attempt", attempt);
    if (!retry || Date.now() - started > STAGE_BUDGET_MS - 1500) break;
    await new Promise(resolve => setTimeout(resolve, 350));
  }
  return { ok: false, ...last, raw_output: rawOutput };
}

export function imageContent(input: any, selected?: number[]) {
  const names: any = { paper: "试卷题目", work: "学生作答/批改或成绩截图", reference: "提供的参考答案/评分细则" };
  const content: any[] = [];
  for (const p of input.pages) {
    if (selected?.length && !selected.includes(p.page)) continue;
    content.push({ type: "text", text: `第${p.page}页 · ${names[p.role]}` }, { type: "image_url", image_url: { url: p.url, detail: "high" } });
    for (const [i, region] of (p.regions || []).entries()) content.push({ type: "text", text: `第${p.page}页局部放大${i + 1}（与原图内容重叠，不是新页）` }, { type: "image_url", image_url: { url: region, detail: "high" } });
  }
  return content;
}
