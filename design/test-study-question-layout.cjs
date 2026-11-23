// Exercise the shipped page, including navigation and styles, with an in-memory account.
const {chromium}=require('playwright');
const {createServer}=require('node:http');
const fs=require('node:fs/promises'), path=require('node:path'), assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
async function main(){
  const server=createServer(async(req,res)=>{
    const pathname=new URL(req.url,'http://localhost').pathname;
    const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
    if(!file.startsWith(root+path.sep)){res.writeHead(404).end();return;}
    try{
      const bytes=await fs.readFile(file);
      const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css'}[path.extname(file)];
      res.writeHead(200,{'content-type':mime||'application/octet-stream'}).end(bytes);
    }catch{res.writeHead(404).end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin='http://127.0.0.1:'+server.address().port;
  let browser;
  try{
    const executablePath=process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
    browser=await chromium.launch(executablePath?{executablePath}:{channel:'chrome'});
    for(const width of [390,820,1366]){
      const page=await browser.newPage({viewport:{width,height:820},serviceWorkers:'block'});
      let questions=0;
      await page.route('**/*',async route=>{
        const url=new URL(route.request().url());
        if(url.origin!==origin)return route.abort();
        if(!url.pathname.startsWith('/api/'))return route.continue();
        const q=route.request().postDataJSON()||{};
        if(q.action==='study_status')return route.fulfill({json:{enabled:true,cap:60}});
        if(q.action==='study_question'){
          questions++;
          const points=[{key:'1',label:'十月月考',detail:'2026-10-12',value:75},{key:'2',label:'期中考试',detail:'2026-11-11',value:82}];
          return route.fulfill({json:{
            id:q.requestId,answer:'数学的得分和年级位置一起变好了。',takeaway:'复盘两场数学里进步最大的题型。',
            charged:2,next:'物理也有变化吗？',evidence:[{kind:'change',label:'数学分差',value:'+5 分',source:'月考一 → 月考二'}],
            chart:{type:'line',title:'数学近两场走势',series:[
              {label:'数学',metric:'rate',points},
              {label:'数学',metric:'rank',points:points.map((p,i)=>({...p,value:i===0?36:28}))}
            ]}
          }});
        }
        return route.fulfill({json:{}});
      });
      await page.goto(origin,{waitUntil:'domcontentloaded'});
      await page.evaluate(()=>{
        Object.assign(state,{token:'fixture',user:{id:'fixture',username:'fixture'},page:'stats',exams:[],allExams:[]});
        render();
      });
      await page.getByRole('button',{name:'问成绩',exact:true}).click({timeout:6000});
      await page.getByRole('button',{name:'最近两场，哪科变化最大？'}).click();
      await page.getByRole('button',{name:'提问',exact:true}).click();
      await page.getByRole('button',{name:'数据',exact:true}).click();
      assert.equal(await page.locator('.sq-chart tbody tr').count(),2);
      await page.getByRole('button',{name:'图表',exact:true}).click();
      await page.getByRole('button',{name:'年级位置',exact:true}).click();
      await page.getByRole('button',{name:/十月月考，前 36/}).click();
      assert.match(await page.locator('.sq-chart-focused').textContent(),/前 36%/);
      assert.equal(questions,1);
      await page.locator('.sq-evidence summary').click();
      await page.getByRole('button',{name:'物理也有变化吗？'}).click();
      const box=await page.locator('.sq-dialog').evaluate(el=>({width:el.clientWidth,content:el.scrollWidth,
        viewport:innerWidth,input:el.querySelector('textarea').value,
        launcher:getComputedStyle(document.querySelector('.an-study-open')).backgroundImage,
        takeaway:el.querySelector('.sq-takeaway').textContent}));
      assert.ok(box.content<=box.width && box.width<=box.viewport,JSON.stringify(box));
      assert.equal(box.input,'物理也有变化吗？');assert.match(box.takeaway,/题型/);
      assert.match(box.launcher,/linear-gradient/);
      await page.getByRole('button',{name:'关闭',exact:true}).click();
      await page.getByRole('button',{name:'问成绩',exact:true}).click();
      assert.equal(await page.locator('.sq-turn').count(),1);
      assert.match(await page.locator('.sq-chart-focused').textContent(),/前 36%/);
      console.log(width+'px: launch, ask, chart, data, evidence and follow-up passed.');
      await page.close();
    }
  }finally{await browser?.close();server.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1});
