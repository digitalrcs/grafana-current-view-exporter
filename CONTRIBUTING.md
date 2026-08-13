# Contributing

Thank you for helping improve Grafana Current View Exporter.

## Before opening a pull request

1. Open or reference an issue for significant behavior changes.
2. Keep Grafana-specific DOM access inside `GrafanaAdapter`.
3. Do not add render-endpoint calls, datasource calls, query interception, telemetry, or external image services.
4. Preserve cancellation and original-scroll restoration for every capture path.
5. Add tests for behavior changes.

## Local checks

```bash
npm ci
npm run typecheck
npm run lint
npm run test:ci
npm run build
docker compose up --build -d
npm run e2e
```

Use Node.js 22 or later. The official Grafana scaffold supports Windows development through WSL; native Windows npm can run this already-scaffolded repository.

## Pull requests

- Keep commits focused and use clear imperative messages.
- Update `CHANGELOG.md` for user-visible behavior.
- Update compatibility, architecture, and reviewer documentation when changing a version-sensitive surface.
- Do not commit `dist`, test results, Playwright authentication state, secrets, or real dashboard data.

By contributing, you agree that your contribution is licensed under Apache-2.0.
