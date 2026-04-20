"""Integrity tests for BOATS_PROVISIONAL / BOATS_PROVISIONAL_META."""
from __future__ import annotations

import datetime as dt
import json
import re
import warnings
from pathlib import Path

import pytest


ROOT = Path(__file__).resolve().parents[1]
PROVISIONAL_JS = ROOT / "data" / "provisional-data.js"


def _load_globals(path: Path) -> dict:
    if not path.exists():
        pytest.skip(f"{path.name} not generated")
    text = path.read_text(encoding="utf-8")
    out: dict = {}
    for m in re.finditer(r"window\.(\w+)\s*=\s*(.+?);\s*$", text, re.MULTILINE):
        out[m.group(1)] = json.loads(m.group(2))
    return out


def test_provisional_exactly_seven_rows():
    g = _load_globals(PROVISIONAL_JS)
    rows = g["BOATS_PROVISIONAL"]
    assert len(rows) == 7, f"expected 7 rows, got {len(rows)}"


def test_provisional_row_shape():
    g = _load_globals(PROVISIONAL_JS)
    for r in g["BOATS_PROVISIONAL"]:
        assert set(r.keys()) == {"d", "m", "b", "u"}, r
        dt.date.fromisoformat(r["d"])  # raises on bad date
        for k in ("m", "b", "u"):
            assert isinstance(r[k], int) and r[k] >= 0, (k, r)


def test_provisional_dates_are_consecutive():
    g = _load_globals(PROVISIONAL_JS)
    rows = g["BOATS_PROVISIONAL"]
    dates = [dt.date.fromisoformat(r["d"]) for r in rows]
    for i in range(1, len(dates)):
        assert (dates[i] - dates[i - 1]).days == 1, (
            f"gap between {dates[i - 1]} and {dates[i]}"
        )


def test_provisional_meta_shape():
    g = _load_globals(PROVISIONAL_JS)
    meta = g["BOATS_PROVISIONAL_META"]
    for key in ("fetchedAt", "source", "sourceUrl", "firstDate", "latestDate"):
        assert key in meta, f"missing META key: {key!r}"
    assert meta["firstDate"] == g["BOATS_PROVISIONAL"][0]["d"]
    assert meta["latestDate"] == g["BOATS_PROVISIONAL"][-1]["d"]


def test_provisional_updated_at_is_fresh():
    """Soft warning, not failure — the page is published daily."""
    g = _load_globals(PROVISIONAL_JS)
    updated_at = g["BOATS_PROVISIONAL_META"].get("updatedAt")
    if not updated_at:
        warnings.warn(
            "BOATS_PROVISIONAL_META.updatedAt is missing — could not parse "
            "the 'Updated DD Month YYYY' caption.",
            stacklevel=2,
        )
        return
    age = (dt.date.today() - dt.date.fromisoformat(updated_at)).days
    if age > 2:
        warnings.warn(
            f"BOATS_PROVISIONAL.updatedAt is {age} days old - "
            "last-7-days page may be stale or the daily fetcher stalled.",
            stacklevel=2,
        )
