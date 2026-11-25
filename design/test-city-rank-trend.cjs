/* Run: NODE_PATH=<directory containing jsdom> node design/test-city-rank-trend.cjs */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {JSDOM,VirtualConsole}=require('jsdom');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
async function run(){
 const vc=new VirtualConsole();
 const dom=new JSDOM(read('index.html').replace(/<script[\s\S]*?<\/script>/g,''),{url:'https://trends.test/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});
 const w=dom.window,d=w.document;
 try{
 w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});w.setInterval=()=>1;w.scrollTo=()=>{};
 w.fetch=async()=>new Response(JSON.stringify({exams:[],subjects:[],modules:[]}));
 w.eval(read('app-bundle.js')+'\nwindow.state=state;');
 w.eval(read('app-v36.js'));
 const base={total_rank:23,total_participants:500,total_class_rank:4,total_class_participants:50,total_year_position_percent:5,scores:{数学:{actual:80,target:95,max:100,rank:21,participants:500,classRank:3,classParticipants:50}}};
 const exam=(id,extra)=>({...base,id,name:'考试'+id,exam_date:'2026-11-0'+id,...extra});
 const fixtures=[exam(1,{city_rank:4000,city_participants:20000}),exam(2,{}),exam(3,{cityRank:2000}),exam(4,{cityRank:1000,cityParticipants:10000}),exam(5,{cityRank:20,is_hidden:true})];
 const s=w.state;
 Object.assign(s,{user:{id:'fixture',username:'fixture'},allExams:fixtures,exams:fixtures.slice(0,4),page:'home',subject:'数学',rankScopeV16:'class',trendMetric:'score',scoreBasis:'final'});
 function home(){d.getElementById('app').innerHTML=w.homeHtml();w.bindPage();}
 const button=scope=>d.querySelector('[data-trend-scope-v16="'+scope+'"]');
 const tips=()=>Array.from(d.querySelectorAll('#chart circle[data-tip]'),n=>n.getAttribute('data-tip'));
 const data=()=>w.cityRankInfoV16(fixtures[0],'总分');
 assert.equal(data().rank,4000);assert.equal(data().participants,20000);
 assert.equal(w.cityRankInfoV16(fixtures[2],'总分').performance,null);
 assert.equal(w.cityRankInfoV16(fixtures[0],'数学').rank,null);
 assert.equal(w.cityRankInfoV16({cityRank:0,cityParticipants:100},'总分').rank,null);
 assert.equal(w.cityRankInfoV16({cityRank:101,cityParticipants:100},'总分').performance,null);
 home();assert(button('city'));button('city').click();home();
 assert.equal(s.cityTrendV16,true);assert.equal(s.rankScopeV16,'class');assert.equal(s.subject,'数学');
 assert(button('city').classList.contains('active'));assert(!button('class').classList.contains('active'));
 assert.equal(d.querySelector('.chart-card .card-title').textContent,'市排趋势');
 assert.equal(d.querySelectorAll('.chart-card [data-subject]').length,0);
 assert.equal(tips().length,3);assert(tips().some(t=>t.includes('第4000名')));assert(tips().some(t=>t.includes('第2000名')));assert(!tips().some(t=>t.includes('第23名')));
 assert.equal(w.rankInfoByScopeV16(fixtures[0],'总分','class').rank,4);
 d.querySelector('[data-trend-metric="rank"]').click();home();
 assert.equal(d.querySelector('.chart-card .card-title').textContent,'市排百分位趋势');
 assert.equal(tips().length,2);assert(tips().every(t=>t.includes('市级排名百分位')));
 d.getElementById('trendFullV25').click();
 const full=d.querySelector('.full-trend-modal-v25');assert(full);assert(full.querySelector('h3').textContent.includes('总分市排'));
 assert.equal(full.querySelectorAll('circle[data-tip]').length,2);
 full.querySelector('.close-btn').click();
 button('class').click();home();
 assert.equal(s.cityTrendV16,false);assert.equal(s.rankScopeV16,'class');assert.equal(s.subject,'数学');assert(d.querySelector('.chart-card [data-subject="数学"]'));
 s.exams=[fixtures[1]];s.allExams=[fixtures[1],fixtures[4]];home();assert(!button('city'));
 console.log('PASS: city rank opt-in, rank/percentile, missing data, full trend, scope isolation, subject restoration, hidden records');
 }finally{dom.window.close();}
}
run().catch(e=>{console.error(e);process.exitCode=1});
