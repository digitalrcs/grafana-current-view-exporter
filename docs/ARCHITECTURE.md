# Architecture and verified design decisions

## Target and extension surface

The compatibility target is Grafana 12.4 through 13.x. Grafana's public UI-extension reference exposes the dashboard panel menu but not a dashboard-toolbar action, so the initial entry point is an `AppPlugin.addLink()` registration at `PluginExtensionPoints.DashboardPanelMenu`. Its click handler uses the extension helper's supported `openModal()` facility.

The manifest sets `preload: true` because app plugins otherwise initialize only after a user first opens the app page; a dashboard-level extension must register when Grafana loads.

The panel-menu extension context officially supplies the current panel ID/title/data/time range and, on scenes dashboards, an opaque `panelPathId`. It supplies only basic dashboard identity (`uid`, `title`, `tags`), not a public complete runtime layout model. The implementation therefore does not invent or import a private dashboard model API.

## Official API versus DOM integration

The capture engine uses two ordered strategies:

1. **Grafana screenshot service.** On Grafana 13.1+ scenes dashboards, `getPanelScreenshotService().capture(panelPathId)` is preferred. The installed official type contract says it captures the panel as currently visible and rejects an off-screen/unmounted panel. The service and panel override hook are marked alpha.
2. **DOM fallback.** `html-to-image` captures the existing panel element. All selectors live in `GrafanaAdapter`, allowing Grafana 12.4/13 DOM variants to be updated without changing the state machine or capture engine.

`html-to-image` was selected for the fallback because it handles DOM, SVG, CSS and 2D canvas, returns a compressed Blob, has TypeScript declarations, and matches the default technique documented by Grafana's own screenshot-service type contract. It is dynamically imported only when capture is requested. `cacheBust` is disabled and font embedding is skipped to avoid deliberately creating fresh asset traffic during capture.

It is not assumed to solve WebGL. Grafana 13 introduces an alpha `PanelPlugin.setScreenshotImage()` override specifically for canvas/WebGL panels; third-party panels must opt in. Later phases must add blank/transparent detection and fail explicitly when neither an override nor a readable drawing buffer exists.

For Phase 9 PDF composition, the planned library is `pdf-lib`: it operates entirely in the browser and directly embeds already-compressed PNG/JPEG bytes. It avoids a second HTML rendering stack and supports explicit page sizing/pagination. It is not installed in Phase 3 because no PDF code is shipped yet.

## Panel discovery and progressive traversal

`GrafanaAdapter` recognizes version-isolated panel-root attributes and describes only elements currently materialized in the existing dashboard DOM. It orders descriptors by measured top position, then left position, rather than DOM order.

The complete runtime layout is not available through the panel-menu context. Dashboard capture therefore identifies the closest scrollable dashboard body, saves its position, and visits it from top to bottom with overlapping viewport steps. At each step it discovers newly materialized roots, captures them once by stable scene path/ID, and restores the original position in `finally`.

Panel coordinates are measured relative to the scroll container's content space, not `window.scrollY`. That keeps placement stable as the dashboard moves. Version-specific selectors and scroll-container detection remain isolated in `GrafanaAdapter`.

## Readiness and stability

`ObservablePanelStabilityDetector` uses observable state rather than a primary fixed sleep:

1. Reject if the panel is unmounted or Grafana exposes an error marker.
2. Wait while known adapter loading/query markers exist.
3. Require non-zero rendered dimensions.
4. Observe subtree mutations with `MutationObserver` and dimensions with `ResizeObserver`.
5. After readiness, wait the configurable 400 ms stabilization window.
6. On the next animation frame, compare dimensions, child/text counts, canvas sizes, and SVG structure size.
7. Reset stabilization if the signature changed; otherwise transition to `READY`.

The milestone modal uses a 10-minute timeout. The detector interface already accepts `undefined` for an indefinite wait; the full timeout selector is Phase 10.

## Snapshot storage and bounded composition

Each captured panel is retained as a compressed PNG `Blob`; decoded bitmaps exist only while the final canvas draws that panel and are closed immediately afterward. Composition preserves measured x/y/width/height and fills the dashboard background before drawing.

The final canvas is limited to 16,384 pixels per dimension and 64 million pixels. Oversized layouts are uniformly downscaled, and the UI discloses the resulting percentage. Panel failures are collected without ending the session unless no panel can be captured.

## Lazy panels and the initial-query distinction

The dashboard capture algorithm saves the original scroll position, visits panels in top-to-bottom/left-to-right order, lets normal Grafana intersection/lazy rendering materialize each panel, waits observably, captures immediately into a Blob store, and restores the original viewport in `finally`.

Scrolling a panel that has never been initialized can cause Grafana's normal first query; that is `INITIAL_QUERY`. The exporter will never call the datasource or panel refresh APIs itself. A previously loaded panel that Grafana unmounts and later remounts may or may not reuse cached data. No current public API guarantees zero duplicate queries across every Grafana version/plugin, so `DUPLICATE_QUERY` prevention cannot be honestly guaranteed. The diagnostic suite will measure request timing and report this limitation.

## Zero-requery proof for Phase 3

`tests/capture-no-requery.spec.ts` performs the browser-level proof:

1. Read the provisioned combined dashboard UID.
2. Load it normally and wait for its queries to complete.
3. Open the supported exporter extension for an already-rendered panel.
4. Begin observing `/api/ds/query` requests at the Capture button boundary using Playwright's read-only request events.
5. Capture the panel and require state `CAPTURED`.
6. Assert that capture initiated zero datasource requests.

This instrumentation exists only in tests. Production code does not monkey-patch `fetch`, `XMLHttpRequest`, Grafana services, or datasource behavior.

The shared Grafana 13.1.3 E2E test passes this assertion. A datasource request can still occur while Grafana opens a panel menu or materializes dashboard dependencies; that traffic is measured separately from the capture operation and is not blocked.

## Risks that can defeat zero-requery

- Grafana auto-refresh can legitimately issue a query during a long export. There is no implemented supported pause API yet.
- A version may unmount a previously loaded panel and requery it on remount rather than reuse cached data.
- Third-party panels may issue their own network requests while rendering or when resized/visible.
- Below-viewport panels may be receiving their first normal lazy-load query.
- DOM selector/layout changes can prevent materialization detection on versions not covered by adapters.
- The alpha screenshot service and WebGL override contracts may change before becoming stable.

The exporter must attribute observed traffic by phase and report ambiguity instead of claiming a guarantee that Grafana does not provide.
