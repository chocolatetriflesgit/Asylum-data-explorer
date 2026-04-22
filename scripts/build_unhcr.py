"""
Build ``data/unhcr-data.js`` from JSON cached by ``fetch_unhcr.py``.

Emits:
  window.UNHCR_POC_ANNUAL = [
    {year, originIso, originName, refugees, asylumSeekers, idps, oip, stateless, total}
  ]
    — persons of concern, aggregated across all countries of asylum per
      (year × origin). This is the denominator for the Atlas's "applicants
      per 100k displaced-persons" mode.

  window.UNHCR_UK_APPS_ANNUAL = [
    {year, originIso, originName, applied}
  ]
    — asylum applications lodged in the UK, by origin country × year.

  window.UNHCR_UK_DECISIONS_ANNUAL = [
    {year, originIso, originName, recognized, other, rejected, closed, total}
  ]

  window.UNHCR_META = {yearRange, endpoints, source, provider, ...}

Notes
-----
- UNHCR revises historical rows on each release (see their footnotes
  file). The builder always performs a full replace — no merging of
  partial caches — so an older historical value is never preserved.
- Current-year POC rows are mid-year estimates until the end-year
  statistical report lands the following spring. Flag such rows with
  ``provisional: true`` so the UI can shade them.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import sys
from pathlib import Path
from typing import Any


POC_FIELDS = {
    # UNHCR field → our key
    "refugees": "refugees",
    "asylum_seekers": "asylumSeekers",
    "idps": "idps",
    "oip": "oip",
    "stateless": "stateless",
    "returned_refugees": "returnedRefugees",
    "returned_idps": "returnedIdps",
    "ooc": "ooc",
    "hst": "hst",
}
POC_HEADLINE = ("refugees", "asylumSeekers", "idps", "oip", "stateless")

DEC_FIELDS = {
    "dec_recognized": "recognized",
    "dec_other": "other",
    "dec_rejected": "rejected",
    "dec_closed": "closed",
    "dec_total": "total",
}


def _load_year_files(endpoint_dir: Path) -> list[dict]:
    """Load all cached JSON items for one endpoint, across all years."""
    if not endpoint_dir.exists():
        return []
    items: list[dict] = []
    for path in sorted(endpoint_dir.glob("*.json")):
        text = path.read_text(encoding="utf-8")
        blob = json.loads(text)
        items.extend(blob.get("items") or [])
    return items


def _to_int(v: Any) -> int:
    if v in (None, "", "-", "*", ".."):
        return 0
    try:
        return int(round(float(v)))
    except (TypeError, ValueError):
        return 0


def build_poc(items: list[dict], this_year: int) -> list[dict]:
    """Collapse country-of-asylum axis — sum across CoA per (year × origin)."""
    agg: dict[tuple[int, str], dict] = {}
    names: dict[str, str] = {}
    for r in items:
        try:
            year = int(r.get("year") or 0)
        except (TypeError, ValueError):
            continue
        iso = (r.get("coo_iso") or "").strip().upper()
        if not iso or len(iso) != 3 or not year:
            continue
        key = (year, iso)
        if key not in agg:
            agg[key] = {k: 0 for k in POC_FIELDS.values()}
        for wire, local in POC_FIELDS.items():
            agg[key][local] += _to_int(r.get(wire))
        name = r.get("coo_name") or r.get("coo") or iso
        names.setdefault(iso, name)

    out: list[dict] = []
    for (year, iso), v in agg.items():
        total = sum(v.get(k, 0) for k in POC_HEADLINE)
        row = {
            "year": year,
            "originIso": iso,
            "originName": names.get(iso, iso),
            **{k: v.get(k, 0) for k in POC_HEADLINE},
            "total": total,
        }
        if year >= this_year:
            row["provisional"] = True
        out.append(row)
    out.sort(key=lambda r: (r["year"], -r["total"], r["originIso"]))
    return out


def build_apps(items: list[dict]) -> list[dict]:
    agg: dict[tuple[int, str], int] = {}
    names: dict[str, str] = {}
    for r in items:
        try:
            year = int(r.get("year") or 0)
        except (TypeError, ValueError):
            continue
        iso = (r.get("coo_iso") or "").strip().upper()
        if not iso or len(iso) != 3 or not year:
            continue
        applied = _to_int(r.get("applied"))
        key = (year, iso)
        agg[key] = agg.get(key, 0) + applied
        names.setdefault(iso, r.get("coo_name") or r.get("coo") or iso)
    rows = [
        {"year": y, "originIso": iso, "originName": names.get(iso, iso), "applied": v}
        for (y, iso), v in agg.items() if v > 0
    ]
    rows.sort(key=lambda r: (r["year"], -r["applied"], r["originIso"]))
    return rows


def build_decisions(items: list[dict]) -> list[dict]:
    agg: dict[tuple[int, str], dict] = {}
    names: dict[str, str] = {}
    for r in items:
        try:
            year = int(r.get("year") or 0)
        except (TypeError, ValueError):
            continue
        iso = (r.get("coo_iso") or "").strip().upper()
        if not iso or len(iso) != 3 or not year:
            continue
        key = (year, iso)
        if key not in agg:
            agg[key] = {k: 0 for k in DEC_FIELDS.values()}
        for wire, local in DEC_FIELDS.items():
            agg[key][local] += _to_int(r.get(wire))
        names.setdefault(iso, r.get("coo_name") or r.get("coo") or iso)
    out = []
    for (y, iso), v in agg.items():
        if v.get("total", 0) <= 0:
            continue
        out.append({"year": y, "originIso": iso, "originName": names.get(iso, iso), **v})
    out.sort(key=lambda r: (r["year"], -r["total"], r["originIso"]))
    return out


def write_js(out_dir: Path, poc, apps, decs, meta) -> Path:
    out = out_dir / "unhcr-data.js"
    body = (
        "/* AUTO-GENERATED by scripts/build_unhcr.py. Do not edit. */\n"
        f"window.UNHCR_POC_ANNUAL = {json.dumps(poc, ensure_ascii=False)};\n"
        f"window.UNHCR_UK_APPS_ANNUAL = {json.dumps(apps, ensure_ascii=False)};\n"
        f"window.UNHCR_UK_DECISIONS_ANNUAL = {json.dumps(decs, ensure_ascii=False)};\n"
        f"window.UNHCR_META = {json.dumps(meta, ensure_ascii=False)};\n"
    )
    out.write_text(body, encoding="utf-8")
    return out


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("cache_dir", type=Path, nargs="?",
                   default=Path("cache") / "unhcr",
                   help="Directory containing population/, asylum-applications/, asylum-decisions/ JSON.")
    p.add_argument("out_dir", type=Path, nargs="?", default=Path("data"),
                   help="Output directory (default: data/).")
    args = p.parse_args()

    args.out_dir.mkdir(parents=True, exist_ok=True)
    if not args.cache_dir.exists():
        print(f"error: cache dir {args.cache_dir} does not exist — "
              "run scripts/fetch_unhcr.py first.", file=sys.stderr)
        return 2

    poc_items = _load_year_files(args.cache_dir / "population")
    app_items = _load_year_files(args.cache_dir / "asylum-applications")
    dec_items = _load_year_files(args.cache_dir / "asylum-decisions")

    this_year = dt.date.today().year
    poc = build_poc(poc_items, this_year)
    apps = build_apps(app_items)
    decs = build_decisions(dec_items)

    years = sorted({r["year"] for r in (poc + apps + decs)})
    meta = {
        "yearRange": [years[0], years[-1]] if years else None,
        "endpoints": list((args.cache_dir.glob("*"))),
        "source": "UNHCR Refugee Data Finder — public API",
        "generatedAt": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "provider": "UNHCR",
        "licence": "https://www.unhcr.org/terms-and-conditions",
        "sourceUrl": "https://api.unhcr.org/population/v1/",
        "notes": [
            "persons-of-concern values aggregated across countries of asylum per origin.",
            "apps + decisions filtered to UK-as-asylum (coa=GBR).",
            "Current-year POC rows flagged provisional=true — mid-year estimates until the spring statistical report lands.",
        ],
    }
    # Keep meta serialisable: convert Path → str.
    meta["endpoints"] = [str(p.name) for p in meta["endpoints"] if p.is_dir()]

    out = write_js(args.out_dir, poc, apps, decs, meta)
    print(
        f"wrote {out} — poc={len(poc)} apps={len(apps)} decs={len(decs)} "
        f"years={meta['yearRange']}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
