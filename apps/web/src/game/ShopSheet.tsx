import { useEffect, useMemo, useRef, useState } from "react";
import { Character } from "@whoscooked/brand";
import { dailyKey, dailyNumber } from "@whoscooked/game-core";
import { currencyFor, formatPrice, FREE_FEATURES, PRODUCTS, type ProductKey } from "@whoscooked/payments";
import { track } from "@whoscooked/analytics";
import { api } from "./api.ts";
import { bandForYear, storeBand, storedBand, type AgeBand } from "./age.ts";
import type { Progress } from "./progress.ts";
import styles from "./Sheet.module.css";

export type ShopStep = "offer" | "age" | "guardian" | "under13" | "restore" | "confirming" | "unlocked" | "archive";

const LAUNCH = "2026-11-08";

export interface ShopSheetProps {
  initial: ShopStep;
  progress: Progress;
  onClose(): void;
  onPurchased(): Promise<{ plus: boolean; crew: boolean } | null>;
  onPlayArchive(day: string): void;
}

export function ShopSheet({ initial, progress, onClose, onPurchased, onPlayArchive }: ShopSheetProps) {
  const [step, setStep] = useState<ShopStep>(initial);
  const [product, setProduct] = useState<ProductKey>("plus");
  const [year, setYear] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [paymentId, setPaymentId] = useState("");
  const [email, setEmail] = useState("");
  const dialog = useRef<HTMLDivElement>(null);
  const currency = useMemo(() => currencyFor(navigator.language, Intl.DateTimeFormat().resolvedOptions().timeZone), []);
  const price = (k: ProductKey) => formatPrice(PRODUCTS[k], currency, navigator.language);
  const owns = (k: ProductKey) => (k === "plus" ? progress.plus : progress.crew);
  const thisYear = new Date().getUTCFullYear();

  useEffect(() => {
    dialog.current?.querySelector<HTMLElement>("h2")?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, step]);

  useEffect(() => {
    if (step === "offer") track("report_preview_viewed");
  }, [step]);

  // After checkout, wait for the verified webhook before unlocking (PRD section 20).
  useEffect(() => {
    if (step !== "confirming") return;
    let cancelled = false;
    let tries = 0;
    const tick = async () => {
      if (cancelled) return;
      const ok = await onPurchased();
      if (cancelled) return;
      if (ok && (ok.plus || ok.crew)) {
        track("purchase_completed");
        setStep("unlocked");
        return;
      }
      if (++tries < 20) setTimeout(tick, 1500);
      else setError("Your payment is still being confirmed. This can take a minute. If you were charged, restore it with the details from your receipt email.");
    };
    void tick();
    return () => {
      cancelled = true;
    };
  }, [step, onPurchased]);

  async function checkout(band: AgeBand, guardianConfirmed = false) {
    setBusy(true);
    setError("");
    track("checkout_started", { variant: product });
    const r = await api<{ url: string }>("/checkout", { method: "POST", body: JSON.stringify({ product, currency, ageBand: band, guardianConfirmed }) });
    if (r.ok) {
      window.location.href = r.data.url;
      return;
    }
    setBusy(false);
    setError(r.error.message);
    track("purchase_failed");
  }

  function buy(k: ProductKey) {
    setProduct(k);
    setError("");
    const band = storedBand();
    if (!band) return setStep("age");
    if (band === "under13") return setStep("under13");
    if (band === "13to17") return setStep("guardian");
    // State updates are async: pass the product through.
    void (async () => {
      setBusy(true);
      track("checkout_started", { variant: k });
      const r = await api<{ url: string }>("/checkout", { method: "POST", body: JSON.stringify({ product: k, currency, ageBand: "adult" }) });
      if (r.ok) window.location.href = r.data.url;
      else {
        setBusy(false);
        setError(r.error.message);
      }
    })();
  }

  function submitAge() {
    const y = Number(year);
    if (!Number.isInteger(y)) return setError("Pick the year you were born.");
    const band = bandForYear(y);
    storeBand(band);
    setError("");
    if (band === "under13") setStep("under13");
    else if (band === "13to17") setStep("guardian");
    else void checkout("adult");
  }

  async function restore() {
    setBusy(true);
    setError("");
    const r = await api<{ plus: boolean; crew: boolean }>("/restore", { method: "POST", body: JSON.stringify({ paymentId: paymentId.trim(), email: email.trim() }) });
    setBusy(false);
    if (r.ok) {
      await onPurchased();
      setStep("unlocked");
    } else setError(r.error.message);
  }

  const archiveDays = useMemo(() => {
    const out: string[] = [];
    const today = dailyKey();
    for (let t = Date.parse(`${today}T00:00:00Z`) - 86_400_000; out.length < 60; t -= 86_400_000) {
      const key = new Date(t).toISOString().slice(0, 10);
      if (key < LAUNCH) break;
      out.push(key);
    }
    return out;
  }, []);

  return (
    <div className={styles.backdrop} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={dialog} className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby="shop-title">
        <button className={styles.close} onClick={onClose} aria-label="Close">
          Close
        </button>

        {step === "offer" && (
          <>
            <h2 id="shop-title" tabIndex={-1}>
              Shop
            </h2>
            <p className={styles.small}>One-time prices. No subscriptions, no coins, no random boxes. Nothing here changes your score.</p>
            {(["plus", "crew"] as const).map((k) => (
              <div key={k} className={styles.product}>
                <div className={styles.productArt} aria-hidden="true">
                  {k === "plus" ? (
                    <>
                      <Character who="rizzler" mood="smug" size={58} title={null} />
                      <Character who="maincharacter" mood="happy" size={58} title={null} />
                    </>
                  ) : (
                    <>
                      <Character who="moai" size={50} title={null} />
                      <Character who="glitch" mood="happy" size={50} title={null} />
                      <Character who="microwave" mood="shocked" size={50} title={null} />
                    </>
                  )}
                </div>
                <p className={styles.productName}>
                  {PRODUCTS[k].name} <span>{price(k)}</span>
                </p>
                <ul className={styles.list}>
                  {PRODUCTS[k].includes.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
                {owns(k) ? (
                  <p className={styles.ok}>Owned</p>
                ) : (
                  <button className="button button--primary" onClick={() => buy(k)} disabled={busy}>
                    {busy && product === k ? "Opening checkout" : `Buy for ${price(k)}`}
                  </button>
                )}
              </div>
            ))}
            {progress.plus && (
              <button className="button button--secondary" onClick={() => setStep("archive")}>
                Daily archive
              </button>
            )}
            <p className={styles.small}>Always free: {FREE_FEATURES.join(", ").toLowerCase()}.</p>
            <button className="button button--quiet" onClick={() => setStep("restore")}>
              Restore a purchase
            </button>
          </>
        )}

        {step === "age" && (
          <>
            <h2 id="shop-title" tabIndex={-1}>
              What year were you born?
            </h2>
            <p>We ask before any purchase. Only your age group is kept, on this device.</p>
            <label className={styles.field}>
              <span>Birth year</span>
              <select value={year} onChange={(e) => setYear(e.currentTarget.value)}>
                <option value="">Select year</option>
                {Array.from({ length: 100 }, (_, i) => thisYear - i).map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
            <button className="button button--primary" onClick={submitAge} disabled={busy || !year}>
              Continue
            </button>
          </>
        )}

        {step === "under13" && (
          <>
            <h2 id="shop-title" tabIndex={-1}>
              Not available under 13
            </h2>
            <p>Purchases aren't available for players under 13. Every mode, the Daily, duels, and six characters stay free.</p>
            <button className="button button--primary" onClick={onClose}>
              Back to the game
            </button>
          </>
        )}

        {step === "guardian" && (
          <>
            <h2 id="shop-title" tabIndex={-1}>
              Ask a parent or guardian
            </h2>
            <p>
              A parent or guardian needs to buy {PRODUCTS[product].name} for you. It's {price(product)} once, with no subscription. Hand them your phone for checkout.
            </p>
            <button className="button button--primary" onClick={() => checkout("13to17", true)} disabled={busy}>
              {busy ? "Opening checkout" : "I'm the parent or guardian"}
            </button>
            <button className="button button--quiet" onClick={onClose}>
              Not now
            </button>
          </>
        )}

        {step === "restore" && (
          <>
            <h2 id="shop-title" tabIndex={-1}>
              Restore a purchase
            </h2>
            <p>Use the payment ID and email address from your receipt email.</p>
            <label className={styles.field}>
              <span>Payment ID</span>
              <input value={paymentId} onChange={(e) => setPaymentId(e.currentTarget.value)} autoComplete="off" spellCheck={false} />
            </label>
            <label className={styles.field}>
              <span>Email used to pay</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.currentTarget.value)} autoComplete="email" />
            </label>
            <button className="button button--primary" onClick={restore} disabled={busy || !paymentId || !email}>
              {busy ? "Checking" : "Restore"}
            </button>
          </>
        )}

        {step === "confirming" && (
          <>
            <Character who="doomscroll" mood="neutral" size={90} title={null} />
            <h2 id="shop-title" tabIndex={-1}>
              Confirming your payment
            </h2>
            <p aria-live="polite">{error || "Hang tight. This usually takes a few seconds."}</p>
            {error && (
              <button className="button button--secondary" onClick={() => setStep("restore")}>
                Restore with receipt
              </button>
            )}
          </>
        )}

        {step === "unlocked" && (
          <>
            <Character who="maincharacter" mood="happy" size={100} title={null} />
            <h2 id="shop-title" tabIndex={-1}>
              Unlocked
            </h2>
            <p>Thank you for backing Who's Cooked? Your new characters are in the Crew.</p>
            <button className="button button--primary" onClick={onClose}>
              Back to the game
            </button>
          </>
        )}

        {step === "archive" && (
          <>
            <h2 id="shop-title" tabIndex={-1}>
              Daily archive
            </h2>
            {archiveDays.length === 0 ? (
              <p>The archive starts the day after the first Daily. Check back tomorrow.</p>
            ) : (
              <div className={styles.archive}>
                {archiveDays.map((k) => (
                  <button key={k} className={styles.day} onClick={() => onPlayArchive(k)}>
                    #{dailyNumber(k)}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {error && step !== "confirming" && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
