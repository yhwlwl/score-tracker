const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {JSDOM}=require(require.resolve('jsdom',{paths:[process.cwd(),process.env.NODE_PATH||'']}));
const source=fs.readFileSync(path.join(__dirname,'..','announcement-settings.js'),'utf8');
const dom=new JSDOM('<!doctype html><body><main id="content"></main></body>',{url:'https://test/',runScripts:'outside-only'}),calls=[];
const context={document:dom.window.document,window:dom.window,accountHtml:()=>'<div class="existing-account">已有设置</div>',bindPage:()=>{},console};
context.window.__releaseNotices={openAnnouncement:async()=>{calls.push('open')}};
Object.assign(context,context.window);require('node:vm').createContext(context);require('node:vm').runInContext(source,context);
const html=context.accountHtml();assert(html.includes('id="openAnnouncementSettings"'));context.document.getElementById('content').innerHTML=html;context.bindPage();context.document.getElementById('openAnnouncementSettings').click();
setTimeout(()=>{try{assert.deepEqual(calls,['open']);console.log('PASS: account settings announcement entry opens the manual history flow');}catch(e){console.error(e);process.exitCode=1}finally{dom.window.close()}},20);
