/* Shared announcement and release-note presentation. Plain Markdown is the canonical stored format. */
(function(root){
  'use strict';
  var groups=[['feature','新增功能','新增'],['improve','优化改进','优化'],['fix','问题修复','修复'],['beta','内测功能','内测']];
  var destinations={home:'前往首页',records:'前往考试记录',stats:'前往统计分析',account:'前往账号设置'};
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function clean(v){return String(v==null?'':v).replace(/\r\n?/g,'\n');}
  function group(key){return groups.find(function(g){return g[0]===key;})||groups[0];}
  function blank(){return {summary:'',date:'',items:[],plan:'',notes:''};}
  function item(){return {type:'feature',title:'',desc:'',featured:false,action:'',image:'',caption:''};}
  function isStructured(v){return /^## 更新摘要(?:\n|$)/.test(clean(v).trimStart());}
  function parse(v){
    v=clean(v);var d=blank();if(!isStructured(v)){d.notes=v;return d;}
    var section='summary',current=null,parts=[],lines=v.trimStart().split('\n').slice(1),datePattern=/^发布日期：(\d{4}-\d{2}-\d{2})$/;
    function flush(){
      var text=parts.join('\n').trim();parts=[];
      if(current){
        var rest=text.split('\n');rest=rest.filter(function(line){
          var a=line.match(/^\[[^\]\n]+\]\(#feature-(home|records|stats|account)\)$/);
          if(a&&!current.action){current.action=a[1];return false;}
          var m=line.match(/^!\[([^\]\n]{1,80})\]\(([^\s)]+)\)$/);
          if(m&&!current.image){current.caption=m[1];current.image=m[2];return false;}
          return true;
        });current.desc=rest.join('\n').trim();
        d.items.push(current);current=null;
      }else if(text){if(section==='summary'||section==='plan'||section==='notes')d[section]+=(d[section]?'\n\n':'')+text;else d.notes+=(d.notes?'\n\n':'')+text;}
    }
    lines.forEach(function(line){
      if(section==='notes'){parts.push(line);return;}
      var date=line.match(datePattern);if(section==='summary'&&!current&&date&&!d.date){d.date=date[1];return;}
      var head=line.match(/^## (本次亮点|新增功能|优化改进|问题修复|内测功能|后续计划|补充说明)\s*$/);
      if(head){flush();section=head[1]==='本次亮点'?'featured':head[1]==='后续计划'?'plan':head[1]==='补充说明'?'notes':groups.find(function(g){return g[1]===head[1];})[0];return;}
      var h=line.match(/^### (.+)$/);
      if(h&&(section==='featured'||groups.some(function(g){return g[0]===section;}))){
        flush();current=item();current.featured=section==='featured';current.type=section==='featured'?'feature':section;
        var mark=h[1].match(/^\[(新增|优化|修复|内测)\]\s+(.+)$/);
        if(mark&&current.featured){current.type=groups.find(function(g){return g[2]===mark[1];})[0];current.title=mark[2];}else current.title=h[1];return;
      }
      parts.push(line);
    });flush();return d;
  }
  function encode(d){
    var out=['## 更新摘要'];if(d.date)out.push('发布日期：'+d.date);if(d.summary.trim())out.push(d.summary.trim());
    function block(label,items,featured){
      if(!items.length)return;out.push('## '+label);
      items.forEach(function(x){
        var title=clean(x.title).replace(/\n/g,' ').trim();
        out.push('### '+(featured?'['+group(x.type)[2]+'] ':'')+title);
        if(x.desc.trim())out.push(x.desc.trim());
        if(x.image.trim())out.push('!['+(x.caption.replace(/[\[\]\r\n]/g,'').trim().slice(0,80)||title.slice(0,80).replace(/[\[\]]/g,'')||'功能截图')+']('+x.image.trim()+')');
        if(destinations[x.action])out.push('['+destinations[x.action]+'](#feature-'+x.action+')');
      });
    }
    block('本次亮点',d.items.filter(function(x){return x.featured;}),true);
    groups.forEach(function(g){block(g[1],d.items.filter(function(x){return !x.featured&&x.type===g[0];}),false);});
    if(d.plan.trim())out.push('## 后续计划',d.plan.trim());if(d.notes.trim())out.push('## 补充说明',d.notes.trim());
    return out.join('\n\n');
  }
  function safeImage(path){return !!(root.__scoreTrackerNoticeMedia&&root.__scoreTrackerNoticeMedia.imagePath(path));}
  function validate(d){
    if(d.items.length>40)return '最多添加 40 个更新项目';
    if(d.items.some(function(x){return !x.title.trim();}))return '请填写每个更新项目的名称';
    if(d.items.some(function(x){return x.image.trim()&&!safeImage(x.image.trim());}))return '截图仅支持已上传的公告图片或站内公告素材';
    if(encode(d).length>6000)return '更新公告内容最多 6000 字，请精简后再保存';
    if(!d.summary.trim()&&!d.items.length&&!d.plan.trim()&&!d.notes.trim())return '请填写更新内容';
    return '';
  }
  function inline(v,base){
    return base(v).replace(/\[([^\]\n]{1,80})\]\(#feature-(home|records|stats|account)\)/g,function(_,label,key){return '<button type="button" class="nl-feature-link" data-notice-feature="'+key+'">'+label+' <span aria-hidden="true">↗</span></button>';});
  }
  // The existing escaped inline renderer and media whitelist remain authoritative.
  function prose(v,base){
    var text=clean(v);
    function blocks(chunk){
      var out=[],lines=chunk.split('\n'),para=[],list=[];
      function flush(){if(para.length){out.push('<p>'+inline(para.join('\n'),base).replace(/\n/g,'<br>')+'</p>');para=[];}if(list.length){out.push('<ul>'+list.map(function(x){return '<li>'+inline(x,base)+'</li>';}).join('')+'</ul>');list=[];}}
      lines.forEach(function(line){
        var trim=line.trim();if(!trim){flush();return;}
        var h=trim.match(/^#{1,4}\s+(.+)$/);
        var strong=trim.match(/^\*\*([^*]+)\*\*$/);
        if(h||strong){flush();out.push('<h3>'+inline((h||strong)[1],base)+'</h3>');return;}
        var bullet=trim.match(/^(?:[-*•]|\d+[.)、])\s+(.+)$/);
        if(bullet){if(para.length)flush();list.push(bullet[1]);return;}
        if(list.length)flush();para.push(line);
      });flush();return out.join('');
    }
    return root.__scoreTrackerNoticeMedia?root.__scoreTrackerNoticeMedia.markup(text,blocks):blocks(text);
  }
  function itemHtml(x,base){
    var media=x.image?'!['+(x.caption||x.title||'功能截图')+']('+x.image+')':'';
    return '<article class="nl-item'+(x.featured?' nl-featured':'')+'"><div class="nl-item-copy">'+(x.featured?'<span class="nl-item-kind">'+esc(group(x.type)[1])+'</span>':'')+'<h4>'+esc(x.title)+'</h4>'+(x.desc?prose(x.desc,base):'')+'</div>'+(media?prose(media,base):'')+(destinations[x.action]?'<button type="button" class="nl-feature-link" data-notice-feature="'+x.action+'">'+esc(destinations[x.action])+' <span aria-hidden="true">↗</span></button>':'')+'</article>';
  }
  function render(v,kind,base){
    if(kind!=='release'||!isStructured(v))return '<div class="nl-prose">'+prose(v,base)+'</div>';
    var d=parse(v),out='';
    if(d.summary)out+='<div class="nl-summary">'+prose(d.summary,base)+'</div>';
    var hi=d.items.filter(function(x){return x.featured;});
    if(hi.length)out+='<section class="nl-group"><h3>本次亮点</h3><div class="nl-feature-grid">'+hi.map(function(x){return itemHtml(x,base);}).join('')+'</div></section>';
    groups.forEach(function(g){var rows=d.items.filter(function(x){return !x.featured&&x.type===g[0];});if(rows.length)out+='<section class="nl-group"><h3>'+g[1]+'</h3><div class="nl-rows">'+rows.map(function(x){return itemHtml(x,base);}).join('')+'</div></section>';});
    if(d.plan)out+='<section class="nl-group nl-plan"><h3>后续计划</h3>'+prose(d.plan,base)+'</section>';
    if(d.notes)out+='<section class="nl-group nl-prose"><h3>补充说明</h3>'+prose(d.notes,base)+'</section>';
    return out||'<div class="nl-prose">'+prose(v,base)+'</div>';
  }
  function dateText(value){if(!value)return '';var m=String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);return m?m[1]+'年'+Number(m[2])+'月'+Number(m[3])+'日':'';}
  function meta(kind,version,content,updated){
    var date=kind==='release'&&isStructured(content)?dateText(parse(content).date):'';
    var fallback=dateText(updated);
    return '<div class="nl-meta">'+(kind==='release'?'<span class="nl-version">'+esc(version||'版本更新')+'</span>':'<span>开发者公告</span>')+(date?'<time>'+esc(date)+'发布</time>':fallback?'<time>'+esc(fallback)+'更新</time>':'')+'</div>';
  }
  function editor(form){
    var field=form.querySelector('#notice_content');if(!field||field.__nlEditor)return;
    var wrap=field.closest('.field'),host=document.createElement('div');host.className='nl-editor';wrap.before(host);field.__nlEditor=true;
    var structured=isStructured(field.value),d=parse(field.value),syncing=false;
    function mode(on){structured=on;wrap.hidden=on;host.querySelector('[data-nl-mode="structured"]').setAttribute('aria-pressed',String(on));host.querySelector('[data-nl-mode="free"]').setAttribute('aria-pressed',String(!on));host.querySelector('.nl-editor-body').hidden=!on;}
    function sync(){
      if(!structured)return;
      var error=validate(d),status=host.querySelector('[data-nl-status]');status.textContent=error||encode(d).length+' / 6000 字';status.classList.toggle('nl-error',!!error);
      field.value=encode(d);syncing=true;field.dispatchEvent(new Event('input',{bubbles:true}));syncing=false;
    }
    function fieldHtml(label,key,value,area){return '<label class="nl-edit-field"><span>'+label+'</span>'+(area?'<textarea class="textarea" rows="3" data-nl-key="'+key+'">'+esc(value)+'</textarea>':'<input class="input" data-nl-key="'+key+'" value="'+esc(value)+'"'+(key==='date'?' type="date"':'')+'>')+'</label>';}
    function draw(){
      var body=host.querySelector('.nl-editor-body');
      body.innerHTML='<div class="nl-editor-meta">'+fieldHtml('更新摘要（选填）','summary',d.summary,true)+fieldHtml('发布日期（选填）','date',d.date,false)+'</div><div class="nl-editor-label"><strong>更新项目</strong><span>'+d.items.length+' 项</span></div><div class="nl-edit-list">'+d.items.map(function(x,i){
        return '<section class="nl-edit-item" data-nl-index="'+i+'"><div class="nl-edit-top"><select class="select" data-nl-key="type" aria-label="更新类型">'+groups.map(function(g){return '<option value="'+g[0]+'"'+(g[0]===x.type?' selected':'')+'>'+g[1]+'</option>';}).join('')+'</select><button class="btn" type="button" data-nl-move="-1" aria-label="上移"'+(i===0?' disabled':'')+'>↑</button><button class="btn" type="button" data-nl-move="1" aria-label="下移"'+(i===d.items.length-1?' disabled':'')+'>↓</button><button class="btn danger" type="button" data-nl-remove>删除</button></div>'+fieldHtml('功能名称','title',x.title,false)+fieldHtml('介绍','desc',x.desc,true)+'<label class="nl-feature-check"><input type="checkbox" data-nl-key="featured"'+(x.featured?' checked':'')+'> 作为本次亮点</label><details'+(x.image||x.action?' open':'')+'><summary>截图与入口（选填）</summary>'+fieldHtml('已上传的公告图片链接','image',x.image,false)+fieldHtml('图片说明','caption',x.caption,false)+'<label class="nl-edit-field"><span>功能入口</span><select class="select" data-nl-key="action"><option value="">无</option>'+Object.keys(destinations).map(function(k){return '<option value="'+k+'"'+(x.action===k?' selected':'')+'>'+destinations[k]+'</option>';}).join('')+'</select></label></details></section>';
      }).join('')+'</div><button type="button" class="btn" data-nl-add>＋ 添加更新项目</button>'+fieldHtml('后续计划（选填）','plan',d.plan,true)+fieldHtml('补充说明 · 支持原有图片和链接','notes',d.notes,true)+'<div class="nl-editor-footer"><span data-nl-status role="status"></span><button type="button" class="btn" data-nl-preview>预览更新</button></div>';
    }
    host.innerHTML='<div class="nl-mode"><button type="button" class="btn" data-nl-mode="structured">结构化编辑</button><button type="button" class="btn" data-nl-mode="free">自由编辑</button></div><div class="nl-editor-body"></div>';
    host.addEventListener('input',function(e){var k=e.target.dataset.nlKey;if(!k)return;var row=e.target.closest('[data-nl-index]'),object=row?d.items[Number(row.dataset.nlIndex)]:d;object[k]=e.target.type==='checkbox'?e.target.checked:e.target.value;sync();});
    host.addEventListener('change',function(e){if(e.target.matches('select,[type=checkbox]')){var k=e.target.dataset.nlKey,row=e.target.closest('[data-nl-index]');if(k&&row){d.items[Number(row.dataset.nlIndex)][k]=e.target.type==='checkbox'?e.target.checked:e.target.value;sync();}}});
    host.addEventListener('click',function(e){
      var b=e.target.closest('button');if(!b)return;
      if(b.dataset.nlMode){var on=b.dataset.nlMode==='structured';if(on===structured)return;if(on){d=parse(field.value);draw();mode(true);sync();}else{mode(false);field.focus();}return;}
      if(b.hasAttribute('data-nl-add')){if(d.items.length>=40)return;d.items.push(item());draw();sync();host.querySelector('.nl-edit-item:last-child [data-nl-key="title"]').focus();}
      else if(b.hasAttribute('data-nl-preview')){var preview=form.querySelector('[data-notice-preview="release"]');if(preview)preview.click();}
      else{var row=b.closest('[data-nl-index]');if(!row)return;var i=Number(row.dataset.nlIndex);if(b.hasAttribute('data-nl-remove'))d.items.splice(i,1);else if(b.dataset.nlMove){var j=i+Number(b.dataset.nlMove);if(j<0||j>=d.items.length)return;var x=d.items[i];d.items[i]=d.items[j];d.items[j]=x;}else return;draw();sync();}
    });
    field.addEventListener('input',function(){if(!syncing&&structured){d=parse(field.value);draw();sync();}});
    form.__nlValidate=function(){return structured?validate(d):field.value.length>6000?'更新公告内容最多 6000 字':'';};
    draw();mode(structured);if(structured)host.querySelector('[data-nl-status]').textContent=validate(d)||field.value.length+' / 6000 字';
  }
  var css='.nl-meta{display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:12px;color:var(--muted,#687386);margin:0 0 12px}.nl-version{font-size:13px;font-weight:750;color:var(--accent,var(--blue,#5d72e8));font-variant-numeric:tabular-nums}.nl-prose,.nl-summary,.nl-group{white-space:normal;overflow-wrap:anywhere;line-height:1.8}.nl-prose p,.nl-group p,.nl-summary p{margin:0 0 12px}.nl-prose p:last-child,.nl-group p:last-child,.nl-summary p:last-child{margin-bottom:0}.nl-prose h3,.nl-group>h3{font-size:15px;margin:20px 0 9px;color:var(--text,#18212f);line-height:1.45}.nl-prose h3:first-child{margin-top:0}.nl-prose ul,.nl-group ul{margin:0 0 12px;padding-left:1.35em}.nl-summary{background:var(--accent-soft,var(--blue2,#eef2ff));border-radius:13px;padding:14px;margin-bottom:18px;color:var(--text)}.nl-group{margin:20px 0 0}.nl-group+.nl-group{border-top:1px solid var(--line,#e7eaf0);padding-top:2px}.nl-feature-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,230px),1fr));gap:10px}.nl-item{min-width:0}.nl-featured{border:1px solid var(--line,#e7eaf0);border-radius:14px;padding:14px;background:var(--panel-solid,var(--panel,#fff))}.nl-item h4{font-size:14px;margin:0 0 4px;line-height:1.5}.nl-featured h4{font-size:17px}.nl-item-kind{font-size:11px;color:var(--accent,var(--blue,#5d72e8));display:block;margin-bottom:6px}.nl-item-copy{min-width:0}.nl-item-copy p{font-size:13px;color:var(--muted,#687386)}.nl-rows{display:grid;gap:0}.nl-rows .nl-item{position:relative;padding:11px 0 11px 17px;border-bottom:1px solid var(--line,#e7eaf0)}.nl-rows .nl-item:last-child{border-bottom:0}.nl-rows .nl-item:before{content:"";position:absolute;left:1px;top:18px;width:6px;height:6px;border-radius:50%;background:var(--accent,var(--blue,#5d72e8))}.nl-feature-link{display:inline-flex;align-items:center;gap:6px;padding:6px 0;border:0;background:transparent;color:var(--accent,var(--blue,#5d72e8));font:inherit;font-size:12px;font-weight:650;cursor:pointer}.nl-featured .notice-gallery{grid-template-columns:minmax(0,1fr);margin:12px 0 0}.nl-plan{color:var(--muted,#687386)}.nl-editor{display:grid;gap:12px}.nl-editor-body{display:grid;gap:12px}.nl-editor-body[hidden],#noticeForm .field[hidden]{display:none!important}.nl-mode,.nl-edit-top,.nl-editor-footer,.nl-editor-label{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.nl-mode button[aria-pressed=true]{border-color:var(--blue);background:var(--blue2);color:var(--blue)}.nl-editor-meta,.nl-edit-list{display:grid;gap:10px}.nl-edit-item{display:grid;gap:9px;padding:13px;border-radius:12px;border:1px solid var(--line);background:var(--soft,#f8fafc)}.nl-edit-top select{flex:1;min-width:100px}.nl-edit-field{display:grid;gap:5px;min-width:0;font-size:12px}.nl-edit-field input,.nl-edit-field textarea{min-width:0;max-width:100%}.nl-edit-item details{display:grid;gap:8px}.nl-edit-item details>label{margin-top:8px}.nl-edit-item summary,.nl-feature-check{font-size:12px;cursor:pointer}.nl-editor-footer{justify-content:space-between;font-size:12px;color:var(--muted)}.nl-editor-label{justify-content:space-between;font-size:12px}.nl-error{color:var(--red,#b33)}';
  if(typeof document!=='undefined'&&document.head){var s=document.createElement('style');s.id='notice-layout-style';s.textContent=css;document.head.appendChild(s);}
  root.ScoreNoticeLayout={parse:parse,encode:encode,blank:blank,item:item,isStructured:isStructured,validate:validate,render:render,meta:meta,mountEditor:editor};
})(typeof window!=='undefined'?window:globalThis);
