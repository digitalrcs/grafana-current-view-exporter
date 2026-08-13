export type PanelCaptureStatus =
  | 'DISCOVERED'
  | 'WAITING_FOR_VISIBILITY'
  | 'MATERIALIZING'
  | 'QUERY_RUNNING'
  | 'RENDERING'
  | 'STABILIZING'
  | 'READY'
  | 'CAPTURING'
  | 'CAPTURED'
  | 'FAILED'
  | 'TIMEOUT'
  | 'SKIPPED';

export interface GridPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PanelDescriptor {
  id: string | number;
  title: string;
  element?: HTMLElement;
  gridPosition: GridPosition;
  captureState: PanelCaptureStatus;
  panelPathId?: string;
  wasLoadedAtSessionStart?: boolean;
}

export interface CaptureOptions {
  scale: number;
  backgroundColor?: string;
  signal: AbortSignal;
}

export interface CapturedPanel {
  panelId: string | number;
  title: string;
  width: number;
  height: number;
  blob: Blob;
  format: 'png';
  gridPosition: GridPosition;
  capturedAt: Date;
  strategy: 'grafana-screenshot-service' | 'html-to-image';
}

export interface PanelCaptureFailure {
  panelId: string | number;
  title: string;
  message: string;
}

export interface DashboardCaptureProgress {
  state: PanelCaptureStatus;
  discoveredPanels: number;
  capturedPanels: number;
  failedPanels: number;
  currentPanel?: string;
}

export interface DashboardCaptureResult {
  blob: Blob;
  width: number;
  height: number;
  outputScale: number;
  panelCount: number;
  snapshotBytes: number;
  failures: PanelCaptureFailure[];
}

export interface PanelCaptureEngine {
  capture(panel: PanelDescriptor, options: CaptureOptions): Promise<CapturedPanel>;
}

export interface StabilityOptions {
  stabilizationMs: number;
  timeoutMs?: number;
}

export interface PanelStabilityResult {
  stableAt: Date;
  signature: string;
}

export interface PanelStabilityDetector {
  waitUntilStable(
    panel: PanelDescriptor,
    options: StabilityOptions,
    signal: AbortSignal
  ): Promise<PanelStabilityResult>;
}
