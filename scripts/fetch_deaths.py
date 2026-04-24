"""
Fetch the IOM Missing Migrants Project dataset.

Source
------
  IOM Missing Migrants Project
    https://missingmigrants.iom.int/

IOM publishes a pre-generated global incident-level CSV at a stable
static path on their Drupal file tree. That CSV is the canonical
download. The public landing page also exposes a /global-figures/all/csv
endpoint that triggers a Drupal "Views Data Export" batch, but that
endpoint is unreliable (stale batch IDs get cached and return 404, and
the "finished" hop no longer emits a meta-refresh that curl-style
clients can follow). We point straight at the static file.

Scope
-----
Downloads the **full global** CSV; filtering to the English Channel /
North-western Europe route happens in ``scripts/build_deaths.py`` so that
we can revisit region selection without re-downloading.

Attribution
-----------
The project is made available by the International Organization for
Migration (IOM). Any public display of the derived numbers must cite
"IOM Missing Migrants Project" — this is not Home Office data.

Usage:
    python scripts/fetch_deaths.py
    python scripts/fetch_deaths.py --force --cache-dir cache/deaths
"""
from __future__ import annotations

import argparse
import datetime as dt
import sys
from pathlib import Path
from urllib.parse import urlparse

import requests


IOM_CSV_URL = (
    "https://missingmigrants.iom.int/sites/g/files/tmzbdl601/files/"
    "report-migrant-incident/Missing_Migrants_Global_Figures_allData.csv"
)
USER_AGENT = (
    "home-office-data-explorer/1.0 (+https://github.com/; fetch_deaths.py)"
)
ALLOWED_HOSTS = {"missingmigrants.iom.int"}
TIMEOUT = 120  # seconds — the full CSV is ~8 MB


def _check_host(url: str) -> None:
    host = urlparse(url).hostname or ""
    if host not in ALLOWED_HOSTS:
        raise RuntimeError(f"refusing to call non-allowed host {host!r}")


def download(url: str, dest: Path) -> Path:
    _check_host(url)
    print(f"fetching {url} ...")
    headers = {"User-Agent": USER_AGENT, "Accept": "text/csv,text/plain,*/*"}
    resp = requests.get(url, headers=headers, timeout=TIMEOUT, stream=True)
    resp.raise_for_status()
    ctype = resp.headers.get("Content-Type", "")
    if "text/csv" not in ctype and "text/plain" not in ctype:
        raise RuntimeError(f"expected CSV, got Content-Type={ctype!r}")
    dest.parent.mkdir(parents=True, exist_ok=True)
    size = 0
    with dest.open("wb") as fh:
        for chunk in resp.iter_content(chunk_size=1 << 15):
            if chunk:
                fh.write(chunk)
                size += len(chunk)
    print(f"  wrote {dest} ({size} bytes)")
    return dest


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument(
        "--cache-dir", type=Path, default=Path("cache") / "deaths",
        help="Destination directory (default: cache/deaths/).",
    )
    p.add_argument(
        "--force", action="store_true",
        help="Re-download even if a cached CSV already exists.",
    )
    p.add_argument(
        "--url", default=IOM_CSV_URL,
        help="Override the IOM CSV URL (only if IOM changes the path).",
    )
    args = p.parse_args()

    today = dt.date.today().isoformat()
    dest = args.cache_dir / f"iom-missing-migrants-{today}.csv"
    if dest.exists() and not args.force:
        print(f"cached: {dest} (use --force to re-download)")
        return 0

    try:
        download(args.url, dest)
    except Exception as e:
        print(f"error: {e}", file=sys.stderr)
        return 1

    # Keep a stable "latest" symlink-equivalent alongside the dated file.
    latest = args.cache_dir / "latest.csv"
    latest.write_bytes(dest.read_bytes())
    print(f"also wrote {latest}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
