/* Real application assets, synthetic session and isolated HTTP responses. */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),{seed,pre}=require('./build-exam-detail-visual.cjs');
const root=path.resolve(__dirname,'..'),output=process.env.REPLY_QA_OUTPUT||path.resolve(root,'../qa-announcement-replies');
fs.mkdirSync(output,{recursive:true});
const id='22222222-2222-4222-8222-222222222222',date='2026-11-01T08:00:00Z';
const api=`<script>
window.replyFixtureCalls=[];var replyUnread=true,oldFixtureFetch=window.fetch;
window.fetch=async function(url,opts){var b=JSON.parse(opts&&opts.body||'{}'),result;replyFixtureCalls.push(b.action);
if(['notice_public','notice_check','notice_history'].includes(b.action))result={config:{version:'v8.0',enabled:false,announcement_enabled:false,title:'更新',content:'更新'},seen:[]};
if(b.action==='announcement_reply_inbox')result=replyUnread?{count:1,rows:[{id:'${id}',notice_id:'old',comment_preview:'用了快两个月，成绩进步了不少，感谢你一直维护网站！'}]}:{count:0,rows:[]};
if(b.action==='announcement_reply_detail')result={notice:{id:'old',title:'一起完善成绩轨迹',content:'谢谢每一位认真使用、提出建议的同学。欢迎在评论区交流你的想法。',comments_public:false},read_only:true,comment:{id:'${id}',content:'用了快两个月，成绩进步了不少，感谢你一直维护网站！',author:'示例同学',created_at:'${date}',is_mine:true,reply_unread:true,reply_revision:1,reply:{content:'看到你的进步真的很开心！这主要还是你自己努力的结果，网站能帮上忙我就很满足啦。也祝你接下来的考试越来越顺利！',created_at:'${date}'}}};
if(b.action==='announcement_reply_read'){replyUnread=false;result={ok:true,read:true};}
if(result)return new Response(JSON.stringify(result));return oldFixtureFetch(url,opts);};
</script>`;
const post=`<script>document.addEventListener('DOMContentLoaded',function(){Object.assign(state,${JSON.stringify(seed)},{page:'home'});render();});</script>`;
const html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace('<head>','<head>'+pre+api).replace('</body>',post+'</body>');
const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://fixture').pathname;
  if(pathname==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');return res.end(html)}
  const file=path.resolve(root,'.'+decodeURIComponent(pathname));if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.statusCode=404;return res.end()}
  res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':file.endsWith('.svg')?'image/svg+xml':'application/octet-stream');res.end(fs.readFileSync(file));
});
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.PLAYWRIGHT_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH}:{})});
  try{
    for(const viewport of [{width:390,height:844},{width:320,height:740},{width:1280,height:900}]){
      const context=await browser.newContext({viewport}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
      await context.route('**/*',route=>{const url=new URL(route.request().url());return url.hostname==='127.0.0.1'?route.continue():route.abort()});
      await page.goto('http://127.0.0.1:'+server.address().port+'/');
      await page.waitForSelector('.bottom-nav .announcement-reply-dot',{state:'attached'});
      const nav=viewport.width<700?'.bottom-nav':'.desktop-nav';
      await page.screenshot({path:path.join(output,'nav-'+viewport.width+'.png')});
      await page.locator(nav+' [data-page="account"]').click();
      await page.waitForSelector('#announcementReplyGuide');
      assert(await page.locator('#announcementReplyGuide').isVisible());
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no horizontal page overflow');
      await page.screenshot({path:path.join(output,'account-'+viewport.width+'.png')});
      await page.locator('[data-announcement-reply]').first().click();await page.waitForSelector('.rn-admin-reply');
      await page.waitForFunction(()=>!document.querySelector('.announcement-reply-dot'));
      await page.waitForTimeout(350); // Capture the completed modal entrance animation.
      assert.equal(await page.locator('.rn-comments h3').textContent(),'我的评论与作者回复');
      assert(await page.locator('.rn-comment-form').isHidden());
      await page.screenshot({path:path.join(output,'reply-'+viewport.width+'.png')});
      await page.locator('.rn-close').click();assert.equal(await page.locator('#announcementReplyGuide').count(),0);
      assert.equal(await page.evaluate(()=>replyFixtureCalls.filter(x=>x==='announcement_reply_read').length),1);
      assert.deepEqual(errors,[]);await context.close();
    }
    console.log('PASS: real app red-dot navigation, top-of-account guide, targeted archive reply, visible read acknowledgement and no overflow at 320/390/1280px');console.log(output);
  }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
