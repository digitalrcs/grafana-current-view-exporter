import { test, expect } from '@grafana/plugin-e2e';
import { stat } from 'node:fs/promises';

test.setTimeout(60_000);

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

  if (process.env.CAPTURE_CATALOG_SCREENSHOT === '1') {
    await page.getByRole('dialog', { name: 'Export Current Dashboard' }).screenshot({
      path: 'src/img/export-entire-dashboard.png',
    });
  }

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PNG' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/Current View Exporter Review\.png$/);
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();
  expect((await stat(downloadPath!)).size).toBeGreaterThan(0);
});
