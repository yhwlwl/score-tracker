const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../app-v32.js'),'utf8');
const win={addEventListener(){},matchMedia(){return {matches:false}}},state={sv31:{scope:'__all__'},subjectConfigs:[{name:'数学'},{name:'语文'}],modulesV18:[{id:'m',name:'组合',subjects:['数学','语文']}],allExams:[],exams:[]},doc={readyState:'loading',addEventListener(){},getElementById(){return null},documentElement:{clientWidth:1024,getAttribute(){return null}}};
new Function('window','state','document','localStorage',source)(win,state,doc,{getItem(){return null}});
const api=win.__v32;
const exam=(id,math,yr,cls)=>({id,name:id,exam_date:'2026-10-0'+id,grade_level:'高二',total_actual_score:math+120,total_target_score:220,total_rank:yr+15,total_participants:100,total_class_rank:cls+3,total_class_participants:50,scores:{数学:{actual:math,max:100,target:95,rank:yr,participants:100,classRank:cls,classParticipants:50},语文:{actual:120,max:150,target:125,rank:45,participants:100}},moduleRanks:{m:{yearRank:yr+15,yearParticipants:100,classRank:cls+3,classParticipants:50}}});
const es=[exam('1',90,10,5),exam('2',95,8,4),exam('3',96,7,3)];
state.allExams=es.concat({...exam('4',89,11,6),grade_level:'高一'});state.exams=es.slice(0,1);
assert.equal(api.visibleExams(false).length,4);assert.equal(api.scopeFilter(api.visibleExams(false),'高二').length,3);
state.sv31.subjMod=['数学'];
let f=api.applySubjectModule(api.buildFeatures(es));
assert.equal(f.totalLabel,'数学');assert.equal(f.overallLatest,7);assert.equal(f.latestScore,96);assert.equal(f.scoreSeries.length,3);assert.equal(f.subjects.length,1);
const kpi=api.kpi(f,'combined');assert.match(kpi,/数学 · 最近得分/);assert.match(kpi,/前7%/);assert.match(kpi,/班级排名/);assert.match(kpi,/得分率/);
const trend=api.trend(f,'combined');assert.match(trend,/data-pane="rank"/);assert.match(trend,/data-pane="score"/);assert.match(trend,/data-pane="class"/);
state.sv31.matrixMetricV60='score';assert.match(api.matrix(f,'combined'),/96%/);assert.equal(state.sv31.trendMetricV60,undefined);
const missing=api.applySubjectModule(api.buildFeatures(es.map(e=>({...e,scores:{语文:e.scores.语文}}))));assert.equal(missing.totalSeries.length,0);assert.equal(missing.latestScore,null);
state.subjectConfigs=[{name:'数学'}];f=api.applySubjectModule(api.buildFeatures(es.map(e=>({...e,scores:{数学:e.scores.数学}}))));assert.equal(f.totalLabel,'数学');assert.equal(f.overallLatest,7);
const c=api.scopedScore({scores:{数学:{actual:90}}},{analysisSelection:['数学']});assert.equal(c.actual,90);assert.equal(c.rate,null);
state.sv31={scope:'__all__',subjMod:['数学','语文'],subjModule:'m'};f=api.applySubjectModule(api.buildFeatures(es));assert.equal(f.totalLabel,'组合');assert.equal(f.overallLatest,22);assert.equal(f.latestScore,216);assert.equal(api.scopedScore(es[2],f).rate,86.4);
state.sv31={subjMod:['数学']};f=api.applySubjectModule(api.buildFeatures(es.map(e=>({...e,total_rank:null,total_class_rank:null,scores:{数学:{actual:e.scores.数学.actual,max:100}}}))));assert.equal(f.totalSeries.length,0);assert.equal(f.latestScore,96);assert.match(api.trend(f,'combined'),/data-pane="score"/);assert.match(api.matrix(f,'combined'),/96%/);
console.log('PASS: analysis scope and independent score/rank rendering');

