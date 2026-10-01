/* app-v37.js · API failure diagnostics
 * 记录真实的 HTTP 状态、错误信息和请求阶段，同时避免记录密码、token 或请求体。
 */
(function () {
  'use strict';

  if (window.__scoreTrackerRequestDiagnosticsV37) return;
  window.__scoreTrackerRequestDiagnosticsV37 = true;

  var PRIMARY_API = '/api/score-tracker-api';
  var TELEMETRY_EVENT = 'api_fetch_error';
  var nativeFetch = window.fetch && window.fetch.bind(window);
  var sequence = 0;
  var diagnosticsByAction = Object.create(null);

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
    return (message || fallback || '请求失败').slice(0, 240);
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
      app_version: (document.querySelector('meta[name="application-version"]') || {}).content || 'unknown',
      occurred_at: new Date().toISOString()
    };
    record.error = {
      status: record.error_status,
      message: record.error_message,
      name: record.error_name
    };
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

  function sendDiagnostic(record) {
    try {
      if (typeof window.__scoreTrackerTrack === 'function') {
        var tracked = window.__scoreTrackerTrack(TELEMETRY_EVENT, record);
        if (tracked && typeof tracked.catch === 'function') tracked.catch(function () {});
        return;
      }
      nativeFetch(PRIMARY_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        body: JSON.stringify({
          action: 'track_event',
          token: localStorage.getItem('st_token') || '',
          eventType: TELEMETRY_EVENT,
          metadata: record
        })
      }).catch(function () {});
    } catch (e) {}
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

    return nativeFetch(input, options).then(function (response) {
      if (!response.ok && reportableAction(meta.action)) {
        return inspectHttpError(response, meta).then(function () { return response; });
      }
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
        sendDiagnostic(record);
      }
      throw error;
    });
  };

  function attachDiagnostic(error, action) {
    var record = diagnosticsByAction[String(action || '')];
    if (!record || Date.now() - record._createdAt > 30000) return error;
    try {
      error.status = record.error_status;
      error.errorStatus = record.error_status;
      error.requestStatus = record.request_status;
      error.requestState = record.request_state;
      error.requestStatusText = record.request_status_text;
      error.requestId = record.request_id;
      error.requestUrl = record.request_url;
      if (record.error_code) error.code = record.error_code;
      error.diagnostics = record;
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
})();