// Exercise the shipped page, including navigation and styles, with an in-memory account.
const {chromium}=require('playwright');
const {createServer}=require('node:http');
const {EventEmitter,once}=require('node:events');
const fs=require('node:fs/promises'), path=require('node:path'), assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
async function main(){
  const requests=new EventEmitter();
  const server=createServer(async(req,res)=>{
    const pathname=new URL(req.url,'http://localhost').pathname;
    if(pathname==='/api/score-tracker-study-api' && req.method==='POST'){
      const chunks=[];
      for await(const chunk of req) chunks.push(chunk);
      const q=JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if(q.action==='study_status'){
        res.writeHead(200,{'content-type':'application/json'}).end(JSON.stringify({enabled:true,cap:60}));
        return;
      }
      res.writeHead(200,{'content-type':'text/event-stream; charset=utf-8','cache-control':'no-store'});
      res.flushHeaders();
      requests.emit('question',{
        q,
        emit:(event,data)=>res.write('event: '+event+'\ndata: '+JSON.stringify(data)+'\n\n'),
        end:()=>res.end(),
      });
      return;
    }
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
      const countQuestion=()=>questions++;
      requests.on('question',countQuestion);
      await page.route('**/*',async route=>{
        const url=new URL(route.request().url());
        if(url.origin!==origin)return route.abort();
        if(url.pathname==='/api/score-tracker-study-api' || !url.pathname.startsWith('/api/'))return route.continue();
        return route.fulfill({json:{}});
      });
      await page.goto(origin,{waitUntil:'domcontentloaded'});
      await page.evaluate(()=>{
        Object.assign(state,{token:'fixture',user:{id:'fixture',username:'fixture'},page:'stats',exams:[],allExams:[]});
        render();
      });
      await page.getByRole('button',{name:'问成绩',exact:true}).click({timeout:6000});
      await page.getByRole('button',{name:'最近两场，哪科变化最大？'}).click();
      const queued=once(requests,'question');
      await page.getByRole('button',{name:'提问',exact:true}).click();
      const [stream]=await queued;
      assert.equal(stream.q.stream,true);
      assert.equal(await page.locator('.sq-question').textContent(),'最近两场，哪科变化最大？');
      assert.equal(await page.locator('#sq-input').inputValue(),'');
      stream.emit('progress',{stage:'records'});
      await page.getByText('正在查看考试记录…',{exact:true}).waitFor({timeout:5000});
      stream.emit('progress',{stage:'tools',tools:['results','difficulty']});
      await page.getByText('正在查看成绩变化和难度参考…',{exact:true}).waitFor({timeout:5000});
      stream.emit('progress',{stage:'analysis'});
      await page.getByText('正在整理分析…',{exact:true}).waitFor({timeout:5000});
      await page.locator('#sq-input').fill('下一条草稿');
      assert.equal(await page.getByRole('button',{name:'提问',exact:true}).isDisabled(),true);
      const points=Array.from({length:7},(_,i)=>({key:String(i+1),label:i===0?'十月月考':i===1?'期中考试':'测试'+i,
        detail:'2026-10-'+(12+i),value:i===0?75:80+i}));
      stream.emit('result',{status:200,data:{
        id:stream.q.requestId,answer:'**数学**比上次多拿了几分。\n\n排名也更靠前了。',chartAfter:[1],takeaway:'复盘两场数学里进步最大的题型。',
        widgets:[
          {type:'sparkline',title:'最近趋势',after:2,series:[{label:'数学',metric:'rate',dimension:'exams',points},{label:'物理',metric:'rate',dimension:'exams',points:points.map((p,i)=>({...p,value:72+i}))}]},
          {type:'bars',title:'最近成绩对比',after:2,series:[{label:'数学',metric:'rateChange',dimension:'exams',points:points.map((p,i)=>({...p,value:i-3}))}]},
          {type:'actions',title:'复习安排',after:2,items:[{label:'复盘错题',detail:'检查重复失分'}]}
        ],
        charged:2,next:'物理也有变化吗？',evidence:[{kind:'change',label:'数学分差',value:'+5 分',source:'月考一 → 月考二'}],
        chart:{type:'line',title:'历次得分率与位置',series:[
          {label:'数学',metric:'rate',dimension:'exams',points},
          {label:'数学',metric:'rank',dimension:'exams',points:points.map((p,i)=>({...p,value:i===0?36:28+i}))},
          {label:'物理',metric:'rate',dimension:'exams',points:points.map((p,i)=>({...p,value:72+i}))},
        ]}
      }});
      stream.end();
      await page.getByRole('button',{name:'数据',exact:true}).click();
      const answerStyle=await page.locator('.sq-answer').first().evaluate(el=>{
        const style=getComputedStyle(el);
        return {weight:style.fontWeight,spacing:style.whiteSpace};
      });
      assert.deepEqual(answerStyle,{weight:'400',spacing:'pre-line'});
      assert.equal(await page.locator('.sq-answer strong').textContent(),'数学');
      assert.equal(await page.locator('.sq-mini-card svg').count(),2);
      assert.equal(await page.locator('.sq-bar-fill').count(),7);
      assert.equal(await page.locator('.sq-action-item').count(),1);
      await page.locator('.sq-mini-data summary').first().click();
      assert.equal(await page.locator('.sq-mini-data').first().locator('.sq-mini-value').count(),7);
      assert.deepEqual(await page.locator('.sq-turn').evaluate(el=>Array.from(el.children).filter(x=>x.matches('.sq-answer,.sq-chart')).map(x=>x.classList.contains('sq-chart')?'chart':'text')),['text','chart','text']);
      assert.equal(await page.locator('#sq-input').inputValue(),'下一条草稿');
      assert.equal(await page.locator('.sq-chart tbody tr').count(),7);
      await page.getByRole('combobox',{name:'考试范围'}).selectOption('5');
      assert.equal(await page.locator('.sq-chart tbody tr').count(),5);
      await page.getByRole('combobox',{name:'考试范围'}).selectOption('0');
      await page.getByRole('button',{name:'图表',exact:true}).click();
      const physics=page.getByRole('group',{name:'显示或隐藏系列'}).getByRole('button',{name:'物理',exact:true});
      await physics.click();
      assert.equal(await physics.getAttribute('aria-pressed'),'false');
      await page.getByRole('button',{name:'散点',exact:true}).click();
      assert.equal(await page.locator('.sq-chart-frame.is-scatter').count(),1);
      assert.match(await page.locator('.sq-chart-axes').textContent(),/横轴 数学 · 得分率.*纵轴 数学 · 年级位置/);
      await page.getByRole('button',{name:'上一条数据',exact:true}).click();
      assert.match(await page.locator('.sq-chart-focused').textContent(),/测试5/);
      await page.getByRole('button',{name:'热力图',exact:true}).click();
      await page.getByRole('button',{name:'十月月考，物理 · 得分率，72%',exact:true}).click();
      assert.match(await page.locator('.sq-heat-readout').textContent(),/十月月考.*72%/);
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
      requests.off('question',countQuestion);
      console.log(width+'px: immediate send, live progress, chart, scatter, heatmap and follow-up passed.');
      await page.close();
    }
  }finally{await browser?.close();server.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1});
