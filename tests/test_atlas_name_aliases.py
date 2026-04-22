"""Atlas name-alias completeness test.

Every nationality listed in ``data/nat-full-data.js`` must be reachable on
the choropleth — either it matches a ``WORLD_MAP`` country name directly,
or it appears as a value in ``ATLAS_NAME_ALIASES`` inside
``src/atlas-view.jsx`` (which rewrites the Natural-Earth country name to
the Home Office nationality string).

The assertion is one-directional and deliberately lenient: NAT_FULL often
contains entries like "Stateless" or "Other" that have no cartographic
home, so we only complain about names that look like real countries
(first letter capitalised, ASCII letters / spaces / common punctuation).
"""
from __future__ import annotations

import json
import re
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]


def _extract_json_array(path: Path, global_name: str) -> list:
    text = path.read_text(encoding="utf-8")
    m = re.search(rf"{global_name}\s*=\s*(\[)", text)
    if not m:
        pytest.skip(f"{global_name} not found in {path.name}")
    start = m.end() - 1  # opening bracket
    depth = 0
    in_str = False
    esc = False
    for i in range(start, len(text)):
        c = text[i]
        if in_str:
            if esc:
                esc = False
            elif c == "\\":
                esc = True
            elif c == '"':
                in_str = False
            continue
        if c == '"':
            in_str = True
        elif c == "[":
            depth += 1
        elif c == "]":
            depth -= 1
            if depth == 0:
                return json.loads(text[start : i + 1])
    raise AssertionError(f"Unterminated array for {global_name} in {path.name}")


def _extract_alias_map() -> dict[str, str | None]:
    """Parse the ATLAS_NAME_ALIASES literal out of src/atlas-view.jsx."""
    path = ROOT / "src" / "atlas-view.jsx"
    text = path.read_text(encoding="utf-8")
    m = re.search(r"ATLAS_NAME_ALIASES\s*=\s*\{", text)
    if not m:
        pytest.skip("ATLAS_NAME_ALIASES not found in atlas-view.jsx")
    start = m.end() - 1
    depth = 0
    in_str = False
    str_q: str | None = None
    esc = False
    for i in range(start, len(text)):
        c = text[i]
        if in_str:
            if esc:
                esc = False
            elif c == "\\":
                esc = True
            elif c == str_q:
                in_str = False
            continue
        if c in "'\"":
            in_str = True
            str_q = c
        elif c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                body = text[start + 1 : i]
                break
    else:
        raise AssertionError("Unterminated ATLAS_NAME_ALIASES object")

    # Naive key/value reader: each line is 'key': value, with value either
    # a single- or double-quoted string or the literal `null`.
    out: dict[str, str | None] = {}
    pair_re = re.compile(
        r"""['"]([^'"]+)['"]\s*:\s*(?:['"]([^'"]*)['"]|(null))"""
    )
    for key, val, nullv in pair_re.findall(body):
        out[key] = None if nullv else val
    return out


def test_every_nat_full_name_resolves_on_world_map() -> None:
    nat_full = _extract_json_array(ROOT / "data" / "nat-full-data.js", "window.NAT_FULL")
    world_map = _extract_json_array(ROOT / "data" / "world-map-data.js", "window.WORLD_MAP")
    aliases = _extract_alias_map()

    # Reachable names = direct WORLD_MAP names + alias rewrite targets (non-null).
    world_names = {c["name"] for c in world_map if "name" in c}
    alias_targets = {v for v in aliases.values() if v}
    reachable = world_names | alias_targets

    # Known non-country aggregates or stateless entries we never expect to
    # resolve to a polygon. Keep this list tight — if NAT_FULL adds a new
    # real country, the test should fail until an alias is added.
    acceptable_misses = {
        # Aggregates / non-country categories
        "Stateless",
        "Other",
        "Other and unknown",
        "British Overseas",
        "British overseas citizens",
        "Nationality not known",
        "Refugee",
        "Europe Other",
        "Africa Other",
        "Asia Other",
        "Americas Other",
        "Oceania Other",
        "Middle East Other",
        # Small-polygon countries that Natural Earth drops from the
        # 1:110m world basemap we use. Applicants exist but there is
        # no polygon to click; shown in the nationalities table only.
        "Antigua and Barbuda",
        "Bahrain",
        "Barbados",
        "Cape Verde",
        "Comoros",
        "Dominica",
        "Grenada",
        "Hong Kong",
        "Maldives",
        "Mauritius",
        "Seychelles",
        "Singapore",
        "St Kitts and Nevis",
        "St Lucia",
        "St Vincent and the Grenadines",
        "Tonga",
    }

    misses: list[str] = []
    for r in nat_full:
        name = r.get("name")
        if not name or name in acceptable_misses:
            continue
        if name in reachable:
            continue
        # Only flag names that look like real-country candidates.
        if re.match(r"^[A-Z][A-Za-z().,' -]+$", name):
            misses.append(name)

    assert not misses, (
        "NAT_FULL entries not reachable on the Atlas choropleth (add to "
        "ATLAS_NAME_ALIASES in src/atlas-view.jsx or add to the acceptable-"
        f"misses list in this test): {sorted(misses)}"
    )
