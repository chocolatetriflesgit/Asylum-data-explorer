"""
Build `data/deaths-data.js` — recorded migrant deaths and disappearances
on the English Channel route, from the IOM Missing Migrants Project
global CSV.

Source
------
  IOM Missing Migrants Project (not Home Office data)
    https://missingmigrants.iom.int/

Emits
-----
  window.DEATHS_DAILY  = [{d, dead, missing, category}]
  window.DEATHS_ANNUAL = [{y, dead, missing, total, sea, land, other}]
  window.DEATHS_ANNUAL_BY_CATEGORY = {years, sea, land, other}
  window.DEATHS_META   = {provider, sourceUrl, sourceFile, generatedAt, ...}

Design
------
- The global CSV carries one row per incident, with columns
  "Incident Date", "Region of Incident", "Migration Route",
  "Cause of Death", "Number of Dead", "Minimum Estimated Number of Missing",
  and free-text "Location of Incident".
- We filter to rows IOM tags as the "Mainland Europe to the UK" route.
  An earlier version used a broader text match on words like "Channel" or
  "Dover", but that swept in unrelated incidents in the Channel of Sicily
  and US-Mexico water "channels". The route label is IOM's own and is
  the cleaner cut.
- Each incident is categorised by Cause of Death:
    sea   → Drowning (small-boat / open-water deaths)
    land  → Vehicle accident / death linked to hazardous transport
            (lorry, motorway, Eurotunnel and similar)
    other → everything else (sickness, violence, accidental death,
            mixed/unknown)
- Empty or missing numeric cells are coerced to 0.
- An empty DEATHS_DAILY is a valid state: if the fetcher hasn't run yet
  (no CSV in cache), the builder emits a stub file so the UI can render a
  "Data pending" card rather than crashing on missing globals.

Usage:
    python scripts/build_deaths.py cache/deaths/latest.csv data/
    python scripts/build_deaths.py --empty data/       # emit pending-state stub
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd


CHANNEL_ROUTE_LABEL = "Mainland Europe to the UK"

CATEGORIES = ("sea", "land", "other")

# Cause-of-Death values seen in the IOM CSV that map to each category.
# Values not listed here fall through to "other".
SEA_CAUSES = {
    "drowning",
    "accidental death,drowning",
    "drowning,accidental death",
}
LAND_CAUSES = {
    "vehicle accident / death linked to hazardous transport",
}


def _categorise(cause: str) -> str:
    c = (cause or "").strip().lower()
    if c in SEA_CAUSES:
        return "sea"
    if c in LAND_CAUSES:
        return "land"
    return "other"


def _first_col(df: pd.DataFrame, *names: str) -> str | None:
    for n in names:
        for c in df.columns:
            if c.strip().lower() == n.strip().lower():
                return c
    return None


def build(csv_path: Path) -> tuple[list[dict], list[dict], dict, dict]:
    df = pd.read_csv(csv_path, dtype=str, keep_default_na=False)

    route_col = _first_col(df, "Migration Route", "Migration route")
    if not route_col:
        raise SystemExit(f"IOM CSV missing Migration Route column — got {list(df.columns)}")
    channel = df[df[route_col].str.strip() == CHANNEL_ROUTE_LABEL].copy()

    date_col = _first_col(channel, "Incident Date", "Incident date", "Date")
    dead_col = _first_col(channel, "Number of Dead", "Number Dead", "Dead")
    missing_col = _first_col(channel, "Minimum Estimated Number of Missing",
                             "Number of Missing", "Missing")
    cause_col = _first_col(channel, "Cause of Death", "Cause")
    if not (date_col and dead_col and missing_col and cause_col):
        raise SystemExit(
            f"IOM CSV columns not recognised — got {list(df.columns)}"
        )

    channel["_d"] = pd.to_datetime(channel[date_col], format="%Y-%m-%d", errors="coerce")
    channel["_dead"] = pd.to_numeric(channel[dead_col], errors="coerce").fillna(0).astype(int)
    channel["_missing"] = pd.to_numeric(channel[missing_col], errors="coerce").fillna(0).astype(int)
    channel["_cat"] = channel[cause_col].map(_categorise)

    channel = channel[channel["_d"].notna()]

    # Daily — one row per (date, category) so the UI can colour-code days.
    daily = (channel
             .groupby([channel["_d"].dt.date, "_cat"])[["_dead", "_missing"]]
             .sum().reset_index().sort_values(["_d", "_cat"]))
    daily_out = [
        {"d": str(r["_d"]), "dead": int(r["_dead"]),
         "missing": int(r["_missing"]), "category": r["_cat"]}
        for _, r in daily.iterrows()
        if (r["_dead"] + r["_missing"]) > 0
    ]

    # Annual — totals plus per-category breakdown.
    channel["_y"] = channel["_d"].dt.year
    channel["_total"] = channel["_dead"] + channel["_missing"]
    by_year_total = (channel.groupby("_y")[["_dead", "_missing", "_total"]]
                            .sum().reset_index())
    by_year_cat = (channel.groupby(["_y", "_cat"])["_total"].sum()
                          .unstack(fill_value=0).reindex(columns=list(CATEGORIES), fill_value=0)
                          .reset_index())
    annual_df = by_year_total.merge(by_year_cat, on="_y").sort_values("_y")
    annual_out = [
        {"y": int(r["_y"]), "dead": int(r["_dead"]), "missing": int(r["_missing"]),
         "total": int(r["_total"]),
         "sea": int(r["sea"]), "land": int(r["land"]), "other": int(r["other"])}
        for _, r in annual_df.iterrows()
    ]
    by_cat = {
        "years": [r["y"] for r in annual_out],
        "sea":   [r["sea"]   for r in annual_out],
        "land":  [r["land"]  for r in annual_out],
        "other": [r["other"] for r in annual_out],
    }

    latest = channel["_d"].max()
    meta = {
        "provider": "IOM Missing Migrants Project",
        "sourceUrl": "https://missingmigrants.iom.int/",
        "sourceFile": csv_path.name,
        "sourceDated": latest.strftime("%Y-%m-%d") if pd.notna(latest) else None,
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "licence": "CC BY-NC 4.0 (IOM)",
        "notes": (
            "Incident-level records filtered to IOM's 'Mainland Europe to the UK' "
            "route. Dead and missing are reported separately by IOM; both are "
            "people who lost their lives or are presumed dead. Categorised by "
            "Cause of Death: 'sea' = drowning, 'land' = vehicle / lorry / "
            "Eurotunnel, 'other' = sickness, violence, accidental death, "
            "mixed or unknown. Undercount is likely — IOM records only "
            "incidents they can verify from media, NGO or official sources."
        ),
        "rowsIn": int(len(df)),
        "rowsChannel": int(len(channel)),
        "categories": list(CATEGORIES),
    }
    return daily_out, annual_out, by_cat, meta


def write_js(out_dir: Path, daily: list[dict], annual: list[dict],
             by_cat: dict, meta: dict) -> Path:
    out = out_dir / "deaths-data.js"
    body = (
        "/* AUTO-GENERATED by scripts/build_deaths.py. Do not edit. */\n"
        f"window.DEATHS_DAILY = {json.dumps(daily, ensure_ascii=False)};\n"
        f"window.DEATHS_ANNUAL = {json.dumps(annual, ensure_ascii=False)};\n"
        f"window.DEATHS_ANNUAL_BY_CATEGORY = {json.dumps(by_cat, ensure_ascii=False)};\n"
        f"window.DEATHS_META = {json.dumps(meta, ensure_ascii=False)};\n"
    )
    out.write_text(body, encoding="utf-8")
    return out


def stub(out_dir: Path) -> Path:
    meta = {
        "provider": "IOM Missing Migrants Project",
        "sourceUrl": "https://missingmigrants.iom.int/",
        "sourceFile": None,
        "sourceDated": None,
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "licence": "CC BY-NC 4.0 (IOM)",
        "notes": "Pending first fetch — run scripts/fetch_deaths.py.",
        "pending": True,
        "categories": list(CATEGORIES),
    }
    empty_by_cat = {"years": [], "sea": [], "land": [], "other": []}
    return write_js(out_dir, [], [], empty_by_cat, meta)


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("csv", type=Path, nargs="?",
                   help="Path to IOM CSV (omit with --empty).")
    p.add_argument("out_dir", type=Path, nargs="?", default=Path("data"),
                   help="Output directory (default: data/).")
    p.add_argument("--empty", action="store_true",
                   help="Write the pending-state stub instead of parsing a CSV.")
    args = p.parse_args()

    args.out_dir.mkdir(parents=True, exist_ok=True)

    if args.empty:
        out = stub(args.out_dir)
        print(f"wrote {out} (pending stub)")
        return 0

    if args.csv is None or not args.csv.exists():
        print("error: csv path is required (or pass --empty)", file=sys.stderr)
        return 2

    daily, annual, by_cat, meta = build(args.csv)
    out = write_js(args.out_dir, daily, annual, by_cat, meta)
    sea = sum(by_cat["sea"]); land = sum(by_cat["land"]); other = sum(by_cat["other"])
    print(
        f"wrote {out} — {len(daily)} day-category rows, "
        f"{len(annual)} years, {meta['rowsChannel']} channel rows of {meta['rowsIn']} "
        f"(sea={sea}, land={land}, other={other})"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
