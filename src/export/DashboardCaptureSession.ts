import { CaptureEngine } from '../capture/CaptureEngine';
import { GrafanaAdapter } from '../grafana/GrafanaAdapter';
import { throwIfAborted } from '../utils/Abort';
import { DashboardImageComposer } from './DashboardImageComposer';
import { ObservablePanelStabilityDetector } from './PanelStabilityDetector';
import { PanelSnapshotStore } from './PanelSnapshotStore';
import type { DashboardCaptureProgress, DashboardCaptureResult, PanelCaptureFailure, PanelDescriptor } from './types';

const STABILIZATION_MS = 400;
const PANEL_TIMEOUT_MS = 10 * 60 * 1000;
const SCROLL_OVERLAP = 0.25;
const MAX_SCROLL_STEPS = 1_000;

function panelKey(panel: PanelDescriptor): string {
  return panel.panelPathId ?? String(panel.id);
}

function afterNextPaint(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}

function waitForMaterialization(root: HTMLElement, signal: AbortSignal): Promise<void> {
  throwIfAborted(signal);
  return new Promise((resolve, reject) => {
    let quietTimer: ReturnType<typeof setTimeout>;
    let limitTimer: ReturnType<typeof setTimeout>;

    const cleanup = () => {
      observer.disconnect();
      clearTimeout(quietTimer);
      clearTimeout(limitTimer);
      signal.removeEventListener('abort', onAbort);
    };
    const finish = () => {
      cleanup();
      resolve();
    };
    const onAbort = () => {
      cleanup();
      reject(signal.reason instanceof Error ? signal.reason : new DOMException('Aborted', 'AbortError'));
    };
    const scheduleQuietWindow = () => {
      clearTimeout(quietTimer);
      quietTimer = setTimeout(finish, 100);
    };
    const observer = new MutationObserver(scheduleQuietWindow);
    observer.observe(root, { childList: true, subtree: true });
    signal.addEventListener('abort', onAbort, { once: true });
    limitTimer = setTimeout(finish, 2_000);
    requestAnimationFrame(scheduleQuietWindow);
  });
}

export class DashboardCaptureSession {
  constructor(
    private readonly adapter: GrafanaAdapter,
    private readonly captureEngine = new CaptureEngine(),
    private readonly stabilityDetector = new ObservablePanelStabilityDetector(adapter),
    private readonly composer = new DashboardImageComposer()
  ) {}

  async capture(options: {
    signal: AbortSignal;
    backgroundColor: string;
    onProgress?: (progress: DashboardCaptureProgress) => void;
  }): Promise<DashboardCaptureResult> {
    const { signal, onProgress } = options;
    throwIfAborted(signal);
    const scrollContainer = this.adapter.findDashboardScrollContainer();
    if (!scrollContainer) {
      throw new Error('The dashboard scroll container could not be identified.');
    }

    const originalScrollTop = scrollContainer.scrollTop;
    const originalScrollLeft = scrollContainer.scrollLeft;
    const snapshots = new PanelSnapshotStore();
    const failures: PanelCaptureFailure[] = [];
    const failedKeys = new Set<string>();
    const discoveredKeys = new Set<string>();
    let snapshotBytes = 0;

    const emit = (state: DashboardCaptureProgress['state'], currentPanel?: string) => {
      onProgress?.({
        state,
        discoveredPanels: discoveredKeys.size,
        capturedPanels: snapshots.size,
        failedPanels: failures.length,
        currentPanel,
      });
    };

    try {
      let targetScrollTop = 0;
      let previousScrollTop = -1;
      for (let step = 0; step < MAX_SCROLL_STEPS; step++) {
        throwIfAborted(signal);
        scrollContainer.scrollTo({ top: targetScrollTop, left: originalScrollLeft, behavior: 'auto' });
        await waitForMaterialization(scrollContainer, signal);
        throwIfAborted(signal);

        const panels = this.adapter.discoverMaterializedPanels(document, scrollContainer);
        panels.forEach((panel) => discoveredKeys.add(panelKey(panel)));
        emit('MATERIALIZING');

        for (const panel of panels) {
          const key = panelKey(panel);
          if (snapshots.has(key) || failedKeys.has(key)) {
            continue;
          }

          try {
            emit('STABILIZING', panel.title);
            await this.stabilityDetector.waitUntilStable(
              panel,
              { stabilizationMs: STABILIZATION_MS, timeoutMs: PANEL_TIMEOUT_MS },
              signal
            );
            throwIfAborted(signal);
            if (!panel.element) {
              throw new Error(`Panel ${panel.id} was unmounted before capture.`);
            }
            panel.gridPosition = this.adapter.getPanelGridPosition(panel.element, scrollContainer);
            panel.captureState = 'CAPTURING';
            emit('CAPTURING', panel.title);
            const captured = await this.captureEngine.capture(panel, { scale: 1, signal });
            snapshots.add(key, captured);
            panel.captureState = 'CAPTURED';
            emit('CAPTURING', panel.title);
          } catch (error) {
            if (signal.aborted) {
              throw error;
            }
            failedKeys.add(key);
            panel.captureState = 'FAILED';
            failures.push({
              panelId: panel.id,
              title: panel.title,
              message: error instanceof Error ? error.message : 'Panel capture failed.',
            });
            emit('FAILED', panel.title);
          }
        }

        const maxScrollTop = Math.max(0, scrollContainer.scrollHeight - scrollContainer.clientHeight);
        const currentScrollTop = scrollContainer.scrollTop;
        if (step > 0 && currentScrollTop <= previousScrollTop + 1) {
          break;
        }
        if (currentScrollTop >= maxScrollTop - 1) {
          break;
        }
        const increment = Math.max(1, Math.floor(scrollContainer.clientHeight * (1 - SCROLL_OVERLAP)));
        const nextScrollTop = Math.min(maxScrollTop, currentScrollTop + increment);
        if (nextScrollTop <= currentScrollTop) {
          break;
        }
        previousScrollTop = currentScrollTop;
        targetScrollTop = nextScrollTop;
      }
    } finally {
      scrollContainer.scrollTo({ top: originalScrollTop, left: originalScrollLeft, behavior: 'auto' });
      await afterNextPaint();
    }

    throwIfAborted(signal);
    if (snapshots.size === 0) {
      throw new Error(failures[0]?.message ?? 'No dashboard panels could be captured.');
    }

    snapshotBytes = snapshots.totalBytes;
    emit('RENDERING');
    try {
      const image = await this.composer.compose(snapshots.values(), {
        backgroundColor: options.backgroundColor,
        signal,
      });
      emit('CAPTURED');
      return {
        blob: image.blob,
        width: image.width,
        height: image.height,
        outputScale: image.scale,
        panelCount: snapshots.size,
        snapshotBytes,
        failures,
      };
    } finally {
      snapshots.clear();
    }
  }
}
