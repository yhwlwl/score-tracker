// v17 preview: image-to-exam import. Recognition never saves directly; users review in the normal editor first.
var VISION_API_V17='https://kdwpmcdxapwecbfrvqtm.supabase.co/functions/v1/score-tracker-vision-preview';

(function injectV17Styles(){
  if(document.getElementById('app-v17-style'))return;
  var s=document.createElement('style');s.id='app-v17-style';s.textContent=`
  .vision-btn-v17{white-space:nowrap}
  .vision-overlay-v17{position:fixed;inset:0;z-index:120;background:#11182766;display:grid;place-items:center;padding:16px}
  .vision-sheet-v17{width:min(520px,100%);max-height:min(760px,92vh);overflow:auto;background:#fff;border-radius:22px;box-shadow:0 24px 70px #10182733;padding:20px}
  .vision-head-v17{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.vision-head-v17 h3{margin:0;font-size:18px}.vision-head-v17 p{margin:5px 0 0;color:var(--muted);font-size:12px;line-height:1.6}
  .vision-close-v17{border:0;background:#f3f5f8;width:34px;height:34px;border-radius:50%;font-size:20px;color:#667085}
  .vision-picker-v17{margin-top:16px;border:1px dashed #ccd3df;background:#fafbfe;border-radius:16px;padding:18px;text-align:center}.vision-picker-v17 b{display:block;font-size:14px}.vision-picker-v17 span{display:block;color:var(--muted);font-size:11px;margin-top:5px;line-height:1.5}
  .vision-actions-v17{display:flex;gap:9px;flex-wrap:wrap;margin-top:12px}.vision-actions-v17 button{flex:1;min-width:120px}
  .vision-files-v17{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}.vision-thumb-v17{aspect-ratio:1;border-radius:12px;overflow:hidden;background:#f1f3f6;position:relative}.vision-thumb-v17 img{width:100%;height:100%;object-fit:cover}.vision-thumb-v17 i{position:absolute;right:5px;top:5px;background:#111827cc;color:#fff;font-style:normal;font-size:10px;border-radius:999px;padding:3px 6px}
  .vision-status-v17{margin-top:13px;padding:11px 12px;border-radius:13px;background:#f5f7fb;color:#596474;font-size:12px;line-height:1.6}.vision-status-v17.error{background:#fff2f2;color:#b24750}.vision-status-v17.ok{background:#f1faf6;color:#267553}
  .vision-result-v17{margin-top:14px;display:grid;gap:8px}.vision-result-row-v17{border:1px solid var(--line);border-radius:13px;padding:10px 11px;display:grid;grid-template-columns:minmax(70px,.8fr) 1.5fr;gap:8px;font-size:11px}.vision-result-row-v17 b{font-size:12px}.vision-result-row-v17 span{color:#667085;line-height:1.55}
  .vision-warnings-v17{margin-top:10px;font-size:11px;color:#8a662a;line-height:1.65}.vision-privacy-v17{margin-top:12px;font-size:10px;color:var(--muted);line-height:1.6}
  @media(max-width:620px){.vision-overlay-v17{place-items:end center;padding:0}.vision-sheet-v17{width:100%;max-height:90vh;border-radius:22px 22px 0 0;padding:18px 16px calc(18px + env(safe-area-inset-bottom))}.vision-result-row-v17{grid-template-columns:74px 1fr}.vision-files-v17{gap:6px}}
  `;document.head.appendChild(s);
})();

