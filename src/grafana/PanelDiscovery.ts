import type { PluginExtensionPanelContext } from '@grafana/data';
import type { PanelDescriptor } from '../export/types';
import { GrafanaAdapter } from './GrafanaAdapter';

export class PanelDiscovery {
  constructor(private readonly adapter: GrafanaAdapter) {}

  discover(context: PluginExtensionPanelContext): PanelDescriptor[] {
    return this.adapter.discoverDashboardPanels(context);
  }
}
