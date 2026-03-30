export type TiltSource = 'mouse' | 'gyroscope' | 'slider';

export interface TiltState {
  angle: number; // 0..1
  source: TiltSource;
}

export function mouseToAngle(
  mouseX: number,
  elementLeft: number,
  elementWidth: number
): number {
  const relative = (mouseX - elementLeft) / elementWidth;
  return Math.max(0, Math.min(1, relative));
}

export function gammaToAngle(gamma: number): number {
  // gamma ranges roughly -90 to 90, map -30..30 to 0..1
  const clamped = Math.max(-30, Math.min(30, gamma));
  return (clamped + 30) / 60;
}
