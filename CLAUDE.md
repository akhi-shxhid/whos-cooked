# Who's Cooked? — Claude Code instructions

The full product spec is in [PRD.md](PRD.md). Read it before starting a new milestone.

## Working rules (PRD section 0)

- Build in the milestone order in PRD section 27. Finish a milestone's acceptance checks before starting the next.
- Do not change the brand, name, colors, fonts, scoring model, or prices without asking the owner.
- Do not add a dependency if the platform or an existing dependency already does the job.
- Do not invent user counts, testimonials, percentiles, press logos, or scientific claims.
- If a vendor's API or limit differs from the PRD, check the current docs, follow them, and report the difference.
- Build real features, not placeholders. Any temporary stub needs a `TODO(Mx)` comment and must appear in the milestone report.
- At the end of each milestone, report what shipped, what was tested, and what still needs the owner.

## Repo map

| Path | What lives there |
|---|---|
| `apps/web` | Astro site and React islands (static, deployed as Workers static assets) |
| `apps/api` | Hono Worker, base path `/api/v1` |
| `packages/game-core` | Seeded RNG, rules, scoring (`src/scoring.ts`) |
| `packages/game-renderer` | PixiJS rounds |
| `packages/brand` | Tokens, fonts, ToastMascot, shared components |
| `packages/db` | Drizzle schema, migrations, queries |
| `packages/payments` | `PaymentProvider` interface and Dodo implementation |
| `packages/i18n` | Paraglide messages and locale tools |
| `packages/analytics` | Typed PostHog event helpers |
| `packages/video` | Remotion compositions |
| `docs/` | Decisions, design notes, audio licenses, runbooks |

## Commands

- `pnpm install` — install everything
- `pnpm dev` — web on http://localhost:4321 and API on http://localhost:8787 (web proxies `/api`)
- `pnpm typecheck` — strict TypeScript across all workspaces
- `pnpm test` — Vitest across packages and the API
- `pnpm e2e` — Playwright smoke tests against a built web preview
- `pnpm build` — build every workspace

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

