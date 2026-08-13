# Using the exporter

1. Open the dashboard to export.
2. Wait for the panels you care about to finish rendering.
3. Open any panel menu.
4. Select **Extensions > Export current dashboard**.
5. Choose a capture mode.

## Capture current panel

Captures only the selected, currently materialized panel and prepares a PNG download. This path is E2E-tested to produce zero additional `/api/ds/query` requests after the panel is loaded.

## Capture entire dashboard

Progressively visits the dashboard from top to bottom, captures each materialized panel once, composes a layout-preserving PNG, and restores the original scroll position.

The result reports discovered, captured, and failed panels. One panel failure does not terminate the remaining capture.

## Large dashboards

The exporter stores panel snapshots as compressed PNG blobs. If the final dashboard would exceed conservative browser canvas limits, it is uniformly scaled down and the completion message reports the scale.
