"""Data integrity tests.

Two layers:
  1. Pure-function tests of the transforms in `build_boats_data.py` using
     tiny synthetic fixtures. These run in any environment.
  2. End-to-end invariants read from `data/boats-data.js` if present.
     Skipped if the data module hasn't been generated yet.
"""
from __future__ import annotations

import datetime as dt
import json
import re
import warnings
from pathlib import Path

import pytest

import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import build_boats_data as bbd  # noqa: E402


# ---------------------------------------------------------------------------
# Unit-level invariants on the transforms
# ---------------------------------------------------------------------------

def _daily_fixture() -> list[dict]:
    """Two small years of dense daily data."""
    out = []
    for year in (2018, 2019):
        d = dt.date(year, 1, 1)
        while d.year == year:
            out.append({"d": d.isoformat(), "m": (d.toordinal() % 10), "b": 1})
            d += dt.timedelta(days=1)
    return out


def test_annual_totals_match_daily_sum():
    daily = _daily_fixture()
    annual = bbd.build_annual(daily)
    for row in annual:
        y = row["y"]
        expected = sum(r["m"] for r in daily if r["d"].startswith(str(y)))
        assert row["m"] == expected, f"annual mismatch for {y}"


def test_yoy_arrays_are_length_366():
    daily = _daily_fixture()
    yoy = bbd.build_yoy(daily)
    for year, arr in yoy.items():
        assert len(arr) == 366, f"YOY for {year} not length 366"


def test_yoy_latest_year_has_trailing_nulls():
    """The latest year's array must go to None past the latest data point."""
    daily = _daily_fixture()
    latest = max(daily, key=lambda r: r["d"])["d"]
    latest_date = dt.date.fromisoformat(latest)
    yoy = bbd.build_yoy(daily)
    arr = yoy[str(latest_date.year)]
    doy_index = (latest_date - dt.date(latest_date.year, 1, 1)).days
    assert arr[doy_index] is not None
    if doy_index < 365:
        assert arr[doy_index + 1] is None


def test_records_total_matches_daily_sum():
    daily = _daily_fixture()
    weekly: list[dict] = []
    monthly = bbd.build_monthly(daily)
    records = bbd.build_records(daily, weekly, monthly)
    assert records["totalMigrants"] == sum(r["m"] for r in daily)
    assert records["totalBoats"] == sum(r["b"] for r in daily)


def test_coerce_int_handles_placeholders():
    assert bbd._coerce_int("-") is None
    assert bbd._coerce_int("—") is None
    assert bbd._coerce_int("") is None
    assert bbd._coerce_int(None) is None
    assert bbd._coerce_int("1,234") == 1234
    assert bbd._coerce_int(42.0) == 42


# ---------------------------------------------------------------------------
# End-to-end invariants against a generated boats-data.js
# ---------------------------------------------------------------------------

DATA_JS = ROOT / "data" / "boats-data.js"


def _load_generated() -> dict:
    if not DATA_JS.exists():
        pytest.skip(
            "data/boats-data.js not generated — run "
            "scripts/build_boats_data.py first"
        )
    text = DATA_JS.read_text(encoding="utf-8")
    out: dict = {}
    for m in re.finditer(r"window\.(\w+)\s*=\s*(.+?);\s*$", text, re.MULTILINE):
        out[m.group(1)] = json.loads(m.group(2))
    return out


def test_generated_annual_equals_daily_sum():
    data = _load_generated()
    for row in data["BOATS_ANNUAL"]:
        y = row["y"]
        expected = sum(r["m"] for r in data["BOATS_DAILY"] if r["d"].startswith(str(y)))
        assert row["m"] == expected, f"annual mismatch for {y}"


def test_generated_weekly_ends_on_saturday():
    data = _load_generated()
    for row in data["BOATS_WEEKLY"]:
        d = dt.date.fromisoformat(row["we"])
        assert d.weekday() == 5, f"week ending {row['we']} is not a Saturday"


def test_generated_no_date_gaps_in_daily():
    data = _load_generated()
    daily = sorted(data["BOATS_DAILY"], key=lambda r: r["d"])
    prev = dt.date.fromisoformat(daily[0]["d"])
    for row in daily[1:]:
        cur = dt.date.fromisoformat(row["d"])
        assert (cur - prev).days == 1, f"date gap between {prev} and {cur}"
        prev = cur


def test_generated_records_total_matches_daily_sum():
    data = _load_generated()
    total = sum(r["m"] for r in data["BOATS_DAILY"])
    assert data["BOATS_RECORDS"]["totalMigrants"] == total


def test_generated_latest_data_point_is_fresh():
    """Warning, not failure, per CLAUDE.md § Testing."""
    data = _load_generated()
    latest = dt.date.fromisoformat(data["BOATS_META"]["latestDataPoint"])
    age = (dt.date.today() - latest).days
    if age > 14:
        warnings.warn(
            f"latest data point is {age} days old — pipeline stale?",
            stacklevel=2,
        )
