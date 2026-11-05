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
