import { CaptureEngine } from '../capture/CaptureEngine';
import { GrafanaAdapter } from '../grafana/GrafanaAdapter';
import { DashboardCaptureSession } from './DashboardCaptureSession';
import { DashboardImageComposer } from './DashboardImageComposer';
import { ObservablePanelStabilityDetector } from './PanelStabilityDetector';
import type { PanelDescriptor } from './types';

describe('DashboardCaptureSession traversal', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  function setup(stalled: boolean, height = 2000) {
    const viewport = document.createElement('main');
    Object.defineProperties(viewport, {
      scrollHeight: { value: height },
      clientHeight: { value: 600 },
    });
    viewport.scrollTop = 150;
    viewport.scrollLeft = 12;
    viewport.scrollTo = jest.fn((options?: ScrollToOptions | number, y?: number) => {
      const position = typeof options === 'number' ? { left: options, top: y } : (options ?? {});
      if (!stalled) {
        viewport.scrollTop = position.top ?? 0;
        viewport.scrollLeft = position.left ?? 0;
      }
    });
    const panel: PanelDescriptor = {
      id: '1',
      title: 'Panel',
      element: document.createElement('section'),
      captureState: 'DISCOVERED',
      gridPosition: { x: 0, y: 0, width: 800, height: 300 },
    };
    const adapter = new GrafanaAdapter();
    jest.spyOn(adapter, 'findDashboardScrollContainer').mockReturnValue(viewport);
    jest.spyOn(adapter, 'discoverMaterializedPanels').mockReturnValue([panel]);
    jest.spyOn(adapter, 'isPanelInViewport').mockReturnValue(true);
    jest.spyOn(adapter, 'getPanelGridPosition').mockReturnValue(panel.gridPosition);
    const engine = new CaptureEngine();
    jest.spyOn(engine, 'capture').mockResolvedValue({
      panelId: '1',
      title: 'Panel',
      width: 800,
      height: 300,
      blob: new Blob(['png']),
      format: 'png',
      gridPosition: panel.gridPosition,
      capturedAt: new Date(),
      strategy: 'html-to-image',
    });
    const stability = new ObservablePanelStabilityDetector(adapter);
    jest.spyOn(stability, 'waitUntilStable').mockResolvedValue({ stableAt: new Date(), signature: '' });
    const composer = new DashboardImageComposer();
    const compose = jest.spyOn(composer, 'compose').mockResolvedValue({
      blob: new Blob(['png']),
      width: 800,
      height: 300,
      scale: 1,
      minX: 0,
      minY: 0,
    });
    return {
      session: new DashboardCaptureSession(adapter, engine, stability, composer),
      viewport,
      compose,
      adapter,
      engine,
    };
  }

  test('rejects stalled scrolling instead of composing a misleading partial image', async () => {
    const { session, viewport, compose } = setup(true);
    const onProgress = jest.fn();
    const capture = session.capture({ signal: new AbortController().signal, backgroundColor: '#000', onProgress });
    const rejected = expect(capture).rejects.toThrow('Capture is incomplete');
    await jest.runAllTimersAsync();
    await rejected;
    expect(compose).not.toHaveBeenCalled();
    expect(onProgress.mock.calls.some(([progress]) => progress.state === 'CAPTURED')).toBe(false);
    expect(viewport.scrollTo).toHaveBeenLastCalledWith({ top: 150, left: 12, behavior: 'auto' });
  });

  test('composes only after reaching the bottom and restores both scroll coordinates', async () => {
    const { session, viewport, compose } = setup(false);
    const capture = session.capture({ signal: new AbortController().signal, backgroundColor: '#000' });
    await jest.runAllTimersAsync();
    await expect(capture).resolves.toMatchObject({ panelCount: 1, failures: [] });
    expect(viewport.scrollTo).toHaveBeenCalledWith({ top: 1400, left: 12, behavior: 'auto' });
    expect(compose).toHaveBeenCalledTimes(1);
    expect(viewport.scrollTop).toBe(150);
    expect(viewport.scrollLeft).toBe(12);
  });

  test('allows a one-pass dashboard that fits the viewport', async () => {
    const { session, compose } = setup(false, 600);
    const capture = session.capture({ signal: new AbortController().signal, backgroundColor: '#000' });
    await jest.runAllTimersAsync();
    await expect(capture).resolves.toMatchObject({ panelCount: 1 });
    expect(compose).toHaveBeenCalledTimes(1);
  });

  test('defers offscreen shells until scrolling brings them into the viewport', async () => {
    const { session, viewport, adapter, engine } = setup(false);
    jest.mocked(adapter.isPanelInViewport).mockImplementation(() => viewport.scrollTop >= 450);
    const capture = session.capture({ signal: new AbortController().signal, backgroundColor: '#000' });
    await jest.advanceTimersByTimeAsync(140);
    expect(engine.capture).not.toHaveBeenCalled();
    await jest.runAllTimersAsync();
    await expect(capture).resolves.toMatchObject({ panelCount: 1 });
    expect(engine.capture).toHaveBeenCalledTimes(1);
  });

  test('rejects incomplete capture when a discovered shell never becomes visible', async () => {
    const { session, adapter, compose } = setup(false);
    jest.mocked(adapter.isPanelInViewport).mockReturnValue(false);
    const capture = session.capture({ signal: new AbortController().signal, backgroundColor: '#000' });
    const rejected = expect(capture).rejects.toThrow('Some discovered panels never became visible');
    await jest.runAllTimersAsync();
    await rejected;
    expect(compose).not.toHaveBeenCalled();
  });
});
