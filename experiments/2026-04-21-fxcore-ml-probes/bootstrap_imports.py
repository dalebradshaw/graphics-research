#!/usr/bin/env python3
"""Helpers to bootstrap local Python dependencies for the FxCore ML probes."""

from __future__ import annotations

from pathlib import Path
import importlib.util
import sys


ROOT = Path(__file__).resolve().parent


def ensure_local_site_packages() -> Path | None:
    """Inject the experiment-local venv site-packages if coremltools is absent."""
    if importlib.util.find_spec("coremltools") is not None:
        return None

    candidates = sorted((ROOT / ".venv" / "lib").glob("python*/site-packages"))
    for candidate in candidates:
        candidate_str = str(candidate)
        if candidate_str not in sys.path:
            sys.path.insert(0, candidate_str)
        if importlib.util.find_spec("coremltools") is not None:
            return candidate
    return None


def require_dependency(module_name: str) -> None:
    """Raise a clear error if a dependency still cannot be imported."""
    if importlib.util.find_spec(module_name) is None:
        raise RuntimeError(
            f"Missing Python dependency '{module_name}'. "
            f"Create the local venv in {ROOT / '.venv'} and install the experiment requirements."
        )
