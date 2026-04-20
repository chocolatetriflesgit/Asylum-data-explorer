"""Integrity tests for NAT_FULL, NAT_QUARTERLY, and HOTELS data files.

Each test is a read-only invariant on the generated `data/*-data.js`; all tests
skip gracefully if the file hasn't been generated yet, matching the pattern in
`test_data_integrity.py`.
"""
from __future__ import annotations

import datetime as dt
import json
import re
import warnings
from pathlib import Path

import pytest


ROOT = Path(__file__).resolve().parents[1]

# Gov.uk xlsx filenames carry a release-month suffix, e.g.
# `asylum-claims-datasets-dec-2025.xlsx`. Soft-warning threshold for
# quarterly publications is 60 days (vs 14 for the weekly boats ODS).
_SOURCE_MONTH_RE = re.compile(r"(?i)-([a-z]+)-(\d{4})(?=\.xlsx$)")
_MONTHS = ["jan", "feb", "mar", "apr", "may", "jun",
           "jul", "aug", "sep", "oct", "nov", "dec"]
_SOURCE_STALE_DAYS = 60


def _warn_if_source_stale(source_filename: str, label: str) -> None:
    """Soft-warn (never fail) if the source xlsx is more than 60 days behind.

    Matches the pattern used in test_data_integrity.py for the weekly boats
    ODS — quarterly publications shouldn't drift more than one release late.
    """
    m = _SOURCE_MONTH_RE.search(source_filename)
    if not m:
        warnings.warn(
            f"{label}: could not parse release month from {source_filename!r}",
            stacklevel=2,
        )
        return
    month_name = m.group(1).lower()[:3]
    if month_name not in _MONTHS:
        return
    release = dt.date(int(m.group(2)), _MONTHS.index(month_name) + 1, 1)
    age = (dt.date.today() - release).days
    if age > _SOURCE_STALE_DAYS:
        warnings.warn(
            f"{label}: source {source_filename} is {age} days old — "
            "has the fetcher stalled or the publication slipped?",
            stacklevel=2,
        )


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


def test_nat_full_source_is_fresh():
    """Soft warning, not failure."""
    g = _load_globals(NAT_FULL_JS)
    _warn_if_source_stale(g["NAT_FULL_META"]["source"], "NAT_FULL")


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


def test_nat_quarterly_source_is_fresh():
    """Soft warning, not failure."""
    g = _load_globals(NAT_QUARTERLY_JS)
    _warn_if_source_stale(g["NAT_QUARTERLY_META"]["source"], "NAT_QUARTERLY")


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


def test_hotels_source_is_fresh():
    """Soft warning, not failure."""
    g = _load_globals(HOTELS_JS)
    _warn_if_source_stale(g["HOTELS_META"]["source"], "HOTELS")


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


def test_resettlement_source_is_fresh():
    """Soft warning, not failure."""
    g = _load_globals(RESETTLEMENT_JS)
    _warn_if_source_stale(g["RESETTLEMENT_META"]["source"], "RESETTLEMENT")


# ---------------------------------------------------------------------------
# RETURNS_BY_NATIONALITY
# ---------------------------------------------------------------------------

RETURNS_JS = ROOT / "data" / "returns-data.js"


def test_returns_non_empty_and_sorted():
    g = _load_globals(RETURNS_JS)
    rows = g["RETURNS_BY_NATIONALITY"]
    assert len(rows) > 0
    totals = [r["total"] for r in rows]
    assert totals == sorted(totals, reverse=True), "RETURNS not sorted by total desc"


def test_returns_shape_and_nonneg():
    g = _load_globals(RETURNS_JS)
    for r in g["RETURNS_BY_NATIONALITY"]:
        assert set(r.keys()) == {"name", "region", "enforced", "voluntary", "refused", "total"}, r
        assert isinstance(r["name"], str) and r["name"]
        assert isinstance(r["region"], str) and r["region"]
        for k in ("enforced", "voluntary", "refused", "total"):
            assert isinstance(r[k], int) and r[k] >= 0
        assert r["total"] == r["enforced"] + r["voluntary"] + r["refused"], r


