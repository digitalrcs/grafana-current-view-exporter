import React, { Suspense, lazy } from 'react';
import { AppPlugin, PluginExtensionPoints, type PluginExtensionPanelContext } from '@grafana/data';
import { LoadingPlaceholder } from '@grafana/ui';

const App = lazy(() => import('./components/App/App'));
const ExportDialog = lazy(() => import('./components/ExportDialog'));

function createExportModalBody(context: Readonly<PluginExtensionPanelContext>) {
  return function ExportModalBody({ onDismiss }: { onDismiss?: () => void }) {
    return (
      <Suspense fallback={<LoadingPlaceholder text="Loading exporter…" />}>
        <ExportDialog context={context} onDismiss={onDismiss} />
      </Suspense>
    );
  };
}

export const plugin = new AppPlugin<{}>()
  .setRootPage(App)
  .addLink<PluginExtensionPanelContext>({
    title: 'Export current dashboard',
    description: 'Capture the dashboard visual state already rendered in this browser session.',
    targets: [PluginExtensionPoints.DashboardPanelMenu],
    icon: 'download-alt',
    onClick: (_event, { context, openModal }) => {
      if (!context) {
        return;
      }
      openModal({
        title: 'Export Current Dashboard',
        body: createExportModalBody(context),
        width: 720,
      });
    },
  });
