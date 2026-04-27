"""Integrity tests for COUNTRY_CONTEXT.

The country-context global joins four annual external sources by ISO3
(Freedom House, UCDP, UNHCR, World Bank). Tests below pin the shape
of each entry and a couple of value-range invariants. They skip
cleanly if the data file hasn't been generated.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

import pytest


ROOT = Path(__file__).resolve().parents[1]
DATA_JS = ROOT / "data" / "country-context-data.js"

VALID_STATUS = {"Free", "Partly Free", "Not Free"}


def _load_globals(path: Path) -> dict:
    if not path.exists():
        pytest.skip(f"{path.name} not generated — run scripts/build_country_context.py")
    text = path.read_text(encoding="utf-8")
    out: dict = {}
    for m in re.finditer(r"window\.(\w+)\s*=\s*(.+?);\s*$", text, re.MULTILINE):
        out[m.group(1)] = json.loads(m.group(2))
    return out


def test_country_context_keyed_by_iso3():
    g = _load_globals(DATA_JS)
    ctx = g["COUNTRY_CONTEXT"]
    assert len(ctx) > 50, "expected many countries"
    for iso in ctx:
        assert isinstance(iso, str) and len(iso) == 3 and iso.isalpha() and iso.isupper(), iso


def test_country_context_entries_have_at_least_one_source():
    g = _load_globals(DATA_JS)
    ctx = g["COUNTRY_CONTEXT"]
    KNOWN = {"freedomHouse", "ucdp", "unhcr", "gdpPerCapitaPPP"}
    for iso, entry in ctx.items():
        # Every entry must carry at least one recognised source.
        assert KNOWN & set(entry.keys()), f"{iso} has no recognised source: {entry}"


def test_country_context_freedom_house_shape():
    g = _load_globals(DATA_JS)
    ctx = g["COUNTRY_CONTEXT"]
    for iso, entry in ctx.items():
        fh = entry.get("freedomHouse")
        if fh is None:
            continue
        assert fh["status"] in VALID_STATUS, f"{iso}: bad FH status {fh['status']!r}"
        if fh.get("score") is not None:
            assert 0 <= fh["score"] <= 100, f"{iso}: FH score out of range"
        assert 2010 <= fh["year"] <= 2100, f"{iso}: implausible FH year"


def test_country_context_gdp_shape():
    g = _load_globals(DATA_JS)
    ctx = g["COUNTRY_CONTEXT"]
    for iso, entry in ctx.items():
        gdp = entry.get("gdpPerCapitaPPP")
        if gdp is None:
            continue
        assert isinstance(gdp["value"], (int, float)) and gdp["value"] > 0
        assert 1990 <= gdp["year"] <= 2100


def test_country_context_unhcr_totals_non_negative():
    g = _load_globals(DATA_JS)
    ctx = g["COUNTRY_CONTEXT"]
    for iso, entry in ctx.items():
        u = entry.get("unhcr")
        if u is None:
            continue
        for k in ("total", "refugees", "asylum_seekers", "idps"):
            assert u[k] >= 0, f"{iso}: UNHCR {k} negative"
        assert 2000 <= u["year"] <= 2100


def test_country_context_meta_lists_used_sources():
    g = _load_globals(DATA_JS)
    meta = g["COUNTRY_CONTEXT_META"]
    assert isinstance(meta.get("sources"), list)
    assert meta.get("countryCount") == len(g["COUNTRY_CONTEXT"])


def test_country_context_well_known_iso_present():
    """A couple of major origin countries should resolve.

    Pakistan and Afghanistan are both top-three asylum-claim origins for the
    UK in the modern series; if they've gone missing something has broken
    in the ISO3 mapping.
    """
    g = _load_globals(DATA_JS)
    ctx = g["COUNTRY_CONTEXT"]
    for iso in ("PAK", "AFG"):
        assert iso in ctx, f"{iso} missing from COUNTRY_CONTEXT"
