const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const manifest = JSON.parse(fs.readFileSync('assets/public-assets.json', 'utf8'));
const local = Object.keys(manifest).find(p => p.includes('/community/community-qr-'));
const remote = 'https://assets.tantantan.tech' + manifest[local].remote;
const events = {}, downloads = [], requests = [], timeouts = [];
let failRemote = false, failLocal = false, badType = false;
class TestURL extends URL { static createObjectURL() { return 'blob:verified-image'; } static revokeObjectURL() {} }
const document = {documentElement:{}, querySelectorAll:()=>[], body:{appendChild(){}}, createElement:()=>({click(){downloads.push({href:this.href, name:this.download});}, remove(){}})};
const window = {addEventListener(type, callback){events[type] = callback;}};
const scope = {window, document, location:{href:'https://score.yhwlwl.xyz/', origin:'https://score.yhwlwl.xyz'}, URL:TestURL, WeakMap, Array, AbortController, MutationObserver:class {observe(){}}, setTimeout(fn){timeouts.push(fn);return timeouts.length;}, clearTimeout(){}, fetch:async (target, options)=>{
  requests.push({target,options});
  if (target.startsWith('https://assets.') && failRemote || target.startsWith('/') && failLocal) throw Error('offline');
  return {ok:true,headers:{get:()=>badType?'text/html':'image/jpeg'},blob:async()=>({size:123,type:'image/jpeg'})};
}};
vm.createContext(scope); vm.runInContext(fs.readFileSync('public-assets.js','utf8'),scope);
const assets = window.__scoreTrackerAssets;
assert.equal(assets.url(local),remote);
assert.equal(assets.url('https://score.yhwlwl.xyz'+local),remote);
for (const path of ['/storage/private/paper.jpg','https://evil.example/paper.jpg','//evil.example/photo.png','data:image/png;base64,AA==',local+'?token=private','/assets/announcements/unknown.svg']) assert.equal(assets.url(path),path);
assert(assets.attributes(local).includes('crossorigin="anonymous"'));
assert(assets.attributes(local).includes('referrerpolicy="no-referrer"'));
assert(!assets.attributes('" onerror="alert(1)').includes('src="" onerror='));
const attrs = {'src':remote,'data-st-asset-local':local};
const img = {tagName:'IMG', getAttribute:k=>attrs[k]||null, setAttribute:(k,v)=>attrs[k]=v, removeAttribute:k=>delete attrs[k], set src(v){attrs.src=v;}};
let intercepted = false;
events.error({target:img,stopImmediatePropagation(){intercepted=true;}});
assert(intercepted); assert.equal(attrs.src,local); assert.equal(attrs['data-st-asset-retried'],'1');
intercepted=false; events.error({target:img,stopImmediatePropagation(){intercepted=true;}}); assert.equal(intercepted,false,'feature receives an error only after fallback fails');
(async()=>{
  await assets.save(local,'group.jpg'); assert.equal(downloads.at(-1).href,'blob:verified-image');
  assert.equal(requests.at(-1).target,remote); assert.equal(requests.at(-1).options.credentials,'omit');
  failRemote=true; await assets.save(local,'group.jpg'); assert.equal(requests.at(-1).target,local); assert.equal(requests.at(-1).options.credentials,'same-origin');
  const before=downloads.length; failLocal=true; await assert.rejects(assets.save(local,'group.jpg')); assert.equal(downloads.length,before);
  failRemote=false;failLocal=false;badType=true;await assert.rejects(assets.save(local,'group.jpg')); assert.equal(downloads.length,before);
  const beforeRequests=requests.length;await assets.save('data:image/jpeg;base64,AA==','old.jpg');assert.equal(requests.length,beforeRequests);assert.equal(downloads.at(-1).href,'data:image/jpeg;base64,AA==');
  console.log('PASS: exact public allowlist; private/signed URLs untouched; one image fallback; anonymous CORS blob download; original-site fallback; failed/HTML responses rejected; legacy QR retained');
})().catch(e=>{console.error(e);process.exitCode=1;});
