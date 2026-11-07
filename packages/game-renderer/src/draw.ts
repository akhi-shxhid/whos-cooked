import { Container, Graphics, Sprite, Text, type Texture } from "pixi.js";
import type { Ingredient } from "@whoscooked/game-core";
import { C, FONT_BODY, FONT_DISPLAY } from "./stage.ts";

export function label(text: string, size: number, opts: { color?: number; display?: boolean; width?: number; weight?: "400" | "700" } = {}): Text {
  const t = new Text({
    text,
    style: {
      fontFamily: opts.display ? FONT_DISPLAY : FONT_BODY,
      fontSize: size,
      fontWeight: opts.weight ?? (opts.display ? "400" : "700"),
      fill: opts.color ?? C.burnt,
      align: "center",
      wordWrap: opts.width !== undefined,
      wordWrapWidth: opts.width ?? 0,
      lineHeight: size * 1.2,
    },
  });
  t.anchor.set(0.5);
  return t;
}

export function toastSprite(texture: Texture, height: number): Sprite {
  const s = new Sprite(texture);
  s.anchor.set(0.5, 1);
  const k = height / texture.height;
  s.scale.set(k);
  return s;
}

/** Toaster body with a slot. Width-based so it scales with the stage. */
export function toaster(w: number): { back: Graphics; front: Container; slotY: number } {
  const h = w * 0.62;
  const back = new Graphics().roundRect(w * 0.18, -h - 6, w * 0.64, 18, 8).fill(C.burnt);

  const front = new Container();
  const body = new Graphics()
    .roundRect(0, -h, w, h, w * 0.16)
    .fill(C.crust)
    .stroke({ width: 6, color: C.burnt });
  const shine = new Graphics().roundRect(w * 0.08, -h + 16, w * 0.84, h * 0.18, 10).fill({ color: C.white, alpha: 0.22 });
  const dial = new Graphics()
    .circle(w * 0.82, -h * 0.42, w * 0.075)
    .fill(C.white)
    .stroke({ width: 5, color: C.burnt })
    .moveTo(w * 0.82, -h * 0.42)
    .lineTo(w * 0.82 + w * 0.05, -h * 0.42 - w * 0.03)
    .stroke({ width: 5, color: C.burnt, cap: "round" });
  const lever = new Graphics().roundRect(-w * 0.06, -h * 0.62, w * 0.1, h * 0.14, 6).fill(C.burnt);
  const feetL = new Graphics().roundRect(w * 0.12, -4, w * 0.14, 12, 4).fill(C.burnt);
  const feetR = new Graphics().roundRect(w * 0.74, -4, w * 0.14, 12, 4).fill(C.burnt);
  front.addChild(feetL, feetR, body, shine, dial, lever);
  return { back, front, slotY: -h };
}

export function butterPat(size: number): Graphics {
  const w = size;
  const h = size * 0.62;
  return new Graphics()
    .roundRect(-w / 2, -h / 2, w, h, size * 0.12)
    .fill(C.butter)
    .stroke({ width: 4, color: C.burnt })
    .roundRect(-w / 2 + 8, -h / 2 + 7, w * 0.34, h * 0.2, 4)
    .fill({ color: C.white, alpha: 0.85 });
}

export function crumb(size: number, seed: number): Graphics {
  const g = new Graphics();
  const pts: number[] = [];
  const n = 9;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = (size / 2) * (0.72 + 0.28 * Math.abs(Math.sin(seed * 3.1 + i * 1.7)));
    pts.push(Math.cos(a) * r, Math.sin(a) * r);
  }
  g.poly(pts).fill(C.burnt);
  g.circle(-size * 0.12, -size * 0.1, size * 0.06).fill({ color: C.crust, alpha: 0.9 });
  g.circle(size * 0.14, size * 0.08, size * 0.05).fill({ color: C.crust, alpha: 0.9 });
  return g;
}

