# Small Boats Data Explorer

Project context for Claude Code. Keep edits to this file minimal and specific.

## What this is

A browser-based data explorer for UK Home Office small-boats crossing data (English Channel, 2018–present). Single-page React app, no build step at runtime — everything is served as one HTML file with inlined data and Babel-in-the-browser for JSX.

Primary source: the "Migrants detected crossing the English Channel in small boats — time series" ODS file published weekly at https://www.gov.uk/government/publications/migrants-detected-crossing-the-english-channel-in-small-boats. Secondary source for intra-week provisional figures: the "last 7 days" HTML page at https://www.gov.uk/government/publications/migrants-detected-crossing-the-english-channel-in-small-boats/migrants-detected-crossing-the-english-channel-in-small-boats-last-7-days.

The app is built on top of an existing Home Office Data Explorer shell (newspaper-style layout, stories, dashboard, datasets, build views, tweakable theme). The shell stays; small-boats becomes its dedicated section.

## Repository layout

```
/
├── index.html                 # Single-file runnable app. This is what deploys.
├── src/                       # JSX modules, bundled into index.html
│   ├── data.jsx               # Hardcoded shell data (asylum/backlog/regions/stories)
│   ├── root.jsx               # App component + routing + tweak panel
│   ├── app.jsx                # Header, footer, search, methodology drawer
│   ├── dashboard-view.jsx     # /dashboard route
│   ├── views-story-build.jsx  # /story, /datasets, /build routes
│   └── charts.jsx             # SVG chart primitives (LineChart, Spark, etc.)
├── design/                    # Design references, NOT loaded at session start
│   ├── README.md              # Index of design artefacts — read this first
│   ├── tokens.md              # Design tokens (colours, type, spacing, charts)
│   ├── directions.html        # Three design directions, runnable
│   ├── direction-cards.jsx    # Design directions as React components
│   └── design-canvas.jsx      # Figma-ish canvas used during exploration
├── data/
│   └── boats-data.js          # AUTO-GENERATED. Do not edit by hand.
├── scripts/
│   ├── build_boats_data.py    # ODS → boats-data.js
│   └── fetch_latest.py        # gov.uk → local ODS cache (Phase 2)
├── cache/
│   └── *.ods                  # Downloaded source files, gitignored
├── .github/workflows/
│   └── update-data.yml        # Daily cron that runs fetch + build + commit
├── tests/
│   └── ...                    # Data-integrity checks
└── CLAUDE.md                  # This file
```

`index.html` is the deliverable. `src/*.jsx` and `data/boats-data.js` are concatenated into it by a simple bundle step.

## Architecture in one paragraph

A bundler concatenates `data/boats-data.js` + every `src/*.jsx` into a single `<script type="text/babel">` block inside `index.html`. React 18 UMD, Babel standalone, and Google Fonts load from CDNs. Routing is local state in `root.jsx`, persisted to `localStorage`. Every chart reads from globals exposed on `window` (`ASYLUM_ANNUAL`, `BOATS_DAILY`, `BOATS_WEEKLY`, `BOATS_ANNUAL`, `BOATS_YOY`, `BOATS_RECORDS`, `BOATS_META`, etc.). There is no state management library and no client-side data fetching — all data is inlined at bundle time.

## Data globals (defined in `data/boats-data.js`)

- `BOATS_DAILY` — `[{d: "YYYY-MM-DD", m: migrants, b: boats}]`, ~3,000 entries from 2018-01-01
- `BOATS_WEEKLY` — `[{we, m, b, p: prevented, e: events_prevented}]`; preventions null before ~2023
- `BOATS_MONTHLY` — `[{month: "YYYY-MM", m, b}]`
- `BOATS_ANNUAL` — `[{y, m, b, perBoat}]`
- `BOATS_YOY` — `{"2018": [cum_day_1, cum_day_2, ...366], ...}` — cumulative by day-of-year, null past last data point
- `BOATS_RECORDS` — `{busiestDay, busiestWeek, busiestMonth, totalMigrants, totalBoats, firstDate, latestDate, daysCovered}`
- `BOATS_META` — `{sourceFile, sourceDated, latestDataPoint, generatedAt, provider, licence, sourceUrl, notes[]}`

Schema details live in the docstring of `scripts/build_boats_data.py`. Treat that script as the schema's single source of truth; update it there first if the shape changes.

## Commands

```bash
# Regenerate the data module from a local ODS (one-off)
python scripts/build_boats_data.py cache/latest.ods data/

# Fetch latest ODS from gov.uk, parse, write boats-data.js (Phase 2+)
python scripts/fetch_latest.py

# Bundle src/*.jsx + data/boats-data.js into index.html
python scripts/bundle.py

# Local dev server (any static server works)
python -m http.server 8000

# Run data integrity tests
python -m pytest tests/
```

## Editing rules

- **Never edit `data/boats-data.js` by hand.** Regenerate it via `scripts/build_boats_data.py`.
- **Never edit the bundled `<script type="text/babel">` block in `index.html` directly.** Edit the `src/*.jsx` source and re-bundle.
- When changing the data schema, update `scripts/build_boats_data.py` and `tests/` in the same commit.
- Keep all chart code in `charts.jsx`. Views compose charts; they don't define new SVG primitives inline.
- Design tokens are documented in `design/tokens.md` and implemented in the `:root` CSS block of `index.html`. Use `var(--accent)`, `var(--accent-warn)`, `var(--muted)`, etc. Never hardcode hex values in JSX. When in doubt about a visual decision, `design/tokens.md` is the authority — see "Design references" below.
- Numbers in the UI must trace back to a specific field in `BOATS_*`. No hardcoded statistics in story copy — if a figure is needed, compute it from the data globals or add a derived field to the pipeline.

