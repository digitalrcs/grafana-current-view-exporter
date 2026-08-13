# Troubleshooting

## The panel-menu action is missing

- Confirm the app is installed and enabled for the organization.
- Restart Grafana after installing or replacing plugin files.
- For an unsigned reviewer build, confirm the exact plugin ID is allowlisted.
- Open the panel menu's **Extensions** submenu.

## A panel is not included

Only panels that exist in the current visual dashboard layout are exported. Hidden source panels are not invented from saved dashboard JSON. Use **Capture entire dashboard** to progressively visit lazy visible panels.

## A capture is blank

WebGL drawing buffers, tainted canvases, and cross-origin images may be unreadable to DOM capture. Check whether the panel supports Grafana's screenshot override and include the panel/Grafana version in a bug report.

## The final PNG is scaled down

The measured dashboard exceeded conservative browser canvas limits. The exporter uniformly scales the output to avoid a browser crash.

## A datasource request occurred

Determine whether it was a scheduled auto-refresh, the initial query for a newly materialized lazy panel, a panel remount, or third-party panel behavior. The exporter does not invoke datasource APIs directly.
