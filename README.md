# AeroTizen — App mode

A full-screen dashboard for Samsung Tizen TVs. Open **AeroTizen** from the TV’s Apps list to browse your apps, switch inputs, and explore its backgrounds and settings.

**App mode is on by default.** The remote’s Home button follows the TV’s existing configuration, including an existing Vetro launcher. Samsung’s **Autorun Last App** setting can still reopen the last app independently.

In **Settings → Applications → App mode**, select **Off** to enable AeroTizen’s own HomeWatcher and automatic startup. Select **On** to stop them again. The choice is saved on the TV and survives restarts. The original watcher’s model and app limitations still apply.

AeroTizen includes a small local control service so this setting can work across TV restarts. In App mode it does not poll TV/app visibility or launch AeroTizen automatically. This service belongs to AeroTizen; it does not install another Vetro.

If Vetro’s Launcher is enabled, Settings warns you to turn off **Launcher in Vetro** before turning App mode off. Vetro’s manager and root services can stay installed. AeroTizen only reads launcher status from Vetro’s local port 8099; it never changes Vetro settings. An unavailable status check does not mean Vetro is disabled. Leaving both launchers enabled can cause flicker and unexpected Home transitions.

The separate experimental **Native Home** assignment is not changed by this toggle. Restore an existing native assignment with the matching AeroTizen CLI before switching App mode.

![AeroTizen dashboard](docs/screenshots/home.png)

## Features

- Home and All apps views with configurable app cards and ordering.
- HDMI and Live TV selection, plus direct access to Samsung Home.
- Animated backgrounds, weather, date, time, and network indicators.
- Optional Continue Watching and dynamic weather wallpapers.
- Local diagnostic logging; nothing is uploaded automatically.

App identity: `DclHome001.Home`. The display name and icon remain **AeroTizen**.

## Build

Use Node.js 20.19+ or 22.12+ and Python 3.10+:

```sh
git clone --branch feat/manual-app-mode git@github.com:pponce/AeroTizen.git
cd AeroTizen
npm ci
npm run build
python3 tools/build_release.py launcher --output dist/manual-app
python3 tools/check_manual_app.py dist/manual-app/aerotizen-launcher-*.wgt
```

The widget is `dist/manual-app/aerotizen-launcher-2.5.0.wgt`. It is unsigned. Sign this **local file** with your Samsung author/distributor certificate covering your TV, then install it with a compatible Tizen installer. Apps2Samsung can sign a selected local WGT with an existing certificate.

The CLI’s catalog-based launcher installation and update commands select upstream releases. Use the local WGT from this branch for the manual app. Native Home assignment is not part of this app’s setup.

The **Manual app** GitHub Actions workflow runs checks and produces the `AeroTizen-manual-unsigned` artifact. No certificate or TV connection is used for a build.

## Use

Open the app from **Apps**, or pin its tile to Samsung Home. App tiles open the selected app; the dashboard does not bring itself back afterward. Open AeroTizen again when you want to return to it. Its Settings control opens Samsung Home directly.

Physical behavior still depends on the TV model, firmware, and any independently configured startup or Home-button routing. Package and automated checks do not establish hardware compatibility.

## Test

```sh
npm ci
npm run lint
npm run build
npm test
```

Tests cover default App mode, saved watcher opt-in, restart behavior, cancelled launches, storage failures, read-only Vetro detection, native Home coordination, YouTube, Samsung Home, Live TV, and local diagnostic logging. Browser checks are available through `npm run test:browser` after installing Playwright’s Chromium.

## Credits and license

Based on [AeroTizen](https://github.com/helalaou/AeroTizen) by helalaou and its contributors. Original code and attribution remain in the source. See [LICENSE](LICENSE), [contributors](https://github.com/helalaou/AeroTizen/graphs/contributors), and [wallpaper credits](launcher/assets/weather/CREDITS.md).
