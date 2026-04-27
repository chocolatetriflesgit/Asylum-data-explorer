"""
Fetch Freedom House "Freedom in the World" country ratings.

  https://freedomhouse.org/sites/default/files/<YYYY-MM>/All_data_FIW_2013-<YYYY>.xlsx

Freedom House publishes the consolidated dataset (country/territory ×
year × political-rights/civil-liberties scores + Free/Partly Free/Not
Free status) once a year, typically in February. The xlsx URL follows
a predictable pattern:

  /sites/default/files/<YYYY-MM>/All_data_FIW_2013-<YYYY>.xlsx

We probe a handful of recent year/month combinations and use the
newest one that resolves. The raw xlsx is cached at
``cache/freedomhouse/All_data_FIW.xlsx``.

Licence: free for non-commercial citation with attribution. See
https://freedomhouse.org/about-us/content-permissions.

Usage:
    python scripts/fetch_freedomhouse.py
    python scripts/fetch_freedomhouse.py --cache-dir cache/freedomhouse
"""
from __future__ import annotations

import argparse
import datetime as dt
import sys
from pathlib import Path
from urllib.parse import urlparse

import requests


HOST = "freedomhouse.org"
USER_AGENT = (
    "home-office-data-explorer/1.0 (+https://github.com/; fetch_freedomhouse.py)"
)
ALLOWED_HOSTS = {"freedomhouse.org", "www.freedomhouse.org"}
TIMEOUT = 45


def _check_host(url: str) -> None:
    host = urlparse(url).hostname or ""
    if host not in ALLOWED_HOSTS:
        raise RuntimeError(f"refusing to call non-allowed host {host!r}")


def _candidate_urls() -> list[str]:
    """Probe URLs newest-first.

    The exact YYYY-MM segment varies — usually the data drops in February
    or March of the year after the data window ends, but Freedom House
    occasionally republishes with a different month folder. We try a few
    plausible combinations spanning the last two release cycles.
    """
    today = dt.date.today()
    year_now = today.year
    out: list[str] = []
    # Last two report editions (data through year-1, release in early year)
    for report_year in (year_now, year_now - 1):
        data_through = report_year - 1
        for month in ("02", "03", "04"):
            out.append(
                f"https://freedomhouse.org/sites/default/files/"
                f"{report_year}-{month}/All_data_FIW_2013-{data_through + 1}.xlsx"
            )
            out.append(
                f"https://freedomhouse.org/sites/default/files/"
                f"{report_year}-{month}/All_data_FIW_2013-{data_through}.xlsx"
            )
    return out


def _fetch_first_available() -> tuple[str, bytes]:
    last_err: str | None = None
    for url in _candidate_urls():
        _check_host(url)
        try:
            r = requests.get(
                url,
                headers={"User-Agent": USER_AGENT, "Accept": "application/octet-stream"},
                timeout=TIMEOUT,
                stream=True,
            )
        except requests.RequestException as e:
            last_err = f"{type(e).__name__}: {e}"
            continue
        if r.status_code != 200:
            last_err = f"HTTP {r.status_code} for {url}"
            continue
        ct = (r.headers.get("content-type") or "").lower()
        if "xlsx" not in ct and "spreadsheetml" not in ct and "octet-stream" not in ct:
            # Some 200 responses return the HTML 404-ish page; reject those.
            last_err = f"unexpected content-type {ct!r} for {url}"
            continue
        return url, r.content
    raise RuntimeError(f"no Freedom House xlsx URL resolved; last error: {last_err}")


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    p.add_argument("--cache-dir", default="cache/freedomhouse")
    args = p.parse_args()

    cache = Path(args.cache_dir)
    cache.mkdir(parents=True, exist_ok=True)
    out = cache / "All_data_FIW.xlsx"

    try:
        url, blob = _fetch_first_available()
    except RuntimeError as e:
        print(f"Freedom House fetch failed: {e}", file=sys.stderr)
        return 1

    out.write_bytes(blob)
    # Record which URL won in a sidecar so the builder can show provenance.
    (cache / "source_url.txt").write_text(url + "\n", encoding="utf-8")
    print(f"wrote {out}  ({len(blob):,} bytes from {url})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
