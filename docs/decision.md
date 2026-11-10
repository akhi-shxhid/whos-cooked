# Decision: keep Who's Cooked?, replace the 90-second test with "Rush" (2026-11-07)

## Choice
This is mostly option (b), with the brand kept. The name, toast mascot, colors, fonts and the four mechanics all stay. The slow four-round test is replaced by **Rush**: rapid microgames, three lives, and rising speed.

## Why
- **The old game broke the first rule of the genre.** The first real tap came 10–12 seconds in, there was no fail state, and a run lasted about 100 seconds no matter what (audit.md). Hyper-casual players expect to understand the game and be playing within seconds (research.md §1).
- **Microgames fit the attention span of the audience** and have a strong track record (WarioWare, about 5 seconds each). They also reuse what already works: Pop, butter vs crumbs, fake notifications, and order memory.
- **The toast now carries the drama live.** Each lost life browns it a shade, and the third makes you "cooked". The signature moment now happens on every mistake, not once at the end.
- **"One more try" needs short runs, a fail state and a best score.** Rush runs last 30–120 seconds and restart in one tap.
- **The daily seed plus a spoiler-free grid is the best-documented way to drive shares** (Wordle). Every day has one Daily Toast run that counts, shared as 🟨🟫 squares.
- **A higher score is now better** ("I survived 23"), which suits score-chasing. The toast levels stay as ranks: Raw (barely touched) at 30 or more, down to Charcoal below 6.

## The loop
1. **Tap Play.** The first microgame (always Pop) starts within about a second. There's no age gate, account or tutorial.
2. **Microgames:**
   - POP! Tap when it pops.
   - BUTTER! Tap all the butter.
   - DON'T! Don't tap anything.
   - ORDER! Remember the order.
   - BURNT ONE! Find the burnt slice.
   - Each opens with a shouted command and ends with a stamp.
3. **Lives and speed:** three lives. Every 5 cleared, the speed goes up.
4. **Game over:** your score, rank, best and a funny line, with **Play again** as the main button, plus Challenge and Share.
5. **Daily Toast:** the same sequence for everyone. Only your first attempt counts. It builds your streak and gives a share grid.
6. **Progression:** the Toast Locker unlocks spreads as your total cleared count grows.

## Positioning
"A daily focus challenge." Every claim stays within research.md §3: practice makes you better at this game. We make no real-life attention claims.

## Monetization: Cooked+, a one-time unlock
- **One-time, not a subscription.** Gaming subscriptions convert at about 1% (research.md §4). A one-time unlock is simpler and safer for teen buyers (no auto-renew), and is easier to sell from a TikTok visit.
- **Price:** $3.99 / €3.99 / £3.49. Prices live in one typed config, not in components.
- **Includes:** the Daily archive (play any past day, the NYT model), two exclusive spreads, and a Cooked+ mark on your share card and clips.
- **Always free:** Rush, the Daily, challenges, sharing and earned spreads. We never paywall the core loop or sharing.
- **Streak grace days are free for everyone.** We don't sell streak repairs (research.md §5).
- **Payments sit behind a `PaymentProvider` interface.** A Dodo implementation and a local fake provider let the whole flow be tested end to end. **Blocker:** Dodo's policy lists games as unsupported, so written approval is needed before going live. Otherwise, swap the provider.

## Compliance design
- Play is anonymous, with no third-party trackers, ads, chat or geolocation.
- A neutral birth-year question appears only before buying or adding a nickname. It isn't pre-filled.
- **Under 13:** the full game and sharing (score only), but no purchases and no nickname.
- **13–17:** a parent or guardian completes checkout.
- No loss-framed reminders and no countdown pressure.

## What this changes in the PRD
These need to be reflected in PRD.md:
- Section 5: the game spec is now Rush.
- Section 6: scoring is cleared microgames, not the weighted Cooked Score.
- Section 9: pricing is Cooked+ one-time. Duo Report, Group Report and Pass move to later milestones.
- Section 3: the minimum age of 16 becomes play for all ages with the protections above.

