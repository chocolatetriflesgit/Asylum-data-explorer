"""
Download the latest resettlement-scheme-datasets xlsx from gov.uk.

Feeds build_resettlement.py (ACRS, ARAP, UKRS, Community Sponsorship,
Mandate Scheme — NOT Ukraine schemes, which are a separate publication).
Filename changes each release. Shared logic lives in _gov_uk.py.
"""
from __future__ import annotations

from _gov_uk import cli_main


if __name__ == "__main__":
    raise SystemExit(
        cli_main(
            "resettlement-scheme-datasets-",
            description=__doc__,
        )
    )