## Design references

Design artefacts live in `design/`, **not** loaded by default. Read on demand:

- `design/tokens.md` — the authoritative design system: colour tokens, type scale, spacing rhythm, chart conventions, motion, and accessibility rules. This is the single source of truth for visual decisions. **Read first** before any task touching layout, colour, typography, or charts.
- `design/README.md` — catalogue of what's in `design/` and why.
- `design/directions.html` — the three design directions evaluated during exploration. Reference only; production landed on a refined direction 1.
- `design/direction-cards.jsx` — the directions as React components, useful for showing stakeholders why the chosen direction won.
- `design/design-canvas.jsx` — the exploration tool (pan/zoom canvas). Not production.

Rule: for any visual work, read `design/tokens.md` first. Only open the other files if the token summary is insufficient. Do not import from `design/` into `src/` — these files are snapshots, not modules.

## Copy & framing

This project presents human displacement data. Keep the tone neutral and figures-first, matching the existing shell. No editorial framing, no emotive language, no political characterisation. State what the numbers are; let the reader interpret.

Label provisional data as provisional. The weekly ODS is the canonical source; the "last 7 days" page is provisional and must be visually distinguished in any view that shows it.

## Things that look like problems but aren't

- Dates earlier than 2018-05 are mostly zero-arrival days. That's real — the data series starts 2018-01-01 and crossings were genuinely rare before mid-2018. Do not trim.
- The `uncontrolled` field in SB_01 is `-` before boats-involved-in-uncontrolled-landings started being recorded. Pipeline coerces to `null`, not `0`. Charts should skip null, not plot zero.
- `BOATS_WEEKLY[i].p` and `.e` are null before preventions began being reported (~2023). Same rule: skip, don't zero.
- `BOATS_YOY` arrays have length 366 always. The current year's array is null past the latest data point — stop drawing lines at the first null, don't interpolate.
- The existing `ASYLUM_ANNUAL.boats` column is hand-maintained annual totals; they duplicate `BOATS_ANNUAL` but live in `data.jsx` for the shell's existing charts. When `BOATS_ANNUAL` changes, update `ASYLUM_ANNUAL.boats` in the same commit.

## Out of scope (don't build without explicit ask)

- Nationality, age, sex, or outcome breakdowns of small-boat arrivals — not in SB_01/SB_02.
- Geographic breakdown of landings (Dover, Ramsgate, etc.) — not in this dataset.
- Forecasts, projections, or trend extrapolation.
- Rebuilding the shell. Asylum/decisions/backlog/regions pages stay as they are.
- Replacing the inline-everything architecture with a bundler (webpack/vite/etc.) — not now.

## Dependencies

- Python 3.11+, `pandas`, `odfpy` (ODS reading), `requests`, `beautifulsoup4` (fetcher)
- No Node.js build step. React, ReactDOM, Babel standalone load from unpkg at runtime.
- Fonts: Source Serif 4 + JetBrains Mono from Google Fonts.

## Testing

`tests/` contains data-integrity checks that run on every CI build:
- Annual totals in `BOATS_ANNUAL` equal the sum of daily migrants for that year
- `BOATS_RECORDS.totalMigrants` equals the final value of `dailyCumulative`
- Every weekly row's `we` (week ending) is a Saturday
- No date gaps in `BOATS_DAILY` from `firstDate` to `latestDate`
- `BOATS_META.latestDataPoint` is within 14 days of today (warning, not failure)

When adding a derived field to the pipeline, add a corresponding invariant test.

## Auto-update (GitHub Actions)

`.github/workflows/update-data.yml` runs daily at 07:00 UTC:
1. Run `scripts/fetch_latest.py` — scrapes gov.uk publications page, resolves current ODS URL (filename changes each release), downloads only if changed.
2. Run `scripts/build_boats_data.py` — regenerates `data/boats-data.js`.
3. Run `scripts/bundle.py` — rebuilds `index.html`.
4. Run `pytest tests/` — data integrity gate.
5. Commit changes with message `chore: data update <YYYY-MM-DD>` if files changed.

Failure modes: if the fetcher can't find the ODS link, the Action fails loudly. The app reads `BOATS_META.latestDataPoint` and shows a stale-data banner in the UI after 14 days.

## Git conventions

- Commit messages: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`). Data updates are always `chore: data update <YYYY-MM-DD>`.
- Don't commit `cache/*.ods` — gitignored.
- Don't commit `index.html` on the same commit as a `src/*.jsx` edit without running the bundle. CI enforces this.

## When stuck

- Upstream data questions ("what does this app fetch from gov.uk?") → read `scripts/_sources.py`. That file is the canonical registry: every publication, its landing URL, filename stem, fetcher, builder, data file, and the `window.*` globals it produces.
- Data shape questions → read `scripts/build_boats_data.py`.
- Routing / layout questions → read `src/root.jsx` and `src/app.jsx`.
- Chart API questions → read `src/charts.jsx`.
- Methodology / caveats → read the `notes` array in `BOATS_META`, which lifts the Notes sheet from the source ODS verbatim.
