# Who's Cooked? Product Requirements Document

Version: 1.0
Date: 2026-11-05
Status: Approved for build
Owner: Founder
Builder: Shahid Afrid

---

## 1. Product summary

Who's Cooked? is a 90-second mobile-first web game. A player completes four quick rounds and gets a Cooked Score from 0 to 100. A slice of toast browns as the score rises. The player then sends a challenge link to someone else, who plays the same rounds. Both see who won, how in sync they are, and a funny role for each person.

**One-line pitch:** Find out how cooked your brain is, then prove someone else is worse.

**Why it can spread:** Players get their own result immediately, then have a clear reason to invite someone. Each new player can challenge someone else.

**Important positioning:** This is a game for fun. It is not a medical, psychological, cognitive, ADHD, or relationship test.

---

## 2. Goals

### Business goals
- Launch the full product to US, UK, and European audiences.
- Reach paying users in the first 30 days using short-form content.
- Earn from one-time reports, groups, and subscriptions.

### Launch targets
These are hypotheses to test, not benchmarks.

| Metric | Target |
|---|---|
| Landing to game start | 60% or higher |
| Game start to score reveal | 70% or higher |
| Score reveal to challenge sent | 25% or higher |
| Challenge opened to finished | 40% or higher |
| Finished pairs to paid report | 2% or higher |
| Day 7 return rate | 10% or higher |
| Median page load on 4G | Under 2 seconds |
| Checkout completion after checkout start | 50% or higher |

### Non-goals
- Native iOS or Android apps
- Diagnosing or treating anything
- Romantic matchmaking or dating
- User-generated public content feeds
- Contact importing
- Ads inside the product

---

## 3. Audience and markets

### Primary markets
- United States
- United Kingdom and Ireland
- Germany, France, Spain, Netherlands, Sweden, Denmark, Norway

### Launch languages
- English
- German
- French
- Spanish

### Audience
- Primary: people aged 18 to 34 who use TikTok, Reels, and Shorts
- Secondary: couples, best friends, siblings, families, students, coworkers
- Minimum age: 16

### TikTok constraint
The owner is based in India, where TikTok is blocked. All TikTok posting must be done by creators or operators in target countries. The owner can directly manage Instagram Reels and YouTube Shorts.

---

## 4. Core user flows

### Solo flow
1. Land on the home page from a video or typed URL.
2. Confirm age with one tap.
3. Tap `Start game`.
4. Complete calibration in under 5 seconds.
5. Play four rounds.
6. Watch the toast reveal.
7. See the score, level, and breakdown.
8. Tap `Challenge someone` or `Save result`.

### Challenge flow
1. Player A taps `Challenge someone`.
2. Player A enters a display name or accepts a random toast name.
3. The app creates a link and opens the native share sheet.
4. Player B opens the link, which shows a custom preview and a clear invitation.
5. Player B plays the same seeded rounds.
6. Player A's score stays hidden until Player B finishes.
7. Both can see the duo result.
8. Player B can challenge someone else, rematch, or buy the Duo Report.

### Purchase flow
1. Player sees a preview of the locked report.
2. Player taps a clearly priced button.
3. Hosted checkout opens.
4. Payment webhook unlocks the entitlement.
5. Player returns to the unlocked report.
6. Player receives an email to restore access.

### Daily flow
1. Player opens Daily Toast.
2. Player completes a 60-second challenge using the same seed as everyone else that day.
3. Streak updates.
4. Player sees a spoiler-free share card.
5. Player is invited to a duel or the Focus Reset.

---

## 5. Game specification

### Global rules
- Total core game length: about 90 seconds.
- Each round starts with one sentence of instruction and a short countdown.
- Portrait mobile is the primary layout.
- Rounds render in PixiJS on Canvas.
- All randomness comes from a seeded PRNG.
- The same seed gives the same rounds.
- Sound can be turned off.
- Reduced motion mode removes shake and flashes while keeping the game playable.
- Never use rapidly flashing patterns. Keep flashing below 3 times per second.
- Pause the round and offer a restart if the tab loses focus.

### Calibration
- Three tap prompts.
- Estimate a device offset.
- Cap the offset at plus or minus 40 ms.
- Store device class, browser, refresh rate if detectable, and input type.
- Never present calibration as perfect.

### Round 1: Pop
Measures reaction.

- Toast pops out of a toaster after a random delay of 800 to 3,000 ms.
- Player taps immediately.
- Five trials.
- A tap before the pop, or within 100 ms of it, is a false start.
- Use `pointerdown` and `event.timeStamp`.

### Round 2: Ignore the Noise
Measures focus.

