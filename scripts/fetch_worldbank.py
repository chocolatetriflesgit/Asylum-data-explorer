"""
Fetch GDP per capita (PPP, current international $) for every country
from the World Bank Open Data API.

  https://api.worldbank.org/v2/country/all/indicator/NY.GDP.PCAP.PP.CD

No authentication required; no documented rate limit. We pull the full
set in one paginated query and cache the raw response to
``cache/worldbank/gdp_per_capita_ppp.json`` so build_country_context.py
reads the cache, not the wire.

The World Bank includes regional aggregates ("World", "Sub-Saharan
Africa", etc.) in the country list. We keep those rows in the cache
file but the builder filters them out by ``countryiso3code`` length.

Usage:
    python scripts/fetch_worldbank.py
    python scripts/fetch_worldbank.py --cache-dir cache/worldbank --indicator NY.GDP.PCAP.PP.CD
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import sys
import time
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import requests


API_BASE = "https://api.worldbank.org/v2"
DEFAULT_INDICATOR = "NY.GDP.PCAP.PP.CD"  # GDP per capita, PPP (current international $)
USER_AGENT = (
    "home-office-data-explorer/1.0 (+https://github.com/; fetch_worldbank.py)"
)
ALLOWED_HOSTS = {"api.worldbank.org"}
TIMEOUT = 45
MAX_PAGES_SAFETY = 20
REQUEST_DELAY = 0.2


def _check_host(url: str) -> None:
    host = urlparse(url).hostname or ""
    if host not in ALLOWED_HOSTS:
        raise RuntimeError(f"refusing to call non-allowed host {host!r}")


def _fetch_indicator(indicator: str, *, year_from: int, year_to: int) -> list[dict]:
    """Fetch all country-year rows for one indicator across the date window.

    The World Bank API returns pages shaped ``[meta, [item1, item2, ...]]``;
    we walk pages until ``meta['page'] >= meta['pages']``.
    """
    url = f"{API_BASE}/country/all/indicator/{indicator}"
    _check_host(url)
    params = {
        "format": "json",
        "per_page": 1000,
        "date": f"{year_from}:{year_to}",
    }
    items: list[dict] = []
    page = 1
    while page <= MAX_PAGES_SAFETY:
        params["page"] = page
        r = requests.get(
            url,
            params=params,
            headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
            timeout=TIMEOUT,
        )
        r.raise_for_status()
        body = r.json()
        if not isinstance(body, list) or len(body) < 2:
            raise RuntimeError(f"unexpected response shape for indicator {indicator}: {body!r:.120}")
        meta, rows = body[0], body[1]
        if not isinstance(rows, list):
            raise RuntimeError(f"expected list for page rows, got {type(rows).__name__}")
        items.extend(rows)
        total_pages = int(meta.get("pages") or 1)
        if page >= total_pages:
            break
        page += 1
        time.sleep(REQUEST_DELAY)
    return items


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    p.add_argument("--cache-dir", default="cache/worldbank")
    p.add_argument("--indicator", default=DEFAULT_INDICATOR,
                   help="World Bank indicator code (default: NY.GDP.PCAP.PP.CD).")
    p.add_argument("--from", dest="year_from", type=int, default=dt.date.today().year - 5,
                   help="First year (inclusive). Default: today − 5.")
    p.add_argument("--to", dest="year_to", type=int, default=dt.date.today().year,
                   help="Last year (inclusive). Default: today.")
    args = p.parse_args()

    cache = Path(args.cache_dir)
    cache.mkdir(parents=True, exist_ok=True)

    try:
        items = _fetch_indicator(args.indicator, year_from=args.year_from, year_to=args.year_to)
    except requests.HTTPError as e:
        print(f"World Bank fetch failed: {e}", file=sys.stderr)
        return 1

    out = cache / f"{args.indicator.lower().replace('.', '_')}.json"
    payload = {
        "fetched_at": dt.datetime.now(dt.timezone.utc).isoformat(),
        "indicator": args.indicator,
        "year_from": args.year_from,
        "year_to": args.year_to,
        "rows": items,
    }
    out.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    real_rows = sum(1 for r in items if (r.get("countryiso3code") or "").strip())
    print(f"wrote {out}  ({real_rows} country-year rows; {len(items) - real_rows} aggregate-region rows)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
