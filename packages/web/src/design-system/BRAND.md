# Bitatlas Brand Guidelines

## Voice

**Map the digital world.** Bitatlas turns sprawling data terrain into a readable map.

Four principles govern every design + copy decision:

1. **Global perspective, local clarity.** Every view shows the whole terrain and the exact tile at once.
2. **A bit at a time.** Trust is built one verified dot. No hand-waving.
3. **Quiet confidence.** Deep navy, precise type, zero ornament. The data is the statement.
4. **Map, don't decorate.** Every pattern earns its place by clarifying. If it's only decorative, cut it.

## Logo

- Primary mark is the lowercase **b** with a dotted hemisphere inside its bowl.
- Minimum size: **24px** (mark), **96px wide** (wordmark lockup).
- Clear space: half the x-height of the wordmark on all sides.
- Allowed colors: Brand/500 on light, Brand/400 on dark, Ink/900 monochrome, white reversed.
- **Never**: recolor the dots independently, outline the mark, add drop shadow, stretch, rotate.

## Color

| Token       | Hex      | Use                               |
|-------------|----------|-----------------------------------|
| brand-500   | #2563EB  | Primary actions, links            |
| brand-600   | #1D4ED8  | Pressed / deep emphasis           |
| brand-400   | #3B82F6  | Mark on dark, hover states        |
| brand-050   | #EFF4FF  | Tint fills, badges                |
| ink-900     | #081220  | Dark canvas, body on light        |
| ink-700/600 | —        | Secondary text, dividers          |
| ink-100/050 | —        | Cards, subtle surfaces            |

**Backgrounds are navy or white.** No gradients, no accent colors beyond semantic (success/warn/danger).

## Type

- **Poppins** for all UI and marketing: weights 400, 500, 600, 700.
- **JetBrains Mono** for code, data, timestamps, technical detail.
- Scale lives in Tailwind as `text-display / text-h1..h3 / text-body / text-small / text-label`.
- **Label style** is always uppercase, 11px, weight 600, tracking 0.24em, Ink/400.

## Iconography

- 24×24 viewBox, 1.6px stroke, `stroke-linecap: round`, `stroke-linejoin: round`.
- `currentColor` only. Icon color = surrounding text color.
- Geometric. No illustrative or novelty icons.

## Imagery

Patterns, not photos, carry the brand:

- **DottedGlobe** — hero/loading/empty states
- **Meridians** — backgrounds, section breaks
- **BitGrid** — data-density backgrounds only

Photos: muted, editorial, never stock-ish. Default to patterns if unsure.

## Do / don't

✅ Pair navy surfaces with electric-blue accents and plenty of space.
✅ Use the `label` style to name sections.
✅ Let data be the loudest thing on screen.

❌ Don't introduce new colors, fonts, or icon styles without updating tokens.
❌ Don't fill empty space with filler copy or decorative SVGs.
❌ Don't use emoji or gradients.
