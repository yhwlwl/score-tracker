/* Anonymous peer trajectories, on by default with a clear opt-out. Results are never persisted in browser storage. */
(function () {
  'use strict';
  var host, filters, generation = 0, owner = '', enabled = null, defaulted = false, noticeVisible = false, result = null, selected = [], expandedReferences = false, busy = false, message = '', metricChoice = '', matchChoice = 'shape', policyChoice = 'balanced', minChoice = 2, sameCategoryChoice = false, apiVersion = 1, categoryChoice = '__all__', matchedCount = 0, confirmAction = null, exposureSent = false, exposureObserver = null;
  var colors = ['var(--green,#32a77a)','var(--warn,#b97f24)','#b17ac9'], forecast=window.__stTrajectoryForecast, forecastChoice=forecast.settings();
  function esc(v) { return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function identity() { return typeof state!=='undefined' && state.user && state.token ? state.user.id+'|'+state.token : ''; }
  function track(event,meta) { try { if(window.__stTrack)window.__stTrack(event,meta||{}); } catch(_) {} }
  function requestMeta(error,startedAt) {
    var timedOut=error&&error.name==='AbortError';
    return {duration_ms:Math.max(0,Date.now()-startedAt),status:Number(error&&error.status)||0,error_type:(timedOut?'timeout':String(error&&error.name||'unknown')).slice(0,40),error_code:String(error&&error.code||'').slice(0,40),error_message:String(error&&error.message||'').slice(0,120)};
  }
  function watchExposure() {
    exposureSent=false;
    if(exposureObserver){exposureObserver.disconnect();exposureObserver=null;}
    if(!host)return;
    var emit=function(){if(exposureSent)return;exposureSent=true;track('trajectory_view',{logged_in:!!owner});if(exposureObserver){exposureObserver.disconnect();exposureObserver=null;}};
    if(typeof IntersectionObserver==='function'){
      exposureObserver=new IntersectionObserver(function(entries){for(var i=0;i<entries.length;i++)if(entries[i].isIntersecting&&entries[i].intersectionRatio>=0.25){emit();break;}},{threshold:[0.25]});
      exposureObserver.observe(host);
    } else emit();
  }
  function preferenceKey() { return state.user&&state.user.id?'st.trajectory.preferences.v1:'+state.user.id:''; }
  function noticeKey() { return state.user&&state.user.id?'st.trajectory.notice.v2:'+state.user.id:''; }
  function noticeSeen() { try { var key=noticeKey();return !!key&&localStorage.getItem(key)==='seen'; } catch(_) { return false; } }
  function rememberNotice() { try { var key=noticeKey();if(key)localStorage.setItem(key,'seen'); } catch(_) {} }
  function remember() { try { var key=preferenceKey();if(key)localStorage.setItem(key,JSON.stringify({mode:matchChoice,policy:policyChoice,min:minChoice,same_category:sameCategoryChoice,category:categoryChoice,forecast:forecastChoice})); } catch(_) {} }
  function trajectoryCategoryChoices() {
    var values=[];
    try { if(typeof categoryOptionsV14==='function')values=values.concat(categoryOptionsV14()||[]); } catch(_) {}
    try { if(state.classification&&Array.isArray(state.classification.options))values=values.concat(state.classification.options); } catch(_) {}
    try { (state.allExams||[]).forEach(function(exam){if(exam&&exam.grade_level)values.push(exam.grade_level);}); } catch(_) {}
    values=values.map(function(value){return String(value||'').trim();}).filter(Boolean);
    values=Array.from(new Set(values));
    var choices=[{value:'__all__',label:'全部分类'}];
    values.forEach(function(value){choices.push({value:value,label:value});});
    var hasUncategorized=false;try { hasUncategorized=(state.allExams||[]).some(function(exam){return !exam||!String(exam.grade_level||'').trim();}); } catch(_) {}
    if(hasUncategorized||!values.length)choices.push({value:'__none__',label:'未分类'});
    return choices;
  }
  function trajectoryCategoryLabel(value) {
    var choices=trajectoryCategoryChoices(),found=choices.find(function(choice){return choice.value===value;});
    return found?found.label:(value==='__none__'?'未分类':'全部分类');
  }
  function validTrajectoryCategory(value) { return trajectoryCategoryChoices().some(function(choice){return choice.value===value;}); }
  function countCopy() {
    var count=Math.max(0,Number(matchedCount)||0);
    if(count)return '已有 '+count+' 位用户匹配过你的匿名轨迹'+(enabled===false?' · 关闭后不会继续新增':'');
    return enabled===false?'关闭后不会继续新增匹配':'暂时还没有用户匹配过你的匿名轨迹';
  }
  function reset() {
    expandedReferences=false;generation++; if(host&&host.isConnected)host.innerHTML=''; owner=identity(); enabled=null; defaulted=false; noticeVisible=false; result=null; busy=false; message=''; metricChoice=''; matchChoice='shape';policyChoice='balanced';minChoice=2;sameCategoryChoice=false;apiVersion=1;categoryChoice='__all__';matchedCount=0;confirmAction=null;
    forecastChoice=forecast.settings();
    try { var key=preferenceKey(),p=key?JSON.parse(localStorage.getItem(key)||'null'):null;if(p){if(['shape','overlap'].indexOf(p.mode)>=0)matchChoice=p.mode;if(['balanced','long','recent'].indexOf(p.policy)>=0)policyChoice=p.policy;if(Number.isInteger(p.min)&&p.min>=2&&p.min<=1000)minChoice=p.min;if(typeof p.category==='string'&&p.category.length<=40&&validTrajectoryCategory(p.category))categoryChoice=p.category;sameCategoryChoice=p.same_category===true;forecastChoice=forecast.settings(p.forecast);} } catch(_) {}
  }
  function policyNote() { return policyChoice==='long'?'在足够相近的轨迹里，先看参考场次更多的人。':policyChoice==='recent'?'侧重最近 '+(minChoice>=5?minChoice:minChoice+'～5')+' 次考试的变化。':'兼顾相似程度和参考场次，相近时优先长轨迹。'; }
  function fmt(v) { return (filters.metric==='score'?'':'前')+(Math.round(v*10)/10)+'%'; }
  function hasScore(m) { return typeof m.match_score==='number'&&Number.isFinite(m.match_score)&&m.match_score>=0&&m.match_score<=100; }
  function scoreBadge(m) { return hasScore(m)?'<span class="st-peer-fit">匹配度 '+Math.round(m.match_score)+'%</span>':''; }
  async function api(action,payload) {
    var controller=new AbortController(),timer=setTimeout(function(){controller.abort();},20000);
    try {
      var response=await fetch('/api/score-tracker-trajectories',{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify(Object.assign({action:action,token:state.token},payload||{}))});
      var data=await response.json().catch(function(){return {};});
      if(!response.ok){var error=new Error(data.error||'暂时没能加载，请再试一次');error.status=response.status;error.code=typeof data.code==='string'?data.code:'';throw error;}
      return data;
    } finally {clearTimeout(timer);}
  }
  function current(seq,key) {return seq===generation&&key===identity()&&host&&host.isConnected;}
  async function load() {
    var startedAt=Date.now(),seq=++generation,key=owner;busy=true;message='';result=null;paint();
    try {
      var requestFilters=Object.assign({},filters,{api_version:apiVersion,min_history:apiVersion===2?minChoice:Math.max(3,minChoice)});
      var data=await api('match',requestFilters);
      if(!current(seq,key))return;
      enabled=data.enabled;result=data;selected=(data.matches||[]).map(function(){return true;});expandedReferences=false;if(Number.isFinite(Number(data.matched_count)))matchedCount=Math.max(0,Number(data.matched_count));
      track('trajectory_match_result',{category:filters.category,metric:filters.metric,match_mode:filters.match_mode,reference_policy:filters.reference_policy,min_history:requestFilters.min_history,api_version:apiVersion,same_category:sameCategoryChoice,subject_count:filters.subjects?filters.subjects.length:0,valid_count:data.qualification?data.qualification.valid_count:(data.history||[]).length,qualification_level:data.qualification?data.qualification.level:'legacy',count:(data.matches||[]).length,matched_count:matchedCount,reason:data.reason,duration_ms:Date.now()-startedAt,status:200});
    } catch(e) {if(current(seq,key)){message=e.name==='AbortError'?'这次加载有点久，请再试一次':e.message;track('trajectory_match_error',requestMeta(e,startedAt));}}
    finally {if(current(seq,key)){busy=false;paint();}}
  }
  async function status() {
    var startedAt=Date.now(),seq=++generation,key=owner;busy=true;paint();
    try {var data=await api('status');if(!current(seq,key))return;apiVersion=data.api_version===2?2:1;enabled=data.enabled;defaulted=data.defaulted===true;if(Number.isFinite(Number(data.matched_count)))matchedCount=Math.max(0,Number(data.matched_count));noticeVisible=enabled===true&&!noticeSeen();if(noticeVisible)track('trajectory_sharing_notice_view',{defaulted:defaulted,duration_ms:Date.now()-startedAt,status:200});track('trajectory_status_result',{enabled:!!enabled,defaulted:defaulted,matched_count:matchedCount,duration_ms:Date.now()-startedAt,status:200});busy=false;paint();if(enabled){load();return;}}
    catch(e){if(current(seq,key)){busy=false;message='暂时没能加载，请再试一次';track('trajectory_status_error',requestMeta(e,startedAt));paint();}}
  }
  async function sharing(value) {
    var startedAt=Date.now(),seq=++generation,key=owner;busy=true;message='';result=null;paint();
    try {
      var data=await api('sharing',{enabled:value});if(!current(seq,key))return;
      enabled=data.enabled;defaulted=false;noticeVisible=false;if(Number.isFinite(Number(data.matched_count)))matchedCount=Math.max(0,Number(data.matched_count));track('trajectory_sharing_change',{enabled:enabled,source:'user',matched_count:matchedCount,duration_ms:Date.now()-startedAt,status:200});busy=false;
      if(enabled){load();return;}paint();
    } catch(e){if(current(seq,key)){busy=false;message='设置还没有保存，请再试一次';track('trajectory_sharing_error',requestMeta(e,startedAt));paint();}}
  }
  function peerColor(i) {return colors[i]||'hsl('+((i*137.508)%360)+',48%,48%)';}
  function visibleMatches() {return expandedReferences?result.matches:result.matches.slice(0,3);}
  function prediction() {if(result.history.length<3)return null;return forecast.estimate(result.history,result.matches.filter(function(m,i){return selected[i];}),filters.match_mode,forecastChoice);}
  function chart(estimate) {
    var own=result.history,matches=visibleMatches().map(function(m){return forecast.align(own,m,filters.match_mode);}),n=own.length,horizon=Math.max.apply(null,matches.map(function(m){return m.future.length;})),count=n+horizon;
    var W=Math.max(560,count*76),H=250,L=55,R=26,T=24,B=40;
    var values=own.slice();matches.forEach(function(m,i){if(selected[i])values=values.concat(m.history,m.future);});if(estimate)values=values.concat([estimate.low,estimate.high,estimate.center]);
    var low=Math.max(0,Math.floor((Math.min.apply(null,values)-5)/5)*5),high=Math.min(100,Math.ceil((Math.max.apply(null,values)+5)/5)*5);if(high===low)high=low+1;
    function X(i){return L+i*(W-L-R)/(count-1);}
    function Y(v){return T+(filters.metric==='score'?(high-v):(v-low))*(H-T-B)/(high-low);}
    function line(vals,offset,color,dash,label,span){
      var step=span==null?1:span/(vals.length-1);
      var points=vals.map(function(v,i){return X(offset+i*step)+','+Y(v);}).join(' ');
      return '<polyline points="'+points+'" fill="none" stroke="'+color+'" stroke-width="'+(label==='我'?3:2)+'"'+(dash?' stroke-dasharray="5 5"':'')+'/>'+vals.map(function(v,i){return '<circle cx="'+X(offset+i*step)+'" cy="'+Y(v)+'" r="3.5" fill="'+color+'"><title>'+esc(label)+' · '+(dash?(i===0?'参考段末次':'后续第 '+i+' 次'):'参考段第 '+(i+1)+' 次')+' · '+fmt(v)+'</title></circle>';}).join('');
    }
    var svg='<rect x="'+X(n-1)+'" y="'+T+'" width="'+(W-R-X(n-1))+'" height="'+(H-T-B)+'" fill="var(--accent,#5d72e8)" opacity=".025"/>',overlay='';
    for(var j=0;j<=4;j++){var v=low+(high-low)*j/4,y=Y(v);svg+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y+'" y2="'+y+'" stroke="var(--line,#e8ebf0)"/><text x="'+(L-8)+'" y="'+(y+4)+'" text-anchor="end">'+fmt(v)+'</text>';}
    for(var k=0;k<count;k++)svg+='<text x="'+X(k)+'" y="'+(H-14)+'" text-anchor="middle">'+(k<n&&result.history_dates&&result.history_dates[k]?esc(result.history_dates[k].slice(5).replace('-','/')):k===n-1?'最近一次':k<n?'前 '+(n-1-k)+' 次':'后 '+(k-n+1)+' 次')+'</text>';
    matches.forEach(function(m,i){if(!selected[i])return;svg+=line(m.history,n-m.history.length,peerColor(i),false,'轨迹 '+(i+1))+line([m.history[m.history.length-1]].concat(m.future),n-1,peerColor(i),true,'轨迹 '+(i+1));});
    if(estimate){
      var x=X(n),cy=Y(estimate.center),ly=Y(estimate.low),hy=Y(estimate.high),anchorY=Y(own[n-1]),labelTop=Math.max(2,Math.min(ly,hy)-30);
      svg+='<g class="st-peer-forecast-mark"><path d="M '+X(n-1)+' '+anchorY+' L '+x+' '+ly+' L '+x+' '+hy+' Z" fill="var(--accent,#5d72e8)" opacity=".075"/><line x1="'+X(n-1)+'" y1="'+anchorY+'" x2="'+x+'" y2="'+cy+'" stroke="var(--accent,#5d72e8)" stroke-width="2" stroke-dasharray="2 4"/><path d="M '+(x-5)+' '+ly+' H '+(x+5)+' M '+x+' '+ly+' V '+hy+' M '+(x-5)+' '+hy+' H '+(x+5)+'" fill="none" stroke="var(--accent,#5d72e8)" stroke-width="2"/><g data-peer-forecast-toggle style="cursor:pointer"><rect x="'+(x-22)+'" y="'+(cy-22)+'" width="44" height="44" fill="transparent"/><path class="st-peer-forecast-center" d="M '+x+' '+(cy-6)+' L '+(x+6)+' '+cy+' L '+x+' '+(cy+6)+' L '+(x-6)+' '+cy+' Z" fill="var(--panel-solid,#fff)" stroke="var(--accent,#5d72e8)" stroke-width="2.5"><title>下次预测中心 · '+fmt(estimate.center)+'</title></path></g></g>';
      overlay='<button type="button" class="st-peer-forecast-label" data-peer-forecast-toggle aria-expanded="false" aria-controls="st-peer-forecast-tip" style="left:'+(x-38)+'px;top:'+labelTop+'px">下次预测</button><div id="st-peer-forecast-tip" class="st-peer-forecast-tip" hidden style="left:'+Math.max(L,Math.min(W-230,x-110))+'px;top:'+Math.min(H-174,labelTop+34)+'px"><button type="button" data-peer-forecast-close aria-label="收起预测详情">×</button><div><span>预测中心</span><strong>'+fmt(estimate.center)+'</strong></div><div><span>参考范围</span><b>'+fmt(estimate.low)+' ～ '+fmt(estimate.high)+'</b></div><small>'+estimate.count+' 条轨迹参考 · 仅供参考</small></div>';
    }
    svg+=line(own,0,'var(--accent,#5d72e8)',false,'我');
    return '<div class="st-peer-chart" tabindex="0" role="region" aria-label="相似轨迹对比，可左右滑动"><div class="st-peer-chart-canvas" style="width:'+W+'px"><svg role="img" aria-label="实线为匹配段，虚线为参考后续；蓝色空心菱形和色带为下次预测中心及范围" viewBox="0 0 '+W+' '+H+'">'+svg+'</svg>'+overlay+'</div></div><p class="st-peer-chart-caption">'+(filters.match_mode==='shape'?'走势已对齐 · ':'')+'虚线是参考轨迹的后续；横轴按有效场次排列，并非等时间间隔。预测指下一次有有效成绩的考试。</p>';
  }
  function toggleForecast(show) {
    var tip=host.querySelector('.st-peer-forecast-tip');if(!tip)return;
    var open=!tip.hidden,next=show==null?!open:!!show;if(open===next)return;
    tip.hidden=!next;
    var label=host.querySelector('.st-peer-forecast-label');if(label)label.setAttribute('aria-expanded',String(!tip.hidden));
    track('trajectory_forecast_detail',{action:next?'open':'close'});
  }
  function qualificationCard() {
    var q=result.qualification,n=(q?q.valid_count:(result.history||[]).length)||0,modern=apiVersion===2;
    var preliminary=modern&&n>=2,formal=n>=3,needed=q?q.required_count:Math.max(3,minChoice),skipped=q?(q.skipped_missing||0)+(q.skipped_unrelated||0):0;
    var copy='<section class="st-peer-qualification" aria-label="匹配资格"><div><b>'+esc(filters.label)+' · '+n+' 次有效成绩</b><span>'+ (modern?'初步参考 '+(preliminary?'已达标':'未达标（'+n+'/2）')+' · ':'')+'正式匹配 '+(formal?'已达标':'未达标（'+n+'/3）')+'</span></div>';
    if(!modern)copy+='<p>规则升级准备中，当前仍按至少 3 次及原有规则匹配。</p>';
    if(q){
      if(skipped)copy+='<p>已跳过 '+skipped+' 次记录'+(q.skipped_missing?'（'+q.skipped_missing+' 次当前指标缺失'+(q.skipped_unrelated?'，'+q.skipped_unrelated+' 次不含所选科目':'')+'）':q.skipped_unrelated?'（不含所选科目）':'')+'，不会打断有效历史。</p>';
      if(q.incompatible_count)copy+='<p>总分科目组合不同，另有 '+q.incompatible_count+' 次旧记录未接入当前轨迹。</p>';
      if(q.categories&&q.categories.length>1)copy+='<p>历史含多个分类，已按考试时间连接。</p>';
    }
    if(n<needed)copy+='<p>当前设置至少 '+needed+' 次，还差 '+(needed-n)+' 次；可补全年排/人数或分数/满分，也可添加考试、切换指标。</p>';
    else if(!(result.matches||[]).length)copy+='<p>历史已满足当前设置，暂时没有合适的参考轨迹。</p>';
    return copy+'</section>';
  }
  function paint() {
    if(!host||!host.isConnected)return;
    var body='';
    if(enabled===false){
      body='<div class="st-peer-off"><span>匿名匹配已关闭</span><button type="button" class="st-peer-link" data-peer-enable '+(busy?'disabled':'')+'>重新开启</button></div>';
    }else if(enabled===true){
      body='<div class="st-peer-controls"><div role="group" aria-label="相似轨迹比较方式">'+[['year','年级排名'],['class','班级排名'],['score','得分率']].map(function(o){return '<button type="button" class="chip'+(filters.metric===o[0]?' active':'')+'" data-peer-metric="'+o[0]+'" aria-pressed="'+(filters.metric===o[0])+'" '+(busy?'disabled':'')+'>'+o[1]+'</button>';}).join('')+'</div><button type="button" class="st-peer-link" data-peer-disable '+(busy?'disabled':'')+'>关闭共享</button></div>';
      body+='<div class="st-peer-modes" role="group" aria-label="轨迹匹配方式">'+[['shape','走势相似'],['overlap','轨迹重合']].map(function(o){return '<button type="button" class="chip'+(filters.match_mode===o[0]?' active':'')+'" data-peer-mode="'+o[0]+'" aria-pressed="'+(filters.match_mode===o[0])+'" '+(busy?'disabled':'')+'>'+o[1]+'</button>';}).join('')+'</div>';
      var settingsOpen=host.querySelector('.st-peer-settings');
      var advancedOpen=host.querySelector('.st-peer-advanced');
      var choices=trajectoryCategoryChoices(),categoryOptions=choices.map(function(choice){return '<option value="'+esc(choice.value)+'"'+(categoryChoice===choice.value?' selected':'')+'>'+esc(choice.label)+'</option>';}).join('');
      body+='<details class="st-peer-settings"'+(settingsOpen&&settingsOpen.open?' open':'')+'><summary>匹配设置 · '+(categoryChoice==='__all__'?'全部分类':trajectoryCategoryLabel(categoryChoice))+' · '+(policyChoice==='long'?'长轨迹优先':policyChoice==='recent'?'近期变化优先':'综合匹配')+' · 至少 '+minChoice+' 次</summary><form data-peer-settings><div class="st-peer-fields"><label>分类范围<select name="category" '+(busy?'disabled':'')+'>'+categoryOptions+'</select></label><label>匹配偏好<select name="reference_policy" '+(busy?'disabled':'')+'>'+[['balanced','综合匹配'],['long','长轨迹优先'],['recent','近期变化优先']].map(function(o){return '<option value="'+o[0]+'"'+(policyChoice===o[0]?' selected':'')+'>'+o[1]+'</option>';}).join('')+'</select></label><label>至少参考几次<input name="min_history" type="number" min="2" max="1000" step="1" inputmode="numeric" required value="'+minChoice+'" '+(busy?'disabled':'')+'></label></div><label class="st-peer-check"><input type="checkbox" name="same_category" '+(sameCategoryChoice?'checked ':'')+((busy||apiVersion!==2)?'disabled':'')+'>仅匹配同分类的参考轨迹</label><p class="st-peer-note">按录入的分类名称判断，不核验实际年级。全部分类会连接自身跨分类的有效成绩；缺失记录自动跳过。2 次可看初步参考，3 次起正式匹配。'+policyNote()+'</p><details class="st-peer-advanced"'+(advancedOpen&&advancedOpen.open?' open':'')+'><summary>高级设置</summary><div class="st-peer-fields">'+[['similarity','匹配度权重',0,3],['history','场次权重',0,2],['width','范围宽度',0.5,2]].map(function(o){return '<label>'+o[1]+'<input name="forecast_'+o[0]+'" type="number" min="'+o[2]+'" max="'+o[3]+'" step="0.1" inputmode="decimal" required value="'+forecastChoice[o[0]]+'" '+(busy?'disabled':'')+'></label>';}).join('')+'</div><p class="st-peer-note">权重越大，越偏向匹配度高或场次多的轨迹；设为 0 则不考虑。范围宽度 1 为默认，越大越宽。</p></details><div class="st-peer-setting-actions"><button type="submit" class="chip active" '+(busy?'disabled':'')+'>应用设置</button><button type="button" class="st-peer-link" data-peer-default '+(busy?'disabled':'')+'>恢复默认</button></div></form></details>';
      if(!busy&&result){
        body+=qualificationCard();
        var matches=visibleMatches()||[];
        if(matches.length){
          var estimate=prediction();
          body+='<div class="st-peer-summary" aria-live="polite">'+(estimate?'<div class="st-peer-center"><span>下次预测中心</span><strong>'+fmt(estimate.center)+'</strong></div><div class="st-peer-range"><span>参考范围</span><b>'+fmt(estimate.low)+' ～ '+fmt(estimate.high)+'</b></div><small>'+estimate.count+' 条轨迹参考'+(estimate.disagreement?' · 走势有分歧':'')+(estimate.count<10?' · 参考较少':'')+'</small>':result.history.length===2?'<span>初步相似参考 · 仅有 2 次有效成绩，暂不提供正式预测中心</span>':'<span>选择轨迹，看看下次预测</span>')+'</div>';
          body+='<div class="st-peer-options"><span class="st-peer-mine">● 我的轨迹</span>'+matches.map(function(m,i){return '<button type="button" class="st-peer-option" style="--peer-color:'+peerColor(i)+'" data-peer-index="'+i+'" aria-pressed="'+selected[i]+'"><span class="st-peer-option-title"><span>● 相似轨迹 '+(i+1)+'</span>'+scoreBadge(m)+'</span><small>'+m.history.length+' 次参考'+(m.cross_category?' · 跨分类':'')+'</small></button>';}).join('')+'</div>'+(result.matches.length>3?'<p class="st-peer-note">'+(result.history.length<3?'初步参考暂不计算正式预测，默认展示前三条。':'预测使用全部已选参考，默认展示前三条。')+'<button type="button" class="st-peer-link" data-peer-expand aria-expanded="'+expandedReferences+'">'+(expandedReferences?'收起其余参考':'展开全部 '+result.matches.length+' 条参考')+'</button></p>':'')+chart(estimate);
          var helpOpen=host.querySelector('.st-peer-help');
          body+='<details class="st-peer-help"'+(helpOpen&&helpOpen.open?' open':'')+'><summary>预测与匹配说明</summary><p>'+ (filters.match_mode==='shape'?'相似走势先平移到你最近一次的水平，再参考他们后续的变化；图中也已对齐。':'重合模式保留对方的成绩水平，直接参考他们的后续成绩。')+'超出 0～100% 的部分按边界显示。</p><p>中心以你最近三次的中位水平为主（75%），结合所选轨迹后续的加权平均（25%）。参考轨迹默认按匹配度 × 参考场次的平方根加权；高级设置只调整参考部分。最多参考 20 位不同用户，数量不足时不会凑数。范围结合参考分歧和你近期的波动估计。预测仅供参考，不代表下次成绩一定落在范围内。</p><p class="st-peer-fit-note">匹配度表示这段走势有多相似，不是预测准确率。排序还会考虑场次和匹配偏好。</p><p>从最近一次往前比较，双方总场次数可以不同。只显示满足最低参考场次的轨迹，每人最多一条。</p><p>'+ (filters.metric==='score'?'得分率已换算到相同满分，试卷难度可能不同。':'排名来自各自的班级或年级，群体差异可能影响比较。')+'全部分类连接有效成绩，缺失记录跳过；总分科目组合改变仍会分段。可限定参考轨迹的分类名称，跨分类或长时间间隔可能影响比较。</p></details>';
          body+='<details class="st-peer-details"><summary>查看每次成绩</summary><div class="st-peer-table"><table><thead><tr><th>考试</th><th>我</th>'+matches.map(function(m,i){return '<th>轨迹 '+(i+1)+'</th>';}).join('')+'</tr></thead><tbody>';
          var n=result.history.length,max=Math.max.apply(null,matches.map(function(m){return m.future.length;}));
          for(var j=0;j<n;j++)body+='<tr><th>'+(result.history_dates&&result.history_dates[j]?esc(result.history_dates[j]):j===n-1?'最近一次':'前 '+(n-1-j)+' 次')+'</th><td>'+fmt(result.history[j])+'</td>'+matches.map(function(m){var idx=j-(n-m.history.length);return '<td>'+(idx>=0?fmt(m.history[idx]):'—')+'</td>';}).join('')+'</tr>';
          for(var k=0;k<max;k++)body+='<tr><th>后续 '+(k+1)+'</th><td>—</td>'+matches.map(function(m){return '<td>'+(k<m.future.length?fmt(m.future[k]):'—')+'</td>';}).join('')+'</tr>';
          body+='</tbody></table></div><p class="st-peer-note">这里保留原始成绩，同一行按距最近一次的场次对齐。</p></details>';
        }else body+='<div class="st-peer-empty">'+(result.reason==='need_history'?'当前可用考试还不够':'暂时没有符合这些设置的轨迹')+'<p>'+(result.reason==='need_history'?'当前分类范围内，需要至少 '+(apiVersion===2?minChoice:Math.max(3,minChoice))+' 次可比较的有效成绩。可以补全成绩、减少参考场次或切换指标。':'试试减少参考场次、切换分类范围或调整匹配偏好，下次考试后也可以再来看看。')+'</p><button type="button" class="st-peer-link" data-peer-retry>重新匹配</button></div>';
      }
    }
    if(busy)body+='<p class="st-peer-loading" role="status">'+(enabled===true?'正在寻找与你相近的轨迹…':'正在加载…')+'</p>';
    if(message)body+='<p class="st-peer-error" role="alert">'+esc(message)+' <button type="button" class="st-peer-link" data-peer-retry>重试</button></p>';
    var notice=noticeVisible&&enabled===true?'<div class="st-peer-notice" role="status"><span>已参与匿名匹配：其他用户只能看到匿名成绩趋势，看不到用户名、学校或考试名称。你可以随时关闭。</span><button type="button" class="st-peer-link" data-peer-notice-dismiss>知道了</button></div>':'';
    var confirm='';
    if(confirmAction!==null){
      var opening=confirmAction===true;
      confirm='<div class="st-peer-confirm" role="presentation"><div class="st-peer-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="stPeerConfirmTitle"><h4 id="stPeerConfirmTitle">'+(opening?'开启匿名匹配？':'关闭匿名匹配？')+'</h4><p>'+(opening?'开启后，其他用户可以匹配到你的匿名成绩趋势，你也可以使用相似轨迹。不会展示用户名、学校或考试名称。':'关闭后，其他用户将无法再匹配到你的匿名成绩趋势，你也无法使用相似轨迹。')+'</p><div class="st-peer-confirm-actions"><button type="button" class="chip" data-peer-confirm-cancel>先不'+(opening?'开启':'关闭')+'</button><button type="button" class="chip active" data-peer-confirm-ok>确认'+(opening?'开启':'关闭')+'</button></div></div></div>';
    }
    host.innerHTML='<div class="st-peer-heading"><div><h4>相似轨迹</h4><p>'+esc(filters.label)+'</p><small class="st-peer-count">'+esc(countCopy())+'</small></div><span class="sv31-tag">'+(apiVersion===2?'最多 20 条':'最多 3 条')+'</span></div>'+notice+body+confirm;
    var form=host.querySelector('[data-peer-settings]');if(form)form.noValidate=true;
    var chartHost=host.querySelector('.st-peer-chart');if(chartHost)chartHost.scrollLeft=Math.max(0,chartHost.scrollWidth-chartHost.clientWidth);
  }
  function bind(root,f) {
    host=root.querySelector('[data-peer-host]');if(!host)return;
    if(owner!==identity())reset();
    if(!owner){watchExposure();host.innerHTML='<p class="card-sub">登录后，看看与你相似的轨迹。</p>';return;}
    generation++;result=null;busy=false;message='';
    var cfg=state.sv31||{},subjects=cfg.subjMod&&cfg.subjMod.length?cfg.subjMod.slice():null;
    if(!validTrajectoryCategory(categoryChoice))categoryChoice='__all__';
    filters={api_version:2,same_category:sameCategoryChoice,reference_limit:20,match_mode:matchChoice,reference_policy:policyChoice,min_history:minChoice,subjects:subjects,metric:metricChoice||(cfg.mode==='score'?'score':'year'),category:categoryChoice,label:subjects?subjects.join('、'):'总分'};
    watchExposure();
    host.onclick=function(event){
      var summary=event.target.closest('summary');
      if(summary&&host.contains(summary)){var details=summary.parentElement,section=details.classList.contains('st-peer-settings')?'settings':details.classList.contains('st-peer-advanced')?'advanced':details.classList.contains('st-peer-help')?'help':details.classList.contains('st-peer-details')?'details':'other';setTimeout(function(){track('trajectory_details_toggle',{section:section,open:!!details.open});},0);}
      if(event.target.closest('[data-peer-forecast-toggle]')){toggleForecast();return;}
      if(event.target.closest('[data-peer-forecast-close]')){toggleForecast(false);host.querySelector('.st-peer-forecast-label').focus({preventScroll:true});return;}
      if(!event.target.closest('.st-peer-forecast-tip'))toggleForecast(false);
      var b=event.target.closest('button');if(!b||b.disabled)return;
      if(b.hasAttribute('data-peer-notice-dismiss')){noticeVisible=false;rememberNotice();track('trajectory_sharing_notice_dismiss',{status:200});paint();return;}
      if(b.hasAttribute('data-peer-confirm-cancel')){track('trajectory_sharing_confirm_cancel',{enabled:confirmAction===true});confirmAction=null;paint();return;}
      if(b.hasAttribute('data-peer-confirm-ok')){var confirmedValue=confirmAction===true;confirmAction=null;track('trajectory_sharing_confirm_accept',{enabled:confirmedValue});sharing(confirmedValue);return;}
      if(b.hasAttribute('data-peer-enable')){confirmAction=true;track('trajectory_sharing_confirm_view',{enabled:true});paint();return;}
      if(b.hasAttribute('data-peer-disable')){confirmAction=false;track('trajectory_sharing_confirm_view',{enabled:false});paint();return;}
      if(b.hasAttribute('data-peer-retry')){track('trajectory_retry',{kind:enabled===true?'match':'status'});if(enabled===true)load();else status();}
      if(b.hasAttribute('data-peer-metric')){var previous=filters.metric;metricChoice=b.getAttribute('data-peer-metric');filters.metric=metricChoice;track('trajectory_filter_change',{filter:'metric',from:previous,to:metricChoice});load();}
      if(b.hasAttribute('data-peer-mode')){var previousMode=filters.match_mode;matchChoice=b.getAttribute('data-peer-mode');filters.match_mode=matchChoice;remember();track('trajectory_filter_change',{filter:'match_mode',from:previousMode,to:matchChoice});load();}
      if(b.hasAttribute('data-peer-default')){matchChoice='shape';policyChoice='balanced';minChoice=2;sameCategoryChoice=false;categoryChoice='__all__';forecastChoice=forecast.settings();filters.match_mode=matchChoice;filters.reference_policy=policyChoice;filters.min_history=minChoice;filters.same_category=sameCategoryChoice;filters.category=categoryChoice;remember();track('trajectory_settings_reset',{category:categoryChoice,reference_policy:policyChoice,min_history:minChoice,forecast_similarity:forecastChoice.similarity,forecast_history:forecastChoice.history,forecast_width:forecastChoice.width});load();}
      if(b.hasAttribute('data-peer-expand')){expandedReferences=!expandedReferences;paint();track('trajectory_references_expand',{expanded:expandedReferences,count:result.matches.length});return;}
      if(b.hasAttribute('data-peer-index')){var i=Number(b.getAttribute('data-peer-index'));selected[i]=!selected[i];paint();track('trajectory_select',{index:i+1,selected:selected[i]});}
    };
    host.onkeydown=function(event){if(event.key!=='Escape')return;if(confirmAction!==null){track('trajectory_sharing_confirm_cancel',{enabled:confirmAction===true,source:'escape'});confirmAction=null;paint();event.preventDefault();return;}if(host.querySelector('.st-peer-forecast-tip:not([hidden])')){toggleForecast(false);host.querySelector('.st-peer-forecast-label').focus({preventScroll:true});event.preventDefault();}};
    host.oninput=function(event){if(event.target.matches('input[type="number"]'))event.target.setCustomValidity('');};
    host.onsubmit=function(event){
      var form=event.target;if(!form.hasAttribute('data-peer-settings'))return;event.preventDefault();if(busy)return;
      var input=form.elements.min_history,value=Number(input.value),policy=form.elements.reference_policy.value,category=form.elements.category.value,sameCategory=form.elements.same_category.checked;
      if(!Number.isInteger(value)||value<2||value>1000){input.setCustomValidity('请输入 2～1000 之间的整数');input.reportValidity();return;}
      if(['balanced','long','recent'].indexOf(policy)<0)return;
      if(!validTrajectoryCategory(category))return;
      var nextForecast={},specs=[['similarity',0,3],['history',0,2],['width',0.5,2]];
      for(var j=0;j<specs.length;j++){var spec=specs[j],field=form.elements['forecast_'+spec[0]],v=Number(field.value);if(field.value.trim()===''||!Number.isFinite(v)||v<spec[1]||v>spec[2]){field.closest('details').open=true;field.setCustomValidity('请输入 '+spec[1]+'～'+spec[2]+' 之间的数值');field.reportValidity();return;}nextForecast[spec[0]]=v;}
      var rematch=minChoice!==value||policyChoice!==policy||categoryChoice!==category||sameCategoryChoice!==sameCategory;
      minChoice=value;sameCategoryChoice=sameCategory;filters.same_category=sameCategory;policyChoice=policy;categoryChoice=category;forecastChoice=nextForecast;filters.min_history=value;filters.reference_policy=policy;filters.category=category;remember();track('trajectory_settings_change',{category:category,reference_policy:policy,min_history:value,same_category:sameCategory,forecast_similarity:forecastChoice.similarity,forecast_history:forecastChoice.history,forecast_width:forecastChoice.width,rematch:rematch});if(rematch)load();else paint();
    };
    status();
  }
  var style=document.createElement('style');style.textContent=
    '.st-peer-qualification{margin:12px 0;padding:12px 14px;border:1px solid var(--line,#e8ebf0);border-radius:12px;font-size:12px;line-height:1.7}.st-peer-qualification>div{display:flex;gap:8px 16px;justify-content:space-between;flex-wrap:wrap}.st-peer-qualification span,.st-peer-qualification p{color:var(--muted,#788392)}.st-peer-qualification p{margin:5px 0 0}.st-peer-check{display:flex;align-items:center;gap:8px;margin-top:12px;min-height:40px}.st-peer-check input{width:18px;height:18px;flex:none}'+
    '.st-peer-option-title{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.st-peer-fit{font-size:11px;line-height:1.4;padding:3px 7px;border-radius:999px;background:var(--cell,#f6f7fa);color:var(--text,#18212f);white-space:nowrap;font-variant-numeric:tabular-nums}'+
    '.st-peer-settings{margin:12px 0 16px;border:1px solid var(--line,#e8ebf0);border-radius:12px;padding:11px 13px;font-size:12px}.st-peer-settings summary{cursor:pointer;color:var(--muted,#788392);line-height:1.7}.st-peer-settings form{margin-top:14px}.st-peer-fields{display:flex;flex-wrap:wrap;gap:12px}.st-peer-fields label{display:flex;flex:1;min-width:130px;flex-direction:column;gap:7px;color:var(--muted,#788392)}.st-peer-fields select,.st-peer-fields input{box-sizing:border-box;width:100%;min-height:40px;padding:8px 10px;border:1px solid var(--line,#e8ebf0);border-radius:9px;background:var(--panel-solid,#fff);color:var(--text,#18212f);font:inherit;font-size:16px}.st-peer-setting-actions{display:flex;align-items:center;flex-wrap:wrap;gap:12px;margin-top:12px}.st-peer-setting-actions span{font-size:11px;color:var(--muted,#788392)}.st-peer-settings select:focus-visible,.st-peer-settings input:focus-visible,.st-peer-settings summary:focus-visible{outline:2px solid var(--accent,#5d72e8);outline-offset:3px}'+
    '.st-peer{margin-top:22px;padding-top:22px;border-top:1px solid var(--line,#e8ebf0);color:var(--text,#18212f)}.st-peer-heading,.st-peer-controls{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.st-peer h4{font-size:16px;margin:0}.st-peer-heading p,.st-peer-invite p,.st-peer-empty p{font-size:12px;color:var(--muted,#788392);line-height:1.8;margin:6px 0 0}.st-peer-invite{padding:20px;background:var(--accent-soft,#eef1ff);border-radius:16px;margin-top:16px;display:flex;align-items:center;gap:24px}.st-peer-invite b{font-size:14px}.st-peer-invite button{flex-shrink:0;padding:11px 16px;border-radius:12px;border:0;background:var(--accent,#5d72e8);color:white;font:inherit;font-size:12px;cursor:pointer}.st-peer-controls{margin:16px 0}.st-peer-controls>div,.st-peer-modes{display:flex;gap:6px;flex-wrap:wrap}.st-peer-modes{margin-top:12px}.st-peer-link{background:none;border:0;color:var(--muted,#788392);font:inherit;font-size:12px;cursor:pointer;text-decoration:underline;text-underline-offset:3px}.st-peer-summary{padding:16px 18px;border-radius:14px;background:var(--cell,#f6f7fa);display:flex;align-items:baseline;gap:12px;flex-wrap:wrap}.st-peer-summary span,.st-peer-summary small{font-size:12px;color:var(--muted,#788392)}.st-peer-summary strong{font-size:22px;font-variant-numeric:tabular-nums}.st-peer-summary small{margin-left:auto}.st-peer-options{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:16px 0}.st-peer-mine{font-size:12px;color:var(--accent,#5d72e8);margin-right:8px}.st-peer-option{display:flex;flex-direction:column;gap:5px;padding:10px 14px;border-radius:12px;border:1px solid var(--peer-color);color:var(--peer-color);background:var(--panel-solid,#fff);font:inherit;font-size:12px;text-align:left;cursor:pointer;transition:opacity .18s,transform .18s}.st-peer-option small{font-size:11px;color:var(--muted,#788392)}.st-peer-option[aria-pressed=false]{opacity:.45;border-color:var(--line,#e8ebf0)}.st-peer-option:active{transform:scale(.97)}.st-peer-chart{overflow:auto;touch-action:pan-x pan-y;max-width:100%}.st-peer-chart svg{display:block;width:100%;height:auto}.st-peer-chart text{font-size:11px;fill:var(--muted,#788392)}.st-peer-note{font-size:11px;line-height:1.8;color:var(--muted,#788392);margin:10px 0 0}.st-peer-empty{padding:24px 10px;text-align:center;font-size:14px}.st-peer-empty button{margin-top:12px}.st-peer-loading,.st-peer-error{font-size:13px;padding:20px 0;color:var(--muted,#788392)}.st-peer-loading{animation:st-peer-pulse 1.3s ease-in-out infinite}.st-peer-details{font-size:12px;color:var(--muted,#788392);margin-top:12px}.st-peer-details summary{cursor:pointer}.st-peer-table{overflow:auto;margin-top:10px}.st-peer-table table{width:100%;border-collapse:collapse;white-space:nowrap}.st-peer-table th,.st-peer-table td{padding:9px;text-align:left;border-bottom:1px solid var(--line,#e8ebf0)}.st-peer button:focus-visible,.st-peer-chart:focus-visible{outline:2px solid var(--accent,#5d72e8);outline-offset:3px}.st-peer button:disabled{opacity:.55;cursor:wait}@keyframes st-peer-pulse{50%{opacity:.5}}@media(max-width:620px){.st-peer-invite{flex-direction:column;align-items:stretch;gap:14px;padding:16px}.st-peer-summary strong{font-size:19px}.st-peer-summary small{width:100%;margin:0}.st-peer-option{flex:1;min-width:90px;padding:9px}.st-peer-mine{width:100%}}@media(prefers-reduced-motion:reduce){.st-peer *{animation:none!important;transition:none!important}}';document.head.appendChild(style);
  style.textContent+='.st-peer-notice{display:flex;align-items:center;gap:8px;margin-top:8px;font-size:11px;line-height:1.6;color:var(--muted,#788392)}.st-peer-notice span{flex:1;min-width:0}.st-peer-count{display:block;margin-top:6px;font-size:11px;line-height:1.5;color:var(--muted,#788392)}.st-peer-off{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:10px;font-size:12px;color:var(--muted,#788392)}.st-peer-confirm{position:fixed;inset:0;z-index:180;display:grid;place-items:center;padding:18px;background:rgba(20,27,39,.4);backdrop-filter:blur(7px)}.st-peer-confirm-dialog{width:min(390px,100%);box-sizing:border-box;padding:22px;border:1px solid var(--line,#e8ebf0);border-radius:18px;background:var(--panel-solid,#fff);color:var(--text,#18212f);box-shadow:0 20px 70px rgba(17,24,39,.24)}.st-peer-confirm-dialog h4{margin:0;font-size:17px}.st-peer-confirm-dialog p{margin:11px 0 0;font-size:13px;line-height:1.8;color:var(--muted,#788392)}.st-peer-confirm-actions{display:flex;justify-content:flex-end;gap:9px;flex-wrap:wrap;margin-top:19px}.st-peer-confirm-actions .chip{min-height:38px;padding:8px 13px}.st-peer-confirm button:focus-visible{outline:2px solid var(--accent,#5d72e8);outline-offset:3px}@media(max-width:620px){.st-peer-notice{align-items:flex-start}.st-peer-confirm{padding:12px}.st-peer-confirm-dialog{padding:19px 17px;border-radius:16px}.st-peer-confirm-actions{display:grid;grid-template-columns:1fr 1fr}.st-peer-confirm-actions .chip{width:100%}}';
  style.textContent+='.st-peer-settings summary,.st-peer-fields label,.st-peer-link,.st-peer-option small{color:var(--text,#18212f)}.st-peer-settings summary{font-weight:500}.st-peer-advanced{margin-top:16px;border-top:1px solid var(--line,#e8ebf0);padding-top:12px}.st-peer-advanced .st-peer-fields{margin-top:12px}.st-peer-summary{position:relative;align-items:center;gap:10px 28px;padding:20px}.st-peer-center,.st-peer-range{display:flex;flex-direction:column;gap:6px}.st-peer-summary span{color:var(--text,#18212f)}.st-peer-summary strong{font-size:28px;line-height:1.2;color:var(--accent,#5d72e8)}.st-peer-summary b{font-size:15px;font-weight:600;font-variant-numeric:tabular-nums}.st-peer-summary small{align-self:flex-end;font-size:11px}.st-peer-chart-caption{margin:8px 0 14px;font-size:11px;color:var(--text,#18212f)}.st-peer-help,.st-peer-details{margin:0;font-size:12px;line-height:1.8;color:var(--text,#18212f)}.st-peer-help summary,.st-peer-details summary{cursor:pointer;padding:9px 0}.st-peer-help p{margin:8px 0 12px}.st-peer-help summary:focus-visible,.st-peer-details summary:focus-visible,.st-peer-advanced summary:focus-visible{outline:2px solid var(--accent,#5d72e8);outline-offset:3px}.st-peer-table .st-peer-note{color:var(--text,#18212f)}@media(max-width:620px){.st-peer-summary{gap:14px 20px;padding:18px}.st-peer-summary strong{font-size:26px}.st-peer-summary small{width:100%;margin:0}.st-peer-summary b{font-size:14px}.st-peer-option{min-width:0}.st-peer-option-title{gap:5px}.st-peer-fit{font-size:10px}.st-peer-advanced .st-peer-fields label{min-width:110px}}';
  style.textContent+='.st-peer-chart-canvas{position:relative;min-width:100%}.st-peer-forecast-label{position:absolute;box-sizing:border-box;width:76px;min-height:28px;padding:4px 7px;border:0;border-radius:7px;background:var(--accent-soft,#eef1ff);color:var(--accent,#5d72e8);font:inherit;font-size:11px;font-weight:600;cursor:pointer;white-space:nowrap}.st-peer-forecast-label::before{content:"";position:absolute;inset:-8px 0}.st-peer-forecast-tip{position:absolute;z-index:2;box-sizing:border-box;width:220px;padding:14px;border:1px solid var(--line,#e8ebf0);border-radius:12px;background:var(--panel-solid,#fff);color:var(--text,#18212f);box-shadow:0 8px 24px rgba(20,30,60,.12);font-size:12px}.st-peer-forecast-tip[hidden]{display:none}.st-peer-forecast-tip>button{position:absolute;right:3px;top:3px;width:32px;height:32px;border:0;background:none;color:var(--text,#18212f);font-size:20px;cursor:pointer}.st-peer-forecast-tip>div{display:flex;flex-direction:column;gap:4px;margin-bottom:10px}.st-peer-forecast-tip strong{font-size:19px;color:var(--accent,#5d72e8)}.st-peer-forecast-tip b{font-size:13px;font-weight:500}.st-peer-forecast-tip small{font-size:10px}';
  window.__stTrajectories={html:function(){return '<section class="st-peer" data-peer-host aria-label="相似轨迹"></section>';},bind:bind};
  // Keep the canvas coordinates identical to SVG coordinates, including on wide screens.
  style.textContent+='.st-peer-chart-canvas{min-width:0}.st-peer-forecast-tip{line-height:1.5}.st-peer-forecast-label{padding:0;background:transparent;border-radius:0;min-height:20px;font-size:10px;font-weight:400}';
  document.addEventListener('click',function(event){if(host&&!host.contains(event.target))toggleForecast(false);});
  // Invalidate in-flight results as soon as navigation or sign-out removes the host.
  new MutationObserver(function(){if(host&&!host.isConnected){generation++;host=null;result=null;}if(owner!==identity())reset();}).observe(document.body,{childList:true,subtree:true});
})();
