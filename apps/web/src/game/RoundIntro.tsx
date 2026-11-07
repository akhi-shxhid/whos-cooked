import styles from "./RoundIntro.module.css";

export interface RoundIntroProps {
  label: string;
  title: string;
  instruction: string;
  count: number | null;
  loading?: boolean;
}

/** One sentence of instruction and a short countdown before each round (PRD section 5). */
export function RoundIntro({ label, title, instruction, count, loading = false }: RoundIntroProps) {
  return (
    <div className={styles.intro} aria-live="assertive">
      <p className={styles.label}>{label}</p>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.instruction}>{instruction}</p>
      <div className={styles.count} aria-hidden={count === null}>
        {loading ? <span className={styles.loading}>Heating up</span> : count}
      </div>
    </div>
  );
}
