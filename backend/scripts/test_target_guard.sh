#!/usr/bin/env bash
# Shared safety guard for stateful end-to-end scripts. Never target production.
set -euo pipefail

if [[ -z "${MYTWIN_API_BASE_URL:-}" ]]; then
  echo "Set MYTWIN_API_BASE_URL explicitly to a local or staging API; no implicit target is allowed." >&2
  exit 2
fi

API="${MYTWIN_API_BASE_URL%/}"
case "$API" in
  *my-twin-pro-production.up.railway.app*|*my-twin-pro-production-b744.up.railway.app*|*my-twin-pro-production-fd77.up.railway.app*)
    echo "Refusing to run stateful E2E tests against a known production Railway host." >&2
    exit 2
    ;;
esac

case "${MYTWIN_TEST_ENV:-}" in
  local)
    case "$API" in
      http://localhost|http://localhost:*|http://127.0.0.1|http://127.0.0.1:*) ;;
      *) echo "MYTWIN_TEST_ENV=local requires an http://localhost or http://127.0.0.1 URL." >&2; exit 2 ;;
    esac
    ;;
  staging)
    case "$API" in
      https://*) ;;
      *) echo "MYTWIN_TEST_ENV=staging requires an explicit HTTPS staging URL." >&2; exit 2 ;;
    esac
    if [[ "${MYTWIN_STAGING_CONFIRMATION:-}" != "I_CONFIRM_THIS_IS_STAGING" ]]; then
      echo "Set MYTWIN_STAGING_CONFIRMATION=I_CONFIRM_THIS_IS_STAGING only after confirming the target is staging." >&2
      exit 2
    fi
    ;;
  *)
    echo "Set MYTWIN_TEST_ENV to 'local' or 'staging'; production is never allowed." >&2
    exit 2
    ;;
esac

export API
