# Project Plan — Small Boats Data Explorer

Phased build-out from the current state (empty repo + `CLAUDE.md` + `design/` reference) to the production app described in `CLAUDE.md`.

## Current state

| Exists | Missing |
| --- | --- |
| `CLAUDE.md`, `design/tokens.md`, `design/README.md`, `README.md` (stub), `.gitattributes` | Everything else: `index.html`, `src/`, `data/`, `scripts/`, `cache/`, `tests/`, `.github/workflows/`, `.gitignore` |

## Guiding principles

- **Data pipeline first.** Every chart reads from `window.BOATS_*` globals. Nothing visual makes sense until the data module exists.
- **Flesh out the shell before the views.** `root.jsx` (routing) and `app.jsx` (chrome) before `dashboard-view.jsx`.
- **Design tokens are implementation, not decoration.** `design/tokens.md` must land in the `:root` CSS block of `index.html` exactly as written — same hex values, same custom-property names, same rhythm ladder.
- **Commit in slices that run.** Each phase leaves the repo in a buildable, demo-able state.

---

## Phase 0 — Bootstrap (½ day)

Hygiene the repo so subsequent phases don't fight tooling.

- [ ] `.gitignore` — `cache/*.ods`, `__pycache__/`, `.pytest_cache/`, `.venv/`, `node_modules/` (defensive), `.DS_Store`
- [ ] Rewrite `README.md` — one paragraph on what the project is, link to `CLAUDE.md` for developers
- [ ] `requirements.txt` — `pandas`, `odfpy`, `requests`, `beautifulsoup4`, `pytest`

**Exit criteria:** `python -m venv .venv && pip install -r requirements.txt` succeeds.

---

## Phase 1 — Data pipeline (2–3 days)

Turn the weekly gov.uk ODS into `data/boats-data.js`. Manual ODS fetch only at this stage.

- [ ] `scripts/build_boats_data.py` — ODS reader → all seven `BOATS_*` globals as documented in `CLAUDE.md` § "Data globals". Include docstring that is the schema source of truth.
- [ ] `data/boats-data.js` generated from a cached ODS in `cache/`
- [ ] `tests/test_data_integrity.py` — the five invariants listed in `CLAUDE.md` § "Testing"
- [ ] Handle the two null-handling quirks: `uncontrolled` field (`-` → `null`), `BOATS_WEEKLY.p`/`.e` null before 2023
- [ ] `BOATS_YOY` arrays always length 366, nulls past latest point

**Exit criteria:** `python scripts/build_boats_data.py cache/latest.ods data/ && pytest tests/` is green.

---

## Phase 2 — Shell & design tokens in HTML (1–2 days)

The `index.html` scaffold with design system CSS, React UMD, Babel standalone, Google Fonts. No charts yet, but the typographic identity is visible.

- [ ] `index.html` with `:root` CSS implementing every token from `design/tokens.md` (neutrals, accents, type scale, rhythm, rules, motion)
- [ ] React 18 UMD + Babel standalone script tags
- [ ] Google Fonts: Source Serif 4 + JetBrains Mono
- [ ] `src/root.jsx` — routing (localStorage-persisted state), tweak-panel stub, accent override plumbing
- [ ] `src/app.jsx` — header, footer, search stub, methodology drawer
- [ ] `scripts/bundle.py` — concatenate `data/boats-data.js` + `src/*.jsx` into the `<script type="text/babel">` block in `index.html`

**Exit criteria:** `python scripts/bundle.py && python -m http.server 8000` shows the chrome at `localhost:8000`, accent override works, typography matches tokens.

---

## Phase 3 — Chart primitives (2–3 days)

Implement `src/charts.jsx`. Everything downstream depends on this being right.

