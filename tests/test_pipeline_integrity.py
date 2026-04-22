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


def test_support_tiers_latest_shape_and_sum():
    g = _load_globals(SUPPORT_REGIONS_JS)
    tiers = g["SUPPORT_TIERS_LATEST"]
    assert set(tiers.keys()) >= {"date", "s95", "s98", "s4", "total"}
    assert all(isinstance(tiers[k], int) for k in ("s95", "s98", "s4", "total"))
    assert tiers["s95"] + tiers["s98"] + tiers["s4"] == tiers["total"]


def test_support_tiers_total_matches_regional_sum():
    """By construction, S95 + S98 + S4 must equal the region sum for the
    latest snapshot — the two views sum the same People column over the same
    date, just grouped differently."""
    g = _load_globals(SUPPORT_REGIONS_JS)
    tiers = g["SUPPORT_TIERS_LATEST"]
    regional_sum = sum(r["v"] for r in g["SUPPORT_REGIONS"])
    assert tiers["total"] == regional_sum, (tiers["total"], regional_sum)


def test_support_tiers_annual_monotone_and_consistent():
    annual = _load_globals(SUPPORT_REGIONS_JS)["SUPPORT_TIERS_ANNUAL"]
    assert len(annual) > 0
    for r in annual:
        assert set(r.keys()) >= {"date", "s95", "s98", "s4", "total"}
        assert r["s95"] + r["s98"] + r["s4"] == r["total"]
    # latest entry in SUPPORT_TIERS_ANNUAL must match SUPPORT_TIERS_LATEST
    latest = _load_globals(SUPPORT_REGIONS_JS)["SUPPORT_TIERS_LATEST"]
    assert annual[-1] == latest


# ---------------------------------------------------------------------------
# ROUTE_OF_ENTRY_QUARTERLY
# ---------------------------------------------------------------------------

ROUTE_OF_ENTRY_JS = ROOT / "data" / "route-of-entry-data.js"

_ROUTE_GROUPS = {"Illegal Entry Routes", "Visas and Other Leave", "Other"}
_ROUTE_SUBS = {
    "Small Boat", "Clandestine", "Entered Without Relevant Documentation",
    "Study Visa", "Work Visa", "Visitor Visa", "Other Leave", "Other",
}


def test_route_of_entry_shape_and_labels():
    rows = _load_globals(ROUTE_OF_ENTRY_JS)["ROUTE_OF_ENTRY_QUARTERLY"]
    assert len(rows) > 0
    for r in rows:
        assert set(r.keys()) == {"q", "group", "sub", "v"}, r
        assert _QUARTER_RE.match(r["q"]), f"bad quarter: {r['q']}"
        assert r["group"] in _ROUTE_GROUPS, r
        assert r["sub"] in _ROUTE_SUBS, r
        assert isinstance(r["v"], int) and r["v"] > 0


def test_route_of_entry_is_chronological():
    rows = _load_globals(ROUTE_OF_ENTRY_JS)["ROUTE_OF_ENTRY_QUARTERLY"]

    def key(q: str) -> tuple[int, int]:
        y, n = q.split(" Q")
        return int(y), int(n)

    quarters = [r["q"] for r in rows]
    assert quarters == sorted(quarters, key=key), "route rows not sorted by quarter"


def test_route_of_entry_latest_year_has_four_quarters():
    g = _load_globals(ROUTE_OF_ENTRY_JS)
    rows = g["ROUTE_OF_ENTRY_QUARTERLY"]
    year = g["ROUTE_OF_ENTRY_META"]["year"]
    quarters_in_year = {r["q"] for r in rows if r["q"].startswith(f"{year} ")}
    assert quarters_in_year == {f"{year} Q1", f"{year} Q2", f"{year} Q3", f"{year} Q4"}


def test_route_of_entry_meta_year_is_plausible():
    year = _load_globals(ROUTE_OF_ENTRY_JS)["ROUTE_OF_ENTRY_META"]["year"]
    assert 2018 <= year <= dt.date.today().year


def test_route_of_entry_source_is_fresh():
    """Soft warning, not failure."""
    _warn_if_source_stale(
        _load_globals(ROUTE_OF_ENTRY_JS)["ROUTE_OF_ENTRY_META"]["source"],
        "ROUTE_OF_ENTRY",
    )


# ---------------------------------------------------------------------------
# OUTCOME_COHORT_ANNUAL (ASY_D04)
# ---------------------------------------------------------------------------

OUTCOME_COHORT_JS = ROOT / "data" / "outcome-cohort-data.js"

_OUTCOME_BUCKETS = ("protection", "otherLeave", "refusals",
                    "withdrawals", "admin", "notYet")


