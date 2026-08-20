// Compatibility helpers for older iOS Safari/WebViews.
// Keep this file tiny and load it before the application scripts.
(function () {
  if (!Array.prototype.at) {
    Object.defineProperty(Array.prototype, 'at', {
      value: function (index) {
        var len = this.length >>> 0;
        var n = Number(index) || 0;
        n = n < 0 ? Math.ceil(n) : Math.floor(n);
        if (n < 0) n += len;
        if (n < 0 || n >= len) return undefined;
        return this[n];
      },
      writable: true,
      configurable: true
    });
  }

  // Registration must never create an account and then lose the one-time
  // credentials because a later page-rendering error happened.
  window.addEventListener('DOMContentLoaded', function () {
    if (typeof startRegister !== 'function' || typeof api !== 'function') return;

    window.startRegister = async function startRegisterCompat() {
      var app = document.querySelector('#app');
      if (app) app.innerHTML = '<div class="splash"><div class="brand-mark">↗</div><div>正在创建你的专属账号</div><small>只需要几秒钟</small></div>';

      try {
        var data = await api('register');
        state.token = data.token;
        state.user = data.user;
        localStorage.setItem('st_token', data.token);
        localStorage.setItem('st_known_user', '1');

        var modal = document.createElement('div');
        modal.className = 'modal-backdrop';
        modal.innerHTML = '<div class="modal onboard"><div class="big-icon">✓</div><h2>账号已经准备好了</h2><p>请先保存账号，再进入成绩页面。</p>' +
          '<div class="credential"><small>用户名</small><div class="credential-row"><code>' + escapeHtml(data.user.username) + '</code><button class="copy-btn" data-copy="' + escapeHtml(data.user.username) + '">复制</button></div></div>' +
          '<div class="credential"><small>密码</small><div class="credential-row"><code>' + escapeHtml(data.password) + '</code><button class="copy-btn" data-copy="' + escapeHtml(data.password) + '">复制</button></div></div>' +
          '<div class="save-warning"><span class="i">i</span><div><b>请现在截图保存。</b><br>密码只展示这一次。</div></div>' +
          '<button class="primary full" id="compatSavedBtn">我已截图保存，继续</button></div>';
        document.body.appendChild(modal);

        var copyButtons = modal.querySelectorAll('[data-copy]');
        for (var i = 0; i < copyButtons.length; i += 1) {
          copyButtons[i].onclick = async function () {
            try {
              await navigator.clipboard.writeText(this.getAttribute('data-copy'));
              if (typeof toast === 'function') toast('已复制');
            } catch (e) {}
          };
        }

        document.querySelector('#compatSavedBtn').onclick = async function () {
          try {
            await loadExams();
            modal.remove();
            state.page = 'home';
            render();
          } catch (e) {
            modal.remove();
            renderLogin('账号已创建并已登录，但页面加载失败，请刷新后重试。');
          }
        };
      } catch (e) {
        renderLogin(e && e.message ? e.message : '注册失败，请重试');
      }
    };
  });
})();
