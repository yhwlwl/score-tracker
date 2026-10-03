/* app-v37.js · API failure diagnostics
 * 记录真实的 HTTP 状态、错误信息和请求阶段，同时避免记录密码、token 或请求体。
 */
(function () {
  'use strict';

  if (window.__scoreTrackerRequestDiagnosticsV37) return;
  window.__scoreTrackerRequestDiagnosticsV37 = true;

  var PRIMARY_API = '/api/score-tracker-api';
  var DATA_API = '/api/score-tracker-data-api';
  var TELEMETRY_EVENT = 'api_fetch_error';
  var nativeFetch = window.fetch && window.fetch.bind(window);
  var sequence = 0;
  var diagnosticsByAction = Object.create(null);
  var responseDiagnostics = new WeakMap();
  var QUEUE_KEY = 'st_request_error_queue';
  var pending = [];
  var flushing = false;
  try { pending = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); } catch (_) {}
  if (!Array.isArray(pending)) pending = [];
  pending = pending.filter(function (x) { return x && x.record && Date.now() - Date.parse(x.record.occurred_at) < 48 * 3600000; }).slice(-20);

  if (!nativeFetch) return;

  function targetOf(input) {
    return String(typeof input === 'string' ? input : (input && input.url) || '');
  }

  function methodOf(input, init) {
    return String((init && init.method) || (input && input.method) || 'GET').toUpperCase();
  }

  function isWatchedTarget(target) {
    try {
      var url = new URL(target, location.href);
      return url.origin === location.origin && /^\/api\/score-tracker-(api|data-api|modules-api|username-api|notices|recovery|vision-preview)$/.test(url.pathname);
    } catch (e) { return false; }
  }

  function actionOf(input, init) {
    var body = init && init.body;
    if (body == null && input && input.body && typeof input.body === 'string') body = input.body;
    if (body == null) return '';
    try {
      var parsed = JSON.parse(String(body));
      return String(parsed && parsed.action || (endpointOf(targetOf(input)) === '/api/score-tracker-vision-preview' ? 'recognize' : ''));
    } catch (e) {
      return '';
    }
  }

  function reportableAction(action) {
    return !!action && action !== 'track_event' && !/^feedback_/.test(action);
  }

  function endpointOf(target) {
    try { return new URL(target, location.href).pathname; } catch (e) { return target.split('?')[0].slice(0, 180); }
  }

  function safeMessage(value, fallback) {
    var message = String(value == null ? '' : value).trim();
    message = message.replace(/(password|token|authorization|api[_-]?key)\s*["']?\s*[:=]\s*["']?[^\s,}"']+/gi, '$1=[已隐藏]').replace(/Bearer\s+\S+/gi, 'Bearer [已隐藏]');
    return (message || fallback || '请求失败').slice(0, 240);
  }

  function codeOf(record) {
    if (record.request_state === 'http_error') return 'HTTP_' + record.request_status;
    if (record.error_name === 'TimeoutError') return 'REQUEST_TIMEOUT';
    if (record.error_name === 'AbortError') return 'REQUEST_ABORTED';
    return record.online ? 'NETWORK_FETCH_FAILED' : 'NETWORK_OFFLINE';
  }

  function friendlyMessage(record) {
    if (record.request_state === 'http_error') return record.error_message;
    if (record.error_code === 'REQUEST_TIMEOUT') return '连接超时，请稍后重试';
    if (record.error_code === 'REQUEST_ABORTED') return '请求已取消，可以重新尝试';
    return record.online ? '暂时无法连接，请稍后重试或切换网络' : '当前没有网络连接，请联网后重试';
  }

  function errorMessage(error) {
    return safeMessage(error && error.message, '网络请求失败');
  }

  function makeDiagnostic(meta) {
    var status = meta.status == null ? null : Number(meta.status);
    var record = {
      request_id: meta.requestId || 'st-' + Date.now().toString(36) + '-' + (++sequence),
      request_state: meta.state,
      request_status: status,
      request_status_text: safeMessage(meta.statusText, meta.state === 'network_error' ? 'fetch_rejected' : ''),
      request_method: meta.method,
      request_url: endpointOf(meta.target),
      request_duration_ms: Math.max(0, Date.now() - meta.startedAt),
      action: meta.action,
      error_status: status,
      error_message: safeMessage(meta.message, '请求失败'),
      error_name: safeMessage(meta.errorName, meta.state === 'network_error' ? 'NetworkError' : 'HttpError'),
      online: navigator.onLine !== false,
      app_version: window.__releaseNotices?.currentVersion?.() || (document.querySelector('meta[name="application-version"]') || {}).content || 'unknown',
      occurred_at: new Date().toISOString()
    };
    record.error = {
      status: record.error_status,
      message: record.error_message,
      name: record.error_name
    };
    record.error_code = codeOf(record);
    record.request = {
      state: record.request_state,
      status: record.request_status,
      statusText: record.request_status_text,
      method: record.request_method,
      url: record.request_url,
      durationMs: record.request_duration_ms
    };
    record._createdAt = Date.now();
    return record;
  }

  function remember(record) {
    if (record.action) diagnosticsByAction[record.action] = record;
    window.__scoreTrackerLastRequestDiagnostic = record;
    window.__scoreTrackerRequestDiagnostics = diagnosticsByAction;
    try {
      console.warn('[Score Tracker] API request failed', {
        action: record.action,
        status: record.error_status,
        message: record.error_message,
        requestStatus: record.request_status,
        requestState: record.request_state,
        endpoint: record.request_url,
        requestId: record.request_id
      });
    } catch (e) {}
  }

  function saveQueue() {
    try { localStorage.setItem(QUEUE_KEY, JSON.stringify(pending)); } catch (_) {}
  }

  async function flushDiagnostics() {
    if (flushing || navigator.onLine === false || !pending.length) return;
    flushing = true;
    try {
      // A bounded snapshot prevents requests arriving during a flush from causing an endless loop.
      var batch = pending.slice();
      for (var item of batch) {
        var response;
        var controller = new AbortController();
        var timer = setTimeout(function () { controller.abort(); }, 8000);
        try {
          if (typeof window.__scoreTrackerTrack === 'function') {
            response = await window.__scoreTrackerTrack(TELEMETRY_EVENT, item.record, undefined, item.context, { signal: controller.signal });
          } else {
            response = await nativeFetch(PRIMARY_API, {
              method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true, signal: controller.signal,
              body: JSON.stringify({ action: 'track_event', eventType: TELEMETRY_EVENT, context: item.context, metadata: item.record })
            });
          }
        } finally { clearTimeout(timer); }
        if (!response || !response.ok) break;
        pending = pending.filter(function (x) { return x.record.request_id !== item.record.request_id; });
        saveQueue();
      }
    } catch (_) {} finally { flushing = false; }
  }

  function sendDiagnostic(record) {
    var context = { clientTime: record.occurred_at, appVersion: record.app_version, appPage: document.querySelector('.auth-page') ? 'login' : 'unknown', pathname: location.pathname };
    try { context.sessionId = sessionStorage.getItem('st_session_id'); context.visitorId = localStorage.getItem('st_visitor_id'); context.eventId = crypto.randomUUID(); } catch (_) {}
    var copy = Object.assign({}, record); delete copy._createdAt;
    pending.push({ record: copy, context: context });
    pending = pending.slice(-20);
    saveQueue();
    flushDiagnostics();
  }

  function inspectHttpError(response, meta) {
    // 先记下状态，让 api()/dataApiV7() 的 catch 可以立即拿到真实 status；
    // 响应体稍后解析完成后再补上服务端返回的真实 message。
    var record = makeDiagnostic({
      state: 'http_error',
      status: response.status,
      statusText: response.statusText,
      method: meta.method,
      target: meta.target,
      action: meta.action,
      startedAt: meta.startedAt,
      message: response.statusText || '请求失败',
      errorName: 'HttpError',
      requestId: response.headers.get('x-score-request-id') || meta.requestId
    });
    remember(record);
    responseDiagnostics.set(response, record);
    var clone;
    try { clone = response.clone(); } catch (e) { clone = null; }
    var parse = clone ? clone.json().catch(function () { return {}; }) : Promise.resolve({});
    return parse.then(function (payload) {
      var serverMessage = payload && (payload.error || payload.message || payload.detail);
      if (serverMessage) {
        record.error_status = record.request_status;
        record.error_message = safeMessage(serverMessage, record.error_message);
        record.error.message = record.error_message;
      }
      if (payload && payload.code) record.error_code = safeMessage(payload.code);
      var serverId = response.headers && (response.headers.get('sb-request-id') || response.headers.get('x-request-id') || response.headers.get('cf-ray'));
      record.server_request_id = serverId ? safeMessage(serverId) : '';
      sendDiagnostic(record);
    });
  }

  window.fetch = function diagnosticFetch(input, init) {
    var target = targetOf(input);
    if (!isWatchedTarget(target)) return nativeFetch(input, init);

    var meta = {
      target: target,
      method: methodOf(input, init),
      action: actionOf(input, init),
      startedAt: Date.now(),
      requestId: 'st-' + Date.now().toString(36) + '-' + (++sequence)
    };
    var headers = new Headers((init && init.headers) || (input && input.headers) || {});
    headers.set('X-Score-Request-Id', meta.requestId);
    var options = Object.assign({}, init || {}, { headers: headers });

    return nativeFetch(input, options).then(async function (response) {
      if (!response.ok && reportableAction(meta.action)) await inspectHttpError(response, meta);
      else if (response.ok) flushDiagnostics();
      return response;
    }, function (error) {
      if (reportableAction(meta.action)) {
        var record = makeDiagnostic({
          state: 'network_error',
          status: null,
          statusText: 'fetch_rejected',
          method: meta.method,
          target: meta.target,
          action: meta.action,
          startedAt: meta.startedAt,
          message: errorMessage(error),
          errorName: error && error.name,
          requestId: meta.requestId
        });
        remember(record);
        try { error.diagnostics = record; } catch (_) {}
        sendDiagnostic(record);
      }
      throw error;
    });
  };

  function attachDiagnostic(error, action) {
    var record = error && error.diagnostics;
    if (!record || Date.now() - record._createdAt > 30000) return error;
    try {
      error.status = record.error_status;
      error.errorStatus = record.error_status;
      error.requestStatus = record.request_status;
      error.requestState = record.request_state;
      error.requestStatusText = record.request_status_text;
      error.requestId = record.request_id;
      error.requestUrl = record.request_url;
      error.diagnostics = record;
      error.code = record.error_code;
      error.message = friendlyMessage(record) + '（' + record.error_code + '）';
    } catch (e) {}
    return error;
  }

  function wrapApi(name) {
    var original = window[name];
    if (typeof original !== 'function') return;
    window[name] = function diagnosticApiWrapper(action) {
      var args = arguments;
      try {
        return Promise.resolve(original.apply(this, args)).catch(function (error) {
          throw attachDiagnostic(error, action);
        });
      } catch (error) {
        throw attachDiagnostic(error, action);
      }
    };
  }

  wrapApi('api');
  wrapApi('dataApiV7');

  window.__scoreTrackerResponseError = function (response, payload, action) {
    var error = new Error(safeMessage(payload && (payload.error || payload.message), '请求失败'));
    error.status = response.status;
    var record = responseDiagnostics.get(response);
    if (!record) {
      record = makeDiagnostic({ state: 'http_error', status: response.status, action: action, method: 'POST', target: response.url || DATA_API, startedAt: Date.now(), message: error.message });
      record.error_code = response.ok ? 'INVALID_RESPONSE' : codeOf(record);
      remember(record);
      sendDiagnostic(record);
    }
    error.diagnostics = record;
    return attachDiagnostic(error, action);
  };

  window.__scoreTrackerShowRequestError = function (error, previous) {
    document.getElementById('requestErrorDetails')?.remove();
    var card = document.querySelector('.auth-card');
    if (!card) { if (typeof toast === 'function') toast(error.message); return; }
    var records = (previous || []).concat([error]).map(function (e) { return e.diagnostics; }).filter(Boolean);
    var record = error.diagnostics;
    var panel = document.createElement('div'); panel.id = 'requestErrorDetails'; panel.className = 'request-error'; panel.setAttribute('role', 'alert');
    var message = document.createElement('p'); message.textContent = record ? friendlyMessage(record) : safeMessage(error.message, '请求失败，请重试'); panel.appendChild(message);
    var code = document.createElement('small'); code.textContent = '错误码：' + (record ? record.error_code : 'CLIENT_ERROR'); panel.appendChild(code);
    var details = document.createElement('details'); var summary = document.createElement('summary'); summary.textContent = '查看详情'; details.appendChild(summary);
    var text = records.map(function (r) { return '错误码：' + r.error_code + '\n信息：' + r.error_message + '\n请求：' + r.action + '\n状态：' + (r.request_status == null ? '未收到 HTTP 响应' : 'HTTP ' + r.request_status) + '\n请求编号：' + r.request_id + (r.server_request_id ? '\n服务端编号：' + r.server_request_id : '') + '\n耗时：' + r.request_duration_ms + ' ms\n版本：' + r.app_version + '\n时间：' + r.occurred_at; }).join('\n\n');
    if (!text) text = '错误码：CLIENT_ERROR\n信息：' + safeMessage(error.message, '未知错误');
    var pre = document.createElement('pre'); pre.textContent = text; details.appendChild(pre); panel.appendChild(details);
    var copy = document.createElement('button'); copy.type = 'button'; copy.textContent = '复制错误信息';
    copy.onclick = async function () {
      try { await navigator.clipboard.writeText(text); copy.textContent = '已复制'; }
      catch (_) { details.open = true; var range = document.createRange(); range.selectNodeContents(pre); var selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range); copy.textContent = '已选中，请长按复制'; }
    };
    panel.appendChild(copy); card.appendChild(panel);
  };
  var style = document.createElement('style');
  style.textContent = '.request-error{margin-top:18px;padding:14px;border:1px solid var(--line,#e8ebf0);border-radius:12px;background:var(--panel-solid,#fff);color:var(--text,#18212f);overflow-wrap:anywhere}.request-error p{font-size:13px;line-height:1.7;margin:0 0 7px}.request-error small,.request-error summary{color:var(--muted,#788392);font-size:11px}.request-error details{margin-top:10px}.request-error summary{cursor:pointer}.request-error pre{font-family:inherit;font-size:11px;line-height:1.8;white-space:pre-wrap;overflow-wrap:anywhere;margin:10px 0}.request-error button{margin-top:12px;border:1px solid var(--line,#e8ebf0);border-radius:8px;padding:7px 10px;background:var(--panel-solid,#fff);color:var(--text,#18212f);font-size:12px;cursor:pointer}';
  document.head.appendChild(style);
  window.addEventListener('online', flushDiagnostics);
  setTimeout(flushDiagnostics, 1500);
})();

