import { test, expect } from '@grafana/plugin-e2e';
import { stat } from 'node:fs/promises';
import { join } from 'node:path';

test.setTimeout(60_000);

test('captures all panels when the dashboard fits on screen without scrolling or another query', async ({
  gotoDashboardPage,
  readProvisionedDashboard,
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1600 });
  const dashboard = await readProvisionedDashboard({ fileName: 'current-view-exporter-review.json' });
  const dashboardPage = await gotoDashboardPage({ uid: dashboard.uid });
  await dashboardPage.waitForPanelsQueriesToComplete({ timeout: 30_000 });
  const panels = page.locator('[data-viz-panel-id], [data-viz-panel-key], [data-panelid], [data-panel-id]');
  await expect(panels).toHaveCount(4);
  const overflowingAncestors = await panels.first().evaluate((panel) => {
    let ancestor = panel.parentElement;
    let count = 0;
    while (ancestor) {
      const overflowY = getComputedStyle(ancestor).overflowY;
      if (['auto', 'scroll'].includes(overflowY) && ancestor.scrollHeight > ancestor.clientHeight) {
        count++;
      }
      ancestor = ancestor.parentElement;
    }
    return count;
  });
  expect(overflowingAncestors).toBe(0);
  await dashboardPage
    .getPanelByTitle('Current View Exporter - Time series')
    .clickOnMenuItem('Export current dashboard', { parentItem: 'Extensions' });
  const requests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/ds/query')) {
      requests.push(request.url());
    }
  });
  await page.getByRole('button', { name: 'Capture dashboard' }).click();
  await expect(page.getByTestId('capture-state')).toHaveText('CAPTURED', { timeout: 30_000 });
  await expect(page.getByTestId('dashboard-capture-progress')).toContainText('captured 4; failed 0');
  expect(requests).toHaveLength(0);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PNG' }).click();
  const download = await downloadPromise;
  expect((await stat((await download.path())!)).size).toBeGreaterThan(0);
  if (process.env.EXPORTER_QA_DIR) {
    await page.screenshot({ path: join(process.env.EXPORTER_QA_DIR, 'dashboard-no-scroll.png') });
  }
});

test('captures an already-rendered panel without another datasource query', async ({
  gotoDashboardPage,
  readProvisionedDashboard,
  page,
}) => {
  const dashboard = await readProvisionedDashboard({ fileName: 'current-view-exporter-review.json' });
  const dashboardPage = await gotoDashboardPage({ uid: dashboard.uid });
  await dashboardPage.waitForPanelsQueriesToComplete({ timeout: 30_000 });

  const panel = dashboardPage.getPanelByTitle('Current View Exporter - Time series');
  await panel.clickOnMenuItem('Export current dashboard', { parentItem: 'Extensions' });
  await expect(page.getByTestId('current-view-export-dialog')).toBeVisible();
  await expect(page.getByTestId('capture-help')).toHaveCount(0);
  await page.getByRole('button', { name: 'Help' }).click();
  await expect(page.getByTestId('capture-help')).toContainText('The exporter does not call a render endpoint');
  await page.getByRole('button', { name: 'Hide help' }).click();
  await expect(page.getByTestId('capture-help')).toHaveCount(0);

  const datasourceRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/ds/query')) {
      datasourceRequests.push(request.url());
    }
  });

  await page.getByRole('button', { name: 'Capture current panel' }).click();
  await expect(page.getByTestId('capture-state')).toHaveText('CAPTURED', { timeout: 30_000 });

  expect(datasourceRequests).toHaveLength(0);
});

test('progressively captures the entire dashboard, restores scroll, and downloads PNG', async ({
  gotoDashboardPage,
  readProvisionedDashboard,
  page,
}) => {
  const dashboard = await readProvisionedDashboard({ fileName: 'current-view-exporter-review.json' });
  const dashboardPage = await gotoDashboardPage({ uid: dashboard.uid });
  await dashboardPage.waitForPanelsQueriesToComplete({ timeout: 30_000 });

  const panel = dashboardPage.getPanelByTitle('Current View Exporter - Time series');
  await panel.clickOnMenuItem('Export current dashboard', { parentItem: 'Extensions' });
  await expect(page.getByTestId('current-view-export-dialog')).toBeVisible();

  const scrollContainer = page
    .locator('[data-viz-panel-id], [data-panelid], [data-panel-id], [data-viz-panel-key]')
    .first()
    .locator('xpath=..');
  const originalScrollTop = await scrollContainer.evaluate((panelParent) => {
    let element: HTMLElement | null = panelParent;
    while (element) {
      const overflowY = window.getComputedStyle(element).overflowY;
      if ((overflowY === 'auto' || overflowY === 'scroll') && element.scrollHeight > element.clientHeight) {
        element.scrollTop = Math.min(150, element.scrollHeight - element.clientHeight);
        element.dataset.currentViewExporterTestScrollContainer = 'true';
        return element.scrollTop;
      }
      element = element.parentElement;
    }
    throw new Error('Dashboard scroll container not found from a materialized panel.');
  });
  const dashboardScrollContainer = page.locator('[data-current-view-exporter-test-scroll-container="true"]');

  await page.getByRole('button', { name: 'Capture dashboard' }).click();
  await expect(page.getByTestId('capture-state')).toHaveText('CAPTURED', { timeout: 60_000 });
  await expect(page.getByRole('status', { name: 'PNG ready' })).toContainText('panels');
  await expect.poll(() => dashboardScrollContainer.evaluate((element) => element.scrollTop)).toBe(originalScrollTop);

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PNG' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/Current View Exporter Review\.png$/);
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();
  expect((await stat(downloadPath!)).size).toBeGreaterThan(0);
});
