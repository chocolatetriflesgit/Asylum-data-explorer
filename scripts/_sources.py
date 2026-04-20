"""
Registry of every gov.uk publication this app consumes.

Single source of truth for upstream data. Fetchers import their
filename stem from here instead of hardcoding string literals, so
adding a new publication is a matter of adding one entry.

Open this file first when asking "what data does this app pull?".
"""
from __future__ import annotations


SOURCES = {
    "small-boats": {
        "label": "Migrants detected crossing the English Channel in small boats",
        "landing_url": (
            "https://www.gov.uk/government/publications/"
            "migrants-detected-crossing-the-english-channel-in-small-boats"
        ),
        # Weekly ODS — fetch_latest.py resolves the link directly and does
        # not use the _gov_uk cli_main / filename-stem pattern.
        "filename_stem": None,
        "fetcher": "scripts/fetch_latest.py",
        "builder": "scripts/build_boats_data.py",
        "data_file": "data/boats-data.js",
        "data_globals": (
            "BOATS_DAILY", "BOATS_WEEKLY", "BOATS_MONTHLY",
            "BOATS_ANNUAL", "BOATS_YOY", "BOATS_RECORDS", "BOATS_META",
        ),
    },
    "small-boats-last-7-days": {
        "label": "Small boats — last 7 days (provisional)",
        "landing_url": (
            "https://www.gov.uk/government/publications/"
            "migrants-detected-crossing-the-english-channel-in-small-boats/"
            "migrants-detected-crossing-the-english-channel-in-small-boats-last-7-days"
        ),
        "filename_stem": None,
        "fetcher": "scripts/fetch_last_7_days.py",
        "builder": "scripts/build_provisional.py",
        "data_file": "data/boats-provisional.js",
        "data_globals": ("BOATS_PROVISIONAL",),
    },
    "asylum-claims": {
        "label": "Asylum claims — Immigration system statistics",
        "landing_url": (
            "https://www.gov.uk/government/statistical-data-sets/"
            "immigration-system-statistics-data-tables"
        ),
        "filename_stem": "asylum-claims-datasets-",
        "fetcher": "scripts/fetch_asylum_claims.py",
        "builders": (
            "scripts/build_nat_full.py",
            "scripts/build_nat_quarterly.py",
        ),
        "data_files": (
            "data/nat-full-data.js",
            "data/nat-quarterly-data.js",
        ),
        "data_globals": ("NAT_FULL", "NAT_FULL_META", "NAT_QUARTERLY"),
    },
    "asylum-support": {
        "label": "Asylum seekers' receipt of support (hotels)",
        "landing_url": (
            "https://www.gov.uk/government/statistical-data-sets/"
            "immigration-system-statistics-data-tables"
        ),
        "filename_stem": "asylum-seekers-receipt-support-datasets-",
        "fetcher": "scripts/fetch_asylum_support.py",
        "builder": "scripts/build_hotels.py",
        "data_file": "data/hotels-data.js",
        "data_globals": ("HOTELS", "HOTELS_META"),
    },
    "resettlement": {
        "label": "Resettlement schemes (ACRS, ARAP, UKRS, etc.)",
        "landing_url": (
            "https://www.gov.uk/government/statistical-data-sets/"
            "immigration-system-statistics-data-tables"
        ),
        "filename_stem": "resettlement-scheme-datasets-",
        "fetcher": "scripts/fetch_resettlement.py",
        "builder": "scripts/build_resettlement.py",
        "data_file": "data/resettlement-data.js",
        "data_globals": ("RESETTLEMENT_SERIES", "RESETTLEMENT_META"),
    },
    "returns": {
        "label": "Returns — Immigration system statistics",
        "landing_url": (
            "https://www.gov.uk/government/statistical-data-sets/"
            "immigration-system-statistics-data-tables"
        ),
        "filename_stem": "returns-datasets-",
        "fetcher": "scripts/fetch_returns.py",
        "builder": "scripts/build_returns.py",
        "data_file": "data/returns-data.js",
        "data_globals": ("RETURNS_BY_NATIONALITY", "RETURNS_META"),
    },
    "age-disputes": {
        "label": "Asylum & resettlement — age disputes",
        "landing_url": (
            "https://www.gov.uk/government/statistical-data-sets/"
            "immigration-system-statistics-data-tables"
        ),
        "filename_stem": "age-disputes-datasets-",
        "fetcher": "scripts/fetch_age_disputes.py",
        "builder": "scripts/build_age_disputes.py",
        "data_file": "data/age-disputes-data.js",
        "data_globals": ("AGE_DISPUTES_BY_NATIONALITY", "AGE_DISPUTES_META"),
    },
}


def stem(key: str) -> str:
    """Return the filename stem for a source, or raise if missing."""
    s = SOURCES[key]["filename_stem"]
    if s is None:
        raise ValueError(f"Source {key!r} does not use a filename stem.")
    return s
