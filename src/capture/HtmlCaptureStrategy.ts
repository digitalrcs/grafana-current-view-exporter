import type { CaptureOptions, CapturedPanel, PanelDescriptor } from '../export/types';
import { throwIfAborted } from '../utils/Abort';

export class HtmlCaptureStrategy {
  async capture(panel: PanelDescriptor, options: CaptureOptions): Promise<CapturedPanel> {
    throwIfAborted(options.signal);
    if (!panel.element) {
      throw new Error(`Panel ${panel.id} is not materialized in the current dashboard DOM.`);
    }

    // Loaded only after the user starts a capture, keeping the normal Grafana bundle small.
    const { toBlob } = await import('html-to-image');
    throwIfAborted(options.signal);
    const blob = await toBlob(panel.element, {
      backgroundColor: options.backgroundColor,
      cacheBust: false,
      pixelRatio: options.scale,
      skipAutoScale: false,
      skipFonts: true,
    });
    throwIfAborted(options.signal);
    if (!blob || blob.size === 0) {
      throw new Error('The browser returned an empty panel image. Canvas or WebGL content may be unreadable.');
    }

    return {
      panelId: panel.id,
      title: panel.title,
      width: Math.round(panel.element.getBoundingClientRect().width * options.scale),
      height: Math.round(panel.element.getBoundingClientRect().height * options.scale),
      blob,
      format: 'png',
      gridPosition: panel.gridPosition,
      capturedAt: new Date(),
      strategy: 'html-to-image',
    };
  }
}
