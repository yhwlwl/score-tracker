// Manual browser regression: PAPER_UPLOAD_CHROMIUM=/usr/bin/chromium node design/test-paper-upload-browser.cjs
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright'),{harness,uid,input}=require('./test-paper-review.cjs');
(async()=>{
 const h=harness();await h.init();const calls=[],errors=[];let fail=true;
 const browser=await chromium.launch({headless:true,...(process.env.PAPER_UPLOAD_CHROMIUM?{executablePath:process.env.PAPER_UPLOAD_CHROMIUM}:{})});
 try{
 const page=await browser.newPage({viewport:{width:390,height:844}});page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://fixture.test/**',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.pathname==='/api/score-tracker-paper-review'){
   const body=request.postDataJSON();calls.push({action:body.action,page:body.page,view:body.view,size:Buffer.byteLength(request.postData())});
   if(body.action==='upload_page_view'&&body.view===1&&fail){fail=false;return route.fulfill({status:503,json:{error:'fixture interrupted upload'}});}
   if(Buffer.byteLength(request.postData())>=4500000)return route.fulfill({status:413,json:{error:'preview payload limit'}});
   const r=await h.call(body);return route.fulfill({status:r.status,body:await r.text(),contentType:'application/json'});
  }
  if(url.pathname.startsWith('/api/'))return route.fulfill({json:{ok:true,enabled:false,exams:[],subjects:[],modules:[],profile:{completed_at:'2026-10-01',school_prompted_at:'2026-10-01'}}});
  const file=path.resolve(__dirname,'..','.'+(url.pathname==='/'?'/index.html':url.pathname));
  if(!file.startsWith(path.resolve(__dirname,'..')+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:''});
  return route.fulfill({path:file});
 });
 await page.goto('https://fixture.test/');await page.waitForFunction(()=>window.ScorePaperReview);
 await page.evaluate(({uid,input})=>{
  Object.assign(state,{user:{id:uid},token:'test-token',page:'stats',analysisTab:'papers'});
  const host=document.createElement('section');host.id='upload-qa';document.body.appendChild(host);
  ScorePaperReview.mount({host,user:uid,token:'test-token',sessions:{},draftId:input.draft_id,isActive:()=>true,options:{purpose:'record',config_version:2}},'数学');
 },{uid,input});
 await page.locator('#upload-qa input[data-role=paper]').waitFor();
 const image=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=c.height=3600;const x=c.getContext('2d'),data=x.createImageData(c.width,c.height);let seed=11;for(let i=0;i<data.data.length;i+=4){for(let k=0;k<3;k++){seed=(1664525*seed+1013904223)>>>0;data.data[i+k]=seed>>>24;}data.data[i+3]=255;}x.putImageData(data,0,0);return c.toDataURL('image/jpeg',.95);});
 const bytes=Buffer.from(image.split(',')[1],'base64');assert(bytes.length>10*1024*1024&&bytes.length<20*1024*1024,'photo lies between old and new raw-file limits');
 await page.locator('#upload-qa input[data-role=paper]').setInputFiles({name:'large-photo.jpg',mimeType:'image/jpeg',buffer:bytes});
 await page.locator('#upload-qa .pr-page img').waitFor({timeout:60000});await page.locator('#upload-qa #pr-consent').check();
 const save=async()=>{const button=page.getByRole('button',{name:'保存资料草稿',exact:true});await button.click();await page.waitForFunction(()=>Array.from(document.querySelectorAll('#upload-qa button')).some(b=>b.textContent==='保存资料草稿'&&!b.disabled));};
 await save();await page.locator('#upload-qa .pr-message').filter({hasText:'fixture interrupted upload'}).waitFor();
 assert.equal(h.tables.score_tracker_paper_materials[0].pages[0].detail_images.length,1);
 const originalUploads=calls.filter(c=>c.action==='upload_page').length;
 await save();await page.locator('#upload-qa .pr-message').filter({hasText:'草稿已保存，可从试卷列表继续上传'}).waitFor({timeout:60000});
 assert.equal(calls.filter(c=>c.action==='upload_page').length,originalUploads,'retry keeps the source and successfully uploaded views');
 assert(calls.filter(c=>['upload_page','upload_page_view'].includes(c.action)).every(c=>c.size<4500000));
 const before=calls.length;await save();await page.locator('#upload-qa .pr-message').filter({hasText:'草稿已保存，可从试卷列表继续上传'}).waitFor();assert(!calls.slice(before).some(c=>c.action.startsWith('upload_page')),'unchanged saved pages are not uploaded again');
 assert.equal(h.upstream.length,0,'saving scans never calls a model');assert.deepEqual(errors,[]);
 console.log('PASS: mobile browser accepts a >10 MB photo, automatically bounds every encoded asset, uploads below proxy limit, retains partial uploads and skips unchanged saved pages');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
