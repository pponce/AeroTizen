const {test, expect} = require('@playwright/test');
const {openCategory} = require('./drawer_helpers.cjs');

for (const glass of [false, true]) {
  test(`App mode restores standard behavior and persists without Vetro (${glass ? 'Glass' : 'Classic'})`, async ({page}) => {
    let enabled = true;
    const vetroRequests = [], errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://**/*', route => route.fulfill({contentType: 'application/json', body: '{}'}));
    await page.route('http://127.0.0.1:8099/**', route => {
      vetroRequests.push({method: route.request().method(), url: route.request().url()});
      return route.abort();
    });
    await page.route('http://127.0.0.1:47790/**', route => {
      if (route.request().url().endsWith('/app-mode')) {
        if (route.request().method() === 'POST') {
          const body = JSON.parse(route.request().postData());
          expect(body.expected_enabled).toBe(enabled); enabled = body.enabled;
        }
        return route.fulfill({contentType: 'application/json', body: JSON.stringify({protocol: 1, enabled,
          ready: true, persistent: true, blocked: false, home_mode: 'watcher'})});
      }
      return route.fulfill({contentType: 'application/json', body: '{}'});
    });
    await page.addInitScript(() => {
      window.tizen = {
        ApplicationControl: function () {},
        application: {
          getAppsInfo: done => done([{id: 'test.app', name: 'Test app', packageId: '1234567890'}]),
          launchAppControl() {}, launch(id, done) { done?.(); }
        },
        systeminfo: {getPropertyValue(name, done, fail) { fail?.(); }, addPropertyValueChangeListener() {}}
      };
    });
    async function open() {
      await page.waitForFunction(() => window.AeroTizen?.appMode?.getSnapshot().ready && AeroTizen.settingsUi);
      await page.evaluate(glass => { AeroTizen.settings.glassSettings = glass; AeroTizen.settings.save(); AeroTizen.settingsUi.open(); }, glass);
      await openCategory(page, 'apps');
    }
    await page.goto('/'); await open();
    const on = page.locator('[data-key="app-mode:true"]'), off = page.locator('[data-key="app-mode:false"]');
    await expect(on).toHaveAttribute('aria-pressed', 'true');
    await off.focus(); await page.keyboard.press('Enter');
    await expect(off).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => page.evaluate(() => AeroTizen.config.MANUAL_APP)).toBe(false);
    await page.reload(); await open();
    await expect(off).toHaveAttribute('aria-pressed', 'true');
    await on.focus(); await page.keyboard.press('Enter');
    await expect(on).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => page.evaluate(() => AeroTizen.config.MANUAL_APP)).toBe(true);
    await off.focus(); await page.keyboard.press('Enter');
    await expect(off).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => page.evaluate(() => AeroTizen.config.MANUAL_APP)).toBe(false);
    expect(vetroRequests).toEqual([]);
    expect(errors).toEqual([]);
  });
}
