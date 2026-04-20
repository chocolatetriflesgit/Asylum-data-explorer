"""
Download the latest resettlement-scheme-datasets xlsx from gov.uk.

Feeds build_resettlement.py (ACRS, ARAP, UKRS, Community Sponsorship,
Mandate Scheme — NOT Ukraine schemes, which are a separate publication).
Filename stem is registered in _sources.py; shared fetch logic lives in
_gov_uk.py.
"""
from __future__ import annotations

from _gov_uk import cli_main
from _sources import stem


if __name__ == "__main__":
    raise SystemExit(
        cli_main(
            stem("resettlement"),
            description=__doc__,
        )
    )