def test_returns_meta_year_is_plausible():
    g = _load_globals(RETURNS_JS)
    year = g["RETURNS_META"]["year"]
    assert 2015 <= year <= dt.date.today().year


def test_returns_source_is_fresh():
    """Soft warning, not failure."""
    g = _load_globals(RETURNS_JS)
    _warn_if_source_stale(g["RETURNS_META"]["source"], "RETURNS")


# ---------------------------------------------------------------------------
# AGE_DISPUTES_BY_NATIONALITY
# ---------------------------------------------------------------------------

AGE_DISPUTES_JS = ROOT / "data" / "age-disputes-data.js"


def test_age_disputes_non_empty_and_sorted_by_raised():
    g = _load_globals(AGE_DISPUTES_JS)
    rows = g["AGE_DISPUTES_BY_NATIONALITY"]
    assert len(rows) > 0
    raised = [r["raised"] for r in rows]
    assert raised == sorted(raised, reverse=True), "AGE_DISPUTES not sorted by raised desc"


def test_age_disputes_shape_and_nonneg():
    g = _load_globals(AGE_DISPUTES_JS)
    for r in g["AGE_DISPUTES_BY_NATIONALITY"]:
        assert set(r.keys()) == {"name", "region", "raised", "resolved_over_18", "resolved_under_18"}, r
        assert isinstance(r["name"], str) and r["name"]
        assert isinstance(r["region"], str) and r["region"]
        for k in ("raised", "resolved_over_18", "resolved_under_18"):
            assert isinstance(r[k], int) and r[k] >= 0
        assert r["raised"] + r["resolved_over_18"] + r["resolved_under_18"] > 0


def test_age_disputes_meta_year_is_plausible():
    g = _load_globals(AGE_DISPUTES_JS)
    year = g["AGE_DISPUTES_META"]["year"]
    assert 2015 <= year <= dt.date.today().year


def test_age_disputes_source_is_fresh():
    """Soft warning, not failure."""
    g = _load_globals(AGE_DISPUTES_JS)
    _warn_if_source_stale(g["AGE_DISPUTES_META"]["source"], "AGE_DISPUTES")


# ---------------------------------------------------------------------------
# DECISIONS_LATEST
# ---------------------------------------------------------------------------

DECISIONS_JS = ROOT / "data" / "decisions-data.js"


def test_decisions_exactly_four_rows():
    rows = _load_globals(DECISIONS_JS)["DECISIONS_LATEST"]
    assert len(rows) == 4


def test_decisions_shape_and_nonneg():
    for r in _load_globals(DECISIONS_JS)["DECISIONS_LATEST"]:
        assert set(r.keys()) == {"label", "v", "color"}, r
        assert isinstance(r["label"], str) and r["label"]
        assert isinstance(r["v"], int) and r["v"] >= 0
        assert r["color"].startswith("var(")


def test_decisions_total_is_positive():
    rows = _load_globals(DECISIONS_JS)["DECISIONS_LATEST"]
    assert sum(r["v"] for r in rows) > 0


def test_decisions_meta_year_is_plausible():
    year = _load_globals(DECISIONS_JS)["DECISIONS_META"]["year"]
    assert 2015 <= year <= dt.date.today().year


def test_decisions_source_is_fresh():
    """Soft warning, not failure."""
    _warn_if_source_stale(_load_globals(DECISIONS_JS)["DECISIONS_META"]["source"], "DECISIONS")


# ---------------------------------------------------------------------------
# NAT_SERIES_LATEST
# ---------------------------------------------------------------------------

NAT_SERIES_JS = ROOT / "data" / "nat-series-data.js"
_NAT_SERIES_TRACKED = ["Pakistan", "Afghanistan", "Iran", "Eritrea", "Syria"]


