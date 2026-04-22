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
            "scripts/build_decisions.py",
            "scripts/build_nat_series.py",
            "scripts/build_sex_age.py",
            "scripts/build_nat_grant_annual.py",
            "scripts/build_route_of_entry.py",
        ),
        "data_files": (
            "data/nat-full-data.js",
            "data/nat-quarterly-data.js",
            "data/decisions-data.js",
            "data/nat-series-data.js",
            "data/sex-age-data.js",
            "data/nat-grant-annual-data.js",
            "data/route-of-entry-data.js",
        ),
        "data_globals": (
            "NAT_FULL", "NAT_FULL_META", "NAT_QUARTERLY",
            "DECISIONS_LATEST", "DECISIONS_META",
            "NAT_SERIES_LATEST", "NAT_SERIES_META",
            "SEX_AGE_ANNUAL", "SEX_AGE_META",
            "NAT_GRANT_ANNUAL", "NAT_GRANT_ANNUAL_META",
            "ROUTE_OF_ENTRY_QUARTERLY", "ROUTE_OF_ENTRY_META",
        ),
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
    "backlog": {
        "label": "Asylum claims awaiting a decision",
        "landing_url": (
            "https://www.gov.uk/government/statistical-data-sets/"
            "immigration-system-statistics-data-tables"
        ),
        "filename_stem": "asylum-claims-awaiting-decision-datasets-",
        "fetcher": "scripts/fetch_backlog.py",
        "builder": "scripts/build_backlog.py",
        "data_file": "data/backlog-data.js",
        "data_globals": ("BACKLOG_LATEST", "BACKLOG_META"),
    },
    "support-local-authority": {
        "label": "Asylum seekers in receipt of support by local authority",
        "landing_url": (
            "https://www.gov.uk/government/statistical-data-sets/"
            "immigration-system-statistics-data-tables"
        ),
        "filename_stem": "support-local-authority-datasets-",
        "fetcher": "scripts/fetch_support_la.py",
        "builder": "scripts/build_support_regions.py",
        "data_file": "data/support-regions-data.js",
        "data_globals": ("SUPPORT_REGIONS", "SUPPORT_REGIONS_META"),
    },
    "irregular-migration": {
        "label": "Irregular migration to the UK — summary tables",
        # Separate landing page from the main immigration-system-statistics
        # hub — this publication has its own release cadence (quarterly)
        # and ships as an ODS (not the usual xlsx). Sheet Irr_02b carries
        # the small-boat-arrivals by nationality breakdown.
        "landing_url": (
            "https://www.gov.uk/government/statistical-data-sets/"
            "irregular-migration-detailed-dataset-and-summary-tables"
        ),
        "filename_stem": "irregular-migration-to-the-uk-summary-",
        "fetcher": "scripts/fetch_irregular.py",
        "builder": "scripts/build_irregular.py",
        "data_file": "data/irregular-data.js",
        "data_globals": ("IRR_BOATS_BY_NATIONALITY", "IRR_BOATS_META"),
    },
    "unhcr": {
        "label": "UNHCR Refugee Data Finder (Population / Asylum apps / Decisions)",
        "landing_url": "https://api.unhcr.org/population/v1/",
        # No filename-stem — this is a REST API, not a gov.uk xlsx drop.
        # fetch_unhcr.py pulls JSON directly from the endpoints below.
        "filename_stem": None,
        "fetcher": "scripts/fetch_unhcr.py",
        "builder": "scripts/build_unhcr.py",
        "data_file": "data/unhcr-data.js",
        "data_globals": (
            "UNHCR_POC_ANNUAL", "UNHCR_UK_APPS_ANNUAL",
            "UNHCR_UK_DECISIONS_ANNUAL", "UNHCR_META",
        ),
    },
    "outcome-analysis": {
        "label": "Outcome analysis of asylum claims (cohort view)",
        "landing_url": (
            "https://www.gov.uk/government/statistical-data-sets/"
            "immigration-system-statistics-data-tables"
        ),
        # Filename e.g. outcome-analysis-asylum-claims-datasets-dec-2025.xlsx
        "filename_stem": "outcome-analysis-asylum-claims-datasets-",
        "fetcher": "scripts/fetch_outcome_analysis.py",
        "builder": "scripts/build_outcome_analysis.py",
        "data_file": "data/outcome-cohort-data.js",
        "data_globals": ("OUTCOME_COHORT_ANNUAL", "OUTCOME_COHORT_META"),
    },
    "iom-missing-migrants": {
        "label": "IOM Missing Migrants Project (English Channel deaths)",
        "landing_url": "https://missingmigrants.iom.int/",
        # Not a gov.uk source — IOM publishes one global CSV covering every
        # route they track. The builder filters to the English Channel in
        # Python rather than requesting a route-specific file, so the URL
        # never changes per route.
        "filename_stem": None,
        "fetcher": "scripts/fetch_deaths.py",
        "builder": "scripts/build_deaths.py",
        "data_file": "data/deaths-data.js",
        "data_globals": ("DEATHS_DAILY", "DEATHS_ANNUAL", "DEATHS_META"),
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
