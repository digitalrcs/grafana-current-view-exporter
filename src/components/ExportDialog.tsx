import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { PluginExtensionPanelContext } from '@grafana/data';
import { Alert, Button, Modal, Spinner } from '@grafana/ui';
import { CaptureEngine } from '../capture/CaptureEngine';
import { DashboardCaptureSession } from '../export/DashboardCaptureSession';
import { ObservablePanelStabilityDetector } from '../export/PanelStabilityDetector';
import type { DashboardCaptureProgress, PanelCaptureStatus } from '../export/types';
import { GrafanaAdapter } from '../grafana/GrafanaAdapter';
import { PanelDiscovery } from '../grafana/PanelDiscovery';

interface Props {
  context: Readonly<PluginExtensionPanelContext>;
  onDismiss?: () => void;
}

interface ExportResult {
  blob: Blob;
  title: string;
  width: number;
  height: number;
  message: string;
  warning?: string;
}

const STABILIZATION_MS = 400;
const EXPORTER_BUILD = '1.1.0';

function safeFilename(value: string): string {
  const sanitized = value
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
  return `${sanitized || 'grafana-dashboard'}.png`;
}

export default function ExportDialog({ context, onDismiss }: Props) {
  const adapter = useMemo(() => new GrafanaAdapter(), []);
  const panels = useMemo(() => new PanelDiscovery(adapter).discover(context), [adapter, context]);
  const selectedPanel = useMemo(
    () => panels.find((panel) => String(panel.id) === String(context.id)),
    [context.id, panels]
  );
  const controllerRef = useRef<AbortController>();
  const objectUrlRef = useRef<string>();
  const [status, setStatus] = useState<PanelCaptureStatus>('DISCOVERED');
  const [progress, setProgress] = useState<DashboardCaptureProgress>();
  const [result, setResult] = useState<ExportResult>();
  const [error, setError] = useState<string>();

  useEffect(
    () => () => {
      controllerRef.current?.abort();
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    },
    []
  );

  const startCapture = () => {
    const controller = new AbortController();
    controllerRef.current = controller;
    setError(undefined);
    setResult(undefined);
    setProgress(undefined);
    return controller;
  };

  const captureCurrentPanel = async () => {
    const panel = adapter.findPanel(context);
    if (!panel?.element) {
      setError('This panel is not materialized. Use Capture entire dashboard to visit and capture dashboard panels.');
      return;
    }

    const controller = startCapture();
    setStatus('RENDERING');

    try {
      const stability = new ObservablePanelStabilityDetector(adapter);
      await stability.waitUntilStable(
        panel,
        { stabilizationMs: STABILIZATION_MS, timeoutMs: 10 * 60 * 1000 },
        controller.signal
      );
      setStatus('CAPTURING');
      panel.captureState = 'CAPTURING';
      const captured = await new CaptureEngine().capture(panel, {
        scale: 1,
        signal: controller.signal,
      });
      panel.captureState = 'CAPTURED';
      setResult({
        blob: captured.blob,
        title: captured.title,
        width: captured.width,
        height: captured.height,
        message: `${Math.ceil(captured.blob.size / 1024)} KiB, via ${captured.strategy}`,
      });
      setStatus('CAPTURED');
    } catch (captureError) {
      if (controller.signal.aborted) {
        setStatus('SKIPPED');
        return;
      }
      panel.captureState = 'FAILED';
      setStatus('FAILED');
      setError(captureError instanceof Error ? captureError.message : 'Panel capture failed.');
    }
  };

  const captureEntireDashboard = async () => {
    const controller = startCapture();
    setStatus('MATERIALIZING');

    try {
      const session = new DashboardCaptureSession(adapter);
      const captured = await session.capture({
        signal: controller.signal,
        backgroundColor: getComputedStyle(document.body).backgroundColor || '#111217',
        onProgress: (nextProgress) => {
          setProgress(nextProgress);
          setStatus(nextProgress.state);
        },
      });
      const failureWarning = captured.failures.length
        ? `${captured.failures.length} panel${captured.failures.length === 1 ? '' : 's'} could not be captured.`
        : undefined;
      const scaleWarning =
        captured.outputScale < 1
          ? `The final image was scaled to ${Math.round(captured.outputScale * 100)}% to stay within browser canvas limits.`
          : undefined;
      setResult({
        blob: captured.blob,
        title: context.dashboard.title || 'Grafana dashboard',
        width: captured.width,
        height: captured.height,
        message: `${captured.panelCount} panel${captured.panelCount === 1 ? '' : 's'}, ${Math.ceil(captured.blob.size / 1024)} KiB`,
        warning: [failureWarning, scaleWarning].filter(Boolean).join(' ') || undefined,
      });
      setStatus('CAPTURED');
    } catch (captureError) {
      if (controller.signal.aborted) {
        setStatus('SKIPPED');
        setError('Dashboard capture cancelled. The original dashboard scroll position was restored.');
        return;
      }
      setStatus('FAILED');
      setError(captureError instanceof Error ? captureError.message : 'Dashboard capture failed.');
    }
  };

  const download = () => {
    if (!result) {
      return;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }
    const url = URL.createObjectURL(result.blob);
    objectUrlRef.current = url;
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = safeFilename(result.title);
    anchor.click();
    window.setTimeout(() => {
      URL.revokeObjectURL(url);
      if (objectUrlRef.current === url) {
        objectUrlRef.current = undefined;
      }
    }, 0);
  };

  const busy = ['MATERIALIZING', 'QUERY_RUNNING', 'RENDERING', 'STABILIZING', 'CAPTURING'].includes(status);

  return (
    <div data-testid="current-view-export-dialog">
      <p>
        Capture the current panel or progressively visit and compose the entire dashboard. The exporter does not call a
        render endpoint, reload the dashboard, refresh it, or invoke a datasource API directly.
      </p>
      <Alert title="Whole-dashboard query behavior" severity="info">
        Progressive scrolling can materialize lazy panels. Grafana may run an initial query for a panel that this
        browser session had not loaded yet; the exporter does not explicitly requery already-loaded panels.
      </Alert>
      <dl>
        <dt>Materialized panels discovered now</dt>
        <dd>{panels.length}</dd>
        <dt>Current panel</dt>
        <dd>{selectedPanel?.title ?? context.title}</dd>
        <dt>State</dt>
        <dd data-testid="capture-state">{status}</dd>
        <dt>Exporter build</dt>
        <dd>{EXPORTER_BUILD}</dd>
      </dl>
      {progress ? (
        <p data-testid="dashboard-capture-progress">
          Discovered {progress.discoveredPanels}; captured {progress.capturedPanels}; failed {progress.failedPanels}
          {progress.currentPanel ? `; current: ${progress.currentPanel}` : ''}.
        </p>
      ) : null}
      {busy ? <Spinner inline /> : null}
      {error ? (
        <Alert
          title={status === 'SKIPPED' ? 'Capture cancelled' : 'Capture failed'}
          severity={status === 'SKIPPED' ? 'info' : 'error'}
        >
          {error}
        </Alert>
      ) : null}
      {result ? (
        <Alert title="PNG ready" severity="success">
          {result.width} × {result.height}px, {result.message}
          {result.warning ? ` ${result.warning}` : ''}
        </Alert>
      ) : null}
      <Modal.ButtonRow>
        <Button variant="secondary" fill="outline" onClick={onDismiss} disabled={busy}>
          Close
        </Button>
        {busy ? (
          <Button variant="destructive" onClick={() => controllerRef.current?.abort()}>
            Cancel capture
          </Button>
        ) : null}
        {!busy && !result ? (
          <Button variant="secondary" onClick={captureCurrentPanel}>
            Capture current panel
          </Button>
        ) : null}
        {!busy && !result ? <Button onClick={captureEntireDashboard}>Capture entire dashboard</Button> : null}
        {result ? <Button onClick={download}>Download PNG</Button> : null}
      </Modal.ButtonRow>
    </div>
  );
}
