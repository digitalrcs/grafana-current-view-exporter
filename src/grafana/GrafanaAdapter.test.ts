import type { PluginExtensionPanelContext } from '@grafana/data';
import { GrafanaAdapter } from './GrafanaAdapter';

function setRect(element: HTMLElement, rect: Partial<DOMRect>): void {
  element.getBoundingClientRect = () =>
    ({ x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, toJSON: () => ({}), ...rect }) as DOMRect;
}

describe('GrafanaAdapter', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  test('orders materialized panels by visual position instead of DOM order', () => {
    const lower = document.createElement('section');
    lower.dataset.vizPanelId = '2';
    lower.innerHTML = '<h2>Lower</h2>';
    setRect(lower, { top: 500, left: 0, width: 800, height: 300 });
    const upper = document.createElement('section');
    upper.dataset.vizPanelId = '1';
    upper.innerHTML = '<h2>Upper</h2>';
    setRect(upper, { top: 100, left: 0, width: 800, height: 300 });
    document.body.append(lower, upper);

    expect(new GrafanaAdapter().discoverMaterializedPanels().map((panel) => panel.id)).toEqual(['1', '2']);
  });

  test('falls back to the panel key used by older Grafana versions', () => {
    const main = document.createElement('main');
    const panel = document.createElement('div');
    panel.dataset.vizPanelKey = 'panel-7';
    panel.innerHTML = '<h2>Legacy panel</h2>';
    setRect(panel, { top: 100, left: 20, width: 800, height: 300 });
    main.append(panel);
    document.body.append(main);

    const discovered = new GrafanaAdapter().discoverMaterializedPanels();
    expect(discovered).toHaveLength(1);
    expect(discovered[0].id).toBe('7');
    expect(discovered[0].title).toBe('Legacy panel');
    expect(discovered[0].element).toBe(panel);
  });

  test('uses dashboard scroll-container coordinates for stable composition positions', () => {
    const scrollContainer = document.createElement('main');
    Object.defineProperties(scrollContainer, {
      scrollTop: { value: 400, writable: true },
      scrollLeft: { value: 0, writable: true },
    });
    setRect(scrollContainer, { top: 100, left: 20, width: 900, height: 600 });
    const panel = document.createElement('section');
    panel.dataset.vizPanelId = 'panel-7';
    panel.innerHTML = '<h2>Scrolled panel</h2>';
    setRect(panel, { top: 250, left: 36, width: 880, height: 300 });
    scrollContainer.append(panel);
    document.body.append(scrollContainer);

    const discovered = new GrafanaAdapter().discoverMaterializedPanels(document, scrollContainer);
    expect(discovered[0]).toMatchObject({
      id: '7',
      panelPathId: 'panel-7',
      gridPosition: { x: 16, y: 550, width: 880, height: 300 },
    });
  });

  test('normalizes the Grafana scenes panel-N DOM identity to the numeric extension identity', () => {
    const panel = document.createElement('section');
    panel.dataset.vizPanelId = 'panel-42';
    panel.innerHTML = '<h2>Scenes panel</h2>';
    setRect(panel, { top: 0, left: 0, width: 800, height: 300 });
    document.body.append(panel);

    const context = {
      id: 42,
      title: 'Scenes panel',
      panelPathId: 'panel-42',
      data: { state: 'Done' },
      dashboard: { uid: 'dashboard-1', title: 'Dashboard', tags: [] },
    } as unknown as PluginExtensionPanelContext;

    const discovered = new GrafanaAdapter().discoverDashboardPanels(context);
    expect(discovered).toHaveLength(1);
    expect(discovered[0].id).toBe('42');
    expect(discovered[0].element).toBe(panel);
    expect(discovered[0].panelPathId).toBe('panel-42');
  });

  test('adds extension context for the selected materialized panel', () => {
    const visible = document.createElement('section');
    visible.dataset.vizPanelId = '1';
    visible.innerHTML = '<h2>Visible</h2>';
    setRect(visible, { top: 0, left: 0, width: 800, height: 300 });
    document.body.append(visible);

    const context = {
      id: 1,
      title: 'Visible',
      panelPathId: 'panel-1',
      data: { state: 'Done' },
      dashboard: { uid: 'dashboard-1', title: 'Dashboard', tags: [] },
    } as unknown as PluginExtensionPanelContext;

    const panels = new GrafanaAdapter().discoverDashboardPanels(context);
    expect(panels).toHaveLength(1);
    expect(panels[0]).toMatchObject({ id: '1', panelPathId: 'panel-1', wasLoadedAtSessionStart: true });
  });

  test('uses a unique exact title when Grafana exposes an opaque runtime panel identity', () => {
    const visible = document.createElement('section');
    visible.dataset.vizPanelId = 'runtime/row-a/panel-instance';
    visible.innerHTML = '<h2>DigitalRCS Time Overlay</h2>';
    setRect(visible, { top: 0, left: 0, width: 800, height: 300 });
    document.body.append(visible);

    const context = {
      id: 2,
      title: 'DigitalRCS Time Overlay',
      panelPathId: 'scene/row-a/panel-2',
      data: { state: 'Done' },
      dashboard: { uid: 'dashboard-1', title: 'Dashboard', tags: [] },
    } as unknown as PluginExtensionPanelContext;

    const panels = new GrafanaAdapter().discoverDashboardPanels(context);
    const selected = panels.find((panel) => String(panel.id) === '2');
    expect(selected?.element).toBe(visible);
    expect(selected?.panelPathId).toBe('scene/row-a/panel-2');
  });
});
