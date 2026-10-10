"""Security regression tests for dev/admin route registration policy."""

import ast
import importlib.util
from pathlib import Path

import pytest


BACKEND = Path(__file__).resolve().parents[1]
POLICY_PATH = BACKEND / "app" / "core" / "internal_route_policy.py"
_spec = importlib.util.spec_from_file_location("_mytwin_internal_route_policy", POLICY_PATH)
assert _spec and _spec.loader
_policy = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_policy)
resolve_internal_routers = _policy.resolve_internal_routers

DEV_SECRET = "aB3!cD4@eF5#gH6$" * 3
ADMIN_KEY = "mN7%oP8^qR9&sT0*" * 3
EXPORT_KEY = "uV1+wX2-yZ3!aB4#" * 3


def test_internal_routes_are_disabled_by_default_in_production():
    assert resolve_internal_routers({}) == ()
    assert resolve_internal_routers({"ENVIRONMENT": "production"}) == ()


def test_internal_routes_are_disabled_when_flag_is_not_exact_true():
    assert resolve_internal_routers(
        {"ENVIRONMENT": "development", "ENABLE_DEV_ROUTES": "1"}
    ) == ()


def test_production_cannot_enable_development_routes_even_with_secret():
    with pytest.raises(RuntimeError, match="only be enabled"):
        resolve_internal_routers(
            {
                "ENVIRONMENT": "production",
                "ENABLE_DEV_ROUTES": "true",
                "DEV_SECRET": DEV_SECRET,
            }
        )


def test_staging_cannot_enable_admin_routes():
    with pytest.raises(RuntimeError, match="only be enabled"):
        resolve_internal_routers(
            {
                "ENVIRONMENT": "staging",
                "ENABLE_ADMIN_ROUTES": "true",
                "ADMIN_API_KEY": ADMIN_KEY,
                "SOUL_SYNC_ADMIN_KEY": EXPORT_KEY,
            }
        )


def test_development_routes_require_a_long_diverse_explicit_secret():
    with pytest.raises(RuntimeError, match="DEV_SECRET"):
        resolve_internal_routers(
            {"ENVIRONMENT": "development", "ENABLE_DEV_ROUTES": "true"}
        )

    with pytest.raises(RuntimeError, match="DEV_SECRET"):
        resolve_internal_routers(
            {
                "ENVIRONMENT": "development",
                "ENABLE_DEV_ROUTES": "true",
                "DEV_SECRET": "x" * 40,
            }
        )

    assert resolve_internal_routers(
        {
            "ENVIRONMENT": "development",
            "ENABLE_DEV_ROUTES": "true",
            "DEV_SECRET": DEV_SECRET,
        }
    ) == ("dev",)


def test_admin_routes_require_both_distinct_long_secrets():
    with pytest.raises(RuntimeError, match="SOUL_SYNC_ADMIN_KEY"):
        resolve_internal_routers(
            {
                "ENVIRONMENT": "development",
                "ENABLE_ADMIN_ROUTES": "true",
                "ADMIN_API_KEY": ADMIN_KEY,
            }
        )

    with pytest.raises(RuntimeError, match="must be different"):
        resolve_internal_routers(
            {
                "ENVIRONMENT": "development",
                "ENABLE_ADMIN_ROUTES": "true",
                "ADMIN_API_KEY": ADMIN_KEY,
                "SOUL_SYNC_ADMIN_KEY": ADMIN_KEY,
            }
        )

    assert resolve_internal_routers(
        {
            "ENVIRONMENT": "development",
            "ENABLE_ADMIN_ROUTES": "true",
            "ADMIN_API_KEY": ADMIN_KEY,
            "SOUL_SYNC_ADMIN_KEY": EXPORT_KEY,
        }
    ) == ("admin", "admin_routes")


def test_non_ascii_secrets_are_rejected():
    with pytest.raises(RuntimeError, match="ASCII secret"):
        resolve_internal_routers(
            {
                "ENVIRONMENT": "development",
                "ENABLE_DEV_ROUTES": "true",
                "DEV_SECRET": "ت" * 40,
            }
        )


def test_privileged_routers_are_not_in_the_optional_release_set():
    route_registry = BACKEND / "app" / "api" / "routes" / "__init__.py"
    source = route_registry.read_text(encoding="utf-8")
    tree = ast.parse(source)
    optional = next(
        node.value
        for node in tree.body
        if isinstance(node, ast.Assign)
        and any(isinstance(target, ast.Name) and target.id == "_OPTIONAL" for target in node.targets)
    )
    optional_names = {element.value for element in optional.elts if isinstance(element, ast.Constant)}
    assert not ({"dev", "admin", "admin_routes"} & optional_names)
    assert "resolve_internal_routers()" in source


def test_kernel_admin_route_is_conditionally_registered_and_authenticated():
    main_source = (BACKEND / "main.py").read_text(encoding="utf-8")
    assert 'if "admin" in _INTERNAL_ROUTERS:' in main_source
    assert 'Header(..., alias="X-Admin-Key")' in main_source
    assert "await verify_admin(x_admin_key)" in main_source
