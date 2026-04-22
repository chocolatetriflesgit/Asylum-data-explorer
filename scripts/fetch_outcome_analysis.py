"""
Download the latest outcome-analysis-asylum-claims xlsx from gov.uk.

Feeds ``build_outcome_analysis.py`` (ASY_D04 — outcome analysis of asylum
claims, cohort view: year-of-claim x nationality, initial vs latest
outcome, enforced / voluntary returns).

Filename stem is registered in ``_sources.py``; shared fetch logic lives
in ``_gov_uk.py``.
"""
from __future__ import annotations

from _gov_uk import cli_main
from _sources import stem


if __name__ == "__main__":
    raise SystemExit(
        cli_main(
            stem("outcome-analysis"),
            description=__doc__,
        )
    )
