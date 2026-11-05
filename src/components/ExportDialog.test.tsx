import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { PluginExtensionPanelContext } from '@grafana/data';
import { CaptureEngine } from '../capture/CaptureEngine';
import { ObservablePanelStabilityDetector } from '../export/PanelStabilityDetector';
import { composePdf } from '../export/PdfComposer';
import { GrafanaAdapter } from '../grafana/GrafanaAdapter';
import ExportDialog from './ExportDialog';

jest.mock('../export/PdfComposer', () => ({ composePdf: jest.fn() }));
jest.mock('@grafana/runtime', () => ({}));
jest.mock('@grafana/ui', () => ({
  Alert: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div role="status" aria-label={title}>
      {children}
    </div>
  ),
  Button: ({ children, onClick, disabled }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  IconButton: ({ tooltip, onClick }: { tooltip: string; onClick: () => void }) => (
    <button onClick={onClick}>{tooltip}</button>
  ),
  Spinner: () => null,
  Modal: { ButtonRow: ({ children }: { children: React.ReactNode }) => <div>{children}</div> },
}));

const context = { id: 1, title: 'Panel', dashboard: { title: 'Dashboard' } } as PluginExtensionPanelContext;

describe('PDF download controls', () => {
  beforeEach(() => {
    jest.mocked(composePdf).mockReset();
    URL.createObjectURL = jest.fn().mockReturnValue('blob:export-test');
    URL.revokeObjectURL = jest.fn();
    jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    jest.spyOn(GrafanaAdapter.prototype, 'discoverDashboardPanels').mockReturnValue([]);
    jest.spyOn(GrafanaAdapter.prototype, 'findPanel').mockReturnValue({
      id: 1,
      title: 'Panel',
      element: document.createElement('section'),
      captureState: 'READY',
      gridPosition: { x: 0, y: 0, width: 400, height: 200 },
    });
    jest
      .spyOn(ObservablePanelStabilityDetector.prototype, 'waitUntilStable')
      .mockResolvedValue({ stableAt: new Date(), signature: '' });
    jest.spyOn(CaptureEngine.prototype, 'capture').mockResolvedValue({
      panelId: 1,
      title: 'Panel',
      width: 400,
      height: 200,
      blob: new Blob(['png']),
      format: 'png',
      gridPosition: { x: 0, y: 0, width: 400, height: 200 },
      capturedAt: new Date(),
      strategy: 'html-to-image',
    });
  });
  afterEach(() => jest.restoreAllMocks());

  async function capture() {
    render(<ExportDialog context={context} />);
    fireEvent.click(screen.getByRole('button', { name: 'Capture current panel' }));
    await screen.findByRole('status', { name: 'Capture ready' });
  }

  test('reuses the frozen image and caches the PDF for repeated downloads', async () => {
    jest.mocked(composePdf).mockResolvedValue(new Blob(['pdf'], { type: 'application/pdf' }));
    await capture();
    fireEvent.click(screen.getByRole('button', { name: 'Download PDF' }));
    await waitFor(() => expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: 'Download PDF' }));
    await waitFor(() => expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(2));
    expect(composePdf).toHaveBeenCalledTimes(1);
    expect(CaptureEngine.prototype.capture).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Download PNG' })).toBeEnabled();
  });

  test('keeps PNG available and allows retry after PDF conversion fails', async () => {
    jest
      .mocked(composePdf)
      .mockRejectedValueOnce(new Error('Conversion failed'))
      .mockResolvedValueOnce(new Blob(['pdf']));
    await capture();
    fireEvent.click(screen.getByRole('button', { name: 'Download PDF' }));
    await screen.findByRole('status', { name: 'PDF creation failed' });
    fireEvent.click(screen.getByRole('button', { name: 'Download PNG' }));
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Download PDF' }));
    await waitFor(() => expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(2));
    expect(CaptureEngine.prototype.capture).toHaveBeenCalledTimes(1);
  });

  test('cancels PDF work without downloading or discarding the PNG', async () => {
    jest.mocked(composePdf).mockImplementation(
      ({ signal }) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
        })
    );
    await capture();
    fireEvent.click(screen.getByRole('button', { name: 'Download PDF' }));
    await waitFor(() => expect(composePdf).toHaveBeenCalledTimes(1));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Cancel PDF' }));
    });
    expect(jest.mocked(composePdf).mock.calls[0][0].signal.aborted).toBe(true);
    expect(HTMLAnchorElement.prototype.click).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Download PNG' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Download PDF' })).toBeEnabled();
    expect(screen.queryByRole('status', { name: 'PDF creation failed' })).not.toBeInTheDocument();
  });
});
