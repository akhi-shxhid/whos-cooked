/**
 * Pure point lists for custom shapes, drawn with Graphics.poly().
 *
 * Why: Pixi's stroke builder normalizes each segment by its length
 * (buildLine.js: `perpX /= dist`). A zero-length segment (two identical points
 * in a row, e.g. where a bezier ends exactly where an arc begins) yields NaN
 * vertices. Desktop GPUs drop that triangle; some mobile GPUs stretch it into a
 * long sliver to another shape. That was the stray line to the Honey button.
 * Every custom outline therefore goes through `cleanPolygon`, and tests assert
 * no zero-length segments and no non-finite points.
 */

/** Removes consecutive duplicate points (and a closing point equal to the first). */
export function cleanPolygon(points: number[], eps = 1e-3): number[] {
  const out: number[] = [];
  for (let i = 0; i + 1 < points.length; i += 2) {
    const x = points[i]!;
    const y = points[i + 1]!;
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    const n = out.length;
    if (n >= 2 && Math.hypot(x - out[n - 2]!, y - out[n - 1]!) < eps) continue;
    out.push(x, y);
  }
  while (out.length >= 6 && Math.hypot(out[0]! - out[out.length - 2]!, out[1]! - out[out.length - 1]!) < eps) out.splice(-2, 2);
  return out;
}

/** Teardrop (honey drop) about `s` wide, centered on (0, 0), with a softly rounded tip. */
export function teardrop(s: number, steps = 48): number[] {
  const pts: number[] = [];
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    // Classic teardrop curve: x = sin t * sin^m(t/2), y = cos t. Exponent 1.4 keeps the tip soft.
    const x = Math.sin(t) * Math.pow(Math.abs(Math.sin(t / 2)), 1.4) * s * 0.46;
    const y = -Math.cos(t) * s * 0.42 + s * 0.06;
    pts.push(x, y);
  }
  return cleanPolygon(pts);
}

/** Mushroom cap: a half-ellipse dome with a flat base, as one clean polygon. */
export function mushroomCap(s: number, steps = 32): number[] {
  const pts: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = Math.PI + (i / steps) * Math.PI;
    pts.push(Math.cos(t) * s * 0.46, Math.sin(t) * s * 0.44 + s * 0.02);
  }
  return cleanPolygon(pts);
}

/** True if any two consecutive points (including last -> first) coincide or any point is non-finite. */
export function hasDegenerateSegment(points: number[], eps = 1e-3): boolean {
  const n = points.length / 2;
  for (let i = 0; i < n; i++) {
    const x0 = points[i * 2]!;
    const y0 = points[i * 2 + 1]!;
    const j = (i + 1) % n;
    const x1 = points[j * 2]!;
    const y1 = points[j * 2 + 1]!;
    if (![x0, y0, x1, y1].every(Number.isFinite)) return true;
    if (Math.hypot(x1 - x0, y1 - y0) < eps) return true;
  }
  return false;
}
