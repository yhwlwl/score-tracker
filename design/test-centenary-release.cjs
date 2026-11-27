const assert=require('node:assert/strict'),fs=require('node:fs'),{eligible,shouldPrompt,NOTICE_ID}=require('../centenary-release.js');
const ready={published:true,eligible:true,paused:false,published_at:'2026-11-29T00:00:00Z',seen_at:null};
for(const d of [null,{}, {...ready,published:false},{...ready,eligible:false},{...ready,paused:true},{...ready,published_at:null}]){assert(!eligible(d));assert(!shouldPrompt(d,false))}
assert(eligible(ready));assert(shouldPrompt(ready,false));assert(!shouldPrompt(ready,true));assert(!shouldPrompt({...ready,seen_at:'2026-11-29T00:01:00Z'},false));
const js=fs.readFileSync('centenary-release.js','utf8'),sql=fs.readFileSync('design/centenary/manual-publish.sql','utf8');
assert(js.includes("api('centenary_status'")&&js.includes("api('centenary_seen'"));assert(!/centenary_preview|centenary_refresh|armed=true/.test(js));
assert(js.includes('data:image/webp;base64,UklGR'));assert(fs.readFileSync('index.html','utf8').includes('centenary-release.js'));assert(fs.readFileSync('tools/cf-build.js','utf8').includes('"centenary-release.js"'));
assert(sql.includes('a<10000 or e<1000000')&&sql.includes('set armed=false')&&sql.includes("on conflict(user_id,badge_id) do nothing")&&sql.includes(NOTICE_ID));assert(!/cron\.schedule\(/.test(sql));
console.log('PASS centenary visibility gates, asset inclusion, manual release safeguards');