def test_outcome_cohort_shape_is_documented():
    """Shape check: rows carry year, nationality, claims, initial+latest
    buckets, and returns. Passes vacuously when the stub is empty."""
    g = _load_globals(OUTCOME_COHORT_JS)
    rows = g["OUTCOME_COHORT_ANNUAL"]
    if not rows:
        pytest.skip("OUTCOME_COHORT_ANNUAL is empty (ASY_D04 not yet ingested)")
    sample = rows[0]
    for key in ("year", "nationality", "claims", "initial", "returns", "latest"):
        assert key in sample, f"missing key {key!r} in OUTCOME_COHORT_ANNUAL row"
    for phase in ("initial", "latest"):
        for b in _OUTCOME_BUCKETS:
            assert b in sample[phase], f"missing {phase}.{b}"
    for k in ("enforced", "voluntary"):
        assert k in sample["returns"], f"missing returns.{k}"


def test_outcome_cohort_initial_sum_reconciles_with_claims():
    """For each cohort row, sum of initial splits (including notYet) must
    equal claims within ±1 (rounding slack). Skips when empty."""
    g = _load_globals(OUTCOME_COHORT_JS)
    rows = g["OUTCOME_COHORT_ANNUAL"]
    if not rows:
        pytest.skip("OUTCOME_COHORT_ANNUAL is empty (ASY_D04 not yet ingested)")
    mismatches = []
    for r in rows:
        s = sum(r["initial"].get(b, 0) for b in _OUTCOME_BUCKETS)
        if abs(s - r["claims"]) > 1:
            mismatches.append((r["year"], r["nationality"], r["claims"], s))
    assert not mismatches, (
        f"initial split sums disagree with claims on {len(mismatches)} rows; "
        f"first: {mismatches[:3]}"
    )


def test_outcome_cohort_latest_sum_does_not_exceed_claims():
    """Latest splits must not exceed claims (enforced + voluntary returns
    reduce the remaining population; they're counted separately)."""
    g = _load_globals(OUTCOME_COHORT_JS)
    rows = g["OUTCOME_COHORT_ANNUAL"]
    if not rows:
        pytest.skip("OUTCOME_COHORT_ANNUAL is empty (ASY_D04 not yet ingested)")
    offenders = []
    for r in rows:
        s = sum(r["latest"].get(b, 0) for b in _OUTCOME_BUCKETS)
        if s > r["claims"] + 1:  # ±1 rounding slack
            offenders.append((r["year"], r["nationality"], r["claims"], s))
    assert not offenders, (
        "latest split sums exceed claims on "
        f"{len(offenders)} rows; first: {offenders[:3]}"
    )


def test_outcome_cohort_meta_year_range():
    g = _load_globals(OUTCOME_COHORT_JS)
    meta = g["OUTCOME_COHORT_META"]
    yr = meta.get("yearRange")
    if not yr:  # None or empty → ingest hasn't run yet
        pytest.skip("yearRange not set (ASY_D04 not yet ingested)")
    assert isinstance(yr, list) and len(yr) == 2 and yr[0] <= yr[1]
    assert 2000 <= yr[0] <= dt.date.today().year


# ---------------------------------------------------------------------------
# UNHCR (POC + UK apps + UK decisions)
# ---------------------------------------------------------------------------

UNHCR_JS = ROOT / "data" / "unhcr-data.js"
UNHCR_POC_HEADLINE = ("refugees", "asylumSeekers", "idps", "oip", "stateless")


def test_unhcr_poc_row_shape():
    g = _load_globals(UNHCR_JS)
    rows = g["UNHCR_POC_ANNUAL"]
    if not rows:
        pytest.skip("UNHCR_POC_ANNUAL is empty (pipeline not yet run)")
    sample = rows[0]
    for k in ("year", "originIso", "originName", "total", *UNHCR_POC_HEADLINE):
        assert k in sample, f"missing UNHCR POC key {k!r}"
    assert isinstance(sample["originIso"], str) and len(sample["originIso"]) == 3


def test_unhcr_poc_totals_reconcile():
    """POC row ``total`` equals the sum of the five headline categories."""
    g = _load_globals(UNHCR_JS)
    rows = g["UNHCR_POC_ANNUAL"]
    if not rows:
        pytest.skip("UNHCR_POC_ANNUAL is empty (pipeline not yet run)")
    mismatches = []
    for r in rows:
        s = sum(r.get(k, 0) for k in UNHCR_POC_HEADLINE)
        if s != r["total"]:
            mismatches.append((r["year"], r["originIso"], s, r["total"]))
    assert not mismatches, f"POC total disagrees on {len(mismatches)} rows: {mismatches[:3]}"


def test_unhcr_uk_apps_shape():
    g = _load_globals(UNHCR_JS)
    rows = g["UNHCR_UK_APPS_ANNUAL"]
    if not rows:
        pytest.skip("UNHCR_UK_APPS_ANNUAL is empty (pipeline not yet run)")
    sample = rows[0]
    for k in ("year", "originIso", "originName", "applied"):
        assert k in sample
    assert all(r["applied"] >= 0 for r in rows)


