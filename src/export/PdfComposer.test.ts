import { Blob as NodeBlob } from 'node:buffer';
import { PDFDocument } from 'pdf-lib';
import { calculatePdfPages, composePdf } from './PdfComposer';

const png = new NodeBlob(
  [
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5XkAAAAASUVORK5CYII=',
      'base64'
    ),
  ],
  { type: 'image/png' }
) as unknown as Blob;

describe('PDF export', () => {
  const BrowserBlob = globalThis.Blob;
  beforeAll(() => {
    globalThis.Blob = NodeBlob as unknown as typeof Blob;
  });
  afterAll(() => {
    globalThis.Blob = BrowserBlob;
  });
  test('keeps all eight dashboard rows on four landscape pages without gaps or overlaps', () => {
    const rows = Array.from({ length: 16 }, (_, index) => ({ y: Math.floor(index / 2) * 342, height: 334 }));
    const pages = calculatePdfPages(1108, 2728, rows);
    expect(pages).toHaveLength(4);
    expect(pages[0].start).toBe(0);
    expect(pages[pages.length - 1].end).toBe(2728);
    pages.forEach((page, index) => {
      if (index > 0) {
        expect(page.start).toBe(pages[index - 1].end);
      }
      expect(page.end).toBeGreaterThan(page.start);
      expect(rows.some((row) => row.y < page.end && row.y + row.height > page.end)).toBe(false);
    });
  });

  test('scales a single tall panel to one page rather than chopping it', () => {
    const pages = calculatePdfPages(500, 4000);
    expect(pages).toHaveLength(1);
    expect(pages[0].scale).toBeLessThan(0.15);
    expect(pages[0].end).toBe(4000);
  });

  test('does not split overlapping or staggered panel rows', () => {
    const pages = calculatePdfPages(1000, 1800, [
      { y: 0, height: 1000 },
      { y: 600, height: 1200 },
    ]);
    expect(pages).toHaveLength(1);
    expect(pages[0].end).toBe(1800);
  });

  test.each([0, -1, NaN, Infinity])('rejects invalid image dimension %s', (width) => {
    expect(() => calculatePdfPages(width, 100)).toThrow('invalid dimensions');
  });

  test('creates a readable PDF with Unicode title metadata and an embedded PNG', async () => {
    const blob = await composePdf({ blob: png, title: 'Dashboard – 東京', signal: new AbortController().signal });
    expect(blob.type).toBe('application/pdf');
    const bytes = await blob.arrayBuffer();
    const document = await PDFDocument.load(new Uint8Array(bytes));
    expect(document.getPageCount()).toBe(1);
    expect(document.getTitle()).toBe('Dashboard – 東京');
    const page = document.getPage(0);
    expect(page.getWidth()).toBeGreaterThan(page.getHeight());
    expect(page.node.Resources()?.get).toBeDefined();
  });

  test('rejects invalid PNG input without producing a misleading file', async () => {
    await expect(
      composePdf({ blob: new Blob(['not png']), title: 'Bad', signal: new AbortController().signal })
    ).rejects.toBeDefined();
  });

  test('honors cancellation before reading the image', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(composePdf({ blob: png, title: 'Cancelled', signal: controller.signal })).rejects.toMatchObject({
      name: 'AbortError',
    });
  });
});
