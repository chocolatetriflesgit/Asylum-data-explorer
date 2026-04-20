"""
Download the latest returns-datasets xlsx from gov.uk.

Feeds build_returns.py (returns by nationality — enforced, voluntary,
and assisted). Filename stem is registered in _sources.py; shared fetch
logic lives in _gov_uk.py.
"""
from __future__ import annotations

from _gov_uk import cli_main
from _sources import stem


if __name__ == "__main__":
    raise SystemExit(
        cli_main(
            stem("returns"),
            description=__doc__,
        )
    )
