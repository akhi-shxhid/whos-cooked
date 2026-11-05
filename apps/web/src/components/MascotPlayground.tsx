import { useState } from "react";
import { ToastMascot, type ToastMood } from "@whoscooked/brand";
import styles from "./MascotPlayground.module.css";

const moods: ToastMood[] = ["neutral", "happy", "focused", "shocked", "smug", "panic"];

/** Internal design tool for reviewing the mascot's props. Not linked from the product. */
export default function MascotPlayground() {
  const [doneness, setDoneness] = useState(40);
  const [mood, setMood] = useState<ToastMood>("neutral");
  const [squash, setSquash] = useState(0);
  const [lookX, setLookX] = useState(0);
  const [lookY, setLookY] = useState(0);

  const sliders = [
    { label: "Doneness", value: doneness, set: setDoneness, min: 0, max: 100, step: 1 },
    { label: "Squash", value: squash, set: setSquash, min: -1, max: 1, step: 0.05 },
    { label: "Look X", value: lookX, set: setLookX, min: -1, max: 1, step: 0.05 },
    { label: "Look Y", value: lookY, set: setLookY, min: -1, max: 1, step: 0.05 },
  ];

  return (
    <div className={styles.wrap}>
      <div className={styles.preview}>
        <ToastMascot doneness={doneness} mood={mood} squash={squash} lookX={lookX} lookY={lookY} size={240} />
      </div>
      <fieldset className={styles.moods}>
        <legend>Mood</legend>
        {moods.map((m) => (
          <label key={m} className={m === mood ? styles.moodActive : styles.mood}>
            <input type="radio" name="mood" value={m} checked={m === mood} onChange={() => setMood(m)} />
            {m}
          </label>
        ))}
      </fieldset>
      {sliders.map((s) => (
        <label key={s.label} className={styles.slider}>
          <span>
            {s.label} <output>{s.value}</output>
          </span>
          <input
            type="range"
            min={s.min}
            max={s.max}
            step={s.step}
            value={s.value}
            onChange={(e) => s.set(Number(e.currentTarget.value))}
          />
        </label>
      ))}
      <div className={styles.strip} role="group" aria-label="Doneness from 0 to 100">
        {[0, 20, 40, 60, 80, 100].map((d) => (
          <figure key={d}>
            <ToastMascot doneness={d} mood={mood} size={52} title={null} />
            <figcaption>{d}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
