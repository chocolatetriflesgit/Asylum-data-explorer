"""
Fetch UNHCR population / asylum-applications / asylum-decisions JSON from
the public REST API.

  https://api.unhcr.org/population/v1/

No authentication required; no documented rate limit but keep pulls
polite (annual-scoped queries, no parallel fan-out). Raw responses are
written to ``cache/unhcr/<endpoint>/<year>.json`` for traceability and
diffing — build_unhcr.py reads the cache, not the wire.

Scope
-----
- population (persons of concern): full world by origin — we want global
  denominators for the Atlas per-capita mode, regardless of which
  country the user clicks on.
- asylum-applications / asylum-decisions: UK-as-asylum only (coa=GBR),
  full range of years — gives us a cross-check against the Home Office's
  own figures and a wider time range.

Default year range is 2000..current; adjust with --from / --to.

Usage:
    python scripts/fetch_unhcr.py
    python scripts/fetch_unhcr.py --from 2015 --to 2025 --cache-dir cache/unhcr
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import sys
import time
from pathlib import Path
from typing import Any
from urllib.parse import urlencode, urlparse

import requests


API_BASE = "https://api.unhcr.org/population/v1"
ENDPOINTS = ("population", "asylum-applications", "asylum-decisions")
USER_AGENT = (
    "home-office-data-explorer/1.0 (+https://github.com/; fetch_unhcr.py)"
)
ALLOWED_HOSTS = {"api.unhcr.org"}
TIMEOUT = 45  # seconds
MAX_PAGES_SAFETY = 50  # should be plenty; stop if we ever hit this.
REQUEST_DELAY = 0.2  # seconds between requests; keeps us polite.


def _check_host(url: str) -> None:
    host = urlparse(url).hostname or ""
    if host not in ALLOWED_HOSTS:
        raise RuntimeError(f"refusing to call non-allowed host {host!r}")


def _get(url: str, params: dict[str, Any]) -> dict:
    _check_host(url)
    resp = requests.get(
        url,
        params=params,
        headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
        timeout=TIMEOUT,
    )
    resp.raise_for_status()
    return resp.json()


def _fetch_paginated(endpoint: str, params: dict[str, Any]) -> list[dict]:
    """Collect all items across paginated responses for one endpoint/year.

    A 403 from the UNHCR API means the data is unavailable for that
    combination (e.g. a country that didn't exist in a given year) — treat
    it as an empty result rather than a fatal error.
    """
    url = f"{API_BASE}/{endpoint}/"
    items: list[dict] = []
    page = 1
    while page <= MAX_PAGES_SAFETY:
        try:
            data = _get(url, {**params, "page": page, "limit": 1000})
        except requests.HTTPError as exc:
            if exc.response is not None and exc.response.status_code == 403:
                break  # not available for this country/year; treat as empty
            raise
        batch = data.get("items") or []
        items.extend(batch)
        max_pages = data.get("maxPages") or 1
        if page >= max_pages or not batch:
            break
        page += 1
        time.sleep(REQUEST_DELAY)
    return items


def _load_coo_isos(data_dir: Path = Path("data")) -> list[str]:
    """Return 3-char ISO codes from data/world-map-data.js.

    The UNHCR population API returns only a global aggregate when called
    without a coo filter; per-origin data requires one call per ISO.  We
    use the WORLD_MAP ISO list as the canonical country set because the
    Atlas per-capita join is WORLD_MAP.iso → UNHCR_POC_ANNUAL.originIso.
    """
    import re as _re
    js = data_dir / "world-map-data.js"
    if not js.exists():
        return []
    text = js.read_text(encoding="utf-8")
    isos = sorted(set(_re.findall(r'"iso":"([A-Z]{3})"', text)))
    return isos  # already filtered to 3-char uppercase by the regex


def _endpoint_params(endpoint: str, year: int) -> dict[str, Any]:
    """Per-endpoint filter set for a given year.

    - population: per-origin-country; caller must supply coo parameter separately.
    - asylum-applications / asylum-decisions: UK-as-asylum only (coa=GBR).
    """
    base = {"year": year}
    if endpoint == "population":
        return base
    return {**base, "coa": "GBR"}


def fetch_year(endpoint: str, year: int, cache_dir: Path, *, force: bool = False) -> Path:
    dest_dir = cache_dir / endpoint
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / f"{year}.json"
    if dest.exists() and not force:
        print(f"cached: {endpoint}/{year}.json ({dest.stat().st_size} bytes)")
        return dest
    params = _endpoint_params(endpoint, year)
    print(f"fetching {endpoint} year={year} ...")
    items = _fetch_paginated(endpoint, params)
    dest.write_text(
        json.dumps({"endpoint": endpoint, "year": year, "items": items},
                   ensure_ascii=False),
        encoding="utf-8",
    )
    print(f"  wrote {dest.name} ({len(items)} rows)")
    return dest


def fetch_population_year(
    year: int,
    coo_isos: list[str],
    cache_dir: Path,
    *,
    force: bool = False,
) -> Path:
    """Fetch global POC for all coo_isos for one year and cache as a year file.

    The UNHCR population API returns only a world-aggregate row when queried
    without a coo parameter.  This function makes one call per ISO code and
    merges results into a single year file compatible with _load_year_files().
    """
    dest_dir = cache_dir / "population"
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / f"{year}.json"

    if dest.exists() and not force:
        existing = json.loads(dest.read_text(encoding="utf-8"))
        items = existing.get("items", [])
        # Treat cached aggregate-only files (coo_iso="-") as stale.
        if any(r.get("coo_iso", "") not in ("", "-") for r in items):
            print(f"cached: population/{year}.json ({len(items)} rows)")
            return dest

    all_items: list[dict] = []
    for i, iso in enumerate(coo_isos):
        rows = _fetch_paginated("population", {"year": year, "coo": iso})
        all_items.extend(rows)
        time.sleep(REQUEST_DELAY)
        if (i + 1) % 30 == 0:
            print(f"  population year={year}: {i + 1}/{len(coo_isos)} countries ...")
    dest.write_text(
        json.dumps({"endpoint": "population", "year": year, "items": all_items},
                   ensure_ascii=False),
        encoding="utf-8",
    )
    print(f"population year={year}: {len(all_items)} rows from {len(coo_isos)} countries")
    return dest


def main() -> int:
    today_year = dt.date.today().year
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--from", dest="year_from", type=int, default=2000,
                   help="First year to fetch (inclusive; default 2000).")
    p.add_argument("--to", dest="year_to", type=int, default=today_year,
                   help="Last year to fetch (inclusive; default this year).")
    p.add_argument("--cache-dir", type=Path, default=Path("cache") / "unhcr",
                   help="Destination directory (default: cache/unhcr/).")
    p.add_argument("--force", action="store_true",
                   help="Re-download even if cached JSON already exists.")
    p.add_argument("--only", choices=ENDPOINTS, default=None,
                   help="Fetch only one endpoint (debugging).")
    args = p.parse_args()

    if args.year_from > args.year_to:
        print("error: --from must be <= --to", file=sys.stderr)
        return 2

    coo_isos = _load_coo_isos()
    if not coo_isos:
        print(
            "warning: could not load WORLD_MAP ISOs from data/world-map-data.js — "
            "run scripts/build_world_map.py first",
            file=sys.stderr,
        )

    endpoints = (args.only,) if args.only else ENDPOINTS
    try:
        for endpoint in endpoints:
            if endpoint == "population":
                if not coo_isos:
                    print("skipping population endpoint: no ISO list", file=sys.stderr)
                    continue
                n_years = args.year_to - args.year_from + 1
                print(
                    f"fetching population: {len(coo_isos)} countries × {n_years} years "
                    f"(~{len(coo_isos) * n_years * REQUEST_DELAY:.0f}s) ..."
                )
                for year in range(args.year_from, args.year_to + 1):
                    fetch_population_year(year, coo_isos, args.cache_dir, force=args.force)
            else:
                for year in range(args.year_from, args.year_to + 1):
                    fetch_year(endpoint, year, args.cache_dir, force=args.force)
    except Exception as e:
        print(f"error: {e}", file=sys.stderr)
        return 1

    print(f"cache: {args.cache_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
