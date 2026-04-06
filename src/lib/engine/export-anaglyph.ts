/**
 * Generate a red/cyan anaglyph 3D image from two frames.
 *
 * Left eye → red channel
 * Right eye → green + blue channels (cyan)
 */
export function generateAnaglyph(
  leftFrame: ImageData,
  rightFrame: ImageData
): ImageData {
  const { width, height } = leftFrame;
  const output = new ImageData(width, height);
  const out = output.data;
  const left = leftFrame.data;
  const right = rightFrame.data;

  for (let i = 0; i < out.length; i += 4) {
    // Red channel from left eye (convert to grayscale luminance for better quality)
    const leftLum = left[i] * 0.299 + left[i + 1] * 0.587 + left[i + 2] * 0.114;
    // Cyan channels from right eye
    const rightLum_g = right[i + 1];
    const rightLum_b = right[i + 2];

    out[i]     = Math.round(leftLum);    // Red from left
    out[i + 1] = rightLum_g;              // Green from right
    out[i + 2] = rightLum_b;              // Blue from right
    out[i + 3] = 255;                     // Full opacity
  }

  return output;
}

/** Export anaglyph as PNG blob */
export async function exportAnaglyphPng(
  leftFrame: ImageData,
  rightFrame: ImageData
): Promise<Blob> {
  const imageData = generateAnaglyph(leftFrame, rightFrame);
  const canvas = new OffscreenCanvas(imageData.width, imageData.height);
  const ctx = canvas.getContext('2d')!;
  ctx.putImageData(imageData, 0, 0);
  return canvas.convertToBlob({ type: 'image/png' });
}
