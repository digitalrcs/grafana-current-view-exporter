# Installation

Plugin ID: `digitalrcs-currentviewexporter-app`

## Grafana catalog installation

After Grafana approves and publishes the Community plugin, install **Grafana Current View Exporter** from the Grafana plugin catalog, then enable the app for the Grafana organization.

## Packaged ZIP installation

Grafana verifies plugin signatures in normal production mode. Until the Community signature is granted, use an unsigned archive only in a development/review instance that explicitly allowlists this plugin ID.

1. Download the release ZIP.
2. Verify its published SHA1 checksum.
3. Extract the archive so the plugin directory is:

   ```text
   <grafana plugins directory>/digitalrcs-currentviewexporter-app/
   ```

4. For first-review unsigned builds only, add the exact plugin ID to `allow_loading_unsigned_plugins` or `GF_PLUGINS_ALLOW_LOADING_UNSIGNED_PLUGINS`.
5. Restart Grafana.
6. In **Administration > Plugins and data > Plugins**, locate and enable **Grafana Current View Exporter**.

Do not use the unsigned allowlist for a catalog-approved signed release.

## Repository review environment

Requirements: Docker, Docker Compose, Node.js 22+, and npm.

```bash
npm ci
npm run build
docker compose up --build -d
```

The self-contained stack listens on <http://localhost:3005> and provisions:

- Grafana Enterprise 13.1 by default;
- the unsigned app, explicitly allowlisted for review;
- the app enabled for organization 1;
- a built-in Grafana TestData datasource;
- the **Current View Exporter Review** dashboard.

Sign in with `admin` / `admin`. No external service, credential, or network API is required for the review dashboard.

Stop the stack with:

```bash
docker compose down
```

## Grafana Cloud

Unsigned plugins cannot be installed in Grafana Cloud. Cloud availability begins only after Grafana approves, signs, and lists the Community plugin.
