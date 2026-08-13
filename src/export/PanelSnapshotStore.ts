import type { CapturedPanel } from './types';

/** Keeps panel images as compressed PNG blobs until final composition. */
export class PanelSnapshotStore {
  private readonly snapshots = new Map<string, CapturedPanel>();

  has(key: string): boolean {
    return this.snapshots.has(key);
  }

  add(key: string, snapshot: CapturedPanel): void {
    this.snapshots.set(key, snapshot);
  }

  values(): CapturedPanel[] {
    return Array.from(this.snapshots.values());
  }

  get size(): number {
    return this.snapshots.size;
  }

  get totalBytes(): number {
    return this.values().reduce((total, snapshot) => total + snapshot.blob.size, 0);
  }

  clear(): void {
    this.snapshots.clear();
  }
}
