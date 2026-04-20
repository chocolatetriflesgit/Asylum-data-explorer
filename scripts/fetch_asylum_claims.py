"""
Download the latest asylum-claims-datasets xlsx from gov.uk.

Feeds build_nat_full.py and build_nat_quarterly.py. The xlsx lives on
the Immigration system statistics data tables page; filename changes
each release (e.g. asylum-claims-datasets-nov-2025.xlsx). All shared
logic lives in _gov_uk.py so this wrapper just supplies the stem.
"""
from __future__ import annotations

from _gov_uk import cli_main


if __name__ == "__main__":
    raise SystemExit(
        cli_main(
            "asylum-claims-datasets-",
            description=__doc__,
        )
    )
