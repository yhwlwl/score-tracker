export const AI_RELEASE='20261115-entry-credits-v1';
// Public capability probe: no sessions, grants, model requests or user data.
export async function aiReleaseCapabilities(db:any){
  try{const r=await db.rpc('score_tracker_ai_release_ready',{});return {release:AI_RELEASE,migration_ready:!r.error&&r.data===true,analysis:false};}
  catch(_){return {release:AI_RELEASE,migration_ready:false,analysis:false};}
}
