"""
Build ``data/irregular-data.js`` — small-boat arrivals by nationality.

Source: ``irregular-migration-to-the-uk-summary-<mmm-YYYY>.ods`` from
gov.uk (Home Office, quarterly release). Sheet ``Irr_02b`` carries a
wide-format table of small-boat arrivals per nationality per year,
sourced from Irr_D01.

  https://www.gov.uk/government/statistical-data-sets/
  irregular-migration-detailed-dataset-and-summary-tables

Emits:
  window.IRR_BOATS_BY_NATIONALITY = [
    {year, nationality, count, partial},
  ]
  window.IRR_BOATS_META = {
    yearRange: [minYear, maxYear], asOf, source, sourceUrl,
    provider, licence, generatedAt, notes: [...],
  }

Design
------
- Wide-format header like ``Nationality | 2018 | 2019 | … | 2025 (Jan - Sep)``.
  The final column is a partial year — we keep its value but flag
  ``partial: true`` so downstream consumers can annotate.
- ``Total`` and ``Not currently recorded`` rows are emitted verbatim
  alongside nationality rows, flagged with ``meta: 'total' | 'unrecorded'``.
  Downstream code can filter them out.
- ``All other nationalities`` stays as-is — it's the real "Other" bucket
  for palette-capped charts (Finding 28) without further work.

Usage:
    python scripts/build_irregular.py <path/to/irregular-summary.ods> data/
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd


DATA_SHEET = "Irr_02b"
COVER_SHEET_CANDIDATES = ("Cover_sheet", "Cover sheet", "Contents", "Notes")

# Markers for non-nationality rows we still want to carry forward.
_META_NATIONALITY_MARKERS = {
    "total": "total",
    "not currently recorded": "unrecorded",
    "all other nationalities": "other",
}

# Partial-year header pattern: "2025 (Jan - Sep)" / "2025 (Jan-Sep)" / "2025".
_YEAR_RE = re.compile(r"^\s*(\d{4})\b(.*)$")


def _read_sheet(xlsx_path: Path) -> pd.DataFrame:
    return pd.read_excel(xlsx_path, engine="odf",
                         sheet_name=DATA_SHEET, header=None)


def _find_header_row(df: pd.DataFrame) -> int:
    for i in range(min(10, len(df))):
        first = str(df.iat[i, 0]).strip().lower()
        if first == "nationality":
            return i
    raise RuntimeError("could not find 'Nationality' header row in Irr_02b")


def _parse_year_header(cell: object) -> tuple[int | None, bool]:
    """Return (year, is_partial) or (None, False) if not a year header."""
    if cell is None:
        return (None, False)
    # Numeric headers like 2018 come through as 2018.0 — normalise.
    if isinstance(cell, (int, float)):
        try:
            if pd.isna(cell):
                return (None, False)
        except (TypeError, ValueError):
            pass
        iv = int(cell)
        if 1900 <= iv <= 2100 and float(cell) == iv:
            return (iv, False)
    s = str(cell).strip()
    if not s or s.lower() == "nan":
        return (None, False)
    m = _YEAR_RE.match(s)
    if not m:
        return (None, False)
    year = int(m.group(1))
    trailing = m.group(2).strip()
    # ".0" trailing on a numeric-as-string cell is not a partial marker.
    is_partial = bool(trailing) and trailing != ".0"
    return (year, is_partial)


def _to_int(value: object) -> int | None:
    if value is None:
        return None
    if isinstance(value, str):
        s = value.strip()
        if not s or s in {"-", "..", "[z]", "[c]", ":"}:
            return None
        try:
            return int(float(s.replace(",", "")))
        except ValueError:
            return None
    try:
        if pd.isna(value):
            return None
    except (TypeError, ValueError):
        pass
    try:
        return int(round(float(value)))
    except (TypeError, ValueError):
        return None


def _build_rows(df: pd.DataFrame) -> list[dict]:
    header_row = _find_header_row(df)
    year_cols: list[tuple[int, int, bool]] = []  # (col_idx, year, is_partial)
    for c in range(1, df.shape[1]):
        year, partial = _parse_year_header(df.iat[header_row, c])
        if year is not None:
            year_cols.append((c, year, partial))
    if not year_cols:
        raise RuntimeError("no year columns found in Irr_02b")

    rows: list[dict] = []
    for r in range(header_row + 1, len(df)):
        nat_raw = df.iat[r, 0]
        if nat_raw is None:
            continue
        try:
            if pd.isna(nat_raw):
                continue
        except (TypeError, ValueError):
            pass
        nat = str(nat_raw).strip()
        if not nat or nat.lower() == "nan":
            continue
        nat_key = nat.lower()
        meta_kind = _META_NATIONALITY_MARKERS.get(nat_key)
        for col, year, partial in year_cols:
            v = _to_int(df.iat[r, col])
            if v is None:
                continue
            row = {
                "year": year,
                "nationality": nat,
                "count": v,
                "partial": partial,
            }
            if meta_kind:
                row["meta"] = meta_kind
            rows.append(row)
    return rows


def _cover_metadata(xlsx_path: Path) -> dict:
    out: dict = {}
    for sheet in COVER_SHEET_CANDIDATES:
        try:
            df = pd.read_excel(xlsx_path, engine="odf",
                               sheet_name=sheet, header=None)
        except Exception:
            continue
        text = "\n".join(
            " | ".join(str(v) for v in r if v is not None and str(v) != "nan")
            for r in df.itertuples(index=False)
        )
        m = re.search(r"(?i)\b(data as of|latest data|covers|up to|to end)\b[^\n]*",
                      text)
        if m:
            out["asOf"] = m.group(0).strip()
        m = re.search(r"(?i)\bnext update[^\n]*", text)
        if m:
            out["nextUpdate"] = m.group(0).strip()
        break
    return out


def build(xlsx_path: Path) -> tuple[list[dict], dict]:
    df = _read_sheet(xlsx_path)
    rows = _build_rows(df)
    # Sort: year asc, then non-meta first (partial flag irrelevant for sort),
    # then count desc, then nationality.
    rows.sort(key=lambda r: (
        r["year"],
        1 if r.get("meta") else 0,
        -r["count"],
        r["nationality"],
    ))

    years = sorted({r["year"] for r in rows if not r.get("meta")})
    year_range = [years[0], years[-1]] if years else None

    cover = _cover_metadata(xlsx_path)
    meta = {
        "yearRange": year_range,
        "asOf": cover.get("asOf"),
        "nextUpdate": cover.get("nextUpdate"),
        "source": "Home Office — Irregular migration to the UK, summary tables (Irr_02b / Irr_D01)",
        "sourceFile": xlsx_path.name,
        "sourceUrl": (
            "https://www.gov.uk/government/statistical-data-sets/"
            "irregular-migration-detailed-dataset-and-summary-tables"
        ),
        "provider": "Home Office",
        "licence": "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/",
        "generatedAt": datetime.now(timezone.utc)
            .replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "notes": [
            "Small-boat arrivals by nationality as published in Irr_02b "
            "(derived from dataset Irr_D01).",
            "Rows marked partial=true cover only part of the calendar year "
            "(the most recent release column).",
            "'All other nationalities' is the real Home Office 'Other' "
            "bucket; keep it distinct from missing data.",
        ],
    }
    return rows, meta


def write_js(rows: list[dict], meta: dict, out_dir: Path) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "irregular-data.js"
    # Single-line JSON per global (test harness regex requires it).
    payload = (
        "/* AUTO-GENERATED by scripts/build_irregular.py — do not edit. */\n"
        f"window.IRR_BOATS_BY_NATIONALITY = {json.dumps(rows, ensure_ascii=False)};\n"
        f"window.IRR_BOATS_META = {json.dumps(meta, ensure_ascii=False)};\n"
    )
    out_path.write_text(payload, encoding="utf-8")
    return out_path


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("source", type=Path,
                    help="Path to irregular-migration summary .ods")
    ap.add_argument("out_dir", type=Path,
                    help="Directory to write irregular-data.js into (e.g. data/)")
    args = ap.parse_args()

    if not args.source.exists():
        print(f"error: source file not found: {args.source}", file=sys.stderr)
        return 1

    try:
        rows, meta = build(args.source)
    except Exception as e:
        print(f"error: {e}", file=sys.stderr)
        return 1

    out_path = write_js(rows, meta, args.out_dir)
    print(f"wrote {out_path} ({len(rows)} rows, years {meta['yearRange']})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