- 25-second go/no-go round.
- Tap butter pats.
- Ignore burnt crumbs and fake notifications.
- Notifications must be clearly fictional.
- Never imitate a real app's logo or trade dress.
- Track hits, misses, false alarms, and notification taps.

### Round 3: Order Up
Measures memory.

- Show a sequence of ingredients.
- Player repeats it.
- Start at length 3.
- Add one item after each success.
- End after two failures or at the time limit.
- Maximum span is 9.

### Round 4: Gut Picks
Used for sync, not for the Cooked Score.

- Eight fast this-or-that choices in about 15 seconds.
- Allowed topics: food, habits, travel, morning routines, phone behavior, silly preferences.
- Banned topics: sex, politics, religion, body image, race, nationality, health conditions.

---

## 6. Scoring

Keep all scoring in `packages/game-core/src/scoring.ts`. Store a `scoring_version` with every result.

### Sub-scores
Each sub-score runs from 0 to 100, where higher means sharper.

```text
Reaction = clamp(((620 - medianReactionMs) / (620 - 240)) * 100, 0, 100) - (falseStarts * 6)

Focus = clamp((hits / targets) * 100 - (falseAlarms * 8) - (notificationTaps * 12), 0, 100)

Memory = clamp(((maxSpan - 3) / (9 - 3)) * 100, 0, 100)

Impulse = clamp(100 - (falseStarts * 15) - (falseAlarms * 10), 0, 100)
```

Clamp the final Reaction value to 0 to 100.

### Cooked Score
```text
Cooked = 100 - ((Focus * 0.35) + (Reaction * 0.25) + (Memory * 0.25) + (Impulse * 0.15))
```

Round to the nearest whole number.

### Toast levels
| Score | Level | Meaning |
|---|---|---|
| 0 to 19 | Raw | Barely touched |
| 20 to 39 | Golden | Very sharp |
| 40 to 59 | Crispy | Holding on |
| 60 to 79 | Burnt | Getting worrying |
| 80 to 100 | Charcoal | Send help |

Levels are jokes. They must not imply medical or mental decline.

### Sync score
```text
Sync = (GutMatchPercent * 0.70) + ((100 - averageAbsoluteSubScoreDifference) * 0.30)
```

Show it as a fun score. Never describe it as proof of compatibility.

### Head-to-head rules
- Compare each round.
- Reaction differences under 25 ms count as a tie.
- Use the lower Cooked Score as the overall winner.
- If the difference is under 2 points, show a tie.
- Assign each person a role based on their sub-score pattern.

### Percentiles
- Do not show percentiles until at least 1,000 valid plays exist for that scoring version.
- Calculate percentiles only from real, valid plays.
- Hide reaction percentiles if device mix would make them misleading.

### Tuning
Owner may change weights after real data. Any change requires a new `scoring_version`.

---

## 7. Result experience

### Solo result
- Large animated toast
- Score and level
- Four sub-scores
- One funny line
- `Challenge someone`
- `Save result`
- `Play again`

### Duo result
- Both toasts side by side
- Overall winner
- Round-by-round result
- Sync score
- Two funny roles
- `Rematch`
- `Share`
- Locked Duo Report preview

### Result writing
Create at least:
- 40 solo lines
- 30 duo roles
- 30 winner lines
- 20 tie lines

Lines must be funny without insulting appearance, identity, intelligence as a fixed trait, disability, or mental health.

---

## 8. Feature list

Everything below is in the full launch scope.

### Core game
- No-signup play
- Age gate
- Device calibration
- Pop, Ignore the Noise, Order Up, and Gut Picks
- Cooked Score and toast levels
- Solo result page
- Play again
- Sound toggle
- Reduced motion mode
- Downloadable 9:16 share card

### Social
- Challenge links
- Custom preview images
- Display names with moderation
- Head-to-head results
- Rematches
- Native share sheet
- Copy link fallback
- Referral rewards

### Daily and retention
- Daily Toast with one global seed per day
- Streaks
- One free streak repair per month
- Daily duels
- Personal score history
- Weekly recap email for users who opt in
- Web push for users who opt in
- Add-to-home-screen support

### Groups
- Group rooms for up to 8 players, played at any time
- Group leaderboard
- Group Report
- Live rooms for up to 30 players using Durable Objects
- Host screen for parties and offices
- Family mode with safe prompts
- Team Room with event summary

### Paid features
- Duo Report
- Duo Recap Video
- Group Report
- Team Room
- Pass
- Family Pass
- Focus Reset
- Toast Locker cosmetics

### Focus Reset
- 30-day plan
- About 5 minutes a day
- Mix of short games and phone habit tasks
- Before and after game scores
- Progress screen
- Non-medical language only
- Allowed claim: you may improve at this game and build a simple daily habit
- Banned claim: reverses brain damage, restores cognition, treats ADHD, or cures brain rot

