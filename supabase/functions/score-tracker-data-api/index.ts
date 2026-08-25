import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const db = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false, autoRefreshToken: false } }
);
const DEF = [
  { name: "语文", default_max: 150, sort_order: 1 },
  { name: "数学", default_max: 150, sort_order: 2 },
  { name: "英语", default_max: 150, sort_order: 3 },
  { name: "物理", default_max: 100, sort_order: 4 },
  { name: "化学", default_max: 100, sort_order: 5 },
  { name: "生物", default_max: 100, sort_order: 6 },
  { name: "历史", default_max: 100, sort_order: 7 },
  { name: "地理", default_max: 100, sort_order: 8 },
  { name: "政治", default_max: 100, sort_order: 9 },
];
const CORE = ["语文", "数学", "英语"];
const BUILTIN_CORE = "语数外";
const BUILTIN_FOUR = "语数外 + 物理/历史（四科）";
const BUILTIN_SIX = "语数外 + 所选科（六科）";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const out = (data: any, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
async function sha(v: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
const PW_V2_ITERS = 100000;
async function pbkdf2Bits(pw: string, salt: Uint8Array, iters: number) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveBits"]);
  return new Uint8Array(
    await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations: iters }, key, 256)
  );
}
async function hashPasswordV2(pw: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const got = await pbkdf2Bits(pw, salt, PW_V2_ITERS);
  const b64 = (b: Uint8Array) => btoa(String.fromCharCode(...b));
  return `v2$${PW_V2_ITERS}$${b64(salt)}$${b64(got)}`;
}
async function verifyPasswordV2(storedHash: string, pw: string) {
  try {
    const parts = storedHash.split("$");
    if (parts[0] !== "v2" || parts.length !== 4) return false;
    const iters = Number(parts[1]);
    if (!Number.isInteger(iters) || iters < 1 || iters > 1000000) return false;
    const salt = Uint8Array.from(atob(parts[2]), (c) => c.charCodeAt(0));
    const want = Uint8Array.from(atob(parts[3]), (c) => c.charCodeAt(0));
    const got = await pbkdf2Bits(pw, salt, iters);
    if (got.length !== want.length) return false;
    let diff = 0;
    for (let i = 0; i < got.length; i++) diff |= got[i] ^ want[i];
    return diff === 0;
  } catch {
    return false;
  }
}
const newPasswordOk = (v: unknown): string | null =>
  typeof v === "string" && /^[\x21-\x7E]{6,20}$/.test(v) ? v : null;
async function auth(token: string) {
  if (!token) return null;
  const r = await db
    .from("score_tracker_users")
    .select("id,username,original_username,session_expires_at,exam_category_label,exam_category_options")
    .eq("session_token_hash", await sha(token))
    .maybeSingle();
  if (r.error) throw r.error;
  const u = r.data;
  if (!u?.session_expires_at || new Date(u.session_expires_at).getTime() < Date.now()) return null;
  return u;
}
const score = (v: any) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n <= 99999 ? Math.round(n * 100) / 100 : null;
};
const pint = (v: any) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 10000000 ? n : null;
};
const pct = (v: any) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? Math.round(n * 1000) / 1000 : null;
};
const text = (v: any, max = 40) => {
  const s = String(v ?? "").trim();
  return s && s.length <= max ? s : null;
};
const cleanSubjects = (v: any) =>
  Array.isArray(v) ? [...new Set(v.map((x) => text(x, 40)).filter(Boolean))] as string[] : [];

