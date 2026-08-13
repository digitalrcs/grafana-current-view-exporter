import * as grafanaRuntime from '@grafana/runtime';
import type { CaptureOptions, CapturedPanel, PanelCaptureEngine, PanelDescriptor } from '../export/types';
import { throwIfAborted } from '../utils/Abort';
import { HtmlCaptureStrategy } from './HtmlCaptureStrategy';

type RuntimeWithScreenshotService = typeof grafanaRuntime & {
  getPanelScreenshotService?: () => {
    capture(panelPathId: string, options?: { format?: 'png' | 'jpeg' | 'webp' }): Promise<Blob>;
  };
};

export class CaptureEngine implements PanelCaptureEngine {
  constructor(private readonly htmlStrategy = new HtmlCaptureStrategy()) {}

  async capture(panel: PanelDescriptor, options: CaptureOptions): Promise<CapturedPanel> {
    throwIfAborted(options.signal);
    const getService = (grafanaRuntime as RuntimeWithScreenshotService).getPanelScreenshotService;

    if (panel.panelPathId && typeof getService === 'function') {
      try {
        const blob = await getService().capture(panel.panelPathId, { format: 'png' });
        throwIfAborted(options.signal);
        if (blob.size > 0) {
          return {
            panelId: panel.id,
            title: panel.title,
            width: Math.round((panel.element?.getBoundingClientRect().width ?? panel.gridPosition.width) * options.scale),
            height: Math.round((panel.element?.getBoundingClientRect().height ?? panel.gridPosition.height) * options.scale),
            blob,
            format: 'png',
            gridPosition: panel.gridPosition,
            capturedAt: new Date(),
            strategy: 'grafana-screenshot-service',
          };
        }
      } catch (error) {
        // Grafana 13's alpha service can reject unsupported/legacy panels; the isolated DOM fallback remains available.
        if (options.signal.aborted) {
          throw error;
        }
      }
    }

    return this.htmlStrategy.capture(panel, options);
  }
}
