/* Browser → actual notices handler → isolated fixture database → public UI. No production writes. */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),vm=require('node:vm'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const helper=fs.readFileSync(path.join(root,'supabase/functions/score-tracker-notices/support.ts'),'utf8').replace(/^export /gm,'');
const moduleSource=fs.readFileSync(path.join(root,'api/mg-ui.js'),'utf8');
const adminHtml=moduleSource.slice(moduleSource.indexOf('`')+1,moduleSource.lastIndexOf('`'));
const copy=vm.runInNewContext(helper+'\nSUPPORT_DEFAULTS;', {atob});
const storage={config:{...copy},revision:1,updated_at:null};
const tokens={};for(const token of ['browser-admin','browser-user'])tokens[require('node:crypto').createHash('sha256').update(token).digest('hex')]=token;
const noticeConfig={version:'v7.0',enabled:false,title:'v7.0 更新内容',content:'测试更新',tip_enabled:false,tip_content:'',announcement_enabled:false,announcement_title:'公告',announcement_content:'',announcement_comments_enabled:false,announcement_comments_public:true,announcement_comment_title:'评论',revision:1,updated_at:null};
let handler;
const db={from(table){const q={filters:{},changes:null,select(){return this},eq(key,value){this.filters[key]=value;return this},update(changes){this.changes=changes;return this},order(){return this},limit(){return this},async insert(){return {error:null}},async single(){return {data:{...noticeConfig},error:null}},async maybeSingle(){
  if(table==='score_tracker_support_config'){
    if(this.changes){if(this.filters.revision!==storage.revision)return {data:null,error:null};Object.assign(storage,this.changes);return {data:{revision:storage.revision},error:null}}
    return {data:{...storage},error:null};
  }
  if(table==='score_tracker_users'){const token=tokens[this.filters.session_token_hash];return {data:token?{id:token==='browser-admin'?'11111111-1111-4111-8111-111111111111':'22222222-2222-4222-8222-222222222222',is_admin:token==='browser-admin',session_expires_at:new Date(Date.now()+3600000).toISOString()}:null,error:null}}
  return {data:null,error:null};
},then(resolve,reject){return Promise.resolve({data:[],error:null}).then(resolve,reject)}};return q}};
const service={atob,Deno:{env:{get:()=>''},serve:fn=>{handler=fn}},createClient:()=>db,Response,Request,crypto:require('node:crypto').webcrypto,TextEncoder,URL,console};
vm.createContext(service);vm.runInContext(helper+'\n'+fs.readFileSync(path.join(root,'supabase/functions/score-tracker-notices/index.ts'),'utf8').replace(/^import .*;\n/gm,''),service);
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.webmanifest':'application/json'};
const server=http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost');
    if(url.pathname==='/mg'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(adminHtml);return}
    if(url.pathname==='/mg/api'||url.pathname==='/api/score-tracker-notices'){
      let body='';for await(const chunk of req)body+=chunk;
      const response=await handler(new Request(url,{method:req.method,headers:req.headers,...(req.method==='POST'?{body}:{})}));
      res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());return;
    }
    if(url.pathname.startsWith('/api/')){
      const data={ok:true,rows:[],options:[],modules:[],exams:[],subject_configs:[],categories:[],profile:{completed_at:'2026-08-01',school_prompted_at:'2026-08-01',school:{name:'测试学校'}}};
      res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data));return;
    }
    const file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':url.pathname));
    if(!file.startsWith(root+path.sep)||!types[path.extname(file)]||!fs.existsSync(file)){res.writeHead(404);res.end();return}
    res.setHeader('Content-Type',types[path.extname(file)]);res.end(fs.readFileSync(file));
  }catch(error){console.error(error);res.writeHead(500);res.end('test server error')}
});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
  const output=fs.mkdtempSync(path.join(root,'../support-ui-qa-'));
  const browser=await chromium.launch({headless:true,executablePath:chromium.executablePath()});
  try{
    const admin=await browser.newPage({viewport:{width:1365,height:900}});
    await admin.addInitScript(()=>localStorage.setItem('st_admin_token','browser-admin'));
    await admin.goto(base+'/mg?view=support');await admin.locator('#supportForm').waitFor();
    const dataUrl=await admin.evaluate(()=>{const c=document.createElement('canvas');c.width=240;c.height=240;const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,240,240);ctx.strokeStyle='#d6dbe4';ctx.strokeRect(12,12,216,216);ctx.fillStyle='#687386';ctx.textAlign='center';ctx.font='16px sans-serif';ctx.fillText('TEST IMAGE',120,112);ctx.font='12px sans-serif';ctx.fillText('NOT A PAYMENT CODE',120,137);return c.toDataURL('image/png')});
    await admin.locator('#supportQrFile').setInputFiles({name:'test-image.png',mimeType:'image/png',buffer:Buffer.from(dataUrl.split(',')[1],'base64')});
    await admin.locator('#supportQrPreview img').waitFor();
    await admin.locator('#support_intro').fill('成绩轨迹由我独立开发和维护。如果它帮你更清楚地了解自己的成绩，欢迎随意赞赏，支持我继续完善它。');
    await admin.locator('[data-support-field="enabled"]').check();await admin.locator('#supportSave').click();
    await admin.waitForFunction(()=>document.getElementById('supportSaveState').textContent==='已保存');
    assert.equal(storage.config.enabled,true);assert.equal(storage.config.qr_image,dataUrl);
    await admin.screenshot({path:path.join(output,'admin.png'),fullPage:true});await admin.close();

    for(const test of [{name:'mobile',width:375,height:812,theme:'sunny'},{name:'desktop',width:1365,height:900,theme:'sunny'},{name:'dark',width:390,height:844,theme:'night'}]){
      const page=await browser.newPage({viewport:{width:test.width,height:test.height},isMobile:test.width<620,hasTouch:test.width<620});const errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      await page.addInitScript(theme=>{localStorage.setItem('st_pwa_install_v1',JSON.stringify({never:true}));localStorage.setItem('st_theme',theme)},test.theme);
      await page.clock.install();await page.goto(base);
      await page.waitForFunction(()=>window.__scoreTrackerSupport?.available());
      await page.evaluate(()=>{
        state.user={id:'22222222-2222-4222-8222-222222222222',username:'测试账号'};state.token='browser-user';
        state.exams=[{id:'test',name:'测试考试',exam_date:'2026-10-01',scores:{数学:{actual:120,max:150,rank:20,participants:100}}}];state.allExams=state.exams;state.page='home';render();
      });
      await page.locator('.support-carousel').scrollIntoViewIfNeeded();await page.mouse.move(0,0);
      await page.clock.runFor(8200);
      assert.equal(await page.locator('.support-slide.active').getAttribute('data-support-slide'),'1');
      await page.screenshot({path:path.join(output,test.name+'-home.png')});
      const sizes=await page.locator('.support-slide').evaluateAll(slides=>slides.map(slide=>slide.getBoundingClientRect().height));assert(Math.abs(sizes[0]-sizes[1])<1);
      await page.locator('[data-support-open="home"]').click();await page.locator('.support-panel').waitFor();
      const geometry=await page.locator('.support-panel').boundingBox();assert(geometry.x>=0&&geometry.x+geometry.width<=test.width+1&&geometry.y>=0&&geometry.y+geometry.height<=test.height+1);
      assert.equal(await page.locator('#supportIntro').textContent(),storage.config.intro);
      assert.equal(await page.locator('.support-qr').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(255, 255, 255)');
      await page.screenshot({path:path.join(output,test.name+'-panel.png')});
      const downloadPromise=page.waitForEvent('download');await page.locator('.support-save').click();const download=await downloadPromise;assert(download.suggestedFilename().endsWith('.png'));assert(!await page.locator('.support-status').textContent().then(text=>text.includes('成功')));
      await page.keyboard.press('Escape');assert.equal(await page.locator('.support-back').count(),0);
      await page.evaluate(()=>{state.page='account';render()});await page.locator('.support-entry').waitFor();
      await page.locator('.support-entry').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,test.name+'-account.png')});
      assert.equal(await page.locator('.account-grid > .account-card').first().locator('.support-entry').count(),1);
      assert.equal(await page.locator('.support-footer').count(),1);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      assert.deepEqual(errors,[]);await page.close();console.log('PASS browser',test.name,'admin-edited copy, autoplay, same-height slides, modal, real download, account entry, footer and overflow');
    }
    console.log('Screenshots:',output);
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
})().catch(error=>{console.error(error);server.close();process.exitCode=1});
