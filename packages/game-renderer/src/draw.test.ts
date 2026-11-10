import { describe, expect, it } from "vitest";
import { Graphics, Polygon } from "pixi.js";
import { flag, phone, toaster } from "./draw.ts";
import { hasDegenerateSegment } from "./shapes.ts";

/** Every stroked polygon Pixi will triangulate, flattened from the Graphics instructions. */
function strokedPolygons(g: Graphics): number[][] {
  const out: number[][] = [];
  for (const instr of g.context.instructions) {
    if (instr.action !== "stroke") continue;
    const path = (instr.data as { path?: { shapePath: { shapePrimitives: { shape: unknown }[] } } }).path;
    if (!path) continue;
    for (const prim of path.shapePath.shapePrimitives) if (prim.shape instanceof Polygon) out.push([...prim.shape.points]);
  }
  return out;
}

describe("stroked shapes never contain zero-length segments (the stray-line bug)", () => {
  it("flags, phones, and the toaster", () => {
    const shapes: Graphics[] = [flag(true, 60), flag(false, 60), flag(true, 30), phone(70)];
    const t = toaster(220);
    for (const child of t.front.children) if (child instanceof Graphics) shapes.push(child);
    for (const g of shapes) for (const p of strokedPolygons(g)) expect(hasDegenerateSegment(p)).toBe(false);
  });
});
