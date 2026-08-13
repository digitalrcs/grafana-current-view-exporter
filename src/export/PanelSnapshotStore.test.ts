import { PanelSnapshotStore } from './PanelSnapshotStore';
import type { CapturedPanel } from './types';

function snapshot(id: string, bytes: number): CapturedPanel {
  return {
    panelId: id,
    title: id,
    width: 100,
    height: 100,
    blob: new Blob([new Uint8Array(bytes)], { type: 'image/png' }),
    format: 'png',
    gridPosition: { x: 0, y: 0, width: 100, height: 100 },
    capturedAt: new Date(),
    strategy: 'html-to-image',
  };
}

describe('PanelSnapshotStore', () => {
  test('retains compressed snapshots by stable panel key and reports their size', () => {
    const store = new PanelSnapshotStore();
    store.add('panel-1', snapshot('1', 10));
    store.add('panel-2', snapshot('2', 20));

    expect(store.has('panel-1')).toBe(true);
    expect(store.size).toBe(2);
    expect(store.totalBytes).toBe(30);

    store.clear();
    expect(store.size).toBe(0);
  });
});
