/* Exam entry layout: presentation only. Existing input nodes, data and handlers remain authoritative. */
(function () {
  'use strict';
  if (typeof openExam !== 'function') return;
  var css = document.createElement('style');
  css.id = 'exam-entry-layout-style';
  css.textContent = [
    '.st-entry-layout .modal{display:flex;flex-direction:column;overflow:hidden;max-height:min(92dvh,940px);width:min(100%,820px)}',
    '.st-entry-layout .modal-head{flex:none;min-width:0;gap:8px}',
    '.st-entry-layout .modal-body{flex:1 1 auto;min-height:0;overflow:auto;overscroll-behavior:contain;padding-bottom:18px}',
    '.st-entry-layout .section-head-v7{margin:20px 0 9px}.st-entry-layout .section-head-v7 p{font-size:11px;line-height:1.5;margin:4px 0 0}',
    '.st-entry-layout #examSubjectsV16{display:grid!important;grid-template-columns:minmax(0,1fr);gap:0!important;border:1px solid var(--line);border-radius:16px;overflow:hidden;background:var(--panel-solid,var(--card,#fff))}',
    '.st-entry-layout #examSubjectsV16:empty{display:none!important}',
    '.st-entry-layout .exam-subject-card-v10{box-sizing:border-box;min-width:0;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;margin:0!important;padding:12px!important;display:flex;flex-direction:column;gap:7px}',
    '.st-entry-layout .exam-subject-card-v10 + .exam-subject-card-v10{border-top:1px solid var(--line)!important}',
    '.st-entry-layout .exam-subject-head-v10{margin:0!important;min-height:32px;gap:6px;align-items:center}',
    '.st-entry-layout .remove-exam-subject-v10{width:36px!important;height:36px!important;min-height:36px!important;padding:0!important;border:0!important;background:transparent!important;border-radius:8px!important;flex:none}',
    '.st-entry-layout .score-compact-v14{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px!important;margin:0!important}',
    '.st-entry-layout .exam-subject-card-v10[data-final-only-v62="1"] .score-compact-v14{grid-template-columns:minmax(0,1fr)!important}',
    '.st-entry-layout .score-compact-v14 .target-box-v14:not([hidden]){grid-column:1/-1}',
    '.st-entry-layout .score-compact-v14 .mini-field-v10{min-width:0;padding:0!important;background:transparent!important;border:0!important;border-radius:0!important;margin:0!important}',
    '.st-entry-layout .score-compact-v14 .mini-field-v10 label{white-space:normal;margin:0 0 5px;font-size:11px;line-height:1.4}',
    '.st-entry-layout .score-entry-tip-v16{display:none!important}',
    '.st-entry-layout .score-with-max-v14{grid-template-columns:minmax(0,1fr) auto minmax(42px,.65fr)!important;gap:5px!important}',
    '.st-entry-layout .score-with-max-v14 input{min-width:0!important;width:100%;min-height:38px;padding:7px 6px!important;text-align:center;box-sizing:border-box}',
    '.st-entry-layout .subject-ranks-v16{margin:0!important;gap:6px!important;padding:2px 0 4px}',
    '.st-entry-layout .subject-rank-row-v16{grid-template-columns:36px minmax(0,1fr) minmax(0,1fr)!important;gap:6px!important}',
    '.st-entry-layout .subject-rank-row-v16 input{min-height:38px;padding:7px 8px!important;min-width:0}',
    '.st-entry-layout .st-entry-rank-closed .subject-ranks-v16{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px!important}',
    '.st-entry-layout .st-entry-rank-closed .subject-rank-row-v16{grid-template-columns:36px minmax(0,1fr)!important}',
    '.st-entry-layout .st-entry-rank-closed :is(.year-participants-v16,.class-participants-v16){display:none!important}',
    '.st-entry-layout .st-entry-rank-closed .position-percent-v17{grid-column:2!important}',
    '.st-entry-layout .st-entry-rank-toggle{min-height:28px!important;font-size:11px!important;color:var(--muted)!important}',
    '.st-entry-layout .subject-ranks-v16{border-top:1px solid var(--line);padding-top:9px!important}',
    '.st-entry-layout .subject-ranks-v16 .subject-rank-row-v16>span{color:var(--text);font-weight:600}',
    '@media(max-width:360px){.st-entry-layout .st-entry-rank-closed .subject-rank-row-v16{grid-template-columns:30px minmax(0,1fr)!important;gap:4px!important}}',
    '.st-entry-layout .st-entry-rank-toggle,.st-entry-layout .st-entry-manual-toggle{display:flex;align-items:center;justify-content:space-between;gap:7px;width:100%;min-height:34px;padding:5px 0;color:var(--text);border:0;background:transparent;font:inherit;font-size:12px;text-align:left;cursor:pointer}',
    '.st-entry-layout.rank-entry-percent-v17 .st-entry-rank-toggle,.st-entry-layout .st-entry-rank-toggle[hidden]{display:none!important}',
    '.st-entry-layout .st-entry-rank-toggle span,.st-entry-layout .st-entry-manual-toggle span{min-width:0;overflow-wrap:anywhere}',
    '.st-entry-layout .st-entry-summary{font-size:11px;color:var(--muted);margin-left:auto;text-align:right}',
    '.st-entry-layout .st-entry-arrow{width:7px;height:7px;border:solid currentColor;border-width:0 1.5px 1.5px 0;transform:rotate(45deg);margin:0 3px 4px 3px;flex:none;color:var(--muted)}',
    '.st-entry-layout [aria-expanded="true"] .st-entry-arrow,.st-entry-layout details[open]>summary::after{transform:rotate(225deg);margin-top:6px}',
    '.st-entry-layout .exam-averages,.st-entry-layout .eg-editor{margin:0!important;padding:0!important;border:0!important;min-width:0}',
    '.st-entry-layout .exam-averages>summary,.st-entry-layout .eg-editor>summary{list-style:none;display:flex;align-items:center;gap:6px;min-height:30px;cursor:pointer;line-height:1.4;font-size:12px;flex-wrap:wrap}',
    '.st-entry-layout .exam-averages>summary::-webkit-details-marker,.st-entry-layout .eg-editor>summary::-webkit-details-marker{display:none}',
    '.st-entry-layout .exam-averages>summary::after,.st-entry-layout .eg-editor>summary::after{content:"";width:7px;height:7px;flex:none;border:solid currentColor;border-width:0 1.5px 1.5px 0;transform:rotate(45deg);margin-left:auto;margin-right:3px;color:var(--muted)}',
    '.st-entry-layout .exam-averages>summary small,.st-entry-layout .eg-editor>summary .eg-muted{font-size:11px;min-width:0;overflow-wrap:anywhere;color:var(--muted);margin:0}',
    '.st-entry-layout .st-entry-modebar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:5px 0 10px}',
    '.st-entry-layout .st-entry-modebar .st-entry-modes{display:flex;gap:2px;background:var(--cell,var(--input-bg,transparent));border:1px solid var(--line);padding:2px;border-radius:10px}',
    '.st-entry-layout .st-entry-modes button{min-height:32px;padding:4px 10px;border:0;background:transparent;border-radius:7px;font:inherit;font-size:12px;color:var(--muted);cursor:pointer}',
    '.st-entry-layout .st-entry-modes button[aria-pressed="true"]{background:var(--panel-solid,var(--input-bg,#fff));color:var(--text);font-weight:650;box-shadow:0 1px 3px #00000012}',
    '.st-entry-layout .st-entry-count{font-size:11px;color:var(--muted);margin-left:auto;white-space:nowrap}',
    '.st-entry-layout .combo-total-v21,.st-entry-layout .combo-card-v21{padding:12px!important;border-radius:14px!important;background:var(--panel-solid,var(--card,transparent))!important;box-shadow:none!important;min-width:0}',
    '.st-entry-layout .combo-head-v21{margin:0 0 7px!important}.st-entry-layout .combo-head-v21 span{font-size:11px}',
    '.st-entry-layout .score-total-preview-v13{display:grid;gap:8px!important;margin:4px 0 8px!important;grid-template-columns:repeat(2,minmax(0,1fr))}',
    '.st-entry-layout .score-total-box-v13{border:0!important;background:transparent!important;padding:5px 0!important;min-width:0;border-radius:0!important;box-shadow:none!important}',
    '.st-entry-layout .score-total-box-v13 b{font-size:24px!important;font-variant-numeric:tabular-nums;line-height:1.2;overflow-wrap:anywhere}',
    '.st-entry-layout .score-total-box-v13:has(#finalTotalV16){order:-1}',
    '.st-entry-layout .manual-total-v24{padding:0!important;margin:0 0 5px!important;border:0!important}',
    '.st-entry-layout .manual-total-title-v24{display:none!important}',
    '.st-entry-layout .manual-total-grid-v24{grid-template-columns:repeat(2,minmax(0,1fr))}',
    '.st-entry-layout .manual-total-note-v24{margin:5px 0 9px!important}',
    '.st-entry-layout .st-entry-manual-closed :is(.manual-total-grid-v24,.manual-total-note-v24){display:none!important}',
    '.st-entry-layout .total-ranks-v16{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:9px!important;margin:5px 0}',
    '.st-entry-layout .rank-scope-card-v16{padding:0!important;background:transparent!important;border:0!important;box-shadow:none!important;border-radius:0!important;min-width:0}',
    '.st-entry-layout .rank-scope-card-v16 b{margin-bottom:5px!important}',
    '.st-entry-layout .rank-pair-v16{gap:5px!important;grid-template-columns:repeat(2,minmax(0,1fr))}',
    '.st-entry-layout .rank-pair-v16>div{min-width:0}.st-entry-layout .rank-pair-v16 label{font-size:10px;white-space:normal;line-height:1.25}',
    '.st-entry-layout .rank-pair-v16 input{width:100%;min-width:0;min-height:38px;padding:7px 5px!important;box-sizing:border-box}',
    '.st-entry-layout .rank-compat-v16,.st-entry-layout .position-note-v17{font-size:10px;line-height:1.5;margin:4px 0}',
    '.st-entry-layout .visibility-box-v10{margin:12px 0!important;padding:10px 0!important;background:transparent!important;border:0!important;border-top:1px solid var(--line)!important;border-radius:0!important;box-shadow:none!important}',
    '.st-entry-layout .ed-entry-reflection{margin:14px 0 0!important;padding:12px 0 0!important}',
    '.st-entry-layout .ed-entry-reflection textarea{min-height:76px!important}',
    '.st-entry-layout .st-entry-footer{flex:none;display:flex;align-items:center;justify-content:flex-end;gap:10px;flex-wrap:wrap;border-top:1px solid var(--line);background:var(--panel-solid,var(--input-bg,#fff));padding:10px 16px max(10px,env(safe-area-inset-bottom));min-width:0}',
    '.st-entry-layout .st-entry-footer .modal-actions{flex:1;display:flex!important;align-items:center;justify-content:flex-end;gap:8px!important;margin:0!important;padding:0!important;min-width:0}',
    '.st-entry-layout .st-entry-footer .modal-actions button{min-height:42px;white-space:nowrap;margin:0!important}',
    '.st-entry-layout .st-entry-footer .draft-clear-v61{margin-right:auto!important;font-size:12px;background:transparent!important;border:0!important;padding:7px 5px!important}',
    '.st-entry-layout .st-entry-footer .st-entry-count{margin:0;font-size:11px}',
    '@media(max-width:620px){.st-entry-layout .modal{max-height:min(94dvh,940px)}.st-entry-layout .modal-body{padding-left:12px!important;padding-right:12px!important}.st-entry-layout .total-ranks-v16{grid-template-columns:minmax(0,1fr)!important}.st-entry-layout .rank-scope-card-v16{display:grid;grid-template-columns:52px minmax(0,1fr);align-items:end;gap:6px}.st-entry-layout .rank-scope-card-v16 b{margin:0 0 10px!important;line-height:1.3}.st-entry-layout.rank-entry-percent-v17 .rank-scope-card-v16 .position-total-v17{grid-column:2}.st-entry-layout .st-entry-footer{padding:8px 12px max(8px,env(safe-area-inset-bottom));gap:5px}.st-entry-layout .st-entry-footer>.st-entry-count{width:100%;text-align:right}.st-entry-layout .st-entry-footer .modal-actions button{padding:8px 12px!important}.st-entry-layout .st-entry-footer .draft-clear-v61{padding:6px 0!important}.st-entry-layout .score-with-max-v14 input,.st-entry-layout .subject-rank-row-v16 input,.st-entry-layout .rank-pair-v16 input{font-size:16px!important}}',
    '@media(min-width:720px){.st-entry-layout #examSubjectsV16{grid-template-columns:repeat(2,minmax(0,1fr));gap:0!important}.st-entry-layout .exam-subject-card-v10{border-top:1px solid var(--line)!important}.st-entry-layout .exam-subject-card-v10:nth-child(-n+2){border-top:0!important}.st-entry-layout .exam-subject-card-v10:nth-child(even){border-left:1px solid var(--line)!important}}',
    '@media(max-width:360px){.st-entry-layout .score-compact-v14{grid-template-columns:minmax(0,1fr)!important}.st-entry-layout .st-entry-footer .modal-actions button{padding:7px 9px!important}}'
  ].join('\n');
  document.head.appendChild(css);
  var modeKey = 'st_exam_entry_layout_v1';
  function text(el, value) { if (el && el.textContent !== value) el.textContent = value; }
  function value(root, selector) { var el = root.querySelector(selector); return el ? String(el.value || '').trim() : ''; }
  function button(label, cls) {
    var b=document.createElement('button');b.type='button';b.className=cls;
    var title=document.createElement('span');title.textContent=label;b.appendChild(title);
    var summary=document.createElement('span');summary.className='st-entry-summary';b.appendChild(summary);
    var arrow=document.createElement('i');arrow.className='st-entry-arrow';arrow.setAttribute('aria-hidden','true');b.appendChild(arrow);return b;
  }
  function decorate(modal) {
    var list=modal && modal.querySelector('#examSubjectsV16');
    if (!list || modal.classList.contains('st-entry-layout')) return;
    modal.classList.add('st-entry-layout');
    var mode='compact', overrides=new Map(), scheduled=false;
    try { if(localStorage.getItem(modeKey)==='detail')mode='detail'; } catch (_) {}
    var body=modal.querySelector('.modal-body'), sheet=modal.querySelector('.modal');
    var toolbar=document.createElement('div');toolbar.className='st-entry-modebar';
    toolbar.innerHTML='<div class="st-entry-modes" role="group" aria-label="成绩录入布局"><button type="button" data-st-entry-mode="compact">紧凑</button><button type="button" data-st-entry-mode="detail">详细</button></div><span class="st-entry-count" aria-live="polite"></span>';
    list.before(toolbar);
    var rankMode=modal.querySelector('.rank-entry-mode-v17');
    if(rankMode)toolbar.after(rankMode);
    var count=toolbar.querySelector('.st-entry-count'), footerCount=null;
    var actions=body && body.querySelector(':scope > .modal-actions');
    if(actions && sheet){
      var footer=document.createElement('div');footer.className='st-entry-footer';
      footerCount=document.createElement('span');footerCount.className='st-entry-count';
      footer.append(footerCount,actions);sheet.appendChild(footer);
    }
    var total=modal.querySelector('.combo-total-v21'), manual=total && total.querySelector('.manual-total-v24'), manualButton=null, manualOpen=false;
    if(manual){
      manualButton=button('调整总分','st-entry-manual-toggle');
      manualOpen=!!(value(manual,'.total-actual-override-v24')||value(manual,'.total-raw-override-v24'));
      manual.prepend(manualButton);
      var preview=total.querySelector('.score-total-preview-v13');
      if(preview)preview.after(manual);
      manualButton.addEventListener('click',function(){manualOpen=!manualOpen;refresh();});
    }
    function cardName(card){return value(card,'.exam-subject-name-v10');}
    function rankSummary(card){
      var yp=value(card,'.year-participants-v16'),cp=value(card,'.class-participants-v16'),parts=[];
      if(yp)parts.push('年级 '+yp);
      if(cp)parts.push('班级 '+cp);
      return parts.join(' · ') || '沿用总分人数';
    }
    function refresh(){
      if(!modal.isConnected)return;
      var cards=Array.from(list.querySelectorAll('.exam-subject-card-v10')), entered=0;
      toolbar.querySelectorAll('[data-st-entry-mode]').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.stEntryMode===mode));});
      cards.forEach(function(card){
        var name=cardName(card),ranks=card.querySelector('.subject-ranks-v16'), toggle=card.querySelector(':scope > .st-entry-rank-toggle');
        if(value(card,'.actual-v16')||value(card,'.raw-v16'))entered++;
        if(!ranks)return;
        if(!toggle){
          // Scores and ranks are primary inputs; only the reference population folds.
          var scores=card.querySelector('.score-compact-v14');
          if(scores && scores.parentElement===card && scores.nextElementSibling!==ranks)scores.after(ranks);
          toggle=button('参考人数','st-entry-rank-toggle');ranks.after(toggle);
          toggle.addEventListener('click',function(){var key=cardName(card);overrides.set(key,card.classList.contains('st-entry-rank-closed'));refresh();});
        }
        var opened=overrides.has(name)?overrides.get(name):mode==='detail';
        var percent=modal.dataset.rankEntryModeV17==='percent';
        if(percent)opened=false;
        toggle.hidden=percent;
        card.classList.toggle('st-entry-rank-closed',!opened);toggle.setAttribute('aria-expanded',String(opened));
        text(toggle.querySelector('.st-entry-summary'),rankSummary(card));
        var averages=card.querySelector('.exam-averages>summary>span');
        if(averages && averages.textContent==='参考分数（选填：平均分，最高分）')text(averages,'参考分数 · 平均分 / 最高分');
      });
      var status='已录入 '+entered+'/'+cards.length+' 科';text(count,status);text(footerCount,status);
      if(manualButton){
        var final=value(manual,'.total-actual-override-v24'),raw=value(manual,'.total-raw-override-v24'),s=[];
        if(final)s.push('最终 '+final);
        if(raw)s.push('原始 '+raw);
        manual.classList.toggle('st-entry-manual-closed',!manualOpen);
        manualButton.setAttribute('aria-expanded',String(manualOpen));text(manualButton.querySelector('.st-entry-summary'),s.length?'手动 · '+s.join(' / '):'自动计算');
      }
    }
    function queue(){if(scheduled)return;scheduled=true;requestAnimationFrame(function(){scheduled=false;refresh();});}
    toolbar.addEventListener('click',function(e){
      var b=e.target.closest('[data-st-entry-mode]');if(!b)return;
      mode=b.dataset.stEntryMode;overrides.clear();
      try{localStorage.setItem(modeKey,mode);}catch(_){}
      refresh();
    });
    modal.addEventListener('input',queue);modal.addEventListener('change',queue);modal.addEventListener('click',queue);
    var observer=new MutationObserver(queue);observer.observe(list,{childList:true});
    var detach=new MutationObserver(function(){if(!modal.isConnected){observer.disconnect();detach.disconnect();}});
    if(modal.parentNode)detach.observe(modal.parentNode,{childList:true});
    refresh();
  }
  var previous=openExam;
  openExam=function(){var result=previous.apply(this,arguments);decorate(typeof state!=='undefined'?state.modal:null);return result;};
})();
