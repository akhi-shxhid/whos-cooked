import { useId, type ReactNode } from "react";
import { palette } from "../tokens.ts";

/**
 * The Cooked Crew: original characters built on Gen Z slang archetypes
 * (docs/decision.md, "Decision 2"). Pure SVG driven by props, no animation
 * library, so the game canvas, share cards, and clips all draw the same thing.
 */
export type CrewKey =
  | "toasty" | "npc" | "doomscroll" | "delulu" | "sigma" | "goblin"
  | "rizzler" | "maincharacter" | "moai" | "glitch" | "microwave";

export type CrewMood = "neutral" | "happy" | "shocked" | "smug" | "panic";

export interface CharacterProps {
  who: CrewKey;
  mood?: CrewMood;
  /** -1..1 pupil offset. */
  lookX?: number;
  lookY?: number;
  size?: number;
  /** Accessible name; `null` when decorative. */
  title?: string | null;
  className?: string | undefined;
}

type EyeStyle = "normal" | "lidded" | "tired" | "spiral" | "dots" | "shades" | "pixel" | "heavy";

interface Look {
  body: ReactNode;
  /** Face center line. */
  eyeY: number;
  mouthY: number;
  eyeGap: number;
  eyes: EyeStyle;
  ink: string;
  extra?: ReactNode;
}

const L = palette.line;
const SW = 7;