### Toast Locker
- Cosmetic toast styles and spreads
- Unlocked through play and Pass
- No gambling mechanics
- No randomized paid boxes

### Accounts
- Anonymous device identity by default
- Optional email magic link
- Upgrade path that keeps existing results
- Restore purchases
- Delete account and data

### Admin
- Protected admin page
- Search purchases
- Refund status
- Remove abusive names
- View flagged scores
- Feature flags
- Basic revenue and funnel summary

---

## 9. Pricing

All prices are launch hypotheses to test. Do not hard-code them in UI components. Keep them in one typed config.

| Product | Type | USD | EUR | GBP | Includes |
|---|---|---:|---:|---:|---|
| Free | Free | $0 | €0 | £0 | Solo game, Daily Toast, challenges, basic duo results |
| Duo Report | One-time | $6.99 | €6.99 | £5.99 | Full report for one pair |
| Duo Report + Recap | One-time | $9.99 | €9.99 | £8.99 | Duo Report and a shareable animated video |
| Group Report | One-time | $14.99 | €14.99 | £12.99 | Full report for one room of up to 8 |
| Team Room | One-time | $39 | €39 | £34 | One live event for up to 30 players, plus summary |
| Pass Monthly | Subscription | $5.99 | €5.99 | £4.99 | Everything in the Pass list below |
| Pass Annual | Subscription | $34.99 | €34.99 | £29.99 | Same as monthly, billed yearly |
| Family Pass Monthly | Subscription | $9.99 | €9.99 | £8.99 | Pass for up to 5 people |
| Family Pass Annual | Subscription | $59.99 | €59.99 | £49.99 | Family Pass, billed yearly |

### Pass includes
- Unlimited rematches
- Unlimited daily duels
- Full score history
- Focus Reset
- Toast Locker
- Live rooms up to 8
- One Duo Report each month

### Free limits
- Unlimited solo games
- Unlimited new challenges
- One rematch per pair per day
- Daily Toast
- Basic duo result

### Pricing rules
- Prices must be visible before checkout.
- Show renewal price, billing period, and how to cancel before subscription checkout.
- Include tax in displayed prices for EU and UK customers.
- For US customers, follow the payment provider's tax display.
- No fake countdowns.
- No fake discounts.
- No pre-ticked add-ons.
- No hidden renewals.
- Cancellation must be self-serve.

### Paywall placement
Never paywall the first score or basic comparison. Those power sharing. Offer paid features only after the player has seen their result.

---

## 10. Brand

### Name
Who's Cooked?

### Written forms
- Product: Who's Cooked?
- URL and handle form: whoscooked
- Never write "WhosCooked" in UI copy.

### Domain priority
1. `whoscooked.com`
2. `playwhoscooked.com`
3. `whoscooked.gg`

Owner must verify domain availability, social handles, and trademark risk before launch.

### Mascot
A slice of toast with a simple expressive face.

- It reacts to taps, correct answers, mistakes, and the final score.
- It browns as the Cooked Score rises.
- It is built entirely from SVG and code.
- It must not resemble an existing mascot.
- Eyes and mouth carry most of the personality.
- It can squash, stretch, sweat, smoke, and panic.
- It never appears hurt or in distress in a disturbing way.

### Personality
Cheeky, quick, and a little dramatic. It teases the score, never the person.

### Brand phrases
- Who's cooked?
- Prove it.
- Same rounds. No excuses.

Use these sparingly.

---

## 11. Design system

### Direction
A loud kitchen-counter game show. Think toaster dials, scoreboard numbers, butter-yellow screens, and one very dramatic slice of toast.

### Colors
| Token | Hex | Use |
|---|---|---|
| `butter` | `#FFCF3F` | Main background |
| `burnt` | `#2E1A12` | Main text and outlines |
| `crust` | `#B8662A` | Toast and warm details |
| `plate` | `#2346FF` | Primary actions and focus states |
| `jam` | `#F0383E` | Mistakes and destructive actions |
| `white` | `#FFFFFF` | Surfaces and text on plate |

Check contrast before use. Do not add new colors without a reason recorded in the design notes.

### Typography
- Display and scores: `Bagel Fat One`
- Interface and body: `Atkinson Hyperlegible`
- Use only these two typefaces.
- Self-host fonts.
- Use the `font-display: swap` setting.
- Load a tested font for any language characters not covered.

### Type scale
Mobile sizes:
- Score: 96 to 128 px
- Page heading: 40 to 56 px
- Section heading: 28 to 32 px
- Body: 17 to 18 px
- Small text: 14 px minimum

