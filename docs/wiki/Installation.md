# Installation

## From the Grafana catalog

After Community catalog approval, install **Grafana Current View Exporter** from the Grafana plugin catalog and enable the app for your organization.

## Reviewer/development environment

```bash
git clone https://github.com/digitalrcs/grafana-current-view-exporter.git
cd grafana-current-view-exporter
npm ci
npm run build
docker compose up --build -d
```

Open <http://localhost:3005> and sign in with `admin` / `admin`. The stack includes a deterministic TestData dashboard and requires no external credentials.

## Unsigned first-review build

Grafana does not require a public plugin to be signed for its first catalog review. Until Grafana grants the Community signature level, use the release archive only in a development/review instance that explicitly allowlists `digitalrcs-currentviewexporter-app`.

Unsigned plugins are not supported in Grafana Cloud.
