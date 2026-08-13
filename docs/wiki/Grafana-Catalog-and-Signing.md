# Grafana catalog and signing

The project requests the free **Community** classification. It is Apache-2.0, public, open source, non-commercial, testable without external services, and contains no telemetry.

For a first public submission:

1. Publish the unsigned, provenance-attested GitHub release archive.
2. Sign in to Grafana Cloud as the `digitalrcs` organization administrator.
3. Open **Org Settings > My Plugins > Submit New Plugin**.
4. Submit the release ZIP URL, SHA1, tagged source URL, and reviewer guidance.

Grafana reviews public plugins before granting a signature level. After Community approval, create a `plugins:write` access-policy token, save it only as the GitHub secret `GRAFANA_ACCESS_POLICY_TOKEN`, enable the repository variable `GRAFANA_PUBLIC_SIGNING_ENABLED`, and tag the next release.

See the repository's [catalog submission guide](https://github.com/digitalrcs/grafana-current-view-exporter/blob/main/docs/CATALOG_SUBMISSION.md) for form-ready text.
