import * as grafanaRuntime from '@grafana/runtime';
import type { PanelDescriptor } from '../export/types';
import { CaptureEngine } from './CaptureEngine';
import { HtmlCaptureStrategy } from './HtmlCaptureStrategy';

jest.mock('@grafana/runtime', () => ({ getPanelScreenshotService: jest.fn() }));

const panel: PanelDescriptor = {
  id: 1,
  title: 'Panel',
  panelPathId: 'scene/panel-1',
  gridPosition: { x: 0, y: 0, width: 400, height: 200 },
  captureState: 'READY',
};

describe('CaptureEngine', () => {
  test('prefers Grafana screenshot service and does not invoke the DOM fallback', async () => {
    const capture = jest.fn().mockResolvedValue(new Blob(['png'], { type: 'image/png' }));
    (grafanaRuntime.getPanelScreenshotService as jest.Mock).mockReturnValue({ capture });
    const fallback = { capture: jest.fn() } as unknown as HtmlCaptureStrategy;

    const result = await new CaptureEngine(fallback).capture(panel, {
      scale: 1,
      signal: new AbortController().signal,
    });

    expect(result.strategy).toBe('grafana-screenshot-service');
    expect(capture).toHaveBeenCalledWith('scene/panel-1', { format: 'png' });
    expect(fallback.capture).not.toHaveBeenCalled();
  });
});
