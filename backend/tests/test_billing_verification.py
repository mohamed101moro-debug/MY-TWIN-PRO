"""Security contracts for Google Play entitlement activation."""
import asyncio
import hashlib
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException

from app.api.routes import billing_routes, economy_routes


class FakeRpcResponse:
    def __init__(self, data):
        self.data = data

    def execute(self):
        return self


class FakeDatabase:
    def __init__(self):
        self.calls = []

    def rpc(self, name, args):
        self.calls.append((name, args))
        return FakeRpcResponse({"success": True, "tier": "premium"})


def test_unknown_product_is_rejected_before_verification(monkeypatch):
    monkeypatch.setattr(billing_routes, "_verify_google", lambda *_: pytest.fail("must not call Google"))
    with pytest.raises(HTTPException) as error:
        asyncio.run(billing_routes.purchase_verify(
            billing_routes.PurchaseVerificationRequest(sku="client-controlled-tier", token="x"),
            "user-1",
        ))
    assert error.value.status_code == 400


@pytest.mark.parametrize(
    ("verification_result", "expected_status"),
    [(None, 503), (False, 402)],
)
def test_no_entitlement_is_written_when_google_does_not_confirm(monkeypatch, verification_result, expected_status):
    monkeypatch.setattr(billing_routes, "_verify_google", lambda *_: verification_result)
    monkeypatch.setattr(billing_routes, "get_db", lambda: pytest.fail("must not persist unverified purchase"))
    with pytest.raises(HTTPException) as error:
        asyncio.run(billing_routes.purchase_verify(
            billing_routes.PurchaseVerificationRequest(sku="mytwin_premium_monthly", token="opaque-token"),
            "user-1",
        ))
    assert error.value.status_code == expected_status


def test_verified_purchase_persists_only_hash_and_uses_atomic_rpc(monkeypatch):
    database = FakeDatabase()
    token = "opaque-google-purchase-token"
    expiry = (datetime.now(timezone.utc) + timedelta(days=29)).isoformat().replace("+00:00", "Z")
    monkeypatch.setattr(billing_routes, "_verify_google", lambda *_: {
        "product_id": "mytwin_premium_monthly",
        "expires_at": expiry,
        "subscription_state": "SUBSCRIPTION_STATE_ACTIVE",
        "acknowledgement_state": "ACKNOWLEDGEMENT_STATE_PENDING",
        "account_id_bound": True,
    })
    monkeypatch.setattr(billing_routes, "get_db", lambda: database)

    result = asyncio.run(billing_routes.purchase_verify(
        billing_routes.PurchaseVerificationRequest(sku="mytwin_premium_monthly", token=token),
        "user-1",
    ))

    assert result["success"] is True
    assert result["verified"] is True
    assert result["tier"] == "premium"
    assert len(database.calls) == 1
    rpc_name, arguments = database.calls[0]
    assert rpc_name == "commit_google_subscription"
    assert arguments["p_purchase_token_hash"] == hashlib.sha256(token.encode()).hexdigest()
    assert token not in repr(arguments)


def test_verifier_requires_live_matching_google_subscription(monkeypatch):
    expiry = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat().replace("+00:00", "Z")
    payload = {
        "subscriptionState": "SUBSCRIPTION_STATE_ACTIVE",
        "acknowledgementState": "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED",
        "lineItems": [{"productId": "mytwin_plus_monthly", "expiryTime": expiry}],
        "externalAccountIdentifiers": {
            "obfuscatedExternalAccountId": hashlib.sha256(b"mytwin:user-1").hexdigest(),
        },
    }
    monkeypatch.setattr(billing_routes, "_creds", lambda: {"test": True})
    monkeypatch.setattr(billing_routes, "_service_access_token", lambda _: "opaque-access-token")
    monkeypatch.setattr(billing_routes, "_http_json", lambda *_args, **_kwargs: payload)
    result = billing_routes._verify_google("mytwin_plus_monthly", "opaque-token", "user-1")
    assert result and result["subscription_state"] == "SUBSCRIPTION_STATE_ACTIVE"

    payload["subscriptionState"] = "SUBSCRIPTION_STATE_ON_HOLD"
    assert billing_routes._verify_google("mytwin_plus_monthly", "opaque-token", "user-1") is False

    payload["subscriptionState"] = "SUBSCRIPTION_STATE_ACTIVE"
    assert billing_routes._verify_google("mytwin_premium_monthly", "opaque-token", "user-1") is False


def test_account_binding_rejects_purchase_for_different_app_user(monkeypatch):
    expiry = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat().replace("+00:00", "Z")
    other_account = hashlib.sha256(b"mytwin:another-user").hexdigest()
    payload = {
        "subscriptionState": "SUBSCRIPTION_STATE_ACTIVE",
        "lineItems": [{"productId": "mytwin_plus_monthly", "expiryTime": expiry}],
        "externalAccountIdentifiers": {"obfuscatedExternalAccountId": other_account},
    }
    monkeypatch.setattr(billing_routes, "_creds", lambda: {"test": True})
    monkeypatch.setattr(billing_routes, "_service_access_token", lambda _: "opaque-access-token")
    monkeypatch.setattr(billing_routes, "_http_json", lambda *_args, **_kwargs: payload)
    assert billing_routes._verify_google("mytwin_plus_monthly", "opaque-token", "user-1") is False


def test_legacy_purchase_record_never_activates_a_tier():
    with pytest.raises(HTTPException) as error:
        asyncio.run(economy_routes.purchase_record({}, "user-1"))
    assert error.value.status_code == 410
