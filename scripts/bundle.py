"""
Bundle `data/boats-data.js` + every `src/*.jsx` into the `<script
type="text/babel">` block in `index.html`, between the BUNDLE_START and
BUNDLE_END markers.

Usage:
    python scripts/bundle.py

Why no toolchain?
----------------
The app is deliberately single-file (see CLAUDE.md § Architecture). Adding
webpack/vite/esbuild would mean a Node build step — explicitly out of scope.
Babel Standalone transforms the concatenated JSX in the browser.

Ordering
--------
The files must be concatenated in dependency order:
  1. data/boats-data.js            — emits window.BOATS_*
  2. src/data.jsx                  — emits shell data (asylum/regions/stories)
  3. src/charts.jsx                — chart primitives used everywhere
  4. src/app.jsx                   — header, footer, drawers
  5. src/dashboard-view.jsx        — /dashboard view
  6. src/views-story-build.jsx     — /story, /datasets, /build views
  7. src/root.jsx                  — mounts <App />, must be LAST

Unknown additional files in `src/` are appended after the known ones but
before root.jsx.
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path


BUNDLE_START = "/* BUNDLE_START"
BUNDLE_END = "/* BUNDLE_END"

# Ordering is load-order-sensitive. root.jsx MUST be last (it renders).
SRC_ORDER = [
    "data.jsx",
    "charts.jsx",
    "app.jsx",
    "dashboard-view.jsx",
    "views-story-build.jsx",
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
            continue  # handled above
        ordered.append(path)

    # Ensure root.jsx is last if present
    if "root.jsx" in present and ordered[-1].name != "root.jsx":
        ordered.remove(present["root.jsx"])
        ordered.append(present["root.jsx"])

    return ordered


def concat_bundle(root: Path) -> str:
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

    # Any additional data/*-data.js files, sorted for stability.
    # Ordering is not load-order-sensitive between data files (each emits its
    # own window.* globals). They must, however, all come before any src/*.jsx.
    if data_dir.exists():
        for extra in sorted(data_dir.glob("*-data.js")):
            if extra.name == "boats-data.js":
                continue
            parts.append(f"\n/* --- data/{extra.name} --- */\n{extra.read_text(encoding='utf-8')}")

    src_dir = root / "src"
    if not src_dir.exists():
        raise FileNotFoundError(f"src/ not found at {src_dir}")

    for p in ordered_src(src_dir):
        rel = p.relative_to(root).as_posix()
        parts.append(f"\n/* --- {rel} --- */\n{p.read_text(encoding='utf-8')}")

    return "\n".join(parts).rstrip() + "\n"


_BLOCK_RE = re.compile(
    r"(/\*\s*BUNDLE_START[^*]*\*/)(.*?)(/\*\s*BUNDLE_END[^*]*\*/)",
    re.DOTALL,
)


def rewrite_index(html: str, bundle: str) -> str:
    def repl(m: re.Match) -> str:
        return m.group(1) + "\n" + bundle + "\n" + m.group(3)

    new_html, n = _BLOCK_RE.subn(repl, html, count=1)
    if n == 0:
        raise RuntimeError(
            "BUNDLE_START / BUNDLE_END markers not found in index.html"
        )
    return new_html


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

    bundle = concat_bundle(args.root)
    html = index.read_text(encoding="utf-8")
    new_html = rewrite_index(html, bundle)
    if new_html != html:
        index.write_text(new_html, encoding="utf-8")
        print(f"bundled {len(bundle.encode('utf-8'))} bytes into {index.name}")
    else:
        print("no changes")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
