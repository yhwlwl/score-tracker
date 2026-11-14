const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),{fixture}=require('./test-paper-record-flow.cjs'),{uid,rid,examId}=require('./test-paper-review.cjs');
const root=path.resolve(__dirname,'..'),out=process.env.PAPER_FLOW_SCREENSHOTS||'/tmp/paper-record-flow-qa';fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webmanifest':'application/json','.woff2':'font/woff2'};
(async()=>{
 let f=await fixture();
 const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/api/score-tracker-paper-review'){let body='';for await(const c of req)body+=c;const response=await f.h.handler(new Request(url,{method:req.method,headers:req.headers,body}));res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());return;}
  if(url.pathname.startsWith('/api/')){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({ok:true,enabled:false,exams:[],modules:[],subjects:[],profile:{completed_at:'2026-10-01',school_prompted_at:'2026-10-01'}}));return;}
  const file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':url.pathname));if(!file.startsWith(root+path.sep)||!mime[path.extname(file)]||!fs.existsSync(file)){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',mime[path.extname(file)]);res.end(fs.readFileSync(file));
 }catch(e){console.error(e);res.writeHead(500);res.end('fixture error');}});
 const browser=await chromium.launch({headless:true,...(process.env.PAPER_FLOW_CHROMIUM?{executablePath:process.env.PAPER_FLOW_CHROMIUM}:{})});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{
 for(const device of [{name:'desktop',width:1280,height:900,theme:'sunny'},{name:'mobile',width:390,height:844,theme:'sunny'},{name:'narrow',width:320,height:740,theme:'sunny'},{name:'tablet',width:768,height:1024,theme:'sunny'},{name:'dark',width:390,height:844,theme:'night'}]){
  f=await fixture();const page=await browser.newPage({viewport:{width:device.width,height:device.height}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.addInitScript(theme=>{localStorage.setItem('st_theme',theme);localStorage.setItem('st_pwa_install_v1',JSON.stringify({never:true}));},device.theme);
  await page.route('https://scan.test/**',async route=>{const bytes=f.h.blobs.get(new URL(route.request().url()).pathname.slice(1));await route.fulfill(bytes?{body:Buffer.from(bytes),headers:{'Content-Type':'image/png','Access-Control-Allow-Origin':'*'}}:{status:404,body:''});});
  await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.ScorePaperRecords);
  await page.evaluate(({uid,examId})=>{state.user={id:uid,username:'链路验收'};state.token='test-token';state.subjectConfigs=[{name:'数学',defaultMax:10}];state.modulesV18=[];state.exams=[{id:examId,name:'期中数学',exam_date:'2026-10-28',scores:{数学:{actual:5,max:10,raw:5,rawMax:10}},question_type_scores:{}}];state.allExams=state.exams;state.page='stats';state.analysisTab='papers';render();},{uid,examId});
  await page.locator('[data-hub="open:'+rid+'"]').click();await page.locator('[data-question="1"]>summary').click();
  await page.locator('[data-question="1"] .pr-edit>summary').click();await page.locator('[data-field=question_type]').first().waitFor({state:'visible'});
  assert.equal(await page.locator('.ph-tabs').count(),1);
  await page.screenshot({path:path.join(out,device.name+'-record.png'),fullPage:true});
  await page.locator('[data-sync-types]').waitFor();
  await page.screenshot({path:path.join(out,device.name+'-sync.png'),fullPage:false});
  await page.locator('[data-sync-types]').click();await page.locator('[data-view-types]').waitFor();await page.locator('[data-view-types]').click();await page.locator('.qta-page').waitFor();
  await page.screenshot({path:path.join(out,device.name+'-types.png'),fullPage:false});
  await page.locator('[data-analysis-tab=papers]').click();await page.locator('[data-hub="open:'+rid+'"]').click();await page.locator('[data-pr=analyze-record]').click();await page.locator('.pr-record-analysis').waitFor();
  await page.screenshot({path:path.join(out,device.name+'-analysis-setup.png'),fullPage:false});
  await page.locator('[name=consent]').check();await page.locator('.pr-record-analysis [type=submit]').click();await f.h.drain();await page.locator('.pr-result-top').waitFor();
  assert.equal(await page.locator('input[type=file]').count(),0,'derived report only shares source scans, no duplicate uploads');
  for(const tab of ['stats','types','papers']){await page.locator('[data-analysis-tab='+tab+']').click();await page.waitForTimeout(30);assert.equal(await page.locator('[data-analysis-tab]').count(),3);assert.equal(await page.locator('.ph-tabs').count(),1);}
  await page.locator('[data-analysis-tab=papers]').click();await page.locator('[data-hub=new]').click();await page.locator('.ph-basics').waitFor();
  await page.screenshot({path:path.join(out,device.name+'-new.png'),fullPage:false});
  const overflow=await page.evaluate(()=>({document:document.documentElement.scrollWidth,viewport:innerWidth,offenders:[...document.querySelectorAll('#content *')].filter(n=>{const r=n.getBoundingClientRect();return r.width>0&&r.right>innerWidth+2}).slice(0,5).map(n=>n.className)}));
  assert(overflow.document<=overflow.viewport+2,JSON.stringify({device:device.name,overflow}));assert.deepEqual(errors,[]);console.log('PASS '+device.name+' '+device.width+'px: actual UI/Edge chain, types, text analysis, nav and viewport');await page.close();
 }
 }finally{await browser.close();await new Promise(r=>server.close(r));}
 console.log('Screenshots: '+out);
})().catch(e=>{console.error(e);process.exitCode=1});
