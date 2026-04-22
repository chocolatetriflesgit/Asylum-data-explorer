# Backlog

Short-form list of known-but-not-yet-scheduled work. Append new items at the bottom of the relevant priority section; strike through or delete as they land.

## High priority

### 1. UNHCR ingest — lights up Atlas "Per 100k displaced" metric

The UI is already wired: the metric button at [src/atlas-view.jsx:54](src/atlas-view.jsx) is gated on `UNHCR_POC_ANNUAL.length > 0`, and the computation at [src/atlas-view.jsx:453](src/atlas-view.jsx) joins `NAT_FULL.name → WORLD_MAP.iso → UNHCR_POC_ANNUAL.originIso` and divides applicants by total displaced × 100,000. Currently `data/unhcr-data.js` is a placeholder stub.

**To action:**

```bash
python scripts/fetch_unhcr.py     # public API, requests only; ~few minutes first run, cached thereafter
python scripts/build_unhcr.py     # writes data/unhcr-data.js
python scripts/bundle.py          # inline into index.html
python -m pytest tests/           # pipeline_integrity UNHCR assertions switch from skip to active
```

**Risk:** ISO-based join silently drops countries in `NAT_FULL` whose Home Office name can't be resolved to an ISO via `WORLD_MAP`. Spot-check Syria, Afghanistan, Iran in DevTools post-build.

**Open question:** add UNHCR to the daily CI workflow? Data changes annually, not daily — probably not worth the cron.

### 2. Outcome-analysis / ASY_D04 ingest — lights up Flow view cohort charts

The Flow view's cohort ribbon, backlog waterfall, and three-column sankey are all coded and currently render "pending data" fallbacks ([src/charts.jsx:1571](src/charts.jsx), [src/charts.jsx:1670](src/charts.jsx)). `data/outcome-cohort-data.js` is a placeholder stub.

**To action:**

```bash
python scripts/fetch_outcome_analysis.py
python scripts/build_outcome_analysis.py
python scripts/bundle.py
python -m pytest tests/           # pipeline_integrity OUTCOME_COHORT assertions switch from skip to active
```

## Medium priority

### 3. Register `scripts/build_world_map.py` in `scripts/_sources.py`

`data/world-map-data.js` is generated and consumed by the Atlas view but the script has no entry in the SOURCES registry, so the "what does this app pull?" answer at [scripts/_sources.py](scripts/_sources.py) is incomplete.

### 4. Decide the future of Age / sex on the Build view

[src/views-story-build.jsx:413](src/views-story-build.jsx) `DATASET_OPTIONS` does not expose `SEX_AGE_ANNUAL`. The Dashboard has a stats block but there's no Build-view chart for picking age/sex series interactively. Either build it or scrub any residual user-facing "coming soon" hints.

## Low priority

### 5. Phase 7 polish (carried over from the retired PROJECT_PLAN.md)

- Reduced-motion gate on the `fadeIn` keyframes in `index.html` (`design/tokens.md` flags this as outstanding).
- A11y focus-state sweep across interactive elements.
- Commit the three design-exploration artefacts (`design/directions.html`, `design/direction-cards.jsx`, `design/design-canvas.jsx`) only if stakeholders ask why the current direction was chosen.
