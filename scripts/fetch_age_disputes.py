"""
Download the latest asylum-and-resettlement-age-disputes-datasets xlsx from gov.uk.

Feeds build_age_disputes.py. Filename stem is registered in _sources.py;
shared fetch logic lives in _gov_uk.py.
"""
from __future__ import annotations

from _gov_uk import cli_main
from _sources import stem


if __name__ == "__main__":
    raise SystemExit(
        cli_main(
            stem("age-disputes"),
            description=__doc__,
        )
    )
