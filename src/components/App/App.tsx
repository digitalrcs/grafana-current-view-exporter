import React from 'react';
import { css } from '@emotion/css';
import type { AppRootProps } from '@grafana/data';
import { PluginPage } from '@grafana/runtime';

const guideStyle = css({ maxWidth: 1040, lineHeight: 1.6, '& li': { marginBottom: 8 } });
const galleryStyle = css({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
  gap: 24,
  margin: '24px 0',
  '& figure': { margin: 0, minWidth: 0 },
  '& img': { display: 'block', width: '100%', height: 'auto', borderRadius: 8 },
  '& figcaption': { marginTop: 8 },
});

function App({ meta }: AppRootProps) {
  const assetPath = meta.baseUrl;
  return (
    <PluginPage>
      <div className={guideStyle} data-testid="exporter-guide">
        <h2>Export a dashboard in three steps</h2>
        <ol>
          <li>Open your dashboard, choose the time range, and wait for the panels to finish loading.</li>
          <li>
            Open any panel menu and choose <strong>Extensions &gt; Export current dashboard</strong>.
          </li>
          <li>
            Choose <strong>Capture current panel</strong> or <strong>Capture dashboard</strong>, then select{' '}
            <strong>Download PNG</strong> when the image is ready.
          </li>
        </ol>
        <div className={galleryStyle}>
          <figure>
            <img
              src={`${assetPath}/img/export-dialog-compact.png`}
              alt="Export dialog with panel and dashboard capture buttons"
              width={1280}
              height={720}
            />
            <figcaption>Choose one panel or the dashboard. The Help icon explains capture behavior.</figcaption>
          </figure>
          <figure>
            <img
              src={`${assetPath}/img/export-dashboard-ready.png`}
              alt="Successful four-panel dashboard capture with Download PNG button"
              width={1280}
              height={720}
            />
            <figcaption>Download the PNG after capture finishes. Check any reported panel failures.</figcaption>
          </figure>
        </div>
        <h2>What to expect</h2>
        <p>
          Capture runs in your browser. Dashboard capture visits panels by scrolling and restores your original
          position; dashboards that already fit on screen are captured in one pass. No renderer service is required.
        </p>
        <p>
          The exporter does not reload or refresh the dashboard or call datasource APIs. Grafana may run an initial
          query when scrolling loads a panel for the first time. PNG is the supported download format.
        </p>
        <a href="https://github.com/digitalrcs/grafana-current-view-exporter/wiki">Documentation and troubleshooting</a>
      </div>
    </PluginPage>
  );
}

export default App;
