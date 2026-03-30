export function createCanvas(width: number, height: number): {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
} {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  return { canvas, ctx };
}

export function bitmapToImageData(
  bitmap: ImageBitmap,
  targetWidth: number,
  targetHeight: number
): ImageData {
  const { canvas, ctx } = createCanvas(targetWidth, targetHeight);
  ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
  return ctx.getImageData(0, 0, targetWidth, targetHeight);
}

export function imageDataToCanvas(imageData: ImageData): HTMLCanvasElement {
  const { canvas, ctx } = createCanvas(imageData.width, imageData.height);
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

export function imageDataToArrayBuffer(imageData: ImageData): ArrayBuffer {
  return imageData.data.buffer.slice(0);
}

export function arrayBufferToImageData(
  buffer: ArrayBuffer,
  width: number,
  height: number
): ImageData {
  return new ImageData(new Uint8ClampedArray(buffer), width, height);
}
