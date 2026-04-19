"""
Fetch the latest Small Boats ODS from gov.uk into `cache/`.

Usage:
    python scripts/fetch_latest.py [--force]

Behaviour:
  - Scrapes the gov.uk publications page to find the current ODS download URL.
    The filename changes with each release, so the URL is not stable.
  - Downloads into `cache/<original-filename>.ods` (if not already present)
    and mirrors it to `cache/latest.ods`.
  - Exits 0 on success, 1 on fetch/parse error (loud failure is the point —
    the daily CI workflow should fail visibly if the source page changes
    shape).
  - `--force` re-downloads even if the cached filename already exists.

Security
--------
  - Only connects to gov.uk (host is asserted before download).
  - Verifies the response Content-Type is an OpenDocument spreadsheet or
    octet-stream. Rejects HTML bodies (common signal of a redirect to an
    error page that still returned 200).
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup


PUBLICATION_URL = (
    "https://www.gov.uk/government/publications/"
    "migrants-detected-crossing-the-english-channel-in-small-boats"
)
ALLOWED_HOSTS = {"www.gov.uk", "assets.publishing.service.gov.uk"}
USER_AGENT = (
    "home-office-data-explorer/1.0 (+https://github.com/; fetch_latest.py)"
)
REQUEST_TIMEOUT = 30  # seconds

ACCEPT_CONTENT_TYPES = (
    "application/vnd.oasis.opendocument.spreadsheet",
    "application/octet-stream",
)


def _find_time_series_ods(html: str, base_url: str) -> str:
    """Locate the time-series ODS link on the publication page.

    The page lists multiple attachments; we want the time-series spreadsheet,
    not the 'last 7 days' HTML or the PDF summary. Heuristic: look for an
    `<a>` whose href ends in `.ods` and whose link text or filename contains
    'time series' or 'time-series'.
    """
    soup = BeautifulSoup(html, "html.parser")

    candidates: list[tuple[str, str]] = []
    for a in soup.find_all("a", href=True):
        href = urljoin(base_url, a["href"])
        if not href.lower().endswith(".ods"):
            continue
        label = a.get_text(" ", strip=True).lower()
        filename = Path(urlparse(href).path).name.lower()
        score = 0
        if "time series" in label or "time-series" in label:
            score += 10
        if "time-series" in filename or "time_series" in filename:
            score += 5
        candidates.append((href, label + " | " + filename))
        # Prioritise higher scores while keeping all as fallback
        candidates.sort(key=lambda _hx: 0)  # stable

    if not candidates:
        raise RuntimeError(
            "no .ods download link found on publication page — has the "
            "gov.uk page layout changed?"
        )

    # Re-rank
    def rank(href_label: tuple[str, str]) -> int:
        href, label = href_label
        s = 0
        if "time series" in label or "time-series" in label:
            s += 10
        if "time-series" in href.lower() or "time_series" in href.lower():
            s += 5
        return s

    candidates.sort(key=rank, reverse=True)
    return candidates[0][0]


def _check_host_allowed(url: str) -> None:
    host = urlparse(url).hostname or ""
    if host not in ALLOWED_HOSTS:
        raise RuntimeError(
            f"refusing to download from unexpected host: {host!r} "
            f"(allowed: {sorted(ALLOWED_HOSTS)!r})"
        )


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


def fetch(cache_dir: Path, *, force: bool = False) -> Path:
    """Ensure `cache/latest.ods` points at the current gov.uk release.

    Returns the canonical `latest.ods` path.
    """
    cache_dir.mkdir(parents=True, exist_ok=True)

    resp = requests.get(
        PUBLICATION_URL,
        headers={"User-Agent": USER_AGENT},
        timeout=REQUEST_TIMEOUT,
    )
    resp.raise_for_status()

    ods_url = _find_time_series_ods(resp.text, PUBLICATION_URL)
    filename = Path(urlparse(ods_url).path).name
    dest = cache_dir / filename
    latest = cache_dir / "latest.ods"

    if dest.exists() and not force:
        print(f"cached: {dest.name} (already present; skipping download)")
    else:
        print(f"downloading {ods_url}")
        _download(ods_url, dest)
        print(f"wrote {dest} ({dest.stat().st_size} bytes)")

    # Mirror to latest.ods (copy, not symlink — symlinks are flaky on Windows)
    latest.write_bytes(dest.read_bytes())
    return latest


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
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
        latest = fetch(args.cache_dir, force=args.force)
    except Exception as e:
        print(f"error: {e}", file=sys.stderr)
        return 1
    print(f"latest: {latest}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
