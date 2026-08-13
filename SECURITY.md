# Security policy

## Supported versions

Security fixes are applied to the latest released version. Affected older versions may be updated when practical.

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability or accidental disclosure of dashboard data.

Use GitHub's **Report a vulnerability** private reporting feature for this repository. Include:

- affected plugin and Grafana versions;
- reproduction steps;
- expected and observed behavior;
- whether dashboard data, images, credentials, or browser state could be exposed;
- any proposed mitigation.

Please allow reasonable time to investigate before public disclosure.

## Security design

- The plugin is frontend-only and has no server process or credential configuration.
- Capture and composition occur locally in the current browser.
- No telemetry, analytics, CDN, cloud upload, or external rendering API is used.
- Filenames are sanitized.
- The plugin does not use `eval`, patch `fetch`/`XMLHttpRequest`, or intercept datasource traffic.
- Release artifacts are built by GitHub Actions with provenance attestation; Community signing is enabled only after Grafana approval.
