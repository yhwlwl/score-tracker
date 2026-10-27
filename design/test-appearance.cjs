// Exercise the actual bundled account UI, persistence and cross-page reading preferences.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {JSDOM,VirtualConsole}=require('jsdom');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const pause=()=>new Promise(resolve=>setTimeout(resolve,45));
const fixture={id:'appearance-exam',name:'阶段检测',exam_date:'2026-10-10',scores:{数学:{actual:128,max:150,rank:12,participants:100},语文:{actual:116,max:150},英语:{actual:121,max:150}}};
async function harness(saved={},blocked=false){
  const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!e.message.includes('CSS'))errors.push(e.message)});
  const dom=new JSDOM(read('index.html').replace(/<script[\s\S]*?<\/script>/g,''),{url:'https://appearance.test/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc}),w=dom.window,d=w.document;
  for(const [key,value]of Object.entries(saved))w.localStorage.setItem(key,value);
  if(blocked){w.Storage.prototype.getItem=()=>{throw Error('blocked')};w.Storage.prototype.setItem=()=>{throw Error('blocked')};}
  w.matchMedia=()=>({matches:false,addEventListener(){},addListener(){}});w.scrollTo=()=>{};w.setInterval=()=>1;w.AbortController=AbortController;
  w.fetch=async()=>new Response(JSON.stringify({ok:true,enabled:false,exams:[],subjects:[],modules:[],options:[],myVotes:[],suggestions:[],availableCount:0,config:{enabled:false}}));
  w.eval(read('app-bundle.js')+'\nwindow.state=state;');
  for(const file of ['feature-vote.js','app-v36.js','app-v37.js','app-v38.js'])w.eval(read(file));
  await pause();
  Object.assign(w.state,{user:{id:'appearance-fixture',username:'外观验收'},token:'synthetic',page:'account',allExams:[fixture],exams:[fixture],unfilteredVisibleExamsV13:[fixture],modulesV18:[],gradeFiltersV61:[]});
  w.applyExamSubjectsV10(w.state.exams,[]);w.render();await pause();
  const click=s=>{assert(d.querySelector(s),'control: '+s);d.querySelector(s).click()};
  return{w,d,errors,click,close:()=>w.close()};
}
(async()=>{
  let h=await harness();
  try{
    assert.equal(h.d.querySelectorAll('.appearance-card-v29').length,1);
    assert.equal(h.d.querySelectorAll('[data-theme-opt-v29]').length,7);
    assert.equal(h.d.querySelectorAll('[data-reading-font-v29]').length,3);
    assert.equal(h.d.querySelectorAll('[data-reading-size-v29]').length,3);
    for(const font of ['system','sans','serif'])for(const size of ['compact','standard','large']){
      h.click('[data-reading-font-v29="'+font+'"]');h.click('[data-reading-size-v29="'+size+'"]');
      assert.equal(h.d.documentElement.dataset.uiFont,font);assert.equal(h.d.documentElement.dataset.uiSize,size);
      assert.deepEqual(JSON.parse(h.w.localStorage.getItem('st_reading_v1')),{font,size});
      for(const theme of h.w.__v29.THEMES){
        h.click('[data-theme-opt-v29="'+theme.id+'"]');
        assert.equal(h.w.__v29.currentTheme(),theme.id);assert.equal(h.d.documentElement.dataset.uiFont,font);assert.equal(h.d.documentElement.dataset.uiSize,size);
        assert.equal(h.d.querySelectorAll('[data-reading-font-v29][aria-pressed=true]').length,1);
        assert.equal(h.d.querySelectorAll('[data-reading-size-v29][aria-pressed=true]').length,1);
        assert.equal(h.d.querySelectorAll('[data-theme-opt-v29][aria-pressed=true]').length,1);
      }
    }
    h.click('[data-theme-opt-v29="sky"]');
    assert.equal(h.d.documentElement.style.getPropertyValue('--bg'),'#e8f4ff');
    assert.equal(h.d.querySelector('meta[name="theme-color"]').content,'#e8f4ff');
    const saved={st_reading_v1:h.w.localStorage.getItem('st_reading_v1'),st_theme:h.w.localStorage.getItem('st_theme')};
    for(const page of ['home','records','stats','account']){h.w.state.page=page;h.w.render();assert.equal(h.d.documentElement.dataset.uiFont,'serif');assert.equal(h.d.documentElement.dataset.uiSize,'large');}
    assert.equal(h.d.querySelector('.fv36-account-details').open,false,'vote options stay collapsed');
    h.close();h=await harness(saved);
    assert.equal(h.w.__v29.currentTheme(),'sky');assert.equal(h.d.documentElement.dataset.uiFont,'serif');assert.equal(h.d.documentElement.dataset.uiSize,'large');
    h.click('[data-appearance-reset-v29]');
    assert.equal(h.w.__v29.currentTheme(),'sunny');assert.equal(h.d.documentElement.dataset.uiFont,'system');assert.equal(h.d.documentElement.dataset.uiSize,'standard');
    assert.equal(h.d.querySelectorAll('.appearance-card-v29').length,1);
    assert.deepEqual(h.errors,[]);h.close();
    for(const value of ['broken json','null','[]','{"font":"<img src=x>","size":"huge"}']){
      h=await harness({st_reading_v1:value,st_theme:'invalid'});
      assert.equal(h.d.documentElement.dataset.uiFont,'system');assert.equal(h.d.documentElement.dataset.uiSize,'standard');assert.equal(h.w.__v29.currentTheme(),'sunny');assert(!h.d.querySelector('.appearance-card-v29 img'));assert.deepEqual(h.errors,[]);h.close();
    }
    h=await harness();h.w.Storage.prototype.getItem=()=>{throw Error('blocked')};h.w.Storage.prototype.setItem=()=>{throw Error('blocked')};h.click('[data-reading-font-v29="serif"]');h.click('[data-reading-size-v29="large"]');assert.equal(h.d.documentElement.dataset.uiFont,'serif');assert.deepEqual(h.errors,[]);
    for(const kind of ['sans','serif'])assert.equal(fs.readFileSync(path.join(root,'assets/fonts/score-'+kind+'-sc-v1.woff2')).subarray(0,4).toString(),'wOF2');
    console.log('PASS: seven themes × three fonts × three sizes, real controls, selection states, page navigation, reload, reset, invalid/blocked storage, collapsed vote details and WOFF2 assets.');
  }finally{h.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