### Layout
- Mobile first at 360 px wide.
- One main action per screen.
- Primary action sits in the thumb zone.
- Use large shapes and direct layouts instead of grids of equal cards.
- Desktop keeps the game in a centered portrait stage with brand scenery around it.
- No top navigation during rounds.

Round screen:

```text
+----------------------------+
| Round 2 of 4        Sound  |
|                            |
|         GAME STAGE         |
|                            |
|                            |
|        toast reacts        |
|                            |
|   Instruction, one line    |
+----------------------------+
```

Reveal screen:

```text
+----------------------------+
|                            |
|      [ giant toast ]       |
|                            |
|            62              |
|           Burnt            |
|   "Still warm. Still bad." |
|                            |
|   [ Challenge someone ]    |
|   Save result   Play again |
+----------------------------+
```

### Components
Build a small brand component set:
- ToastMascot
- ToasterDial
- ScoreCounter
- RoundIntro
- GameStage
- SubScoreBar
- FaceoffPanel
- ChallengeCard
- PriceOption
- ReportSection
- ConsentPanel

Do not import a full UI kit. Use accessible primitives only where needed.

---

## 12. AI-slop proof rules

These rules are mandatory.

### Visual bans
Do not use:
- Default shadcn or template styling
- Identical rounded cards in repeating grids
- One border radius on every element
- Soft gray shadow on everything
- Gradient washes as decoration
- Purple or blue-purple AI gradients
- Sparkle icons
- Emoji as interface icons
- Generic line icon sets as the main visual language
- Dark background with neon accent
- Cream background with terracotta accent
- Newspaper layouts with hairline rules
- All-caps labels above headings
- Middle-dot metadata strings
- Monospace labels used only for style
- An arrow added to button text
- Three-feature columns with icons
- Fake dashboard screenshots
- Fake logos
- Fake testimonials

### Motion bans
Do not use:
- Fade-and-slide-up on every section
- Hover animations on every element
- Decorative particles
- Infinite floating blobs
- Parallax without purpose
- Animation that delays a player's action

### Image bans
- No AI-generated people.
- No AI-generated mascot art.
- No stock photos.
- No generated images in product UI.
- Real gameplay must come from the real product.

### Required signature
Every core screen must include at least one of these:
- The toast reacting
- The toaster dial
- Real gameplay
- A real score
- A real comparison

### Screenshot test
For every major screen, ask:
1. Could this belong to any other quiz or AI app?
2. Does the toast or game create the memorable moment?
3. Can one decoration be removed?
4. Is there one clear next action?
5. Does the copy sound like this brand?

If the first answer is yes, redesign it.

### Quality gate
Before finishing a screen:
- Check it at 360 px, 390 px, tablet, and desktop.
- Capture screenshots if tooling allows.
- Critique it against this section.
- Remove one accessory.
- Fix issues before reporting it as done.

---

## 13. Motion and sound

### Motion principles
- Motion answers what the player did.
- The score reveal is the single biggest moment.
- Use squash and stretch on the toast.
- Keep interface transitions under 200 ms.
- Keep the score reveal under 4 seconds.
- Let players skip the reveal after one play.
- Respect `prefers-reduced-motion`.

### Reveal sequence
1. Toast sits in the toaster.
2. Dial turns.
3. Screen tension builds with a timed tick.
4. Toast launches.
5. Score counts to the final number.
6. Toast lands at the final doneness.
7. One funny line appears.

### Animation tools
- Game rounds: PixiJS
- App UI: Motion
- Mascot: pure React SVG driven by props
- Videos: Remotion using frame-based values

The mascot must be a pure component with props such as `doneness`, `mood`, `squash`, `lookX`, and `lookY`. Do not couple it to Motion or Remotion.

### Sound
Create original or properly licensed sounds:
- Toaster tick
- Spring pop
- Butter tap
- Error burn
- Round complete
- Score reveal
- Rematch sting

Use the Web Audio API. Store license details for any third-party sound in `docs/audio-licenses.md`.

---

## 14. Copy rules

### Voice
- Short
- Specific
- Playful
- Plain English
- Sentence case

### Button labels
Use direct actions:
- Start game
- Challenge someone
- Save result
- Play again
- Unlock Duo Report
- Start Pass
- Manage subscription

### Banned words and phrases
Unlock your potential, supercharge, revolutionize, seamless, effortless, AI-powered, next-level, elevate, journey, game-changer, science-backed, clinically proven, reverse brain rot, cure, diagnose, treat.

### Error messages
Say what happened and what to do.

Good: `This challenge has expired. Start a new game to send a fresh link.`

