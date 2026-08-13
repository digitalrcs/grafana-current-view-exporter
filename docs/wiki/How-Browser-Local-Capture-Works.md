# How browser-local capture works

The exporter uses the visual representation already owned by the current Grafana page.

1. A supported panel-menu extension opens the exporter modal.
2. `GrafanaAdapter` discovers panel roots and measures them in dashboard scroll-container coordinates.
3. `PanelStabilityDetector` observes loading markers, DOM mutations, dimensions, canvas sizes, and SVG structure.
4. `CaptureEngine` prefers Grafana's panel screenshot service when the dashboard supplies a scene panel path.
5. The isolated `html-to-image` fallback captures compatible DOM/SVG/2D-canvas panels.
6. `PanelSnapshotStore` retains compressed PNG blobs even if Grafana later virtualizes a panel.
7. `DashboardImageComposer` reconstructs the measured layout inside bounded canvas limits.
8. The dashboard's original scroll position is restored in `finally`, including cancellation/failure paths.

The plugin never opens a second browser, iframe, or render session.
