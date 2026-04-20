"""
Build data/world-map-data.js from Natural Earth 110m country boundaries.

For each country in the Natural Earth 110m admin-0 set:
  - resolve its ISO-A3 + Home-Office-style name
  - look up its region via REGION_MAP (parallel to the one in src/data.jsx)
  - project every polygon point equirectangular into a 720x380 SVG frame
  - emit an SVG path string

Output shape:
    window.WORLD_MAP = [{ iso, name, region, d }, ...]
    window.WORLD_MAP_META = { source, sourceUrl, width, height, generatedAt }

Downloads once to cache/ne_110m_countries.geojson and re-uses the cached
copy thereafter — Natural Earth boundaries do not move.

Usage:
    python scripts/build_world_map.py [--out data/world-map-data.js]
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import sys
import urllib.request
from pathlib import Path

NE_URL = (
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/"
    "geojson/ne_110m_admin_0_countries.geojson"
)
WIDTH = 720
HEIGHT = 380

# Natural Earth NAME / NAME_LONG / ADMIN → Home Office nationality name.
# Keys are the Natural Earth strings; values are what REGION_MAP expects.
# Only mismatches need an entry; exact matches fall through.
NE_TO_HO = {
    "Myanmar": "Myanmar (Burma)",
    "Dem. Rep. Congo": "Congo (Democratic Republic)",
    "Democratic Republic of the Congo": "Congo (Democratic Republic)",
    "Republic of the Congo": "Congo",
    "Côte d'Ivoire": "Ivory Coast",
    "Cote d'Ivoire": "Ivory Coast",
    "Ivory Coast": "Ivory Coast",
    "Czech Republic": "Czechia",
    "Czechia": "Czechia",
    "Republic of Serbia": "Former Yugoslavia",
    "Serbia": "Former Yugoslavia",
    "Bosnia and Herz.": "Former Yugoslavia",
    "Bosnia and Herzegovina": "Former Yugoslavia",
    "Montenegro": "Former Yugoslavia",
    "Macedonia": "North Macedonia",
    "The former Yugoslav Republic of Macedonia": "North Macedonia",
    "N. Cyprus": "Cyprus (Northern part of)",
    "Northern Cyprus": "Cyprus (Northern part of)",
    "Gambia": "Gambia, The",
    "The Gambia": "Gambia, The",
    "Bahamas": "Bahamas, The",
    "The Bahamas": "Bahamas, The",
    "Timor-Leste": "East Timor",
    "Swaziland": "Eswatini",
    "United States of America": "United States",
    "United Republic of Tanzania": "Tanzania",
    "W. Sahara": "Western Sahara",
    "S. Sudan": "South Sudan",
    "Eq. Guinea": "Equatorial Guinea",
    "Central African Rep.": "Central African Republic",
    "Fr. S. Antarctic Lands": "French Southern Territories",
    "Falkland Is.": "Falkland Islands",
    "Solomon Is.": "Solomon Islands",
}

# Direct region overrides — applied after name remap. Lets us catch countries
# the NAT_FULL list doesn't include but the map still needs coloured (e.g.
# Iceland, Estonia, Luxembourg). Keys are HO-style names.
EXTRA_REGIONS = {
    # Europe — small/recent states that don't appear in the HO nationalities list
    "Iceland": "Europe",
    "Luxembourg": "Europe",
    "Malta": "Europe",
    "Estonia": "Europe",
    "Switzerland": "Europe",
    "Liechtenstein": "Europe",
    "Slovenia": "Europe",
    "Andorra": "Europe",
    "Monaco": "Europe",
    "San Marino": "Europe",
    "Vatican": "Europe",
    "United Kingdom": "Europe",
    # Pacific island states not listed as HO nationalities
    "Solomon Islands": "East Asia & Pacific",
    "New Caledonia": "East Asia & Pacific",
    "Samoa": "East Asia & Pacific",
    "Kiribati": "East Asia & Pacific",
    "Micronesia": "East Asia & Pacific",
    # Americas outliers
    "Suriname": "Americas",
    "French Guiana": "Americas",
    "Uruguay": "Americas",
    "Puerto Rico": "Americas",
    # Explicitly unclassified territories
    "Greenland": "Other / Unclassified",
    "Antarctica": "Other / Unclassified",
    "Falkland Islands": "Other / Unclassified",
    "French Southern Territories": "Other / Unclassified",
    "Somaliland": "Other / Unclassified",
}


def load_region_map(data_jsx: Path) -> dict[str, str]:
    """Parse src/data.jsx and lift the REGION_MAP literal.

    Avoids maintaining a duplicate Python copy. Parse is deliberately
    brittle — if the JSX shape changes, the script fails loudly rather
    than silently emitting stale regions.
    """
    text = data_jsx.read_text(encoding="utf-8")
    start = text.find("const REGION_MAP = {")
    if start < 0:
        raise RuntimeError("REGION_MAP literal not found in data.jsx")
    end = text.find("};", start)
    if end < 0:
        raise RuntimeError("REGION_MAP literal unterminated")
    body = text[start + len("const REGION_MAP = {") : end]
    # Strip line comments first.
    cleaned_lines = []
    for raw_line in body.splitlines():
        if "//" in raw_line:
            raw_line = raw_line.split("//", 1)[0]
        cleaned_lines.append(raw_line)
    cleaned = "\n".join(cleaned_lines)
    # Match 'key':'value' pairs where quotes are either single or double.
    # Keys may contain commas (e.g. 'Bahamas, The') so we can't just split on ',' —
    # anchor on the quoted-literal pattern instead.
    pair_re = re.compile(r"""(['"])((?:(?!\1).)+)\1\s*:\s*(['"])((?:(?!\3).)+)\3""")
    mapping: dict[str, str] = {}
    for m in pair_re.finditer(cleaned):
        mapping[m.group(2)] = m.group(4)
    return mapping


def fetch_geojson(cache_path: Path) -> dict:
    if cache_path.exists():
        return json.loads(cache_path.read_text(encoding="utf-8"))
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    print(f"fetching {NE_URL}", file=sys.stderr)
    req = urllib.request.Request(NE_URL, headers={"User-Agent": "home-office-explorer/1.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        raw = r.read()
    cache_path.write_bytes(raw)
    return json.loads(raw.decode("utf-8"))


def project(lon: float, lat: float) -> tuple[float, float]:
    """Equirectangular onto a WIDTH x HEIGHT box. 1-decimal precision."""
    x = (lon + 180.0) * WIDTH / 360.0
    y = (90.0 - lat) * HEIGHT / 180.0
    return round(x, 1), round(y, 1)


def ring_to_path(ring: list) -> str:
    if not ring:
        return ""
    pts = [project(lon, lat) for lon, lat in ring]
    parts = [f"M{pts[0][0]},{pts[0][1]}"]
    for px, py in pts[1:]:
        parts.append(f"L{px},{py}")
    parts.append("Z")
    return "".join(parts)


def geometry_to_d(geom: dict) -> str:
    t = geom.get("type")
    if t == "Polygon":
        return "".join(ring_to_path(r) for r in geom["coordinates"])
    if t == "MultiPolygon":
        out = []
        for poly in geom["coordinates"]:
            for ring in poly:
                out.append(ring_to_path(ring))
        return "".join(out)
    return ""


def candidate_names(props: dict) -> list[str]:
    """Ordered candidate names to try for region lookup."""
    out: list[str] = []
    for k in ("NAME", "NAME_LONG", "ADMIN", "SOVEREIGNT", "NAME_EN", "FORMAL_EN"):
        v = props.get(k)
        if v and v not in out:
            out.append(v)
    return out


def pick_display_name(props: dict, region_map: dict[str, str]) -> str:
    """Prefer a name that the region map recognises; fall back to NAME."""
    for cand in candidate_names(props):
        remapped = NE_TO_HO.get(cand, cand)
        if remapped in region_map or remapped in EXTRA_REGIONS:
            return remapped
    # No known match — fall back to the most specific name Natural Earth has.
    for cand in candidate_names(props):
        return NE_TO_HO.get(cand, cand)
    return "Unknown"


def resolve_region(props: dict, region_map: dict[str, str]) -> tuple[str, str]:
    """Return (display_name, region) — tries every candidate name for a match."""
    for cand in candidate_names(props):
        remapped = NE_TO_HO.get(cand, cand)
        if remapped in region_map:
            return remapped, region_map[remapped]
        if remapped in EXTRA_REGIONS:
            return remapped, EXTRA_REGIONS[remapped]
    # Nothing matched — return the best display name we have.
    fallback = pick_display_name(props, region_map)
    return fallback, "Other / Unclassified"


def build(root: Path, out_path: Path) -> None:
    cache = root / "cache" / "ne_110m_countries.geojson"
    gj = fetch_geojson(cache)
    region_map = load_region_map(root / "src" / "data.jsx")

    records = []
    unmatched = []
    for feat in gj.get("features", []):
        props = feat.get("properties", {})
        iso = props.get("ISO_A3_EH") or props.get("ISO_A3") or props.get("ADM0_A3") or ""
        d = geometry_to_d(feat.get("geometry", {}))
        if not d:
            continue
        ho_name, region = resolve_region(props, region_map)
        if region == "Other / Unclassified":
            unmatched.append(candidate_names(props)[0] if candidate_names(props) else "?")
        records.append({
            "iso": iso,
            "name": ho_name,
            "region": region,
            "d": d,
        })

    # Sort deterministically for stable diffs.
    records.sort(key=lambda r: (r["region"], r["name"]))

    meta = {
        "source": "Natural Earth 110m Admin 0 — Countries (public domain)",
        "sourceUrl": NE_URL,
        "width": WIDTH,
        "height": HEIGHT,
        "generatedAt": dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat(),
        "projection": "equirectangular",
        "countryCount": len(records),
    }

    lines = [
        "// data/world-map-data.js — AUTO-GENERATED by scripts/build_world_map.py",
        "// Do not edit by hand.",
        "",
        "window.WORLD_MAP = " + json.dumps(records, separators=(",", ":")) + ";",
        "",
        "window.WORLD_MAP_META = " + json.dumps(meta, separators=(",", ": "), indent=2) + ";",
        "",
    ]
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text("\n".join(lines), encoding="utf-8")

    print(f"wrote {out_path} — {len(records)} countries, {out_path.stat().st_size} bytes", file=sys.stderr)
    if unmatched:
        print(f"note: {len(unmatched)} country names fell through to 'Other / Unclassified':", file=sys.stderr)
        for name in unmatched[:20]:
            print(f"  - {name}", file=sys.stderr)
        if len(unmatched) > 20:
            print(f"  ... and {len(unmatched) - 20} more", file=sys.stderr)


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument(
        "--root",
        type=Path,
        default=Path(__file__).resolve().parents[1],
        help="Project root (default: parent of scripts/).",
    )
    p.add_argument(
        "--out",
        type=Path,
        default=None,
        help="Output path (default: data/world-map-data.js under root).",
    )
    args = p.parse_args()
    out = args.out or (args.root / "data" / "world-map-data.js")
    build(args.root, out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
