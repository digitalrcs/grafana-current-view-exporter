# Grafana Current View Exporter

Grafana Current View Exporter creates a PNG from the dashboard visual state already present in the user's browser session.

It is designed for dashboards whose datasource queries are expensive or slow. Capturing an already-rendered panel does not call Grafana render endpoints, reload the dashboard, refresh it, or invoke datasource APIs directly.

![Actual four-panel dashboard PNG exported from the bundled Grafana TestData example](https://raw.githubusercontent.com/digitalrcs/grafana-current-view-exporter/main/src/img/export-dashboard-example.png)

Use a single-panel image for a focused finding or a dashboard image for a handover, ticket, or presentation. The image contains the captured panel areas, not Grafana's surrounding navigation or time picker. Expand desired sections, wait for panels to finish rendering, and inspect the downloaded PNG before sharing it.

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

Dashboard capture and image composition run in the browser. The plugin has no backend or telemetry and does not upload captured images to an external rendering service. Normal Grafana, datasource, and panel-asset requests can still occur; browser-local capture is not a guarantee of an offline dashboard.

Plugin ID: `digitalrcs-currentviewexporter-app`  
License: Apache-2.0  
Source: <https://github.com/digitalrcs/grafana-current-view-exporter>
