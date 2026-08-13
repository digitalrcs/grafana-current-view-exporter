import type { CapturedPanel } from './types';
import { throwIfAborted } from '../utils/Abort';

const DEFAULT_MAX_DIMENSION = 16_384;
const DEFAULT_MAX_PIXELS = 64_000_000;

export interface OutputGeometry {
  width: number;
  height: number;
  scale: number;
  minX: number;
  minY: number;
}

export interface ComposedDashboardImage extends OutputGeometry {
  blob: Blob;
}

export function calculateOutputGeometry(
  panels: CapturedPanel[],
  maxDimension = DEFAULT_MAX_DIMENSION,
  maxPixels = DEFAULT_MAX_PIXELS
): OutputGeometry {
  if (panels.length === 0) {
    throw new Error('No panel snapshots are available to compose.');
  }

  const minX = Math.min(...panels.map((panel) => panel.gridPosition.x));
  const minY = Math.min(...panels.map((panel) => panel.gridPosition.y));
  const maxX = Math.max(...panels.map((panel) => panel.gridPosition.x + panel.gridPosition.width));
  const maxY = Math.max(...panels.map((panel) => panel.gridPosition.y + panel.gridPosition.height));
  const layoutWidth = Math.max(1, maxX - minX);
  const layoutHeight = Math.max(1, maxY - minY);
  const dimensionScale = Math.min(maxDimension / layoutWidth, maxDimension / layoutHeight);
  const pixelScale = Math.sqrt(maxPixels / (layoutWidth * layoutHeight));
  const scale = Math.min(1, dimensionScale, pixelScale);

  return {
    width: Math.max(1, Math.floor(layoutWidth * scale)),
    height: Math.max(1, Math.floor(layoutHeight * scale)),
    scale,
    minX,
    minY,
  };
}

export class DashboardImageComposer {
  async compose(
    panels: CapturedPanel[],
    options: { backgroundColor: string; signal: AbortSignal }
  ): Promise<ComposedDashboardImage> {
    throwIfAborted(options.signal);
    const geometry = calculateOutputGeometry(panels);
    const canvas = document.createElement('canvas');
    canvas.width = geometry.width;
    canvas.height = geometry.height;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('This browser could not create the final dashboard image canvas.');
    }

    context.fillStyle = options.backgroundColor;
    context.fillRect(0, 0, canvas.width, canvas.height);

    for (const panel of panels) {
      throwIfAborted(options.signal);
      const bitmap = await createImageBitmap(panel.blob);
      try {
        context.drawImage(
          bitmap,
          Math.round((panel.gridPosition.x - geometry.minX) * geometry.scale),
          Math.round((panel.gridPosition.y - geometry.minY) * geometry.scale),
          Math.max(1, Math.round(panel.gridPosition.width * geometry.scale)),
          Math.max(1, Math.round(panel.gridPosition.height * geometry.scale))
        );
      } finally {
        bitmap.close();
      }
    }

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((value) => {
        if (value) {
          resolve(value);
        } else {
          reject(new Error('The browser returned an empty dashboard image.'));
        }
      }, 'image/png');
    });
    throwIfAborted(options.signal);
    canvas.width = 1;
    canvas.height = 1;
    return { ...geometry, blob };
  }
}
