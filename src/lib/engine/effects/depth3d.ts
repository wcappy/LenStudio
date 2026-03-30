/**
 * 3D Depth effect.
 * Takes a source image and a depth map, generates N synthetic viewpoints
 * by horizontally displacing pixels proportional to their depth value.
 */
export function processDepth3d(
  source: ImageData,
  depthMap: ImageData,
  numViews: number,
  maxDisplacement: number
): ImageData[] {
  const { width, height } = source;
  const srcData = source.data;
  const depthData = depthMap.data;
  const views: ImageData[] = [];

  for (let v = 0; v < numViews; v++) {
    const output = new ImageData(width, height);
    const outData = output.data;
    // Shift ranges from -maxDisplacement/2 to +maxDisplacement/2
    const shiftFactor = ((v / (numViews - 1)) - 0.5) * maxDisplacement;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        // Depth is 0 (far) to 255 (near), normalize to 0..1
        const depth = depthData[idx] / 255;
        const shift = Math.round(depth * shiftFactor);
        const srcX = x - shift;

        if (srcX >= 0 && srcX < width) {
          const srcIdx = (y * width + srcX) * 4;
          outData[idx] = srcData[srcIdx];
          outData[idx + 1] = srcData[srcIdx + 1];
          outData[idx + 2] = srcData[srcIdx + 2];
          outData[idx + 3] = srcData[srcIdx + 3];
        }
      }
    }

    views.push(output);
  }

  return views;
}
