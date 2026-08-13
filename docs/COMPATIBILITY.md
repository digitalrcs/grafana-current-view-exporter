# Compatibility

## Declared range

`digitalrcs-currentviewexporter-app` declares Grafana `>=12.4.0 <14.0.0`.

The upper bound is intentional: dashboard DOM structure and the Grafana 13 screenshot service are version-sensitive integration surfaces. Grafana 14 should be tested before widening the range.

## Capture paths

| Environment                                | Preferred path                                           | Fallback               |
| ------------------------------------------ | -------------------------------------------------------- | ---------------------- |
| Grafana 13 scenes panel with `panelPathId` | Grafana panel screenshot service                         | `html-to-image`        |
| Grafana 12.4 or legacy panel               | `html-to-image`                                          | explicit panel failure |
| SVG and 2D canvas panels                   | screenshot service or DOM capture                        | explicit panel failure |
| WebGL panels                               | screenshot service or panel-provided screenshot override | not guaranteed         |

All Grafana-specific DOM selectors and scroll-container logic are isolated in `GrafanaAdapter`.

## Automated coverage

The repository runs:

- TypeScript strict typechecking;
- ESLint;
- Jest unit tests for adapter identity/layout, snapshot storage, capture strategy selection, and bounded composition;
- Grafana Plugin E2E for current-panel zero-requery behavior;
- Grafana Plugin E2E for whole-dashboard capture, scroll restoration, and a nonempty PNG download;
- Grafana API compatibility checks and the official plugin validator in GitHub Actions.

The self-contained dashboard exercises Grafana Time series, Stat, Bar gauge, and Text panels using the built-in TestData datasource.

## Known limitations

- PNG is the only implemented output format in the current release.
- Browser canvas limits vary. The exporter conservatively limits the final image to 16,384 pixels per dimension and 64 million pixels, scaling uniformly when needed.
- Auto-refresh is not paused through an unsupported/private API.
- Lazy materialization may cause Grafana's first normal query for a panel that was not previously initialized.
- A third-party panel may requery when it becomes visible or remounts; the exporter cannot prevent this without unsafe interception.
- Arbitrary cross-origin images, tainted canvas content, and WebGL drawing buffers may be unavailable to the DOM fallback.
