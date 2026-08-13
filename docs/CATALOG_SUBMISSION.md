# Grafana catalog submission and signing

## Requested classification

The intended classification is **Community**:

- source is public;
- license is Apache-2.0;
- the plugin and its runtime dependencies are open source;
- the plugin is not tied to a paid or closed-source service;
- no telemetry, analytics, account, or external rendering service is used;
- the test technology is included in this repository.

Grafana's [plugin policy](https://grafana.com/legal/plugins/) says Community signing is free and requires a public repository plus technology available for testing.

## First submission

Grafana's [signing documentation](https://grafana.com/developers/plugin-tools/publish-a-plugin/sign-a-plugin) says a public plugin does not need to be signed for its first review. Grafana reviews the plugin and grants the public signature level before the author can sign it.

Submit through the Grafana Cloud organization administrator interface:

1. Sign in to Grafana Cloud as an organization administrator.
2. Open **Org Settings > My Plugins**.
3. Select **Submit New Plugin**.
4. Submit the release asset URL, public tagged source URL, release ZIP SHA1, and the testing guidance below.

The [official submission guide](https://grafana.com/developers/plugin-tools/publish-a-plugin/publish-a-plugin) describes the automated validation and manual code/test review.

## Submission fields for v1.1.1

- **Plugin ID:** `digitalrcs-currentviewexporter-app`
- **OS & Architecture:** Single (frontend-only; no binaries)
- **Plugin ZIP:** GitHub release asset named `digitalrcs-currentviewexporter-app-1.1.1.zip`
- **Source code:** `https://github.com/digitalrcs/grafana-current-view-exporter/tree/v1.1.1`
- **License:** Apache-2.0
- **Provisioning provided:** Yes
- **Signature request:** Community
- **Testing guidance:** Use the text below

### Testing guidance

> This is a frontend-only Grafana App Plugin with no external service or credentials. Clone the tagged public source, run `npm ci`, `npm run build`, and `docker compose up --build -d`. Open http://localhost:3005 and sign in with admin/admin. Open Dashboards > Current View Exporter Review. From the Current View Exporter - Time series panel menu, select Extensions > Export current dashboard. Test Capture current panel, then Capture entire dashboard. The latter should report four captured panels, restore the original dashboard scroll position, and download a nonempty PNG. Run `npm run e2e -- tests/capture-no-requery.spec.ts` to verify that capturing an already-rendered panel causes zero additional `/api/ds/query` requests at the capture-button boundary. No dashboard data or image is transmitted outside the browser.

## After approval

1. Create a Grafana Cloud access policy token in the `digitalrcs` realm with `plugins:write`.
2. Store it as the GitHub Actions secret `GRAFANA_ACCESS_POLICY_TOKEN`.
3. Set the repository variable `GRAFANA_PUBLIC_SIGNING_ENABLED` to `true`.
4. Tag the approved/follow-up version.
5. Confirm the release ZIP includes a Community `MANIFEST.txt`.

Never place the access-policy token in repository files, plugin metadata, dashboards, browser code, logs, or release artifacts.