Bad: `Oops! Something went wrong.`

### Mandatory disclaimer
Show this on result, report, and Focus Reset pages:

`Who's Cooked? is a game for fun. It isn't a medical, psychological, or relationship test.`

### Localization
Translate meaning and humor, not word for word. A human fluent in each language must review result lines, prices, legal copy, and checkout copy before launch.

---

## 15. Stack

| Layer | Choice |
|---|---|
| Language | TypeScript, strict mode |
| Package manager | pnpm workspaces |
| Site | Astro |
| Interactive UI | React |
| App motion | Motion |
| Game rendering | PixiJS |
| Styling | CSS variables and CSS modules |
| API | Hono on Cloudflare Workers |
| Hosting | Cloudflare |
| Database | Neon Postgres |
| Database connection | Cloudflare Hyperdrive with `pg` |
| ORM and migrations | Drizzle |
| Rate limits and fast reads | Workers KV |
| Live rooms | Durable Objects |
| Bot protection | Cloudflare Turnstile |
| File storage | Cloudflare R2 |
| Auth | Better Auth with email magic links |
| Email | Resend |
| Payments | Dodo Payments behind an adapter |
| Product analytics | PostHog EU Cloud |
| Error tracking | Sentry |
| Video | Remotion |
| Unit tests | Vitest |
| End-to-end tests | Playwright |
| Translations | Paraglide JS or the smallest equivalent that works cleanly with Astro |

### Neon setup
- Use Hyperdrive as the default connection path.
- Create a dedicated database user for Hyperdrive.
- Use a direct, non-pooled Neon connection string for the Hyperdrive config.
- Use Neon branches for development and preview environments.
- Start the primary database in the US East region. Review EU latency after launch.
- During launch, avoid scale-to-zero delays if the chosen plan permits it.
- Set spend and usage alerts.
- Run migrations through Drizzle Kit in CI, not at runtime.

### Resilience
- A player must be able to finish the solo game if the API is down.
- Queue score submission locally and retry.
- Show a clear retry state if challenge creation fails.
- Cache static assets at the edge.
- Do not make a database call on the landing page.

---

## 16. Repository structure

```text
whos-cooked/
  apps/
    web/                 Astro site and React islands
    api/                 Hono Worker
  packages/
    game-core/           Seeded RNG, rules, scoring
    game-renderer/       PixiJS rounds
    brand/               Tokens, fonts, ToastMascot, shared components
    db/                  Drizzle schema, migrations, queries
    payments/            Provider adapter and Dodo implementation
    i18n/                Messages and locale tools
    analytics/           Typed event helpers
    video/               Remotion compositions
  content/
    hooks.json
    video-batches/
  docs/
    decisions/
    audio-licenses.md
    launch-checklist.md
  CLAUDE.md
  PRD.md
```

---

## 17. Data model

Use UUIDs. Add `created_at` and `updated_at` where useful.

### Tables
- `players`: id, display_name, locale, country_code, age_confirmed_at, email, auth_user_id, deleted_at
- `plays`: id, player_id, mode, seed, scoring_version, device_class, input_type, cooked_score, reaction, focus, memory, impulse, validity_status
- `play_details`: play_id, raw_trials_json, expires_at
- `challenges`: id, creator_player_id, creator_play_id, seed, slug, expires_at, status
- `challenge_results`: id, challenge_id, player_id, play_id, sync_score, winner_player_id
- `rematches`: id, original_challenge_id, new_challenge_id
- `rooms`: id, type, host_player_id, code, seed, status, max_players, starts_at, expires_at
- `room_members`: room_id, player_id, display_name, joined_at
- `daily_challenges`: date, seed, scoring_version
- `daily_results`: date, player_id, play_id
- `streaks`: player_id, current_count, best_count, last_played_date, repairs_used_month
- `purchases`: id, player_id, product_key, provider, provider_order_id, amount, currency, status, target_type, target_id
- `subscriptions`: id, player_id, plan_key, provider, provider_subscription_id, status, current_period_end, cancel_at_period_end
- `entitlements`: id, player_id, key, source_type, source_id, starts_at, ends_at
- `family_members`: subscription_id, player_id, invited_email, status
- `focus_plan_progress`: player_id, day_number, completed_at, score_snapshot
- `locker_items`: player_id, item_key, source, acquired_at
- `webhook_events`: provider, event_id, event_type, payload_json, processed_at
- `consents`: player_id, consent_type, version, granted_at, withdrawn_at
- `moderation_flags`: entity_type, entity_id, reason, status

### Data rules
- Raw trial details expire after 90 days.
- Webhook handling must be idempotent.
- Store as little personal data as possible.
- Never store card data.
- Deletion must remove or anonymize personal data within the legal period, while retaining required payment records.