- [ ] `LineChart` (primary + multi-series), `Spark`, area-fill gradient helper
- [ ] `MULTI_COLORS` constant in the order specified in `design/tokens.md`
- [ ] `useTooltip` hook, black-on-cream pill with triangle tail
- [ ] `fmtK`, `fmtN` number formatters
- [ ] Chart title/caption/source wrapper (figcaption + `.uc` subtitle + italic caption + `Source:` line)
- [ ] Annotation primitive (ring + callout + italic label)
- [ ] Responsive SVG (`viewBox` + `preserveAspectRatio`)
- [ ] Null-skipping (no zero-plotting for `null` values — honours Phase 1 quirks)

**Exit criteria:** a throwaway `/sandbox` route renders each primitive with `BOATS_DAILY`/`BOATS_WEEKLY`/`BOATS_YOY` without visual regressions against `design/tokens.md` rules.

---

## Phase 4 — Dashboard view (2 days)

First real page. `/dashboard` route, the visible core of the product.

- [ ] KPI strip backed by `BOATS_RECORDS` (total migrants, total boats, busiest day/week/month, days covered)
- [ ] Primary time series — weekly migrants with preventions overlay (null-aware)
- [ ] Year-on-year cumulative lines from `BOATS_YOY`
- [ ] Annual totals table with per-boat averages from `BOATS_ANNUAL`
- [ ] Provisional-data banner if `BOATS_META.latestDataPoint` is >14 days old
- [ ] `ASYLUM_ANNUAL.boats` in `src/data.jsx` reconciled with `BOATS_ANNUAL` — add the reconciliation invariant to tests

**Exit criteria:** `/dashboard` renders end-to-end with the committed `boats-data.js`; KPIs trace back to source fields.

---

## Phase 5 — Story, datasets, build views (2–3 days)

- [ ] `src/views-story-build.jsx` — `/story`, `/datasets`, `/build` routes
- [ ] `/story` — narrative prose with inline `Spark`s, no editorial framing, every number traces to `BOATS_*`
- [ ] `/datasets` — table of available globals with schema snippets lifted from `build_boats_data.py` docstring
- [ ] `/build` — methodology, source links, notes lifted verbatim from `BOATS_META.notes`, licence

**Exit criteria:** four routes usable, no hardcoded statistics in copy, methodology drawer opens from any view.

---

## Phase 6 — Auto-fetch and CI (1–2 days)

- [ ] `scripts/fetch_latest.py` — scrape gov.uk publications page, resolve ODS URL (filename changes each release), conditional download into `cache/`
- [ ] `.github/workflows/update-data.yml` — daily 07:00 UTC cron: fetch → build → bundle → pytest → commit `chore: data update <YYYY-MM-DD>` if changed
- [ ] CI enforcement: commit containing `src/*.jsx` edits must also contain a re-bundled `index.html`
- [ ] Loud failure if the fetcher can't resolve the ODS link

**Exit criteria:** manually triggered workflow completes green; a synthetic change in the ODS produces a clean update commit.

---

## Phase 7 — Polish and reference artefacts (optional)

- [ ] `design/directions.html`, `design/direction-cards.jsx`, `design/design-canvas.jsx` — the three exploration artefacts referenced by `design/README.md` but not yet committed. Low priority; only needed if someone asks "why direction 1?"
- [ ] Reduced-motion gate on `fadeIn` keyframes (flagged in `design/tokens.md` as outstanding)
- [ ] A11y sweep: focus states on every interactive, no bare click-handling divs

---

## Rough timeline

~10–16 working days to Phase 6. Phase 7 is opportunistic.

## Risks

- **ODS schema drift.** gov.uk publishes weekly; column names have changed before. Tests need to fail loud, not silent.
- **Bundler-less architecture.** Babel-in-browser is slower; if file count grows past ~8 `src/*.jsx` modules, reconsider (but this is explicitly out of scope for now per `CLAUDE.md`).
- **Fetcher fragility.** Publications page HTML is the weakest link. Treat `fetch_latest.py` as a scraper — assume it will break and build observability around it.