function visionReadFileV17(file){return new Promise(function(resolve,reject){var reader=new FileReader();reader.onload=function(){resolve(reader.result)};reader.onerror=function(){reject(new Error('图片读取失败'))};reader.readAsDataURL(file);});}
function visionLoadImageV17(src){return new Promise(function(resolve,reject){var img=new Image();img.onload=function(){resolve(img)};img.onerror=function(){reject(new Error('这张图片暂时无法读取，请换成截图或 JPG/PNG'))};img.src=src;});}
async function visionCompressV17(file){
  if(!file||!String(file.type||'').startsWith('image/'))throw new Error('请选择图片文件');
  var src=await visionReadFileV17(file),img=await visionLoadImageV17(src),max=1500,scale=Math.min(1,max/Math.max(img.naturalWidth||img.width,img.naturalHeight||img.height));
  var w=Math.max(1,Math.round((img.naturalWidth||img.width)*scale)),h=Math.max(1,Math.round((img.naturalHeight||img.height)*scale));
  var c=document.createElement('canvas');c.width=w;c.height=h;var ctx=c.getContext('2d');ctx.drawImage(img,0,0,w,h);
  return c.toDataURL('image/jpeg',.8);
}
async function visionRecognizeV17(images){
  var response=await fetch(VISION_API_V17,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:state.token,images:images,context:{classificationLabel:typeof categoryLabelV14==='function'?categoryLabelV14():'分类',classificationOptions:typeof categoryOptionsV14==='function'?categoryOptionsV14():[],subjects:SUBJECTS}})});
  var data=await response.json().catch(function(){return{error:'识别服务返回异常'};});
  if(!response.ok)throw new Error(data.error||'识别失败');return data;
}
function visionValV17(v){return v===null||v===undefined?'':String(v)}
function visionSummaryV17(item){
  var parts=[];
  if(item.finalScore!=null)parts.push('最终 '+item.finalScore+(item.finalMax!=null?'/'+item.finalMax:''));
  if(item.rawScore!=null)parts.push('原始 '+item.rawScore+(item.rawMax!=null?'/'+item.rawMax:''));
  if(item.yearRank!=null)parts.push('年排 '+item.yearRank+(item.yearParticipants!=null?'/'+item.yearParticipants:''));
  if(item.classRank!=null)parts.push('班排 '+item.classRank+(item.classParticipants!=null?'/'+item.classParticipants:''));
  if(item.ambiguousScore!=null)parts.push('待确认分数 '+item.ambiguousScore);
  return parts.join(' · ')||'识别到科目，但没有可确定填写的数字';
}
function visionSetIfBlankV17(input,value,force){if(!input||value===null||value===undefined||value==='')return;if(force||!String(input.value||'').trim())input.value=visionValV17(value);}
function visionApplyResultV17(examModal,result){
  if(!examModal||!result)return;
  var meta=result.exam||{};
  visionSetIfBlankV17($('#examName',examModal),meta.name,false);
  if(meta.date&&$('#examDate',examModal))$('#examDate',examModal).value=meta.date;
  var category=$('#gradeLevelV14',examModal);if(category&&meta.category&&Array.from(category.options).some(function(o){return o.value===meta.category;}))category.value=meta.category;
  visionSetIfBlankV17($('#totalRankV16',examModal),meta.yearRank,false);visionSetIfBlankV17($('#totalParticipantsV16',examModal),meta.yearParticipants,false);
  visionSetIfBlankV17($('#totalClassRankV16',examModal),meta.classRank,false);visionSetIfBlankV17($('#totalClassParticipantsV16',examModal),meta.classParticipants,false);
  var list=$('#examSubjectsV16',examModal),add=$('#addExamSubjectV16',examModal);if(!list)return;
  (result.subjects||[]).forEach(function(item){
    if(!item||!item.name)return;
    var cards=$$('.exam-subject-card-v10',list),card=cards.find(function(x){return String($('.exam-subject-name-v10',x)?.value||'').trim()===String(item.name).trim();});
    if(!card&&add){add.click();cards=$$('.exam-subject-card-v10',list);card=cards[cards.length-1];if(card)$('.exam-subject-name-v10',card).value=item.name;}
    if(!card)return;
    visionSetIfBlankV17($('.target-v16',card),item.target,false);
    visionSetIfBlankV17($('.raw-v16',card),item.rawScore,false);visionSetIfBlankV17($('.rawmax-v16',card),item.rawMax,false);
    visionSetIfBlankV17($('.actual-v16',card),item.finalScore,false);visionSetIfBlankV17($('.max-v16',card),item.finalMax,false);
    visionSetIfBlankV17($('.year-rank-v16',card),item.yearRank,false);visionSetIfBlankV17($('.year-participants-v16',card),item.yearParticipants,false);
    visionSetIfBlankV17($('.class-rank-v16',card),item.classRank,false);visionSetIfBlankV17($('.class-participants-v16',card),item.classParticipants,false);
    $$('input',card).forEach(function(input){input.dispatchEvent(new Event('input',{bubbles:true}));});
  });
  toast('识别结果已填入，请对照原图检查后再保存');
}
function openVisionImportV17(examModal){
  var overlay=document.createElement('div');overlay.className='vision-overlay-v17';overlay.innerHTML=`<div class="vision-sheet-v17"><div class="vision-head-v17"><div><h3>识图填入</h3><p>选 1～3 张成绩截图。只把明确识别到的内容填进表单，保存前仍由你确认。</p></div><button class="vision-close-v17">×</button></div><div class="vision-picker-v17"><b>拍照或选择成绩截图</b><span>支持清晰的电子截图、成绩表照片；复杂手写单暂不保证。</span><input id="visionInputV17" type="file" accept="image/*" multiple hidden><div class="vision-actions-v17"><button class="secondary" id="visionPickV17">选择图片</button><button class="primary" id="visionRunV17" disabled>开始识别</button></div><div class="vision-files-v17" id="visionFilesV17"></div></div><div id="visionStatusV17" class="vision-status-v17">图片不会存进成绩数据库；识别完成后只保留结构化结果。</div><div id="visionResultV17" class="vision-result-v17"></div><div id="visionWarningsV17" class="vision-warnings-v17"></div><div id="visionApplyWrapV17"></div><div class="vision-privacy-v17">识别可能出错。原始分/赋分、年排/班排等只有图片语义明确时才会自动归类；不明确的数字会留给你手动确认。</div></div>`;document.body.appendChild(overlay);
  var files=[],data=[];var close=function(){overlay.remove();};$('.vision-close-v17',overlay).onclick=close;overlay.onclick=function(e){if(e.target===overlay)close();};
  var input=$('#visionInputV17',overlay),pick=$('#visionPickV17',overlay),run=$('#visionRunV17',overlay),status=$('#visionStatusV17',overlay),resultBox=$('#visionResultV17',overlay),warnings=$('#visionWarningsV17',overlay),applyWrap=$('#visionApplyWrapV17',overlay);
  pick.onclick=function(){input.click();};
  input.onchange=function(){files=Array.from(input.files||[]).slice(0,3);data=[];$('#visionFilesV17',overlay).innerHTML=files.map(function(file,i){return `<div class="vision-thumb-v17"><img src="${URL.createObjectURL(file)}"><i>${i+1}</i></div>`;}).join('');run.disabled=!files.length;status.className='vision-status-v17';status.textContent=files.length?`已选 ${files.length} 张，点击“开始识别”。`:'请选择图片';resultBox.innerHTML='';warnings.innerHTML='';applyWrap.innerHTML='';};
  run.onclick=async function(){if(!files.length)return;run.disabled=true;pick.disabled=true;status.className='vision-status-v17';status.textContent='正在读取和识别图片，请稍候…';try{data=[];for(var i=0;i<files.length;i++)data.push(await visionCompressV17(files[i]));var recognized=await visionRecognizeV17(data);status.className='vision-status-v17 ok';status.textContent=`识别完成：${(recognized.subjects||[]).length} 个科目 / 模块。先看一眼，再填入表单。`;resultBox.innerHTML=(recognized.subjects||[]).map(function(item){return `<div class="vision-result-row-v17"><b>${escapeHtml(item.name||'未命名')}</b><span>${escapeHtml(visionSummaryV17(item))}</span></div>`;}).join('')||'<div class="vision-result-row-v17"><b>未识别</b><span>没有找到可确定的科目数据。</span></div>';var ws=recognized.warnings||[];warnings.innerHTML=ws.length?'<b>需要确认：</b><br>'+ws.map(function(x){return '• '+escapeHtml(x);}).join('<br>'):'';applyWrap.innerHTML='<div class="vision-actions-v17"><button class="primary" id="visionApplyV17">填入当前表单</button><button class="secondary" id="visionAgainV17">换图片</button></div>';$('#visionApplyV17',overlay).onclick=function(){visionApplyResultV17(examModal,recognized);close();};$('#visionAgainV17',overlay).onclick=function(){input.value='';files=[];data=[];input.click();};}catch(e){status.className='vision-status-v17 error';status.textContent=e&&e.message?e.message:'识别失败，请稍后再试';run.disabled=false;pick.disabled=false;}finally{data=[];if(document.body.contains(run)){run.disabled=false;pick.disabled=false;}}};
}

var openExamBeforeV17=openExam;
openExam=function openExamV17(exam){
  openExamBeforeV17(exam);var modal=state.modal;if(!modal)return;var head=$('.section-head-v7',modal);if(!head||$('#visionImportBtnV17',modal))return;var button=document.createElement('button');button.type='button';button.className='secondary vision-btn-v17';button.id='visionImportBtnV17';button.textContent='📷 识图填入';button.onclick=function(){openVisionImportV17(modal);};head.appendChild(button);
};