function look(who: CrewKey): Look {
  switch (who) {
    case "toasty":
      return {
        body: (
          <>
            <path d="M38 220 L38 104 C14 98 8 60 30 38 C50 18 82 16 100 28 C118 16 150 18 170 38 C192 60 186 98 162 104 L162 220 Q162 228 154 228 L46 228 Q38 228 38 220 Z" fill="#7A4524" stroke={L} strokeWidth={SW} strokeLinejoin="round" />
            <path d="M52 214 L52 108 C34 100 30 70 46 52 C62 36 86 36 100 46 C114 36 138 36 154 52 C170 70 166 100 148 108 L148 214 Z" fill="#B76B34" />
          </>
        ),
        eyeY: 122, mouthY: 168, eyeGap: 28, eyes: "lidded", ink: L,
        extra: <path d="M150 60 l14 -10" stroke={L} strokeWidth={5} strokeLinecap="round" />,
      };
    case "npc":
      return {
        body: <rect x={36} y={52} width={128} height={172} rx={18} fill="#B9B6C2" stroke={L} strokeWidth={SW} strokeLinejoin="round" />,
        eyeY: 116, mouthY: 160, eyeGap: 26, eyes: "dots", ink: L,
        extra: <rect x={60} y={196} width={80} height={10} rx={4} fill="#9A97A3" />,
      };
    case "doomscroll":
      return {
        body: (
          <>
            <rect x={44} y={20} width={112} height={208} rx={22} fill="#24242C" stroke={L} strokeWidth={SW} strokeLinejoin="round" />
            <rect x={54} y={36} width={92} height={172} rx={10} fill={palette.ice} />
            <rect x={86} y={26} width={28} height={5} rx={2.5} fill="#3A3A45" />
          </>
        ),
        eyeY: 112, mouthY: 160, eyeGap: 24, eyes: "tired", ink: L,
      };
    case "delulu":
      return {
        body: <path d="M50 214 C22 214 16 176 40 166 C20 150 30 112 62 116 C60 80 104 66 122 92 C146 74 182 98 168 132 C194 140 192 182 166 190 C170 214 140 222 128 210 C110 226 72 228 50 214 Z" fill="#FF9EC4" stroke={L} strokeWidth={SW} strokeLinejoin="round" />,
        eyeY: 150, mouthY: 186, eyeGap: 26, eyes: "spiral", ink: L,
      };
    case "sigma":
      return {
        body: (
          <>
            <path d="M40 92 L100 62 L160 92 L160 196 L100 226 L40 196 Z" fill={palette.ice} stroke={L} strokeWidth={SW} strokeLinejoin="round" />
            <path d="M40 92 L100 122 L160 92 M100 122 L100 226" fill="none" stroke={L} strokeWidth={4} strokeLinejoin="round" opacity={0.35} />
          </>
        ),
        eyeY: 150, mouthY: 190, eyeGap: 22, eyes: "heavy", ink: L,
      };
    case "goblin":
      return {
        body: (
          <>
            <path d="M28 120 L8 92 L52 104 C70 70 130 70 148 104 L192 92 L172 120 C186 170 160 226 100 226 C40 226 14 170 28 120 Z" fill={palette.acid} stroke={L} strokeWidth={SW} strokeLinejoin="round" />
          </>
        ),
        eyeY: 136, mouthY: 182, eyeGap: 30, eyes: "normal", ink: L,
      };
    case "rizzler":
      return {
        body: <path d="M100 18 C130 60 168 92 168 150 C168 196 138 226 100 226 C62 226 32 196 32 150 C32 112 60 96 72 62 C82 84 92 90 100 18 Z" fill={palette.heat} stroke={L} strokeWidth={SW} strokeLinejoin="round" />,
        eyeY: 146, mouthY: 186, eyeGap: 26, eyes: "lidded", ink: L,
      };
    case "maincharacter":
      return {
        body: (
          <>
            <circle cx={100} cy={146} r={78} fill="#FFD23F" stroke={L} strokeWidth={SW} />
            <path d="M58 76 L66 34 L86 62 L100 26 L114 62 L134 34 L142 76 Z" fill="#FFD23F" stroke={L} strokeWidth={6} strokeLinejoin="round" />
          </>
        ),
        eyeY: 140, mouthY: 182, eyeGap: 28, eyes: "shades", ink: L,
      };
    case "moai":
      return {
        body: <path d="M60 30 L140 30 C150 30 156 40 154 52 L148 120 L160 150 L146 160 L144 220 L56 220 L58 120 L48 104 L56 92 Z" fill="#8F8A84" stroke={L} strokeWidth={SW} strokeLinejoin="round" />,
        eyeY: 100, mouthY: 176, eyeGap: 26, eyes: "heavy", ink: L,
        extra: <path d="M92 116 L92 150 Q100 158 108 150" fill="none" stroke={L} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />,
      };
    case "glitch":
      return {
        body: (
          <>
            <rect x={46} y={60} width={120} height={160} fill={palette.danger} transform="translate(-8 0)" />
            <rect x={46} y={60} width={120} height={160} fill={palette.ice} transform="translate(8 0)" />
            <rect x={46} y={60} width={120} height={160} fill="#2B2B35" stroke={L} strokeWidth={SW} />
            {[90, 122, 154, 186].map((y) => (
              <rect key={y} x={46} y={y} width={120} height={4} fill="#3C3C49" />
            ))}
          </>
        ),
        eyeY: 124, mouthY: 168, eyeGap: 26, eyes: "pixel", ink: palette.acid,
      };
    case "microwave":
      return {
        body: (
          <>
            <rect x={14} y={70} width={172} height={140} rx={14} fill="#D9D6DE" stroke={L} strokeWidth={SW} strokeLinejoin="round" />
            <rect x={28} y={86} width={112} height={108} rx={8} fill="#2B2B35" stroke={L} strokeWidth={5} />
            <rect x={150} y={88} width={24} height={14} rx={3} fill={palette.acid} stroke={L} strokeWidth={3} />
            <circle cx={162} cy={136} r={9} fill="#fff" stroke={L} strokeWidth={4} />
            <circle cx={162} cy={170} r={9} fill="#fff" stroke={L} strokeWidth={4} />
          </>
        ),
        eyeY: 130, mouthY: 168, eyeGap: 22, eyes: "normal", ink: "#fff",
      };
  }
}