async function subjects(uid: string) {
  let r = await db
    .from("score_tracker_subjects")
    .select("id,name,default_max,sort_order")
    .eq("user_id", uid)
    .order("sort_order");
  if (r.error) throw r.error;
  if (!r.data?.length) {
    r = await db
      .from("score_tracker_subjects")
      .insert(DEF.map((x) => ({ ...x, user_id: uid })))
      .select("id,name,default_max,sort_order");
    if (r.error) throw r.error;
  }
  return (r.data ?? []).map((x: any) => ({
    id: x.id,
    name: x.name,
    defaultMax: Number(x.default_max ?? 100),
    sortOrder: Number(x.sort_order ?? 0),
  }));
}
function classification(u: any) {
  const raw = Array.isArray(u.exam_category_options) ? u.exam_category_options : ["高一", "高二", "高三"];
  const options = [...new Set(raw.map((x: any) => String(x ?? "").trim()).filter(Boolean))].slice(0, 12);
  return { label: String(u.exam_category_label || "年级").trim() || "分类", options: options.length ? options : ["高一", "高二", "高三"] };
}
async function moduleRows(uid: string) {
  const r = await db
    .from("score_tracker_modules")
    .select("id,name,subjects,is_builtin,sort_order")
    .eq("user_id", uid)
    .order("sort_order");
  if (r.error) throw r.error;
  return r.data ?? [];
}
async function ensureModules(uid: string, configured: any[]) {
  let rows = await moduleRows(uid);
  if (!rows.length) {
    const names = configured.map((x) => x.name),
      has = (s: string) => names.includes(s);
    const primary = !has("物理") && has("历史") ? "历史" : "物理";
    const extras = [primary, "化学", "生物", "历史", "政治", "地理", "物理"]
      .filter((x: string, i: number, a: string[]) => has(x) && a.indexOf(x) === i)
      .slice(0, 3);
    while (extras.length < 3) {
      const next = names.find((x) => !CORE.includes(x) && !extras.includes(x));
      if (!next) break;
      extras.push(next);
    }
    const defs = [
      { name: BUILTIN_CORE, subjects: CORE, is_builtin: true, sort_order: 1 },
      { name: BUILTIN_FOUR, subjects: [...CORE, primary], is_builtin: true, sort_order: 2 },
      { name: BUILTIN_SIX, subjects: [...CORE, ...extras.slice(0, 3)], is_builtin: true, sort_order: 3 },
    ];
    const ins = await db
      .from("score_tracker_modules")
      .insert(defs.map((x) => ({ ...x, user_id: uid })))
      .select("id,name,subjects,is_builtin,sort_order");
    if (ins.error && ins.error.code !== "23505") throw ins.error;
    rows = await moduleRows(uid);
  }
  return rows.map((x: any) => ({
    id: x.id,
    name: x.name,
    subjects: cleanSubjects(x.subjects),
    isBuiltin: !!x.is_builtin,
    sortOrder: Number(x.sort_order || 0),
  }));
}

async function list(user: any) {
  const configured = await subjects(user.id);
  const er = await db
    .from("score_tracker_exams")
    .select(
      "id,name,exam_date,total_rank,total_participants,total_class_rank,total_class_participants,total_year_position_percent,total_class_position_percent,total_actual_score,total_raw_score,is_hidden,grade_level,created_at,updated_at"
    )
    .eq("user_id", user.id)
    .order("exam_date")
    .order("created_at");
  if (er.error) throw er.error;
  const ids = (er.data ?? []).map((e: any) => e.id);
  let rows: any[] = [],
    examModules: any[] = [];
  if (ids.length) {
    const [sr, mr] = await Promise.all([
      db
        .from("score_tracker_scores")
        .select(
          "id,exam_id,subject,target_score,actual_score,raw_score,max_score,raw_max_score,rank_position,participant_count,class_rank_position,class_participant_count,year_position_percent,class_position_percent,exclude_from_total"
        )
        .eq("user_id", user.id)
        .in("exam_id", ids),
      db
        .from("score_tracker_exam_modules")
        .select("exam_id,module_id,sort_order,ranks")
        .eq("user_id", user.id)
        .in("exam_id", ids)
        .order("sort_order"),
    ]);
    if (sr.error) throw sr.error;
    if (mr.error) throw mr.error;
    rows = sr.data ?? [];
    examModules = mr.data ?? [];
  }
  const modules = await ensureModules(user.id, configured);
  const exams = (er.data ?? []).map((e: any) => {
    const scores = Object.fromEntries(
      rows
        .filter((r) => r.exam_id === e.id)
        .map((r) => [
          r.subject,
          {
            target: r.target_score === null ? null : Number(r.target_score),
            actual: r.actual_score === null ? null : Number(r.actual_score),
            raw: r.raw_score === null ? null : Number(r.raw_score),
            max: Number(r.max_score ?? 100),
            rawMax: Number(r.raw_max_score ?? r.max_score ?? 100),
            rank: r.rank_position === null ? null : Number(r.rank_position),
            participants: r.participant_count === null ? null : Number(r.participant_count),
            classRank: r.class_rank_position === null ? null : Number(r.class_rank_position),
            classParticipants: r.class_participant_count === null ? null : Number(r.class_participant_count),
            yearPositionPercent: r.year_position_percent === null ? null : Number(r.year_position_percent),
            classPositionPercent: r.class_position_percent === null ? null : Number(r.class_position_percent),
            excludeFromTotal: !!r.exclude_from_total,
          },
        ])
    );
    const mine = examModules.filter((x) => x.exam_id === e.id);
    const moduleIds = mine.map((x) => x.module_id);
    // 组合排名：云端 ranks 有值就用，无则返回空对象，前端会回退到本地缓存
    const moduleRanks: any = {};
    for (const x of mine) {
      if (x.ranks && typeof x.ranks === "object") moduleRanks[x.module_id] = x.ranks;
    }
    return {
      ...e,
      is_hidden: !!e.is_hidden,
      total_rank: e.total_rank === null ? null : Number(e.total_rank),
      total_participants: e.total_participants === null ? null : Number(e.total_participants),
      total_class_rank: e.total_class_rank === null ? null : Number(e.total_class_rank),
      total_class_participants: e.total_class_participants === null ? null : Number(e.total_class_participants),
      total_year_position_percent: e.total_year_position_percent === null ? null : Number(e.total_year_position_percent),
      total_class_position_percent: e.total_class_position_percent === null ? null : Number(e.total_class_position_percent),
      total_actual_score: e.total_actual_score === null ? null : Number(e.total_actual_score),
      total_raw_score: e.total_raw_score === null ? null : Number(e.total_raw_score),
      moduleIds,
      moduleRanks,
      scores,
    };
  });
  return {
    user: { id: user.id, username: user.username, originalUsername: user.original_username || user.username },
    subjects: configured,
    classification: classification(user),
    modules,
    exams,
  };
}

