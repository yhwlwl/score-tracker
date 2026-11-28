/* Preserve the original colored cards and all input nodes; collapse only secondary inputs. */
(function(){
  'use strict';
  if(typeof openExam!=='function')return;
  var style=document.createElement('style');
  style.textContent=[
    '.exam-entry-compact .subject-ranks-v16{margin-top:10px}',
    '.exam-entry-compact:not(.rank-entry-percent-v17) .subject-ranks-v16:not(.entry-people-open){grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}',
    '.exam-entry-compact:not(.rank-entry-percent-v17) .subject-ranks-v16:not(.entry-people-open) .subject-rank-row-v16{grid-template-columns:auto minmax(0,1fr);gap:6px}',
    '.exam-entry-compact .subject-ranks-v16:not(.entry-people-open) :is(.year-participants-v16,.class-participants-v16){display:none!important}',
    '.exam-entry-compact.rank-entry-percent-v17 .entry-people-toggle{display:none!important}',
    '.exam-entry-compact .entry-people-toggle{display:flex;justify-content:space-between;align-items:center;gap:8px;width:100%;grid-column:1/-1;min-height:32px;padding:4px 0;border:0;background:transparent;color:var(--text);font:inherit;font-size:12px;text-align:left;cursor:pointer}',
    '.exam-entry-compact .entry-people-toggle small{color:var(--muted);font-size:11px;overflow-wrap:anywhere;text-align:right}',
    '.exam-entry-compact .score-total-preview-v13{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px!important;margin-top:8px}',
    '.exam-entry-compact .score-total-box-v13{min-width:0;padding:10px!important;overflow-wrap:anywhere}',
    '.exam-entry-compact .score-total-box-v13:has(#finalTotalV16){order:-1}',
    '.exam-entry-compact .entry-manual-toggle{width:100%;display:flex;justify-content:space-between;align-items:center;border:0;background:none;color:var(--text);padding:3px 0;min-height:32px;text-align:left;font:inherit;font-size:12px;cursor:pointer}',
    '.exam-entry-compact .entry-manual-toggle small{color:var(--muted);font-size:11px;text-align:right}',
    '.exam-entry-compact .manual-total-v24:not(.entry-manual-open) :is(.manual-total-grid-v24,.manual-total-note-v24){display:none!important}',
    '.exam-entry-compact .manual-total-title-v24{display:none!important}',
    '.exam-entry-compact .manual-total-grid-v24{grid-template-columns:repeat(2,minmax(0,1fr))!important}'
  ].join('\n');
  document.head.appendChild(style);
  function val(root,sel){var x=root.querySelector(sel);return x?x.value.trim():'';}
  function toggle(root,cls,label,openClass,summary){
    var b=document.createElement('button');b.type='button';b.className=cls;
    var title=document.createElement('span'),hint=document.createElement('small');b.append(title,hint);
    function update(){var open=root.classList.contains(openClass);b.setAttribute('aria-expanded',String(open));title.textContent=(open?'▾ ':'▸ ')+label;hint.textContent=summary();}
    b.addEventListener('click',function(){root.classList.toggle(openClass);update();});
    root.addEventListener('input',update);update();return b;
  }
  function decorate(modal){
    var list=modal&&modal.querySelector('#examSubjectsV16');
    if(!list||modal.classList.contains('exam-entry-compact'))return;
    modal.classList.add('exam-entry-compact');
    function cards(){
      list.querySelectorAll('.exam-subject-card-v10').forEach(function(card){
        var ranks=card.querySelector('.subject-ranks-v16'),score=card.querySelector('.score-compact-v14'),ref=card.querySelector('.exam-averages');
        if(!ranks)return;
        if(score&&score.nextElementSibling!==ranks)score.after(ranks);
        if(ref&&ranks.nextElementSibling!==ref)ranks.after(ref);
        if(!ranks.querySelector('.entry-people-toggle')){
          ranks.append(toggle(ranks,'entry-people-toggle','参考人数','entry-people-open',function(){
            var y=val(ranks,'.year-participants-v16'),c=val(ranks,'.class-participants-v16'),parts=[];
            if(y)parts.push('年 '+y);if(c)parts.push('班 '+c);return parts.join(' · ')||'沿用总分人数';
          }));
        }
      });
    }
    var total=modal.querySelector('.combo-total-v21'),manual=total&&total.querySelector('.manual-total-v24'),preview=total&&total.querySelector('.score-total-preview-v13'),ranks=total&&total.querySelector('.total-ranks-v16'),ref=total&&total.querySelector('.exam-averages');
    if(manual&&preview){
      preview.after(manual);
      var updateTotals=function(){
        [['#finalTotalV16','.total-actual-override-v24'],['#rawTotalV16','.total-raw-override-v24']].forEach(function(pair){
          var node=preview.querySelector(pair[0]),input=manual.querySelector(pair[1]);
          if(!node||!input)return;
          var override=input.value.trim();
          if(override&&Number.isFinite(Number(override)))node.textContent=typeof formatScore==='function'?formatScore(Number(override)):override;
        });
      };
      modal.addEventListener('input',function(e){
        if(e.target.matches('.total-actual-override-v24,.total-raw-override-v24')&&!e.target.value.trim()){
          var node=preview.querySelector(e.target.matches('.total-actual-override-v24')?'#finalTotalV16':'#rawTotalV16');
          if(node)node.textContent=e.target.placeholder.replace(/^自动(?:计算|\s*)/,'')||'—';
        }
        updateTotals();
      });
      updateTotals();
      manual.prepend(toggle(manual,'entry-manual-toggle','调整总分','entry-manual-open',function(){
        var f=val(manual,'.total-actual-override-v24'),r=val(manual,'.total-raw-override-v24');
        return (f||r)?[f?'最终 '+f:'',r?'原始 '+r:''].filter(Boolean).join(' · '):'自动计算';
      }));
    }
    if(ref&&ranks)ranks.after(ref);
    cards();
    var observer=new MutationObserver(function(){cards();if(manual&&preview)updateTotals();});observer.observe(list,{childList:true,subtree:true});
    var detach=new MutationObserver(function(){if(!modal.isConnected){observer.disconnect();detach.disconnect();}});
    if(modal.parentNode)detach.observe(modal.parentNode,{childList:true});
  }
  var previous=openExam;openExam=function(){var result=previous.apply(this,arguments);decorate(typeof state==='undefined'?null:state.modal);return result;};
})();
