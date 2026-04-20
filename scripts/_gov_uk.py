"""
Shared helpers for gov.uk xlsx fetchers.

fetch_latest.py handles the Small Boats ODS directly. The three xlsx
publications (asylum claims, asylum support, resettlement) all live on
the same *Immigration system statistics data tables* landing page and
differ only by filename stem, so they share one helper here.

Usage pattern (see scripts/fetch_asylum_claims.py etc.):

    from _gov_uk import fetch_xlsx_by_stem, IMMIGRATION_DATA_TABLES_URL
    fetch_xlsx_by_stem("asylum-claims-datasets-", cache_dir)

Security:
  - Only connects to gov.uk (host allow-list enforced before download).
  - Rejects non-spreadsheet Content-Types (rejects HTML error pages that
    return 200).
"""
from __future__ import annotations

import re
import sys
from pathlib import Path
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup


IMMIGRATION_DATA_TABLES_URL = (
    "https://www.gov.uk/government/statistical-data-sets/"
    "immigration-system-statistics-data-tables"
)
ALLOWED_HOSTS = {"www.gov.uk", "assets.publishing.service.gov.uk"}
USER_AGENT = (
    "home-office-data-explorer/1.0 (+https://github.com/; _gov_uk.py)"
)
REQUEST_TIMEOUT = 30  # seconds
ACCEPT_XLSX_CONTENT_TYPES = (
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "application/octet-stream",
)

# Gov.uk filenames include the release month, e.g.
#   asylum-claims-datasets-nov-2025.xlsx
# This regex captures the mmm-YYYY suffix so fetchers can sort by release.
_MONTH_STEM_RE = re.compile(r"(?i)([a-z]+)[-_](\d{4})(?=\.xlsx$)")


def _check_host_allowed(url: str) -> None:
    host = urlparse(url).hostname or ""
    if host not in ALLOWED_HOSTS:
        raise RuntimeError(
            f"refusing to download from unexpected host: {host!r} "
            f"(allowed: {sorted(ALLOWED_HOSTS)!r})"
        )


def _release_month_key(filename: str) -> tuple[int, int]:
    """Crude sort key for release-month suffixes — higher is newer.

    Returns (year, month_ord) where month_ord is the index into a
    calendar month lookup. Unknown months sort to 0 so a malformed
    filename never outranks a well-formed one.
    """
    m = _MONTH_STEM_RE.search(filename)
    if not m:
        return (0, 0)
    month_name = m.group(1).lower()[:3]
    year = int(m.group(2))
    months = ["jan", "feb", "mar", "apr", "may", "jun",
              "jul", "aug", "sep", "oct", "nov", "dec"]
    month_ord = months.index(month_name) + 1 if month_name in months else 0
    return (year, month_ord)


def _find_xlsx_by_stem(html: str, base_url: str, stem: str) -> str:
    """Find the newest xlsx whose filename starts with ``stem``.

    Raises RuntimeError if no candidate is found — we want a loud
    failure so the CI workflow flags a page-shape change rather than
    quietly re-using stale data.
    """
    soup = BeautifulSoup(html, "html.parser")
    stem_l = stem.lower()

    candidates: list[tuple[str, str]] = []
    for a in soup.find_all("a", href=True):
        href = urljoin(base_url, a["href"])
        parsed = urlparse(href)
        if not parsed.path.lower().endswith(".xlsx"):
            continue
        filename = Path(parsed.path).name
        if filename.lower().startswith(stem_l):
            candidates.append((href, filename))

    if not candidates:
        raise RuntimeError(
            f"no xlsx matching stem {stem!r} on {base_url} — has the "
            f"gov.uk page layout changed or has this publication moved?"
        )

    # Prefer the newest release by filename month-suffix.
    candidates.sort(key=lambda hf: _release_month_key(hf[1]), reverse=True)
    return candidates[0][0]


def _download(url: str, dest: Path) -> None:
    _check_host_allowed(url)
    resp = requests.get(
        url,
        headers={"User-Agent": USER_AGENT},
        timeout=REQUEST_TIMEOUT,
        stream=True,
    )
    resp.raise_for_status()

    ctype = resp.headers.get("Content-Type", "").split(";")[0].strip()
    if ctype and not any(ctype.startswith(a) for a in ACCEPT_XLSX_CONTENT_TYPES):
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


def fetch_xlsx_by_stem(
    stem: str,
    cache_dir: Path,
    *,
    landing_url: str = IMMIGRATION_DATA_TABLES_URL,
    force: bool = False,
) -> Path:
    """Download the newest xlsx whose filename starts with ``stem``.

    Caches by original filename under ``cache_dir``; skips the download
    if the file is already present unless ``force`` is True. Returns the
    path to the cached file on disk.
    """
    cache_dir.mkdir(parents=True, exist_ok=True)

    resp = requests.get(
        landing_url,
        headers={"User-Agent": USER_AGENT},
        timeout=REQUEST_TIMEOUT,
    )
    resp.raise_for_status()

    xlsx_url = _find_xlsx_by_stem(resp.text, landing_url, stem)
    filename = Path(urlparse(xlsx_url).path).name
    dest = cache_dir / filename

    if dest.exists() and not force:
        print(f"cached: {dest.name} (already present; skipping download)")
    else:
        print(f"downloading {xlsx_url}")
        _download(xlsx_url, dest)
        print(f"wrote {dest} ({dest.stat().st_size} bytes)")

    return dest


def cli_main(stem: str, *, description: str) -> int:
    """Shared CLI entry point. Individual fetchers call this with their stem."""
    import argparse

    p = argparse.ArgumentParser(description=description)
    p.add_argument(
        "--force",
        action="store_true",
        help="Re-download even if the cached filename already exists.",
    )
    p.add_argument(
        "--cache-dir",
        type=Path,
        default=Path("cache"),
        help="Destination directory (default: cache/).",
    )
    args = p.parse_args()

    try:
        dest = fetch_xlsx_by_stem(stem, args.cache_dir, force=args.force)
    except Exception as e:
        print(f"error: {e}", file=sys.stderr)
        return 1
    print(f"latest: {dest}")
    return 0