async function saveClass(uid: string, raw: any) {
  const label = text(raw?.label, 16);
  if (!label) return { error: "分类名称请输入 1～16 个字符", status: 400 };
  if (!Array.isArray(raw?.options)) return { error: "分类选项格式不正确", status: 400 };
  const options = raw.options.map((x: any) => String(x ?? "").trim()).filter(Boolean);
  if (options.length < 1 || options.length > 12) return { error: "分类选项需保持在 1～12 个", status: 400 };
  if (options.some((x: string) => x.length > 20)) return { error: "每个分类名称不能超过 20 个字符", status: 400 };
  if (new Set(options).size !== options.length) return { error: "分类名称不能重复", status: 400 };
  const r = await db
    .from("score_tracker_users")
    .update({ exam_category_label: label, exam_category_options: options, updated_at: new Date().toISOString() })
    .eq("id", uid);
  if (r.error) throw r.error;
  return { classification: { label, options } };
}
async function saveSubjects(uid: string, raw: any) {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > 20) return { error: "科目数量需保持在 1～20 个", status: 400 };
  const seen = new Set<string>();
  const items = raw.map((item: any, i: number) => {
    const name = text(item?.name),
      max = score(item?.defaultMax);
    if (!name) throw new Error(`第 ${i + 1} 个科目名称不正确`);
    if (max === null || max <= 0) throw new Error(`${name} 的默认满分不正确`);
    if (seen.has(name)) throw new Error(`科目「${name}」重复了`);
    seen.add(name);
    return { name, default_max: max, sort_order: i + 1, user_id: uid };
  });
  const old = await db.from("score_tracker_subjects").select("id,name").eq("user_id", uid);
  if (old.error) throw old.error;
  for (const item of items) {
    const found = (old.data ?? []).find((x: any) => x.name === item.name);
    const r = found
      ? await db
          .from("score_tracker_subjects")
          .update({ default_max: item.default_max, sort_order: item.sort_order, updated_at: new Date().toISOString() })
          .eq("id", found.id)
          .eq("user_id", uid)
      : await db.from("score_tracker_subjects").insert(item);
    if (r.error) throw r.error;
  }
  const keep = items.map((x: any) => x.name),
    remove = (old.data ?? []).filter((x: any) => !keep.includes(x.name)).map((x: any) => x.id);
  if (remove.length) {
    const r = await db.from("score_tracker_subjects").delete().eq("user_id", uid).in("id", remove);
    if (r.error) throw r.error;
  }
  return { subjects: await subjects(uid) };
}
function rankErr(rank: number | null, n: number | null, label: string) {
  return rank !== null && n !== null && rank > n ? `${label}不能大于参考人数` : null;
}
// 组合排名清洗：只保留合法整数；带 label 提示的校验由调用方处理
function moduleRanksClean(raw: any) {
  const ranks: any = {};
  if (!raw || typeof raw !== "object") return ranks;
  const yr = pint(raw.yearRank),
    yn = pint(raw.yearParticipants),
    cr = pint(raw.classRank),
    cn = pint(raw.classParticipants);
  if (raw.yearRank !== "" && raw.yearRank != null && yr === null) throw new Error("组合年排名次请输入正整数");
  if (raw.yearParticipants !== "" && raw.yearParticipants != null && yn === null) throw new Error("组合年级人数请输入正整数");
  if (raw.classRank !== "" && raw.classRank != null && cr === null) throw new Error("组合班排名次请输入正整数");
  if (raw.classParticipants !== "" && raw.classParticipants != null && cn === null) throw new Error("组合班级人数请输入正整数");
  if (yr !== null && yn !== null && yr > yn) throw new Error("组合年排不能大于年级人数");
  if (cr !== null && cn !== null && cr > cn) throw new Error("组合班排不能大于班级人数");
  if (yr !== null) ranks.yearRank = yr;
  if (yn !== null) ranks.yearParticipants = yn;
  if (cr !== null) ranks.classRank = cr;
  if (cn !== null) ranks.classParticipants = cn;
  return ranks;
}

