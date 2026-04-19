# design/

Design artefacts for the Small Boats Data Explorer. Kept separate from `src/` because these files either (a) were exploration never intended for production or (b) are reference material, not runtime code.

Claude Code does not load these automatically. Open the one relevant to the task.

## What to read first

For any task that touches visual output — new chart, new view, layout change, styling — **open `tokens.md` first**. It's the distilled version of every file in this directory. The full files exist if you need them, but tokens.md answers most questions in one page.

## Contents

### `tokens.md`
The design system, condensed. CSS custom properties, type scale, spacing rhythm, chart conventions, accessibility rules. This is the authoritative reference for anything being added to the production app. If a rule isn't here, it isn't a rule.

### `directions.html`
Self-contained runnable HTML showing the three design directions that were evaluated during exploration: an editorial broadsheet direction, an almanac direction, and a literary direction. Production landed on a refined version of direction 1 (editorial, Source Serif, forest + terracotta palette). Open in a browser to see all three side by side.

Status: **reference only**. Not part of the production bundle. Don't reuse code verbatim — the production `src/charts.jsx` supersedes the chart primitives here.

### `direction-cards.jsx`
The three design directions as React components, each rendering a full page-scale mockup with shared sample data. Useful if a stakeholder asks "why did we choose direction 1?" — open this and show them 1, 2, and 3 rendering against the same numbers.

Status: **reference only**. The `ASYLUM_DATA` and `NAT_SERIES` inside this file are mockup data, not live.

### `design-canvas.jsx`
A Figma-style canvas wrapper (pan, zoom, post-it notes, artboards) used to arrange the three directions side by side during review. Only useful if you want to re-open that review workflow.

Status: **tooling for exploration**, not production. Nothing in the runtime depends on this.

## What lives where

| File | Type | In production? |
| --- | --- | --- |
| `tokens.md` | Reference | No — but production must match it |
| `directions.html` | Exploration output | No |
| `direction-cards.jsx` | Exploration source | No |
| `design-canvas.jsx` | Exploration tooling | No |
| `../src/charts.jsx` | Production | **Yes** |
| `../src/*.jsx` | Production | **Yes** |
| `../index.html` | Production | **Yes** — the deliverable |

## When to update this directory

- When production deviates from a rule written in `tokens.md`, update `tokens.md` first, then the code. If the deviation is intentional, `tokens.md` is the rule; update it. If the deviation is accidental, fix the code.
- When a new design direction is explored (rare), add a new `direction-N.jsx` and document it in this README.
- Don't update `directions.html` or `direction-cards.jsx` to reflect production changes. They are snapshots of the exploration, not living documents.
