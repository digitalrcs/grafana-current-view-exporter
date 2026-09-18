import type { PluginExtensionPanelContext } from '@grafana/data';
import { GrafanaAdapter } from './GrafanaAdapter';

function setRect(element: HTMLElement, rect: Partial<DOMRect>): void {
  element.getBoundingClientRect = () =>
    ({ x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, toJSON: () => ({}), ...rect }) as DOMRect;
}

describe('GrafanaAdapter', () => {
  afterEach(() => {
    document.body.replaceChildren();
    jest.restoreAllMocks();
  });

  function makeViewport(overflowY: string, scrollHeight: number, clientHeight: number): HTMLElement {
    const viewport = document.createElement('main');
    viewport.style.overflowY = overflowY;
    Object.defineProperties(viewport, {
      scrollHeight: { value: scrollHeight },
      clientHeight: { value: clientHeight },
    });
    document.body.append(viewport);
    return viewport;
  }

  function addPanel(parent: HTMLElement, id: string): HTMLElement {
    const panel = document.createElement('section');
    panel.dataset.vizPanelId = id;
    parent.append(panel);
    return panel;
  }

  test('captures a dashboard that fits its viewport even when the sidebar overflows', () => {
    makeViewport('auto', 2000, 500);
    const dashboard = makeViewport('auto', 600, 600);
    addPanel(dashboard, '1');
    addPanel(dashboard, '2');
    expect(new GrafanaAdapter().findDashboardScrollContainer()).toBe(dashboard);
  });

  test('finds an overflowing dashboard ancestor outside a non-overflowing layout wrapper', () => {
    const dashboard = makeViewport('auto', 2000, 600);
    const wrapper = document.createElement('div');
    wrapper.style.overflowY = 'auto';
    dashboard.append(wrapper);
    addPanel(wrapper, '1');
    expect(new GrafanaAdapter().findDashboardScrollContainer()).toBe(dashboard);
  });

  test('ignores scrolling regions that do not contain every dashboard panel', () => {
    const dashboard = makeViewport('auto', 3000, 600);
    const nested = makeViewport('auto', 1000, 200);
    dashboard.append(nested);
    addPanel(nested, '1');
    addPanel(dashboard, '2');
    expect(new GrafanaAdapter().findDashboardScrollContainer()).toBe(dashboard);
  });

  test('falls back to the document for a layout without a CSS scrolling ancestor', () => {
    makeViewport('auto', 2000, 500);
    addPanel(document.body, '1');
    expect(new GrafanaAdapter().findDashboardScrollContainer()).toBe(
      document.scrollingElement ?? document.documentElement
    );
  });

  test('does not treat an unrelated scrollbar as a dashboard when no panels exist', () => {
    makeViewport('auto', 2000, 500);
    expect(new GrafanaAdapter().findDashboardScrollContainer()).toBeUndefined();
  });

  test('counts document scrolling only once in panel coordinates', () => {
    const scroller = document.documentElement;
    Object.defineProperty(document, 'scrollingElement', { configurable: true, get: () => scroller });
    jest.replaceProperty(window, 'scrollY', 400);
    jest.spyOn(scroller, 'getBoundingClientRect').mockReturnValue({ top: -400 } as DOMRect);
    const panel = addPanel(document.body, '1');
    setRect(panel, { top: 100, left: 20, width: 800, height: 300 });
    expect(new GrafanaAdapter().getPanelGridPosition(panel, scroller)).toEqual({
      x: 20,
      y: 500,
      width: 800,
      height: 300,
    });
    Reflect.deleteProperty(document, 'scrollingElement');
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
