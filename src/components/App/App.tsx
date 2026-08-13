import React from 'react';
import type { AppRootProps } from '@grafana/data';
import { Alert } from '@grafana/ui';
import { PluginPage } from '@grafana/runtime';

function App(_props: AppRootProps) {
  return (
    <PluginPage>
      <h1>Grafana Current View Exporter</h1>
      <p>
        Open a dashboard panel menu and choose <strong>Export current dashboard</strong>. You can capture that panel or
        progressively capture and compose the entire current dashboard as a PNG.
      </p>
      <Alert title="Browser-local export" severity="info">
        The exporter restores your scroll position and keeps panel snapshots in this browser. PDF output and advanced
        export controls remain later milestones.
      </Alert>
    </PluginPage>
  );
}

export default App;