---

## 18. API

Base path: `/api/v1`

### Game
- `POST /players/anonymous`
- `POST /plays`
- `GET /plays/:id`
- `GET /daily/today`
- `POST /daily/:date/results`

### Challenges
- `POST /challenges`
- `GET /challenges/:slug`
- `POST /challenges/:slug/results`
- `POST /challenges/:slug/rematch`
- `GET /challenges/:slug/og.png`

### Rooms
- `POST /rooms`
- `GET /rooms/:code`
- `POST /rooms/:code/join`
- `POST /rooms/:code/results`
- `GET /rooms/:code/live` for WebSocket upgrades

### Commerce
- `POST /checkout`
- `POST /webhooks/dodo`
- `GET /entitlements`
- `POST /restore`
- `GET /billing/portal`

### Account
- `POST /auth/magic-link`
- `GET /me`
- `PATCH /me`
- `POST /me/export`
- `DELETE /me`

### API rules
- Validate all input with a shared schema.
- Never trust prices or entitlements from the client.
- Use signed, HTTP-only cookies for identity.
- Rate limit writes.
- Return typed errors with a stable code and clear message.

---

## 19. Anti-cheat and fairness

Scores are for fun, but obvious cheating must not dominate rooms or leaderboards.

- Server issues seeds and signed play tokens.
- Client submits raw trial data.
- Server recomputes the score.
- Reject impossible timing and malformed sequences.
- Flag scores with suspiciously perfect patterns.
- One first attempt counts for each challenge.
- Replays create a separate result.
- Use Turnstile when behavior looks automated.
- Exclude flagged plays from percentiles and leaderboards.
- Do not accuse a player of cheating. Show `This score wasn't counted.`
- Do not rank players on tiny reaction differences across different devices.

---

## 20. Payments

### Provider
Use Dodo Payments as Merchant of Record.

Before implementation, verify in current docs:
- One-time products
- Subscriptions
- Webhook events
- Customer portal
- Adaptive currencies
- Apple Pay and Google Pay availability
- Refund flow
- Indian bank payouts
- Supported countries

### Rules
- Build behind a `PaymentProvider` interface so the provider can change.
- Store product mapping server side.
- Grant access only after a verified webhook.
- Show a pending state if webhook delivery is delayed.
- Send a receipt and restore email.
- Support self-serve cancellation.
- Test checkout inside TikTok's, Instagram's, and Safari's browsers.
- Add a fallback that opens checkout in the system browser if an in-app browser blocks payment.

### Report unlock example
A Duo Report unlocks for both players in that pair. The buyer gets the recap video if purchased.

---

## 21. Reports and recap video

### Duo Report contains
- Round-by-round comparison
- Strengths and weak spots in game terms
- Sync breakdown
- Funny roles
- Best rematch suggestion
- Share card set

### Group Report contains
- Leaderboard
- Most focused
- Fastest
- Best memory
- Most in sync pair
- Most likely to tap a fake notification
- Shareable group card

### Recap video
- Vertical 1080 by 1920 MP4
- 10 to 15 seconds
- Uses real scores and names from that pair
- Built from Remotion compositions
- Attempt browser rendering first with Remotion's web renderer
- Add a server fallback if browser rendering isn't reliable
- Store output in R2 with an expiry date

Run a technical spike before committing to the renderer choice.

---

## 22. Privacy, legal, and safety

This section sets product requirements. It is not legal advice. The owner must get privacy, consumer, tax, and terms review before launch.

### Requirements
- Privacy policy
- Terms of service
- Refund and withdrawal policy
- Cookie and tracking controls
- Data export and deletion
- Subscription terms before purchase
- Clear disclosure of paid creator partnerships in marketing
- Age statement of 16+
- Purchases must require an adult or parental permission as the owner's legal review determines

### Consent
- EU and UK analytics and marketing tracking must respect consent requirements.
- Marketing pixels stay off until allowed.
- Provide US privacy opt-out controls as required.
- Do not use dark patterns in consent banners.

### Safety
- No sexual content.
- No body rating or attractiveness scoring.
- No public profile pages.
- No contact uploads.
- No location display.
- No direct messaging.
- Names are moderated and hidden from public leaderboards unless the player opts in.
- Group rooms expire.
- Links are hard to guess.
- Provide a report button for abusive names.
- If a user writes about self-harm or crisis in any free-text field, do not process it as game content. Avoid free text except display names and emails.

### Health language
Never say a score means someone has a condition. Do not suggest stopping treatment. Link to appropriate help only if a clear safety issue arises.

