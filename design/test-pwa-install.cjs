const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const {JSDOM} = require('jsdom');
const source = fs.readFileSync(path.join(__dirname, '../pwa-install.js'), 'utf8');
const tick = () => new Promise(r => setTimeout(r, 10));
function harness(options = {}) {
  const dom = new JSDOM('<!doctype html><button id="origin">打开</button>' + (options.login ? '<div class="auth-page"></div>' : '<div class="shell"></div>'), {url:'https://score.test',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window, events=[], timers=new Map();let id=0, mode=!!options.standalone;
  Object.defineProperty(w.navigator,'userAgent',{value:options.ua||'Chrome Windows'});
  Object.defineProperty(w.navigator,'maxTouchPoints',{value:options.touch||0});
  w.matchMedia=query=>({matches:mode&&query.includes('standalone'),addEventListener(){}});
  w.state={onboarding:!!options.onboarding};w.accountHtml=()=>'<div>个人页</div>';w.toast=()=>{};
  w.__scoreTrackerTrack=(event,meta)=>events.push({event,meta});
  w.setTimeout=(fn,ms)=>{timers.set(++id,{fn,ms});return id};w.clearTimeout=i=>timers.delete(i);
  if(options.pref)w.localStorage.setItem('st_pwa_install_v1',JSON.stringify(options.pref));
  if(options.noStorage)Object.defineProperty(w.Storage.prototype,'setItem',{value(){throw Error('blocked')}});
  w.eval(source);w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  const run=()=>{const entries=[...timers.values()];timers.clear();entries.forEach(t=>t.fn())};
  const native=(outcome='accepted',throws=false)=>{const e=new w.Event('beforeinstallprompt',{cancelable:true});e.prompt=async()=>{if(throws)throw Error('unavailable')};e.userChoice=Promise.resolve({outcome});w.dispatchEvent(e);assert.equal(e.defaultPrevented,true)};
  return {w,d:w.document,events,timers,run,native,setMode:v=>mode=v,close:()=>w.close()};
}
(async()=>{
  let h=harness();h.d.querySelector('#origin').focus();h.run();assert(h.d.querySelector('.pwa-back'));assert.equal(h.events.filter(x=>x.event==='pwa_install_prompt_shown').length,1);assert.equal(h.d.querySelector('[data-pwa-platform].active').dataset.pwaPlatform,'desktop');
  const buttons=h.d.querySelectorAll('.pwa-modal button:not(:disabled)'),last=buttons[buttons.length-1];last.focus();h.d.dispatchEvent(new h.w.KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true}));assert.equal(h.d.activeElement,h.d.querySelector('.pwa-close'));
  h.d.dispatchEvent(new h.w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert(!h.d.querySelector('.pwa-back'));assert.equal(h.d.body.style.overflow,'');assert.equal(h.d.activeElement.id,'origin');assert(JSON.parse(h.w.localStorage.getItem('st_pwa_install_v1')).until>Date.now()+6*86400000);h.run();assert(!h.d.querySelector('.pwa-back'));h.w.__scoreTrackerPwa.open();assert(h.d.querySelector('.pwa-back'));h.d.querySelector('#pwaNever').click();assert(JSON.parse(h.w.localStorage.getItem('st_pwa_install_v1')).never);h.close();
  for(const pref of [{never:true},{installed:true},{until:Date.now()+100000}]){h=harness({pref});h.run();assert(!h.d.querySelector('.pwa-back'));h.close()}
  h=harness({standalone:true});h.run();h.w.__scoreTrackerPwa.open();assert(!h.d.querySelector('.pwa-back'));assert(h.w.accountHtml().includes('已从主屏幕打开'));h.close();
  h=harness({login:true});h.run();assert(!h.d.querySelector('.pwa-back'));h.d.querySelector('.auth-page').className='shell';h.run();assert(h.d.querySelector('.pwa-back'));h.close();
  for(const blocker of ['modal-backdrop','rn-back','fv36-back','st-fb-back']){h=harness();const b=h.d.createElement('div');b.className=blocker;h.d.body.appendChild(b);h.run();assert(!h.d.querySelector('.pwa-back'));b.remove();h.run();assert(h.d.querySelector('.pwa-back'));h.close()}
  h=harness({onboarding:true});h.run();assert(!h.d.querySelector('.pwa-back'));h.w.state.onboarding=false;h.run();assert(h.d.querySelector('.pwa-back'));h.close();
  h=harness({ua:'Macintosh Safari',touch:5});h.run();assert.equal(h.d.querySelector('[data-pwa-platform].active').dataset.pwaPlatform,'ios');assert(h.d.querySelector('#pwaGuide').textContent.includes('添加到主屏幕'));h.close();
  h=harness({ua:'Android Chrome'});h.native();h.run();assert(!h.d.querySelector('#pwaInstall').hidden);h.d.querySelector('#pwaInstall').click();await tick();assert(!h.d.querySelector('.pwa-back'));assert(JSON.parse(h.w.localStorage.getItem('st_pwa_install_v1')).installed);assert(h.events.some(x=>x.event==='pwa_install_result'&&x.meta.outcome==='accepted'));h.close();
  h=harness();h.run();assert(h.d.querySelector('#pwaInstall').hidden);h.native('dismissed');assert(!h.d.querySelector('#pwaInstall').hidden);h.d.querySelector('#pwaInstall').click();await tick();assert(!h.d.querySelector('.pwa-back'));assert(!JSON.parse(h.w.localStorage.getItem('st_pwa_install_v1')).installed);h.close();
  h=harness();h.native('accepted',true);h.run();h.d.querySelector('#pwaInstall').click();await tick();assert(h.d.querySelector('#pwaStatus').textContent.includes('没能打开'));assert(h.d.querySelector('#pwaInstall').hidden);assert(h.events.some(x=>x.event==='pwa_install_error'));h.close();
  h=harness({noStorage:true});h.run();h.d.querySelector('#pwaLater').click();h.d.querySelector('#origin').click();h.run();assert(!h.d.querySelector('.pwa-back'));h.close();
  h=harness();h.w.dispatchEvent(new h.w.Event('appinstalled'));h.run();assert(!h.d.querySelector('.pwa-back'));h.close();
  console.log('PWA: installation, guidance, suppression, modal ordering, accessibility and telemetry passed');
})().catch(e=>{console.error(e);process.exitCode=1});