export function notificationCard(width: number, from: string, text: string): Container {
  const h = 74;
  const c = new Container();
  const card = new Graphics().roundRect(0, 0, width, h, 16).fill(C.white).stroke({ width: 4, color: C.burnt });
  const icon = new Graphics().roundRect(12, 14, 46, 46, 12).fill(C.crust).stroke({ width: 3, color: C.burnt });
  const initial = label(from.charAt(0), 24, { display: true, color: C.white });
  initial.position.set(35, 38);
  const fromText = new Text({ text: from, style: { fontFamily: FONT_BODY, fontSize: 15, fontWeight: "700", fill: C.burnt } });
  fromText.position.set(70, 13);
  const body = new Text({
    text,
    style: { fontFamily: FONT_BODY, fontSize: 15, fill: C.burnt, wordWrap: true, wordWrapWidth: width - 82 },
  });
  body.position.set(70, 34);
  c.addChild(card, icon, initial, fromText, body);
  return c;
}

export const INGREDIENT_LABELS: Record<Ingredient, string> = {
  butter: "Butter",
  jam: "Jam",
  egg: "Egg",
  cheese: "Cheese",
  honey: "Honey",
  mushroom: "Mushroom",
};

/** Ingredient icon centered on (0, 0), roughly `s` wide. Shapes differ so color is never the only cue. */
export function ingredientIcon(kind: Ingredient, s: number): Graphics {
  const g = new Graphics();
  const stroke = { width: Math.max(3, s * 0.05), color: C.burnt };
  switch (kind) {
    case "butter":
      g.roundRect(-s * 0.45, -s * 0.28, s * 0.9, s * 0.56, s * 0.1).fill(C.butter).stroke(stroke);
      g.roundRect(-s * 0.32, -s * 0.18, s * 0.3, s * 0.1, 3).fill({ color: C.white, alpha: 0.85 });
      break;
    case "jam":
      g.roundRect(-s * 0.3, -s * 0.28, s * 0.6, s * 0.66, s * 0.12).fill(C.jam).stroke(stroke);
      g.roundRect(-s * 0.34, -s * 0.44, s * 0.68, s * 0.18, 4).fill(C.white).stroke(stroke);
      g.roundRect(-s * 0.18, -s * 0.1, s * 0.36, s * 0.24, 4).fill(C.white);
      break;
    case "egg":
      g.ellipse(0, 0, s * 0.46, s * 0.38).fill(C.white).stroke(stroke);
      g.circle(s * 0.04, -s * 0.02, s * 0.17).fill(C.butter).stroke(stroke);
      break;
    case "cheese":
      g.poly([-s * 0.46, s * 0.32, s * 0.46, s * 0.32, s * 0.46, -s * 0.3]).fill(C.butter).stroke(stroke);
      g.circle(s * 0.22, s * 0.12, s * 0.07).fill(C.crust);
      g.circle(s * 0.0, s * 0.22, s * 0.05).fill(C.crust);
      g.circle(s * 0.32, -s * 0.06, s * 0.05).fill(C.crust);
      break;
    case "honey":
      g.moveTo(0, -s * 0.46)
        .bezierCurveTo(s * 0.1, -s * 0.2, s * 0.38, 0, s * 0.38, s * 0.16)
        .arc(0, s * 0.16, s * 0.38, 0, Math.PI)
        .bezierCurveTo(-s * 0.38, 0, -s * 0.1, -s * 0.2, 0, -s * 0.46)
        .fill(C.crust)
        .stroke(stroke);
      g.ellipse(-s * 0.12, s * 0.12, s * 0.07, s * 0.12).fill({ color: C.white, alpha: 0.7 });
      break;
    case "mushroom":
      g.roundRect(-s * 0.14, -s * 0.02, s * 0.28, s * 0.42, s * 0.08).fill(C.white).stroke(stroke);
      g.moveTo(-s * 0.46, s * 0.02)
        .bezierCurveTo(-s * 0.46, -s * 0.5, s * 0.46, -s * 0.5, s * 0.46, s * 0.02)
        .closePath()
        .fill(C.crust)
        .stroke(stroke);
      g.circle(-s * 0.16, -s * 0.18, s * 0.06).fill(C.white);
      g.circle(s * 0.14, -s * 0.24, s * 0.05).fill(C.white);
      break;
  }
  return g;
}
