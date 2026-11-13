(function () {
  'use strict';
  var active=null,esc=function(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});};
  function owner(){return String(state.user&&state.user.id||'');}
  function track(name,meta){try{if(window.__stTrack)window.__stTrack(name,meta||{});}catch(e){}}
  function open(){
    if(active||!state.token||!owner())return;
    var origin=document.activeElement,box=document.createElement('div'),a={box:box,owner:owner(),token:state.token,version:0,busy:false,raw:null,preview:null};active=a;
    box.className='export-overlay-v30 backup-overlay';box.id='backupImportOverlay';
    box.innerHTML='<section class="export-sheet-v30 backup-sheet" role="dialog" aria-modal="true" aria-labelledby="backupTitle" tabindex="-1">'
      +'<div class="export-head-v30"><b id="backupTitle">导入恢复</b><button type="button" class="close-btn" data-backup-close aria-label="关闭">×</button></div>'
      +'<p class="card-sub">选择成绩轨迹导出的「完整备份」JSON 文件，先核对，再导入当前账号。</p>'
      +'<label class="backup-file-label">备份文件<input id="backupFile" type="file" accept=".json,application/json"></label>'
      +'<div id="backupStatus" role="status" aria-live="polite">支持旧版备份，文件不超过 8 MB。</div>'
      +'<div id="backupPreview"></div>'
      +'<label class="backup-settings" hidden><input type="checkbox" id="backupSettings">同时恢复科目满分、分类、长期目标和默认参考人数，替换当前对应设置</label>'
      +'<p class="backup-rule">已有考试会保留。同一考试编号，或同名、同日期、同分类且科目相同的考试会跳过，不覆盖已有成绩。不同选科的同名组合会分别保留。</p>'
      +'<button type="button" class="primary export-go-v30" id="backupCommit" disabled>选择备份后预览</button></section>';
    document.body.appendChild(box);
    var status=box.querySelector('#backupStatus'),go=box.querySelector('#backupCommit'),file=box.querySelector('#backupFile'),preview=box.querySelector('#backupPreview'),settings=box.querySelector('#backupSettings');
    function valid(){return active===a&&box.isConnected&&a.owner===owner()&&a.token===state.token;}
    function statusText(text,error){status.textContent=text;status.classList.toggle('backup-error',!!error);}
    function close(){if(a.busy)return;cleanup();if(origin&&origin.isConnected)origin.focus();}
    function cleanup(){if(a.controller)a.controller.abort();clearInterval(a.watch);document.removeEventListener('keydown',keys);box.remove();if(active===a)active=null;}
    function keys(e){if(!valid())return;if(e.key==='Escape'){e.preventDefault();close();}if(e.key==='Tab'){var nodes=Array.from(box.querySelectorAll('button:not(:disabled),input:not(:disabled),[tabindex="0"]')).filter(function(n){return !n.closest('[hidden]');});var first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}}
    document.addEventListener('keydown',keys);box.querySelector('[data-backup-close]').onclick=close;
    a.watch=setInterval(function(){if(!valid())cleanup();},250);
    async function request(action){
      if(!valid())throw new Error('账号已切换，请重新选择备份');
      var controller=new AbortController();a.controller=controller;var timeout=setTimeout(function(){controller.abort();},60000);
      try{
        var response=await fetch('/api/score-tracker-import',{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({action:action,token:a.token,backup:a.raw,digest:a.preview&&a.preview.digest,confirmed:action==='import',restoreSettings:settings.checked})});
        var result=await response.json().catch(function(){return {error:'服务响应异常，请重试'};});
        if(!response.ok)throw new Error(result.error||'导入请求失败');return result;
      }finally{clearTimeout(timeout);}
    }
    file.onchange=async function(){
      var version=++a.version,f=file.files&&file.files[0];a.raw=null;a.preview=null;preview.textContent='';settings.checked=false;box.querySelector('.backup-settings').hidden=true;go.disabled=true;
      if(!f)return statusText('请选择完整备份 JSON 文件。');
      if(f.size>ScoreBackup.maxBytes)return statusText('文件超过 8 MB，请按分类分别导出后导入。',true);
      go.textContent='正在核对…';statusText('正在读取并核对备份，不会修改成绩。');
      try{
        var content=await f.text();if(!valid()||version!==a.version)return;
        var raw;try{raw=JSON.parse(content.replace(/^\uFEFF/,''));}catch(e){throw new Error('文件不是有效的 JSON，请选择「完整备份」，CSV 或 TXT 不能用于恢复。');}
        var normalized=ScoreBackup.normalize(raw);a.raw=raw;
        var result=await request('preview');if(!valid()||version!==a.version)return;a.preview=result;
        var dates=normalized.exams.map(function(e){return e.exam_date;}).sort();
        preview.innerHTML='<div class="backup-summary"><div><strong>'+result.added+'</strong><span>将新增考试</span></div><div><strong>'+result.skipped+'</strong><span>重复将跳过</span></div><div><strong>'+result.scores+'</strong><span>将新增成绩</span></div></div>'
          +'<p class="backup-meta">备份账号：'+esc(raw.account||raw.originalUsername||'未记录')+'<br>导入账号：'+esc(state.user.username||'当前账号')+(dates.length?'<br>考试日期：'+esc(dates[0])+' ～ '+esc(dates[dates.length-1]):'')+'</p>'
          +'<details><summary>查看备份考试（前 20 场）</summary><ul>'+normalized.exams.slice(0,20).map(function(e){return '<li>'+esc(e.exam_date)+' · '+esc(e.name)+' · '+Object.keys(e.scores).length+' 科'+(e.is_hidden?' · 已隐藏':'')+'</li>';}).join('')+'</ul></details>'
          +(result.skipped?'<details><summary>查看重复考试（最多 10 场）</summary><ul>'+(result.duplicates||[]).map(function(e){return '<li>'+esc(e.date)+' · '+esc(e.name)+'</li>';}).join('')+'</ul></details>':'');
        box.querySelector('.backup-settings').hidden=!(raw.goal||raw.category||raw.participantDefaults);
        statusText('预览完成。确认后将写入当前账号；原有成绩保留。');go.textContent='确认导入';go.disabled=false;
        track('backup_import_preview',{exams:normalized.exams.length,added:result.added,skipped:result.skipped});
      }catch(e){if(!valid()||version!==a.version)return;a.raw=null;a.preview=null;statusText(e.name==='AbortError'?'核对超时，请重新选择文件。':e.message,true);go.textContent='请重新选择备份';}
    };
    go.onclick=async function(){
      if(a.done){close();return;}
      if(a.busy||!a.preview||!valid())return;
      a.busy=true;go.disabled=true;file.disabled=true;settings.disabled=true;box.querySelector('[data-backup-close]').disabled=true;go.textContent='正在导入…';statusText('正在保存，请稍候。');
      try{
        var result=await request('import');if(!valid())return;a.done=true;
        track('backup_import_done',{added:result.added,skipped:result.skipped,scores:result.scores,settings:result.settingsRestored});
        statusText('导入完成：新增 '+result.added+' 场考试、'+result.scores+' 条成绩，跳过 '+result.skipped+' 场重复考试。');go.textContent='完成';
        try{await loadExams();if(valid())render();}catch(e){if(valid())statusText('数据已导入成功，但列表刷新失败。关闭后刷新页面即可查看，请勿重复修改文件。');}
      }catch(e){if(valid()){statusText((e.name==='AbortError'?'连接超时，导入可能已提交。':e.message)+' 可直接重试，重复考试会自动跳过。',true);go.textContent='重试导入';track('backup_import_failed',{});}}
      finally{a.busy=false;if(valid()){go.disabled=false;box.querySelector('[data-backup-close]').disabled=false;if(!a.done){file.disabled=false;settings.disabled=false;}}}
    };
    box.querySelector('.backup-sheet').focus();track('backup_import_open',{});
  }
  document.addEventListener('click',function(e){if(e.target.closest&&e.target.closest('#importDataV30'))open();});
  var style=document.createElement('style');style.textContent='.backup-sheet{box-sizing:border-box;color:var(--text);overflow-wrap:anywhere}.backup-sheet .card-sub{line-height:1.65}.backup-file-label{display:grid;gap:9px;font-size:13px;font-weight:600;margin:20px 0 12px}.backup-file-label input{width:100%;min-width:0;box-sizing:border-box;border:1px dashed var(--line);border-radius:12px;padding:14px 10px;font:inherit;color:var(--text);background:var(--cell,#f6f8fc)}#backupStatus{font-size:12px;line-height:1.65;margin:12px 0;color:var(--muted)}#backupStatus.backup-error{color:var(--danger,#c54b57)}.backup-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:18px 0}.backup-summary>div{background:var(--accent-soft,#f1f3ff);border:1px solid var(--line);border-radius:12px;padding:13px 6px;text-align:center}.backup-summary strong{font-size:26px;display:block;line-height:1.2}.backup-summary span{display:block;font-size:11px;color:var(--muted);margin-top:7px}.backup-meta,.backup-rule,.backup-sheet details{font-size:12px;line-height:1.75;color:var(--muted)}.backup-rule{padding-top:12px;border-top:1px solid var(--line)}.backup-settings{display:flex;align-items:flex-start;gap:8px;font-size:12px;line-height:1.7;margin-top:18px}.backup-settings[hidden]{display:none}.backup-settings input{margin-top:4px;flex-shrink:0}.backup-sheet button:disabled{opacity:.55;cursor:default}.backup-sheet .export-go-v30{min-height:46px}';document.head.appendChild(style);
  window.ScoreBackupImport={open:open};
})();