// Follow-up: selected metrics remain local, unavailable default metrics fall back.
state.sv31={subjMod:['数学'],trendMetricV60:'rank',matrixMetricV60:'rank'};
f=api.applySubjectModule(api.buildFeatures(es.map(e=>({...e,total_rank:null,total_class_rank:null,scores:{数学:{actual:e.scores.数学.actual,max:100}}}))));
assert.match(api.trend(f,'combined'),/sv31-pane on" data-pane="score"/);
assert.match(api.matrix(f,'combined'),/data-analysis-matrix-v60="score" aria-pressed="true"/);
assert.match(api.trend(f,'combined'),/得分率参考/);
assert.match(api.hall(f,'rank'),/96<\/b><small class="hall-max-v32">\/100/);
state.sv31={subjMod:['数学'],trendMetricV60:'score',matrixMetricV60:'score'};
f=api.applySubjectModule(api.buildFeatures(es.map(e=>({...e,total_rank:null,total_actual_score:null,scores:{数学:{classRank:e.scores.数学.classRank,classParticipants:50}}}))));
assert.match(api.trend(f,'combined'),/sv31-pane on" data-pane="class"/);
assert.match(api.matrix(f,'combined'),/data-analysis-matrix-v60="class" aria-pressed="true"/);
assert.match(api.hall(f,'rank'),/班级排名[\s\S]*?前6%/);
state.sv31={subjMod:['数学']};
f=api.applySubjectModule(api.buildFeatures(es));
assert.match(api.hall(f,'rank'),/历史最佳/);
assert.match(api.hall(f,'rank'),/96<\/b><small class="hall-max-v32">\/100/);
assert.match(api.hall(f,'rank'),/班级排名[\s\S]*?前6%/);
const merged=api.applySubjectModule(api.buildFeatures(es.slice(0,2).map((e,i)=>({...e,scores:{数学:{actual:i?110:96,max:i?150:100,rank:i?7:8,participants:100}}}))));
assert.match(api.hall(merged,'rank'),/96<\/b><small class="hall-max-v32">\/100/);
assert.match(api.hall(merged,'rank'),/\(96%\)/);
console.log('PASS: mixed maxima, score/class-only records, metric fallback');

// All four indicators remain visible; help is a single disclosure with concrete examples.
state.sv31={subjMod:['数学'],matrixMetricV60:'rank'};
f=api.applySubjectModule(api.buildFeatures(es));
win.__stScoreWorth={heatRamp(){return 'linear-gradient(to right,white,black)'},difficultyCells(){return {}},heatStyle(){return ''}};
let matrix=api.matrix(f,'combined');
assert.match(matrix,/data-analysis-matrix-v60="difficulty"[^>]*>难度参考/);
assert.equal((matrix.match(/class="matrix-reading-v60"/g)||[]).length,1);
assert.match(matrix,/90＝前90%/);
assert.match(matrix,/data-matrix-distribution-heading/);
state.sv31.matrixMetricV60='difficulty';
matrix=api.matrix(f,'combined');
assert.match(matrix,/data-analysis-matrix-v60="difficulty" aria-pressed="true"/);
assert.match(matrix,/50＝平均难度/);
assert.equal((matrix.match(/class="matrix-reading-v60"/g)||[]).length,1);
assert.match(api.donut([{l:'前10%',v:4,c:'#123456'}],4,'排名分布'),/<circle/);

// Matrix figures no longer contain the older three-colour signal, even for flagged data.
state.sv31={subjMod:['数学'],matrixMetricV60:'rank'};
f=api.applySubjectModule(api.buildFeatures(es));f.flags['0|数学']={lvl:2,e:-50};f.flags['1|数学']={lvl:1,e:-20};f.flags['2|数学']={lvl:-1,e:40};
for(const metric of ['rank','class','score']){state.sv31.matrixMetricV60=metric;matrix=api.matrix(f,'combined',true);assert.equal(matrix.includes('sv31-dot'),false);assert.equal(matrix.includes('matrix-legend-v60'),false);assert.match(matrix,/data-analysis-matrix-v60="difficulty"/);assert.match(matrix,/matrix-reading-v60/);}
console.log('PASS: matrix indicator isolation');

// Hall: three independent records, compact deltas, original exam metadata.
state.sv31={subjMod:['数学']};
const separate=[exam('1',96,8,5),exam('2',90,4,6),exam('3',93,6,2)];
f=api.applySubjectModule(api.buildFeatures(separate));
let hall=api.hall(f,'rank');
assert.match(hall,/历史最佳/);assert.match(hall,/最近表现/);
assert.match(hall,/年级排名[\s\S]*?前4%/);assert.match(hall,/班级排名[\s\S]*?前4%/);
assert.match(hall,/96<\/b><small class="hall-max-v32">\/100/);
assert.match(hall,/↓ 3 分/);assert.match(hall,/↓ 2 个百分点/);assert.match(hall,/↑ 刷新纪录/);
assert.match(hall,/2026-10-01/);assert.match(hall,/2026-10-02/);assert.match(hall,/2026-10-03/);
assert.equal((hall.match(/class="hall-trend-v32"/g)||[]).length,3);
assert.ok(!hall.includes('距离历史最佳')&&!hall.includes('正处最好状态'));
const mixed=[exam('1',90,8,5),{...exam('2',96,4,6),scores:{数学:{actual:132,max:150,rank:4,participants:100}}}];
f=api.applySubjectModule(api.buildFeatures(mixed));hall=api.hall(f,'rank');
assert.match(hall,/↓ 2 个百分点/);assert.match(hall,/得分率走势/);
const tied=[exam('1',96,8,5),exam('2',96,8,5)];
f=api.applySubjectModule(api.buildFeatures(tied));hall=api.hall(f,'rank');
assert.equal((hall.match(/✓ 持平最佳/g)||[]).length,3);
const missingMax=[exam('1',96,8,5),{...exam('2',90,4,6),scores:{数学:{actual:97}}}];
f=api.applySubjectModule(api.buildFeatures(missingMax));hall=api.hall(f,'rank');assert.match(hall,/满分未知或无效 · 未比较/);
const justScore=[{...exam('1',96,8,5),total_rank:null,total_class_rank:null,scores:{数学:{actual:96,max:100}}}];
f=api.applySubjectModule(api.buildFeatures(justScore));hall=api.hall(f,'rank');
assert.ok(!hall.includes('年级排名')&&!hall.includes('班级排名'));assert.match(hall,/首次记录/);
console.log('PASS: compact personal best, independent records, mixed maxima, ties and missing data');
