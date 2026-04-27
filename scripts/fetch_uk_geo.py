"""
Fetch the UK Local Authority District boundaries (LAD24, "Ultra-Generalised
Clipped" — the smallest published version) from the ONS Open Geography
Portal ArcGIS REST endpoint.

  https://geoportal.statistics.gov.uk/

The full UK set is ~360 features in WGS84 lon/lat. Cached to
``cache/ons/lad24_buc.geojson`` so build_uk_map.py reads the cache, not
the wire.

Usage:
    python scripts/fetch_uk_geo.py
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import sys
from pathlib import Path
from urllib.parse import urlparse

import requests


DEFAULT_URL = (
    "https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/"
    "Local_Authority_Districts_May_2024_Boundaries_UK_BUC/FeatureServer/0/query"
)
USER_AGENT = (
    "home-office-data-explorer/1.0 (+https://github.com/; fetch_uk_geo.py)"
)
ALLOWED_HOSTS = {"services1.arcgis.com"}
TIMEOUT = 60


def _check_host(url: str) -> None:
    host = urlparse(url).hostname or ""
    if host not in ALLOWED_HOSTS:
        raise RuntimeError(f"refusing to call non-allowed host {host!r}")


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    p.add_argument("--cache-dir", default="cache/ons")
    p.add_argument("--url", default=DEFAULT_URL)
    args = p.parse_args()

    cache = Path(args.cache_dir)
    cache.mkdir(parents=True, exist_ok=True)
    out = cache / "lad24_buc.geojson"

    _check_host(args.url)
    params = {
        "where": "1=1",
        "outFields": "LAD24CD,LAD24NM",
        "returnGeometry": "true",
        "f": "geojson",
        "resultRecordCount": 5000,
    }
    try:
        r = requests.get(
            args.url,
            params=params,
            headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
            timeout=TIMEOUT,
        )
        r.raise_for_status()
        body = r.json()
    except requests.RequestException as e:
        print(f"ONS LAD geometry fetch failed: {e}", file=sys.stderr)
        return 1

    feats = body.get("features", [])
    if not feats:
        print("warning: empty feature collection", file=sys.stderr)

    out.write_text(json.dumps(body, ensure_ascii=False), encoding="utf-8")
    sidecar = cache / "lad24_buc.fetched_at.txt"
    sidecar.write_text(dt.datetime.now(dt.timezone.utc).isoformat() + "\n", encoding="utf-8")
    print(f"wrote {out}  ({len(feats)} features, {len(r.content):,} bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
