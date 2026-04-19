# Design tokens

The production design system for the Small Boats Data Explorer. Lifted from the `:root` CSS block in `index.html` and the chart primitives in `src/charts.jsx`. This page is authoritative — if production code deviates from what's written here, one of the two is wrong.

## Typography

Two families, both loaded from Google Fonts.

- **Serif** — `Source Serif 4`, with Georgia and Times New Roman as fallbacks. Everything readable is serif: headlines, body, figure labels, axis labels. The editorial voice is baked into the typeface.
- **Mono** — `JetBrains Mono`, with system mono fallbacks. Only for inline metric-style rendering where tabular-lining digits matter (e.g. badge codes, timestamps shown in meta).

Default body: 16 px, line-height 1.5, antialiased, with `onum` (old-style figures) and `kern` features enabled globally. Tables and stat cards override with `tnum` (tabular-lining figures) via the `.tnum` class or `font-variant-numeric: tabular-nums`.

### Type scale
Used sparingly. When adding a new text element, pick from this list rather than inventing a size.

| Role | Size | Weight | Notes |
| --- | --- | --- | --- |
| Hero headline | 42 px | 400 | Letter-spacing −0.4, line-height 1.04 |
| Section headline | 28 px | 400 | Letter-spacing −0.2 |
| Sub-headline | 19 px | 500 | Letter-spacing −0.1 |
| Body | 15.5 – 16 px | 400 | Line-height 1.5 – 1.62 |
| Caption / source line | 12.5 px | 400 | Italic, `--muted` colour |
| Kicker / uppercase label | 11 px | 500 | `.uc` class, letter-spacing 0.08, uppercase, `--muted` colour |
| Small caps | variable | 400 | `.sc` class, `font-variant: small-caps`, letter-spacing 0.06, lowercased |
| Axis / tick labels | 11 px | 400 | Serif, `--muted` colour, tabular nums |
| KPI number | 42 px | 400 | Letter-spacing −0.4, line-height 1, `.tnum` |

## Colour

The palette is warm-neutral with four accent hues, all named semantically. Do not introduce new hex values in JSX. Use `var(--accent)` etc. Accent colour is the only token the user can override via the tweak panel.

### Neutrals
- `--bg` `#fbfaf7` — page background (warm cream)
- `--bg-2` `#f5f2ea` — block / card background
- `--bg-3` `#efe9db` — deeper block background, blockquotes, methodology callouts
- `--ink` `#1a1a17` — body text, headlines
- `--ink-2` `#3a342a` — secondary text
- `--muted` `#7a6d5a` — labels, axis text, de-emphasised copy
- `--muted-2` `#9a8f78` — further de-emphasis
- `--rule` `#e8e2d4` — hairline rules, grid lines inside charts
- `--rule-2` `#d6cdb8` — stronger rules, button borders, input borders

### Accents
- `--accent` `#1c3d2e` — forest green. The primary — used for CTAs, active states, primary line series, and the first chart stroke.
- `--accent-2` `#5a7d3b` — olive green. Positive / secondary series. Used for the "granted asylum" colour in decision charts and the second line in multi-line series.
- `--accent-warn` `#b85c38` — terracotta. Negative / alert / attention series. Used for refusals, negative deltas, and drawing the eye to a specific annotation.
- `--accent-gold` `#8a6d3b` — gold / umber. Tertiary / "other" series and the third line in multi-series charts.

### Multi-line chart rotation
Series colour order (from `MULTI_COLORS` in `charts.jsx`):
1. `--accent`
2. `--accent-warn`
3. `--accent-2`
4. `--accent-gold`
5. `--muted`

Don't invent a sixth. If a chart needs more than five series, redesign it.

### Accent override
The tweak panel lets users swap `--accent` among forest, navy, sage, umber, plum, ink. Everything that reads `var(--accent)` inherits the change. Nothing else should be user-tweakable — the semantic roles are fixed.

## Spacing & layout

- Content max-width: 1300 px for dashboard-scale layouts, 1240 px for footer, 720 px for story prose, 640 px for captions.
- Page padding: 36 px top / 48 px sides / 80 px bottom for dashboards; 28 px / 40 px for drawers.
- Grid gaps: 14 px between KPI cards, 28 px between chart blocks, 40–56 px between major sections.
- Rhythm values (margins between elements): 6, 8, 10, 14, 18, 22, 28, 36, 44 px. Pick from this ladder. Do not use arbitrary values like 17 or 23.

## Rules, borders, decorative marks

