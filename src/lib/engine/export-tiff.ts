/**
 * Minimal uncompressed TIFF encoder with DPI metadata.
 * Writes a single-strip, RGBA, uncompressed TIFF.
 */
export function exportTiff(imageData: ImageData, dpi: number): Blob {
  const { width, height, data } = imageData;
  const pixelBytes = width * height * 4;

  // Layout:
  // [Header: 8] [IFD: 2 + 12*12 + 4 = 150] [ExtraData: 8+8+8 = 24] [PixelData]
  const numTags = 12;
  const ifdOffset = 8;
  const ifdSize = 2 + numTags * 12 + 4; // count + entries + next-IFD pointer
  const extraOffset = ifdOffset + ifdSize;  // 158
  // Extra data: BitsPerSample (4 shorts = 8 bytes) + XRes (8) + YRes (8)
  const bpsOffset = extraOffset;
  const xresOffset = extraOffset + 8;
  const yresOffset = extraOffset + 16;
  const pixelDataOffset = extraOffset + 24;
  const fileSize = pixelDataOffset + pixelBytes;

  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  // === Header (little-endian) ===
  view.setUint16(0, 0x4949, false); // 'II'
  view.setUint16(2, 42, true);
  view.setUint32(4, ifdOffset, true);

  // === IFD ===
  let pos = ifdOffset;
  view.setUint16(pos, numTags, true);
  pos += 2;

  function writeTag(tag: number, type: number, count: number, value: number) {
    view.setUint16(pos, tag, true);  pos += 2;
    view.setUint16(pos, type, true); pos += 2;
    view.setUint32(pos, count, true); pos += 4;
    view.setUint32(pos, value, true); pos += 4;
  }

  // Types: 3=SHORT(2 bytes), 4=LONG(4 bytes), 5=RATIONAL(8 bytes)
  writeTag(256, 4, 1, width);               // ImageWidth
  writeTag(257, 4, 1, height);              // ImageLength
  writeTag(258, 3, 4, bpsOffset);           // BitsPerSample → offset to 4 shorts
  writeTag(259, 3, 1, 1);                   // Compression: None
  writeTag(262, 3, 1, 2);                   // PhotometricInterpretation: RGB
  writeTag(273, 4, 1, pixelDataOffset);     // StripOffsets
  writeTag(277, 3, 1, 4);                   // SamplesPerPixel: 4 (RGBA)
  writeTag(278, 4, 1, height);              // RowsPerStrip
  writeTag(279, 4, 1, pixelBytes);          // StripByteCounts
  writeTag(282, 5, 1, xresOffset);          // XResolution → offset to rational
  writeTag(283, 5, 1, yresOffset);          // YResolution → offset to rational
  writeTag(296, 3, 1, 2);                   // ResolutionUnit: inch

  // Next IFD = 0 (none)
  view.setUint32(pos, 0, true);

  // === Extra data ===

  // BitsPerSample: 4 × SHORT(8)
  view.setUint16(bpsOffset, 8, true);
  view.setUint16(bpsOffset + 2, 8, true);
  view.setUint16(bpsOffset + 4, 8, true);
  view.setUint16(bpsOffset + 6, 8, true);

  // XResolution: rational (numerator/denominator)
  view.setUint32(xresOffset, dpi, true);
  view.setUint32(xresOffset + 4, 1, true);

  // YResolution: rational
  view.setUint32(yresOffset, dpi, true);
  view.setUint32(yresOffset + 4, 1, true);

  // === Pixel data (RGBA straight from ImageData) ===
  bytes.set(data, pixelDataOffset);

  return new Blob([buffer], { type: 'image/tiff' });
}