async function saveExam(uid: string, exam: any) {
  const name = String(exam?.name ?? "").trim().slice(0, 60),
    date = String(exam?.exam_date ?? ""),
    category = String(exam?.grade_level ?? "").trim().slice(0, 20) || null;
  if (!name || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "请填写考试名称和日期", status: 400 };
  const yr = pint(exam?.total_rank),
    yn = pint(exam?.total_participants),
    cr = pint(exam?.total_class_rank),
    cn = pint(exam?.total_class_participants),
    yp = pct(exam?.total_year_position_percent),
    cp = pct(exam?.total_class_position_percent),
    ta = score(exam?.total_actual_score),
    tr = score(exam?.total_raw_score);
  if (exam?.total_rank !== "" && exam?.total_rank != null && yr === null) return { error: "年级总排名请输入正整数", status: 400 };
  if (exam?.total_participants !== "" && exam?.total_participants != null && yn === null) return { error: "年级参考人数请输入正整数", status: 400 };
  if (exam?.total_class_rank !== "" && exam?.total_class_rank != null && cr === null) return { error: "班级总排名请输入正整数", status: 400 };
  if (exam?.total_class_participants !== "" && exam?.total_class_participants != null && cn === null) return { error: "班级参考人数请输入正整数", status: 400 };
  if (exam?.total_year_position_percent !== "" && exam?.total_year_position_percent != null && yp === null) return { error: "年级位比请输入 0～100", status: 400 };
  if (exam?.total_class_position_percent !== "" && exam?.total_class_position_percent != null && cp === null) return { error: "班级位比请输入 0～100", status: 400 };
  if (exam?.total_actual_score !== "" && exam?.total_actual_score != null && ta === null) return { error: "最终总分请输入有效数字", status: 400 };
  if (exam?.total_raw_score !== "" && exam?.total_raw_score != null && tr === null) return { error: "原始总分请输入有效数字", status: 400 };
  const e1 = rankErr(yr, yn, "年级总排名"),
    e2 = rankErr(cr, cn, "班级总排名");
  if (e1) return { error: e1, status: 400 };
  if (e2) return { error: e2, status: 400 };
  const templates = await subjects(uid),
    dm = new Map<string, number>(templates.map((x: any) => [x.name, x.defaultMax] as [string, number])),
    entries = exam?.scores && typeof exam.scores === "object" ? Object.entries(exam.scores) : [];
  if (entries.length > 40) return { error: "单次考试最多记录 40 个科目/模块", status: 400 };
  const seen = new Set<string>(),
    rows: any[] = [];
  for (const [rawName, rawValue] of entries) {
    const subject = text(rawName);
    if (!subject) return { error: "科目名称不能为空且不能超过 40 个字符", status: 400 };
    if (seen.has(subject)) return { error: `科目「${subject}」重复了`, status: 400 };
    seen.add(subject);
    const item: any = rawValue ?? {},
      target: number | null = score(item.target),
      raw: number | null = score(item.raw),
      max: number = score(item.max) ?? dm.get(subject) ?? 100,
      rawMax: number = score(item.rawMax) ?? max,
      syr: number | null = pint(item.rank),
      syn: number | null = pint(item.participants),
      scr: number | null = pint(item.classRank),
      scn: number | null = pint(item.classParticipants),
      syp: number | null = pct(item.yearPositionPercent),
      scp: number | null = pct(item.classPositionPercent);
    let actual: number | null = score(item.actual);
    if (actual === null && raw !== null && rawMax === max) actual = raw;
    if (max <= 0 || rawMax <= 0) return { error: `${subject} 的满分必须大于 0`, status: 400 };
    if (target !== null && target > max) return { error: `${subject}目标成绩不能超过最终满分 ${max}`, status: 400 };
    if (actual !== null && actual > max) return { error: `${subject}赋分/最终分不能超过最终满分 ${max}`, status: 400 };
    if (raw !== null && raw > rawMax) return { error: `${subject}原始分不能超过原始满分 ${rawMax}`, status: 400 };
    if (item.rank !== "" && item.rank != null && syr === null) return { error: `${subject}年排请输入正整数`, status: 400 };
    if (item.participants !== "" && item.participants != null && syn === null) return { error: `${subject}年级人数请输入正整数`, status: 400 };
    if (item.classRank !== "" && item.classRank != null && scr === null) return { error: `${subject}班排请输入正整数`, status: 400 };
    if (item.classParticipants !== "" && item.classParticipants != null && scn === null) return { error: `${subject}班级人数请输入正整数`, status: 400 };
    if (item.yearPositionPercent !== "" && item.yearPositionPercent != null && syp === null) return { error: `${subject}年级位比请输入 0～100`, status: 400 };
    if (item.classPositionPercent !== "" && item.classPositionPercent != null && scp === null) return { error: `${subject}班级位比请输入 0～100`, status: 400 };
    const yerr = rankErr(syr, syn ?? yn, `${subject}年排`),
      cerr = rankErr(scr, scn ?? cn, `${subject}班排`);
    if (yerr) return { error: yerr, status: 400 };
    if (cerr) return { error: cerr, status: 400 };
    rows.push({
      subject,
      target_score: target,
      raw_score: raw,
      actual_score: actual,
      max_score: max,
      raw_max_score: rawMax,
      rank_position: syr,
      participant_count: syn,
      class_rank_position: scr,
      class_participant_count: scn,
      year_position_percent: syp,
      class_position_percent: scp,
      exclude_from_total: !!item.excludeFromTotal,
    });
  }
  let id = String(exam?.id ?? ""),
    created = false,
    now = new Date().toISOString();
  const values = {
    name,
    exam_date: date,
    grade_level: category,
    total_rank: yr,
    total_participants: yn,
    total_class_rank: cr,
    total_class_participants: cn,
    total_year_position_percent: yp,
    total_class_position_percent: cp,
    total_actual_score: ta,
    total_raw_score: tr,
    is_hidden: !!exam?.is_hidden,
    updated_at: now,
  };
  if (id) {
    const owned = await db.from("score_tracker_exams").select("id").eq("id", id).eq("user_id", uid).maybeSingle();
    if (owned.error) throw owned.error;
    if (!owned.data) return { error: "没有找到这次考试", status: 404 };
    const r = await db.from("score_tracker_exams").update(values).eq("id", id).eq("user_id", uid);
    if (r.error) throw r.error;
  } else {
    const r = await db.from("score_tracker_exams").insert({ user_id: uid, ...values }).select("id").single();
    if (r.error) throw r.error;
    id = r.data.id;
    created = true;
  }
  const del = await db.from("score_tracker_scores").delete().eq("exam_id", id).eq("user_id", uid);
  if (del.error) throw del.error;
  if (rows.length) {
    const ins = await db.from("score_tracker_scores").insert(rows.map((r) => ({ ...r, exam_id: id, user_id: uid, updated_at: now })));
    if (ins.error) throw ins.error;
  }
  const md = await db.from("score_tracker_exam_modules").delete().eq("exam_id", id).eq("user_id", uid);
  if (md.error) throw md.error;
  const rawModuleIds = Array.isArray(exam?.moduleIds)
    ? [...new Set(exam.moduleIds.map((x: any) => String(x ?? "")).filter(Boolean))].slice(0, 12)
    : [];
  if (rawModuleIds.length) {
    const owned = await db.from("score_tracker_modules").select("id").eq("user_id", uid).in("id", rawModuleIds);
    if (owned.error) throw owned.error;
    const valid = (owned.data ?? []).map((x: any) => x.id);
    if (valid.length) {
      // 组合排名：按 module_id 取出并清洗，随 exam_modules 一起保存
      const rawRanks: any = exam?.moduleRanks && typeof exam.moduleRanks === "object" ? exam.moduleRanks : {};
      const moduleRows2 = valid.map((module_id: string, i: number) => {
        const ranks = moduleRanksClean(rawRanks[module_id]);
        return { exam_id: id, user_id: uid, module_id, sort_order: i + 1, ranks: Object.keys(ranks).length ? ranks : null };
      });
      const mi = await db.from("score_tracker_exam_modules").insert(moduleRows2);
      if (mi.error) throw mi.error;
    }
  }
  return { ok: true, id, created };
}

