import { test, expect } from '@grafana/plugin-e2e';
import { join } from 'node:path';

for (const viewport of [
  { width: 1440, height: 1100 },
  { width: 390, height: 844 },
]) {
  test(`app guide shows instructions and local screenshots at ${viewport.width}px`, async ({ gotoAppPage, page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.setViewportSize(viewport);
    await gotoAppPage({ pluginId: 'digitalrcs-currentviewexporter-app' });
    await expect(page).toHaveURL(/\/a\/digitalrcs-currentviewexporter-app\/?/);
    await expect(page).toHaveTitle(/Grafana Current View Exporter/);
    await expect(page.getByRole('heading', { name: 'Grafana Current View Exporter', exact: true })).toHaveCount(1);
    const guide = page.getByTestId('exporter-guide');
    await expect(guide.getByRole('heading', { name: 'Export a dashboard in three steps' })).toBeVisible();
    await expect(guide.getByRole('heading', { name: 'Grafana Current View Exporter' })).toHaveCount(0);
    await expect(guide.getByRole('listitem')).toHaveCount(3);
    const images = guide.getByRole('img');
    await expect(images).toHaveCount(2);
    for (const image of await images.all()) {
      await expect
        .poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0))
        .toBe(true);
    }
    expect(await guide.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
    expect(errors).toEqual([]);
    if (process.env.EXPORTER_QA_DIR) {
      await page.screenshot({
        path: join(process.env.EXPORTER_QA_DIR, `app-guide-${viewport.width}.png`),
        fullPage: true,
      });
    }
    // Grafana must resolve the same navigation heading with or without a trailing slash.
    await gotoAppPage({ pluginId: 'digitalrcs-currentviewexporter-app', path: '/' });
    await expect(page).toHaveTitle(/Grafana Current View Exporter/);
    await expect(page.getByRole('heading', { name: 'Grafana Current View Exporter', exact: true })).toHaveCount(1);
    await expect(guide).toBeVisible();
    expect(errors).toEqual([]);
  });
}
