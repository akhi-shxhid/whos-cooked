import { useId } from "react";
import { contrastRatio, mix } from "../color.ts";
import { crumbColor, crustColor } from "../doneness.ts";
import { colors } from "../tokens.ts";

export type ToastMood = "neutral" | "happy" | "focused" | "shocked" | "smug" | "panic";

/** Toast Locker spreads. Colors come only from brand tokens. */
export type ToastSpread = "plain" | "butter" | "jam" | "honey" | "cocoa" | "sprinkles";

export interface ToastMascotProps {
  /** 0 = raw bread, 100 = charcoal. Usually the Cooked Score. */
  doneness?: number;
  mood?: ToastMood;
  /** -1 (stretched tall) to 1 (squashed flat). 0 is at rest. */
  squash?: number;
  /** Pupil direction, -1 to 1 on each axis. */
  lookX?: number;
  lookY?: number;
  /** 0 to 1. Defaults to on when the mood is panic. */
  sweat?: number;
  /** 0 to 1. Defaults to rising from doneness 75 upward. */
  smoke?: number;
  /** Cosmetic spread across the top of the slice. */
  spread?: ToastSpread;
  /** Rendered size in px. The SVG keeps its own aspect ratio. */
  size?: number;
  /** Accessible name. Pass `null` when the toast is purely decorative. */
  title?: string | null;
  className?: string | undefined;
}

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : 0));

// Slice silhouette on a 200 x 240 canvas. Base of the slice sits at y = 228.
const SLICE =
  "M38 220 L38 104 C14 98 8 60 30 38 C50 18 82 16 100 28 C118 16 150 18 170 38 " +
  "C192 60 186 98 162 104 L162 220 Q162 228 154 228 L46 228 Q38 228 38 220 Z";
const BASE_X = 100;
const BASE_Y = 228;

/**
 * The Who's Cooked? toast. Pure and stateless: all motion comes from the
 * caller changing props (Motion in the app, frame values in Remotion).
 */
export function ToastMascot({
  doneness = 0,
  mood = "neutral",
  squash = 0,
  lookX = 0,
  lookY = 0,
  sweat,
  smoke,
  spread = "plain",
  size = 200,
  title = "Toast mascot",
  className,
}: ToastMascotProps) {
  const titleId = useId();
  const d = clamp(doneness, 0, 100);
  const s = clamp(squash, -1, 1);
  const lx = clamp(lookX, -1, 1) * 5;
  const ly = clamp(lookY, -1, 1) * 5;
  const sweatAmount = clamp(sweat ?? (mood === "panic" ? 1 : 0), 0, 1);
  const smokeAmount = clamp(smoke ?? (d - 75) / 25, 0, 1);

  const crumb = crumbColor(d);
  const crust = crustColor(d);
  // Face ink is whichever of burnt or white reads better on this crumb.
  const ink = contrastRatio(crumb, colors.burnt) >= contrastRatio(crumb, colors.white) ? colors.burnt : colors.white;

  const sx = 1 + 0.18 * s;
  const sy = 1 - 0.18 * s;
  const bodyTransform = `translate(${BASE_X} ${BASE_Y}) scale(${sx} ${sy}) translate(${-BASE_X} ${-BASE_Y})`;

  const eyeScale = mood === "shocked" || mood === "panic" ? 1.15 : 1;
  const pupilR = mood === "shocked" ? 4 : 6;

  return (
    <svg
      viewBox="0 0 200 240"
      width={size}
      height={(size * 240) / 200}
      className={className}
      role={title === null ? undefined : "img"}
      aria-hidden={title === null ? true : undefined}
      aria-labelledby={title === null ? undefined : titleId}
      style={{ overflow: "visible" }}
    >
      {title !== null && <title id={titleId}>{title}</title>}

      {smokeAmount > 0 && (
        <g
          fill="none"
          stroke={colors.burnt}
          strokeWidth={7}
          strokeLinecap="round"
          opacity={0.25 + 0.45 * smokeAmount}
        >
          <path d={`M70 14 c-10 -12 10 -20 0 -${18 + 14 * smokeAmount}`} />
          <path d={`M130 14 c10 -12 -10 -20 0 -${18 + 14 * smokeAmount}`} />
          {smokeAmount > 0.5 && <path d="M100 6 c-9 -10 9 -18 0 -34" />}
        </g>
      )}

      <g transform={bodyTransform}>
        <path d={SLICE} fill={crust} stroke={colors.burnt} strokeWidth={6} strokeLinejoin="round" />
        <path
          d={SLICE}
          fill={crumb}
          transform={`translate(100 130) scale(0.84 0.86) translate(-100 -130)`}
        />

        <Spread spread={spread} />
        <Brows mood={mood} ink={ink} />

        {[72, 128].map((cx) => (
          <g key={cx} transform={`translate(${cx} 124) scale(${eyeScale}) translate(${-cx} -124)`}>
            <ellipse cx={cx} cy={124} rx={14} ry={16} fill={colors.white} stroke={colors.burnt} strokeWidth={4} />
            <circle cx={cx + lx} cy={126 + ly} r={pupilR} fill={colors.burnt} />
            {mood === "smug" && (
              <path
                d={`M${cx - 15} 124 A15 16 0 0 1 ${cx + 15} 124 Z`}
                fill={crumb}
                stroke={colors.burnt}
                strokeWidth={4}
              />
            )}
          </g>
        ))}

        <Mouth mood={mood} ink={ink} />

        {sweatAmount > 0 && (
          <path
            d="M166 96 C166 96 156 110 156 116 A10 10 0 0 0 176 116 C176 110 166 96 166 96 Z"
            fill={colors.white}
            stroke={colors.burnt}
            strokeWidth={3.5}
            opacity={sweatAmount}
          />
        )}
      </g>
    </svg>
  );
}

