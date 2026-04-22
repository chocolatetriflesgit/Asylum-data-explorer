"""
Fetch the IOM Missing Migrants Project dataset.

Source
------
  IOM Missing Migrants Project
    https://missingmigrants.iom.int/

IOM publishes a full global incident-level CSV of recorded migrant deaths
and disappearances. That CSV is the canonical download; there is no
stable REST API for incident records at time of writing. The CSV URL
pattern is captured in ``IOM_CSV_URL`` below — if IOM ever changes the
path, this script is the only thing that needs to move.

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
import re
import sys
import time
from pathlib import Path
from urllib.parse import urlparse

import requests


IOM_CSV_URL = (
    "https://missingmigrants.iom.int/global-figures/all/csv"
)
USER_AGENT = (
    "home-office-data-explorer/1.0 (+https://github.com/; fetch_deaths.py)"
)
ALLOWED_HOSTS = {"missingmigrants.iom.int"}
TIMEOUT = 90  # seconds — the full CSV is ~10 MB


def _check_host(url: str) -> None:
    host = urlparse(url).hostname or ""
    if host not in ALLOWED_HOSTS:
        raise RuntimeError(f"refusing to call non-allowed host {host!r}")


def _follow_batch_chain(session: requests.Session, url: str) -> requests.Response:
    """Follow Drupal batch-export meta-refresh hops until the real CSV arrives.

    IOM's /global-figures/all/csv URL triggers a Drupal Views batch export.
    The initial response is HTML with a meta-refresh to /batch?id=X&op=do_nojs,
    which processes rows in chunks.  Each hop is another HTML page until the
    batch finishes and redirects to the actual CSV download.
    """
    parsed = urlparse(url)
    base = f"{parsed.scheme}://{parsed.netloc}"
    headers = {"User-Agent": USER_AGENT, "Accept": "text/csv,text/plain,*/*"}
    for step in range(60):
        _check_host(url)
        resp = session.get(url, headers=headers, timeout=TIMEOUT, stream=True)
        resp.raise_for_status()
        ctype = resp.headers.get("Content-Type", "")
        if "text/html" not in ctype:
            print(f"  resolved after {step + 1} hop(s) — {ctype.split(';')[0]}")
            return resp
        html = resp.text  # reads full body; closes underlying socket for reuse
        m = re.search(r'content=["\']0;\s*URL=([^"\'>\s]+)', html, re.IGNORECASE)
        if not m:
            raise RuntimeError(f"batch hop {step}: no meta-refresh URL in HTML")
        next_path = m.group(1).replace("&amp;", "&")
        url = next_path if next_path.startswith("http") else base + next_path
        if step < 4:
            print(f"  batch hop {step + 1}: {url}")
        time.sleep(0.3)
    raise RuntimeError("Drupal batch: 60 hops without receiving a CSV")


def download(url: str, dest: Path) -> Path:
    _check_host(url)
    print(f"fetching {url} ...")
    session = requests.Session()
    resp = _follow_batch_chain(session, url)
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
