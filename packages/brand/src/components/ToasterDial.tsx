import { crumbColor } from "../doneness.ts";
import { colors } from "../tokens.ts";

export interface ToasterDialProps {
  /** 0 to 100. Usually the Cooked Score or a reveal in progress. */
  value: number;
  size?: number;
  /** Accessible name. Pass `null` when the dial is decorative. */
  title?: string | null;
  className?: string | undefined;
}

const START = -130;
const END = 130;
const zones = [10, 30, 50, 70, 90];

function polar(r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: 100 + r * Math.cos(rad), y: 100 + r * Math.sin(rad) };
}

function arc(r: number, from: number, to: number) {
  const a = polar(r, from);
  const b = polar(r, to);
  return `M${a.x} ${a.y} A${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${b.x} ${b.y}`;
}

/** Toaster doneness dial. Pure SVG driven by `value`; animate it from outside. */
export function ToasterDial({ value, size = 160, title = "Toaster dial", className }: ToasterDialProps) {
  const v = Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));
  const angle = START + ((END - START) * v) / 100;
  const tip = polar(58, angle);
  const span = (END - START) / zones.length;

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={className}
      role={title === null ? undefined : "img"}
      aria-hidden={title === null ? true : undefined}
      aria-label={title ?? undefined}
    >
      <circle cx={100} cy={100} r={92} fill={colors.white} stroke={colors.burnt} strokeWidth={8} />
      {zones.map((mid, i) => (
        <path
          key={mid}
          d={arc(74, START + i * span + 2, START + (i + 1) * span - 2)}
          fill="none"
          stroke={crumbColor(mid)}
          strokeWidth={16}
        />
      ))}
      {Array.from({ length: 11 }, (_, i) => {
        const deg = START + ((END - START) * i) / 10;
        const a = polar(56, deg);
        const b = polar(i % 5 === 0 ? 44 : 50, deg);
        return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={colors.burnt} strokeWidth={4} strokeLinecap="round" />;
      })}
      <line x1={100} y1={100} x2={tip.x} y2={tip.y} stroke={colors.burnt} strokeWidth={9} strokeLinecap="round" />
      <circle cx={100} cy={100} r={14} fill={colors.crust} stroke={colors.burnt} strokeWidth={6} />
    </svg>
  );
}
