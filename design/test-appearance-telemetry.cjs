// Exercise the actual telemetry transport and actual appearance controls together.
const assert=require('node:assert/strict'),{harness}=require('./test-theme-studio.cjs');
(async()=>{
  const h=await harness();
  try{
    const {w,d,click}=h,events=()=>h.requests.filter(x=>x.action==='track_event'&&x.eventType.startsWith('appearance_studio_')),
      by=type=>events().filter(x=>x.eventType==='appearance_studio_'+type);
    assert.equal(by('entry_shown').length,1);assert.equal(by('loaded').length,1);
    w.bindPage();w.bindPage();assert.equal(by('entry_shown').length,1,'rerenders do not inflate exposure');
    click('[data-st-open]');click('[data-preset=study-shore]');
    assert.equal(by('opened').length,1);assert.equal(by('opened')[0].metadata.source,'account');
    assert.equal(by('option_selected').at(-1).metadata.value,'study-shore');
    click('[data-tab=background]');const slider=d.querySelector('[data-range=intensity]');
    const before=by('option_selected').length;
    for(let n=40;n<60;n++){slider.value=n;slider.dispatchEvent(new w.Event('input',{bubbles:true}));}
    assert.equal(by('option_selected').length,before,'slider inputs do not generate requests');
    slider.dispatchEvent(new w.Event('change',{bubbles:true}));assert.equal(by('option_selected').length,before+1);
    click('[data-view-art]');d.querySelector('.st-art-viewer button').click();assert.equal(by('artwork_opened').length,1);
    click('[data-page-preview]');d.querySelector('.st-inspect-bar [data-return]').click();
    assert.equal(by('page_preview_started').length,1);assert.equal(by('page_preview_returned').length,1);
    click('[data-tab=saved]');d.querySelector('#stLookName').value='私密收藏名称不要记录';
    d.querySelector('.st-studio form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
    assert.equal(by('favorite_added').length,1);
    click('[data-apply]');assert.equal(by('applied').length,1);
    const applied=by('applied')[0];assert(applied.metadata.duration_ms>=0);assert(applied.metadata.selection_count>=2);
    assert.equal(applied.metadata.studio_session_id,by('opened')[0].metadata.studio_session_id);
    assert.equal(applied.metadata.background,'study-shore');assert.equal(applied.context.appPage,'account');
    click('[data-st-open]');click('[data-tab=decor]');click('[data-deco=charm-quiet-kitten]');click('[data-undo]');
    assert.equal(by('undone').length,1);
    d.querySelector('.st-studio').dispatchEvent(new w.Event('cancel',{bubbles:true,cancelable:true}));
    assert.equal(by('cancelled').length,1);assert.equal(by('cancelled')[0].metadata.reason,'escape');assert.equal(by('applied').length,1);
    click('[data-st-open]');click('[data-preset=garden]');
    const setItem=w.Storage.prototype.setItem;w.Storage.prototype.setItem=()=>{throw Error('blocked')};
    click('[data-apply]');assert.equal(by('save_failed').length,1);assert.equal(by('applied').length,1);assert(d.querySelector('.st-studio'));
    w.Storage.prototype.setItem=setItem;click('[data-close]');
    assert(!JSON.stringify(events().map(x=>x.metadata)).includes('私密收藏名称不要记录'));
    assert(events().every(x=>!('overrides' in x.metadata)),'card identifiers are not reported');
    w.__scoreTrackerTrack=()=>{throw Error('logger failed')};click('[data-st-open]');click('[data-preset=cloud]');click('[data-apply]');
    assert.equal(w.ScoreAppearance.get().theme,'cloud','telemetry failure does not break saving');
    assert.deepEqual(h.errors,[]);
    console.log('PASS: real telemetry transport, deduplicated exposure, session funnel, preset/slider/artwork/preview/favorites, confirmed save vs cancel/failure, private metadata and logger isolation');
  }finally{h.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
