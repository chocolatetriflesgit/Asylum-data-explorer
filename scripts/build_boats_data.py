"""
Transform the Home Office "Migrants detected crossing the English Channel in
small boats — time series" ODS into `data/boats-data.js`.

Usage:
    python scripts/build_boats_data.py <input.ods> <output-dir>

This script is the **schema source of truth**. Every `BOATS_*` global on the
client is shaped here. If the source ODS changes, adjust column mapping in
this file first; `tests/` must stay green.

Sheets consumed
---------------
SB_01    Daily series. Columns:
         - Date                     (YYYY-MM-DD or datetime)
         - Migrants                 (integer)
         - Boats                    (integer)
         - Uncontrolled_boats       (integer or '-' before it was reported)
SB_02    Weekly series. Columns:
         - Week_ending              (Saturday)
         - Migrants, Boats
         - Preventions              (null before ~2023)
         - Events_prevented         (null before ~2023)
Notes    Methodology. One note per row, single column.

Outputs (as `window.X = ...` assignments)
-----------------------------------------
BOATS_DAILY    [{d: 'YYYY-MM-DD', m: int, b: int}]
BOATS_WEEKLY   [{we, m, b, p, e}]  (p/e null before preventions reporting)
BOATS_MONTHLY  [{month: 'YYYY-MM', m, b}]
BOATS_ANNUAL   [{y, m, b, perBoat}]
BOATS_YOY      {'YYYY': [cum_day_1..366]}  (null past latest data point)
BOATS_RECORDS  {busiestDay, busiestWeek, busiestMonth,
                totalMigrants, totalBoats, firstDate, latestDate, daysCovered}
BOATS_META     {sourceFile, sourceDated, latestDataPoint, generatedAt,
                provider, licence, sourceUrl, notes[]}

Null handling
-------------
- `Uncontrolled_boats` cell of `-` is coerced to None, not 0. It is not
  re-emitted in BOATS_DAILY today, but kept internally in case charts need it.
- Weekly preventions (`p`, `e`) are None before ~2023. Preserved as null in JS.
- BOATS_YOY arrays are always length 366. Days past the latest data point in
  the current year are emitted as null.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import math
import sys
from pathlib import Path
from typing import Any

import pandas as pd


SOURCE_URL = (
    "https://www.gov.uk/government/publications/"
    "migrants-detected-crossing-the-english-channel-in-small-boats"
)
PROVIDER = "UK Home Office"
LICENCE = "Open Government Licence v3.0"


# ---------------------------------------------------------------------------
# Loading
# ---------------------------------------------------------------------------

def _load_sheet(path: Path, sheet: str) -> pd.DataFrame:
    """Load a named sheet from an ODS, stripping whitespace headers."""
    df = pd.read_excel(path, sheet_name=sheet, engine="odf")
    df.columns = [str(c).strip() for c in df.columns]
    return df


def _first_matching(df: pd.DataFrame, *candidates: str) -> str:
    """Return the first column name that matches one of the candidates (case-insensitive)."""
    lowered = {c.lower(): c for c in df.columns}
    for cand in candidates:
        key = cand.lower()
        if key in lowered:
            return lowered[key]
    raise KeyError(
        f"None of {candidates!r} found in columns {list(df.columns)!r}"
    )


def _coerce_int(v: Any) -> int | None:
    """Coerce cell to int, treating '-' and blanks as None."""
    if v is None:
        return None
    if isinstance(v, float) and math.isnan(v):
        return None
    if isinstance(v, str):
        s = v.strip()
        if s in {"", "-", "—", "–", "..", "n/a", "N/A"}:
            return None
        return int(float(s.replace(",", "")))
    return int(v)


def _coerce_date(v: Any) -> dt.date:
    if isinstance(v, dt.datetime):
        return v.date()
    if isinstance(v, dt.date):
        return v
    return pd.to_datetime(v).date()


# ---------------------------------------------------------------------------
# Transforms
# ---------------------------------------------------------------------------

def build_daily(df: pd.DataFrame) -> list[dict]:
    date_col = _first_matching(df, "Date", "Day")
    migrants_col = _first_matching(
        df, "Migrants arrived", "Migrants", "Arrivals", "Migrants_detected"
    )
    boats_col = _first_matching(
        df, "Boats arrived", "Boats", "Boats_arriving"
    )

    out: list[dict] = []
    for _, row in df.iterrows():
        d = _coerce_date(row[date_col])
        m = _coerce_int(row[migrants_col]) or 0
        b = _coerce_int(row[boats_col]) or 0
        out.append({"d": d.isoformat(), "m": m, "b": b})
    out.sort(key=lambda r: r["d"])
    return out


def _optional_matching(df: pd.DataFrame, *candidates: str) -> str | None:
    """Like _first_matching, but returns None instead of raising.
    Used for columns the ODS only started including recently."""
    try:
        return _first_matching(df, *candidates)
    except KeyError:
        return None


def build_weekly(df: pd.DataFrame) -> list[dict]:
    we_col = _first_matching(
        df, "Week_ending", "Week ending", "Week ending (Saturday)", "Week end"
    )
    migrants_col = _first_matching(
        df, "Migrants arrived", "Migrants", "Arrivals"
    )
    boats_col = _first_matching(df, "Boats arrived", "Boats")
    prev_col = _optional_matching(
        df,
        "Migrants prevented",
        "Migrants disrupted",
        "Preventions",
        "Prevented",
        "Migrants_prevented",
    )
    events_col = _optional_matching(
        df,
        "Events prevented",
        "Crossings prevented",
        "Events_prevented",
        "Prevention_events",
        "Events",
    )

    out: list[dict] = []
    for _, row in df.iterrows():
        we = _coerce_date(row[we_col])
        out.append(
            {
                "we": we.isoformat(),
                "m": _coerce_int(row[migrants_col]) or 0,
                "b": _coerce_int(row[boats_col]) or 0,
                "p": _coerce_int(row[prev_col]) if prev_col else None,
                "e": _coerce_int(row[events_col]) if events_col else None,
            }
        )
    out.sort(key=lambda r: r["we"])
    return out


def build_monthly(daily: list[dict]) -> list[dict]:
    agg: dict[str, dict] = {}
    for row in daily:
        ym = row["d"][:7]
        bucket = agg.setdefault(ym, {"month": ym, "m": 0, "b": 0})
        bucket["m"] += row["m"]
        bucket["b"] += row["b"]
    return sorted(agg.values(), key=lambda r: r["month"])


def build_annual(daily: list[dict]) -> list[dict]:
    agg: dict[int, dict] = {}
    for row in daily:
        y = int(row["d"][:4])
        bucket = agg.setdefault(y, {"y": y, "m": 0, "b": 0})
        bucket["m"] += row["m"]
        bucket["b"] += row["b"]
    out = []
    for y, v in sorted(agg.items()):
        per_boat = round(v["m"] / v["b"], 2) if v["b"] else None
        out.append({"y": y, "m": v["m"], "b": v["b"], "perBoat": per_boat})
    return out


def build_yoy(daily: list[dict]) -> dict[str, list[int | None]]:
    """Cumulative migrants by day-of-year, keyed by year.

    Arrays are always length 366. Days past the latest data point in the
    latest year are None.
    """
    latest = max(dt.date.fromisoformat(r["d"]) for r in daily)
    by_year: dict[int, list[int | None]] = {}

    years = {int(r["d"][:4]) for r in daily}
    for y in years:
        by_year[y] = [0] * 366

    running: dict[int, int] = {y: 0 for y in years}
    daily_by_date = {r["d"]: r["m"] for r in daily}

    for y in sorted(years):
        start = dt.date(y, 1, 1)
        for i in range(366):
            d = start + dt.timedelta(days=i)
            if d.year != y:
                by_year[y][i] = by_year[y][i - 1] if i else 0
                continue
            running[y] += daily_by_date.get(d.isoformat(), 0)
            by_year[y][i] = running[y]

    latest_year = latest.year
    latest_doy_index = (latest - dt.date(latest_year, 1, 1)).days
    for i in range(latest_doy_index + 1, 366):
        by_year[latest_year][i] = None

    return {str(y): arr for y, arr in sorted(by_year.items())}


def build_records(
    daily: list[dict], weekly: list[dict], monthly: list[dict]
) -> dict:
    busiest_day = max(daily, key=lambda r: r["m"])
    busiest_week = max(weekly, key=lambda r: r["m"]) if weekly else None
    busiest_month = max(monthly, key=lambda r: r["m"])
    total_m = sum(r["m"] for r in daily)
    total_b = sum(r["b"] for r in daily)
    first = daily[0]["d"]
    latest = daily[-1]["d"]
    days_covered = (
        dt.date.fromisoformat(latest) - dt.date.fromisoformat(first)
    ).days + 1

    return {
        "busiestDay": {"date": busiest_day["d"], "migrants": busiest_day["m"]},
        "busiestWeek": (
            {"weekEnding": busiest_week["we"], "migrants": busiest_week["m"]}
            if busiest_week
            else None
        ),
        "busiestMonth": {
            "month": busiest_month["month"],
            "migrants": busiest_month["m"],
        },
        "totalMigrants": total_m,
        "totalBoats": total_b,
        "firstDate": first,
        "latestDate": latest,
        "daysCovered": days_covered,
    }


def build_meta(path: Path, notes: list[str], latest_date: str) -> dict:
    stat = path.stat()
    sourced = dt.datetime.fromtimestamp(stat.st_mtime, tz=dt.timezone.utc)
    return {
        "sourceFile": path.name,
        "sourceDated": sourced.date().isoformat(),
        "latestDataPoint": latest_date,
        "generatedAt": dt.datetime.now(tz=dt.timezone.utc).isoformat(
            timespec="seconds"
        ),
        "provider": PROVIDER,
        "licence": LICENCE,
        "sourceUrl": SOURCE_URL,
        "notes": notes,
    }


def load_notes(path: Path) -> list[str]:
    try:
        df = _load_sheet(path, "Notes")
    except Exception:
        return []
    notes: list[str] = []
    for col in df.columns:
        for v in df[col].tolist():
            if isinstance(v, str) and v.strip():
                notes.append(v.strip())
    return notes


# ---------------------------------------------------------------------------
# Emit
# ---------------------------------------------------------------------------

def _dump_js_assign(name: str, value: Any) -> str:
    """Serialize one window.X = <json> assignment."""
    return f"window.{name} = {json.dumps(value, separators=(',', ':'))};\n"


def emit(out_dir: Path, payload: dict[str, Any]) -> Path:
    out = out_dir / "boats-data.js"
    with out.open("w", encoding="utf-8") as f:
        f.write("/* AUTO-GENERATED by scripts/build_boats_data.py. Do not edit. */\n")
        for name in (
            "BOATS_DAILY",
            "BOATS_WEEKLY",
            "BOATS_MONTHLY",
            "BOATS_ANNUAL",
            "BOATS_YOY",
            "BOATS_RECORDS",
            "BOATS_META",
        ):
            f.write(_dump_js_assign(name, payload[name]))
    return out


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def build(ods_path: Path, out_dir: Path) -> dict[str, Any]:
    daily_df = _load_sheet(ods_path, "SB_01")
    weekly_df = _load_sheet(ods_path, "SB_02")

    daily = build_daily(daily_df)
    weekly = build_weekly(weekly_df)
    monthly = build_monthly(daily)
    annual = build_annual(daily)
    yoy = build_yoy(daily)
    records = build_records(daily, weekly, monthly)
    notes = load_notes(ods_path)
    meta = build_meta(ods_path, notes, records["latestDate"])

    return {
        "BOATS_DAILY": daily,
        "BOATS_WEEKLY": weekly,
        "BOATS_MONTHLY": monthly,
        "BOATS_ANNUAL": annual,
        "BOATS_YOY": yoy,
        "BOATS_RECORDS": records,
        "BOATS_META": meta,
    }


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("ods", type=Path, help="Path to the source ODS file.")
    p.add_argument(
        "out_dir",
        type=Path,
        help="Output directory (boats-data.js is written here).",
    )
    args = p.parse_args()

    if not args.ods.exists():
        print(f"error: ODS file not found: {args.ods}", file=sys.stderr)
        return 2
    args.out_dir.mkdir(parents=True, exist_ok=True)

    payload = build(args.ods, args.out_dir)
    written = emit(args.out_dir, payload)
    print(f"wrote {written} ({len(payload['BOATS_DAILY'])} daily rows)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