### Marketing truth
Creator posts and owned content must show real gameplay and real results unless clearly marked as an acted example. No fabricated relationship stories presented as real.

---

## 23. Accessibility and performance

### Accessibility
- Target WCAG 2.2 AA where feasible.
- Full keyboard support outside timed rounds.
- Provide keyboard or switch-friendly alternatives where a round allows it.
- Visible focus states.
- No color-only signals.
- Captions or text cues for audio feedback.
- Reduced motion support.
- Screen-reader-friendly result and report pages.
- Provide a clear note when a timed round cannot be fully accessible, and offer a non-ranked way to explore results where possible.

### Performance budgets
- Landing page JavaScript under 100 KB compressed.
- Game bundle loaded only after `Start game`.
- First playable state under 3 seconds on mid-range Android over 4G.
- Target 60 fps during rounds on a mid-range Android phone.
- Input-to-visual feedback under 100 ms.
- Compress all audio and images.
- Preload only the next round's assets.

---

## 24. Analytics

Use typed helpers. Do not send names, emails, or raw personal text.

### Events
`landing_viewed`, `age_confirmed`, `game_started`, `calibration_completed`, `round_started`, `round_completed`, `game_abandoned`, `score_revealed`, `result_saved`, `challenge_created`, `challenge_shared`, `challenge_opened`, `challenge_started`, `challenge_completed`, `duo_result_viewed`, `rematch_started`, `report_preview_viewed`, `checkout_started`, `purchase_completed`, `purchase_failed`, `subscription_started`, `subscription_canceled`, `daily_started`, `daily_completed`, `streak_extended`, `room_created`, `room_joined`, `focus_day_completed`, `push_opted_in`, `email_opted_in`

### Properties
Include source, creator code, campaign, country, locale, device class, browser, scoring version, and variant when allowed.

### Attribution
- Every creator gets a short code.
- Support clean links such as `whoscooked.com/c/CODE`.
- Keep codes through the challenge chain where possible.
- Track paid conversion by creator and content format.

### Experiments
Start with:
1. Reveal length
2. Challenge button wording
3. Report price
4. Report preview
5. Daily reminder timing

Run one experiment at a time per funnel stage.

---

## 25. Marketing content engine

Content is part of the product.

### Video system
Build these Remotion compositions in `packages/video`:
- `PlayAlongReaction`
- `PlayAlongFocus`
- `PlayAlongMemory`
- `ScoreReveal`
- `DuoFaceoff`
- `FamilyFaceoff`
- `OfficeLeaderboard`
- `DoneChart`
- `DailyToastShare`

Technical rules:
- 1080 by 1920
- 30 fps by default
- Frame-based animation using Remotion values
- Shared brand tokens and ToastMascot
- All text comes from JSON
- Support batch rendering from `content/video-batches/*.json`
- Keep important text inside mobile safe zones

### Slideshows
Build still templates for:
- A or B choices
- Score level explanations
- `Which toast are you?`
- Round rules
- Team or friend roles

### Content lanes
| Lane | Format | Example hook |
|---|---|---|
| Play along | Viewer plays in video | Tap when it turns green. Comment your score. |
| Couples | Real score reveal | We played the same rounds. Only one of us is cooked. |
| Best friends | Challenge | Send this to the friend who never replies. |
| Family | Generation battle | I made my mom play this. |
| Students | Focus challenge | Your focus score before finals. |
| Office | Leaderboard | Our whole team played. Guess who came last. |
| Toast humor | Character skit | This slice of toast has seen your screen time. |

### Starter hooks
1. Tap when it turns green. Comment your score.
2. Only 1 in this comment section will get this right.
3. Ignore the notification. I dare you.
4. Your attention span is about to get exposed.
5. Send this to the friend who says they're not cooked.
6. We played the same rounds. It got personal.
7. Which toast are you?
8. Your mom might beat you at this.
9. You have 5 seconds to remember this order.
10. If you tapped that, you're at least Crispy.
11. Our office played this. The boss should resign.
12. Golden or Charcoal? Let's find out.
13. Before you study, try this.
14. The fake notification got you, didn't it?
15. Send this to someone who still thinks they can multitask.

Hook 2 must not state a made-up statistic as fact when used. Rewrite it unless real data supports it.

### Distribution
- Start with 3 to 5 creators in the US and UK, then Germany and France.
- Creators post from their own accounts.
- Owner posts Reels and Shorts.
- Test 3 to 5 posts a day across accounts.
- Double down on hooks with high completion and high challenge rates.
- Evaluate content by players and purchases, not views alone.
- All paid creators must follow local disclosure rules.

---

## 26. Environments and deployment