async function changePassword(uid: string, rawPw: unknown) {
  const pw = newPasswordOk(rawPw);
  if (!pw) return { error: "新密码请设置 6～20 位，可使用大小写字母、数字和符号", status: 400 };
  const now = new Date().toISOString();
  const r = await db
    .from("score_tracker_users")
    .update({ password_hash: await hashPasswordV2(pw), updated_at: now })
    .eq("id", uid);
  if (r.error) throw r.error;
  return { ok: true };
}
async function loginV2(body: any) {
  const username = text(body.username, 40);
  const pw = typeof body.password === "string" ? body.password : "";
  if (!username || !pw) return { error: "请输入用户名和密码", status: 400 };
  const cols = "id,username,original_username,is_admin,password_hash";
  let r = await db.from("score_tracker_users").select(cols).eq("username", username).maybeSingle();
  if (r.error) throw r.error;
  if (!r.data) {
    r = await db.from("score_tracker_users").select(cols).eq("original_username", username).maybeSingle();
    if (r.error) throw r.error;
  }
  const u = r.data;
  if (!u || typeof u.password_hash !== "string" || !u.password_hash.startsWith("v2$")) {
    return { error: "用户名或密码不正确", legacy: true, status: 401 };
  }
  if (!(await verifyPasswordV2(u.password_hash, pw))) return { error: "用户名或密码不正确", status: 401 };
  const raw = crypto.getRandomValues(new Uint8Array(32));
  const token = btoa(String.fromCharCode(...raw)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const exp = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
  const ur = await db
    .from("score_tracker_users")
    .update({ session_token_hash: await sha(token), session_expires_at: exp })
    .eq("id", u.id);
  if (ur.error) throw ur.error;
  return { token, user: { id: u.id, username: u.username, is_admin: !!u.is_admin } };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return out({ error: "Method not allowed" }, 405);
  try {
    const body = await req.json().catch(() => ({}));
    if (String(body.action ?? "") === "login_v2") {
      const r = await loginV2(body);
      return r.error ? out({ error: r.error }, r.status ?? 401) : out(r);
    }
    const user = await auth(String(body.token ?? ""));
    if (!user) return out({ error: "登录已失效，请重新登录", code: "UNAUTHORIZED" }, 401);
    const action = String(body.action ?? "");
    if (action === "list_exams" || action === "bootstrap") return out(await list(user));
    if (action === "save_classification") {
      const r = await saveClass(user.id, body.classification);
      return r.error ? out({ error: r.error }, r.status) : out(r);
    }
    if (action === "save_subjects") {
      try {
        const r = await saveSubjects(user.id, body.subjects);
        return r.error ? out({ error: r.error }, r.status) : out(r);
      } catch (e) {
        return out({ error: e instanceof Error ? e.message : "科目设置保存失败" }, 400);
      }
    }
    if (action === "save_exam") {
      const r = await saveExam(user.id, body.exam ?? {});
      return r.error ? out({ error: r.error }, r.status) : out(r);
    }
    if (action === "change_password") {
      const r = await changePassword(user.id, body.newPassword);
      return r.error ? out({ error: r.error }, r.status) : out(r);
    }
    if (action === "toggle_exam_hidden") {
      const id = String(body.examId ?? "");
      if (!id) return out({ error: "缺少考试编号" }, 400);
      const r = await db
        .from("score_tracker_exams")
        .update({ is_hidden: !!body.hidden, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", user.id)
        .select("id,is_hidden")
        .maybeSingle();
      if (r.error) throw r.error;
      if (!r.data) return out({ error: "没有找到这次考试" }, 404);
      return out({ ok: true, examId: id, is_hidden: !!r.data.is_hidden });
    }
    if (action === "delete_exam") {
      const id = String(body.examId ?? "");
      if (!id) return out({ error: "缺少考试编号" }, 400);
      const r = await db.from("score_tracker_exams").delete().eq("id", id).eq("user_id", user.id);
      if (r.error) throw r.error;
      return out({ ok: true });
    }
    return out({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error(e);
    return out({ error: e instanceof Error ? e.message : "服务器暂时开小差了" }, 500);
  }
});