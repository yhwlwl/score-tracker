const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const {JSDOM} = require('jsdom');
const source = fs.readFileSync(path.join(__dirname, '../author-support.js'), 'utf8');
const vm = require('node:vm');
const helper = fs.readFileSync(path.join(__dirname, '../supabase/functions/score-tracker-notices/support.ts'), 'utf8').replace(/^export /gm,'');
const defaults = vm.runInNewContext(helper+'\nSUPPORT_DEFAULTS;', {atob});
const flush = () => new Promise(resolve => setTimeout(resolve, 15));

async function harness(options = {}) {
  const dom = new JSDOM('<!doctype html><div id="app"><div class="shell"><main id="content"></main></div></div><footer id="app-version-v17">版本</footer>', {url:'https://score.test/', runScripts:'outside-only', pretendToBeVisual:true});
  const w = dom.window, events = [], timers = new Map(), media = {}, observerCallbacks = [], intervals = [];
  let timerId = 0, requests = 0;
  w.matchMedia = query => media[query] ||= {matches:query.includes('reduce') ? !!options.reduced : !!options.mobile, listeners:[], addEventListener(type, fn) {this.listeners.push(fn)}};
  w.IntersectionObserver = class {constructor(fn) {this.fn=fn;observerCallbacks.push(fn)}observe() {this.fn([{isIntersecting:true}])}disconnect() {}};
  w.Image = class {set src(value) {Promise.resolve().then(() => options.imageFail ? this.onerror?.() : this.onload?.())}};
  w.setTimeout = (fn, ms) => {timers.set(++timerId, {fn, ms});return timerId};
  w.clearTimeout = id => timers.delete(id);
  w.setInterval = fn => {intervals.push(fn);return intervals.length};
  w.fetch = async () => {requests++;if(options.fetchFail)throw Error('offline');return {ok:true,json:async () => ({config:{...defaults,enabled:true,qr_image:'./real-qr.png',...options.config}})}};
  w.state = {page:options.page || 'home',token:'fixture',user:{id:'old-user',username:'测试账号'},exams:[{id:'exam'}],onboarding:null};
  w.__scoreTrackerTrack = (event, metadata) => events.push({event, metadata});
  w.studyPlannerCardV18 = () => '<a id="studyPlannerToolV18" class="study-tool-v18" href="https://study-planner.test/" target="_blank"><h3>Study Planner</h3></a>';
  w.trackStudyPlannerV18 = () => events.push({event:'planner_opened'});
  w.bindPage = () => w.document.getElementById('studyPlannerToolV18')?.addEventListener('click', w.trackStudyPlannerV18, {capture:true});
  w.render = () => {
    w.document.getElementById('app').innerHTML = '<div class="shell"><main id="content">' + (w.state.page === 'home' ? w.studyPlannerCardV18() : '<div class="account-grid"><div class="card account-card"><h3>我的账号</h3><code>测试账号</code></div><div class="card account-card">数据与安全</div></div>') + '</main></div>';
    w.bindPage();
  };
  w.renderLogin = () => {w.document.getElementById('app').innerHTML='<div class="auth-page">登录</div>'};
  w.render();w.eval(source);await flush();
  const fire = ms => {
    const rows = [...timers.entries()].filter(([, t]) => t.ms === ms);
    for (const [id, timer] of rows) {timers.delete(id);timer.fn()}
  };
  const pointer = (el, type, x, y, pointerType='touch') => {
    const event = new w.Event(type, {bubbles:true,cancelable:true});
    Object.assign(event,{clientX:x,clientY:y,pointerId:1,pointerType});el.dispatchEvent(event);
  };
  return {w,d:w.document,events,timers,media,fire,pointer,poll:() => intervals[0](),setConfig:value => {options.config=value},setVisible(value) {observerCallbacks.at(-1)?.([{isIntersecting:value}])},requests:() => requests,close:() => w.close()};
}
function active(h) {return Number(h.d.querySelector('.support-slide.active').dataset.supportSlide)}
function autoTimer(h) {return [...h.timers.values()].some(timer => timer.ms === 8000)}
(async () => {
  for (const options of [
    {config:{enabled:false,qr_image:'./real-qr.png'}}, {config:{enabled:true,qr_image:''}},
    {config:{enabled:true,qr_image:'https://foreign.test/qr.png'}}, {config:{enabled:true,qr_image:'javascript:alert(1)'}},
    {config:{enabled:true,qr_image:'./qr.svg'}}, {imageFail:true}, {fetchFail:true}
  ]) {
    const h = await harness(options);assert.equal(h.w.__scoreTrackerSupport.available(),false);
    assert(!h.d.querySelector('[data-support-open]'));assert(!h.d.querySelector('.support-carousel'));assert(h.d.getElementById('studyPlannerToolV18'));
    assert.equal(h.w.__scoreTrackerSupport.open(),false);h.close();
  }
  console.log('PASS: disabled, missing, invalid, offline and broken QR never expose an unusable payment entry');

  let h = await harness();assert.equal(active(h),0);assert(autoTimer(h));
  h.fire(8000);assert.equal(active(h),1);assert(!h.d.querySelector('.support-back'));
  assert.equal(h.d.querySelector('#studyPlannerToolV18').tabIndex,-1);
  assert.equal(h.d.querySelector('[data-support-open="home"]').tabIndex,0);
  h.fire(8000);assert.equal(active(h),0);
  const root = h.d.querySelector('.support-carousel');
  h.pointer(root,'pointerenter',0,0,'mouse');assert(!autoTimer(h));h.pointer(root,'pointerleave',0,0,'mouse');assert(autoTimer(h));
  h.setVisible(false);assert(!autoTimer(h));h.setVisible(true);assert(autoTimer(h));
  Object.defineProperty(h.d,'visibilityState',{configurable:true,value:'hidden'});h.d.dispatchEvent(new h.w.Event('visibilitychange'));assert(!autoTimer(h));
  Object.defineProperty(h.d,'visibilityState',{configurable:true,value:'visible'});h.d.dispatchEvent(new h.w.Event('visibilitychange'));assert(autoTimer(h));
  const blocker=h.d.createElement('div');blocker.className='rn-back';h.d.body.appendChild(blocker);await flush();assert(!autoTimer(h));blocker.remove();await flush();assert(autoTimer(h));
  h.d.querySelector('[data-support-dot="1"]').click();assert.equal(active(h),1);assert(!autoTimer(h));h.w.render();assert.equal(active(h),1);assert(!autoTimer(h));
  h.w.state.page='account';h.w.render();assert(!autoTimer(h));assert(h.d.querySelector('.account-grid > .account-card:first-child .support-entry'));
  h.w.state.page='home';h.w.render();assert.equal(active(h),0);assert(autoTimer(h));
  h.d.querySelector('[data-support-pause]').click();assert(!autoTimer(h));h.d.querySelector('[data-support-pause]').click();assert(autoTimer(h));
  h.w.state.page='account';h.w.render();h.w.state.page='home';h.w.render();
  const swipeRoot=h.d.querySelector('.support-carousel');h.pointer(swipeRoot,'pointerdown',200,20);h.pointer(swipeRoot,'pointerup',100,23);assert.equal(active(h),1);assert(!autoTimer(h));
  h.d.querySelector('[data-support-open="home"]').click();assert(!h.d.querySelector('.support-back'),'swipe must not trigger a click');
  h.close();console.log('PASS: 8-second rotation, pause/resume, visibility, modal ordering, manual persistence, page reset and swipe');

  h=await harness({reduced:true});assert(!autoTimer(h));assert(h.d.querySelector('[data-support-pause]').disabled);h.d.querySelector('[data-support-dot="1"]').click();assert.equal(active(h),1);h.close();
  h=await harness();const focus=h.d.querySelector('#studyPlannerToolV18');focus.focus();assert(!autoTimer(h));focus.blur();await flush();assert(autoTimer(h));
  focus.focus();focus.dispatchEvent(new h.w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));assert.equal(active(h),1);assert.equal(h.d.activeElement.dataset.supportOpen,'home');h.close();
  console.log('PASS: reduced-motion preference, focus pause, inactive slide accessibility and keyboard navigation');

  h=await harness({page:'account',mobile:true});const entry=h.d.querySelector('.support-entry');entry.focus();entry.click();
  const panel=h.d.querySelector('.support-panel');assert(panel);assert.equal(h.d.body.style.overflow,'hidden');assert(h.d.getElementById('app').hasAttribute('inert'));
  assert(h.d.querySelector('.support-help').textContent.includes('相册'));assert(!panel.textContent.includes('我已付款'));assert(!panel.querySelector('input'));
  const save=panel.querySelector('.support-save');save.focus();save.dispatchEvent(new h.w.KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true}));assert.equal(h.d.activeElement.className,'support-close');
  h.d.activeElement.dispatchEvent(new h.w.KeyboardEvent('keydown',{key:'Tab',shiftKey:true,bubbles:true,cancelable:true}));assert.equal(h.d.activeElement,save);
  let download=null;h.w.HTMLAnchorElement.prototype.click=function(){download={href:this.href,name:this.download}};
  save.click();assert(download.href.endsWith('/real-qr.png'));assert(h.d.querySelector('.support-status').textContent.includes('已发起'));assert(!h.d.querySelector('.support-status').textContent.includes('成功'));
  panel.dispatchEvent(new h.w.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));assert(!h.d.querySelector('.support-back'));assert.equal(h.d.activeElement,entry);assert(!h.d.getElementById('app').hasAttribute('inert'));assert.equal(h.d.body.style.overflow,'');
  entry.click();h.pointer(h.d.querySelector('.support-drag'),'pointerdown',10,0);h.pointer(h.d.querySelector('.support-drag'),'pointerup',10,90);assert(!h.d.querySelector('.support-back'));
  entry.click();h.d.querySelector('.support-qr img').dispatchEvent(new h.w.Event('error'));assert(h.d.querySelector('.support-save').disabled);assert(!h.d.querySelector('.support-entry'));assert(!h.d.querySelector('.support-footer'));h.d.querySelector('.support-close').click();h.close();
  console.log('PASS: mobile instructions, scroll lock, background inertness, focus trap/restore, truthful download, swipe-close and QR failure');

  h=await harness();assert.equal(h.w.__scoreTrackerSupport.decorateRelease,undefined);assert(!h.d.querySelector('.rn-back,.support-back,.support-release'));h.close();
  h=await harness({page:'account'});h.d.querySelector('.support-entry').click();h.w.state.user=null;h.w.state.token='';h.w.renderLogin();assert(!h.d.querySelector('.support-back'));assert(!h.d.querySelector('.support-footer'));assert.equal(h.d.body.style.overflow,'');h.close();
  console.log('PASS: no independent update introduction or automatic appreciation prompt; logout cleanup');
  h=await harness({page:'account',config:{title:'自定义 <img src=x>',intro:'介绍 <script>alert(1)</script>',entry_label:'给作者一点支持',footer_label:'支持独立开发'}});
  assert(h.d.querySelector('.support-entry').textContent.includes('给作者一点支持'));assert.equal(h.d.querySelector('.support-footer').textContent,'支持独立开发');
  h.d.querySelector('.support-entry').click();assert.equal(h.d.querySelector('#supportTitle').textContent,'自定义 <img src=x>');assert(!h.d.querySelector('#supportTitle img'));assert(!h.d.querySelector('#supportIntro script'));h.d.querySelector('.support-close').click();
  h.setConfig({title:'管理员修改后的标题'});h.poll();await flush();h.d.querySelector('.support-entry').click();assert.equal(h.d.querySelector('#supportTitle').textContent,'管理员修改后的标题');
  h.setConfig({enabled:false});h.poll();await flush();assert(!h.d.querySelector('.support-back'));assert(!h.d.querySelector('.support-entry'));assert(!h.d.querySelector('.support-footer'));h.close();
  console.log('PASS: administrator-edited copy, escaped text, refresh and disabled-setting cleanup');
  console.log('All author-support tests passed');
})().catch(error => {console.error(error);process.exitCode=1});