function Eyes({ style, x, y, mood, lx, ly, ink }: { style: EyeStyle; x: number; y: number; mood: CrewMood; lx: number; ly: number; ink: string }) {
  const big = mood === "shocked" || mood === "panic";
  const r = big ? 15 : 13;
  switch (style) {
    case "dots":
      return <circle cx={x + lx * 2} cy={y + ly * 2} r={big ? 8 : 6} fill={ink} />;
    case "spiral":
      return <path d={`M${x} ${y} m-2 0 a2 2 0 1 1 4 0 a5 5 0 1 1 -10 0 a8 8 0 1 1 16 0 a11 11 0 1 1 -22 0`} fill="none" stroke={ink} strokeWidth={3.5} strokeLinecap="round" />;
    case "shades":
      return <rect x={x - 17} y={y - 10} width={34} height={20} rx={7} fill={L} />;
    case "pixel":
      return <rect x={x - 8 + lx * 3} y={y - 8 + ly * 3} width={16} height={16} fill={ink} />;
    default: {
      const lid = style === "lidded" || (style === "heavy" && mood !== "shocked") || mood === "smug";
      return (
        <g>
          <ellipse cx={x} cy={y} rx={r} ry={r + 2} fill="#fff" stroke={L} strokeWidth={4} />
          <circle cx={x + lx * 5} cy={y + 2 + ly * 4} r={mood === "shocked" ? 4 : 6} fill={L} />
          {lid && <path d={`M${x - r - 1} ${y} A${r + 1} ${r + 3} 0 0 1 ${x + r + 1} ${y} Z`} fill={L} opacity={0.92} />}
          {style === "tired" && <path d={`M${x - 11} ${y + r + 6} q11 6 22 0`} fill="none" stroke="#7A5CFF" strokeWidth={4} strokeLinecap="round" opacity={0.8} />}
          {style === "heavy" && <path d={`M${x - 16} ${y - r - 6} L${x + 16} ${y - r - 2}`} stroke={L} strokeWidth={8} strokeLinecap="round" transform={x > 100 ? `scale(-1 1) translate(${-2 * x} 0)` : undefined} />}
        </g>
      );
    }
  }
}

function Mouth({ mood, y, ink }: { mood: CrewMood; y: number; ink: string }) {
  const line = { fill: "none", stroke: ink, strokeWidth: 6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (mood) {
    case "happy":
      return <path d={`M80 ${y - 6} Q100 ${y + 20} 120 ${y - 6} Z`} fill={ink} stroke={ink} strokeWidth={4} strokeLinejoin="round" />;
    case "shocked":
      return <ellipse cx={100} cy={y + 2} rx={9} ry={12} fill={ink} />;
    case "smug":
      return <path d={`M84 ${y} Q104 ${y + 8} 120 ${y - 8}`} {...line} />;
    case "panic":
      return <path d={`M78 ${y + 4} q5.5 -9 11 0 t11 0 t11 0 t11 0`} {...line} />;
    default:
      return <path d={`M86 ${y} L114 ${y}`} {...line} />;
  }
}

export function Character({ who, mood = "neutral", lookX = 0, lookY = 0, size = 200, title, className }: CharacterProps) {
  const titleId = useId();
  const l = look(who);
  const lx = Math.max(-1, Math.min(1, lookX));
  const ly = Math.max(-1, Math.min(1, lookY));
  const label = title === undefined ? who : title;
  return (
    <svg
      viewBox="0 0 200 240"
      width={size}
      height={(size * 240) / 200}
      className={className}
      role={label === null ? undefined : "img"}
      aria-hidden={label === null ? true : undefined}
      aria-labelledby={label === null ? undefined : titleId}
      style={{ overflow: "visible" }}
    >
      {label !== null && <title id={titleId}>{label}</title>}
      {l.body}
      {l.extra}
      {mood === "panic" && (
        <path d="M168 96 C168 96 158 110 158 116 A10 10 0 0 0 178 116 C178 110 168 96 168 96 Z" fill={palette.ice} stroke={L} strokeWidth={3.5} strokeLinejoin="round" />
      )}
      <Eyes style={l.eyes} x={100 - l.eyeGap} y={l.eyeY} mood={mood} lx={lx} ly={ly} ink={l.ink} />
      <Eyes style={l.eyes} x={100 + l.eyeGap} y={l.eyeY} mood={mood} lx={lx} ly={ly} ink={l.ink} />
      <Mouth mood={mood} y={l.mouthY} ink={l.ink} />
    </svg>
  );
}
