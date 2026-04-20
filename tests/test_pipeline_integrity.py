"""Integrity tests for NAT_FULL, NAT_QUARTERLY, and HOTELS data files.

Each test is a read-only invariant on the generated `data/*-data.js`; all tests
skip gracefully if the file hasn't been generated yet, matching the pattern in
`test_data_integrity.py`.
"""
from __future__ import annotations

import datetime as dt
import json
import re
from pathlib import Path

import pytest


ROOT = Path(__file__).resolve().parents[1]


def _load_globals(path: Path) -> dict:
    if not path.exists():
        pytest.skip(f"{path.name} not generated")
    text = path.read_text(encoding="utf-8")
    out: dict = {}
    for m in re.finditer(r"window\.(\w+)\s*=\s*(.+?);\s*$", text, re.MULTILINE):
        out[m.group(1)] = json.loads(m.group(2))
    return out


# ---------------------------------------------------------------------------
# NAT_FULL
# ---------------------------------------------------------------------------

NAT_FULL_JS = ROOT / "data" / "nat-full-data.js"


def test_nat_full_non_empty_and_sorted():
    g = _load_globals(NAT_FULL_JS)
    rows = g["NAT_FULL"]
    assert len(rows) > 0
    values = [r["v"] for r in rows]
    assert values == sorted(values, reverse=True), "NAT_FULL not sorted by v desc"


def test_nat_full_shape_and_grant_range():
    g = _load_globals(NAT_FULL_JS)
    for r in g["NAT_FULL"]:
        assert set(r.keys()) == {"name", "v", "grant"}, r
        assert isinstance(r["name"], str) and r["name"]
        assert isinstance(r["v"], int) and r["v"] > 0
        assert r["grant"] is None or (0.0 <= r["grant"] <= 1.0)


def test_nat_full_meta_year_is_plausible():
    g = _load_globals(NAT_FULL_JS)
    year = g["NAT_FULL_META"]["year"]
    assert 2010 <= year <= dt.date.today().year


# ---------------------------------------------------------------------------
# NAT_QUARTERLY
# ---------------------------------------------------------------------------

NAT_QUARTERLY_JS = ROOT / "data" / "nat-quarterly-data.js"

_QUARTER_RE = re.compile(r"^\d{4} Q[1-4]$")


def test_nat_quarterly_shape():
    g = _load_globals(NAT_QUARTERLY_JS)
    payload = g["NAT_QUARTERLY"]
    quarters = payload["quarters"]
    series = payload["series"]
    assert len(quarters) == 8, f"expected 8 quarters, got {len(quarters)}"
    for q in quarters:
        assert _QUARTER_RE.match(q), f"bad quarter label: {q}"
    assert len(series) > 0
    for s in series:
        assert set(s.keys()) == {"name", "data"}
        assert len(s["data"]) == len(quarters), f"{s['name']} data length mismatch"
        assert all(isinstance(v, int) and v >= 0 for v in s["data"])


def test_nat_quarterly_quarters_are_chronological():
    g = _load_globals(NAT_QUARTERLY_JS)
    quarters = g["NAT_QUARTERLY"]["quarters"]

    def key(q: str) -> tuple[int, int]:
        y, n = q.split(" Q")
        return int(y), int(n)

    assert quarters == sorted(quarters, key=key), "quarters not chronological"


def test_nat_quarterly_series_ranked_by_total():
    g = _load_globals(NAT_QUARTERLY_JS)
    series = g["NAT_QUARTERLY"]["series"]
    totals = [sum(s["data"]) for s in series]
    assert totals == sorted(totals, reverse=True), "series not ranked by total desc"


# ---------------------------------------------------------------------------
# HOTELS
# ---------------------------------------------------------------------------

HOTELS_JS = ROOT / "data" / "hotels-data.js"


def test_hotels_non_empty_sorted_ascending():
    g = _load_globals(HOTELS_JS)
    rows = g["HOTELS"]
    assert len(rows) > 0
    dates = [r["date"] for r in rows]
    assert dates == sorted(dates), "HOTELS not sorted by date ascending"


def test_hotels_shape_and_positive_counts():
    g = _load_globals(HOTELS_JS)
    for r in g["HOTELS"]:
        assert set(r.keys()) == {"date", "persons_in_hotels"}
        dt.date.fromisoformat(r["date"])  # raises if malformed
        assert isinstance(r["persons_in_hotels"], int) and r["persons_in_hotels"] > 0


def test_hotels_meta_accommodation_type():
    g = _load_globals(HOTELS_JS)
    assert g["HOTELS_META"]["accommodationType"] == "Contingency Accommodation - Hotel"


# ---------------------------------------------------------------------------
# RESETTLEMENT_SERIES
# ---------------------------------------------------------------------------

RESETTLEMENT_JS = ROOT / "data" / "resettlement-data.js"


def test_resettlement_shape_and_years():
    g = _load_globals(RESETTLEMENT_JS)
    rows = g["RESETTLEMENT_SERIES"]
    years = g["RESETTLEMENT_META"]["years"]
    assert len(rows) > 0
    assert len(years) == 3
    for r in rows:
        assert "name" in r and isinstance(r["name"], str)
        for y in years:
            key = str(y) if str(y) in r else y
            assert key in r, f"{r['name']} missing year {y}"
            assert isinstance(r[key], int) and r[key] >= 0


def test_resettlement_nonzero_totals():
    """Every emitted scheme must have at least one non-zero year."""
    g = _load_globals(RESETTLEMENT_JS)
    years = g["RESETTLEMENT_META"]["years"]
    for r in g["RESETTLEMENT_SERIES"]:
        total = sum(r[str(y)] for y in years)
        assert total > 0, f"scheme {r['name']} has all-zero totals"
