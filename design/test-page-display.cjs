const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),p=require('../page-display.js');
assert.equal(p.ids.length,15);
assert.deepEqual(p.normalize({hidden:['home-overview','home-goal']}),['home-goal']);
for(const [mode,n] of [['simple',11],['standard',4],['full',0]]){assert.equal(p.presetHidden(mode).length,n);assert.equal(p.currentMode(p.presetHidden(mode)),mode);}
assert.equal(p.charts.length,6);
assert.deepEqual(p.normalizePins(['best','bad','best','quad']),['best','quad']);
assert.deepEqual(p.setPin(['best'],'quad',true),['best','quad']);
assert.deepEqual(p.setPin(['best','quad'],'best',false),['quad']);
assert.deepEqual(p.movePin(['best','quad'],'quad',-1),['quad','best']);
assert.deepEqual(p.movePin(['best','quad'],'best',-1),['best','quad']);
assert.notEqual(p.storageKey('a'),p.storageKey('b'));
const src=fs.readFileSync(path.join(__dirname,'../app-v32.js'),'utf8');
for(const marker of ['id="sv31Quad"','id="sv31Scissor"','个人最佳殿堂','进步速度榜','worth-matrix-scroll','你的总分常落在哪个区间'])assert.ok(src.includes(marker),marker);
assert.ok(fs.readFileSync(path.join(__dirname,'../app-v5.js'),'utf8').includes('let html = homeHtmlV3();'));
console.log('PASS: display preferences, chart pins, order, migration and renderer source anchors');

// Unified responsive board: source order is stable and no half-row is left empty.
const layoutCases=[[["trend","quick","recent","radar","quad","compare","matrix","distribution"],[2,1,1,1,1,2,2,2]],[["trend","quick","radar","matrix"],[2,2,2,2]],[["trend","radar","quad","compare","distribution"],[2,1,1,1,1]],[["trend","recent","distribution"],[2,2,2]],[["trend","matrix","best","speed"],[2,2,2,2]],[["trend","quick","recent","radar"],[2,1,1,2]],[["trend","quad","matrix","compare","distribution"],[2,2,2,1,1]],[[],[]]];
for(const [keys,expected] of layoutCases)assert.deepEqual(p.layoutSpans(keys),expected);
const kinds=["quick","recent","radar","quad","compare","best","speed","matrix","distribution"];
for(let mask=0;mask<(1<<kinds.length);mask++){const visible=kinds.filter((_,i)=>mask&(1<<i));for(const order of [visible,visible.slice().reverse()]){let fill=0;for(const span of p.layoutSpans(['trend',...order])){fill+=span;assert.ok(fill<=2);if(fill===2)fill=0;}assert.equal(fill,0);}}
console.log('PASS: 1024 visibility/order combinations, no partial grid row');

assert.ok(p.presets.standard.includes('home-latest-subjects'));
assert.ok(p.presets.simple.includes('home-latest-subjects'));
assert.deepEqual(p.toggle([], 'home-latest-subjects', false), ['home-latest-subjects']);
const exam={name:'<期中>',exam_date:'2026-10-25',scores:{语文:{actual:105,max:150},数学:{actual:0,max:150},英语:{raw:110,rawMax:150,max:100},物理:{target:90,max:100},组合:{actual:105,max:200},统计:{actual:5,max:10,excludeFromTotal:true}}};
const api={effective:e=>['语文','数学','英语'],modules:()=>new Set(['组合']),rank:(e,s,c)=>c==='class'?{rank:7,participants:50}:{rank:124,participants:824},average:(e,s,c)=>c==='class'?221:195.7,score:(e,s)=>e.scores[s].actual??e.scores[s].raw??null,max:()=>100,format:v=>String(Number(v.toFixed(1))),date:x=>x};
let metric={exam,label:'最近一次真实总分',value:280,delta:-9.5,deltaLabel:'较上次同口径',comparison:'有效均分'};
let model=p.recentModel(metric,api),markup=p.recentHtml(metric,model,api);
assert.deepEqual(model.subjects.map(s=>s.name),['语文','数学','英语','统计']);
assert.equal(model.subjects[1].value,0);assert.equal(model.subjects[2].max,150);assert.equal(model.subjects[2].raw,true);
assert.equal(model.ranks[0].percent,14);assert.equal(model.ranks[1].diff,84.3);
assert.ok(markup.includes('&lt;期中&gt;')&&markup.includes('较上次同口径')&&markup.includes('pd-recent-down'));
let only={...metric,exam:{name:'单科',scores:{语文:{actual:105,max:150}}},comparison:''};
let m=p.recentModel(only,{...api,effective:()=>['语文'],rank:()=>({rank:7,participants:null})});
assert.equal(m.subject,'语文');assert.equal(m.subjects.length,0);assert.equal(m.ranks[0].percent,null);assert.equal(m.ranks[0].diff,null);
m=p.recentModel({...only,exam:{...only.exam,total_actual_score:105}},{...api,effective:()=>['语文'],rank:()=>({directPercent:true,positionPercent:12})});
assert.equal(m.subject,'总分');assert.equal(m.ranks[0].percent,12);
m=p.recentModel(metric,{...api,rank:()=>({}),average:()=>null});
assert.equal(m.ranks.length,0);
console.log('PASS: latest exam score, ranked scopes, missing data, zero scores, raw maximum and manual total');
