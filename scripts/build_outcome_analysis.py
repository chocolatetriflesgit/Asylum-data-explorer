"""
Build ``data/outcome-cohort-data.js`` — cohort outcomes for asylum claims,
one row per (year-of-claim × nationality), tracking where the cohort
has ended up by the latest snapshot.

Source: ``outcome-analysis-asylum-claims-datasets-<mmm-YYYY>.xlsx`` from
gov.uk (ASY_D04, ``Data_Asy_D04`` sheet).
  https://www.gov.uk/government/statistical-data-sets/immigration-system-statistics-data-tables

Emits:
  window.OUTCOME_COHORT_ANNUAL = [{
    year, region, nationality, claims,
    initial: {protection, otherLeave, refusals, withdrawals, admin, notYet},
    returns: {enforced, voluntary},
    latest:  {protection, otherLeave, refusals, withdrawals, admin, notYet},
  }]
  window.OUTCOME_COHORT_META = {
    yearRange: [minYear, maxYear], asOf, nextUpdate, source, ...
  }

Design
------
- The Home Office ships a flat wide-format sheet with column headers like
  ``Initial: Grants of Protection``, ``Latest: Refused``, etc. This builder
  matches columns by *pattern* — ``^initial.*protect`` etc. — so minor
  renames in future releases don't break the build.
- Rows with Claims = 0 are dropped.
- Output is sorted by (year asc, claims desc, nationality) for stable diffs.
- `region` is taken from the sheet verbatim if present; otherwise None.

Usage:
    python scripts/build_outcome_analysis.py <path/to/outcome-xlsx> data/
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd


DATA_SHEET = "Data_Asy_D04"
COVER_SHEET_CANDIDATES = ("Cover_sheet", "Cover sheet", "Contents", "Notes")


# --- Column-matching regexes ---------------------------------------------
# Keyed by (phase, bucket). `phase` is 'initial' or 'latest'; `bucket` is one of
# the six outcome categories we carry forward. Each pattern is anchored loosely
# so the header can have suffixes like "(main applicants)".
_OUTCOME_PATTERNS: dict[tuple[str, str], re.Pattern[str]] = {
    ("initial", "protection"):  re.compile(r"(?i)\binitial\b.*\bgrant.*protect"),
    ("initial", "otherLeave"):  re.compile(r"(?i)\binitial\b.*\bgrant.*other.*leave"),
    ("initial", "refusals"):    re.compile(r"(?i)\binitial\b.*\brefus"),
    ("initial", "withdrawals"): re.compile(r"(?i)\binitial\b.*\bwithdraw"),
    ("initial", "admin"):       re.compile(r"(?i)\binitial\b.*\b(admin|administrative)"),
    ("initial", "notYet"):      re.compile(r"(?i)\binitial\b.*\bnot\s*yet|\bpending"),
    ("latest",  "protection"):  re.compile(r"(?i)\blatest\b.*\bgrant.*protect"),
    ("latest",  "otherLeave"):  re.compile(r"(?i)\blatest\b.*\bgrant.*other.*leave"),
    ("latest",  "refusals"):    re.compile(r"(?i)\blatest\b.*\brefus"),
    ("latest",  "withdrawals"): re.compile(r"(?i)\blatest\b.*\bwithdraw"),
    ("latest",  "admin"):       re.compile(r"(?i)\blatest\b.*\b(admin|administrative)"),
    ("latest",  "notYet"):      re.compile(r"(?i)\blatest\b.*\bnot\s*yet|\bpending"),
}

_RETURN_PATTERNS = {
    "enforced":  re.compile(r"(?i)\benforced\b.*\breturn"),
    "voluntary": re.compile(r"(?i)\bvoluntary\b.*\breturn"),
}

_YEAR_RE = re.compile(r"(?i)year\s*of\s*claim|^year$")
_NAT_RE = re.compile(r"(?i)nationality")
_REGION_RE = re.compile(r"(?i)region")
_CLAIMS_RE = re.compile(r"(?i)^claims?$|^applications?$|people claiming")


def _match(columns: list[str], patterns: dict) -> dict[str, str]:
    """Map bucket-key → column-name using patterns; missing = absent."""
    out: dict[str, str] = {}
    for key, rx in patterns.items():
        for col in columns:
            if rx.search(col):
                out[key] = col
                break
    return out


def _to_int(v) -> int:
    if pd.isna(v) or v in ("", "-", "..", ":"):
        return 0
    try:
        return int(round(float(v)))
    except (TypeError, ValueError):
        return 0


def _cover_metadata(xlsx_path: Path) -> tuple[str | None, str | None]:
    """Best-effort ``(asOf, nextUpdate)`` strings from the cover sheet."""
    as_of: str | None = None
    next_update: str | None = None
    for sheet in COVER_SHEET_CANDIDATES:
        try:
            cover = pd.read_excel(xlsx_path, sheet_name=sheet, engine="openpyxl", header=None)
        except Exception:
            continue
        text = "\n".join(
            str(v) for row in cover.values for v in row if not pd.isna(v)
        )
        m = re.search(r"(?i)(?:latest data|as of|data through).*?(\w+\s+\d{4})", text)
        if m:
            as_of = m.group(1).strip()
        m = re.search(r"(?i)next update.*?(\d{1,2}\s*\w+\s*\d{4})", text)
        if m:
            next_update = m.group(1).strip()
        break
    return as_of, next_update


def build_outcome(xlsx_path: Path) -> tuple[list[dict], dict]:
    df = pd.read_excel(xlsx_path, sheet_name=DATA_SHEET, engine="openpyxl", header=1)
    cols = list(df.columns.astype(str))

    # Locate index columns.
    year_col = next((c for c in cols if _YEAR_RE.search(c)), None)
    nat_col = next((c for c in cols if _NAT_RE.search(c)), None)
    region_col = next((c for c in cols if _REGION_RE.search(c)), None)
    claims_col = next((c for c in cols if _CLAIMS_RE.search(c)), None)

    missing = [n for n, v in (("year", year_col), ("nationality", nat_col),
                              ("claims", claims_col)) if v is None]
    if missing:
        raise RuntimeError(
            f"could not locate required columns {missing!r} in {DATA_SHEET}; "
            f"got: {cols[:12]}..."
        )

    outcome_map = _match(cols, _OUTCOME_PATTERNS)
    return_map = _match(cols, _RETURN_PATTERNS)

    rows: list[dict] = []
    for _, r in df.iterrows():
        try:
            year = int(r[year_col])
        except (TypeError, ValueError):
            continue
        claims = _to_int(r[claims_col])
        if claims <= 0:
            continue
        nat = str(r[nat_col]).strip()
        if not nat or nat.lower() in ("total", "grand total"):
            continue

        def bucket(phase: str) -> dict[str, int]:
            out = {}
            for key in ("protection", "otherLeave", "refusals",
                        "withdrawals", "admin", "notYet"):
                col = outcome_map.get((phase, key))
                out[key] = _to_int(r[col]) if col else 0
            return out

        rows.append({
            "year": year,
            "region": str(r[region_col]).strip() if region_col else None,
            "nationality": nat,
            "claims": claims,
            "initial": bucket("initial"),
            "returns": {
                "enforced":  _to_int(r[return_map["enforced"]])  if "enforced"  in return_map else 0,
                "voluntary": _to_int(r[return_map["voluntary"]]) if "voluntary" in return_map else 0,
            },
            "latest": bucket("latest"),
        })

    rows.sort(key=lambda r: (r["year"], -r["claims"], r["nationality"]))

    years = sorted({r["year"] for r in rows})
    as_of, next_update = _cover_metadata(xlsx_path)

    meta = {
        "yearRange": [years[0], years[-1]] if years else None,
        "asOf": as_of,
        "nextUpdate": next_update,
        "source": xlsx_path.name,
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "provider": "UK Home Office",
        "licence": "Open Government Licence v3.0",
        "sourceUrl": (
            "https://www.gov.uk/government/statistical-data-sets/"
            "immigration-system-statistics-data-tables"
        ),
        "notes": [
            "Row granularity: year of claim x nationality.",
            "'Initial' = outcome at first decision. 'Latest' = outcome as of the "
            "snapshot date shown in asOf, reflecting appeals / withdrawals / "
            "reclassifications after the initial decision.",
            "Enforced + voluntary returns are counted against the original "
            "cohort — they reduce the 'still in system' population.",
        ],
    }
    return rows, meta


def write_js(out_dir: Path, rows: list[dict], meta: dict) -> Path:
    out = out_dir / "outcome-cohort-data.js"
    body = (
        "/* AUTO-GENERATED by scripts/build_outcome_analysis.py. Do not edit. */\n"
        f"window.OUTCOME_COHORT_ANNUAL = {json.dumps(rows, ensure_ascii=False)};\n"
        f"window.OUTCOME_COHORT_META = {json.dumps(meta, ensure_ascii=False)};\n"
    )
    out.write_text(body, encoding="utf-8")
    return out


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("xlsx", type=Path,
                   help="Path to outcome-analysis-asylum-claims-datasets .xlsx")
    p.add_argument("out_dir", type=Path, nargs="?", default=Path("data"),
                   help="Output directory (default: data/)")
    args = p.parse_args()

    if not args.xlsx.exists():
        print(f"error: {args.xlsx} does not exist", file=sys.stderr)
        return 2
    args.out_dir.mkdir(parents=True, exist_ok=True)

    rows, meta = build_outcome(args.xlsx)
    out = write_js(args.out_dir, rows, meta)
    year_range = meta.get("yearRange") or "no-year"
    print(
        f"wrote {out} — {len(rows)} cohort rows, years {year_range}, "
        f"asOf {meta.get('asOf') or '(none found)'}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
