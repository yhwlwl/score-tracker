// Browser -> actual new Edge handler -> isolated fixtures; no production data.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),{harness,uid,examId}=require('./test-paper-review.cjs');
const root=path.resolve(__dirname,'..'),output=fs.mkdtempSync(path.join(root,'../paper-review-qa-'));
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.webmanifest':'application/json','.woff2':'font/woff2'};
(async()=>{
  const h=harness();await h.init();
  const server=http.createServer(async(req,res)=>{
    const url=new URL(req.url,'http://localhost');
    try{
      if(url.pathname==='/api/score-tracker-paper-review'){
        let body='';for await(const chunk of req)body+=chunk;
        const response=await h.handler(new Request(url,{method:req.method,headers:req.headers,body}));
        res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());return;
      }
      if(url.pathname.startsWith('/api/')){
        let body='';for await(const chunk of req)body+=chunk;const action=JSON.parse(body||'{}').action;
        const data={ok:true,id:examId,created:true,modules:[],exams:[],subjects:[{name:'数学',defaultMax:150},{name:'历史',defaultMax:100}],profile:{completed_at:'2026-10-01',school_prompted_at:'2026-10-01'}};
        if(action==='get_config')Object.assign(data,{enabled:false,tip_enabled:false,announcement_enabled:false});
        res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data));return;
      }
      const file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':url.pathname));
      if(!file.startsWith(root+path.sep)||!types[path.extname(file)]||!fs.existsSync(file)){res.writeHead(404);res.end();return}
      res.setHeader('Content-Type',types[path.extname(file)]);res.end(fs.readFileSync(file));
    }catch(e){console.error(e);res.writeHead(500);res.end('fixture error')}
  });
  const packaged=process.env.PAPER_TEST_PACKAGED_CHROMIUM ? require(process.env.PAPER_TEST_PACKAGED_CHROMIUM) : null;
  const browser=await chromium.launch(packaged ? {headless:true,args:packaged.args.filter(a=>a!=='--single-process'),executablePath:await packaged.executablePath()} : {headless:true});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  try{
    for(const device of [{name:'mobile',width:390,height:844,theme:'sunny'},{name:'desktop',width:1280,height:900,theme:'sunny'},{name:'dark',width:390,height:844,theme:'night'}]){
      const page=await browser.newPage({viewport:{width:device.width,height:device.height},isMobile:device.width<620,hasTouch:device.width<620}),errors=[];
      page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
      await page.addInitScript(theme=>{localStorage.setItem('st_theme',theme);localStorage.setItem('st_pwa_install_v1',JSON.stringify({never:true}))},device.theme);
      await page.goto('http://127.0.0.1:'+server.address().port);
      await page.waitForFunction(()=>window.ScorePaperReview);
      async function editor() { await page.evaluate(user=>{
        state.user={id:user,username:'试卷测试'};state.token='test-token';state.subjectConfigs=[{name:'数学',defaultMax:150},{name:'历史',defaultMax:100}];state.modulesV18=[];state.allExams=[];state.exams=[];state.page='home';applyExamSubjectsV10([],state.subjectConfigs);render();openExam();
        state.modal.querySelector('#examName').value='试卷复盘测试';state.modal.querySelector('.actual-v16').value='88';
      },uid); }
      await editor();
      assert.equal(await page.locator('.pr-entry').count(),2);
      await page.screenshot({path:path.join(output,device.name+'-entry.png')});
      await page.locator('.pr-entry').first().click();await page.locator('.pr-quota').filter({hasText:'今日还可'}).waitFor();
      await page.screenshot({path:path.join(output,device.name+'-upload.png')});
      const image=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=800;c.height=1000;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,800,1000);x.fillStyle='#111';x.font='26px sans-serif';['Mathematics test (synthetic fixture)','1. 1 + 1 = ?  Answer: 2    Score: 5 / 5','2. x + 2 = 5   Answer: x = 7    Score: 0 / 5'].forEach((s,i)=>x.fillText(s,30,70+i*90));return c.toDataURL('image/png')});
      const file={name:'fixture-paper.png',mimeType:'image/png',buffer:Buffer.from(image.split(',')[1],'base64')};
      await page.locator('input[data-role=paper]').setInputFiles(file);await page.locator('.pr-page img').waitFor();
      const unrotated=await page.locator('.pr-page img').getAttribute('src');
      await page.getByRole('button',{name:'旋转',exact:true}).click();
      await page.waitForFunction(src=>document.querySelector('.pr-page img')?.src!==src,unrotated);
      const prepared=await page.locator('.pr-page img').getAttribute('src');
      let interrupted=false;h.transport=(url,options)=>{
        const request=JSON.parse(options.body),prompt=request.messages[0].content[0].text;
        if(!interrupted&&prompt.includes('阶段二：')&&JSON.parse(prompt.split('本批事实：')[1].split('\n')[0]).some(q=>q.label==='2')){interrupted=true;return new Response(JSON.stringify({error:{message:'fixture interruption'}}),{status:401});}
        return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(require('./test-paper-review.cjs').stagedReply(require('./test-paper-review.cjs').raw,request))}}]}));
      };
      await page.locator('#pr-consent').check();await page.getByRole('button',{name:'开始分析',exact:true}).click();
      await page.getByRole('button',{name:'恢复分析',exact:true}).waitFor({timeout:20000});
      await page.reload();await page.waitForFunction(()=>window.ScorePaperReview);await editor();await page.locator('.pr-entry').first().click();
      await page.getByRole('button',{name:'恢复分析',exact:true}).waitFor();
      assert.equal((await page.locator('.pr-recovered-pages img').first().getAttribute('src'))===prepared,true,'reload restores the original rotated image');
      assert(await page.locator('.pr-recovery').textContent().then(t=>t.includes('1 / 2')));
      h.transport=null;
      await page.getByRole('button',{name:'恢复分析',exact:true}).click();
      await page.locator('.pr-question').first().waitFor({timeout:20000});
      assert.equal(await page.locator('[data-pr-score]').textContent(),'—');
      await page.locator('.pr-question > summary').first().click();await page.locator('.pr-question').first().locator('[data-field=verified]').check();
      await page.locator('.pr-question > summary').nth(1).click();await page.locator('.pr-question').nth(1).locator('[data-field=verified]').check();
      await page.getByRole('button',{name:'保存并更新分析',exact:true}).click();await page.waitForFunction(()=>document.querySelector('[data-pr-score]')?.textContent==='5 / 10');
      assert.equal(await page.locator('.actual-v16').first().inputValue(),'88');
      await page.locator('.pr-dialog').evaluate(el=>el.scrollTop=0);
      const inset=await page.locator('.pr-wins').evaluate(el=>parseFloat(getComputedStyle(el).paddingLeft));assert(inset>=16,'strength section retains its horizontal padding');
      await page.screenshot({path:path.join(output,device.name+'-report.png')});
      const geometry=await page.locator('.pr-dialog').evaluate(el=>({x:el.getBoundingClientRect().x,right:el.getBoundingClientRect().right,client:el.clientWidth,scroll:el.scrollWidth}));
      assert(geometry.x>=0&&geometry.right<=device.width+1);assert(geometry.scroll<=geometry.client+1,'no horizontal overflow');
      await page.keyboard.press('Escape');assert.equal(await page.locator('.pr-dialog').count(),0);assert.equal(await page.locator('.actual-v16').first().inputValue(),'88');
      if(process.env.PAPER_ACTUAL_REPORT){
        const row=h.tables.score_tracker_paper_reviews.at(-1);row.result=JSON.parse(fs.readFileSync(process.env.PAPER_ACTUAL_REPORT,'utf8'));row.subject='物理';
        await page.evaluate(()=>{state.modal.querySelector('.exam-subject-name-v10').value='物理';});
        await page.locator('.pr-entry').first().click();await page.getByRole('button',{name:'分析记录',exact:true}).click();await page.locator('.pr-history').first().click();
        await page.locator('.pr-wins').waitFor();await page.locator('.pr-wins').scrollIntoViewIfNeeded();await page.locator('.katex').first().waitFor({state:'attached'});
        assert(!await page.locator('.pr-wins').textContent().then(t=>t.includes('需要把v²/2-h图斜率')),'result-only evidence cannot support an invented method');
        await page.screenshot({path:path.join(output,device.name+'-physics.png')});
        assert.equal(await page.locator('.katex-error').count(),0,'actual report formulas parse');
      }
      assert.deepEqual(errors,[]);await page.close();
    }
    console.log('PASS: real Chromium mobile/desktop/dark, canvas image upload/rotation, actual Edge flow, reload/upload restoration, checkpoint resume, formula layout, polling, score confirmation, dialog focus/escape, no overflow or JS errors');
    console.log('Screenshots: '+output);
  }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
