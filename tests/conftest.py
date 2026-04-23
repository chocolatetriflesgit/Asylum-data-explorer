"""Shared pytest fixtures and path shims.

``scripts/`` is not a Python package (the pipeline is a flat collection of
entry-point scripts), but unit tests want to import parser functions from
those scripts directly. Adding the directory to ``sys.path`` here keeps the
individual test files uncluttered.
"""
from __future__ import annotations

import sys
from pathlib import Path

_SCRIPTS_DIR = Path(__file__).resolve().parents[1] / "scripts"
if str(_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_DIR))
