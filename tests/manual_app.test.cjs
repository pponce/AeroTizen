'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

test('the shipped app configuration makes all startup hooks inert on a TV', () => {
  const launches = [], requests = [], listeners = {};
  const window = { AeroTizen: {}, document: { hidden: false,
    addEventListener(name, callback) { listeners[name] = callback; } } };
  const context = { window, document: window.document,
    XMLHttpRequest: function () { requests.push(true); throw new Error('No watcher is installed'); } };
  Object.defineProperty(context, 'AeroTizen', { get: () => window.AeroTizen });
  const read = file => fs.readFileSync(path.join(__dirname, '../launcher', file), 'utf8');
  vm.runInNewContext(read('js/config.js'), context);
  window.AeroTizen.tizen = { application: {
    launch: id => launches.push(id), launchAppControl: () => launches.push('service')
  } };
  window.AeroTizen.catalog = { preloadedStoreId: id => id };
  vm.runInNewContext(read('js/homewatch.js'), context);
  window.AeroTizen.homewatch.start();
  window.AeroTizen.homewatch.watch('netflix.app');
  listeners.visibilitychange();
  assert.deepEqual(launches, []);
  assert.deepEqual(requests, []);
});
