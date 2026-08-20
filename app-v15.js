// v15: simple in-app password change setting
(function injectV15Styles(){
  if (document.getElementById('app-v15-style')) return;
  var style=document.createElement('style');
  style.id='app-v15-style';
  style.textContent='\n    .password-card-v15{margin-top:18px;padding:22px}\n    .password-grid-v15{display:grid;grid-template-columns:1fr 1fr auto;gap:10px;align-items:end;margin-top:14px}\n    .password-grid-v15 .field{margin:0}\n    .password-note-v15{font-size:12px;color:var(--muted);line-height:1.6;margin-top:10px}\n    @media(max-width:620px){.password-card-v15{padding:18px 16px}.password-grid-v15{grid-template-columns:1fr}.password-grid-v15 button{width:100%}}\n  ';
  document.head.appendChild(style);
})();

var PASSWORD_API_V15='https://kdwpmcdxapwecbfrvqtm.supabase.co/functions/v1/score-tracker-password-api';

async function changePasswordApiV15(newPassword){
  var response=await fetch(PASSWORD_API_V15,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({token:state.token,newPassword:newPassword})
  });
  var data=await response.json().catch(function(){return {error:'网络响应异常'};});
  if(!response.ok) throw new Error(data.error||'密码修改失败');
  return data;
}

var accountHtmlBeforeV15=accountHtml;
accountHtml=function accountHtmlV15(){
  var html=accountHtmlBeforeV15();
  return html+`<div class="card password-card-v15"><div><h3 class="card-title">修改密码</h3><p class="card-sub">已登录时可直接设置一个更好记的新密码。</p></div><div class="password-grid-v15"><div class="field"><label>新密码</label><input id="newPasswordV15" type="password" inputmode="numeric" pattern="[0-9]*" autocomplete="new-password" placeholder="6～20位数字"></div><div class="field"><label>再次输入</label><input id="confirmPasswordV15" type="password" inputmode="numeric" pattern="[0-9]*" autocomplete="new-password" placeholder="再次输入新密码"></div><button class="primary" id="changePasswordV15">保存新密码</button></div><div class="password-note-v15">修改成功后当前设备不会退出，以后重新登录请使用新密码。建议改成自己容易记住、但别人不容易猜到的数字组合。</div></div>`;
};

var bindPageBeforeV15=bindPage;
bindPage=function bindPageV15(){
  bindPageBeforeV15();
  var button=document.getElementById('changePasswordV15');
  if(button){
    button.onclick=async function(){
      var first=(document.getElementById('newPasswordV15')||{}).value||'';
      var second=(document.getElementById('confirmPasswordV15')||{}).value||'';
      if(!/^\d{6,20}$/.test(first)) return toast('新密码请设置为 6～20 位数字');
      if(first!==second) return toast('两次输入的密码不一致');
      button.disabled=true;
      button.textContent='保存中…';
      try{
        await changePasswordApiV15(first);
        document.getElementById('newPasswordV15').value='';
        document.getElementById('confirmPasswordV15').value='';
        toast('密码已修改，请记住新密码');
      }catch(e){
        toast(e&&e.message?e.message:'密码修改失败');
      }finally{
        button.disabled=false;
        button.textContent='保存新密码';
      }
    };
  }
};

var renderLoginBeforeV15=renderLogin;
renderLogin=function renderLoginV15(error){
  renderLoginBeforeV15(error);
  var passwordInput=document.getElementById('loginPass');
  if(passwordInput) passwordInput.placeholder='输入密码';
  var help=document.querySelector('.auth-help');
  if(help) help.textContent='新账号会生成 10 位数字密码；登录后可在账号页改成自己的 6～20 位数字密码。';
};
