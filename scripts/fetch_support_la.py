"""
Fetch the latest `support-local-authority-datasets-*.xlsx` from gov.uk
into `cache/`.

Source: Immigration system statistics — asylum seekers in receipt of support
  https://www.gov.uk/government/statistical-data-sets/immigration-system-statistics-data-tables

Usage:
    python scripts/fetch_support_la.py [--dry-run]
"""
from _gov_uk import cli_main
from _sources import stem

if __name__ == "__main__":
    raise SystemExit(cli_main(stem("support-local-authority"), description=__doc__))
