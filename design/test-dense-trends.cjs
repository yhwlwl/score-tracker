/* Run: NODE_PATH=<directory containing jsdom> node design/test-dense-trends.cjs */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {JSDOM,VirtualConsole}=require('jsdom'),root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const tick=()=>new Promise(r=>setTimeout(r,35));
function exams(n){return Array.from({length:n},(_,i)=>({id:'exam-'+i,name:'高二第'+(i+1)+'次月度考试及阶段测试',exam_date:new Date(Date.UTC(2025,0,i*7+1)).toISOString().slice(0,10),total_rank:50+i%15,total_participants:500,total_class_rank:5+i%4,total_class_participants:50,scores:{数学:{actual:80+i%12,target:95,max:100,rank:40+i,participants:500,classRank:3+i%5,classParticipants:50},语文:{actual:105+i%15,target:130,max:150,rank:50+i,participants:500}}}));}
function harness(n,width){
  const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!e.message.includes('CSS'))errors.push(e.message)});
  const dom=new JSDOM(read('index.html').replace(/<script[\s\S]*?<\/script>/g,''),{url:'https://trends.test/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc}),w=dom.window;
  w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){},addListener(){}});w.setInterval=()=>1;w.scrollTo=()=>{};
  w.fetch=async(url,init={})=>{const b=JSON.parse(init.body||'{}');let data={};if(b.action==='me')data={user:{id:'fixture-user',username:'fixture'}};if(b.action==='list_exams')data={exams:[],subjects:[],modules:[]};if(b.action==='notice_check')data={config:{enabled:false,version:'v7.0'},seen:[]};if(b.action==='feature_vote_overview')data={options:[],myVotes:[]};return new Response(JSON.stringify(data));};
  w.eval(read('app-bundle.js')+'\nwindow.state=state;');w.eval(read('app-v36.js'));
  w.lineSvgV32=w.__v32.lineSvg;
  w.fixtureExams=exams(n);w.fixtureWidth=width;
  w.eval('state.user={id:"fixture-user",username:"fixture"};state.exams=fixtureExams;state.subject="数学";state.trendMetric="score";state.scoreBasis="final";state.scoreViewV25="score";state.page="home";');
  const original=Object.getOwnPropertyDescriptor(w.HTMLElement.prototype,'clientWidth');
  Object.defineProperty(w.HTMLElement.prototype,'clientWidth',{configurable:true,get(){return this.id==='chart'||this.classList.contains('rank-chart-stage-v7')||this.classList.contains('sv32-trend-scroll')?w.fixtureWidth:original?.get.call(this)||0;}});
  Object.defineProperty(w.HTMLElement.prototype,'scrollWidth',{configurable:true,get(){const svg=this.querySelector('svg');return svg?Number(svg.getAttribute('viewBox').split(/\s+/)[2]):0;}});
  return {w,d:w.document,errors,close:()=>w.close()};
}
function showHome(h,metric='score',subject='数学',basis='final',view='score',scope='year'){
  h.w.eval('state.page="home";state.trendMetric='+JSON.stringify(metric)+';state.rankScopeV16='+JSON.stringify(scope)+';state.subject='+JSON.stringify(subject)+';state.scoreBasis='+JSON.stringify(basis)+';state.scoreViewV25='+JSON.stringify(view)+';document.getElementById("app").innerHTML=homeHtml();bindPage();');
  const stage=h.d.querySelector('#chart .rank-chart-stage-v7')||h.d.querySelector('#chart');return {stage,svg:stage.querySelector('svg')};
}
function chartChecks(stage,svg,n){
  assert(svg);const box=svg.getAttribute('viewBox').split(/\s+/).map(Number);
  assert.equal(parseFloat(svg.style.width),box[2]);assert.equal(parseFloat(svg.style.height),box[3]);assert.equal(stage.style.height,box[3]+'px');assert.equal(svg.getAttribute('preserveAspectRatio'),'xMinYMin meet');
  const labels=[...svg.querySelectorAll('text.axis-label[text-anchor="middle"]')];assert.equal(labels.length,n);
  if(n>6){for(let i=1;i<labels.length;i++)assert(Number(labels[i].getAttribute('x'))-Number(labels[i-1].getAttribute('x'))>=83.99);}
  assert(Number(labels.at(-1).getAttribute('x'))<=box[2]-40,'last label has space');
  assert(svg.querySelectorAll('circle[data-tip]').length>0);assert.equal(stage.getAttribute('tabindex'),'0');
  return box;
}
async function run(){
  let sample;
  for(const width of [320,480,960,1480])for(const n of [1,5,6,52,100]){
    const h=harness(n,width);await tick();
    for(const args of [['score','数学','final','score'],['score','数学','final','percent'],['score','总分','final','score'],['score','总览','final','score'],['score','数学','raw','score'],['rank','数学','final','score'],['rank_raw','数学','final','score','class']]){
      const {stage,svg}=showHome(h,...args);assert(svg,'missing SVG: '+JSON.stringify({n,width,args,text:stage.textContent}));chartChecks(stage,svg,n);
    }
    assert.deepEqual(h.errors,[]);if(n===52&&width===320){sample=showHome(h);sample={svg:sample.svg.outerHTML,width:Number(sample.svg.getAttribute('width'))};}
    h.close();
  }
  console.log('PASS: 1/5/6/52/100 exams across four widths and score, percentage, raw, overview, grade/class rank views');

  let h=harness(52,320);await tick();let {stage,svg}=showHome(h);await tick();const box=chartChecks(stage,svg,52),firstX=svg.querySelector('circle').getAttribute('cx');assert.equal(stage.scrollLeft,box[2]-320);
  stage.scrollLeft=800;h.w.fixtureWidth=960;h.w.enhanceTrendChartsV19();await tick();assert(stage.scrollLeft>0&&stage.scrollLeft<box[2]-960);assert.equal(svg.querySelector('circle').getAttribute('cx'),firstX);
  h.w.fixtureWidth=320;h.w.enhanceTrendChartsV19();await tick();assert.equal(svg.querySelector('circle').getAttribute('cx'),firstX);assert.equal(h.d.querySelectorAll('.trend-scroll-hint-v19').length,1);assert(svg.querySelector('path').getAttribute('stroke'));
  const partial=h.w.fixtureExams.slice(-12);h.w.partial=partial;h.w.eval('state.exams=partial;');({stage,svg}=showHome(h));chartChecks(stage,svg,12);h.close();console.log('PASS: resize does not compound geometry, preserves browsing position; hints and filtered counts stay correct');

  h=harness(52,320);await tick();({stage,svg}=showHome(h));const ns='http://www.w3.org/2000/svg';let goal=h.d.createElementNS(ns,'line');goal.setAttribute('x1','46');goal.setAttribute('x2','742');goal.setAttribute('y1','70');goal.setAttribute('y2','70');goal.setAttribute('data-goal-line-v33','1');
  // Start a fresh geometry snapshot with a real-shaped target annotation.
  svg= h.d.createElement('div');svg.innerHTML=h.w.chartHtml();stage.innerHTML=svg.innerHTML;delete stage._trendGeometryV19;stage.querySelector('svg').appendChild(goal);h.w.enhanceTrendStageV19(stage);
  assert.equal(goal.getAttribute('x1'),'46');assert.equal(goal.getAttribute('y1'),'70');assert(Number(goal.getAttribute('x2'))>4000);
  const exportSource=read('app-v25.js').split('  function extractChartSvgV25(){')[1].split('  function downloadSvgAsPngV25')[0];h.w.eval('function extractFixtureSvg(){'+exportSource.replace(/}\s*$/,'')+'}');
  const output=h.w.extractFixtureSvg(),exportDom=new JSDOM(output,{contentType:'image/svg+xml'}),exportSvg=exportDom.window.document.documentElement,eb=exportSvg.getAttribute('viewBox').split(/\s+/).map(Number);assert.equal(Number(exportSvg.getAttribute('width')),eb[2]);assert.equal(Number(exportSvg.getAttribute('height')),eb[3]);assert.equal(exportSvg.style.height,'');assert.equal(exportSvg.style.minWidth,'');exportDom.window.close();h.close();console.log('PASS: goal line follows expanded x axis; complete export canvas keeps round points and includes the legend');

  h=harness(52,320);await tick();let analysisSample;
  for(const n of [2,6,52,100,200]){
    const vals=Array.from({length:n},(_,i)=>70+15*Math.sin(i/4)),gaps=vals.map((v,i)=>i%7===3?null:v-4);h.w.vals=vals;h.w.gaps=gaps;h.w.names=exams(n).map(x=>x.name);
    const markup=h.w.eval('lineSvgV32([{vals:vals,color:"var(--accent,#5d72e8)"},{vals:gaps,color:"var(--green,#32a77a)",dash:true}],names,{tickLabel:function(v){return "前"+Math.round(100-v)+"%";}})');
    const host=h.d.createElement('div');host.innerHTML=markup;const chart=host.querySelector('svg'),b=chart.getAttribute('viewBox').split(/\s+/).map(Number),labels=[...chart.querySelectorAll('text[text-anchor="middle"]')];assert.equal(labels.length,n);assert.equal(chart.querySelectorAll('circle').length,n+gaps.filter(x=>x!==null).length);assert.equal(parseFloat(chart.style.minWidth),b[2]);assert.equal(chart.style.height,'auto');assert.equal(labels.at(-1).getAttribute('x'),String(b[2]-44));assert(labels[0].querySelector('title').textContent.includes('阶段测试'));assert(!labels[0].textContent.includes('<img'));
    for(let i=1;i<labels.length;i++)assert(Number(labels[i].getAttribute('x'))-Number(labels[i-1].getAttribute('x'))>=84);
    assert(chart.querySelectorAll('polyline[stroke-dasharray]').length>=(n>6?2:1),'missing ranks stay disconnected');if(n===52)analysisSample=chart.outerHTML;
  }
  h.close();console.log('PASS: analysis preserves all data, missing-data gaps, compact labels/full titles and 84px spacing up to 200 exams');
  h=harness(52,320);await tick();h.w.state.allExams=h.w.fixtureExams;h.w.state.unfilteredVisibleExamsV13=h.w.fixtureExams;h.w.state.page='stats';h.d.getElementById('app').innerHTML='<div id="content"></div>';h.w.__v32.rerender();await tick();
  assert(h.d.querySelectorAll('.sv32-trend-scroll').length>=2);let visible=h.d.querySelector('.sv31-pane.on .sv32-trend-scroll');assert(visible.scrollLeft>3000);h.d.querySelector('[data-sv31-tab="score"]').click();await tick();visible=h.d.querySelector('.sv31-pane.on .sv32-trend-scroll');assert(visible.scrollLeft>3000);
  for(const theme of ['sunny','paper','sakura','violet','mint','night']){h.w.__v29.applyTheme(theme,true);assert.equal(h.w.__v29.currentTheme(),theme);assert(h.d.querySelector('.sv32-trend-scroll svg circle'));}assert.deepEqual(h.errors,[]);h.close();console.log('PASS: real analysis page, mode switching, latest viewport and six themes');
  if(process.env.DENSE_TREND_RENDER_DIR){
    const sharp=require(require.resolve('sharp',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES]})),dir=process.env.DENSE_TREND_RENDER_DIR;fs.mkdirSync(dir,{recursive:true});
    function normalize(text){return text.replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" ').replace(/var\(--accent[^)]*\)/g,'#6669dd').replace(/var\(--green[^)]*\)/g,'#32a77a').replace(/var\(--panel-solid[^)]*\)/g,'#fff').replace(/var\(--line[^)]*\)/g,'#e8ebf0').replace(/var\(--muted[^)]*\)/g,'#788392').replace(/class="axis-label"/g,'fill="#788392" font-size="11"').replace(/ style="[^"]*"/g,'');}
    const home=await sharp(Buffer.from(normalize(sample.svg))).flatten({background:'#fff'}).png().toBuffer(),a=await sharp(Buffer.from(normalize(analysisSample))).flatten({background:'#fff'}).png().toBuffer();const am=await sharp(a).metadata();await sharp(home).extract({left:sample.width-320,top:0,width:320,height:300}).png().toFile(path.join(dir,'home-latest-52.png'));await sharp(a).extract({left:am.width-320,top:0,width:320,height:230}).png().toFile(path.join(dir,'analysis-latest-52.png'));console.log('PASS: real SVG raster rendering for 52-exam recent viewports');
  }
}
run().catch(e=>{console.error(e);process.exitCode=1});
