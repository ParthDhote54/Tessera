/** Normalize pixel coordinates to [0, 1] stage space */
export function toNorm(px: number, pxTotal: number): number {
  return Math.max(0, Math.min(1, px / pxTotal));
}

/** Denormalize [0, 1] to pixel coordinates */
export function toPx(norm: number, pxTotal: number): number {
  return norm * pxTotal;
}

/** Linear interpolation */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Clamp a value to [min, max] */
export function clamp(v: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, v));
}
