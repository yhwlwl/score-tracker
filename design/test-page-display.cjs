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
for(const marker of ['id="sv31Quad"','id="sv31Scissor"','个人最佳殿堂','进步速度榜','worth-matrix-scroll','data-matrix-distribution-heading'])assert.ok(src.includes(marker),marker);
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


const v=p.normalizeSlogan({mode:'bogus',text:'  '+ '😀'.repeat(100)+'  ',offset:-1});
assert.equal(v.mode,'default');assert.ok(Array.from(v.text).length<=80);assert.equal(v.offset,p.dailySlogans.length-1);
assert.equal(p.sloganText({mode:'off'}),'');assert.equal(p.sloganText({mode:'custom',text:' <b>自己的话</b> '}),'<b>自己的话</b>');
assert.equal(p.sloganText({mode:'custom',text:''}),p.sloganText({mode:'default'}));
const date=new Date(2026,10,21,10,30),daily=p.sloganText({mode:'daily'},date);
assert.equal(p.sloganText({mode:'daily'},new Date(2026,10,21,23,59)),daily);
assert.notEqual(p.sloganText({mode:'daily'},new Date(2026,10,22,0,0)),daily);
assert.notEqual(p.sloganText({mode:'daily',offset:1},date),daily);
assert.equal(p.dailySlogans.length,56);
assert.equal(new Set(p.dailySlogans).size,p.dailySlogans.length);
assert.ok(p.dailySlogans.every(q=>typeof q==='string'&&Array.from(q).length>0&&Array.from(q).length<=40));
const cycle=new Set(Array.from({length:p.dailySlogans.length},(_,i)=>p.sloganText({mode:'daily'},new Date(2026,0,i+1,12))));
assert.equal(cycle.size,p.dailySlogans.length);
assert.ok(!p.dailySlogans.includes('不必急着证明自己。'));
for(const id of [...p.ids,...p.charts.map(c=>c[0])])assert.match(p.previewArt(id),/<svg[^>]*>.+<\/svg>/);
assert.ok(p.previewArt('compare').includes('stroke-dasharray'));
assert.ok(p.previewArt('distribution').includes('circle'));
assert.ok(!p.previewArt('home-latest-subjects').includes('opacity="0.08"'));
console.log('PASS: slogan modes, daily rotation, unicode length, 21 chart previews');

assert.ok(p.previewArt('home-summary').includes('达标'));assert.ok(p.previewArt('stats-worth').includes('参考分'));
assert.ok(p.previewArt('stats-comp').includes('stroke-dasharray'));

(function(){
  function element(doc){
    return {ownerDocument:doc,children:[],attrs:new Map(),className:'',classList:{add(){}},textContent:'',hidden:false,mutations:0,
      querySelector(s){return this.children.find(x=>'.'+x.className===s)||null;},
      setAttribute(k,v){this.attrs.set(k,v);},toggleAttribute(k,v){if(v)this.attrs.set(k,'');else this.attrs.delete(k);},
      replaceChildren(...x){this.children=x;this.mutations++;}
    };
  }
  const doc={createElement(){return element(doc);}};
  const node=element(doc);
  p.renderQuote(node,'山有来路，海有归途。',false);
  assert.equal(node.children[0].attrs.get('aria-hidden'),'true');
  assert.equal(node.children[1].textContent,'山有来路，海有归途。');
  const text=node.children[1];
  p.renderQuote(node,'山有来路，海有归途。',false);
  assert.equal(node.children[1],text);assert.equal(node.mutations,1);
  p.renderQuote(node,'<img src=x onerror=alert(1)>',false);
  assert.equal(text.textContent,'<img src=x onerror=alert(1)>');assert.equal(text.children.length,0);
  p.renderQuote(node,'长'.repeat(80),false);assert.ok(node.attrs.has('data-quote-long'));
  p.renderQuote(node,'',false);assert.equal(node.hidden,true);assert.ok(!node.attrs.has('data-quote-long'));
  p.renderQuote(node,'新的一句。',false);assert.equal(node.hidden,false);
  console.log('PASS: safe quote text, decorative accessibility, hidden state and stable rendering');
})();

(function(){
  const f={subjects:['数学','物理','化学'],series:{数学:[{pos:10}],物理:[{rate:80}],化学:[{actual:null}]},valid:{数学:[{i:0,pos:10,cls:8,N:100,actual:90}]},exams:[{name:'月考'}],totalSeries:[{pos:50}],overallLatest:50};
  assert.deepEqual(p.chartSubjects(f),['数学','物理']);
  assert.equal(p.chartSelection('s:数学',p.chartSubjects(f)),'s:数学');
  assert.equal(p.chartSelection('s:化学',p.chartSubjects(f)),'');
  assert.equal(p.chartDefaultLabel('compare'),'总分');
  assert.equal(p.chartDefaultLabel('distribution'),'总分');
  assert.equal(p.chartDefaultLabel('matrix'),'全部科目');
  assert.deepEqual(p.charts.filter(c=>p.chartHasSubjectFilter(c[0])).map(c=>c[0]),['compare','distribution']);
  const scopes=p.normalizeChartScopes({compare:'s:数学',distribution:'s:英语',matrix:'s:物理',best:'s:数学',quad:'s:物理',speed:'s:化学',bad:'s:化学'});
  assert.deepEqual({...scopes},{compare:'s:数学',distribution:'s:英语'});
  const scoped=p.rankChartScope(f,'数学');
  assert.equal(scoped.totalSeries[0].pos,10);
  assert.equal(scoped.totalSeries[0].cls,8);
  assert.equal(scoped.totalSeries[0].name,'月考');
  assert.equal(scoped.overallLatest,10);
  assert.equal(f.totalSeries[0].pos,50);
  assert.deepEqual(f.subjects,['数学','物理','化学']);
  assert.equal(p.rankChartScope(f,'物理').scopeMissing,true);
  assert.deepEqual(p.rankChartScope(f,'物理').totalSeries,[]);
  console.log('PASS: independent chart scopes, missing subjects, true subject rankings and unchanged base data');
})();

metric.exam.id='fixture-exam'; metric.exam.reflection='<img src=x>\n私人笔记'; markup=p.recentHtml(metric,model,api); assert(markup.includes('data-home-reflection="fixture-exam"')); assert(markup.includes('&lt;img src=x&gt; 私人笔记')); assert(!markup.includes('<img src=x>')); metric.exam.reflection=' '; assert(p.recentHtml(metric,model,api).includes('写反思')); console.log('PASS: reflection entry, escaped preview and empty state');
