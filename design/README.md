# design/

Design artefacts for the Small Boats Data Explorer. Kept separate from `src/` because these files either (a) were exploration never intended for production or (b) are reference material, not runtime code.

Claude Code does not load these automatically. Open the one relevant to the task.

## What to read first

For any task that touches visual output — new chart, new view, layout change, styling — **open `tokens.md` first**. It's the distilled version of every file in this directory. The full files exist if you need them, but tokens.md answers most questions in one page.

## Contents

### `tokens.md`
The design system, condensed. CSS custom properties, type scale, spacing rhythm, chart conventions, accessibility rules. This is the authoritative reference for anything being added to the production app. If a rule isn't here, it isn't a rule.

### `mockups-content-ideas.html`
Self-contained runnable HTML with exploratory content and layout mockups. Useful as a reference when sketching out new sections.

Status: **reference only**. Not part of the production bundle. Don't reuse code verbatim — the production `src/charts.jsx` supersedes anything chart-shaped here.

## What lives where

| File | Type | In production? |
| --- | --- | --- |
| `tokens.md` | Reference | No — but production must match it |
| `mockups-content-ideas.html` | Exploration output | No |
| `../src/charts.jsx` | Production | **Yes** |
| `../src/*.jsx` | Production | **Yes** |
| `../index.html` | Production | **Yes** — the deliverable |

## When to update this directory

- When production deviates from a rule written in `tokens.md`, update `tokens.md` first, then the code. If the deviation is intentional, `tokens.md` is the rule; update it. If the deviation is accidental, fix the code.
- Don't update `mockups-content-ideas.html` to reflect production changes. It's a snapshot of exploration, not a living document.
