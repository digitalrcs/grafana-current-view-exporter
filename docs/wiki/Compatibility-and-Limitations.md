# Compatibility and limitations

## Grafana

- Declared range: `>=12.4.0 <14.0.0`
- Grafana 13 scenes: prefers the panel screenshot service
- Grafana 12.4 and unsupported panels: isolated `html-to-image` fallback

## Implemented

- Current-panel PNG
- Entire-dashboard PNG
- Progressive scrolling
- Layout-preserving bounded composition
- Cancellation and scroll restoration
- Per-panel failure continuation

## Not yet implemented

- JPEG
- PDF and pagination
- WebGL blank-image detection
- Auto-refresh pause/change diagnostics
- Toolbar-level extension entry point

WebGL, cross-origin images, and tainted canvases may be unavailable to DOM capture. Grafana's screenshot service or a panel-provided screenshot override is the preferred path for those surfaces.
