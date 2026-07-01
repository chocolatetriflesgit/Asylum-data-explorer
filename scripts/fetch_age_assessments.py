"""
Download the latest age-assessments-detailed-datasets xlsx from gov.uk.

Feeds build_age_assessments.py. Filename stem is registered in _sources.py;
shared fetch logic lives in _gov_uk.py.

Note: this publication was named "age disputes detailed datasets" until
gov.uk retired it on 21 May 2026 and replaced it with "age assessments
detailed datasets" (a broader dataset with the same by-nationality shape).
"""
from __future__ import annotations

from _gov_uk import cli_main
from _sources import stem


if __name__ == "__main__":
    raise SystemExit(
        cli_main(
            stem("age-assessments"),
            description=__doc__,
        )
    )
