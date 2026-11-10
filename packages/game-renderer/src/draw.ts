import { Container, Graphics, Sprite, Text, type Texture } from "pixi.js";
import { symbol, type SymbolKey } from "@whoscooked/game-core";
import { cleanPolygon } from "./shapes.ts";
import { C, FONT_BODY, FONT_DISPLAY, FONT_EMOJI, ink } from "./stage.ts";

export function label(text: string, size: number, opts: { color?: number; display?: boolean; width?: number } = {}): Text {
  const t = new Text({
    text,
    style: {
      fontFamily: opts.display ? FONT_DISPLAY : FONT_BODY,
      fontSize: size,
      fontWeight: opts.display ? "800" : "700",
      fill: opts.color ?? C.line,
      align: "center",
      wordWrap: opts.width !== undefined,
      wordWrapWidth: opts.width ?? 0,
      lineHeight: size * 1.15,
      letterSpacing: opts.display ? -0.5 : 0,
    },
  });
  t.anchor.set(0.5);
  return t;
}

/** A symbol emoji (💀🔥🧢🗿💅👀) drawn with the system emoji font. */
export function glyph(key: SymbolKey, size: number): Text {
  const t = new Text({ text: symbol(key).glyph, style: { fontFamily: FONT_EMOJI, fontSize: size, align: "center" } });
  t.anchor.set(0.5);
  return t;
}

export function sprite(texture: Texture, height: number): Sprite {
  const s = new Sprite(texture);
  s.anchor.set(0.5, 1);
  s.scale.set(height / texture.height);
  return s;
}

/** Chunky dark toaster with a glowing slot and a heat dial. */
export function toaster(w: number): { back: Graphics; front: Container; slotY: number } {
  const h = w * 0.6;
  const back = new Graphics().roundRect(w * 0.16, -h - 8, w * 0.68, 20, 8).fill(C.line);
  const front = new Container();
  const body = new Graphics().roundRect(0, -h, w, h, w * 0.14).fill(C.panel2).stroke(ink(6));
  const glow = new Graphics().roundRect(w * 0.18, -h + 4, w * 0.64, 8, 4).fill(C.heat);
  const shine = new Graphics().roundRect(w * 0.08, -h + 18, w * 0.84, h * 0.14, 8).fill({ color: C.white, alpha: 0.1 });
  const dial = new Graphics()
    .circle(w * 0.8, -h * 0.42, w * 0.08)
    .fill(C.heat)
    .stroke(ink(5))
    .moveTo(w * 0.8, -h * 0.42)
    .lineTo(w * 0.8 + w * 0.05, -h * 0.42 - w * 0.035)
    .stroke(ink(5));
  const lever = new Graphics().roundRect(-w * 0.07, -h * 0.62, w * 0.11, h * 0.14, 6).fill(C.line);
  const feetL = new Graphics().roundRect(w * 0.12, -4, w * 0.14, 12, 4).fill(C.line);
  const feetR = new Graphics().roundRect(w * 0.74, -4, w * 0.14, 12, 4).fill(C.line);
  front.addChild(feetL, feetR, body, glow, shine, dial, lever);
  return { back, front, slotY: -h };
}

/** Green flag (go) or red flag (no-go). Shapes differ too: a check vs a cross. */
export function flag(green: boolean, size: number): Graphics {
  const g = new Graphics();
  const pole = size * 0.06;
  g.roundRect(-size * 0.32, -size * 0.46, pole, size * 0.92, pole / 2).fill(C.line);
  const cloth = cleanPolygon([
    -size * 0.27, -size * 0.44,
    size * 0.36, -size * 0.34,
    size * 0.2, -size * 0.16,
    size * 0.38, size * 0.02,
    -size * 0.27, size * 0.04,
  ]);
  g.poly(cloth, true).fill(green ? C.acid : C.danger).stroke(ink(Math.max(3, size * 0.05)));
  if (green) {
    g.moveTo(-size * 0.12, -size * 0.2).lineTo(-size * 0.02, -size * 0.1).lineTo(size * 0.16, -size * 0.3).stroke(ink(Math.max(3, size * 0.06)));
  } else {
    g.moveTo(-size * 0.1, -size * 0.3).lineTo(size * 0.12, -size * 0.1).moveTo(size * 0.12, -size * 0.3).lineTo(-size * 0.1, -size * 0.1).stroke(ink(Math.max(3, size * 0.06), C.white));
  }
  return g;
}

/** A phone for CATCH!. */
export function phone(size: number): Graphics {
  const w = size * 0.56;
  const h = size;
  return new Graphics()
    .roundRect(-w / 2, -h / 2, w, h, size * 0.12)
    .fill(C.panel2)
    .stroke(ink(Math.max(3, size * 0.05)))
    .roundRect(-w / 2 + size * 0.06, -h / 2 + size * 0.1, w - size * 0.12, h - size * 0.22, size * 0.05)
    .fill(C.ice)
    .roundRect(-size * 0.08, -h / 2 + size * 0.03, size * 0.16, size * 0.035, 2)
    .fill(C.line);
}

export function notificationCard(width: number, from: string, text: string): Container {
  const h = 76;
  const c = new Container();
  c.addChild(new Graphics().roundRect(5, 5, width, h, 16).fill(C.line));
  c.addChild(new Graphics().roundRect(0, 0, width, h, 16).fill(C.white).stroke(ink(4)));
  c.addChild(new Graphics().roundRect(12, 14, 46, 46, 12).fill(C.heat).stroke(ink(3)));
  const initial = label(from.charAt(0), 24, { display: true, color: C.line });
  initial.position.set(35, 38);
  const fromText = new Text({ text: from, style: { fontFamily: FONT_BODY, fontSize: 15, fontWeight: "700", fill: C.line } });
  fromText.position.set(70, 12);
  const body = new Text({ text, style: { fontFamily: FONT_BODY, fontSize: 15, fill: C.line, wordWrap: true, wordWrapWidth: width - 82 } });
  body.position.set(70, 33);
  c.addChild(initial, fromText, body);
  return c;
}
