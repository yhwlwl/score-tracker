const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const context = { window: {} }; vm.runInNewContext(fs.readFileSync('exam-changes.js', 'utf8'), context);
const build = (exam, history, options = {}) => context.window.ScoreExamChanges.build(exam, history, options, model);
const rank = (score, scope) => { const n = score[scope === 'year' ? 'rank' : 'classRank'] ?? null, count = score[scope === 'year' ? 'participants' : 'classParticipants'] ?? null, direct = score[scope === 'year' ? 'percent' : 'classPercent'] ?? null; return { n, count, invalid: n !== null && count !== null && n > count, percent: n !== null && count !== null && n > count ? null : direct ?? (n !== null && count ? n / count * 100 : null) }; };
function model(exam) {
  const rows = Object.entries(exam.scores || {}).map(([name,s]) => ({ name, actual:s.actual??null,max:s.max??null,rate:s.actual!=null && s.max>0 && s.actual>=0 && s.actual<=s.max?s.actual/s.max*100:null,excluded:!!s.excludeFromTotal,year:rank(s,'year'),class:rank(s,'class') }));
  const included=rows.filter(s=>!s.excluded),complete=included.length>0&&included.every(s=>s.actual!==null),max=included.reduce((a,s)=>a+(s.max||0),0),total=included.reduce((a,s)=>a+(s.actual||0),0);
  return {rows,included,complete,total,max,manual:exam.manual||false,rate:complete&&included.every(s=>s.rate!==null)&&max>0?total/max*100:null,year:rank(exam,'year'),class:rank(exam,'class')};
}
const old={id:'old',name:'一测',exam_date:'2026-10-01',grade_level:'高二',rank:60,participants:500,scores:{数学:{actual:80,max:100,rank:60,participants:500,classRank:8,classParticipants:50},英语:{actual:100,max:150,rank:40,participants:500},物理:{actual:0,max:100,rank:100,participants:500}}};
const now={id:'now',name:'二测',exam_date:'2026-10-20',grade_level:'高三',rank:20,participants:100,scores:{数学:{actual:120,max:150,rank:20,participants:100,classRank:10,classParticipants:50},英语:{actual:95,max:150,rank:45,participants:100},物理:{actual:0,max:100,rank:100,participants:100},生物:{rank:3,participants:100}}};
let d=build(now,[old,now],{metric:'rank'});assert.equal(d.points.find(s=>s.name==='数学').value,40);assert.equal(d.total.value,40);assert.equal(d.points.find(s=>s.name==='英语').value,-5);assert.equal(d.points.find(s=>s.name==='物理').value,0);
d=build(now,[old],{metric:'position'});assert.equal(d.points.find(s=>s.name==='数学').value,-8,'different populations can reverse movement; never pretend ranks and position are the same');assert.equal(d.total.value,-8);
d=build(now,[old],{metric:'rank',scope:'class'});assert.equal(d.points.length,1);assert.equal(d.points[0].value,-2,'class never mixes with year');
d=build(now,[old],{metric:'score'});assert.equal(d.points.length,2);assert.equal(d.points[0].value,-5);assert.equal(d.points[1].value,0,'zero is a real score');assert.equal(d.total,null);assert(d.missing.some(s=>s.name==='数学'&&s.reason.includes('满分')));
d=build(now,[old],{metric:'rate'});assert.equal(d.points.find(s=>s.name==='数学').value,0);assert.equal(d.total,null,'different total compositions must not imply a total-rate comparison');
const same={...now,scores:{数学:{actual:95,max:100},英语:{actual:103,max:150},物理:{actual:0,max:100}}};d=build(same,[old]);assert.equal(d.total.value,18);assert.equal(d.points.reduce((n,p)=>n+p.value,0),18);
assert.equal(build({...same,manual:true},[old]).total,null);assert.equal(build({...same,scores:{数学:{max:100},英语:{actual:103,max:150}}},[old]).total,null);
const missing={...old,scores:{数学:{rank:50},英语:{percent:0}}};d=build(now,[missing],{metric:'rank'});assert.equal(d.points[0].value,30,'missing population still permits ordinal rank');d=build({...now,scores:{英语:{percent:0}}},[missing],{metric:'position'});assert.equal(d.points[0].value,0,'direct zero percent is valid');
assert.equal(build({...now,scores:{数学:{rank:101,participants:100}}},[old],{metric:'rank'}).points.length,0);
assert.equal(build({...now,scores:{数学:{rank:20}}},[{...old,scores:{数学:{rank:40,excludeFromTotal:true}}}],{metric:'rank'}).points.length,0);
assert.equal(build(now,[old],{metric:'rank',sameCategory:true}).previous,null,'same category is opt-in');
const traps=[{...old,id:'hidden',is_hidden:true,exam_date:'2026-10-19'},{...old,id:'same',exam_date:now.exam_date},{...old,id:'future',exam_date:'2026-10-21'},{...old,id:'invalid',exam_date:'2026-02-30'}];assert.equal(build(now,[...traps,old],{metric:'rank'}).previous.id,'old');
const newer={...old,id:'newer',exam_date:'2026-10-12',scores:{数学:{rank:25}}};assert.equal(build(now,[old,newer],{metric:'rank'}).previous.id,'newer');assert.equal(build(now,[newer,old],{metric:'rank',compareId:'old'}).previous.id,'old');
assert.equal(build({...same,exam_date:'2026-02-30'},[old]).previous,null);
console.log('PASS: rank independent of maxima and scores, ordinal/position population changes, scopes, rates, complete comparable totals, zeros, missing/invalid data, category/date/visibility and selected baseline');
