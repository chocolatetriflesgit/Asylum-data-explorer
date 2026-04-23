"""
Build ``data/provisional-data.js`` from the cached gov.uk last-7-days page.

Input:  cache/last-7-days.html (written by scripts/fetch_last_7_days.py).
Output: data/provisional-data.js with::

    window.BOATS_PROVISIONAL = [{d, m, b, u}, ...]      // 7 rows
    window.BOATS_PROVISIONAL_META = {
      fetchedAt, updatedAt, source, sourceUrl, firstDate, latestDate
    }

Why provisional: the weekly ODS is canonical but lags by up to a week.
This page updates daily, so it fills the visible gap. Figures get revised
when the weekly ODS lands, so we keep the two globals separate and let
the dashboard render-layer decide which takes priority for a given date.

Usage:
    python scripts/build_provisional.py [cache/last-7-days.html] [data/]

Fails loudly if the page shape has changed (row count, headers,
non-numeric values). CI watches this.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import sys
from collections import Counter
from pathlib import Path

from bs4 import BeautifulSoup


SOURCE_URL = (
    "https://www.gov.uk/government/publications/"
    "migrants-detected-crossing-the-english-channel-in-small-boats/"
    "migrants-detected-crossing-the-english-channel-in-small-boats-last-7-days"
)
EXPECTED_HEADERS = [
    "Date",
    "Migrants arrived",
    "Boats arrived",
    "Boats involved in uncontrolled landings",
    "Notes",
]
_DATE_RE = re.compile(r"^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$")
_UPDATED_RE = re.compile(
    r"Updated\s+(\d{1,2}\s+[A-Za-z]+\s+\d{4})", re.IGNORECASE
)
_MONTHS = {
    "january": 1, "february": 2, "march": 3, "april": 4,
    "may": 5, "june": 6, "july": 7, "august": 8,
    "september": 9, "october": 10, "november": 11, "december": 12,
}


def _parse_uk_date(text: str) -> dt.date:
    m = _DATE_RE.match(text.strip())
    if not m:
        raise ValueError(f"unrecognised date format: {text!r}")
    day, month_name, year = m.groups()
    month = _MONTHS.get(month_name.lower())
    if not month:
        raise ValueError(f"unrecognised month: {month_name!r}")
    return dt.date(int(year), month, int(day))


def _parse_int(text: str) -> int:
    """Coerce '1,234' / '0' / '-' to int (dash raises — we want a loud fail)."""
    s = text.strip().replace(",", "")
    if not s or s == "-":
        raise ValueError(f"expected integer, got {text!r}")
    return int(s)


def _auto_correct_year_typos(rows: list[dict]) -> list[dict] | None:
    """Snap obvious single-row year typos to the neighbour year.

    The Home Office page has been seen to publish a correct day/month with a
    stale year (e.g. "20 April 2025" sitting between 2026-04-19 and
    2026-04-21). The underlying figures are almost certainly right — only
    the label is wrong — so we rewrite the date in-place and log the change
    so the frontend can flag it.

    Returns a list of correction records when the sequence can be made
    consecutive purely by swapping wrong years to the majority year.
    Returns ``None`` if a gap remains after correction — caller must then
    fail loudly with the original error, because the shape mismatch is not
    a pure year typo.
    """
    dates = [dt.date.fromisoformat(r["d"]) for r in rows]
    canonical_year = Counter(d.year for d in dates).most_common(1)[0][0]

    corrections: list[dict] = []
    for i, d in enumerate(dates):
        if d.year == canonical_year:
            continue
        try:
            alt = d.replace(year=canonical_year)
        except ValueError:
            continue  # e.g. Feb 29 across a non-leap year — leave it alone
        fits_prev = i == 0 or (alt - dates[i - 1]).days == 1
        fits_next = i == len(dates) - 1 or (dates[i + 1] - alt).days == 1
        if fits_prev and fits_next:
            corrections.append({
                "row": i,
                "raw": d.isoformat(),
                "corrected": alt.isoformat(),
            })
            dates[i] = alt
            rows[i]["d"] = alt.isoformat()

    for i in range(1, len(dates)):
        if (dates[i] - dates[i - 1]).days != 1:
            return None
    return corrections


def parse_last_7_days(html: str) -> tuple[list[dict], str | None, list[dict]]:
    """Return ``(rows, updated_at, corrections)``.

    ``updated_at`` is an ISO date or None. ``corrections`` is a list of
    year-typo fixes applied to the raw rows (empty if none were needed).
    """
    soup = BeautifulSoup(html, "html.parser")

    tables = soup.find_all("table")
    if len(tables) != 1:
        raise RuntimeError(
            f"expected exactly 1 table on the page, found {len(tables)}"
        )
    tr_rows = tables[0].find_all("tr")
    if len(tr_rows) != 8:  # 1 header + 7 data
        raise RuntimeError(
            f"expected 8 table rows (1 header + 7 data), found {len(tr_rows)}"
        )

    header_cells = [c.get_text(strip=True) for c in tr_rows[0].find_all(["th", "td"])]
    if header_cells != EXPECTED_HEADERS:
        raise RuntimeError(
            "table headers do not match expected shape:\n"
            f"  expected: {EXPECTED_HEADERS}\n"
            f"  got:      {header_cells}"
        )

    rows: list[dict] = []
    for tr in tr_rows[1:]:
        cells = [c.get_text(strip=True) for c in tr.find_all(["th", "td"])]
        if len(cells) != 5:
            raise RuntimeError(f"expected 5 cells per row, got {cells!r}")
        d = _parse_uk_date(cells[0])
        rows.append({
            "d": d.isoformat(),
            "m": _parse_int(cells[1]),
            "b": _parse_int(cells[2]),
            "u": _parse_int(cells[3]),
        })

    # Assert dates are consecutive so the chart can safely extend a line.
    # Year typos on the HO page (see _auto_correct_year_typos) are healed
    # first; any remaining gap is a genuine shape change and fails loud.
    dates = [dt.date.fromisoformat(r["d"]) for r in rows]
    gaps = [
        (dates[i - 1].isoformat(), dates[i].isoformat())
        for i in range(1, len(dates))
        if (dates[i] - dates[i - 1]).days != 1
    ]
    corrections: list[dict] = []
    if gaps:
        corrections = _auto_correct_year_typos(rows)
        if corrections is None:
            raise RuntimeError(
                f"non-consecutive dates in last-7-days table: {gaps}"
            )
        print(
            f"warning: auto-corrected {len(corrections)} year typo(s) on "
            f"the last-7-days page: {corrections}",
            file=sys.stderr,
        )

    # "Updated DD Month YYYY" caption — stored for the UI footer.
    updated_at: str | None = None
    for p in soup.find_all("p"):
        m = _UPDATED_RE.search(p.get_text(" ", strip=True))
        if m:
            try:
                updated_at = _parse_uk_date(m.group(1)).isoformat()
            except ValueError:
                pass
            break

    return rows, updated_at, corrections


def build(html_path: Path, out_dir: Path) -> Path:
    if not html_path.exists():
        raise FileNotFoundError(
            f"{html_path} not found — run scripts/fetch_last_7_days.py first"
        )
    html = html_path.read_text(encoding="utf-8")
    rows, updated_at, corrections = parse_last_7_days(html)

    meta = {
        "fetchedAt": dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat(),
        "updatedAt": updated_at,
        "source": html_path.name,
        "sourceUrl": SOURCE_URL,
        "firstDate": rows[0]["d"],
        "latestDate": rows[-1]["d"],
        "provider": "UK Home Office",
        "licence": "Open Government Licence v3.0",
        "corrections": corrections,
    }

    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "provisional-data.js"
    lines = [
        "/* AUTO-GENERATED by scripts/build_provisional.py. Do not edit. */",
        f"window.BOATS_PROVISIONAL = {json.dumps(rows, separators=(',', ':'))};",
        f"window.BOATS_PROVISIONAL_META = {json.dumps(meta, separators=(',', ':'))};",
        "",
    ]
    out_path.write_text("\n".join(lines), encoding="utf-8")
    print(
        f"wrote {out_path} - {len(rows)} rows, "
        f"{rows[0]['d']} -> {rows[-1]['d']}, updatedAt={updated_at}"
    )
    return out_path


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument(
        "html",
        nargs="?",
        type=Path,
        default=Path("cache/last-7-days.html"),
        help="Path to cached last-7-days HTML (default: cache/last-7-days.html).",
    )
    p.add_argument(
        "out_dir",
        nargs="?",
        type=Path,
        default=Path("data"),
        help="Destination directory (default: data/).",
    )
    args = p.parse_args()
    try:
        build(args.html, args.out_dir)
    except Exception as e:
        print(f"error: {e}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
