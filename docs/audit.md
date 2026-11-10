# Audit of the M1 game (2026-11-07)

Reviewed the code with the owner's phone screenshots (Android Chrome, 412 px wide).

## Bugs seen on the phone

| # | Issue | Cause | Status |
|---|---|---|---|
| 1 | "Trial 4 of 5" is drawn on top of the popped toast | Counter sits at 24% of the stage height, inside the toast's pop path | Fixed in the rebuild |
| 2 | A thin line runs from the progress dots to the Honey button | Sharp tip of the honey drop plus the default miter stroke join makes a long spike on mobile GPUs | Fixed: every outline uses round joins |
| 3 | Ingredient buttons look broken while the order is shown | Buttons are dimmed to 35% opacity, so they read as a rendering glitch rather than "wait" | Fixed in the rebuild |

## Pacing and onboarding

- **Too slow to start.** Landing → age check → ready screen → 3-2-1 → warm-up → 3-2-1 → first real tap at about 10 to 12 seconds. Hyper-casual games put the first input inside 1 to 3 seconds (see research.md).
- **Dead time between rounds.** Four 2-second countdowns plus a calibration step nobody understands ("tap when it lands", but why?).
- **Fixed 90 to 110 second run with no failure state.** There is no tension, no "almost", and no reason to try again right away.
- **Long waits inside rounds.** Pop spends most of its 15 seconds waiting. Ignore the Noise is 25 seconds of one pace. Order Up has long watch phases.
- **Gut Picks feels pointless solo.** It only matters for duo sync, which doesn't exist yet.

## Game feel

- No haptics, no screen shake, no combo, no live score during play.
- Hits just make the item disappear. There's no satisfying pop, squash, or number.
- The mascot reacts only in a small strip below the stage, away from where the player is looking.
- No rising speed or difficulty, so skill never gets tested at the edge.

## Core loop, retention, virality

- One long test, then a result. There's no "one more try" loop and no personal best.
- Nothing brings people back tomorrow: no daily challenge, no streak, no unlocks.
- "Challenge someone" shares a generic link, not the same rounds.
- The share card is good, but there's no spoiler-free daily grid and no clip.
- A lower score is better, which works for the joke but fights score-chasing ("I got 12" sounds bad).

## Monetization

- None. No product, checkout, entitlement, or restore.

## Text and layout

- Instructions are repeated in the intro and again under the stage, and the caption under the stage ("Pop") adds noise.
- The "Sound on" pill takes about 45% of the header width at 360 px.
- The play area is mostly empty white space in Pop and Ignore the Noise.
