import { readDatabase, safeMessage } from "./reliability.ts";

export const AUDIT_TABLE = "score_tracker_vision_requests";
export const IMAGE_BUCKET = "score-tracker-vision-samples";

export function background(task: Promise<unknown>, requestId = "") {
  const observed = task.catch(error => console.error("vision_audit_error", JSON.stringify({request_id:requestId,message:safeMessage(error?.message || error)})));
  if (typeof EdgeRuntime !== "undefined" && typeof EdgeRuntime.waitUntil === "function") EdgeRuntime.waitUntil(observed);
}

export function imageStats(images: string[], parts: any[], stats: any) {
  return images.map((image, index) => {
    const supplied = Array.isArray(stats) ? stats[index] : null;
    return { ...parts[index], bytes: imageBytes(image), mime: image.slice(5, image.indexOf(";")),
      width: positive(supplied?.width), height: positive(supplied?.height),
      original_width: positive(supplied?.original_width), original_height: positive(supplied?.original_height) };
  });
}
function positive(value: any) { return Number.isInteger(value) && value > 0 && value <= 100000 ? value : null; }
function imageBytes(image: string) {
  const encoded = image.slice(image.indexOf(",") + 1);
  return Math.floor(encoded.length * 3 / 4) - (encoded.endsWith("==") ? 2 : encoded.endsWith("=") ? 1 : 0);
}

export async function saveImages(db: any, requestId: string, userId: string, images: string[], metadata: any[]) {
  const saved: any[] = [], errors: any[] = [];
  // Keep upload memory/concurrency bounded for long screenshots.
  for (let offset = 0; offset < images.length; offset += 2) {
    await Promise.all(images.slice(offset, offset + 2).map(async (image, localIndex) => {
      const index = offset + localIndex, mime = image.slice(5, image.indexOf(";"));
      const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
      const path = `${requestId}/${index}.${ext}`;
      try {
        const binary = atob(image.slice(image.indexOf(",") + 1));
        const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
        const result = await db.storage.from(IMAGE_BUCKET).upload(path, bytes, { contentType: mime, upsert: false, cacheControl: "0" });
        if (result.error) throw result.error;
        saved.push({ index, path, ...metadata[index] });
      } catch (error) { errors.push({ index, message: safeMessage((error as any)?.message || error) }); }
    }));
  }
  const result = await readDatabase(() => db.from(AUDIT_TABLE).update({
    images: saved.sort((a, b) => a.index - b.index), storage_status: errors.length ? saved.length ? "partial" : "failed" : "complete",
    storage_errors: errors,
  }).eq("request_id", requestId));
  if (result.error) throw result.error;
}

export async function startAudit(db: any, row: Record<string, unknown>) {
  const result = await readDatabase(() => db.from(AUDIT_TABLE).insert(row));
  if (result.error?.code === "23505") {
    const existing = await readDatabase(() => db.from(AUDIT_TABLE).select("request_id,user_id,status,result,http_status,error_code,error_message,quota_consumed")
      .eq("request_id", row.request_id).eq("user_id", row.user_id).maybeSingle());
    if (existing.error) throw existing.error;
    if (!existing.data) throw new Error("request_id_conflict");
    return { existing: existing.data };
  }
  if (result.error) throw result.error;
  return { existing: null };
}

export async function finishAudit(db: any, requestId: string, row: Record<string, unknown>) {
  const result = await readDatabase(() => db.from(AUDIT_TABLE).update({ ...row, completed_at: new Date().toISOString() }).eq("request_id", requestId));
  if (result.error) throw result.error;
  if (row.status === "failed") {
    const refund = await readDatabase(() => db.rpc("score_tracker_vision_refund", { p_request_id: requestId }));
    if (refund.error) throw refund.error;
    return !!refund.data;
  }
  return false;
}
