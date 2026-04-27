"""Integrity tests for the UK-atlas data files.

Two generated globals are checked here:

- UK_LAD_MAP             — LAD geometry (build_uk_map.py)
- SUPPORT_LA_LATEST /    — supported asylum seekers per LAD
  SUPPORT_LA_QUARTERLY     (build_support_la.py)

Tests skip gracefully if the data file hasn't been built yet, matching
the pattern used elsewhere in the test suite.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

import pytest


ROOT = Path(__file__).resolve().parents[1]
UK_MAP_JS = ROOT / "data" / "uk-map-data.js"
SUPPORT_LA_JS = ROOT / "data" / "support-la-data.js"

LAD_CODE_RE = re.compile(r"^[EWSN]\d{8}$")


def _load_globals(path: Path) -> dict:
    if not path.exists():
        pytest.skip(f"{path.name} not generated")
    text = path.read_text(encoding="utf-8")
    out: dict = {}
    for m in re.finditer(r"window\.(\w+)\s*=\s*(.+?);\s*$", text, re.MULTILINE):
        out[m.group(1)] = json.loads(m.group(2))
    return out


# ---------------------------------------------------------------------------
# UK_LAD_MAP
# ---------------------------------------------------------------------------

def test_uk_lad_map_shape():
    g = _load_globals(UK_MAP_JS)
    rows = g["UK_LAD_MAP"]
    assert len(rows) > 300, f"expected ~360 LADs, got {len(rows)}"
    seen_codes = set()
    for r in rows:
        assert set(r.keys()) == {"code", "name", "country", "d"}, r.keys()
        assert LAD_CODE_RE.match(r["code"]), f"bad LAD code: {r['code']!r}"
        assert r["code"] not in seen_codes, f"duplicate code: {r['code']}"
        seen_codes.add(r["code"])
        assert r["name"] and isinstance(r["name"], str)
        assert r["country"] in {"England", "Wales", "Scotland", "Northern Ireland"}
        # Path string must start with M and contain at least one drawing command.
        assert r["d"].startswith("M") and ("L" in r["d"] or "Z" in r["d"]), r["d"][:40]


def test_uk_map_meta_consistent():
    g = _load_globals(UK_MAP_JS)
    meta = g["UK_MAP_META"]
    assert meta["ladCount"] == len(g["UK_LAD_MAP"])
    assert meta["viewBox"]["w"] > 0 and meta["viewBox"]["h"] > 0


# ---------------------------------------------------------------------------
# SUPPORT_LA_LATEST + SUPPORT_LA_QUARTERLY
# ---------------------------------------------------------------------------

def test_support_la_latest_shape():
    g = _load_globals(SUPPORT_LA_JS)
    rows = g["SUPPORT_LA_LATEST"]
    assert len(rows) > 200, f"expected most LADs to be present, got {len(rows)}"
    expected_keys = {"code", "name", "region", "country", "total", "s95", "s98", "s4"}
    seen = set()
    for r in rows:
        assert set(r.keys()) == expected_keys, set(r.keys())
        assert LAD_CODE_RE.match(r["code"]), r["code"]
        assert r["code"] not in seen
        seen.add(r["code"])
        assert isinstance(r["name"], str) and r["name"]
        assert r["country"] in {"England", "Wales", "Scotland", "Northern Ireland"}
        assert r["total"] >= 0 and r["s95"] >= 0 and r["s98"] >= 0 and r["s4"] >= 0
        assert r["s95"] + r["s98"] + r["s4"] == r["total"], (
            f"{r['code']}: tier sum != total ({r['s95']} + {r['s98']} + {r['s4']} != {r['total']})"
        )


def test_support_la_latest_sorted_desc():
    g = _load_globals(SUPPORT_LA_JS)
    rows = g["SUPPORT_LA_LATEST"]
    totals = [r["total"] for r in rows]
    assert totals == sorted(totals, reverse=True), "rows should be sorted by total desc"


def test_support_la_quarterly_compact():
    g = _load_globals(SUPPORT_LA_JS)
    q = g["SUPPORT_LA_QUARTERLY"]
    assert len(q) > 0
    expected = {"date", "code", "v"}
    for row in q:
        assert set(row.keys()) == expected
        assert isinstance(row["date"], str) and row["date"]
        assert LAD_CODE_RE.match(row["code"]), row["code"]
        assert isinstance(row["v"], int) and row["v"] > 0


def test_support_la_meta_consistent():
    g = _load_globals(SUPPORT_LA_JS)
    meta = g["SUPPORT_LA_META"]
    assert meta["ladCount"] == len(g["SUPPORT_LA_LATEST"])
    assert meta["snapshotsKept"] >= 1
    # Latest snapshot date in meta must match a date present in quarterly rows.
    q_dates = {r["date"] for r in g["SUPPORT_LA_QUARTERLY"]}
    assert meta["latestKept"] in q_dates


def test_support_la_codes_overlap_with_uk_map():
    """Every LAD in the support data should resolve to a geometry on the map.

    The map carries the canonical LAD24 set; some LADs may carry zero
    supported people and thus be absent from SUPPORT_LA_LATEST, but the
    reverse should never happen.
    """
    map_g = _load_globals(UK_MAP_JS)
    sup_g = _load_globals(SUPPORT_LA_JS)
    map_codes = {r["code"] for r in map_g["UK_LAD_MAP"]}
    sup_codes = {r["code"] for r in sup_g["SUPPORT_LA_LATEST"]}
    missing = sup_codes - map_codes
    # Allow up to a handful of missing matches — boundary changes between
    # data-snapshot and geometry-snapshot can leave a few unmatched codes.
    assert len(missing) <= 8, f"too many support codes missing from map: {sorted(missing)}"
