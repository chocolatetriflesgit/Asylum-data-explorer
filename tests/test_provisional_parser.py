"""Unit tests for the last-7-days HTML parser.

Covers the auto-correction path that snaps obvious HO year typos (e.g.
"20 April 2025" between 2026-04-19 and 2026-04-21) to the neighbour year,
and confirms that genuine shape changes still fail loud.
"""
from __future__ import annotations

import pytest

from build_provisional import parse_last_7_days


def _page(rows: list[tuple[str, int, int, int]]) -> str:
    """Render a minimal HTML fragment matching the gov.uk page shape."""
    body = "".join(
        f"<tr><td>{d}</td><td>{m}</td><td>{b}</td><td>{u}</td><td></td></tr>"
        for d, m, b, u in rows
    )
    return (
        "<html><body>"
        "<p>Updated 23 April 2026</p>"
        "<table>"
        "<tr>"
        "<th>Date</th><th>Migrants arrived</th><th>Boats arrived</th>"
        "<th>Boats involved in uncontrolled landings</th><th>Notes</th>"
        "</tr>"
        f"{body}"
        "</table>"
        "</body></html>"
    )


_CLEAN_ROWS = [
    ("17 April 2026", 10, 1, 0),
    ("18 April 2026", 20, 2, 0),
    ("19 April 2026", 30, 3, 0),
    ("20 April 2026", 40, 4, 0),
    ("21 April 2026", 50, 5, 0),
    ("22 April 2026", 60, 6, 0),
    ("23 April 2026", 70, 7, 0),
]


def test_clean_table_yields_no_corrections():
    rows, updated_at, corrections = parse_last_7_days(_page(_CLEAN_ROWS))
    assert [r["d"] for r in rows] == [
        "2026-04-17", "2026-04-18", "2026-04-19", "2026-04-20",
        "2026-04-21", "2026-04-22", "2026-04-23",
    ]
    assert corrections == []
    assert updated_at == "2026-04-23"


def test_single_year_typo_is_auto_corrected():
    typo_rows = list(_CLEAN_ROWS)
    typo_rows[3] = ("20 April 2025", 40, 4, 0)  # sandwiched between 2026 dates
    rows, _, corrections = parse_last_7_days(_page(typo_rows))

    assert [r["d"] for r in rows][3] == "2026-04-20"
    assert corrections == [
        {"row": 3, "raw": "2025-04-20", "corrected": "2026-04-20"},
    ]
    # figures for the corrected row are preserved, not dropped
    assert rows[3]["m"] == 40 and rows[3]["b"] == 4


def test_first_row_year_typo_is_auto_corrected():
    typo_rows = list(_CLEAN_ROWS)
    typo_rows[0] = ("17 April 2025", 10, 1, 0)
    rows, _, corrections = parse_last_7_days(_page(typo_rows))

    assert rows[0]["d"] == "2026-04-17"
    assert corrections == [
        {"row": 0, "raw": "2025-04-17", "corrected": "2026-04-17"},
    ]


def test_genuine_gap_still_fails_loud():
    """A missing day isn't a year typo — must fail."""
    broken_rows = list(_CLEAN_ROWS)
    broken_rows[3] = ("25 April 2026", 40, 4, 0)  # jumps forward 5 days
    with pytest.raises(RuntimeError, match="non-consecutive dates"):
        parse_last_7_days(_page(broken_rows))
