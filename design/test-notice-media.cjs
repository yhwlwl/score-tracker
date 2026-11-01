const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const scope={window:{},document:{createElement:()=>({}),head:{appendChild(){}}}};vm.createContext(scope);vm.runInContext(fs.readFileSync('notice-media.js','utf8'),scope);
const media=scope.window.__scoreTrackerNoticeMedia;
const escape=v=>v.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const text=v=>escape(v).replace(/\*\*([\s\S]*?)\*\*/g,'<strong>$1</strong>');
for(const url of ['https://evil.test/photo.jpg','//evil.test/a.png','/assets/announcements/../secret.jpg','/assets/announcements/a.svg','/assets/announcements/a.jpg?x=1','javascript:alert(1)','data:image/png;base64,abc'])assert(!media.imagePath(url),url);
const malicious='![<img src=x onerror=alert(1)>](/assets/announcements/safe.jpg)';
let html=media.markup(malicious,text);assert(html.includes('&lt;img'));assert(!html.includes('<img src=x'));assert(html.includes('aria-expanded="false"'));
html=media.markup('![A](/assets/announcements/a.jpg)\n![B](/assets/announcements/b.webp)\n\n**Hello\nworld**\n[加入](#community-qr)',text);assert.equal((html.match(/class="notice-gallery"/g)||[]).length,1);assert.equal((html.match(/data-notice-image /g)||[]).length,2);assert(html.includes('<strong>Hello\nworld</strong>'));assert(html.includes('data-notice-community-inline'));
assert.equal(media.markup('**旧公告\n换行**',text),text('**旧公告\n换行**'));
assert(!media.markup('![X](https://evil.test/a.jpg)\n<script>alert(1)</script>',text).includes('<img'));assert(!media.markup('<script>alert(1)</script>',text).includes('<script>'));
assert(media.imagePath('/assets/announcements/beta-appearance.svg'));
for(const p of fs.readdirSync('assets/announcements').filter(p=>p.endsWith('.svg'))){const svg=fs.readFileSync('assets/announcements/'+p,'utf8');assert(/^<svg[^>]*><image[^>]*href="data:image\/webp;base64,[A-Za-z0-9+/=]+"\/><\/svg>\n$/.test(svg),p);}
const draft=JSON.parse(fs.readFileSync('assets/announcements/beta-invitation.json','utf8'));assert(draft.announcement_content.length<6000);html=media.markup(draft.announcement_content,text);assert.equal((html.match(/data-notice-image /g)||[]).length,4);for(const match of draft.announcement_content.matchAll(/!\[[^\]]+\]\(([^)]+)\)/g))assert(fs.existsSync('.'+match[1]),match[1]);
console.log('PASS: safe media paths, HTML escaping, grouped screenshots, live QR marker, legacy multiline text and complete draft assets');
