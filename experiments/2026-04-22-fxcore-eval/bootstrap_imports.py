#!/usr/bin/env python3
"""Helpers to bootstrap local Python dependencies for FxCore evaluation scripts."""

from __future__ import annotations

from pathlib import Path
import importlib.util
import sys


ROOT = Path(__file__).resolve().parent
FALLBACK_VENVS = [
    ROOT / ".venv",
    ROOT.parent / "2026-04-21-fxcore-ml-probes" / ".venv",
    ROOT.parent / "2026-04-21-birefnet-fxcore-poc" / ".venv",
]


def ensure_local_site_packages() -> Path | None:
    """Inject site-packages from local experiment venvs if needed."""
    if importlib.util.find_spec("coremltools") is not None:
        return None

    for venv_root in FALLBACK_VENVS:
        for candidate in sorted((venv_root / "lib").glob("python*/site-packages")):
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
            "Create a local venv or reuse one of the existing experiment venvs."
        )
