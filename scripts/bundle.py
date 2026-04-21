"""
Bundle data globals and JSX into two separate script blocks in index.html.

Data files (`data/*-data.js`) are plain JS that assign `window.*` globals —
they don't contain JSX and don't need Babel to transform them.  Keeping them
in a separate plain `<script id="app-data">` block means Babel Standalone only
sees the ~190 KB of JSX rather than the full ~530 KB bundle.

The plain block is rewritten between the DATA_START / DATA_END markers.
The JSX block is rewritten between the BUNDLE_START / BUNDLE_END markers.

Usage:
    python scripts/bundle.py

Ordering
--------
The files must be concatenated in dependency order:
  Data block (plain JS, executes first):
    1. data/boats-data.js            — emits window.BOATS_*
    2. data/*-data.js (sorted)       — other data globals

  JSX block (Babel-transformed, executes after):
    1. src/data.jsx                  — shell data (asylum/regions/stories)
    2. src/charts.jsx                — chart primitives used everywhere
    3. src/app.jsx                   — header, footer, drawers
    4. src/dashboard-view.jsx        — /dashboard route
    5. src/views-story-build.jsx     — /story, /datasets, /build routes
    6. src/atlas-view.jsx            — /atlas world choropleth view
    7. src/root.jsx                  — mounts <App />, must be LAST
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path


DATA_START = "/* DATA_START"
DATA_END   = "/* DATA_END"
BUNDLE_START = "/* BUNDLE_START"
BUNDLE_END   = "/* BUNDLE_END"

# Ordering is load-order-sensitive. root.jsx MUST be last (it renders).
SRC_ORDER = [
    "data.jsx",
    "charts.jsx",
    "app.jsx",
    "dashboard-view.jsx",
    "views-story-build.jsx",
    "atlas-view.jsx",
    "root.jsx",
]


def ordered_src(src_dir: Path) -> list[Path]:
    present = {p.name: p for p in src_dir.glob("*.jsx")}
    ordered: list[Path] = []
    seen: set[str] = set()

    for name in SRC_ORDER:
        if name in present:
            ordered.append(present[name])
            seen.add(name)

    for name, path in sorted(present.items()):
        if name in seen:
            continue
        if name == "root.jsx":
            continue
        ordered.append(path)

    if "root.jsx" in present and ordered[-1].name != "root.jsx":
        ordered.remove(present["root.jsx"])
        ordered.append(present["root.jsx"])

    return ordered


def concat_data(root: Path) -> str:
    """Return concatenated plain-JS data globals (no JSX)."""
    parts: list[str] = []
    data_dir = root / "data"

    boats_js = data_dir / "boats-data.js"
    if boats_js.exists():
        parts.append(f"/* --- data/boats-data.js --- */\n{boats_js.read_text(encoding='utf-8')}")
    else:
        parts.append(
            "/* --- data/boats-data.js --- (not generated yet; run "
            "scripts/build_boats_data.py) */"
        )

    if data_dir.exists():
        for extra in sorted(data_dir.glob("*-data.js")):
            if extra.name == "boats-data.js":
                continue
            parts.append(f"\n/* --- data/{extra.name} --- */\n{extra.read_text(encoding='utf-8')}")

    return "\n".join(parts).rstrip() + "\n"


def concat_jsx(root: Path) -> str:
    """Return concatenated JSX source files."""
    parts: list[str] = []
    src_dir = root / "src"
    if not src_dir.exists():
        raise FileNotFoundError(f"src/ not found at {src_dir}")

    for p in ordered_src(src_dir):
        rel = p.relative_to(root).as_posix()
        parts.append(f"\n/* --- {rel} --- */\n{p.read_text(encoding='utf-8')}")

    return "\n".join(parts).rstrip() + "\n"


_DATA_RE = re.compile(
    r"(/\*\s*DATA_START[^*]*\*/)(.*?)(/\*\s*DATA_END[^*]*\*/)",
    re.DOTALL,
)
_BUNDLE_RE = re.compile(
    r"(/\*\s*BUNDLE_START[^*]*\*/)(.*?)(/\*\s*BUNDLE_END[^*]*\*/)",
    re.DOTALL,
)


def rewrite_index(html: str, data: str, jsx: str) -> str:
    def _data_repl(m: re.Match) -> str:
        return m.group(1) + "\n" + data + "\n" + m.group(3)

    def _bundle_repl(m: re.Match) -> str:
        return m.group(1) + "\n" + jsx + "\n" + m.group(3)

    html, n = _DATA_RE.subn(_data_repl, html, count=1)
    if n == 0:
        raise RuntimeError("DATA_START / DATA_END markers not found in index.html")

    html, n = _BUNDLE_RE.subn(_bundle_repl, html, count=1)
    if n == 0:
        raise RuntimeError("BUNDLE_START / BUNDLE_END markers not found in index.html")

    return html


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument(
        "--root",
        type=Path,
        default=Path(__file__).resolve().parents[1],
        help="Project root (default: parent of scripts/).",
    )
    args = p.parse_args()

    index = args.root / "index.html"
    if not index.exists():
        print(f"error: {index} not found", file=sys.stderr)
        return 2

    data = concat_data(args.root)
    jsx = concat_jsx(args.root)
    html = index.read_text(encoding="utf-8")
    new_html = rewrite_index(html, data, jsx)
    if new_html != html:
        index.write_text(new_html, encoding="utf-8")
        data_kb = len(data.encode("utf-8")) / 1024
        jsx_kb = len(jsx.encode("utf-8")) / 1024
        print(
            f"bundled data={data_kb:.0f} KB (plain), "
            f"jsx={jsx_kb:.0f} KB (babel) into {index.name}"
        )
    else:
        print("no changes")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
