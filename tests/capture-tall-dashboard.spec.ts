import { test, expect } from '@grafana/plugin-e2e';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

test('captures all 16 lazy panels from a fresh unscrolled dashboard', async ({
  gotoDashboardPage,
  readProvisionedDashboard,
  page,
}) => {
  test.setTimeout(120_000);
  const runtimeErrors: string[] = [];
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 900 });
  const dashboard = await readProvisionedDashboard({ fileName: 'current-view-exporter-tall.json' });
  const dashboardPage = await gotoDashboardPage({ uid: dashboard.uid });
  await expect(page).toHaveURL(new RegExp(`/d/${dashboard.uid}`));
  await expect(page).toHaveTitle(/Current View Exporter Tall Review/);
  const roots = page.locator('[data-viz-panel-id], [data-viz-panel-key], [data-panelid], [data-panel-id]');
  await expect(roots.first().locator('canvas').first()).toBeVisible();
  expect(await roots.count()).toBeLessThan(16);

  const inspectScroll = async () =>
    roots.first().evaluate((panel) => {
      const ancestors = [];
      for (let element: HTMLElement | null = panel.parentElement; element; element = element.parentElement) {
        ancestors.push({
          tag: element.tagName,
          className: element.className,
          overflow: getComputedStyle(element).overflowY,
          scrollTop: element.scrollTop,
          scrollHeight: element.scrollHeight,
          clientHeight: element.clientHeight,
        });
      }
      return ancestors;
    });
  const before = await inspectScroll();
  expect(before.every((ancestor) => ancestor.scrollTop === 0)).toBe(true);
  // No manual scrolling and no wait-for-all-panels helper: offscreen panels must be discovered by the exporter.
  await dashboardPage
    .getPanelByTitle('Tall dashboard panel 01')
    .clickOnMenuItem('Export current dashboard', { parentItem: 'Extensions' });
  await page.getByRole('button', { name: 'Capture dashboard' }).click();
  await expect(page.getByTestId('capture-state')).toHaveText('CAPTURED', { timeout: 100_000 });
  if (process.env.EXPORTER_QA_DIR) {
    await page.screenshot({ path: join(process.env.EXPORTER_QA_DIR, 'tall-dashboard-captured.png') });
  }
  await expect(page.getByTestId('dashboard-capture-progress')).toContainText('Discovered 16; captured 16; failed 0');
  const after = await inspectScroll();
  expect(after.every((ancestor) => ancestor.scrollTop === 0)).toBe(true);

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PNG' }).click();
  const download = await downloadPromise;
  const bytes = await readFile((await download.path())!);
  expect(bytes.subarray(1, 4).toString()).toBe('PNG');
  expect(bytes.readUInt32BE(20)).toBeGreaterThan(2000);
  expect(runtimeErrors).toEqual([]);
  if (process.env.EXPORTER_QA_DIR) {
    await download.saveAs(join(process.env.EXPORTER_QA_DIR, 'tall-dashboard-export.png'));
  }
});
