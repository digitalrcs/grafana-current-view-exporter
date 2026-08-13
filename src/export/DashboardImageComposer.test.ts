import { calculateOutputGeometry } from './DashboardImageComposer';
import type { CapturedPanel } from './types';

function panel(x: number, y: number, width: number, height: number): CapturedPanel {
  return {
    panelId: `${x}-${y}`,
    title: 'Panel',
    width,
    height,
    blob: new Blob(['png']),
    format: 'png',
    gridPosition: { x, y, width, height },
    capturedAt: new Date(),
    strategy: 'html-to-image',
  };
}

describe('calculateOutputGeometry', () => {
  test('preserves the dashboard layout bounds at native size', () => {
    const geometry = calculateOutputGeometry([
      panel(16, 20, 400, 200),
      panel(424, 20, 400, 200),
      panel(16, 228, 808, 100),
    ]);

    expect(geometry).toEqual({ width: 808, height: 308, scale: 1, minX: 16, minY: 20 });
  });

  test('scales oversized dashboards within dimension and pixel limits', () => {
    const geometry = calculateOutputGeometry([panel(0, 0, 20_000, 10_000)], 16_384, 64_000_000);

    expect(geometry.scale).toBeCloseTo(Math.sqrt(64_000_000 / 200_000_000));
    expect(geometry.width * geometry.height).toBeLessThanOrEqual(64_000_000);
    expect(geometry.width).toBeLessThanOrEqual(16_384);
  });
});
