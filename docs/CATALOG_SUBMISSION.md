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

## Update the existing review

For this plugin's open review, use [the existing DigitalRCS submission](https://grafana.com/orgs/digitalrcs/plugin-submissions/digitalrcs-currentviewexporter-app), not **Submit New Plugin**.

1. Sign in to **Grafana.com** with the DigitalRCS organization administrator account.
2. Open **My plugins**, select **Grafana Current View Exporter**, and choose **Update submission** as requested by the reviewer.
3. Supply the **new versioned plugin ZIP**, its matching **SHA1 hash**, and the **source URL for the same release tag**. The SHA1 field expects the hash value, not the checksum-file URL.
4. Keep the provisioning and testing guidance current, review the entries, and submit the update.
5. Verify that the submission now references the intended version and archive. A comment in the reviewer discussion is not a replacement for updating the submission fields.

Catalog documentation is packaged from `src/README.md`. Screenshots listed in `src/plugin.json` are copied into `dist/img/` and the release ZIP. Updating only the root GitHub README or posting new URLs in the discussion does not replace the archive already under review. Build, validate, and publish a new version before submitting documentation changes; never overwrite an older release's ZIP with different bytes.

The fields below target **v1.2.3**, which packages the illustrated catalog README and refreshed screenshots. Confirm the release and its validator checks have completed before submitting these URLs.

## First submission (reference only)

Grafana's [signing documentation](https://grafana.com/developers/plugin-tools/publish-a-plugin/sign-a-plugin) says a public plugin does not need to be signed for its first review. Grafana reviews the plugin and grants the public signature level before the author can sign it.

Submit through the Grafana Cloud organization administrator interface:

1. Sign in to Grafana Cloud as an organization administrator.
2. Open **Org Settings > My Plugins**.
3. Select **Submit New Plugin**.
4. Submit the release asset URL, public tagged source URL, release ZIP SHA1, and the testing guidance below.

The [official submission guide](https://grafana.com/developers/plugin-tools/publish-a-plugin/publish-a-plugin) describes the automated validation and manual code/test review.

## Submission fields for v1.2.3

- **Plugin ID:** `digitalrcs-currentviewexporter-app`
- **OS & Architecture:** Single (frontend-only; no binaries)
- **Release:** `https://github.com/digitalrcs/grafana-current-view-exporter/releases/tag/v1.2.3`
- **Plugin ZIP:** `https://github.com/digitalrcs/grafana-current-view-exporter/releases/download/v1.2.3/digitalrcs-currentviewexporter-app-1.2.3.zip`
- **SHA1 file:** `https://github.com/digitalrcs/grafana-current-view-exporter/releases/download/v1.2.3/digitalrcs-currentviewexporter-app-1.2.3.zip.sha1`
- **Source code:** `https://github.com/digitalrcs/grafana-current-view-exporter/tree/v1.2.3`
- **License:** Apache-2.0
- **Provisioning provided:** Yes
- **Signature request:** Community
- **Testing guidance:** Use the text below

### Testing guidance

> This is a frontend-only Grafana App Plugin whose bundled reviewer environment needs no external service or provider credentials. Clone the tagged public source, run `npm ci`, `npm run build`, and `docker compose up --build -d`. Open http://localhost:3005 and sign in with admin/admin. Open Dashboards > Current View Exporter Review. From the Current View Exporter - Time series panel menu, select Extensions > Export current dashboard. Test Capture current panel, then close and reopen the exporter and test Capture dashboard. The latter should report four captured panels, restore the original dashboard scroll position, and download a nonempty PNG. Run `npm run e2e -- tests/capture-no-requery.spec.ts` to verify that capturing an already-rendered panel causes zero additional `/api/ds/query` requests at the capture-button boundary. Image capture and composition run in the browser; the exporter does not upload captured images to an external rendering service. Grafana's normal queries, lazy-panel loading, scheduled refreshes, and panel-asset requests remain possible.

## Catalog updates in v1.2.3

- Expand the catalog README with real screenshots, installation and capture instructions, privacy boundaries, and practical limitations.
- Refresh the screenshot gallery with an actual exported dashboard PNG, compact controls, and a successful four-panel capture.
- Preserve the runtime capture fixes shipped in v1.2.2, update the Help build label, and refresh qs and react-router-dom within existing dependency ranges after security preflight.

## Review fixes included from v1.2.2

- The Grafana dependency is now `>=12.4.0`, with no upper bound.
- Dashboard capture accepts a viewport with no vertical overflow. The adapter selects an ancestor of the dashboard panels, not an unrelated sidebar or dialog scrollbar, and supports document scrolling.
- The app page uses Grafana's supplied title once, followed by three-step instructions and two bundled screenshots.
- To reproduce the capture regression test, open the reviewer dashboard at a 1440 × 1600 viewport so all four panels fit, then select **Capture dashboard**. Expect four captured panels, zero failures, and a nonempty PNG. Repeat at a shorter viewport to exercise progressive scrolling and scroll restoration.

## Validator command

The **Validate published release** workflow runs the authenticated official validator against the public ZIP, SHA1 file, and tagged source when a release is published. Its log is retained as a workflow artifact. It can also be rerun manually with a version tag.

To run the same check locally:

The checked-in `validator-frontend.yaml` skips only `go-sec`: validator v0.49.4 reports an empty Go scan as an error for this frontend-only app. The workflow first rejects any Go source/module files or backend metadata. Dependency, JavaScript, antivirus, metadata, checksum, and provenance analyzers remain enabled. Remove this exception if a Go backend is introduced. Validator output is also checked for explicit errors, because some versions return exit status zero despite reporting errors.

```bash
docker run --pull=always --rm \
  -e GITHUB_TOKEN \
  -v "$PWD/validator-frontend.yaml:/validator-frontend.yaml:ro" \
  grafana/plugin-validator-cli \
  -config /validator-frontend.yaml \
  -checksum https://github.com/digitalrcs/grafana-current-view-exporter/releases/download/v1.2.3/digitalrcs-currentviewexporter-app-1.2.3.zip.sha1 \
  -sourceCodeUri https://github.com/digitalrcs/grafana-current-view-exporter/tree/v1.2.3 \
  https://github.com/digitalrcs/grafana-current-view-exporter/releases/download/v1.2.3/digitalrcs-currentviewexporter-app-1.2.3.zip
```

Set `GITHUB_TOKEN` in the shell without printing it so the provenance analyzer can query GitHub attestations.

## After approval

1. Create a Grafana Cloud access policy token in the `digitalrcs` realm with `plugins:write`.
2. Store it as the GitHub Actions secret `GRAFANA_ACCESS_POLICY_TOKEN`.
3. Set the repository variable `GRAFANA_PUBLIC_SIGNING_ENABLED` to `true`.
4. Tag the approved/follow-up version.
5. Confirm the release ZIP includes a Community `MANIFEST.txt`.

Never place the access-policy token in repository files, plugin metadata, dashboards, browser code, logs, or release artifacts.
