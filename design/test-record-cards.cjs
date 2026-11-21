// Standalone regression: node design/test-record-cards.cjs
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../app-v26.js'),'utf8');
const citySource=fs.readFileSync(path.join(__dirname,'../app-v33.js'),'utf8');
function check(source,citySource,run){
  const number=v=>v===null||v===undefined||v===''?null:Number(v);
  const esc=v=>String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
  let css='';
  const finalOnlySubjectV62=n=>/^(语文|数学|英语|历史|物理)$/.test(n),finalOnlyGroupV62=ns=>Array.isArray(ns)&&ns.length>0&&ns.every(finalOnlySubjectV62),finalOnlyExamV62=e=>finalOnlyGroupV62(Object.keys(e.scores||{}));
  const env={finalOnlySubjectV62,finalOnlyGroupV62,finalOnlyExamV62,window:{ScoreRecordCityRanksV33:e=>({cityRank:e.city_rank,cityParticipants:e.city_participants,districtRank:e.district_rank,districtParticipants:e.district_participants})},document:{getElementById:()=>null,querySelector:()=>null,createElement:()=>({}),head:{appendChild:s=>{css=s.textContent;}}},state:{modulesV18:[{id:'m',name:'组合'}]},recordHtml:()=>'',num:number,escapeHtml:esc,formatScore:v=>String(v),formatPercent:v=>v+'%',fmtYearDate:s=>s,moduleNameSetV21:()=>new Set(['组合']),totalFor:e=>number(e.total),totalRawForV13:e=>number(e.rawTotal),rankInfoByScopeV16:(e,n,scope)=>e.ranks?.[n]?.[scope]||{},examScore:(e,n,k)=>number(e.combo?.[k]),examRawScoreV13:e=>number(e.combo?.raw),examMax:e=>number(e.combo?.max)};
  run(source,env);
  const exam={id:'fixture',name:'期中<测验>',exam_date:'2026.10.25',end_date:'2026.10.26',grade_level:'高二',is_hidden:true,total:563,rawTotal:573,city_rank:570,city_participants:4200,district_rank:223,district_participants:1600,scores:{化学:{actual:81,raw:73,target:85},数学:{actual:146,target:145},物理:{actual:0,target:0,excludeFromTotal:true},地理:{raw:67}},ranks:{总分:{year:{rank:124,participants:824},class:{rank:7,participants:50}},化学:{year:{rank:159,participants:799},class:{rank:9,participants:49}},数学:{year:{directPercent:true,positionPercent:0},class:{rank:1}},物理:{year:{rank:404,participants:824}}},moduleIds:['m'],moduleRanks:{m:{yearRank:89,yearParticipants:800,classRank:7,classParticipants:50}},combo:{actual:372,max:450,target:390,raw:370}};
  const html=env.recordHtml(exam);
  function has(x,m){assert.ok(html.includes(x),m||x);}
  ['data-record-structured-v26="1"','hidden-record-v10','期中&lt;测验>','2026.10.25 - 2026.10.26','原始总分 573','市级排名','区级排名','年级排名','班级排名','<strong>570</strong><small>/4200</small>','<strong>223</strong><small>/1600</small>','<strong>159</strong><small>/799</small>','<strong>9</strong><small>/49</small>','<strong>前 0%</strong>','<strong>1</strong></span>','<strong>0</strong>','<span>0</span>','统计项','<span>67</span>','<strong>67</strong>','<span>372</span><small>/450</small>','<strong>89</strong><small>/800</small>','<strong>370</strong>','<strong>390</strong>','data-edit="fixture"','data-hidden-toggle="fixture"','data-delete="fixture"'].forEach(x=>has(x));
  assert.equal((html.match(/市级排名/g)||[]).length,1);
  assert.ok(!html.includes('/null')&&!html.includes('undefined')&&!html.includes('NaN'));
  const fixed=env.recordHtml({id:'fixed',name:'不赋分',scores:{数学:{actual:134,max:150,raw:120,target:140}},total:134,rawTotal:120});
  assert.ok(fixed.includes('<span>134</span><small>/150</small>'));
  assert.ok(!fixed.includes('>原始<')&&!fixed.includes('原始总分'));
  const rankOnly=env.recordHtml({id:'r',name:'仅排名',scores:{},city_rank:77,city_participants:100});
  assert.ok(rankOnly.includes('市级排名')&&rankOnly.includes('<strong>77</strong><small>/100</small>'));
  const empty=env.recordHtml({id:'e',name:'空记录',scores:{}});
  assert.ok(empty.includes('尚未填写分数或排名')&&!empty.includes('record-total-ranks-v26'));
  assert.ok(citySource.includes('window.ScoreRecordCityRanksV33=citySourceV33')&&citySource.includes("if(html.indexOf('data-record-structured-v26=')>=0)return html"));
  assert.ok(css.includes('container:record-scores / inline-size')&&css.includes('var(--ui-scale')&&css.includes('flex-wrap:wrap'));
}
check(source,citySource,(src,env)=>vm.runInNewContext(src,env));
console.log('Structured record cards: all regression assertions passed.');
