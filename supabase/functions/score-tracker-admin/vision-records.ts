const TABLE = "score_tracker_vision_requests";
const BUCKET = "score-tracker-vision-samples";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Call only after the existing administrator session has been verified.
export async function visionRecords(db: any, query: URLSearchParams) {
  const days = Math.max(1, Math.min(90, Number(query.get("days")) || 7));
  const page = Math.max(1, Math.min(10000, Math.trunc(Number(query.get("page")) || 1)));
  const pageSize = 30;
  const since = new Date(Date.now() - days * 86400000).toISOString();
  let rows = db.from(TABLE).select("request_id,user_id,created_at,completed_at,status,http_status,error_code,error_stage,error_message,model,duration_ms,image_count,source_image_count,storage_status,quota_refunded", { count: "exact" })
    .gte("created_at", since).order("created_at", { ascending: false });
  const status = query.get("status") || "";
  if (["succeeded", "failed", "rejected", "running"].includes(status)) rows = rows.eq("status", status);
  const search = (query.get("search") || "").trim();
  if (search) {
    if (UUID.test(search)) rows = rows.eq("request_id", search);
    else {
      // Resolve a username to IDs; never interpolate raw input into .or().
      const users = await db.from("score_tracker_users").select("id").ilike("username", "%" + search.replace(/[\\%_]/g, "\\$&").slice(0, 80) + "%").limit(50);
      if (users.error) throw users.error;
      rows = rows.in("user_id", (users.data || []).map((user: any) => user.id));
    }
  }
  const [result, summary] = await Promise.all([
    rows.range((page - 1) * pageSize, page * pageSize - 1), db.rpc("score_tracker_vision_summary", { p_since: since }),
  ]);
  if (result.error) throw result.error;
  if (summary.error) throw summary.error;
  const ids = [...new Set((result.data || []).map((row: any) => row.user_id).filter(Boolean))];
  const users = ids.length ? await db.from("score_tracker_users").select("id,username").in("id", ids) : { data: [] };
  if (users.error) throw users.error;
  const names = new Map((users.data || []).map((user: any) => [user.id, user.username]));
  return { rows: (result.data || []).map((row: any) => ({ ...row, username: names.get(row.user_id) || null })),
    total: result.count || 0, page, page_size: pageSize, summary: summary.data, since };
}

export async function visionRecordDetail(db: any, id: string) {
  if (!UUID.test(id)) return null;
  const result = await db.from(TABLE).select("*").eq("request_id", id).maybeSingle();
  if (result.error) throw result.error;
  if (!result.data) return null;
  const row = result.data;
  const images = (Array.isArray(row.images) ? row.images : []).filter((image: any) => typeof image.path === "string" && image.path.startsWith(`${id}/`));
  if (images.length) {
    const signed = await db.storage.from(BUCKET).createSignedUrls(images.map((image: any) => image.path), 300);
    if (signed.error) throw signed.error;
    row.images = images.map((image: any, index: number) => ({ ...image, url: signed.data[index]?.signedUrl || null }));
  }
  return row;
}

export async function deleteVisionRecord(db: any, id: string) {
  if (!UUID.test(id)) return { error: "记录不存在", status: 404 };
  const found = await db.from(TABLE).select("request_id,status,storage_status,images").eq("request_id", id).maybeSingle();
  if (found.error) throw found.error;
  if (!found.data) return { error: "记录不存在", status: 404 };
  if (found.data.status === "running" || found.data.storage_status === "pending") return { error: "这次识别还没有处理完，请稍后再试", status: 409 };
  const paths = (found.data.images || []).map((image: any) => image.path).filter((path: any) => typeof path === "string" && path.startsWith(`${id}/`));
  if (paths.length) {
    const removed = await db.storage.from(BUCKET).remove(paths);
    if (removed.error) throw removed.error;
  }
  const deleted = await db.from(TABLE).delete().eq("request_id", id);
  if (deleted.error) throw deleted.error;
  return { ok: true };
}
