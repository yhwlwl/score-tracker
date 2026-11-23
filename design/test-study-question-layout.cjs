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
    browser=await chromium.launch({channel:'chrome'});
    for(const width of [390,820,1366]){
      const page=await browser.newPage({viewport:{width,height:820},serviceWorkers:'block'});
      await page.route('**/*',async route=>{
        const url=new URL(route.request().url());
        if(url.origin!==origin)return route.abort();
        if(!url.pathname.startsWith('/api/'))return route.continue();
        const q=route.request().postDataJSON()||{};
        if(q.action==='study_status')return route.fulfill({json:{enabled:true,cap:60}});
        if(q.action==='study_question')return route.fulfill({json:{id:q.requestId,answer:'数学提高了 5 分。',charged:2,next:'物理也有变化吗？',evidence:[{kind:'change',label:'数学分差',value:'+5 分',source:'月考一 → 月考二'}]}});
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
      await page.locator('.sq-evidence summary').click();
      await page.getByRole('button',{name:'物理也有变化吗？'}).click();
      const box=await page.locator('.sq-dialog').evaluate(el=>({width:el.clientWidth,content:el.scrollWidth,
        viewport:innerWidth,input:el.querySelector('textarea').value,chip:el.querySelector('.sq-changes').textContent}));
      assert.ok(box.content<=box.width && box.width<=box.viewport,JSON.stringify(box));
      assert.equal(box.input,'物理也有变化吗？');assert.match(box.chip,/\+5 分/);
      await page.getByRole('button',{name:'关闭',exact:true}).click();
      await page.getByRole('button',{name:'问成绩',exact:true}).click();
      assert.equal(await page.locator('.sq-turn').count(),1);
      console.log(width+'px: launch, submit, evidence, follow-up and reopen passed.');
      await page.close();
    }
  }finally{await browser?.close();server.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1});
