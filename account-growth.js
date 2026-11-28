(function(){
 'use strict';
 var cached=null,cachedToken='',loadedAt=0,pending=null,viewToken='';
 function trackGrowth(event,meta){try{window.__scoreTrackerTrack?.(event,meta||{},'account');}catch(_){}}
 var names={record:'记录有效成绩',quick:'快速录入后保存',trend:'成绩趋势',radar:'能力雷达',worth:'成绩含金量',trajectory:'轨迹匹配',goal:'设置目标',reflection:'考试反思',types:'题型统计',paper:'核对试题',report:'查看已有分析报告',export:'导出成绩',appearance:'应用外观',feedback:'提交反馈或投票',planner:'学习规划'};
 var defaultPacks=[{code:'pack_1',name:'1 元应急包',price_cny:1,credits:500,tag:''},{code:'pack_3',name:'3 元学期包',price_cny:3,credits:1650,tag:'推荐'},{code:'pack_10',name:'9.9 元畅用包',price_cny:9.9,credits:6000,tag:'划算'}];
 function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
 function number(v){return Math.max(0,Math.floor(Number(v)||0)).toLocaleString();}
 function priceText(v){var n=Number(v);if(!Number.isFinite(n))return '';return Number.isInteger(n)?'¥'+n:'¥'+n.toFixed(2).replace(/0$/,'');}
 function safeShopUrl(u){var s=String(u||'').trim();return /^https:\/\/[^\s]+$/i.test(s)?s:'';}
 async function request(action,extra){var token=state.token,body=Object.assign({action:action,token:token},extra||{});var r=await fetch('/api/score-tracker-data-api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});var j=await r.json().catch(function(){return {};});if(!r.ok)throw Error(j.error||'暂时无法读取');if(token!==state.token)throw Error('登录状态已变化');return j;}
 function creditSplit(c){
  var freeHeld=c.free_held!=null?Number(c.free_held):Number(c.held||0);
  var freeAvail=c.free_available!=null?Number(c.free_available):Math.max(0,Number(c.balance||0)-freeHeld);
  var paidBal=Number(c.paid_balance||0),paidAvail=Number(c.paid_available||0);
  return {freeAvail:freeAvail,paidBal:paidBal,paidAvail:paidAvail,totalAvail:Number(c.available||0)};
 }
 function view(a){
  var g=a.growth,c=a.credits,next=(g.levels||[]).find(function(l){return l.level===g.level+1;});
  var split=creditSplit(c),topup=a.topup||{enabled:false,shop_url:'',notice:'',packs:[]};
  var requirements=next?['成长分 '+number(g.points)+' / '+number(next.threshold),next.min_days?'注册 '+g.registered_days+' / '+next.min_days+' 天':'',next.min_months?'有效使用 '+g.active_months+' / '+next.min_months+' 个月':'',!g.valid_exams?'至少 1 场有效考试':''].filter(Boolean).join(' · '):'已达到最高等级';
  var levelTable='<div class="ag-table" tabindex="0" role="region" aria-label="等级与 AI 月额度"><table><thead><tr><th>等级</th><th>成长分</th><th>额外要求</th><th>月积分</th></tr></thead><tbody>'+(g.levels||[]).map(function(l){return '<tr'+(l.level===g.level?' class="ag-current"':'')+'><td>Lv.'+l.level+'</td><td>'+l.threshold+'</td><td>'+esc([l.level>1?'有效考试':'',l.min_days?l.min_days+'天':'',l.min_months?l.min_months+'个有效月':''].filter(Boolean).join(' · ')||'—')+'</td><td>'+l.monthly_credits+'</td></tr>';}).join('')+'</tbody></table></div>';
  var statusNote=!a.enabled?'<p class="ag-note">账号等级对所有账号显示；AI 功能暂未开放。</p>'
   :a.budget_status==='paused'?(split.paidAvail>=13?'<p class="ag-note">本月共享免费预算暂已用完，当前可继续使用补充积分。</p>':'<p class="ag-note">本月 AI 预算不足，未扣积分</p>')
   :split.totalAvail<13?'<p class="ag-note ag-warn">当前可用 AI 积分不足（开始识图需至少 13 分）。手动录入与所有成绩分析功能永久免费。</p>':'';
  return '<div class="ag-summary"><div><span class="ag-level">Lv.'+g.level+'</span><span>成长分 <b>'+number(g.points)+'</b></span></div><button type="button" class="ag-refresh">刷新</button></div><p class="ag-progress">'+esc(requirements)+'</p><div class="ag-wallet"><div><b>'+number(split.totalAvail)+'</b><span>可用 AI 积分</span></div>'+(split.paidBal>0||split.paidAvail>0?'<div><b>'+number(split.paidAvail)+'</b><span>补充积分（永不过期）</span></div>':'')+'<div><b>'+number(c.monthly)+'</b><span>每月发放</span></div>'+(c.held?'<div><b>'+number(c.held)+'</b><span>任务预留</span></div>':'')+'</div>'+
   statusNote+
   '<details><summary>积分怎么用</summary><div class="ag-rules"><p><b>按实际用量扣分，失败不扣。</b>手动核对与保存免费。</p><div class="ag-table"><table aria-label="识别选项与开始所需积分"><thead><tr><th>功能 / 页面选项</th><th>开始需可用积分</th></tr></thead><tbody><tr><td>成绩图片识别</td><td>13 分（通常约 11～13 分 / 次）</td></tr></tbody></table></div><p>识图按实际用量扣分；提交时预留部分积分，完成后释放余量。试卷识别和题型分析暂未开放。</p><p>首次赠送 <b>'+number(c.welcome)+'</b> 分；Lv.2 起每月自动发放，升级补差。免费积分可累积至 <b>'+number(c.cap)+'</b> 分。</p><p>补充积分永不过期、不计入月度累积上限，使用时优先扣除免费积分，且不受全站共享免费预算暂停影响。</p></div></details>'+
   '<details><summary>如何升级</summary><div class="ag-rules"><ul><li>首次有效体验：按功能加分</li><li>有效使用月：<b>+60</b>，无需每天签到</li><li>不同日期的有效考试：每场 <b>+20</b>，每月最多 3 场</li><li>结合考试查看趋势、雷达、含金量或匹配：每场每月最多 <b>+10</b>，全账号每月最多 <b>+20</b></li></ul><p>重复点击不加分，等级累计保留。</p><details><summary>12 级门槛与月额度</summary>'+levelTable+'</details><details><summary>首次体验成长分</summary><div class="ag-features">'+(g.features||[]).filter(function(f){return f.earned||!['planner','types','paper','report'].includes(f.feature);}).map(function(f){return '<span>'+esc(names[f.feature]||f.feature)+' <b>+'+f.points+'</b> '+(f.earned?'已获得':'')+'</span>';}).join('')+'</div><p>历史仅按已保存的有效记录补记。</p></details></div></details>'+
   '<div class="ag-actions"><button type="button" class="ag-usage">最近 AI 用量</button><button type="button" class="ag-topup-history">补充记录</button>'+(topup.enabled?'<button type="button" class="ag-topup-btn">补充 / 兑换积分</button>':'')+'</div><div class="ag-history" aria-live="polite"></div>';
 }
 function openTopupModal(opts){
  opts=opts||{};
  if(!state.token)return;
  var prev=document.querySelector('.ag-modal-back');if(prev)prev.remove();
  var acct=opts.account||cached;
  var topup=(acct&&acct.topup)||opts.topup||{enabled:true,shop_url:'',notice:'',packs:defaultPacks};
  var packs=(topup.packs&&topup.packs.length)?topup.packs:defaultPacks;
  var shopUrl=safeShopUrl(topup.shop_url);
  var split=acct&&acct.credits?creditSplit(acct.credits):null;
  var back=document.createElement('div');
  back.className='ag-modal-back';
  back.innerHTML='<div class="ag-modal" role="dialog" aria-modal="true" aria-labelledby="ag-topup-title"><div class="ag-modal-head"><h3 id="ag-topup-title">补充 AI 积分</h3><button type="button" class="ag-modal-close" aria-label="关闭">×</button></div>'+
   '<p class="ag-modal-balance">'+(split?'当前可用 <b>'+number(split.totalAvail)+'</b> 分'+(split.paidAvail>0?'（免费 '+number(split.freeAvail)+' + 补充 '+number(split.paidAvail)+'）':''):'输入兑换码即可立即到账')+'</p>'+
   '<div class="ag-pack-grid">'+packs.map(function(pk){var est=Math.max(1,Math.floor(Number(pk.credits||0)/11.2));return '<div class="ag-pack"><div class="ag-pack-head"><strong>'+esc(pk.name)+'</strong>'+(pk.tag?'<span class="ag-pack-tag">'+esc(pk.tag)+'</span>':'')+'</div><div class="ag-pack-price">'+esc(priceText(pk.price_cny))+'</div><div class="ag-pack-credits">+'+number(pk.credits)+' 积分</div><div class="ag-pack-est">约 '+est+' 次成绩识图</div></div>';}).join('')+'</div>'+
   (shopUrl?'<a class="ag-shop-link" href="'+esc(shopUrl)+'" target="_blank" rel="noopener noreferrer">前往爱发电获取兑换码 ↗</a>':'')+
   (topup.notice?'<p class="ag-modal-note">'+esc(topup.notice)+'</p>':'')+
   '<form class="ag-code-form"><label class="ag-code-label" for="agRedeemCodeInput">已有兑换码？直接兑换到当前账号</label><div class="ag-code-row"><input id="agRedeemCodeInput" class="ag-code-input" type="text" maxlength="48" placeholder="输入兑换码，如 ST-XXXX-XXXX-XXXX" autocomplete="off" spellcheck="false"><button type="submit" class="ag-code-submit">立即兑换</button></div><p class="ag-code-status" role="status" aria-live="polite"></p></form>'+
   '<p class="ag-modal-foot">补充积分永不过期、不占月度累积上限；使用时优先扣除免费积分，识别失败不扣分。手动录入与全部成绩分析功能永久免费。虚拟积分一经兑换使用不支持退换。</p></div>';
  function close(){document.removeEventListener('keydown',onKey);back.remove();}
  function onKey(e){if(e.key==='Escape'){e.stopPropagation();close();}}
  document.addEventListener('keydown',onKey);
  back.addEventListener('click',function(e){if(e.target===back)close();});
  back.querySelector('.ag-modal-close').onclick=close;
  var form=back.querySelector('.ag-code-form'),input=back.querySelector('.ag-code-input'),submit=back.querySelector('.ag-code-submit'),status=back.querySelector('.ag-code-status'),balEl=back.querySelector('.ag-modal-balance');
  form.onsubmit=async function(e){
   e.preventDefault();
   var code=input.value.trim();
   if(!code){status.className='ag-code-status is-err';status.textContent='请输入兑换码';input.focus();return;}
   submit.disabled=true;submit.textContent='兑换中…';status.className='ag-code-status';status.textContent='';
   try{
    var res=await request('redeem_ai_code',{code:code});
    trackGrowth('account_ai_code_redeemed',{credits:res.credits,pack_code:res.pack_code||''});
    if(res.account){cached=res.account;cachedToken=state.token;loadedAt=Date.now();paint();var ns=creditSplit(res.account.credits||{});balEl.innerHTML='当前可用 <b>'+number(ns.totalAvail)+'</b> 分（免费 '+number(ns.freeAvail)+' + 补充 '+number(ns.paidAvail)+'）';}
    input.value='';
    status.className='ag-code-status is-ok';
    status.textContent='兑换成功，已到账 +'+number(res.credits)+' 补充积分！';
    if(typeof opts.onRedeemed==='function')opts.onRedeemed(res);
   }catch(err){
    status.className='ag-code-status is-err';
    status.textContent=err.message||'兑换失败，请核对后重试';
   }finally{
    if(submit.isConnected){submit.disabled=false;submit.textContent='立即兑换';}
   }
  };
  document.body.appendChild(back);
  trackGrowth('account_ai_topup_opened',{source:opts.source||'account'});
  input.focus();
 }
 function paint(){
  var host=document.getElementById('accountGrowth');
  if(!host||cachedToken!==state.token||!cached)return;
  host.innerHTML=view(cached);
  host.querySelector('.ag-refresh').onclick=function(){trackGrowth('account_growth_refresh');load(true);};
  host.querySelector('.ag-usage').onclick=async function(){
   var box=host.querySelector('.ag-history');trackGrowth('account_ai_usage_opened');this.disabled=true;
   try{
    var j=await request('account_usage');if(!host.isConnected)return;
    box.innerHTML=(j.usage||[]).map(function(r){var feature={vision:'成绩识图',paper_entry:'试题识别',probe:'连接测试',admin_test:'模型测试'}[r.feature]||'AI 调用';return '<p>'+esc(feature)+' · '+esc(new Date(r.created_at).toLocaleString())+' · '+number(r.charged_credits)+' 分 · '+esc({active:'进行中',succeeded:'已完成',failed:'失败未扣分',expired:'已释放预留'}[r.status]||r.status)+'</p>';}).join('')||'<p>暂无 AI 使用记录</p>';
   }catch(e){box.textContent=e.message;}finally{this.disabled=false;}
  };
  var topupHist=host.querySelector('.ag-topup-history');
  if(topupHist)topupHist.onclick=async function(){
   var box=host.querySelector('.ag-history');this.disabled=true;
   try{
    var j=await request('account_topups');if(!host.isConnected)return;
    var chMap={redeem_code:'兑换码',afdian_webhook:'爱发电',admin_grant:'管理员调整'};
    box.innerHTML=(j.topups||[]).map(function(r){var sign=Number(r.credits)>=0?'+':'';return '<p>'+esc(chMap[r.channel]||r.channel)+' · '+esc(new Date(r.created_at).toLocaleString())+' · <b>'+sign+Math.trunc(Number(r.credits)||0).toLocaleString()+' 分</b>'+(r.note?' · '+esc(r.note):'')+'</p>';}).join('')||'<p>暂无补充记录</p>';
   }catch(e){box.textContent=e.message;}finally{this.disabled=false;}
  };
  var topupBtn=host.querySelector('.ag-topup-btn');
  if(topupBtn)topupBtn.onclick=function(){openTopupModal({source:'account',account:cached});};
 }
 async function load(force){
  if(!state.token)return;var token=state.token,host=document.getElementById('accountGrowth');
  if(!force&&cachedToken===token&&cached&&Date.now()-loadedAt<30000){paint();return;}
  if(pending&&pending.token===token)return pending.promise;
  if(host&&!cached)host.textContent='正在读取等级与 AI 积分…';
  var promise=(async function(){try{var j=await request('account_status');if(state.token!==token)return;cached=j.account;cachedToken=token;loadedAt=Date.now();paint();}catch(e){if(host&&host.isConnected&&state.token===token){host.textContent='等级与 AI 积分暂不可用。';var b=document.createElement('button');b.type='button';b.className='ag-refresh';b.textContent='重试';b.onclick=function(){load(true);};host.appendChild(b);}}finally{if(pending&&pending.token===token)pending=null;}})();pending={token:token,promise:promise};return promise;
 }
 var oldAccount=accountHtml;accountHtml=function(){var html=oldAccount();if(!state.token)return html;var block='<section class="account-growth" id="accountGrowth" aria-label="账号等级（所有账号）与 AI 积分" aria-live="polite">正在读取账号等级与 AI 积分…</section>';return html.replace('<div class="username-origin-v19"',block+'<div class="username-origin-v19"');};
 var oldBind=bindPage;bindPage=function(){var result=oldBind.apply(this,arguments);if(state.page==='account'&&state.token){if(viewToken!==state.token){viewToken=state.token;trackGrowth('account_growth_view');}load(false);}else viewToken='';return result;};
 if(typeof dataApiV7==='function'){var oldApi=dataApiV7;dataApiV7=async function(action,payload){if(action==='save_exam'&&state.modal&&state.modal.dataset&&state.modal.dataset.quickEntryApplied)payload=Object.assign({},payload,{quick_entry:true});var r=await oldApi.call(this,action,payload);if(/^save_|^import/.test(action)){loadedAt=0;cached=null;}return r;};}
 window.ScoreAccountBenefits={refresh:function(){return load(true);},invalidate:function(){cached=null;loadedAt=0;},openTopupModal:openTopupModal};
 var style=document.createElement('style');style.textContent='.account-growth{margin:12px 0 8px;padding:16px;border:1px solid var(--line,#e2e8f0);border-radius:14px;background:var(--panel-solid,#fff);font-size:13px;line-height:1.7;max-width:100%;box-sizing:border-box;min-width:0;text-align:left}.ag-summary,.ag-summary>div{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.ag-summary{justify-content:space-between}.ag-level{font-size:15px;font-weight:750;color:var(--accent,#5269d8);background:var(--accent-soft,#edf1ff);border-radius:8px;padding:2px 10px}.ag-progress,.ag-note{color:var(--muted,#687386);font-size:12px;margin:10px 0}.ag-note.ag-warn{color:var(--warn,#b45309);background:var(--warn-soft,#fffbeb);padding:8px 10px;border-radius:8px;border:1px solid rgba(180,83,9,.18)}.ag-wallet{display:flex;gap:24px;flex-wrap:wrap;margin:14px 0}.ag-wallet>div{display:flex;flex-direction:column}.ag-wallet b{font-size:24px;line-height:1.2}.ag-wallet span{font-size:12px;color:var(--muted,#687386);margin-top:5px}.account-growth summary{cursor:pointer;color:var(--accent,#5269d8);padding:7px 0}.ag-rules{padding-top:4px}.ag-rules p{font-size:12px;color:var(--muted,#687386);margin:8px 0}.ag-table{width:100%;overflow:auto}.ag-table table{border-collapse:collapse;width:100%;font-size:12px}.ag-table th,.ag-table td{text-align:left;padding:8px 5px;border-bottom:1px solid var(--line,#e2e8f0)}.ag-current{color:var(--accent,#5269d8);font-weight:650}.ag-features{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.ag-features span{padding:6px;background:var(--soft,#f7f8fb);border-radius:6px;font-size:12px}.ag-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.ag-refresh,.ag-usage,.ag-topup-history,.ag-topup-btn{font:inherit;padding:6px 12px;color:var(--accent,#5269d8);border:1px solid var(--line,#e2e8f0);border-radius:8px;background:transparent;cursor:pointer;min-height:36px}.ag-topup-btn{background:var(--accent,#5269d8);color:var(--on-surface,#fff);border-color:transparent;font-weight:600}.ag-history p{border-bottom:1px solid var(--line,#e2e8f0);padding:8px 0;overflow-wrap:anywhere}.ag-modal-back{position:fixed;inset:0;z-index:260;display:grid;place-items:center;padding:16px;background:rgba(20,27,39,.44);backdrop-filter:blur(5px)}.ag-modal{width:min(460px,100%);max-height:90vh;overflow:auto;padding:20px;border-radius:18px;border:1px solid var(--line,#e2e8f0);background:var(--panel-solid,#fff);color:var(--text,#18212f);box-shadow:0 24px 60px rgba(20,27,39,.22);text-align:left;box-sizing:border-box}.ag-modal-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px}.ag-modal-head h3{margin:0;font-size:17px;font-weight:750}.ag-modal-close{width:34px;height:34px;border:0;border-radius:10px;background:var(--soft,#f1f5f9);color:var(--muted,#687386);font-size:20px;cursor:pointer}.ag-modal-balance{margin:0 0 14px;font-size:13px;color:var(--muted,#687386)}.ag-modal-balance b{color:var(--text,#18212f)}.ag-pack-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-bottom:14px}.ag-pack{padding:10px;border:1px solid var(--line,#e2e8f0);border-radius:12px;background:var(--soft,#f8fafc);display:flex;flex-direction:column;gap:4px}.ag-pack-head{display:flex;align-items:center;justify-content:space-between;gap:4px;font-size:12px}.ag-pack-tag{font-size:10px;padding:1px 6px;border-radius:999px;background:var(--accent-soft,#edf1ff);color:var(--accent,#5269d8);font-weight:700;white-space:nowrap}.ag-pack-price{font-size:18px;font-weight:800;color:var(--accent,#5269d8);line-height:1.2}.ag-pack-credits{font-size:12px;font-weight:650}.ag-pack-est{font-size:11px;color:var(--muted,#687386)}.ag-shop-link{display:block;text-align:center;text-decoration:none;padding:10px 14px;border-radius:10px;background:var(--accent,#5269d8);color:var(--on-surface,#fff);font-weight:650;font-size:13px;margin-bottom:12px}.ag-modal-note{font-size:12px;color:var(--muted,#687386);margin:0 0 12px;white-space:pre-line}.ag-code-form{padding-top:10px;border-top:1px solid var(--line,#e2e8f0)}.ag-code-label{display:block;font-size:12px;font-weight:600;margin-bottom:8px}.ag-code-row{display:flex;gap:8px}.ag-code-input{flex:1;min-width:0;padding:9px 10px;border:1px solid var(--line,#e2e8f0);border-radius:9px;background:var(--panel-solid,#fff);color:var(--text,#18212f);font:inherit;font-size:13px;text-transform:uppercase}.ag-code-submit{padding:9px 14px;border:0;border-radius:9px;background:var(--accent,#5269d8);color:var(--on-surface,#fff);font:inherit;font-size:13px;font-weight:650;cursor:pointer;white-space:nowrap}.ag-code-submit:disabled{opacity:.6;cursor:not-allowed}.ag-code-status{margin:8px 0 0;font-size:12px;min-height:16px}.ag-code-status.is-ok{color:var(--green,#15803d);font-weight:600}.ag-code-status.is-err{color:#dc2626}.ag-modal-foot{margin:12px 0 0;font-size:11px;line-height:1.65;color:var(--muted,#687386)}@media(max-width:480px){.account-growth{padding:12px}.ag-features{grid-template-columns:1fr}.ag-pack-grid{grid-template-columns:1fr}.ag-code-row{flex-direction:column}.ag-table th,.ag-table td{padding:7px 3px}}';document.head.appendChild(style);
})();
