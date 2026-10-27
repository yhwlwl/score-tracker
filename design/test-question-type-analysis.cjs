const assert=require('node:assert/strict');
const M=require('../question-type-analysis-model.js'),Q=require('../supabase/functions/_shared/question-types.js');
const exam=(id,rows,rest={})=>({id:String(id),exam_date:'2026-10-'+String(id).padStart(2,'0'),scores:{英语:{actual:80,max:100,rawMax:100}},question_type_scores:{英语:rows},...rest});
const row=(name,score,max,extra={})=>({name,score,max,...extra});
const analyze=(exams,o={})=>M.analyze(exams,{subject:'英语',group:'type',...o});
// Unequal paper maxima use weighted score rates. Missing is not a zero-score occurrence.
let r=analyze([exam(2,[row('阅读',30,50)]),exam(1,[row('阅读',0,10),row('作文',null,40)]),exam(3,[])]);
assert.equal(r.rows.find(g=>g.name==='阅读').rate,.5);
assert.equal(r.rows.find(g=>g.name==='阅读').frequency,1);
assert.equal(r.rows.find(g=>g.name==='作文').rate,null);
assert.equal(r.rows.find(g=>g.name==='作文').contribution,null);
assert.equal(r.rows.find(g=>g.name==='作文').cells[0].complete,false);
assert.equal(r.rows[0].cells[2],null);
assert.equal(r.totalLost,30);assert.equal(r.coverage,.2);assert.equal(r.recorded,2);
assert.equal(r.exams[0].id,'1');assert.equal(r.rows[0].change,null);
// Same type and different positions can be combined, but cannot be counted twice.
const positions=[row('阅读',4,10,{position:'A',difficulty:'easy'}),row('阅读',20,30,{position:'B',difficulty:'hard'})];
assert.equal(Q.clean(positions).length,2);
assert.throws(()=>Q.clean([...positions,row('阅读',24,40)]),/合计/);
assert.throws(()=>Q.clean([positions[0],positions[0]]),/重复/);
r=analyze([exam(1,positions)]);assert.equal(r.rows.length,1);assert.equal(r.rows[0].rate,.6);assert.equal(r.rows[0].difficulty,'mixed');
r=analyze([exam(1,positions)],{group:'position'});assert.equal(r.rows.length,2);assert.equal(r.totalLost,16);
r=analyze([exam(1,[positions[0],row('阅读',null,30,{position:'B'})])]);assert.equal(r.rows[0].count,0);assert.equal(r.rate,null,'partial sums are excluded');
// Missing subject, hidden, category, duplicate ID and temporal scope.
const ex=[exam(1,positions,{grade_level:'高二'}),exam(2,positions,{grade_level:'高三'}),exam(3,positions,{is_hidden:true}),exam(4,positions,{scores:{数学:{actual:80,max:100}}}),exam(5,positions)];
assert.equal(analyze([...ex,ex[0]]).exams.length,3);
assert.equal(analyze(ex,{category:'高三'}).exams.length,1);
assert.equal(analyze(ex,{category:''}).exams.length,1);
assert.equal(analyze(ex,{includeHidden:true,limit:2}).exams[0].id,'3');
// Four observations minimum and disjoint windows; last two improve by 50 percentage points.
r=analyze([0,2,6,6].map((s,i)=>exam(i+1,[row('填空',s,10)])));
assert.equal(r.rows[0].change,.5);
// Unknown difficulty must not be inferred from a zero mark; partial metadata is not confirmed.
r=analyze([exam(1,[row('填空',0,10)])]);assert.equal(r.rows[0].rankDifficulty,null);
r=analyze([exam(1,[row('填空',5,10,{difficulty:'easy'})]),exam(2,[row('填空',5,10)])]);assert.equal(r.rows[0].rankDifficulty,null);
// Raw and assigned marks never mix in the student profile/target inference.
r=analyze([exam(1,positions,{scores:{英语:{actual:65,max:70,rawMax:100,target:68}}})]);assert.equal(r.levelRate,null);assert.equal(r.targetRate,null);
r=analyze([exam(1,positions,{scores:{英语:{actual:65,max:70,raw:80,rawMax:100,target:68}}})]);assert.equal(r.levelRate,.8);
// Different perspectives genuinely change priorities, including a low-value hard item.
const history=[1,2,3,4].map(i=>exam(i,[row('基础填空',6,15,{difficulty:'easy',cause:'careless'}),row('压轴小问',4,5,{difficulty:'hard',cause:'method'})]));
r=analyze(history,{level:'advanced',targetRate:95});
assert.equal(M.ranked(r,'quick')[0].name,'基础填空');assert.equal(M.ranked(r,'breakthrough')[0].name,'压轴小问');assert.equal(r.recommended,'breakthrough');
assert.equal(r.rows.reduce((s,g)=>s+g.contribution,0),1);
assert.equal(analyze(history,{level:'foundation',targetRate:95}).recommended,'quick');
// Blank, invalid, zero/full scores and prototype-looking names remain safe.
r=analyze([exam(1,[row('__proto__',0,10),row('全对',10,10),row('错值',20,10),row('空白',' ',10)])]);assert.equal(r.rows.find(g=>g.name==='全对').frequency,0);assert.equal(r.incomplete,2);assert.equal(r.rate,.5);
assert.equal(analyze([]).rate,null);assert.equal(analyze([]).coverage,null);
assert.deepEqual(Q.clean([row('作文',0,10,{difficulty:'hard',cause:'time',position:'末题'})])[0],row('作文',0,10,{difficulty:'hard',cause:'time',position:'末题'}));
console.log('PASS: weighted rates, null/zero, coverage, contribution, frequency, positions, scope, raw marks, uncertainty and perspective ranking');
