const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const html=vm.runInNewContext(fs.readFileSync(path.join(root,'api/mg-ui.js'),'utf8').replace('export const MG_HTML','const MG_HTML')+';MG_HTML');
const id='00000000-0000-4000-8000-000000000003';
const record={request_id:id,user_id:'fixture',username:'测试同学',created_at:'2026-10-17T08:00:00Z',status:'succeeded',http_status:200,upstream_status:200,
  model:'deepseek-v4.1-flash',duration_ms:13500,source_image_count:1,image_count:1,storage_status:'complete',quota_refunded:false,
  result:{exam:{name:'期中考试'},subjects:[{name:'数学',finalScore:128,finalMax:150,yearRank:36}],warnings:[]},
  images:[{path:id+'/0.png',url:'https://fixture.supabase.co/sample.png',source_index:0,kind:'original'}],
  attempts:[{attempt:1,max_tokens:9600,thinking:{type:'disabled'},duration_ms:13200,finish_reason:'stop',completion_tokens:700,reasoning_tokens:0}],
  image_meta:[{width:1080,height:1500}],diagnostics:{timings:[{phase:'auth_ok',elapsed_ms:123}]},storage_errors:[],raw_output:'{"subjects":[{"name":"数学","finalScore":128}]}' };
(async()=>{
  const browser=await chromium.launch({headless:true,
    ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH}:{}),
    ...(process.env.PLAYWRIGHT_CHROMIUM_ARGS?{args:JSON.parse(process.env.PLAYWRIGHT_CHROMIUM_ARGS)}:{}),
  });
  const output=path.resolve(root,'../qa-vision');fs.mkdirSync(output,{recursive:true});
  try{
    for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
      const context=await browser.newContext({viewport}),page=await context.newPage(),errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      await context.addInitScript(()=>localStorage.setItem('st_admin_token','fixture-token'));
      await page.route('https://fixture.supabase.co/**',route=>route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="640" height="300"><rect width="640" height="300" fill="#f3f6fd"/><text x="50" y="70" font-size="28">Midterm Exam</text><text x="50" y="130" font-size="24">Math 128 / 150    Rank 36</text><text x="50" y="180" font-size="24">English 111.5 / 150</text></svg>'}));
      const calls=[];
      await page.route('https://fixture.test/**',async route=>{
        const request=route.request(),url=new URL(request.url()),action=url.searchParams.get('action');
        if(!action)return route.fulfill({contentType:'text/html',body:html});
        assert.equal(request.headers()['x-score-token'],'fixture-token');calls.push(action);
        let body={ok:true};
        if(action==='vision_requests')body={rows:[record,{...record,request_id:'00000000-0000-4000-8000-000000000004',status:'failed',error_code:'upstream_timeout',quota_refunded:true}],total:32,summary:{succeeded:13,failed:18,rejected:1,success_rate:41.9,median_ms:13500,p95_ms:35000,errors:[{error_code:'model_output_truncated',count:7},{error_code:'upstream_timeout',count:5}]}};
        if(action==='vision_request_detail')body={record};
        await route.fulfill({contentType:'application/json',body:JSON.stringify(body)});
      });
      await page.goto('https://fixture.test/mg?view=vision');
      await page.getByRole('heading',{name:'识图记录',exact:true}).waitFor();
      await page.getByText('41.9%',{exact:true}).waitFor();
      assert(!await page.locator('#page').innerText().then(text=>text.includes('NaN')));
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      await page.screenshot({path:path.join(output,'admin-'+viewport.width+'.png'),fullPage:true});
      await page.getByRole('button',{name:'图片与结果',exact:true}).click();
      await page.getByRole('heading',{name:'识图详情',exact:true}).waitFor();
      await page.getByRole('heading',{name:'识别结果',exact:true}).waitFor();
      await page.getByAltText('本次识别使用的成绩单图片').waitFor();
      await page.screenshot({path:path.join(output,'detail-'+viewport.width+'.png'),fullPage:true});
      await page.getByRole('button',{name:'关闭预览',exact:true}).click();
      await page.selectOption('#visionStatus','failed');await page.getByText('41.9%',{exact:true}).waitFor();
      await page.getByRole('button',{name:'下一页',exact:true}).click();
      await page.getByText('第 2 / 2 页 · 32 条',{exact:true}).waitFor();
      assert(calls.includes('vision_request_detail'));assert.deepEqual(errors,[]);
      await context.close();
    }
    console.log('PASS: desktop/mobile admin navigation, rates, paging, filters, protected detail, images/results and no page overflow');
  }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
