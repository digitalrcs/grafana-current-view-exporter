import { PDFDocument, PageSizes, clip, endPath, popGraphicsState, pushGraphicsState, rectangle, rgb } from 'pdf-lib';
import { throwIfAborted } from '../utils/Abort';
import type { ImagePanelBounds } from './types';

const PAGE_WIDTH = PageSizes.A4[1];
const PAGE_HEIGHT = PageSizes.A4[0];
const MARGIN = 24;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const CONTENT_HEIGHT = PAGE_HEIGHT - MARGIN * 2;

/** Page ranges use coordinates in the frozen PNG, never the live dashboard. */
export function calculatePdfPages(width: number, height: number, panels: ImagePanelBounds[] = []) {
  if (![width, height].every((value) => Number.isFinite(value) && value > 0)) {
    throw new Error('The captured image has invalid dimensions.');
  }
  const intervals = (panels.length ? panels : [{ y: 0, height }])
    .map((panel) => {
      if (!Number.isFinite(panel.y) || !Number.isFinite(panel.height) || panel.height <= 0) {
        throw new Error('The captured panel layout is invalid.');
      }
      return { start: Math.max(0, panel.y), end: Math.min(height, panel.y + panel.height) };
    })
    .filter((interval) => interval.end > interval.start)
    .sort((left, right) => left.start - right.start);

  // Merge overlapping vertical spans: a page break must not bisect any panel.
  const bands: Array<{ start: number; end: number }> = [];
  for (const interval of intervals) {
    const previous = bands[bands.length - 1];
    if (previous && interval.start < previous.end) {
      previous.end = Math.max(previous.end, interval.end);
    } else {
      bands.push({ ...interval });
    }
  }
  const cuts = [...new Set([...bands.map((band) => band.end), height])].sort((a, b) => a - b);
  const widthScale = CONTENT_WIDTH / width;
  const capacity = CONTENT_HEIGHT / widthScale;
  const pages: Array<{ start: number; end: number; scale: number }> = [];
  let start = 0;
  while (start < height) {
    const remaining = cuts.filter((cut) => cut > start);
    const fitting = remaining.filter((cut) => cut - start <= capacity);
    const end = fitting[fitting.length - 1] ?? remaining[0];
    // A row taller than one page is scaled down intact, not clipped or omitted.
    pages.push({ start, end, scale: Math.min(widthScale, CONTENT_HEIGHT / (end - start)) });
    start = end;
  }
  return pages;
}

export async function composePdf(options: {
  blob: Blob;
  title: string;
  panelBounds?: ImagePanelBounds[];
  signal: AbortSignal;
}): Promise<Blob> {
  throwIfAborted(options.signal);
  const bytes = await options.blob.arrayBuffer();
  throwIfAborted(options.signal);
  const pdf = await PDFDocument.create();
  pdf.setTitle(options.title);
  pdf.setCreator('Grafana Current View Exporter');
  pdf.setSubject('Browser-local snapshot of captured Grafana panels');
  const image = await pdf.embedPng(new Uint8Array(bytes));
  throwIfAborted(options.signal);
  const pages = calculatePdfPages(image.width, image.height, options.panelBounds);
  for (const [index, slice] of pages.entries()) {
    throwIfAborted(options.signal);
    const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    const sliceHeight = (slice.end - slice.start) * slice.scale;
    const x = (PAGE_WIDTH - image.width * slice.scale) / 2;
    const top = PAGE_HEIGHT - MARGIN;
    page.pushOperators(
      pushGraphicsState(),
      rectangle(x, top - sliceHeight, image.width * slice.scale, sliceHeight),
      clip(),
      endPath()
    );
    page.drawImage(image, {
      x,
      y: top - (image.height - slice.start) * slice.scale,
      width: image.width * slice.scale,
      height: image.height * slice.scale,
    });
    page.pushOperators(popGraphicsState());
    page.drawText(`Page ${index + 1} of ${pages.length}`, { x: MARGIN, y: 10, size: 8, color: rgb(0.35, 0.35, 0.35) });
    // Give Cancel/close an opportunity to abort long exports between pages.
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
  throwIfAborted(options.signal);
  const output = await pdf.save();
  throwIfAborted(options.signal);
  return new Blob([new Uint8Array(output)], { type: 'application/pdf' });
}
