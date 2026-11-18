/* Registration hands in-memory credentials to the same guide used by login. */
(function () {
  'use strict';
  startRegister = async function () {
    if (state.setupRegisterBusy) return;
    state.setupRegisterBusy = true;
    try {
      const data = await api('register');
      state.token = data.token; state.user = data.user; state.page = 'home';
      localStorage.setItem('st_token', data.token); localStorage.setItem('st_known_user', '1');
      state.onboarding = {username:data.user.username, password:data.password};
      // Let the unified guide claim its one-time display before opening. This
      // prevents a registration render and the guide's own render from racing
      // into two prompts.
      try { render(); } catch (_) {}
    } catch (error) { renderLogin(error.message); }
    finally { state.setupRegisterBusy = false; }
  };
  showOnboarding = function () { window.ScoreSetupGuide?.open({credentials:state.onboarding?.password ? state.onboarding : null}); };
  const register = startRegister;
  if (document.readyState !== 'complete') window.addEventListener('DOMContentLoaded', function () { window.startRegister = register; }, {once:true});
})();
