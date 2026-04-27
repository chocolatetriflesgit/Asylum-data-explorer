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

### 6. Atlas comparison UX — make "compare" more discoverable

The current flow requires shift-click to add a comparison country ([src/atlas-view.jsx:445](src/atlas-view.jsx)), which is not obvious and unavailable on touch devices. The hint at [src/atlas-view.jsx:586](src/atlas-view.jsx) is the only affordance. Options: (a) add a "Compare with…" button in the `AtlasDetail` panel ([src/atlas-view.jsx:270](src/atlas-view.jsx)), (b) add a compare toggle to each country row in the ranked sidebar list ([src/atlas-view.jsx:577](src/atlas-view.jsx)), or (c) both. Either approach should keep shift-click working as a power-user shortcut alongside the new UI.

### 7. Public-launch SEO + real URLs (pushState routing, custom domain, social cards)

Bundle the SEO and routing work together so they land against the same base path. Pre-requisite: copy / framing for public audiences is written and reviewed.

**Custom domain (operational, no code on its own):**

- Pick a name + TLD (suggestions in the plan: `migrationdata.uk`, `ukmigrationdata.org`, `data.<something>.uk`). Avoid editorial framing.
- Decide apex vs. subdomain. Subdomain (single CNAME → `chocolatetriflesgit.github.io`) is cleaner; apex needs four A records to GitHub's IPs (`185.199.108.153`, `.109.153`, `.110.153`, `.111.153`).
- Buy via Cloudflare Registrar (near-cost, same place as the rate-limiting / WAF setup in item 7-Cloudflare above).
- GitHub repo Settings → Pages → set Custom domain → tick Enforce HTTPS once cert provisions.
- Commit `CNAME` at repo root once domain is locked in.

**Tier 1 SEO meta tags (~10 lines in `index.html` `<head>`):**

- `<link rel="canonical">`, Open Graph (`og:title/description/url/type/site_name/locale/image`), Twitter Card (`summary_large_image`), explicit `<meta name="robots" content="index, follow, max-image-preview:large">`, `<meta name="theme-color" content="#1c3d2e">`, favicon (inline SVG to avoid extra request).
- Wrap the block in `SEO_BEGIN` / `SEO_END` sentinels matching the existing bundler pattern so daily data updates don't clobber it.

**Tier 2 — social card image:**

- 1200×630 PNG at `static/og-card.png`. Static is fine to start; a generated card (Python → SVG → PNG with live "X arrivals in YYYY" headline figure) is a nicer-but-later upgrade.

**Tier 3 — pushState routing (the actual SEO unlock):**

Currently routing lives only in React state + `localStorage` ([src/root.jsx:64-75](src/root.jsx)). Hash-routed and state-only URLs aren't indexed as separate pages by Google, so today only the homepage gets indexed. Plan:

- New `src/router.jsx` with `routeFromPath()`, `pathFromRoute()`, and a `<Link to={...}>` component that renders a real `<a href>` with `onClick` calling `history.pushState`.
- Remove `localStorage` route persistence in `root.jsx`; initial state from `routeFromPath(location.pathname)`; `popstate` listener for back/forward.
- URL map: `/` (index), `/dashboard`, `/atlas`, `/flow`, `/build`, `/datasets`, `/updates`, `/story/<id>`.
- Replace ~15 `setRoute({...})` button handlers across `app.jsx`, `atlas-view.jsx`, `dashboard-view.jsx`, `flow-view.jsx`, `views-story-build.jsx` with `<Link>`. Mechanical.
- New `404.html` at repo root using the rafgraph SPA-on-Pages trick (`/dashboard` → 404 → script rewrites to `/?p=/dashboard` → root `index.html` reads `?p` and replaces the URL). ~25 lines.
- Add `router.jsx` to `scripts/bundle.py` JSX ordering.
- Per-route `<title>` and `og:title` updates via `useEffect` so each route gets its own social preview.
- `BASE_PATH` constant in router — `/` if on a custom domain, `/Asylum-data-explorer/` if still on github.io. **This is why custom domain decision must come first** — implementing routing without it would be re-done later.

**Why bundle these:** they share the same `<head>` block, the same base-path assumption, and the same verification pass.

**Verification:**

- Click through every nav button locally: URL bar updates, refresh works on every route, back/forward works, "open in new tab" works.
- View source per route: `<title>` and `og:title` differ.
- After deploy: Facebook Sharing Debugger, LinkedIn Post Inspector, Twitter Card Validator render the card. Google Search Console "URL Inspection" confirms `/dashboard`, `/atlas`, etc. are indexable. After 1–2 weeks, Search Console "Pages" shows 6–8 indexed URLs, not 1.

**Out of scope for this item:** generated OG cards (defer), JSON-LD structured data (defer until the routing change has bedded in).

Background and full reasoning: `~/.claude/plans/i-m-thinking-about-sharing-zany-starfish.md` and the SEO planning conversation that produced this entry.

### 8. Public-launch hardening — Cloudflare in front of GitHub Pages

Operational task (no code changes). When ready to share the site publicly, route it through Cloudflare to add what GitHub Pages alone can't provide:

- **Rate-limiting** — one rule (e.g. 600 req/min per IP → managed challenge) covers the bulk of abuse / scraping scenarios.
- **Security headers via Transform Rules** — add `Content-Security-Policy` (whitelist `unpkg.com`, `fonts.googleapis.com`, `fonts.gstatic.com`, `api.postcodes.io`, `'self'`), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`. GH Pages cannot set custom headers.
- **WAF / bot-fight mode** — free tier; enable.

Alternative path: migrate to **Cloudflare Pages** directly (free, unlimited bandwidth, deploy previews on PRs, custom headers natively).

**Pre-launch human checklist (do before flipping the switch):**

- Confirm `git config --local user.email` for this repo is the `chocolatetriflesgit` noreply address — otherwise the next commit will leak whatever the global config holds.
- Audit the `chocolatetriflesgit` GitHub profile (bio, public email setting on github.com/settings/emails, pinned repos) for unwanted associations.
- Decide a contact strategy (none / freshly-made alias email / GitHub issues only). Don't put a primary email in `index.html`.
- Enable **"Require approval for first-time contributors"** under repo Actions settings so drive-by PRs can't trigger workflows that have access to secrets.
- Re-scan any new fetcher script for token-echo bugs (no `print(headers)`, no `print(response.request.headers)`) before adding the secret.

**Verification once live:**

- Incognito window → DevTools → Network: only the four expected origins should fire.
- Run the site through `securityheaders.com` and `observatory.mozilla.org`; aim for B+ or better.
- From a second IP / mobile network, hit the site rapidly to confirm the rate-limit rule fires.

Full background and rationale: `~/.claude/plans/i-m-thinking-about-sharing-zany-starfish.md`.

## Low priority

### 5. Phase 7 polish (carried over from the retired PROJECT_PLAN.md)

- Reduced-motion gate on the `fadeIn` keyframes in `index.html` (`design/tokens.md` flags this as outstanding).
- A11y focus-state sweep across interactive elements.
- Commit the three design-exploration artefacts (`design/directions.html`, `design/direction-cards.jsx`, `design/design-canvas.jsx`) only if stakeholders ask why the current direction was chosen.