- Section rules: 1 px solid `--rule`. Used to separate KPI strip, chart row, and regional table.
- Accent rules under kickers: 2 px solid `--accent-warn` (`.kicker-rule`), with variants `.rule-olive`, `.rule-gold`, `.rule-terra`, `.rule-accent`.
- End-of-paragraph dot: 6×6 px circle in `--accent-warn` (`.end-dot`). Marks end of a feature item. Variants `.end-dot-olive`, `.end-dot-gold`.
- KPI cards have a 36 px × 3 px accent bar at top-left. Default `--accent-warn`; variants `.olive`, `.gold`, `.accent`, `.ink` change the bar colour.
- Tick marker: 10 px × 2 px horizontal bar (`.tick`) as a legend indicator. Variants `.tick-olive`, `.tick-gold`, `.tick-accent`.

## Charts

All charts are SVG, hand-written, no library. Live in `src/charts.jsx`.

### Defaults
- Stroke width: 1.8 px for primary line series, 1.4 px for multi-line series, 0.8 px for annotation callout lines.
- Stroke caps and joins: `round`. No sharp corners on line ends.
- Area fill: linear gradient from the stroke colour at 18% opacity to 0% opacity over the vertical extent.
- Dots on data points: `r=3`, filled with the series stroke colour. Invisible 14-px hit target overlays them for hover.
- Grid lines: horizontal only, 1 px, `--rule`. No vertical grid.
- Axis rules: x-axis is 1 px `--rule-2`. No y-axis rule.
- Tick labels: 11 px serif, `--muted`, `fontVariantNumeric: tabular-nums`. Y-axis right-aligned, 10 px left of the plot; x-axis centred, 18 px below the plot.
- Annotations: a small ring `r=5` on the point, a thin line out to the label, italic label text in `--ink-2`.
- Y-axis always starts at 0 unless there is a specific editorial reason not to, in which case the break must be annotated.

### Chart title, caption, source
Every chart renders three optional elements in order:
1. **Title & subtitle** (figcaption) — subtitle above in `.uc` muted, title below at 19 px / 500 weight
2. **Caption** — 12.5 px italic muted, below the SVG, max-width 640 px
3. **Source line** — `Source: ...` in `.uc`, 12 px below the caption

If a chart has none of these, it renders just the SVG. Tooltips are absolutely positioned inside the `.chart-wrap` figure wrapper.

### Tooltip
Black-on-cream pill (`--ink` background, `--bg` text), 12 px, 8 × 10 px padding, with a small triangular tail below. Follows the cursor using the `useTooltip` hook. Single line, never multi-line.

### Numbers in labels
- Use `fmtK(v)` (`12.4k`, `200k`) for axis tick values ≥ 1000.
- Use `fmtN(v)` (`12,345`) for tooltip values and KPI stats — en-GB locale, comma-grouped.
- Never round a KPI number. Show it in full.

## Interactions

- Hover: 150 ms opacity transition on buttons (`.pressable`). 120 ms on tooltips.
- Active/selected: a 2 px outline at 2 px offset in `--ink` for swatches; inverse (accent background, bg text) for selected segmented buttons and range pills.
- Drawers: slide in from the right, 300 ms cubic-bezier, max width 520 px or 92 vw. Scrim at 30% black.
- Range sliders: 2 px track in `--rule-2`, 14 px thumb in `--accent` with a 2 px `--bg` ring.

## Accessibility

- Contrast: `--ink` on `--bg` is approximately 15.4:1 (passes AAA). `--muted` on `--bg` is approximately 4.8:1 (passes AA for body). Do not use `--muted-2` for anything smaller than 14 px.
- Tabular figures on every chart axis, KPI value, and data table to prevent digit-width shifts.
- `preserveAspectRatio` and `viewBox` on every SVG — charts scale responsively.
- Respect `prefers-reduced-motion`: keyframe animations (`fadeIn`) should be gated on `@media (prefers-reduced-motion: no-preference)` when added. The current shell does not do this yet — fix when encountered.
- All interactive elements are real buttons or have a visible focus state. No bare divs with click handlers for nav or filtering.

## Motion

Minimal. Three named patterns:

- **Fade-enter** — `opacity 0 → 1`, `translateY(6px) → 0`, 350 ms ease. Used on view mount (`.fade-enter`).
- **Pressable** — `opacity 150 ms` on hover. Used for secondary controls.
- **Drawer slide** — `transform 300 ms cubic-bezier(.2,.7,.2,1)`.

If adding a new animation, choose from these three first. Invent a fourth only if the three genuinely don't fit.

## What not to do

- No shadows. The design is flat with ruled borders. Dropping a shadow on a card breaks the system.
- No gradients on backgrounds or text. The only gradient in the app is the area-fill under line charts.
- No emoji. No icon fonts. Lucide or simple inline SVG only where an icon is unavoidable — and most places don't need one.
- No rounded corners on cards, buttons, or inputs. The only radius in the system is on tiny decorative dots (50% for the end-dot circle) and on range-slider thumbs.
- No sans-serif. If you're reaching for Inter or system-ui, stop and use Source Serif 4.
- No animated counting up of KPI numbers. They render at their final value.
- No dark mode. The warm-cream background is the identity of the design; a dark version would be a different product.
