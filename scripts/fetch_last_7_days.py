"""
Fetch the gov.uk "Small boats — last 7 days" HTML page.

Writes the raw HTML to ``cache/last-7-days.html`` for audit. No parsing
here — that belongs to ``build_provisional.py`` — but we do basic
sanity-checks so a 200-OK-but-broken response fails the CI step rather
than silently caching junk.

Usage:
    python scripts/fetch_last_7_days.py [--cache-dir cache]

Security: only connects to www.gov.uk; rejects other hosts.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path
from urllib.parse import urlparse

import requests


LAST_7_DAYS_URL = (
    "https://www.gov.uk/government/publications/"
    "migrants-detected-crossing-the-english-channel-in-small-boats/"
    "migrants-detected-crossing-the-english-channel-in-small-boats-last-7-days"
)
ALLOWED_HOSTS = {"www.gov.uk"}
USER_AGENT = (
    "home-office-data-explorer/1.0 "
    "(+https://github.com/; fetch_last_7_days.py)"
)
REQUEST_TIMEOUT = 30  # seconds
MIN_EXPECTED_BYTES = 10_000  # the page is ~75 KB; anything tiny is wrong


def _check_host_allowed(url: str) -> None:
    host = urlparse(url).hostname or ""
    if host not in ALLOWED_HOSTS:
        raise RuntimeError(
            f"refusing to fetch from unexpected host: {host!r} "
            f"(allowed: {sorted(ALLOWED_HOSTS)!r})"
        )


def fetch(cache_dir: Path, *, url: str = LAST_7_DAYS_URL) -> Path:
    _check_host_allowed(url)
    cache_dir.mkdir(parents=True, exist_ok=True)
    dest = cache_dir / "last-7-days.html"

    resp = requests.get(
        url,
        headers={"User-Agent": USER_AGENT, "Accept": "text/html"},
        timeout=REQUEST_TIMEOUT,
    )
    resp.raise_for_status()

    ctype = resp.headers.get("Content-Type", "")
    if "text/html" not in ctype:
        raise RuntimeError(
            f"unexpected Content-Type {ctype!r} from {url} — refusing to save"
        )
    if len(resp.content) < MIN_EXPECTED_BYTES:
        raise RuntimeError(
            f"response body is only {len(resp.content)} bytes "
            f"(expected ≥ {MIN_EXPECTED_BYTES}) — page may be an error shell"
        )
    # Cheap structural canary: the data table's first column header is
    # stable text we can look for without parsing.
    if b"Migrants arrived" not in resp.content:
        raise RuntimeError(
            "response does not contain the expected 'Migrants arrived' "
            "column header — has the page template changed?"
        )

    dest.write_bytes(resp.content)
    print(f"wrote {dest} ({dest.stat().st_size} bytes)")
    return dest


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument(
        "--cache-dir",
        type=Path,
        default=Path("cache"),
        help="Destination directory (default: cache/).",
    )
    args = p.parse_args()
    try:
        fetch(args.cache_dir)
    except Exception as e:
        print(f"error: {e}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
