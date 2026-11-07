# Design notes

## Contrast (checked in packages/brand/src/contrast.test.ts)

| Pair | Ratio | Allowed use |
|---|---:|---|
| burnt on butter | 11.20 | All text |
| white on plate | 6.19 | All text (primary buttons) |
| plate on butter | 4.20 | Large text, focus rings, UI shapes only |
| burnt on jam | 4.20 | Large text and shapes only |
| white on crust | 4.22 | Large text only |
| jam on butter | 2.67 | Never for text or as the only signal. Pair mistakes with a burnt outline or icon shape |
| crust on butter | 2.87 | Decoration only |

## Toast doneness ramp
`packages/brand/src/doneness.ts` derives every toast shade by mixing existing tokens
(white, butter, crust, burnt). No new colors were added. Face ink switches between
burnt and white, whichever has more contrast with the crumb.

## Fonts
Self-hosted through Fontsource (`@fontsource/bagel-fat-one`, `@fontsource/atkinson-hyperlegible`),
which uses `font-display: swap` and ships latin and latin-ext subsets for EN, DE, FR, ES.

## Order Up ingredients
Butter, jam, egg, cheese, honey, and mushroom. Each is drawn only in brand colors and is told
apart by shape and its text label, never by color alone. Avocado and tomato were dropped
because they would need a green and a second red.

## Game stage
Rounds draw on a white plate with a burnt outline, so butter pats (butter on white) keep a
burnt outline for shape contrast. Mistakes show text ("Too soon", "Crumb!") as well as jam color.
