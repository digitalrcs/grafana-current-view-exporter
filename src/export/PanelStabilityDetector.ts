import type {
  PanelDescriptor,
  PanelStabilityDetector,
  PanelStabilityResult,
  StabilityOptions,
} from './types';
import { GrafanaAdapter } from '../grafana/GrafanaAdapter';
import { throwIfAborted } from '../utils/Abort';

export class ObservablePanelStabilityDetector implements PanelStabilityDetector {
  constructor(private readonly adapter: GrafanaAdapter) {}

  waitUntilStable(
    panel: PanelDescriptor,
    options: StabilityOptions,
    signal: AbortSignal
  ): Promise<PanelStabilityResult> {
    throwIfAborted(signal);
    const element = panel.element;
    if (!element) {
      return Promise.reject(new Error(`Panel ${panel.id} is not materialized in the current dashboard DOM.`));
    }

    return new Promise((resolve, reject) => {
      let stableTimer: ReturnType<typeof setTimeout> | undefined;
      let timeoutTimer: ReturnType<typeof setTimeout> | undefined;
      let lastSignature = '';

      const cleanup = () => {
        mutationObserver.disconnect();
        resizeObserver.disconnect();
        if (stableTimer) {
          clearTimeout(stableTimer);
        }
        if (timeoutTimer) {
          clearTimeout(timeoutTimer);
        }
        signal.removeEventListener('abort', onAbort);
      };

      const fail = (error: Error) => {
        cleanup();
        reject(error);
      };

      const onAbort = () => fail(signal.reason instanceof Error ? signal.reason : new DOMException('Aborted', 'AbortError'));

      const scheduleVerification = () => {
        if (!element.isConnected) {
          fail(new Error(`Panel ${panel.id} was unmounted before capture.`));
          return;
        }
        const error = this.adapter.getPanelError(element);
        if (error) {
          fail(new Error(error));
          return;
        }
        const rect = element.getBoundingClientRect();
        if (this.adapter.hasLoadingIndicator(element) || rect.width <= 0 || rect.height <= 0) {
          return;
        }

        panel.captureState = 'STABILIZING';
        lastSignature = this.adapter.getVisualSignature(element);
        if (stableTimer) {
          clearTimeout(stableTimer);
        }
        stableTimer = setTimeout(() => {
          requestAnimationFrame(() => {
            const nextSignature = this.adapter.getVisualSignature(element);
            if (nextSignature !== lastSignature || this.adapter.hasLoadingIndicator(element)) {
              scheduleVerification();
              return;
            }
            panel.captureState = 'READY';
            cleanup();
            resolve({ stableAt: new Date(), signature: nextSignature });
          });
        }, options.stabilizationMs);
      };

      const mutationObserver = new MutationObserver(scheduleVerification);
      const resizeObserver = new ResizeObserver(scheduleVerification);
      mutationObserver.observe(element, { attributes: true, childList: true, characterData: true, subtree: true });
      resizeObserver.observe(element);
      signal.addEventListener('abort', onAbort, { once: true });
      if (options.timeoutMs !== undefined) {
        timeoutTimer = setTimeout(() => fail(new Error(`Panel ${panel.id} timed out before becoming stable.`)), options.timeoutMs);
      }
      requestAnimationFrame(scheduleVerification);
    });
  }
}
