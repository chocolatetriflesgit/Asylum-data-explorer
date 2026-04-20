"""
Download the latest asylum-seekers-receipt-support-datasets xlsx from gov.uk.

Feeds build_hotels.py (persons in contingency hotel accommodation,
Data_Asy_D09). Filename stem is registered in _sources.py; shared fetch
logic lives in _gov_uk.py.
"""
from __future__ import annotations

from _gov_uk import cli_main
from _sources import stem


if __name__ == "__main__":
    raise SystemExit(
        cli_main(
            stem("asylum-support"),
            description=__doc__,
        )
    )
