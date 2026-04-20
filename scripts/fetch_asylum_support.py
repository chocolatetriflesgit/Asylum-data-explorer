"""
Download the latest asylum-seekers-receipt-support-datasets xlsx from gov.uk.

Feeds build_hotels.py (persons in contingency hotel accommodation,
Data_Asy_D09). Filename changes each release. Shared logic lives in
_gov_uk.py.
"""
from __future__ import annotations

from _gov_uk import cli_main


if __name__ == "__main__":
    raise SystemExit(
        cli_main(
            "asylum-seekers-receipt-support-datasets-",
            description=__doc__,
        )
    )
