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
    """Collect all items across paginated responses for one endpoint/year."""
    url = f"{API_BASE}/{endpoint}/"
    items: list[dict] = []
    page = 1
    while page <= MAX_PAGES_SAFETY:
        data = _get(url, {**params, "page": page, "limit": 1000})
        batch = data.get("items") or []
        items.extend(batch)
        max_pages = data.get("maxPages") or 1
        if page >= max_pages or not batch:
            break
        page += 1
        time.sleep(REQUEST_DELAY)
    return items


def _endpoint_params(endpoint: str, year: int) -> dict[str, Any]:
    """Per-endpoint filter set for a given year.

    - population: full world by origin (no coa filter).
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

    endpoints = (args.only,) if args.only else ENDPOINTS
    try:
        for endpoint in endpoints:
            for year in range(args.year_from, args.year_to + 1):
                fetch_year(endpoint, year, args.cache_dir, force=args.force)
    except Exception as e:
        print(f"error: {e}", file=sys.stderr)
        return 1

    print(f"cache: {args.cache_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