function Brows({ mood, ink }: { mood: ToastMood; ink: string }) {
  const brow = (d: string) => (
    <path d={d} fill="none" stroke={ink} strokeWidth={6} strokeLinecap="round" />
  );
  switch (mood) {
    case "focused":
      return (
        <>
          {brow("M58 98 L84 104")}
          {brow("M142 98 L116 104")}
        </>
      );
    case "panic":
      return (
        <>
          {brow("M60 96 L84 88")}
          {brow("M140 96 L116 88")}
        </>
      );
    case "shocked":
      return (
        <>
          {brow("M60 90 Q72 80 84 88")}
          {brow("M116 88 Q128 80 140 90")}
        </>
      );
    case "smug":
      return (
        <>
          {brow("M60 100 L84 98")}
          {brow("M116 94 Q128 86 140 92")}
        </>
      );
    default:
      return null;
  }
}

function Mouth({ mood, ink }: { mood: ToastMood; ink: string }) {
  const line = { fill: "none", stroke: ink, strokeWidth: 6, strokeLinecap: "round" as const };
  switch (mood) {
    case "happy":
      return <path d="M80 158 Q100 186 120 158 Z" fill={ink} stroke={ink} strokeWidth={4} strokeLinejoin="round" />;
    case "focused":
      return <path d="M90 166 L110 166" {...line} />;
    case "shocked":
      return <ellipse cx={100} cy={170} rx={9} ry={12} fill={ink} />;
    case "smug":
      return <path d="M86 166 Q104 172 118 158" {...line} />;
    case "panic":
      return <path d="M78 172 q5.5 -9 11 0 t11 0 t11 0 t11 0" {...line} strokeLinejoin="round" />;
    default:
      return <path d="M86 164 Q100 172 114 164" {...line} />;
  }
}

// Spread blob across the top of the crumb, clear of the brows and eyes.
const SPREAD_PATH =
  "M48 72 C52 52 80 46 100 56 C120 44 150 50 154 72 C157 84 146 86 142 92 C137 99 128 90 120 95 " +
  "C110 101 104 90 94 95 C84 100 76 92 68 94 C58 96 46 86 48 72 Z";

function Spread({ spread }: { spread: ToastSpread }) {
  if (spread === "plain") return null;
  const fills: Record<Exclude<ToastSpread, "plain">, string> = {
    butter: colors.butter,
    jam: colors.jam,
    honey: mix(colors.crust, colors.butter, 0.45),
    cocoa: mix(colors.burnt, colors.crust, 0.35),
    sprinkles: colors.white,
  };
  return (
    <g>
      <path d={SPREAD_PATH} fill={fills[spread]} stroke={colors.burnt} strokeWidth={3} strokeLinejoin="round" />
      {spread !== "cocoa" && <path d="M66 64 C74 58 84 58 90 62" fill="none" stroke={colors.white} strokeWidth={4} strokeLinecap="round" opacity={0.7} />}
      {spread === "sprinkles" &&
        [
          [70, 72, colors.jam, 20],
          [92, 66, colors.plate, -30],
          [112, 74, colors.butter, 10],
          [132, 66, colors.jam, 40],
          [82, 84, colors.butter, -10],
          [124, 84, colors.plate, 25],
          [104, 82, colors.crust, -40],
        ].map(([x, y, c, r]) => (
          <rect key={`${x}-${y}`} x={Number(x) - 5} y={Number(y) - 2} width={10} height={4} rx={2} fill={String(c)} transform={`rotate(${r} ${x} ${y})`} />
        ))}
    </g>
  );
}
