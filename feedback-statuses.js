(() => {
  'use strict';

  const STATUS_LABELS = new Map([
    ['new', '已收到'],
    ['新反馈', '已收到'],
    ['reviewing', '处理中'],
    ['open', '处理中'],
    ['已查看', '处理中'],
    ['planned', '已计划'],
    ['resolved', '已解决'],
    ['closed', '已关闭'],
  ]);

  const STATUS_CLASSES = {
    '已收到': 'is-received',
    '处理中': 'is-reviewing',
    '已计划': 'is-planned',
    '已解决': 'is-resolved',
    '已关闭': 'is-closed',
  };

  const style = document.createElement('style');
  style.textContent = `
    .st-fb-pill.is-received{background:#eef4ff;border-color:#bfd0ff;color:#365fc4}
    .st-fb-pill.is-reviewing{background:#fff7e7;border-color:#f2d18d;color:#9a6410}
    .st-fb-pill.is-planned{background:#f4efff;border-color:#d7c6ff;color:#6c45b8}
    .st-fb-pill.is-resolved{background:#ecf9f2;border-color:#aadfc3;color:#237a4d}
    .st-fb-pill.is-closed{background:#f2f4f7;border-color:#d8dde6;color:#697386}
  `;
  document.head.appendChild(style);

  function normalize(root) {
    root.querySelectorAll?.('.st-fb-pill').forEach((badge) => {
      const current = badge.textContent?.trim() || '';
      const next = STATUS_LABELS.get(current) || current;
      if (next !== current) badge.textContent = next;
      Object.values(STATUS_CLASSES).forEach((name) => badge.classList.remove(name));
      const className = STATUS_CLASSES[next];
      if (className) badge.classList.add(className);
    });
  }

  function bindModal() {
    const modal = document.querySelector('.st-fb-modal');
    if (!modal || modal.dataset.statusLabelsBound === '1') return;
    modal.dataset.statusLabelsBound = '1';
    normalize(modal);
    const observer = new MutationObserver(() => normalize(modal));
    observer.observe(modal, { childList: true, subtree: true });
  }

  document.addEventListener('click', (event) => {
    if (event.target.closest?.('#stFeedbackBtn,.st-fb-tabs,[data-feedback-id],#stFbBack,#stFbReplyBtn')) {
      queueMicrotask(bindModal);
      setTimeout(bindModal, 0);
    }
  }, true);
})();
