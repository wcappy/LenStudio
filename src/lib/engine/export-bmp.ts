/**
 * BMP encoder with DPI metadata.
 * Writes a BITMAPV4 header for RGBA support with correct
 * pixels-per-meter resolution fields.
 */
export function exportBmp(imageData: ImageData, dpi: number): Blob {
  const { width, height, data } = imageData;
  const ppm = Math.round(dpi * 39.3701); // pixels per meter
  const rowSize = width * 4; // BGRA, no padding needed at 4 bytes/pixel
  const pixelBytes = rowSize * height;

  // BITMAPFILEHEADER (14) + BITMAPV4HEADER (108) + pixel data
  const headerSize = 14 + 108;
  const fileSize = headerSize + pixelBytes;

  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);

  // === BITMAPFILEHEADER (14 bytes) ===
  view.setUint16(0, 0x4D42, false); // 'BM'
  view.setUint32(2, fileSize, true);
  view.setUint32(6, 0, true);       // reserved
  view.setUint32(10, headerSize, true); // pixel data offset

  // === BITMAPV4HEADER (108 bytes) ===
  view.setUint32(14, 108, true);         // header size
  view.setInt32(18, width, true);        // width
  view.setInt32(22, -height, true);      // height (negative = top-down)
  view.setUint16(26, 1, true);          // planes
  view.setUint16(28, 32, true);         // bits per pixel
  view.setUint32(30, 3, true);          // compression: BI_BITFIELDS
  view.setUint32(34, pixelBytes, true); // image size
  view.setInt32(38, ppm, true);         // X pixels per meter
  view.setInt32(42, ppm, true);         // Y pixels per meter
  view.setUint32(46, 0, true);          // colors used
  view.setUint32(50, 0, true);          // important colors

  // Channel masks (RGBA)
  view.setUint32(54, 0x00FF0000, true); // red mask
  view.setUint32(58, 0x0000FF00, true); // green mask
  view.setUint32(62, 0x000000FF, true); // blue mask
  view.setUint32(66, 0xFF000000, true); // alpha mask

  // Color space: LCS_sRGB
  view.setUint32(70, 0x73524742, true); // 'sRGB'
  // Remaining V4 fields (endpoints + gamma) = zeros, already zeroed

  // === Pixel Data (BGRA, top-down) ===
  const pixels = new Uint8Array(buffer, headerSize);
  for (let i = 0; i < data.length; i += 4) {
    const offset = i; // top-down because height is negative
    pixels[offset] = data[i + 2];     // B
    pixels[offset + 1] = data[i + 1]; // G
    pixels[offset + 2] = data[i];     // R
    pixels[offset + 3] = data[i + 3]; // A
  }

  return new Blob([buffer], { type: 'image/bmp' });
}
