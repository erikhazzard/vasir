from __future__ import annotations

import subprocess
import sys
from pathlib import Path


def test_media_and_schema_regressions() -> None:
    root = Path(__file__).resolve().parents[1]
    subprocess.run([sys.executable, str(root / "scripts" / "test_tools.py")], check=True)
