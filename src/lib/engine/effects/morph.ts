/**
 * Morph effect.
 * Generates N intermediate frames between two images using
 * simple cross-dissolve blending. A more advanced version would
 * use grid-based warping with control points.
 */
export function processMorph(
  frameA: ImageData,
  frameB: ImageData,
  numFrames: number
): ImageData[] {
  const { width, height } = frameA;
  const dataA = frameA.data;
  const dataB = frameB.data;
  const frames: ImageData[] = [];

  for (let i = 0; i < numFrames; i++) {
    const t = numFrames > 1 ? i / (numFrames - 1) : 0;
    const output = new ImageData(width, height);
    const outData = output.data;

    for (let j = 0; j < dataA.length; j++) {
      outData[j] = Math.round(dataA[j] * (1 - t) + dataB[j] * t);
    }

    frames.push(output);
  }

  return frames;
}
