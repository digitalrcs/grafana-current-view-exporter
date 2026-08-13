import type { PluginExtensionPanelContext } from '@grafana/data';
import type { GridPosition, PanelDescriptor } from '../export/types';

const SELECTORS = {
  panelRoots: ['[data-viz-panel-id]', '[data-panelid]', '[data-panel-id]'],
  loading: [
    '[aria-label*="Loading"]',
    '[data-testid*="loading" i]',
    '[data-testid*="query running" i]',
    '.panel-loading',
  ],
  error: ['[aria-label*="Panel error" i]', '[data-testid*="panel error" i]', '.panel-alert'],
  title: ['[data-testid*="Panel header" i]', 'h2', '[role="heading"]'],
} as const;

function firstAttribute(element: HTMLElement, names: readonly string[]): string | undefined {
  for (const name of names) {
    const value = element.getAttribute(name);
    if (value) {
      return value;
    }
  }
  return undefined;
}

function normalizePanelId(rawId: string | undefined): string | undefined {
  if (!rawId) {
    return undefined;
  }

  // Grafana scenes uses `panel-<dashboard panel id>` for ordinary panels.
  // Keep all other opaque/path identifiers intact so repeated panels remain distinct.
  return /^panel-(\d+)$/.exec(rawId)?.[1] ?? rawId;
}

function isScrollable(element: HTMLElement): boolean {
  const overflowY = window.getComputedStyle(element).overflowY;
  return (overflowY === 'auto' || overflowY === 'scroll') && element.scrollHeight > element.clientHeight;
}

function rectToGridPosition(element: HTMLElement, scrollContainer?: HTMLElement): GridPosition {
  const rect = element.getBoundingClientRect();
  if (scrollContainer) {
    const containerRect = scrollContainer.getBoundingClientRect();
    return {
      x: Math.round(rect.left - containerRect.left + scrollContainer.scrollLeft),
      y: Math.round(rect.top - containerRect.top + scrollContainer.scrollTop),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    };
  }
  return {
    x: Math.round(rect.left + window.scrollX),
    y: Math.round(rect.top + window.scrollY),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  };
}

/** All version-sensitive Grafana DOM access is isolated in this adapter. */
export class GrafanaAdapter {
  discoverMaterializedPanels(root: ParentNode = document, scrollContainer?: HTMLElement): PanelDescriptor[] {
    const unique = new Set<HTMLElement>();
    for (const selector of SELECTORS.panelRoots) {
      root.querySelectorAll<HTMLElement>(selector).forEach((element) => unique.add(element));
    }

    return Array.from(unique)
      .map((element) => this.describeElement(element, scrollContainer ?? this.findScrollableAncestor(element)))
      .sort((left, right) => left.gridPosition.y - right.gridPosition.y || left.gridPosition.x - right.gridPosition.x);
  }

  findDashboardScrollContainer(root: ParentNode = document): HTMLElement | undefined {
    const firstPanel = SELECTORS.panelRoots
      .map((selector) => root.querySelector<HTMLElement>(selector))
      .find((element): element is HTMLElement => Boolean(element));
    if (firstPanel) {
      const ancestor = this.findScrollableAncestor(firstPanel);
      if (ancestor) {
        return ancestor;
      }
    }

    return Array.from(root.querySelectorAll<HTMLElement>('*'))
      .filter(isScrollable)
      .sort((left, right) => right.scrollHeight - right.clientHeight - (left.scrollHeight - left.clientHeight))[0];
  }

  getPanelGridPosition(element: HTMLElement, scrollContainer?: HTMLElement): GridPosition {
    return rectToGridPosition(element, scrollContainer ?? this.findScrollableAncestor(element));
  }

  discoverDashboardPanels(context: PluginExtensionPanelContext): PanelDescriptor[] {
    const materialized = this.discoverMaterializedPanels();
    const byId = new Map(materialized.map((panel) => [String(panel.id), panel]));
    const contextIds = new Set(
      [String(context.id), normalizePanelId(context.panelPathId)].filter((value): value is string => Boolean(value))
    );
    let selected = materialized.find((panel) => contextIds.has(String(panel.id)));

    if (!selected && context.title) {
      const titleMatches = materialized.filter((panel) => panel.title === context.title);
      if (titleMatches.length === 1) {
        selected = titleMatches[0];
      }
    }

    if (selected && String(selected.id) !== String(context.id)) {
      byId.delete(String(selected.id));
      selected = { ...selected, id: context.id };
      byId.set(String(context.id), selected);
    }

    if (!selected) {
      selected = {
        id: context.id,
        title: context.title || `Panel ${context.id}`,
        gridPosition: { x: 0, y: 0, width: 0, height: 0 },
        captureState: 'DISCOVERED',
      };
      byId.set(String(context.id), selected);
    }
    if (selected) {
      selected.title = context.title || selected.title;
      selected.panelPathId = context.panelPathId;
      selected.wasLoadedAtSessionStart = context.data?.state === 'Done';
    }

    return Array.from(byId.values()).sort(
      (left, right) => left.gridPosition.y - right.gridPosition.y || left.gridPosition.x - right.gridPosition.x
    );
  }

  findPanel(context: PluginExtensionPanelContext): PanelDescriptor | undefined {
    return this.discoverDashboardPanels(context).find((panel) => String(panel.id) === String(context.id));
  }

  hasLoadingIndicator(element: HTMLElement): boolean {
    return SELECTORS.loading.some((selector) => element.querySelector(selector) !== null);
  }

  getPanelError(element: HTMLElement): string | undefined {
    for (const selector of SELECTORS.error) {
      const error = element.querySelector<HTMLElement>(selector);
      if (error) {
        return error.innerText.trim() || 'Grafana reports a panel rendering error.';
      }
    }
    return undefined;
  }

  getVisualSignature(element: HTMLElement): string {
    const rect = element.getBoundingClientRect();
    const canvases = Array.from(element.querySelectorAll('canvas'))
      .map((canvas) => `${canvas.width}x${canvas.height}`)
      .join(',');
    const svgs = Array.from(element.querySelectorAll('svg'))
      .map((svg) => `${svg.childElementCount}:${svg.outerHTML.length}`)
      .join(',');
    return [
      Math.round(rect.width),
      Math.round(rect.height),
      element.childElementCount,
      element.innerText.length,
      canvases,
      svgs,
    ].join('|');
  }

  private findScrollableAncestor(element: HTMLElement): HTMLElement | undefined {
    let ancestor = element.parentElement;
    while (ancestor) {
      if (isScrollable(ancestor)) {
        return ancestor;
      }
      ancestor = ancestor.parentElement;
    }
    return undefined;
  }

  private describeElement(element: HTMLElement, scrollContainer?: HTMLElement): PanelDescriptor {
    const rawPanelPathId = firstAttribute(element, ['data-viz-panel-id']);
    const rawId = normalizePanelId(rawPanelPathId ?? firstAttribute(element, ['data-panelid', 'data-panel-id']));
    const titleElement = SELECTORS.title.map((selector) => element.querySelector<HTMLElement>(selector)).find(Boolean);
    const title = (titleElement?.innerText ?? titleElement?.textContent ?? '').trim();
    return {
      id: rawId ?? `dom-${Math.round(element.getBoundingClientRect().top)}`,
      title: title || (rawId ? `Panel ${rawId}` : 'Untitled panel'),
      element,
      gridPosition: rectToGridPosition(element, scrollContainer),
      captureState: 'DISCOVERED',
      panelPathId: rawPanelPathId,
    };
  }
}
