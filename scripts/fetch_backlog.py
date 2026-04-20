"""
Fetch the latest `asylum-claims-awaiting-decision-datasets-*.xlsx` from gov.uk
into `cache/`.

Source: Immigration system statistics — asylum claims awaiting a decision
  https://www.gov.uk/government/statistical-data-sets/immigration-system-statistics-data-tables

Usage:
    python scripts/fetch_backlog.py [--dry-run]
"""
from scripts._gov_uk import cli_main
from scripts._sources import stem

if __name__ == "__main__":
    cli_main(stem("backlog"), description=__doc__)
