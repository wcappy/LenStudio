/**
 * Computes cell positions and sizes for a non-uniform grid
 * based on proportional weights for each column and row.
 */

export interface GridGeometry {
  colStarts: number[];
  rowStarts: number[];
  colWidths: number[];
  rowHeights: number[];
}

export function computeGridGeometry(
  totalW: number,
  totalH: number,
  colWeights: number[],
  rowWeights: number[],
  borderPx: number
): GridGeometry {
  const cols = colWeights.length;
  const rows = rowWeights.length;

  const colSum = colWeights.reduce((a, b) => a + b, 0);
  const rowSum = rowWeights.reduce((a, b) => a + b, 0);

  const availW = totalW - borderPx * Math.max(0, cols - 1);
  const availH = totalH - borderPx * Math.max(0, rows - 1);

  const colWidths = colWeights.map(w => (w / colSum) * availW);
  const rowHeights = rowWeights.map(h => (h / rowSum) * availH);

  const colStarts: number[] = [0];
  for (let c = 1; c < cols; c++) {
    colStarts.push(colStarts[c - 1] + colWidths[c - 1] + borderPx);
  }

  const rowStarts: number[] = [0];
  for (let r = 1; r < rows; r++) {
    rowStarts.push(rowStarts[r - 1] + rowHeights[r - 1] + borderPx);
  }

  return { colStarts, rowStarts, colWidths, rowHeights };
}

/** Returns the percentage each weight represents */
export function weightsToPercents(weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  return weights.map(w => Math.round((w / sum) * 100));
}

/** Creates uniform weights array of given length */
export function uniformWeights(count: number): number[] {
  return Array(count).fill(1);
}
