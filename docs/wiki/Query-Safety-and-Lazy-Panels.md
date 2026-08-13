# Query safety and lazy panels

## Proven boundary

The E2E suite waits for a visible panel's normal query to complete, begins observing `/api/ds/query`, captures that panel, and requires zero datasource-query requests during the capture action.

## Lazy panels

Grafana can defer panel initialization until it approaches the viewport. Whole-dashboard capture scrolls sequentially so those panels can materialize. Grafana may perform the panel's first normal query at that moment.

The exporter does not:

- call datasource APIs;
- call refresh methods;
- change time ranges or variables;
- reload or clone the dashboard;
- invoke `/render`;
- monkey-patch `fetch` or `XMLHttpRequest` to block traffic.

Some Grafana versions or third-party panels may requery when a component remounts. No supported public API guarantees otherwise, so the plugin documents this limitation instead of claiming an unsafe guarantee.
