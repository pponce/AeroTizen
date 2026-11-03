'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const createMode = require('../launcher/service/app-mode');

function runtime() {
  const requests = [], launches = [], events = {}, timers = [], watcher = [];
  function Xhr() { requests.push(this); }
  Xhr.prototype.open = function (method, url) { Object.assign(this, {method, url}); };
  Xhr.prototype.setRequestHeader = function () {};
  Xhr.prototype.send = function (body) { this.body = body && JSON.parse(body); };
  const A = {config: {MANUAL_APP: true, SERVICE_ID: 'DclHome001.Watcher', SERVICE_URL: 'http://127.0.0.1:47790'},
    tizen: {ApplicationControl: function () {}, application: {launchAppControl: (control, id) => launches.push(id)}},
    apps: {all: [{id: 'netflix'}]}, homewatch: {reportApps: ids => watcher.push(ids), returned: () => watcher.push('home')}};
  const document = {hidden: false, addEventListener: (name, handler) => { events[name] = handler; }};
  vm.runInNewContext(fs.readFileSync(__dirname + '/../launcher/js/app-mode.js', 'utf8'), {
    window: {AeroTizen: A, setTimeout: callback => timers.push(callback)}, document, XMLHttpRequest: Xhr
  });
  function reply(request, value, code = 200) { request.status = code; request.responseText = JSON.stringify(value); request.onload(); }
  function status(enabled, extra = {}) { return {protocol: 1, enabled, ready: true, persistent: true, blocked: false, home_mode: 'watcher', ...extra}; }
  return {A, requests, launches, events, timers, watcher, reply, status, document};
}

test('the UI uses acknowledged App mode and only starts its own control service', () => {
  const h = runtime(); h.A.appMode.connect();
  assert.deepEqual(h.launches, ['DclHome001.Watcher']);
  assert.equal(h.A.config.MANUAL_APP, true);
  h.reply(h.requests[0], h.status(true));
  assert.equal(h.A.appMode.getSnapshot().ready, true); assert.deepEqual(h.watcher, []);
  h.A.appMode.setEnabled(false);
  assert.equal(h.A.config.MANUAL_APP, true, 'unacknowledged changes cannot enable the watcher');
  assert.deepEqual(h.requests[1].body, {enabled: false, expected_enabled: true});
  h.reply(h.requests[1], h.status(false));
  assert.equal(h.A.config.MANUAL_APP, false); assert.equal(h.watcher.length, 2);
  h.A.appMode.setEnabled(true); h.reply(h.requests[2], h.status(true));
  assert.equal(h.A.config.MANUAL_APP, true);
  h.A.appMode.setEnabled(false); h.reply(h.requests[3], h.status(false));
  assert.equal(h.A.config.MANUAL_APP, false); assert.equal(h.watcher.length, 4);
  assert.ok(h.requests.every(request => request.url === h.A.config.SERVICE_URL + '/app-mode'));
});

test('background prelaunch loads App mode without reporting a foreground return', () => {
  const h = runtime(); h.document.hidden = true;
  h.A.appMode.connect(); h.reply(h.requests[0], h.status(false));
  assert.equal(h.A.config.MANUAL_APP, false); assert.deepEqual(h.watcher, []);
  h.document.hidden = false; h.events.visibilitychange(); h.reply(h.requests[1], h.status(false));
  assert.equal(h.watcher.length, 2);
});

test('failed writes and concurrent changes never display an unconfirmed setting', () => {
  const h = runtime(); h.A.appMode.connect(); h.reply(h.requests[0], h.status(true));
  h.A.appMode.setEnabled(false); h.requests[1].onerror();
  assert.equal(h.A.config.MANUAL_APP, true); assert.equal(h.A.appMode.getSnapshot().enabled, true);
  assert.match(h.A.appMode.getSnapshot().error, /confirm/);
  assert.equal(h.A.appMode.getSnapshot().ready, false, 'a lost reply leaves the saved setting unknown');
  h.A.appMode.connect(); h.reply(h.requests[2], h.status(true));
  h.A.appMode.setEnabled(false);
  h.reply(h.requests[3], {error: 'App mode changed; check its status and try again', appMode: h.status(false)}, 409);
  assert.equal(h.A.config.MANUAL_APP, false);
  assert.match(h.A.appMode.getSnapshot().error, /changed/);
});

test('status retries are bounded, resume rereads saved mode, and native assignment stays untouched', () => {
  const h = runtime(); h.A.appMode.connect();
  for (let i = 0; i < 4; i++) { h.requests[i].ontimeout(); if (i < 3) h.timers.shift()(); }
  assert.equal(h.timers.length, 0); assert.equal(h.A.appMode.getSnapshot().ready, false);
  h.events.visibilitychange(); h.reply(h.requests[4], h.status(false, {home_mode: 'native'}));
  assert.equal(h.A.config.MANUAL_APP, true); h.A.appMode.setEnabled(true);
  assert.equal(h.requests.length, 5, 'mode toggle cannot overwrite native Home');
});

test('missing, corrupt and failed-readback preferences stop the watcher', () => {
  assert.equal(createMode(null, () => {}).read().enabled, true);
  let value = 'corrupt', changed = 0;
  const store = {exists: () => true, getValue: () => value, setValue: (key, next) => { value = next; }};
  const mode = createMode(store, () => { changed++; });
  assert.equal(mode.read().blocked, true);
  assert.throws(() => mode.change({enabled: false, expected_enabled: true}), /Save App mode On/);
  mode.change({enabled: true, expected_enabled: true});
  mode.change({enabled: false, expected_enabled: true});
  store.setValue = () => {};
  assert.throws(() => mode.change({enabled: true, expected_enabled: false}), /Could not confirm/);
  assert.equal(mode.read().enabled, true); assert.equal(mode.read().blocked, true); assert.equal(changed, 3);
});
