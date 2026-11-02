'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');
const source = fs.readFileSync(__dirname + '/../launcher/js/homewatch.js', 'utf8');
function harness(manual = false) {
  const calls = [], requests = [], messages = [], events = {};
  const A = { config: { MANUAL_APP: manual, SERVICE_URL: 'http://127.0.0.1:47790', SERVICE_ID: 'Watcher' },
    tizen: { application: {
      launch: (id, success, failed) => calls.push({ id, failed }),
      launchAppControl: () => calls.push({ service: true })
    }, ApplicationControl: function () {} }, catalog: { preloadedStoreId: id => id }, toast: message => messages.push(message) };
  const document = { hidden: true, addEventListener: (name, callback) => { events[name] = callback; } };
  function XMLHttpRequest() { requests.push(this); }
  XMLHttpRequest.prototype.open = function (method, url) { this.url = url; };
  XMLHttpRequest.prototype.send = function () {};
  vm.runInNewContext(source, { window: { AeroTizen: A }, document, XMLHttpRequest });
  return { A, calls, requests, messages, document, events };
}
test('Samsung Home escape waits for leave acknowledgement then explicitly opens stock Home', () => {
  const h = harness(); h.A.homewatch.useSamsungHome();
  assert.equal(h.calls.length, 0);
  const request = h.requests[0]; request.status = 200; request.responseText = '{"leaving":true}'; request.onload();
  assert.equal(h.calls[0].id, 'com.samsung.tv.csfs'); assert.equal(h.A.homewatch.isLeaving(), true);
  h.document.hidden = false; h.events.visibilitychange();
  assert.equal(h.A.homewatch.isLeaving(), false); assert.ok(h.requests[1].url.endsWith('/home'));
});
test('failed watcher acknowledgement cannot launch or exit an app', () => {
  const h = harness(); h.A.homewatch.useSamsungHome(); h.requests[0].ontimeout();
  assert.equal(h.calls.length, 0); assert.equal(h.messages.length, 1); assert.equal(h.A.homewatch.isLeaving(), false);
});
test('failed Samsung launch releases the temporary leave state', () => {
  const h = harness(); h.A.homewatch.useSamsungHome();
  h.requests[0].status = 200; h.requests[0].responseText = '{"leaving":true}'; h.requests[0].onload();
  h.calls[0].failed(); assert.equal(h.A.homewatch.isLeaving(), false); assert.ok(h.requests[1].url.endsWith('/home'));
});

test('manual app startup, app launches and foreground changes never start or contact a watcher', () => {
  const h = harness(true);
  h.A.homewatch.start();
  h.A.homewatch.watch('netflix.app');
  h.A.homewatch.reportApps(['netflix.app']);
  h.A.homewatch.reportStartup({ reason: 'manual' });
  h.document.hidden = false; h.events.visibilitychange();
  h.document.hidden = true; h.events.visibilitychange();
  h.document.hidden = false; h.events.visibilitychange();
  assert.deepEqual(h.calls, []);
  assert.deepEqual(h.requests, []);
});

test('manual app can open Samsung Home without a service and recover from a rejected launch', () => {
  const h = harness(true); h.A.homewatch.useSamsungHome();
  assert.equal(h.calls[0].id, 'com.samsung.tv.csfs');
  assert.equal(h.A.homewatch.isLeaving(), true);
  assert.deepEqual(h.requests, []);
  h.calls[0].failed();
  assert.equal(h.A.homewatch.isLeaving(), false);
  assert.equal(h.messages.length, 1);
  assert.deepEqual(h.requests, []);
});
