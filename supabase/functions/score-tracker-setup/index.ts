import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { schoolText, schoolSearchKey } from "./school-search.mjs";

const db = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", { auth: { persistSession: false, autoRefreshToken: false } });
const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
const columns = "step,selected_subjects,school,completed_at,updated_at,school_prompted_at,preference_guide_version,guide_step,current_grade,privacy_notice_version,privacy_acknowledged_at";
async function profile(userId: string) {
  const r = await db.from("score_tracker_setup_profiles").select(columns).eq("user_id", userId).maybeSingle();
  if (r.error) throw r.error;
  return r.data;
}
function cleanSchool(raw: unknown) {
  if (raw === null) return null;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("请填写学校名称");
  const source = raw as Record<string, unknown>;
  const result: Record<string, string> = {};
  for (const key of ["name", "province", "city", "area"]) {
    if (source[key] != null && typeof source[key] !== "string") throw new Error("学校信息不正确");
    const value = String(source[key] ?? "").trim();
    if (value.length > (key === "name" ? 100 : 50) || /[\x00-\x1f]/.test(value)) throw new Error("学校名称过长或包含无效字符");
    result[key] = value;
  }
  if (!result.name) throw new Error("请填写学校名称");
  result.source = source.source === "github" ? "github" : "manual";
  return result;
}
Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  try {
    const raw = await req.text();
    if (raw.length > 6000) return reply({ error: "请求过大" }, 413);
    let body: any;
    try { body = JSON.parse(raw); } catch { return reply({ error: "请求格式不正确" }, 400); }
    if (!body || typeof body !== "object" || Array.isArray(body)) return reply({ error: "请求格式不正确" }, 400);
    if (body.action === "release_capabilities") {
      const result = await db.from("score_tracker_setup_profiles").select("guide_step,current_grade,privacy_notice_version,preference_guide_version").limit(0);
      return reply({ setup_guide_version: 2, migration_ready: !result.error }, result.error ? 503 : 200);
    }
    const token = typeof body.token === "string" ? body.token : "";
    if (!token || token.length > 512) return reply({ error: "请重新登录" }, 401);
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
    const hash = [...new Uint8Array(digest)].map(n => n.toString(16).padStart(2, "0")).join("");
    const { data: user, error } = await db.from("score_tracker_users").select("id,session_expires_at").eq("session_token_hash", hash).maybeSingle();
    if (error) throw error;
    if (!user?.session_expires_at || new Date(user.session_expires_at).getTime() <= Date.now()) return reply({ error: "登录已失效，请重新登录" }, 401);
    if (body.action === "school_regions") {
      const r = await db.rpc("score_tracker_school_regions");
      if (r.error) throw r.error;
      return reply({ regions: (r.data || []).map((s: any) => [s.province, s.city]) });
    }
    if (body.action === "school_search") {
      const params: Record<string, string> = {};
      for (const key of ["query", "province", "city"]) {
        if (body[key] != null && (typeof body[key] !== "string" || body[key].length > (key === "query" ? 100 : 50))) return reply({ error: "学校搜索内容不正确" }, 400);
        params[key] = String(body[key] || "").trim();
      }
      const r = await db.rpc("score_tracker_search_schools", { p_text: schoolText(params.query), p_key: schoolSearchKey(params.query), p_province: params.province, p_city: params.city });
      if (r.error) throw r.error;
      const rows = r.data || [];
      return reply({ schools: rows.slice(0, 30).map((s: any) => [s.name, s.province, s.city, s.area]), has_more: rows.length > 30 });
    }
    if (body.action === "get") return reply({ profile: await profile(user.id) });
    if (body.action === "guide_claim") {
      // Claim the display once per account. The compare-and-set update makes
      // simultaneous tabs deterministic: only one of them may open the guide.
      // Version 1 means shown; version 2 is written after the final step.
      const seed = await db.from("score_tracker_setup_profiles").upsert({
        user_id: user.id,
        step: 6,
        completed_at: new Date().toISOString(),
        preference_guide_version: 0,
      }, { onConflict: "user_id", ignoreDuplicates: true });
      if (seed.error) throw seed.error;
      const claimed = await db.from("score_tracker_setup_profiles")
        .update({ preference_guide_version: 1, updated_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("preference_guide_version", 0)
        .select(columns)
        .maybeSingle();
      if (claimed.error) throw claimed.error;
      return reply({ claimed: !!claimed.data, profile: claimed.data || await profile(user.id) });
    }
    if (body.action === "school_prompt_claim") {
      const r = await db.rpc("score_tracker_claim_school_prompt", { p_user_id: user.id });
      if (r.error) throw r.error;
      return reply({ claimed: r.data === true, profile: await profile(user.id) });
    }
    if (body.action === "school_save") {
      let school;
      try { school = cleanSchool(body.school); if (!school) throw new Error("请选择或填写学校"); }
      catch (e) { return reply({ error: e instanceof Error ? e.message : "学校信息不正确" }, 400); }
      const now = new Date().toISOString();
      // Only school fields are updated; existing setup preferences stay untouched.
      const r = await db.from("score_tracker_setup_profiles").upsert({ user_id: user.id, school, school_prompted_at: now, updated_at: now }, { onConflict: "user_id" }).select(columns).single();
      if (r.error) throw r.error;
      return reply({ profile: r.data });
    }
    if (body.action === "start") {
      const row: Record<string, unknown> = { user_id: user.id };
      if (body.school_only === true) { row.step = 6; row.completed_at = new Date().toISOString(); }
      if (body.guide_only === true) {
        row.step = 6;
        row.completed_at = new Date().toISOString();
        row.preference_guide_version = 0;
      }
      const r = await db.from("score_tracker_setup_profiles").upsert(row, { onConflict: "user_id", ignoreDuplicates: true });
      if (r.error) throw r.error;
      return reply({ profile: await profile(user.id) });
    }
    if (body.action !== "save") return reply({ error: "未知操作" }, 400);
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    try {
      if ("step" in body) { if (!Number.isInteger(body.step) || body.step < 0 || body.step > 6) throw new Error("设置步骤不正确"); update.step = body.step; }
      if ("preference_guide_version" in body) {
        if (!Number.isInteger(body.preference_guide_version) || ![0, 1, 2].includes(body.preference_guide_version)) throw new Error("引导状态不正确");
        update.preference_guide_version = body.preference_guide_version;
      }
      if ("guide_step" in body) {
        if (!Number.isInteger(body.guide_step) || body.guide_step < 0 || body.guide_step > 9) throw new Error("引导步骤不正确");
        update.guide_step = body.guide_step;
      }
      if ("current_grade" in body) {
        if (typeof body.current_grade !== "string" || body.current_grade.length > 20 || /[\x00-\x1f]/.test(body.current_grade)) throw new Error("当前分类不正确");
        update.current_grade = body.current_grade.trim();
      }
      if ("privacy_notice_version" in body) {
        if (body.privacy_notice_version !== 1) throw new Error("隐私告知版本不正确");
        update.privacy_notice_version = 1;
        update.privacy_acknowledged_at = new Date().toISOString();
      }
      if ("selected_subjects" in body) {
        if (!Array.isArray(body.selected_subjects) || body.selected_subjects.length > 3 || body.selected_subjects.some((s: unknown) => typeof s !== "string" || !s.trim() || s.length > 40 || /[\x00-\x1f]/.test(s)) || new Set(body.selected_subjects).size !== body.selected_subjects.length) throw new Error("最多选择 3 门科目，名称不能为空");
        update.selected_subjects = body.selected_subjects;
      }
      if ("school" in body) update.school = cleanSchool(body.school);
      if (body.completed === true) { if (body.step !== 6) throw new Error("请先完成前面的设置"); update.completed_at = new Date().toISOString(); }
    } catch (e) { return reply({ error: e instanceof Error ? e.message : "设置内容不正确" }, 400); }
    const r = await db.from("score_tracker_setup_profiles").update(update).eq("user_id", user.id).select(columns).maybeSingle();
    if (r.error) throw r.error;
    if (!r.data) return reply({ error: "请重新打开首次设置" }, 409);
    return reply({ profile: r.data });
  } catch (e) {
    console.error("setup_request_failed", e instanceof Error ? e.name : "database_error");
    return reply({ error: "服务暂时没响应，请稍后重试" }, 503);
  }
});
