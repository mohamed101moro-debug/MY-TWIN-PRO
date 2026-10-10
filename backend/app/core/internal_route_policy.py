"""Fail-closed loading policy for development and administrative API routers.

Internal routes are never enabled by a feature flag alone: the process must be
explicitly in a local development environment and every required secret must
be supplied with sufficient length and character diversity. This module has no
application imports so its policy can be tested without booting providers.
"""
from __future__ import annotations

import os
import secrets
from collections.abc import Mapping

_MIN_SECRET_LENGTH = 32
_MIN_UNIQUE_CHARACTERS = 16


def _enabled(environment: Mapping[str, str], name: str) -> bool:
    return environment.get(name, "").strip().lower() == "true"


def _require_strong_secret(environment: Mapping[str, str], name: str) -> str:
    value = environment.get(name, "")
    if (
        len(value) < _MIN_SECRET_LENGTH
        or not value.isascii()
        or len(set(value)) < _MIN_UNIQUE_CHARACTERS
    ):
        raise RuntimeError(
            f"{name} must be explicitly configured as an ASCII secret of at least "
            f"{_MIN_SECRET_LENGTH} characters with sufficient character diversity "
            "before internal routes can be enabled"
        )
    return value


def resolve_internal_routers(
    environ: Mapping[str, str] | None = None,
) -> tuple[str, ...]:
    """Return explicitly enabled internal router names or fail startup safely.

    Production and staging never expose these routers. A misconfigured flag in
    either environment is a startup error instead of a silent exposure.
    """
    values = os.environ if environ is None else environ
    enable_dev = _enabled(values, "ENABLE_DEV_ROUTES")
    enable_admin = _enabled(values, "ENABLE_ADMIN_ROUTES")

    if not enable_dev and not enable_admin:
        return ()

    environment = values.get("ENVIRONMENT", "production").strip().lower()
    if environment != "development":
        raise RuntimeError(
            "Development/admin API routers may only be enabled when "
            "ENVIRONMENT=development; refusing to start"
        )

    routers: list[str] = []
    if enable_dev:
        _require_strong_secret(values, "DEV_SECRET")
        routers.append("dev")

    if enable_admin:
        admin_key = _require_strong_secret(values, "ADMIN_API_KEY")
        export_key = _require_strong_secret(values, "SOUL_SYNC_ADMIN_KEY")
        if secrets.compare_digest(admin_key, export_key):
            raise RuntimeError(
                "ADMIN_API_KEY and SOUL_SYNC_ADMIN_KEY must be different secrets"
            )
        routers.extend(("admin", "admin_routes"))

    return tuple(routers)
