# Grafana Current View Exporter

Export the dashboard currently shown in your Grafana browser session as a PNG without calling Grafana render endpoints, reloading the dashboard, or deliberately refreshing datasource queries.

![Completed whole-dashboard PNG capture](https://raw.githubusercontent.com/digitalrcs/grafana-current-view-exporter/main/src/img/export-entire-dashboard.png)

## What it does

- Captures the current rendered panel or progressively captures the entire visible dashboard.
- Preserves measured panel layout and restores the original dashboard scroll position.
- Uses compressed browser-local PNG snapshots and bounded final-image composition.
- Reports panel failures without terminating the remaining export.
- Has no backend, telemetry, cloud upload, CDN, or external rendering service.

## Use

1. Wait for the dashboard panels to finish rendering.
2. Open any panel menu.
3. Select **Extensions > Export current dashboard**.
4. Choose **Capture current panel** or **Capture dashboard**. Use the help icon for capture behavior and status details.
5. Download the PNG.

Progressive scrolling may cause Grafana's normal first query for a lazy panel that was never materialized in this browser session. The exporter never calls datasource APIs directly. Capture of an already-rendered panel is E2E-tested to cause zero `/api/ds/query` requests at the capture-button boundary.

## Compatibility and limitations

- Grafana `>=12.4.0 <14.0.0`
- PNG is implemented; JPEG and PDF are planned.
- WebGL capture depends on Grafana's screenshot service or a panel-provided override.
- Auto-refresh is not paused; avoid a scheduled refresh when strict snapshot consistency is required.

All capture and image generation occurs locally in the browser. No dashboard data is transmitted to an external rendering service.

Full documentation, installation instructions, architecture notes, and reviewer guidance are available in the [source repository](https://github.com/digitalrcs/grafana-current-view-exporter) and [wiki](https://github.com/digitalrcs/grafana-current-view-exporter/wiki).

Apache-2.0. Copyright 2026 DigitalRCS.
