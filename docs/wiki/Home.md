# Grafana Current View Exporter

Grafana Current View Exporter creates a PNG from the dashboard visual state already present in the user's browser session.

It is designed for dashboards whose datasource queries are expensive or slow. Capturing an already-rendered panel does not call Grafana render endpoints, reload the dashboard, refresh it, or invoke datasource APIs directly.

![Compact dashboard export controls](https://raw.githubusercontent.com/digitalrcs/grafana-current-view-exporter/main/src/img/export-dialog-compact.png)

## Start here

- [Installation](Installation)
- [Using the exporter](Using-the-Exporter)
- [How browser-local capture works](How-Browser-Local-Capture-Works)
- [Query safety and lazy panels](Query-Safety-and-Lazy-Panels)
- [Compatibility and limitations](Compatibility-and-Limitations)
- [Development and testing](Development-and-Testing)
- [Grafana catalog and signing](Grafana-Catalog-and-Signing)
- [Troubleshooting](Troubleshooting)

## Privacy

All dashboard capture and image composition occurs locally in the browser. The plugin has no backend, telemetry, cloud upload, CDN, or external rendering service.

Plugin ID: `digitalrcs-currentviewexporter-app`  
License: Apache-2.0  
Source: <https://github.com/digitalrcs/grafana-current-view-exporter>