- Hosting and DNS: Cloudflare
- Environments: local, preview, production
- Every pull request gets a preview deployment where possible.
- Neon branch for each preview where practical.
- Secrets stored in Cloudflare and GitHub, never in the repo.
- Separate Dodo test and live credentials.
- Separate Turnstile, PostHog, Sentry, Resend, and R2 settings by environment.
- CI runs type checks, unit tests, end-to-end smoke tests, and migration checks.
- Production deploys from `main` after checks pass.
- Add a rollback runbook to `docs/`.

---

## 27. Build milestones

This is the build order for a full launch. Timing is an estimate and assumes focused daily work.

### M0: Foundation, days 1 to 3
- Monorepo
- Brand tokens and fonts
- ToastMascot prototype
- Cloudflare, Neon, Hyperdrive, CI
- `CLAUDE.md`

**Check:** Hello-world page and database query work in preview.

### M1: Core game, weeks 1 to 2
- Calibration
- All four rounds
- Scoring engine and tests
- Full reveal
- Solo result
- Share card

**Check:** A person can finish the full solo game on a real phone without help.

### M1.5: Content test, starts as soon as Pop is playable
- Remotion setup
- Three play-along templates
- First 20 to 30 videos

**Check:** Content test runs without blocking the build.

### M2: Challenge loop, week 3
- Anonymous identity
- Challenge links
- Preview images
- Same-seed play
- Duo result
- Rematch
- Attribution

**Check:** Two phones can complete a challenge from a shared link.

### M3: Monetization, week 4
- Dodo integration
- Duo Report
- Recap video spike and build
- Restore purchases
- Billing portal

**Check:** Test purchases unlock correct access, and refunds remove access where required.

### M4: Retention and Pass, week 5
- Daily Toast
- Streaks
- Accounts
- Pass
- Score history
- Email and web push
- Toast Locker

**Check:** Subscription start, renewal, cancellation, and expiry all work in test mode.

### M5: Groups, week 6
- Group rooms
- Group Report
- Live rooms
- Team Room
- Family mode and Family Pass

**Check:** Thirty simulated live players can complete a room.

### M6: Focus Reset and localization, week 7
- 30-day plan
- German, French, Spanish
- Regional prices
- Consent and legal pages

**Check:** Native speakers approve the core journey in each language.

### M7: Hardening and launch, week 8
- Load test
- Accessibility pass
- Security review
- Admin tools
- Creator links
- Launch checklist
- Production smoke test

**Check:** Every launch-blocking checklist item passes.

---

## 28. Testing and definition of done

### Required tests
- Unit tests for seeded generation, scoring, sync, level boundaries, and entitlements
- Property tests for scoring limits
- Playwright flows for solo, challenge, purchase, restore, rooms, and account deletion
- Webhook replay and idempotency tests
- Load test for 1,000 game submissions per minute
- Real-device tests on iPhone Safari, Android Chrome, TikTok browser, and Instagram browser

### A feature is done when
- It meets this PRD.
- It works at 360 px wide.
- It has loading, empty, error, and offline states.
- It passes accessibility checks.
- It has analytics.
- It is localized or marked for translation.
- It passes the screenshot test in section 12.
- Tests pass.
- It works on real devices when timing or payments are involved.

---

## 29. Launch checklist

- [ ] Domain purchased
- [ ] Trademark checked
- [ ] Social handles secured
- [ ] Dodo live account approved
- [ ] Legal pages reviewed
- [ ] Consent flow tested in EU and UK
- [ ] Prices confirmed in USD, EUR, and GBP
- [ ] Checkout tested in real in-app browsers
- [ ] Refund and cancellation tested
- [ ] Data deletion tested
- [ ] Sentry alerts active
- [ ] Neon and Cloudflare spend alerts active
- [ ] Load test passed
- [ ] Rollback tested
- [ ] Support email active
- [ ] Creator codes active
- [ ] First 50 videos rendered
- [ ] All marketing claims reviewed
- [ ] Translations reviewed by fluent speakers

---

## 30. Owner tasks

- Confirm domain and handles.
- Run trademark checks in target markets.
- Open Cloudflare, Neon, Dodo, Resend, PostHog, and Sentry accounts.
- Complete payment-provider verification.
- Arrange legal and tax review.
- Find creators in the US, UK, Germany, and France.
- Review and edit all humor lines.
- Test on real devices.
- Approve prices and launch date.

---

## 31. Open decisions

1. Final domain, depending on availability.
2. Whether purchases require 18+ or parental permission in each market.
3. Which recap-video rendering path passes the technical spike.
4. Whether EU traffic justifies a Neon read replica.
5. Whether real data supports changing score weights or prices.

Do not block the build on these unless the affected milestone needs the answer.