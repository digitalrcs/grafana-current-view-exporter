# Changelog

## 1.1.1 - 2026-08-12

- Support Grafana 12.4 and 13.0 panel DOM identities through the legacy `data-viz-panel-key` fallback.
- Prefer modern `data-viz-panel-id` roots when both generations of panel identity are present, preventing duplicate snapshots.
- Make the E2E scroll-restoration assertion follow the actual scrollable panel ancestor across Grafana versions.

## 1.1.0 - 2026-08-12

- Add progressive whole-dashboard capture from the current browser session.
- Preserve layout using dashboard scroll-container coordinates and restore the original viewport in `finally`.
- Retain compressed panel PNG blobs, then compose a bounded final PNG with automatic downscaling for browser canvas limits.
- Continue past individual panel failures and report discovered, captured, and failed panel counts.
- Keep the proven current-panel zero-requery path available alongside the new dashboard action.
- Add a self-contained Grafana TestData reviewer environment, catalog screenshot, public documentation, and Community-submission guidance.

## 1.0.1 - 2026-08-12

- Resolve Grafana scenes panels by normalized ID, scene path, or a unique exact materialized title.
- Display the exporter build in the capture dialog so stale browser bundles are apparent.

## 1.0.0 - 2026-08-12

- Scaffold the Grafana app plugin with official plugin tools.
- Add the supported dashboard panel-menu extension and Grafana-native modal.
- Discover and visually order materialized panels through an isolated adapter.
- Add observable loading, error, resize, mutation, canvas, and SVG stability checks.
- Prefer Grafana 13's alpha panel screenshot service with an `html-to-image` fallback.
- Capture and download one already-rendered panel as a PNG Blob.
- Add unit tests and a browser E2E zero-datasource-request assertion.
- Integrate the plugin into the shared DigitalRCS Grafana 13.1.3 environment on port 3001.
- Normalize Grafana scenes DOM identities such as `panel-2` to panel-menu context ID `2`.
