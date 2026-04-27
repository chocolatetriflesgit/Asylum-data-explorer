"""
Build ``data/support-la-data.js`` — Asylum seekers in receipt of Home
Office support, broken out by Local Authority District (LAD24CD).

Source: ``support-local-authority-datasets-<mmm-YYYY>.xlsx`` — the same
xlsx that ``build_support_regions.py`` reads. We don't modify the
existing region-level emissions; this is a sibling builder for the
LAD-level data the UK Atlas needs.

Emits four globals:
  window.SUPPORT_LA_LATEST    = [{code, name, region, country, total,
                                  s95, s98, s4}]
  window.SUPPORT_LA_QUARTERLY = [{date, code, v}]   — last N quarters
  window.SUPPORT_LA_META      = {date, snapshots, source, ...}

The quarterly series is intentionally trimmed to the most recent
``QUARTERLY_KEEP`` snapshots (default 20 ≈ 5 years) to keep the
inlined bundle size sensible. Pass ``--keep N`` to widen.

Usage:
    python scripts/build_support_la.py <path/to/support-la.xlsx> data/
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd


COUNTRY_BY_PREFIX = {"E": "England", "W": "Wales", "S": "Scotland", "N": "Northern Ireland"}
QUARTERLY_KEEP = 20  # ~5 years of quarterly snapshots


def _fmt_date(d) -> str:
    return d.strftime("%d %b %Y").lstrip("0") if hasattr(d, "strftime") else str(d)[:10]


def _looks_like_lad(code) -> bool:
    if not isinstance(code, str):
        return False
    code = code.strip()
    if len(code) != 9:
        return False
    return code[:1] in COUNTRY_BY_PREFIX and code[1:].isdigit()


def build_support_la(xlsx_path: Path, *, keep: int) -> tuple[list[dict], list[dict], dict]:
    df = pd.read_excel(xlsx_path, sheet_name="Data_Asy_D11", engine="openpyxl", header=1)
    date_col = df.columns[0]
    df["_date"] = pd.to_datetime(df[date_col], format="%d %b %Y", errors="coerce")
    df = df[df["_date"].notna()]

    # Keep only rows that look like a real LAD (so we drop the legacy
    # "N/A - Section 4 (pre-2018)" style rows in one filter).
    df = df[df["LAD Code"].apply(_looks_like_lad)].copy()

    latest_date = df["_date"].max()

    # Per-LAD totals across support types at the latest snapshot.
    latest = df[df["_date"] == latest_date].copy()
    grouped = latest.groupby(["LAD Code", "Local Authority", "UK Region / Nation"], as_index=False).agg(
        total=("People", "sum"),
    )
    # Tier breakdown — pivot Support Type.
    tiers = (
        latest.groupby(["LAD Code", "Support Type"])["People"]
        .sum()
        .unstack(fill_value=0)
    )

    rows: list[dict] = []
    for _, r in grouped.iterrows():
        code = str(r["LAD Code"]).strip()
        name = str(r["Local Authority"]).strip()
        region = str(r["UK Region / Nation"]).strip() if pd.notna(r["UK Region / Nation"]) else ""
        s95 = int(tiers.loc[code, "Section 95"]) if "Section 95" in tiers.columns and code in tiers.index else 0
        s98 = int(tiers.loc[code, "Section 98"]) if "Section 98" in tiers.columns and code in tiers.index else 0
        s4  = int(tiers.loc[code, "Section 4"])  if "Section 4"  in tiers.columns and code in tiers.index else 0
        total = int(r["total"])
        rows.append({
            "code": code,
            "name": name,
            "region": region,
            "country": COUNTRY_BY_PREFIX.get(code[:1], "Unknown"),
            "total": total,
            "s95": s95,
            "s98": s98,
            "s4": s4,
        })
    rows.sort(key=lambda r: r["total"], reverse=True)

    # Quarterly time series — keep latest N snapshots, compact shape.
    snapshots = sorted(df["_date"].dropna().unique())
    keep_dates = snapshots[-keep:] if keep and len(snapshots) > keep else snapshots
    qdf = df[df["_date"].isin(keep_dates)]
    by_dl = qdf.groupby(["_date", "LAD Code"])["People"].sum().reset_index()
    by_dl["_v"] = by_dl["People"].astype(int)
    quarterly = [
        {"date": _fmt_date(row["_date"]), "code": row["LAD Code"], "v": int(row["_v"])}
        for _, row in by_dl.iterrows()
        if row["_v"] > 0
    ]
    quarterly.sort(key=lambda r: (r["date"], r["code"]))

    meta = {
        "date": _fmt_date(latest_date),
        "snapshotsKept": len(keep_dates),
        "ladCount": len(rows),
        "earliestKept": _fmt_date(keep_dates[0]) if len(keep_dates) else None,
        "latestKept": _fmt_date(keep_dates[-1]) if len(keep_dates) else None,
        "source": xlsx_path.name,
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "provider": "UK Home Office",
        "licence": "Open Government Licence v3.0",
        "sourceUrl": (
            "https://www.gov.uk/government/statistical-data-sets/"
            "immigration-system-statistics-data-tables"
        ),
        "notes": (
            "People in receipt of Home Office support by LAD24 code. Section 95 + "
            "98 + 4 combined. Where a LAD's count was suppressed at source, it is "
            "absent from this table — render that as a striped/hollow fill, not zero."
        ),
    }
    return rows, quarterly, meta


def write_js(out_dir: Path, rows: list[dict], quarterly: list[dict], meta: dict) -> Path:
    out = out_dir / "support-la-data.js"
    body = (
        "/* AUTO-GENERATED by scripts/build_support_la.py. Do not edit. */\n"
        f"window.SUPPORT_LA_LATEST    = {json.dumps(rows, ensure_ascii=False)};\n"
        f"window.SUPPORT_LA_QUARTERLY = {json.dumps(quarterly, ensure_ascii=False)};\n"
        f"window.SUPPORT_LA_META      = {json.dumps(meta, ensure_ascii=False)};\n"
    )
    out.write_text(body, encoding="utf-8")
    return out


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    p.add_argument("xlsx", type=Path, help="Path to support-local-authority .xlsx")
    p.add_argument("out_dir", type=Path, nargs="?", default=Path("data"))
    p.add_argument("--keep", type=int, default=QUARTERLY_KEEP,
                   help=f"Quarterly snapshots to retain (default: {QUARTERLY_KEEP})")
    args = p.parse_args()

    if not args.xlsx.exists():
        print(f"error: {args.xlsx} does not exist", file=sys.stderr)
        return 2
    args.out_dir.mkdir(parents=True, exist_ok=True)

    rows, quarterly, meta = build_support_la(args.xlsx, keep=args.keep)
    out = write_js(args.out_dir, rows, quarterly, meta)
    total = sum(r["total"] for r in rows)
    print(
        f"wrote {out} - {len(rows)} LADs as at {meta['date']} "
        f"(total {total:,}); {len(quarterly)} quarterly rows across "
        f"{meta['snapshotsKept']} snapshots"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