def test_unhcr_uk_decisions_total_reconciles():
    """Decisions row total should equal the sum of recognized + other +
    rejected + closed within a 1-unit rounding slack."""
    g = _load_globals(UNHCR_JS)
    rows = g["UNHCR_UK_DECISIONS_ANNUAL"]
    if not rows:
        pytest.skip("UNHCR_UK_DECISIONS_ANNUAL is empty (pipeline not yet run)")
    offenders = []
    for r in rows:
        s = r.get("recognized", 0) + r.get("other", 0) + r.get("rejected", 0) + r.get("closed", 0)
        if abs(s - r["total"]) > 1:
            offenders.append((r["year"], r["originIso"], s, r["total"]))
    assert not offenders, f"decisions total disagrees on {len(offenders)} rows: {offenders[:3]}"


# ---------------------------------------------------------------------------
# IRR_BOATS_BY_NATIONALITY (Irregular migration — small-boat arrivals)
# ---------------------------------------------------------------------------

IRR_JS = ROOT / "data" / "irregular-data.js"


def test_irr_boats_row_shape():
    g = _load_globals(IRR_JS)
    rows = g["IRR_BOATS_BY_NATIONALITY"]
    if not rows:
        pytest.skip("IRR_BOATS_BY_NATIONALITY is empty (pipeline not yet run)")
    for r in rows:
        assert set(r.keys()) >= {"year", "nationality", "count", "partial"}, r
        assert isinstance(r["year"], int) and 2000 <= r["year"] <= 2100
        assert isinstance(r["nationality"], str) and r["nationality"]
        assert isinstance(r["count"], int) and r["count"] >= 0
        assert isinstance(r["partial"], bool)


def test_irr_boats_totals_reconcile_with_nationality_sum():
    """For each year, sum of per-nationality rows (excluding meta rows)
    should equal the explicit ``Total`` row within a small slack.

    ``All other nationalities`` is itself a real aggregate in the source
    so it counts in the per-nationality sum. ``Not currently recorded``
    is also included by Home Office in their Total."""
    g = _load_globals(IRR_JS)
    rows = g["IRR_BOATS_BY_NATIONALITY"]
    if not rows:
        pytest.skip("IRR_BOATS_BY_NATIONALITY is empty (pipeline not yet run)")
    by_year: dict[int, dict] = {}
    for r in rows:
        y = r["year"]
        d = by_year.setdefault(y, {"nat_sum": 0, "total": None})
        if r.get("meta") == "total":
            d["total"] = r["count"]
        elif not r.get("meta"):
            d["nat_sum"] += r["count"]
        else:
            # Other / unrecorded — already nationality-like aggregates kept
            # verbatim; include in sum to match Home Office totals.
            d["nat_sum"] += r["count"]
    offenders = []
    for y, d in by_year.items():
        if d["total"] is None:
            continue
        if abs(d["nat_sum"] - d["total"]) > 2:
            offenders.append((y, d["nat_sum"], d["total"]))
    assert not offenders, f"IRR year totals disagree: {offenders[:3]}"


def test_irr_boats_top5_matches_expected_nationalities():
    """Soft-check that the top five nationalities by latest full year are
    drawn from the expected irregular-migration cohort. The exact ranking
    varies release-to-release but the set is stable."""
    g = _load_globals(IRR_JS)
    rows = g["IRR_BOATS_BY_NATIONALITY"]
    if not rows:
        pytest.skip("IRR_BOATS_BY_NATIONALITY is empty (pipeline not yet run)")
    # Most recent fully non-partial year
    complete_years = sorted({r["year"] for r in rows if not r["partial"]})
    if not complete_years:
        pytest.skip("no complete years present")
    y = complete_years[-1]
    nats = sorted(
        [r for r in rows if r["year"] == y and not r.get("meta")],
        key=lambda r: -r["count"],
    )[:5]
    names = {r["nationality"] for r in nats}
    expected_pool = {
        "Afghanistan", "Eritrea", "Iran", "Iraq", "Syria", "Sudan",
        "Vietnam", "Albania", "Somalia", "Turkey", "Ethiopia", "Yemen",
    }
    overlap = names & expected_pool
    assert len(overlap) >= 3, (
        f"top-5 for {y} ({names}) has <3 overlap with expected set"
    )


def test_irr_boats_meta_year_range():
    g = _load_globals(IRR_JS)
    meta = g["IRR_BOATS_META"]
    yr = meta.get("yearRange")
    if not yr:
        pytest.skip("yearRange not set (IRR not yet ingested)")
    assert isinstance(yr, list) and len(yr) == 2 and yr[0] <= yr[1]
    assert 2000 <= yr[0] <= dt.date.today().year
