"""Every dataset in the browse list has a plain-English description.

DATASETS lives in src/data.jsx; DATASET_NOTES lives in src/copy.jsx. Both are
plain JS object literals, so a regex read keeps this test dependency-free —
the same approach the other integrity tests take to generated JS.
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def _dataset_codes():
    src = (ROOT / "src" / "data.jsx").read_text(encoding="utf-8")
    # Rows of the DATASETS array: { code: 'Asy_D01', name: ... }
    block = re.search(r"const DATASETS = \[(.*?)\n\];", src, re.S)
    assert block, "DATASETS array not found in src/data.jsx"
    return re.findall(r"code:\s*'([A-Za-z0-9_]+)'", block.group(1))


def _note_codes():
    src = (ROOT / "src" / "copy.jsx").read_text(encoding="utf-8")
    block = re.search(r"const DATASET_NOTES = \{(.*?)\n\};", src, re.S)
    assert block, "DATASET_NOTES object not found in src/copy.jsx"
    return re.findall(r"^\s{2}([A-Za-z0-9_]+):", block.group(1), re.M)


def test_every_dataset_has_a_note():
    datasets = _dataset_codes()
    notes = set(_note_codes())
    assert datasets, "no dataset codes parsed — regex drifted?"
    missing = [c for c in datasets if c not in notes]
    assert not missing, (
        f"DATASET_NOTES in src/copy.jsx is missing descriptions for: {missing}. "
        "Add a plain-English note for each new dataset."
    )


def test_no_orphan_notes():
    datasets = set(_dataset_codes())
    orphans = [c for c in _note_codes() if c not in datasets]
    assert not orphans, (
        f"DATASET_NOTES has entries for codes not in DATASETS: {orphans}. "
        "Remove them or add the dataset row."
    )
