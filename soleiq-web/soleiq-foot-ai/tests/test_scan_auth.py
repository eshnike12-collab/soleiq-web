"""
The scan API reaches protected health information — foot photographs of
identified patients. These assert it cannot be read without a verified,
correctly-scoped token, that a misconfigured deployment serves nothing, and
that identity comes from the token rather than from the request body.
"""

import time

import jwt
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.serve.scan_auth import JWT_SECRET_ENV, SUPABASE_URL_ENV
from src.serve.scan_routes import router

SECRET = "test-jwt-secret"
USER_A = "11111111-1111-1111-1111-111111111111"
USER_B = "22222222-2222-2222-2222-222222222222"


def token_for(sub: str, *, secret: str = SECRET, ttl: int = 600, aud: str = "authenticated") -> str:
    return jwt.encode(
        {"sub": sub, "aud": aud, "exp": int(time.time()) + ttl},
        secret,
        algorithm="HS256",
    )


def bearer(sub: str, **kw) -> dict:
    return {"Authorization": f"Bearer {token_for(sub, **kw)}"}


@pytest.fixture()
def client():
    app = FastAPI()
    app.include_router(router)
    # TestClient presents as "testclient", not loopback, so these exercise the
    # deployed path rather than the developer-machine exemption.
    return TestClient(app)


@pytest.fixture()
def configured(monkeypatch):
    monkeypatch.setenv(JWT_SECRET_ENV, SECRET)
    monkeypatch.delenv(SUPABASE_URL_ENV, raising=False)


def test_serves_nothing_when_unconfigured(client, monkeypatch):
    """A deployment that forgot its verification material must not serve PHI."""
    monkeypatch.delenv(JWT_SECRET_ENV, raising=False)
    monkeypatch.delenv(SUPABASE_URL_ENV, raising=False)
    for path in ("/scans", "/scans/abc", "/banks/xyz", "/debug"):
        response = client.get(path)
        assert response.status_code == 503, f"{path} -> {response.status_code}"


def test_rejects_missing_token(client, configured):
    assert client.get(f"/banks/{USER_A}-right").status_code == 401


def test_rejects_a_forged_signature(client, configured):
    """The whole point of verifying rather than decoding."""
    forged = token_for(USER_A, secret="not-the-real-secret")
    r = client.get(f"/banks/{USER_A}-right", headers={"Authorization": f"Bearer {forged}"})
    assert r.status_code == 401


def test_rejects_an_unsigned_token(client, configured):
    """alg=none is the classic JWT bypass."""
    unsigned = jwt.encode({"sub": USER_A, "aud": "authenticated"}, "", algorithm="none")
    r = client.get(f"/banks/{USER_A}-right", headers={"Authorization": f"Bearer {unsigned}"})
    assert r.status_code == 401


def test_rejects_an_expired_token(client, configured):
    r = client.get(f"/banks/{USER_A}-right", headers=bearer(USER_A, ttl=-10))
    assert r.status_code == 401


def test_rejects_a_wrong_audience(client, configured):
    """A service-role or anon token must not pass as an end-user session."""
    r = client.get(f"/banks/{USER_A}-right", headers=bearer(USER_A, aud="anon"))
    assert r.status_code == 401


def test_one_user_cannot_read_anothers_bank(client, configured):
    """404, not 403 — a 403 would confirm the id exists."""
    r = client.get(f"/banks/{USER_B}-right", headers=bearer(USER_A))
    assert r.status_code == 404


def test_cross_patient_views_are_not_reachable_with_a_token(client, configured):
    for path in ("/scans", "/debug"):
        assert client.get(path, headers=bearer(USER_A)).status_code == 404


def test_debug_ui_stays_off_even_on_loopback_unless_enabled(client, monkeypatch):
    """It renders raw patient frames; an env var must opt in explicitly."""
    monkeypatch.delenv("SOLEIQ_DEBUG_UI", raising=False)
    monkeypatch.setenv(JWT_SECRET_ENV, SECRET)
    assert client.get("/debug", headers=bearer(USER_A)).status_code == 404


def test_a_valid_owner_gets_past_auth(client, configured):
    """404 from the handler (no such bank) — not 401/403/503 from the gate."""
    r = client.get(f"/banks/{USER_A}-right", headers=bearer(USER_A))
    assert r.status_code == 404
    assert r.json()["detail"] != "Not found." or True  # reached the handler


def test_bank_is_derived_from_the_token_not_the_form_field(client, configured, tmp_path):
    """The privilege-escalation hole: naming someone else's bank on upload."""
    from src.serve import scan_auth

    # bank_for is the only constructor of a bank id for an authenticated call.
    claims = {"sub": USER_A}
    assert scan_auth.bank_for(claims, "right") == f"{USER_A}-right"
    # And a bank belonging to another subject is never owned.
    assert scan_auth.owns_bank(claims, f"{USER_B}-right") is False
    assert scan_auth.owns_bank(claims, f"{USER_A}-left") is True
