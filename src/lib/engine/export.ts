import { dpiToPixelsPerMeter } from '../utils/math-helpers.js';

/**
 * Export interlaced image as PNG with DPI metadata in pHYs chunk.
 */
export async function exportPng(
  imageData: ImageData,
  dpi: number
): Promise<Blob> {
  const canvas = new OffscreenCanvas(imageData.width, imageData.height);
  const ctx = canvas.getContext('2d')!;
  ctx.putImageData(imageData, 0, 0);

  const blob = await canvas.convertToBlob({ type: 'image/png' });
  const buffer = await blob.arrayBuffer();

  // Inject pHYs chunk with DPI metadata
  const pngWithDpi = injectPhysChunk(new Uint8Array(buffer), dpi);
  return new Blob([pngWithDpi.buffer as ArrayBuffer], { type: 'image/png' });
}

/**
 * Inject a pHYs chunk into a PNG file to set DPI metadata.
 * pHYs chunk: 4 bytes X pixels per unit, 4 bytes Y pixels per unit, 1 byte unit (1 = meter)
 */
function injectPhysChunk(png: Uint8Array, dpi: number): Uint8Array {
  const ppm = dpiToPixelsPerMeter(dpi);

  // pHYs chunk data: 9 bytes
  const physData = new Uint8Array(9);
  const view = new DataView(physData.buffer);
  view.setUint32(0, ppm);  // X pixels per unit
  view.setUint32(4, ppm);  // Y pixels per unit
  physData[8] = 1;         // Unit: meter

  // Build chunk: length(4) + type(4) + data(9) + crc(4) = 21 bytes
  const chunkType = new Uint8Array([0x70, 0x48, 0x59, 0x73]); // "pHYs"
  const chunkContent = new Uint8Array(4 + 9); // type + data for CRC
  chunkContent.set(chunkType, 0);
  chunkContent.set(physData, 4);

  const crc = crc32(chunkContent);

  const chunk = new Uint8Array(4 + 4 + 9 + 4);
  const chunkView = new DataView(chunk.buffer);
  chunkView.setUint32(0, 9);             // Data length
  chunk.set(chunkType, 4);               // Type
  chunk.set(physData, 8);                // Data
  chunkView.setUint32(17, crc);          // CRC

  // Insert after IHDR chunk (PNG signature = 8 bytes, IHDR = 4+4+13+4 = 25 bytes)
  const insertPos = 8 + 25; // After signature + IHDR
  const result = new Uint8Array(png.length + chunk.length);
  result.set(png.subarray(0, insertPos), 0);
  result.set(chunk, insertPos);
  result.set(png.subarray(insertPos), insertPos + chunk.length);

  return result;
}

// CRC32 lookup table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = crcTable[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
