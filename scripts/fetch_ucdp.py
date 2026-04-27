"""
Fetch annual conflict-event counts from the Uppsala Conflict Data Program
(UCDP) Georeferenced Event Dataset (GED).

  https://ucdpapi.pcr.uu.se/api/gedevents/<version>

⚠️  UCDP added API-token gating in late 2024. Free tokens are issued
on request from https://ucdp.uu.se/  → "API access". Set the token in
the environment before running this fetcher:

  Windows PowerShell:  $env:UCDP_API_TOKEN = "<your-token>"
  bash / zsh:          export UCDP_API_TOKEN=<your-token>

If the token is absent, this script exits non-zero with a clear message
and the country-context build will skip UCDP fields gracefully.

Scope
-----
We pull the latest annual GED release and aggregate event counts and
deaths to ``(country, year)`` so build_country_context.py only needs to
look up two numbers per origin country. The raw paginated payload is
cached under ``cache/ucdp/ged_<version>_<year>.json``.

Usage:
    python scripts/fetch_ucdp.py --version 24.1 --year 2024
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import sys
import time
from pathlib import Path
from urllib.parse import urlparse

import requests


API_BASE = "https://ucdpapi.pcr.uu.se/api"
USER_AGENT = (
    "home-office-data-explorer/1.0 (+https://github.com/; fetch_ucdp.py)"
)
ALLOWED_HOSTS = {"ucdpapi.pcr.uu.se"}
TIMEOUT = 45
MAX_PAGES_SAFETY = 200
REQUEST_DELAY = 0.3


def _check_host(url: str) -> None:
    host = urlparse(url).hostname or ""
    if host not in ALLOWED_HOSTS:
        raise RuntimeError(f"refusing to call non-allowed host {host!r}")


def _fetch_paged(url: str, params: dict, headers: dict) -> list[dict]:
    _check_host(url)
    items: list[dict] = []
    page = 1
    while page <= MAX_PAGES_SAFETY:
        params = dict(params)
        params["page"] = page
        r = requests.get(url, params=params, headers=headers, timeout=TIMEOUT)
        if r.status_code == 401:
            raise RuntimeError(
                "UCDP returned 401 — your API token was rejected or missing. "
                "Get one at https://ucdp.uu.se/ and set $env:UCDP_API_TOKEN."
            )
        r.raise_for_status()
        body = r.json()
        page_items = body.get("Result") or body.get("result") or []
        if not isinstance(page_items, list):
            raise RuntimeError(f"unexpected page shape: keys={list(body.keys())[:6]}")
        items.extend(page_items)
        total_pages = int(body.get("TotalPages") or body.get("total_pages") or 1)
        if page >= total_pages:
            break
        page += 1
        time.sleep(REQUEST_DELAY)
    return items


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    p.add_argument("--cache-dir", default="cache/ucdp")
    p.add_argument("--version", default="24.1",
                   help="GED dataset version (UCDP releases an annual numbered version).")
    p.add_argument("--year", type=int, default=dt.date.today().year - 1,
                   help="Year of events to fetch (defaults to last full year).")
    args = p.parse_args()

    token = os.environ.get("UCDP_API_TOKEN", "").strip()
    if not token:
        print(
            "UCDP_API_TOKEN is not set. Get a free token from https://ucdp.uu.se/ "
            "and export it before running this fetcher. The country-context build "
            "will skip UCDP fields without it.",
            file=sys.stderr,
        )
        return 2  # distinct exit code from a hard fetch failure

    cache = Path(args.cache_dir)
    cache.mkdir(parents=True, exist_ok=True)

    url = f"{API_BASE}/gedevents/{args.version}"
    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "application/json",
        "x-ucdp-access-token": token,
    }
    params = {
        "pagesize": 1000,
        "StartDate": f"{args.year}-01-01",
        "EndDate": f"{args.year}-12-31",
    }
    try:
        events = _fetch_paged(url, params, headers)
    except RuntimeError as e:
        print(f"UCDP fetch failed: {e}", file=sys.stderr)
        return 1
    except requests.HTTPError as e:
        print(f"UCDP HTTP error: {e}", file=sys.stderr)
        return 1

    out = cache / f"ged_{args.version}_{args.year}.json"
    out.write_text(json.dumps({
        "fetched_at": dt.datetime.now(dt.timezone.utc).isoformat(),
        "version": args.version,
        "year": args.year,
        "events": events,
    }, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"wrote {out}  ({len(events):,} events for {args.year})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
