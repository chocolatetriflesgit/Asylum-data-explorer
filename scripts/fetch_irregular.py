"""
Download the latest Irregular Migration summary tables .ods from gov.uk.

The publication's file format is ODS (not xlsx like the rest of the
Home Office immigration-stats family), and its landing page is the
dedicated "irregular-migration-detailed-dataset-and-summary-tables"
data-set page — so this fetcher is a small standalone variant of
``_gov_uk.fetch_xlsx_by_stem`` rather than a call to it.

Feeds ``build_irregular.py`` (Irr_02b — small boat arrivals by
nationality).
"""
from __future__ import annotations

import re
import sys
from pathlib import Path
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

from _gov_uk import (
    ACCEPT_XLSX_CONTENT_TYPES,
    ALLOWED_HOSTS,
    REQUEST_TIMEOUT,
    USER_AGENT,
    _check_host_allowed,
)
from _sources import SOURCES, stem


# .ods uses a different MIME type than xlsx; accept both.
ACCEPT_ODS_CONTENT_TYPES = (
    "application/vnd.oasis.opendocument.spreadsheet",
    "application/octet-stream",
)
ACCEPT_CONTENT_TYPES = tuple(set(ACCEPT_XLSX_CONTENT_TYPES + ACCEPT_ODS_CONTENT_TYPES))

_MONTH_STEM_RE = re.compile(r"(?i)([a-z]+)[-_](\d{4})(?=\.ods$)")


def _release_month_key(filename: str) -> tuple[int, int]:
    m = _MONTH_STEM_RE.search(filename)
    if not m:
        return (0, 0)
    month_name = m.group(1).lower()[:3]
    year = int(m.group(2))
    months = ["jan", "feb", "mar", "apr", "may", "jun",
              "jul", "aug", "sep", "oct", "nov", "dec"]
    month_ord = months.index(month_name) + 1 if month_name in months else 0
    return (year, month_ord)


def _find_ods_by_stem(html: str, base_url: str, stem_val: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    stem_l = stem_val.lower()
    candidates: list[tuple[str, str]] = []
    for a in soup.find_all("a", href=True):
        href = urljoin(base_url, a["href"])
        parsed = urlparse(href)
        if not parsed.path.lower().endswith(".ods"):
            continue
        filename = Path(parsed.path).name
        if filename.lower().startswith(stem_l):
            candidates.append((href, filename))
    if not candidates:
        raise RuntimeError(
            f"no .ods matching stem {stem_val!r} on {base_url} — has the "
            f"gov.uk page layout changed or has this publication moved?"
        )
    candidates.sort(key=lambda hf: _release_month_key(hf[1]), reverse=True)
    return candidates[0][0]


def _download(url: str, dest: Path) -> None:
    _check_host_allowed(url)
    resp = requests.get(
        url, headers={"User-Agent": USER_AGENT},
        timeout=REQUEST_TIMEOUT, stream=True,
    )
    resp.raise_for_status()
    ctype = resp.headers.get("Content-Type", "").split(";")[0].strip()
    if ctype and not any(ctype.startswith(a) for a in ACCEPT_CONTENT_TYPES):
        raise RuntimeError(
            f"unexpected Content-Type {ctype!r} from {url} — refusing to save"
        )
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_suffix(dest.suffix + ".partial")
    with tmp.open("wb") as f:
        for chunk in resp.iter_content(chunk_size=65536):
            if chunk:
                f.write(chunk)
    tmp.replace(dest)


def fetch_ods_by_stem(stem_val: str, cache_dir: Path, *,
                      landing_url: str, force: bool = False) -> Path:
    cache_dir.mkdir(parents=True, exist_ok=True)
    resp = requests.get(
        landing_url, headers={"User-Agent": USER_AGENT},
        timeout=REQUEST_TIMEOUT,
    )
    resp.raise_for_status()
    url = _find_ods_by_stem(resp.text, landing_url, stem_val)
    filename = Path(urlparse(url).path).name
    dest = cache_dir / filename
    if dest.exists() and not force:
        print(f"cached: {dest.name} (already present; skipping download)")
    else:
        print(f"downloading {url}")
        _download(url, dest)
        print(f"wrote {dest} ({dest.stat().st_size} bytes)")
    return dest


def main() -> int:
    import argparse
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--force", action="store_true",
                   help="Re-download even if the cached filename already exists.")
    p.add_argument("--cache-dir", type=Path, default=Path("cache"),
                   help="Destination directory (default: cache/).")
    args = p.parse_args()

    landing = SOURCES["irregular-migration"]["landing_url"]
    try:
        dest = fetch_ods_by_stem(
            stem("irregular-migration"),
            args.cache_dir,
            landing_url=landing,
            force=args.force,
        )
    except Exception as e:
        print(f"error: {e}", file=sys.stderr)
        return 1
    print(f"latest: {dest}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
