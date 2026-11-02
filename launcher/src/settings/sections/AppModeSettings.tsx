import { useEffect, useLayoutEffect, useState } from 'preact/hooks';
import { RemoteControl } from '../components/RemoteControl';
import { useSettingsEnvironment } from '../hooks/useSettingsEnvironment';
import type { AppModeController } from '../types';

export const AppModeSettings = ({ controller, active }: { controller?: AppModeController; active: boolean }) => {
  const [state, setState] = useState(controller?.getSnapshot());
  const { navigation } = useSettingsEnvironment();
  useEffect(() => {
    if (!controller) { return; }
    setState(controller.getSnapshot());
    return controller.subscribe(() => setState(controller.getSnapshot()));
  }, [controller]);
  useEffect(() => {
    if (active && controller) { controller.connect(); controller.checkVetro(); }
  }, [active, controller]);
  useLayoutEffect(() => { navigation.invalidate(); }, [state, navigation]);
  if (!controller || !state) { return null; }
  const disabled = !state.ready || state.busy || !state.persistent || state.home_mode !== 'watcher';
  const status = state.error || (!state.ready ? 'Checking Home behavior…' : state.home_mode !== 'watcher'
    ? 'Restore Native Home through the AeroTizen CLI before changing App mode.' : !state.persistent
      ? 'App mode storage is unavailable. The watcher is off.' : state.blocked
        ? 'The saved setting could not be read. Select On to save App mode before enabling the watcher.'
        : state.busy ? 'Saving…' : state.enabled ? 'AeroTizen opens as an app. Automatic Home takeover is off.' : 'AeroTizen’s HomeWatcher and automatic startup are enabled.');
  return <section aria-label="Home behavior">
    <h3>App mode</h3>
    <p class="hint">On: open AeroTizen like any other app. Off: let AeroTizen return when Samsung Home appears and start automatically.</p>
    <div class="units" role="group" aria-label="App mode">
      {[true, false].map(enabled => <RemoteControl key={String(enabled)} focusKey={'app-mode:' + enabled}
        class={'pill unit' + (state.ready && state.enabled === enabled ? ' on' : '')} role="button"
        aria-pressed={state.ready && state.enabled === enabled} aria-disabled={disabled || state.blocked && !enabled}
        onClick={() => { if (!disabled && (!state.blocked || enabled)) { controller.setEnabled(enabled); } }}>
        {enabled ? 'On (default)' : 'Off'}
      </RemoteControl>)}
    </div>
    <p class="hint" role="status">{status}</p>
    <p class="hint" role="status">{state.warning}</p>
    <RemoteControl focusKey="app-mode:check" class="pill unit" role="button" aria-disabled={state.busy}
      onClick={() => { if (!state.busy) { controller.connect(); controller.checkVetro(); } }}>Check status</RemoteControl>
  </section>;
};