def test_nat_series_shape():
    g = _load_globals(NAT_SERIES_JS)
    payload = g["NAT_SERIES_LATEST"]
    assert set(payload.keys()) == {"years", "series"}
    assert len(payload["series"]) == 5
    assert [s["name"] for s in payload["series"]] == _NAT_SERIES_TRACKED
    for s in payload["series"]:
        assert len(s["data"]) == len(payload["years"])
        assert all(isinstance(v, int) and v >= 0 for v in s["data"])


def test_nat_series_years_start_at_2020():
    years = _load_globals(NAT_SERIES_JS)["NAT_SERIES_LATEST"]["years"]
    assert years[0] == 2020
    assert years == sorted(years)


def test_nat_series_meta_year_range():
    meta = _load_globals(NAT_SERIES_JS)["NAT_SERIES_META"]
    assert meta["year_start"] == 2020
    assert 2020 <= meta["year_end"] <= dt.date.today().year


def test_nat_series_source_is_fresh():
    """Soft warning, not failure."""
    _warn_if_source_stale(_load_globals(NAT_SERIES_JS)["NAT_SERIES_META"]["source"], "NAT_SERIES")


# ---------------------------------------------------------------------------
# BACKLOG_LATEST
# ---------------------------------------------------------------------------

BACKLOG_JS = ROOT / "data" / "backlog-data.js"


def test_backlog_non_empty_and_sorted():
    rows = _load_globals(BACKLOG_JS)["BACKLOG_LATEST"]
    assert len(rows) > 0
    years = [r["y"] for r in rows]
    assert years == sorted(years)


def test_backlog_shape_and_positive():
    for r in _load_globals(BACKLOG_JS)["BACKLOG_LATEST"]:
        assert set(r.keys()) == {"y", "v", "date"}, r
        assert isinstance(r["y"], int) and 2018 <= r["y"] <= dt.date.today().year
        assert isinstance(r["v"], int) and r["v"] > 0
        assert isinstance(r["date"], str) and r["date"]


def test_backlog_meta_matches_latest_row():
    g = _load_globals(BACKLOG_JS)
    rows = g["BACKLOG_LATEST"]
    meta = g["BACKLOG_META"]
    assert meta["latest_year"] == rows[-1]["y"]
    assert meta["series_start"] == 2018


def test_backlog_source_is_fresh():
    """Soft warning, not failure."""
    _warn_if_source_stale(_load_globals(BACKLOG_JS)["BACKLOG_META"]["source"], "BACKLOG")


# ---------------------------------------------------------------------------
# SUPPORT_REGIONS
# ---------------------------------------------------------------------------

SUPPORT_REGIONS_JS = ROOT / "data" / "support-regions-data.js"


def test_support_regions_non_empty_and_sorted():
    rows = _load_globals(SUPPORT_REGIONS_JS)["SUPPORT_REGIONS"]
    assert len(rows) > 0
    values = [r["v"] for r in rows]
    assert values == sorted(values, reverse=True)


def test_support_regions_shape_and_positive():
    for r in _load_globals(SUPPORT_REGIONS_JS)["SUPPORT_REGIONS"]:
        assert set(r.keys()) == {"name", "v"}, r
        assert isinstance(r["name"], str) and r["name"]
        assert isinstance(r["v"], int) and r["v"] > 0


def test_support_regions_no_excluded_names():
    rows = _load_globals(SUPPORT_REGIONS_JS)["SUPPORT_REGIONS"]
    names = {r["name"] for r in rows}
    assert "Unknown" not in names
    assert not any(n.startswith("N/A") for n in names)


def test_support_regions_meta_date_is_present():
    meta = _load_globals(SUPPORT_REGIONS_JS)["SUPPORT_REGIONS_META"]
    assert isinstance(meta["date"], str) and meta["date"]


def test_support_regions_source_is_fresh():
    """Soft warning, not failure."""
    _warn_if_source_stale(
        _load_globals(SUPPORT_REGIONS_JS)["SUPPORT_REGIONS_META"]["source"],
        "SUPPORT_REGIONS",
    )
