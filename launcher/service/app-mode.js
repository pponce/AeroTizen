'use strict';

// A separate gate preserves the native Home handoff protocol. New installations
// and unreadable settings never start the watcher without a saved opt-in.
var KEY = 'aerotizen.app-mode.v1';
module.exports = function (storage, changed, failed) {
  var persistent = !!(storage && storage.exists && storage.getValue && storage.setValue);
  var enabled = true, blocked = !!failed;
  try {
    if (persistent && storage.exists(KEY)) {
      var saved = JSON.parse(storage.getValue(KEY));
      if (!saved || typeof saved.enabled !== 'boolean') { throw new Error('Invalid App mode'); }
      enabled = saved.enabled;
    }
  } catch (error) { enabled = true; blocked = true; }
  function read() { return { protocol: 1, enabled: enabled, persistent: persistent, blocked: blocked }; }
  function change(request) {
    if (!persistent) { throw new Error('App mode storage is unavailable'); }
    if (!request || typeof request.enabled !== 'boolean' || request.expected_enabled !== enabled) {
      throw new Error('App mode changed; check its status and try again');
    }
    if (blocked && !request.enabled) { throw new Error('Save App mode On before enabling the watcher'); }
    var encoded = JSON.stringify({ enabled: request.enabled });
    try {
      storage.setValue(KEY, encoded);
      if (storage.getValue(KEY) !== encoded) { throw new Error('App mode readback failed'); }
      enabled = request.enabled; blocked = false;
    } catch (error) {
      enabled = true; blocked = true; changed();
      throw new Error('Could not confirm App mode was saved. The watcher is stopped for this session; check again before restarting the TV.');
    }
    changed();
    return read();
  }
  return { read: read, change: change };
};
