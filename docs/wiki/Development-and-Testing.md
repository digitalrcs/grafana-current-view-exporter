# Development and testing

Requirements: Node.js 22+, npm, Docker, and Docker Compose.

```bash
npm ci
npm run typecheck
npm run lint
npm run test:ci
npm run build
docker compose up --build -d
npm run e2e
```

The provisioned reviewer dashboard uses only Grafana's built-in TestData datasource and standard Time series, Stat, Bar gauge, and Text panels.

All version-specific dashboard selectors belong in `src/grafana/GrafanaAdapter.ts`. Capture strategies remain behind `PanelCaptureEngine`; avoid coupling the session/state code to Grafana private modules.

See [CONTRIBUTING.md](https://github.com/digitalrcs/grafana-current-view-exporter/blob/main/CONTRIBUTING.md) before opening a pull request.
