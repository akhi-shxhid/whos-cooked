import { colors } from "../tokens.ts";

export interface SubScoreBarProps {
  label: string;
  /** 0 to 100, higher means sharper. */
  value: number;
  className?: string | undefined;
}

/** One sub-score with its number always shown, so the bar is never the only signal. */
export function SubScoreBar({ label, value, className }: SubScoreBarProps) {
  const v = Math.round(Math.min(100, Math.max(0, value)));
  return (
    <div className={className} style={{ display: "grid", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
        <span>{label}</span>
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: 22, lineHeight: 1 }}>{v}</span>
      </div>
      <div
        role="meter"
        aria-label={`${label}, higher is sharper`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={v}
        style={{
          height: 18,
          background: colors.white,
          border: `3px solid ${colors.burnt}`,
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        <div style={{ width: `${v}%`, height: "100%", background: colors.plate }} />
      </div>
    </div>
  );
}
