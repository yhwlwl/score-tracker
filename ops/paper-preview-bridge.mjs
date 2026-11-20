// Preview-only fallback when the Edge region cannot reach the ECS directly.
// The Worker accepts only a server-signed capability and a fixed destination.
const PUBLIC_KEY = 'MCowBQYDK2VwAyEA7JtwHhWMyR/YVIk1XmeZtx/19Cq1LycLMd3FBTnksBE=';
const TARGET = 'https://assets.tantantan.tech/paper-preview-read';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const decode = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const denied = () => new Response('unavailable', {status:404,headers:{'Cache-Control':'no-store'}});
export function makeBridge(publicKey = PUBLIC_KEY, fetcher = fetch) {
  let imported;
  return async function (request) {
    try {
      if (request.method !== 'POST' || new URL(request.url).pathname !== '/read' || Number(request.headers.get('content-length') || 0) > 2048) return denied();
      if (!request.body) return denied();
      const reader = request.body.getReader(), chunks = []; let size = 0;
      for (;;) { const {done,value} = await reader.read(); if (done) break; size += value.byteLength; if (size > 2048) { await reader.cancel(); return denied(); } chunks.push(value); }
      const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk,offset); offset += chunk.byteLength; }
      const raw = new TextDecoder().decode(bytes);
      const body = JSON.parse(raw), {request_id:id, asset, token, signature} = body;
      if (!uuid.test(id || '') || !uuid.test(asset || '') || !/^[A-Za-z0-9_-]{43}$/.test(token || '') || !/^[A-Za-z0-9_-]{86}$/.test(signature || '')) return denied();
      imported ||= crypto.subtle.importKey('spki', decode(publicKey), {name:'Ed25519'}, false, ['verify']);
      const sig = decode(signature.replace(/-/g,'+').replace(/_/g,'/') + '==');
      if (!await crypto.subtle.verify('Ed25519', await imported, sig, new TextEncoder().encode(`scoretracker-paper-bridge-v1\n${id}\n${asset}\n${token}`))) return denied();
      const url = new URL(TARGET); url.searchParams.set('request_id',id); url.searchParams.set('asset',asset); url.searchParams.set('token',token);
      const result = await fetcher(url, {redirect:'manual', signal:AbortSignal.timeout(15000), headers:{Accept:'image/*'}});
      const mime = (result.headers.get('content-type') || '').split(';')[0];
      if (!result.ok || !['image/jpeg','image/png','image/webp'].includes(mime) || Number(result.headers.get('content-length') || 0) > 2100000) return denied();
      return new Response(result.body, {headers:{'Content-Type':mime,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
    } catch (_) { return denied(); }
  };
}
const handler = makeBridge();
export default {fetch:handler};
