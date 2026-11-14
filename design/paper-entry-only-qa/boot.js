document.addEventListener('DOMContentLoaded',function(){
 var f=window.__entryPreview,store=window.__entryReplay.store;
 Object.assign(state,{user:{id:f.user,username:'试题录入预览'},token:'entry-preview-local',page:'stats',analysisTab:'papers',exams:store.exams,allExams:store.exams,subjectConfigs:[{name:'数学',defaultMax:150},{name:'物理',defaultMax:100}],modulesV18:[]});
 render();
 var banner=document.createElement('aside');banner.className='entry-preview-banner';banner.innerHTML='<div><b>试题录入 · 精简预览</b><span>真实合成演示数据 · 数学8题 / 物理8题</span></div><p>仅演示识别结果、核对与题型保存。本页不含真实账号数据，上传示例为合成试题页；不会调用 AI 或修改真实账号。</p><div><button type="button" data-entry-list>查看示例试题</button><button type="button" data-entry-upload>体验上传流程</button><button type="button" data-entry-reset>重置预览</button></div>';
 document.body.prepend(banner);
 banner.querySelector('[data-entry-list]').onclick=function(){if(!ScorePaperHub.canLeave())return;var list=document.querySelector('[data-hub=list]');if(list){list.click();return;}state.page='stats';state.analysisTab='papers';render();};
 banner.querySelector('[data-entry-upload]').onclick=function(){if(!ScorePaperHub.canLeave())return;state.page='stats';state.analysisTab='papers';render();requestAnimationFrame(function(){var b=document.querySelector('[data-hub=new]');if(b)b.click();});};
 banner.querySelector('[data-entry-reset]').onclick=function(){if(confirm('清除本预览里的修改，恢复两份示例转录？真实账号不受影响。'))window.__entryReplay.reset();};
 var busy=false;
 new MutationObserver(function(){if(busy)return;busy=true;try{
  var intro=document.querySelector('.pr-intro');if(intro&&!intro.querySelector('.entry-sample-tools')){
   var tools=document.createElement('div');tools.className='entry-sample-tools';tools.innerHTML='<p>此预览不识别新照片。选择示例样本，体验上传 → 核对 → 保存。</p><button type="button" class="pr-button" data-entry-sample="数学">载入数学示例样本</button><button type="button" class="pr-button" data-entry-sample="物理">载入物理示例样本</button>';intro.appendChild(tools);
   tools.querySelectorAll('[data-entry-sample]').forEach(function(b){b.onclick=function(){window.__entryReplay.fillSample(b.dataset.entrySample);};});
  }
  document.querySelectorAll('.pr-record-view .pr-materials').forEach(function(el){if(!el.querySelector('.entry-source-note')){var p=document.createElement('p');p.className='pr-muted entry-source-note';p.textContent='此处是合成示例，不包含真实原图；仅用于体验核对、保存和题型统计。';el.prepend(p);}});
 }finally{busy=false;}}).observe(document.getElementById('app'),{childList:true,subtree:true});
 var record=new URL(location.href).searchParams.get('sample');if(record){var r=store.records.find(function(r){return record==='physics'?r.subject==='物理':r.subject==='数学';});if(r)requestAnimationFrame(function(){ScorePaperHub.open(r.request_id);});}
});
