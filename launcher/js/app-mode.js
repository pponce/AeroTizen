// Home behavior belongs to AeroTizen's own package. Vetro is queried read-only.
(function (A) {
  'use strict';
  var cfg = A.config, listeners = [], connecting = false, checking = false;
  var state = { enabled: true, ready: false, busy: false, persistent: false,
    blocked: false, home_mode: 'watcher', error: '', vetro: 'unchecked', warning: '' };
  function publish(patch) {
    var next = {}, key;
    for (key in state) { if (Object.prototype.hasOwnProperty.call(state, key)) { next[key] = state[key]; } }
    for (key in patch) { if (Object.prototype.hasOwnProperty.call(patch, key)) { next[key] = patch[key]; } }
    state = next;
    listeners.slice().forEach(function (listener) { listener(); });
  }
  function request(method, url, body, done) {
    var x, settled = false;
    function finish(value, error) { if (!settled) { settled = true; done(value, error); } }
    try {
      x = new XMLHttpRequest(); x.open(method, url, true); x.timeout = 1500;
      if (body) { x.setRequestHeader('Content-Type', 'text/plain'); }
      x.onload = function () {
        try {
          var value = JSON.parse(x.responseText);
          finish(value, x.status === 200 ? null : 'Home behavior request failed');
        } catch (error) { finish(null, 'Home behavior response was unreadable'); }
      };
      x.onerror = x.ontimeout = function () { finish(null, 'Home behavior service is unavailable'); };
      x.send(body ? JSON.stringify(body) : null);
    } catch (error) { finish(null, 'Home behavior service is unavailable'); }
  }
  function apply(value) {
    if (!value || value.protocol !== 1 || value.ready !== true || typeof value.enabled !== 'boolean' ||
        typeof value.persistent !== 'boolean' || typeof value.blocked !== 'boolean' ||
        ['watcher', 'hold', 'native', 'blocked'].indexOf(value.home_mode) < 0) { return false; }
    cfg.MANUAL_APP = value.enabled || value.blocked || value.home_mode !== 'watcher';
    publish({ enabled: value.enabled, ready: true, persistent: value.persistent,
      blocked: value.blocked, home_mode: value.home_mode, error: '' });
    if (!cfg.MANUAL_APP && A.homewatch && !document.hidden) {
      if (A.apps && A.apps.all) { A.homewatch.reportApps(A.apps.realIds || A.apps.all.map(function (app) { return app.id; })); }
      A.homewatch.returned();
    }
    return true;
  }
  function connect() {
    if (connecting || state.busy) { return; }
    if (!A.tizen) { publish({ error: 'Home behavior can be changed on the TV.' }); return; }
    connecting = true;
    try {
      A.tizen.application.launchAppControl(new A.tizen.ApplicationControl('http://tizen.org/appcontrol/operation/service'),
        cfg.SERVICE_ID, null, null);
    } catch (error) { /* The service may already be listening. */ }
    var attempt = 0;
    function read() {
      request('GET', cfg.SERVICE_URL + '/app-mode', null, function (value) {
        if (apply(value)) { connecting = false; return; }
        if (++attempt < 4) { window.setTimeout(read, 300); return; }
        connecting = false;
        publish({ ready: false, error: 'Could not check Home behavior. Select Check status to retry.' });
      });
    }
    read();
  }
  function checkVetro() {
    if (!A.tizen) { publish({ vetro: 'unknown', warning: 'Vetro launcher status is available on the TV.' }); return; }
    if (checking) { return; } checking = true;
    publish({ vetro: 'checking', warning: 'Checking Vetro launcher status…' });
    request('GET', 'http://127.0.0.1:8099/screen', null, function (value, error) {
      checking = false;
      if (error || !value || typeof value.version !== 'string' || !value.launcher || typeof value.launcher.enabled !== 'boolean') {
        publish({ vetro: 'unknown', warning: 'Could not check Vetro on port 8099. If you use its Launcher, turn that feature off in Vetro before turning App mode off.' });
      } else if (value.launcher.enabled) {
        publish({ vetro: 'enabled', warning: 'Vetro’s Launcher is on. Turn off Launcher in Vetro before turning App mode off. Otherwise both can compete for Home, causing flicker or unexpected returns. Keep Vetro itself installed.' });
      } else {
        publish({ vetro: 'disabled', warning: 'Vetro’s Launcher is off. Vetro itself can stay installed.' });
      }
    });
  }
  function setEnabled(enabled) {
    if (typeof enabled !== 'boolean' || !state.ready || state.busy || connecting || !state.persistent || state.home_mode !== 'watcher') { return; }
    if (enabled === state.enabled && !state.blocked) { return; }
    publish({ busy: true, error: '' });
    request('POST', cfg.SERVICE_URL + '/app-mode', { enabled: enabled, expected_enabled: state.enabled }, function (value, error) {
      if (error || !apply(value)) {
        if (value && value.appMode) { apply(value.appMode); }
        publish({ error: value && typeof value.error === 'string' ? value.error : 'Could not confirm the change. Check status before trying again.' });
      }
      publish({ busy: false });
      checkVetro();
    });
  }
  A.appMode = {
    getSnapshot: function () { return state; },
    subscribe: function (listener) { listeners.push(listener); return function () { listeners = listeners.filter(function (item) { return item !== listener; }); }; },
    connect: connect, setEnabled: setEnabled, checkVetro: checkVetro
  };
  document.addEventListener('visibilitychange', function () { if (!document.hidden) { connect(); } });
})(window.AeroTizen);