Challenges against a friend use the same seed. The duo "sync" score and roles are deferred.

---

# Decision 2: from kids' game to Gen Z game (2026-11-07)

## Theme: keep the name, kill the cute
- **Keep "Who's Cooked?".** "Cooked" is real Gen Z slang for doomed, and "locked in" is its opposite: focused. A focus game
  measured on that scale is native to how this audience already talks.
- **Drop the butter-yellow, soft, wholesome look.** The research says tone decides "kids" vs "Gen Z", not species (research.md §6).
  The new look is **loud and internet-native**:
  - near-black background
  - hard-edged panels in a sticker style with offset shadows
  - one hot accent color for "cooked", an acid green for "locked in"
  - a chunky grotesque display font (Bricolage Grotesque) in place of the bubbly Bagel Fat One
  - roast-style copy
- **Characters: the Cooked Crew.** A roster of original, absurd, collectible characters built on slang archetypes, not
  AI-made meme art (brand-safety and "AI slop" risk). Toasty stays as the deadpan, roasting host, not a cute mascot.
  You earn characters by levelling up or buy them outright. **Never in random boxes** (PEGI 16 from June 2026).
- **Ranks in slang, best first:** Locked In, Goated, Mid, Cooked, Fully Cooked.

## Microgames: 8 instead of 5, rethemed
- **POP!** Toaster reaction (kept).
- **RED FLAGS!** Tap the green flags and avoid the red flags (replaces butter vs crumbs).
- **DON'T!** A fake notification and a "TAP ME" bait. Don't tap anything.
- **ORDER!** Remember a sequence of 💀🔥🧢🗿💅👀 (replaces kitchen ingredients).
- **BURNT ONE!** Find the burnt slice.
- **MASH!** Tap fast enough to fill the meter.
- **CATCH!** Tap the falling phone before it hits the floor.
- **COUNT!** How many 💀? Pick the number.
- **Bosses:** every 10th microgame in Classic is a boss, a harder variant with a banner.

## Modes: six, all on one picker
Each mode changes the rules, not just the speed (research.md §8).

| Mode | Rule that makes it different | Ranked? |
|---|---|---|
| Classic | 3 lives, speeds up every 5, boss every 10 | Personal best |
| Blitz | 60-second clock, no lives. Combos multiply points; a miss costs 3 seconds | Daily board |
| One Life | One miss and you're out. Starts fast, and clean clears multiply | Daily board |
| Chill | No lives, slower timers, nothing to lose. Practice and accessibility | No |
| Daily | Classic rules on one shared seed. First try counts, spoiler-free grid | Daily board |
| Duel | Same seed as a friend's link, racing their ghost live in the HUD | Head-to-head |

## Progression and retention
Every reward is fixed and visible. Nothing gives an advantage.
- **XP and levels.** Each level grants a known reward: a character, a title or a card frame.
- **3 daily missions**, each lasting 48 hours.
- **A fixed daily bonus** for your first run of the day. No chest and no randomness.
- **Daily streak** with one free grace day a week. No reminders by default.
- **Daily leaderboards** for Daily, Blitz and One Life. They show auto-generated handles only (no free-text names, so nothing to moderate).
  Posting needs a one-time age check (13+).
- **A break prompt** after 10 runs in a row (ICO guidance).

## Monetization (research.md §7)
- **Cooked+, $3.99 one-time.** Includes the Daily archive, full stats, two Plus characters, and a Plus frame on cards and clips.
  The core game, all six modes, sharing and leaderboards stay free. Paying never changes your score.
- **Chaos Crew pack, $1.99 one-time.** Three extra characters, bought directly with no virtual currency.
- **Offers appear only after a run**, never mid-run, with no countdowns.
- **Rewarded ads are deferred** until there are about 5,000 daily players. They'd be contextual only and optional.
