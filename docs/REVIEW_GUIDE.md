# Grafana reviewer guide

This repository provides a self-contained, credential-free review environment.

## Start the review stack

```bash
npm ci
npm run build
docker compose up --build -d
```

Wait for <http://localhost:3005/api/health>, then sign in at <http://localhost:3005> with `admin` / `admin`.

## Functional review

1. Open **Dashboards > Current View Exporter Review**.
2. Wait for all four built-in panels to finish rendering.
3. Open **Current View Exporter - Time series** panel menu.
4. Select **Extensions > Export current dashboard**.
5. Select **Capture current panel** and confirm a PNG becomes ready.
6. Close and reopen the exporter.
7. Scroll the dashboard to a nonzero position.
8. Select **Capture dashboard**.
9. Confirm the progress report ends with four captured panels and zero failures.
10. Confirm the dashboard returns to the original scroll position.
11. Download the PNG and verify that it contains the Time series, Stat, Bar gauge, and Text panels in dashboard order.

## Query-safety review

Run:

```bash
npm run e2e -- tests/capture-no-requery.spec.ts
```

The first E2E test begins observing `/api/ds/query` requests only after the selected panel has completed its normal query, then requires current-panel capture to produce zero additional datasource-query requests.

The second test verifies progressive whole-dashboard capture, original-scroll restoration, and a nonempty PNG download. It does not claim zero requests during lazy materialization because Grafana may legitimately perform an initial query when a panel first becomes visible.

## Privacy and network behavior

The plugin has no backend and no configured external endpoint. It does not upload images, query data, dashboard metadata, telemetry, or usage information. `html-to-image` is bundled and loaded locally only when the Grafana screenshot service is unavailable.

## Expected warnings

The first-review artifact is unsigned because Grafana grants a public Community signature level only after review. The provided Docker stack explicitly allowlists only `digitalrcs-currentviewexporter-app` for this purpose.
