"""
Build ``data/uk-map-data.js`` — UK Local Authority District (LAD24)
boundaries baked into pre-projected SVG paths, ready to render with
React without any client-side projection or D3.

Pattern follows ``build_world_map.py``: project lon/lat into a fixed
viewBox, simplify each ring with Douglas–Peucker, emit one path-string
per LAD with stable keys.

Inputs:
  cache/ons/lad24_buc.geojson  — populated by fetch_uk_geo.py

Output:
  data/uk-map-data.js  — defines window.UK_LAD_MAP and window.UK_MAP_META.

Each entry in UK_LAD_MAP:
  { code, name, country, d }
  - code:    LAD24CD (E06000001 etc.)
  - name:    LAD24NM
  - country: derived from code prefix (E/W/S/N → England/Wales/Scotland/Northern Ireland)
  - d:       SVG path string in viewBox coords

The viewBox is fitted to the UK extent so the consumer can render at
any width without further projection.

Usage:
    python scripts/build_uk_map.py
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import math
import sys
from pathlib import Path


# Viewbox dimensions chosen to roughly preserve UK aspect ratio.
# UK lon range ≈ -8.6..1.8 (= 10.4°), lat range ≈ 49.9..60.9 (= 11°).
# At centroid lat ~55°, cos correction ≈ 0.574 → effective h-width ≈ 5.97 lon-deg.
# So a 10:11 portrait box sized ~600×1100 reads naturally.
VIEW_W = 600
VIEW_H = 1100
PAD = 12  # px inside the viewBox

# Douglas–Peucker tolerance, in viewBox px. Higher = more aggressive.
SIMPLIFY_TOLERANCE = 0.6

COUNTRY_BY_PREFIX = {"E": "England", "W": "Wales", "S": "Scotland", "N": "Northern Ireland"}


def _country_for(code: str) -> str:
    if not code:
        return "Unknown"
    return COUNTRY_BY_PREFIX.get(code[:1], "Unknown")


def _bounds(features: list) -> tuple[float, float, float, float]:
    """Return (lon_min, lat_min, lon_max, lat_max) across all rings."""
    lon_min = lat_min = float("inf")
    lon_max = lat_max = float("-inf")
    for f in features:
        for ring in _all_rings(f["geometry"]):
            for lon, lat in ring:
                if lon < lon_min: lon_min = lon
                if lon > lon_max: lon_max = lon
                if lat < lat_min: lat_min = lat
                if lat > lat_max: lat_max = lat
    return lon_min, lat_min, lon_max, lat_max


def _all_rings(geom: dict):
    t = geom.get("type")
    if t == "Polygon":
        for ring in geom["coordinates"]:
            yield ring
    elif t == "MultiPolygon":
        for poly in geom["coordinates"]:
            for ring in poly:
                yield ring


def _make_projector(lon_min: float, lat_min: float, lon_max: float, lat_max: float):
    """Build a (lon, lat) → (x, y) projector that fits PAD..VIEW_W-PAD × PAD..VIEW_H-PAD.

    Uses an equirectangular projection with cosine-of-centroid-latitude
    correction to fix the aspect ratio. Latitude inverts so north is up.
    """
    lat_c = math.radians((lat_min + lat_max) / 2)
    cos_c = math.cos(lat_c)
    width_deg_eff = (lon_max - lon_min) * cos_c  # squashed lon-width
    height_deg = lat_max - lat_min
    sx = (VIEW_W - 2 * PAD) / width_deg_eff
    sy = (VIEW_H - 2 * PAD) / height_deg
    s = min(sx, sy)
    # Centring offsets so the map sits centred in the viewBox.
    used_w = width_deg_eff * s
    used_h = height_deg * s
    ox = (VIEW_W - used_w) / 2
    oy = (VIEW_H - used_h) / 2

    def project(lon: float, lat: float) -> tuple[float, float]:
        x = ox + (lon - lon_min) * cos_c * s
        y = oy + (lat_max - lat) * s   # invert so north is up
        return x, y
    return project, s


def _perp_dist_sq(p, a, b):
    ax, ay = a
    bx, by = b
    px, py = p
    dx, dy = bx - ax, by - ay
    if dx == 0 and dy == 0:
        return (px - ax) ** 2 + (py - ay) ** 2
    t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)
    t = max(0.0, min(1.0, t))
    qx, qy = ax + t * dx, ay + t * dy
    return (px - qx) ** 2 + (py - qy) ** 2


def _douglas_peucker(pts: list[tuple[float, float]], tol_sq: float) -> list[tuple[float, float]]:
    if len(pts) <= 2:
        return pts
    # Find the point with the maximum perpendicular distance from the segment.
    a, b = pts[0], pts[-1]
    idx_max = 0
    d_max = 0.0
    for i in range(1, len(pts) - 1):
        d = _perp_dist_sq(pts[i], a, b)
        if d > d_max:
            idx_max = i; d_max = d
    if d_max > tol_sq:
        left = _douglas_peucker(pts[: idx_max + 1], tol_sq)
        right = _douglas_peucker(pts[idx_max:], tol_sq)
        return left[:-1] + right
    return [a, b]


def _ring_to_path(pts: list[tuple[float, float]]) -> str:
    if len(pts) < 3:
        return ""
    parts = [f"M{pts[0][0]:.1f},{pts[0][1]:.1f}"]
    last = pts[0]
    for x, y in pts[1:]:
        # Drop runs of collinear / sub-pixel points.
        if abs(x - last[0]) < 0.05 and abs(y - last[1]) < 0.05:
            continue
        parts.append(f"L{x:.1f},{y:.1f}")
        last = (x, y)
    parts.append("Z")
    return "".join(parts)


def _geometry_to_d(geom: dict, project, tol_sq: float) -> str:
    out: list[str] = []
    for ring in _all_rings(geom):
        projected = [project(lon, lat) for lon, lat in ring]
        simplified = _douglas_peucker(projected, tol_sq)
        out.append(_ring_to_path(simplified))
    return "".join(out)


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    p.add_argument("--in-geojson", default="cache/ons/lad24_buc.geojson")
    p.add_argument("--out", default="data/uk-map-data.js")
    p.add_argument("--tolerance", type=float, default=SIMPLIFY_TOLERANCE,
                   help="Douglas-Peucker tolerance in viewBox px (default: 0.6)")
    args = p.parse_args()

    src = Path(args.in_geojson)
    if not src.exists():
        print(f"error: {src} missing — run scripts/fetch_uk_geo.py first", file=sys.stderr)
        return 2
    out_p = Path(args.out)
    out_p.parent.mkdir(parents=True, exist_ok=True)

    body = json.loads(src.read_text(encoding="utf-8"))
    features = body.get("features", [])
    if not features:
        print("error: no features in GeoJSON", file=sys.stderr)
        return 1

    lon_min, lat_min, lon_max, lat_max = _bounds(features)
    project, _ = _make_projector(lon_min, lat_min, lon_max, lat_max)
    tol_sq = args.tolerance * args.tolerance

    rows = []
    for f in features:
        props = f.get("properties") or {}
        code = props.get("LAD24CD") or ""
        name = props.get("LAD24NM") or ""
        d = _geometry_to_d(f.get("geometry") or {}, project, tol_sq)
        if not code or not d:
            continue
        rows.append({
            "code": code,
            "name": name,
            "country": _country_for(code),
            "d": d,
        })
    rows.sort(key=lambda r: r["code"])

    meta = {
        "generatedAt": dt.datetime.now(dt.timezone.utc).isoformat(),
        "source": "ONS Open Geography Portal — LAD May 2024 BUC",
        "boundsLonLat": {"lon_min": round(lon_min, 4), "lat_min": round(lat_min, 4),
                         "lon_max": round(lon_max, 4), "lat_max": round(lat_max, 4)},
        "viewBox": {"w": VIEW_W, "h": VIEW_H, "pad": PAD},
        "simplifyTolerance": args.tolerance,
        "ladCount": len(rows),
        "licence": "Open Government Licence v3.0",
    }
    js = (
        "/* AUTO-GENERATED by scripts/build_uk_map.py. Do not edit. */\n"
        f"window.UK_LAD_MAP = {json.dumps(rows, ensure_ascii=False)};\n"
        f"window.UK_MAP_META = {json.dumps(meta, ensure_ascii=False)};\n"
    )
    out_p.write_text(js, encoding="utf-8")
    size_kb = out_p.stat().st_size / 1024
    print(f"wrote {out_p}  ({len(rows)} LADs, {size_kb:.1f} KB, tol={args.tolerance})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
