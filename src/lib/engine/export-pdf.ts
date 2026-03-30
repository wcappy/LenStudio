/**
 * Minimal PDF encoder that embeds a PNG image at the correct
 * physical dimensions (based on DPI) for print.
 *
 * Produces a single-page PDF with the image filling the page.
 * PDF uses 72 points per inch internally.
 */
export async function exportPdf(
  imageData: ImageData,
  dpi: number
): Promise<Blob> {
  // First encode as PNG
  const canvas = new OffscreenCanvas(imageData.width, imageData.height);
  const ctx = canvas.getContext('2d')!;
  ctx.putImageData(imageData, 0, 0);
  const pngBlob = await canvas.convertToBlob({ type: 'image/png' });
  const pngBytes = new Uint8Array(await pngBlob.arrayBuffer());

  // Page dimensions in PDF points (72 pts/inch)
  const pageW = (imageData.width / dpi) * 72;
  const pageH = (imageData.height / dpi) * 72;

  // Build PDF objects
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const offsets: number[] = [];
  let pos = 0;

  function write(str: string) {
    const bytes = enc.encode(str);
    parts.push(bytes);
    pos += bytes.length;
  }

  function writeBytes(bytes: Uint8Array) {
    parts.push(bytes);
    pos += bytes.length;
  }

  function markObj(n: number) {
    offsets[n] = pos;
  }

  // Header
  write('%PDF-1.4\n%\xC0\xC1\xC2\xC3\n');

  // Obj 1: Catalog
  markObj(1);
  write('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  // Obj 2: Pages
  markObj(2);
  write(`2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`);

  // Obj 3: Page
  markObj(3);
  write(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW.toFixed(2)} ${pageH.toFixed(2)}] /Contents 4 0 R /Resources << /XObject << /Img 5 0 R >> >> >>\nendobj\n`);

  // Obj 4: Page content stream (draw image full page)
  const contentStr = `q\n${pageW.toFixed(2)} 0 0 ${pageH.toFixed(2)} 0 0 cm\n/Img Do\nQ\n`;
  markObj(4);
  write(`4 0 obj\n<< /Length ${contentStr.length} >>\nstream\n`);
  write(contentStr);
  write('endstream\nendobj\n');

  // Obj 5: Image XObject (PNG embedded as FlateDecode via raw PNG stream)
  // We use the PNG directly since PDF viewers can decode it
  // Actually, PDF doesn't natively support PNG. We need to use DCTDecode (JPEG)
  // or FlateDecode (raw deflated pixels). The simplest approach: embed as
  // a raw image stream with FlateDecode by extracting the IDAT chunks.
  //
  // Simpler alternative: encode to JPEG-less format using raw uncompressed.
  // For correctness let's use an uncompressed ASCII85 or raw stream.
  //
  // Simplest valid approach: store RGB pixels uncompressed.

  // Convert RGBA to RGB for PDF (PDF doesn't support RGBA in basic images)
  const rgbLen = imageData.width * imageData.height * 3;
  const rgb = new Uint8Array(rgbLen);
  const src = imageData.data;
  for (let i = 0, j = 0; i < src.length; i += 4, j += 3) {
    rgb[j] = src[i];
    rgb[j + 1] = src[i + 1];
    rgb[j + 2] = src[i + 2];
  }

  markObj(5);
  write(`5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imageData.width} /Height ${imageData.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Length ${rgbLen} >>\nstream\n`);
  writeBytes(rgb);
  write('\nendstream\nendobj\n');

  // Cross-reference table
  const xrefPos = pos;
  write('xref\n');
  write(`0 6\n`);
  write('0000000000 65535 f \n');
  for (let i = 1; i <= 5; i++) {
    write(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
  }

  // Trailer
  write('trailer\n');
  write(`<< /Size 6 /Root 1 0 R >>\n`);
  write('startxref\n');
  write(`${xrefPos}\n`);
  write('%%EOF\n');

  // Combine all parts
  const totalSize = parts.reduce((s, p) => s + p.length, 0);
  const result = new Uint8Array(totalSize);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }

  return new Blob([result], { type: 'application/pdf' });
}
