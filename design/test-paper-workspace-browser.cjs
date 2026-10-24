// Actual bundled UI -> actual Edge handler -> isolated database/storage fixtures.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),{harness,uid,examId}=require('./test-paper-review.cjs');
const root=path.resolve(__dirname,'..'),output=fs.mkdtempSync(path.join(root,'../workspace-qa-'));
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webmanifest':'application/json','.woff2':'font/woff2'};
(async()=>{
 let h=harness();await h.init();
 const server=http.createServer(async(req,res)=>{
  try{
   const url=new URL(req.url,'http://localhost');
   if(url.pathname==='/api/score-tracker-paper-review'){
    let body='';for await(const chunk of req)body+=chunk;
    const response=await h.handler(new Request(url,{method:req.method,headers:req.headers,body}));
    res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());return;
   }
   if(url.pathname.startsWith('/api/')){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({ok:true,enabled:false,modules:[],exams:[],subjects:[],profile:{completed_at:'2026-10-01',school_prompted_at:'2026-10-01'}}));return;}
   const file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':url.pathname));
   if(!file.startsWith(root+path.sep)||!types[path.extname(file)]||!fs.existsSync(file)){res.writeHead(404);res.end();return;}
   res.setHeader('Content-Type',types[path.extname(file)]);res.end(fs.readFileSync(file));
  }catch(e){console.error(e);res.writeHead(500);res.end('fixture error');}
 });
 const packaged=process.env.PAPER_TEST_PACKAGED_CHROMIUM?require(process.env.PAPER_TEST_PACKAGED_CHROMIUM):null;
 const browser=await chromium.launch(packaged?{headless:true,args:packaged.args.filter(a=>a!=='--single-process'||process.env.PAPER_TEST_SINGLE_PROCESS),executablePath:await packaged.executablePath()}:{headless:true});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{
  for(const device of [{name:'mobile',width:390,height:844,theme:'sunny'},{name:'desktop',width:1280,height:900,theme:'sunny'},{name:'dark',width:390,height:844,theme:'night'}]){
   h=harness();await h.init();
   const page=await browser.newPage({viewport:{width:device.width,height:device.height},isMobile:device.width<600,hasTouch:device.width<600}),errors=[];
   page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
   await page.route('https://scan.test/**',async route=>{const key=new URL(route.request().url()).pathname.slice(1),bytes=h.blobs.get(key);await route.fulfill(bytes?{status:200,body:Buffer.from(bytes),headers:{'Content-Type':'image/png','Access-Control-Allow-Origin':'*'}}:{status:404,body:''});});
   await page.addInitScript(theme=>{localStorage.setItem('st_theme',theme);localStorage.setItem('st_pwa_install_v1',JSON.stringify({never:true}));},device.theme);
   async function setup(open){await page.evaluate(({uid,examId,open})=>{
    state.user={id:uid,username:'工作台测试'};state.token='test-token';state.subjectConfigs=[{name:'数学',defaultMax:150},{name:'历史',defaultMax:100}];state.modulesV18=[];
    state.exams=[{id:examId,name:'期中考试',exam_date:'2026-10-20',scores:{数学:{actual:88,max:150},历史:{actual:70,max:100}}}];state.allExams=state.exams;applyExamSubjectsV10([],state.subjectConfigs);
    state.page=open?'home':'stats';state.analysisTab='ai';render();
    if(open){openExam(state.exams[0]);state.modal.querySelector('.actual-v16').value='88';}
   },{uid,examId,open});}
   await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.ScorePaperHub);await setup(true);
   await page.locator('.pr-entry').first().click();await page.locator('.ph-create').waitFor();
   await page.waitForTimeout(100);
   assert.equal(await page.locator('#dsbRoot').count(),0,'deferred deep-analysis mount must stay out of the AI tab');
   assert.equal(await page.locator('[data-analysis-tab=ai]').getAttribute('aria-selected'),'true');
   assert.equal(await page.locator('.ph-create [name=exam_id]').inputValue(),examId,'old entry carries exam association');
   await page.getByText('识别核对与更多设置',{exact:true}).click();await page.getByText('学习范围与关注的问题',{exact:true}).click();
   await page.locator('[name=review_before_analysis]').check();await page.locator('[name=time_budget_minutes]').selectOption('3');await page.locator('[name=detail]').selectOption('brief');
   await page.locator('[name=goal]').fill('重点检查等式两边的运算');
   await page.screenshot({path:path.join(output,device.name+'-settings.png')});
   assert.equal(await page.locator('input[data-role=paper]').count(),1,'upload and settings share one page');await page.locator('.pr-quota').filter({hasText:'今日还可'}).waitFor();
   const image=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=800;c.height=1000;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,800,1000);x.fillStyle='#111';x.font='26px sans-serif';['Math test: synthetic fixture','1. 1+1=? Answer:2 Score:5/5','2. x+2=5 Answer:x=7 Score:0/5'].forEach((s,i)=>x.fillText(s,30,70+i*90));return c.toDataURL('image/png');});
   await page.locator('input[data-role=paper]').setInputFiles({name:'fixture.png',mimeType:'image/png',buffer:Buffer.from(image.split(',')[1],'base64')});await page.locator('.pr-page img').waitFor();await page.locator('#pr-consent').check();
   await page.getByRole('button',{name:'保存资料草稿',exact:true}).click();await page.locator('.pr-message').filter({hasText:'草稿已保存到账号'}).waitFor();
   assert.equal(h.tables.score_tracker_paper_reviews.length,0,'saving materials uses no AI quota');assert.equal(h.blobs.size,1);
   await page.getByRole('button',{name:'开始分析',exact:true}).click();await page.locator('.ps-verify').waitFor({timeout:20000});
   assert.equal(h.tables.score_tracker_paper_reviews[0].status,'paused');
   const second=page.locator('[data-ocr="1"]');await second.locator('summary').click();await second.locator('[name=answer1]').fill('x=7（识别已核对）');
   await second.getByRole('button',{name:'＋ 框选扫描区域',exact:true}).waitFor();await second.getByRole('button',{name:'＋ 框选扫描区域',exact:true}).click();
   await second.locator('[data-coordinate="0"]').fill('10');await second.locator('[data-coordinate="0"]').dispatchEvent('change');await second.locator('[data-coordinate="1"]').fill('15');await second.locator('[data-coordinate="1"]').dispatchEvent('change');
   await second.locator('[data-coordinate="2"]').fill('80');await second.locator('[data-coordinate="2"]').dispatchEvent('change');await second.locator('[data-coordinate="3"]').fill('35');await second.locator('[data-coordinate="3"]').dispatchEvent('change');
   await second.getByRole('button',{name:'保存区域',exact:true}).click();await second.locator('.ps-region').waitFor();
   await page.screenshot({path:path.join(output,device.name+'-ocr-scans.png')});
   await page.getByRole('button',{name:'保存核对并继续',exact:true}).click();await page.locator('.pr-result-top').waitFor({timeout:20000});
   assert.equal(h.tables.score_tracker_paper_reviews[0].result.questions[1].answer,'x=7（识别已核对）');
   await page.locator('[data-pr="jump:highlights"]').click();await page.screenshot({path:path.join(output,device.name+'-report-top.png')});
   await page.locator('[data-pr="filter:review"]').click();assert.equal(await page.locator('[data-question="1"]').isVisible(),false);
   await page.locator('[data-pr="filter:confirm"]').click();assert(await page.locator('.pr-filter-empty').isVisible());
   await page.locator('[data-pr="focus:2"]').first().click();assert(await page.locator('[data-question="2"]').isVisible());
   assert.equal(await page.locator('[data-question="2"] [data-field=answer]').isVisible(),false,'edit controls do not bury the explanation');
   await page.screenshot({path:path.join(output,device.name+'-question-explanation.png')});
   await page.locator('[data-question="2"] .pr-source>summary').click();await page.locator('[data-question="2"] .ps-region').waitFor();
   assert((await page.locator('.pr-difficulty-table').textContent()).includes('/10'));
   const saved=structuredClone(h.tables.score_tracker_paper_reviews[0]);
   h.tables.score_tracker_paper_reviews.push({...structuredClone(saved),request_id:crypto.randomUUID(),subject:'历史',exam_id:null,title:'旧报告·历史'});
   await page.getByRole('button',{name:'返回全部分析',exact:true}).click();await page.locator('.ph-card').first().waitFor();assert.equal(await page.locator('.ph-card').count(),2);
   await page.locator('[data-filter=subject]').selectOption('历史');await page.waitForFunction(()=>document.querySelectorAll('.ph-card').length===1);assert((await page.locator('.ph-card').textContent()).includes('旧报告'));
   await page.locator('[data-filter=subject]').selectOption('');await page.waitForFunction(()=>document.querySelectorAll('.ph-card').length===2);
   await page.screenshot({path:path.join(output,device.name+'-all-reports.png')});
   await page.locator('[data-analysis-tab=stats]').click();assert(await page.locator('.sv31-page').count());await page.locator('#dsbRoot').waitFor();assert.equal(await page.locator('.ph-workspace').count(),0,'separate peer tab, not a card inserted in score analysis');
   await page.locator('[data-analysis-tab=ai]').click();await page.locator('[data-hub="open:'+saved.request_id+'"]').click();await page.locator('.pr-result-top').waitFor();
   await page.getByRole('button',{name:'关联考试 / 名称',exact:true}).click();await page.locator('.ph-link-form [name=exam]').selectOption('');await page.getByRole('button',{name:'保存关联',exact:true}).click();await page.locator('.ph-message').filter({hasText:'关联已保存'}).waitFor();
   await page.reload();await page.waitForFunction(()=>window.ScorePaperHub);await setup(false);await page.locator('[data-hub="open:'+saved.request_id+'"]').click();await page.locator('.pr-result-top').waitFor();await page.locator('[data-question="2"]>summary').click();await page.locator('[data-question="2"] .pr-source>summary').click();await page.locator('[data-question="2"] .ps-region').waitFor();
   assert.equal(await page.locator('.ps-library .ps-pages img').count(),1,'scans survive reload');assert.equal(h.tables.score_tracker_paper_reviews[0].exam_id,null);
   assert.equal(await page.locator('#dsbRoot').count(),0,'deep analysis must not reappear after report reload');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'no horizontal page overflow');assert.deepEqual(errors,[]);
   await page.screenshot({path:path.join(output,device.name+'-report.png')});
   // Existing long reports receive the layout without regeneration or source edits.
   const old=h.tables.score_tracker_paper_reviews[0].result;
   old.prompt_version='2026-10-learner-v6';old.overview='已经列出了受力方程，接下来需要检查运动方向和条件。'.repeat(15);
   const longOverview=old.overview;
   old.action_plan=Array.from({length:4},(_,i)=>({...structuredClone(old.action_plan[0]),title:'第'+(i+1)+'项复习安排'}));
   const q=old.questions[1];q.reference='## 先写等式\n\n1. **等号两边做同一运算**。\n2. 把结果代回原式检查。\n\n$$\\begin{aligned}\nx+2&=5\\\\\nx&=3\n\\end{aligned}$$';q.difficulty.scale=5;
   for(let i=3;i<=15;i++)old.questions.push({...structuredClone(old.questions[0]),id:String(i),label:String(i)});
   await page.getByRole('button',{name:'返回全部分析',exact:true}).click();await page.locator('[data-hub="open:'+saved.request_id+'"]').click();await page.locator('.pr-result-top').waitFor();
   assert.equal(await page.locator('.pr-questions>.pr-question').count(),15);
   assert(await page.locator('.pr-overview').isVisible());assert.equal(await page.locator('.pr-overview .pr-prose').textContent(),longOverview);assert.equal(await page.locator('.pr-reading-section').count(),6);
   assert.equal(await page.locator('.pr-action-plan>.pr-action').count(),2,'the plan shows the first two tasks and preserves later tasks');
   assert.equal(await page.locator('.pr-action-plan .pr-action').count(),4,'further tasks are preserved');
   await page.locator('[data-question="2"]>summary').click();await page.locator('[data-question="2"] .pr-solution>summary').click();
   await page.locator('[data-question="2"] .pr-solution .katex-display').waitFor();
   assert.equal(await page.locator('.katex-error').count(),0);assert.equal(await page.locator('[data-question="2"] .pr-solution ol>li').count(),2);
   assert((await page.locator('[data-question="2"] .pr-difficulty>summary').textContent()).includes('/ 5'),'legacy scale is not silently relabeled');
   await page.getByText('查看每题难度与得分',{exact:true}).click();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'expanded legacy difficulty table stays inside viewport');
   assert.deepEqual(errors,[]);await page.screenshot({path:path.join(output,device.name+'-legacy-difficulty.png')});
   await page.close();console.log('PASS',device.name,'entry, preferences, draft, OCR, scan crop, resume, 10-point report, tabs, archive, association, reload, legacy long report, prose/LaTeX, no errors/overflow');
  }
  console.log('SCREENSHOTS',output);
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1);});
