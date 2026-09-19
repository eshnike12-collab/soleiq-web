"""
Authentication for the scan API.

WHY THIS FILE EXISTS
--------------------
scan_routes.py was written for a service bound to loopback on one laptop, and
its docstring said so: "Local-only by design." Everything it exposes is
protected health information — POST /scans takes a video of an identified
patient's foot, GET /scans/{id}/frames/{n}/image serves those frames back, and
/debug renders every scan in the database as a gallery. Deployed publicly with
no auth, anyone who guesses a scan id reads a patient's photographs.

THE IDENTITY COMES FROM THE TOKEN, NEVER FROM THE REQUEST
---------------------------------------------------------
The web app used to compute `bankKeyFor(patientId, side)` in the *browser*
(Scan3DPanel.tsx) and send it as a form field. Any authenticated user could
therefore name any other patient's bank and read their frames — authentication
without authorisation. So `bank_id` is now derived here from the verified
token's subject. The client may still say which foot; it may not say who it is.

VERIFIED, NOT DECODED
---------------------
`jwt.decode(..., options={"verify_signature": False})` would accept a token
anyone can mint in a text editor. Supabase publishes its signing keys at
`/auth/v1/.well-known/jwks.json`, and asymmetric tokens are checked against
them. Projects still using the legacy shared HS256 secret are supported via
SUPABASE_JWT_SECRET, because that is what most existing projects actually run.

FAIL-CLOSED
-----------
With no verification material configured, requests from anywhere except
loopback are refused outright: a misconfigured deployment serves nothing
rather than serving PHI. The loopback check reads the socket peer, not
X-Forwarded-For, so a header cannot forge it.
"""

from __future__ import annotations

import logging
import os
import time
import urllib.request

import jwt
from fastapi import HTTPException, Request
from jwt import PyJWKClient

log = logging.getLogger("soleiq.serve.scan_auth")

#: Supabase project URL, e.g. https://abc.supabase.co
SUPABASE_URL_ENV = "SOLEIQ_SUPABASE_URL"
#: Legacy shared secret, for projects still issuing HS256 tokens.
JWT_SECRET_ENV = "SUPABASE_JWT_SECRET"
#: Supabase stamps every end-user token with this audience.
EXPECTED_AUDIENCE = "authenticated"

_LOOPBACK = {"127.0.0.1", "::1", "localhost"}

_jwk_client: PyJWKClient | None = None


def supabase_url() -> str:
    return os.environ.get(SUPABASE_URL_ENV, "").strip().rstrip("/")


def _jwks() -> PyJWKClient | None:
    """Cached JWKS client. Supabase rotates keys, so PyJWKClient caches and
    refetches on an unknown `kid` rather than pinning one key forever."""
    global _jwk_client
    url = supabase_url()
    if not url:
        return None
    if _jwk_client is None:
        _jwk_client = PyJWKClient(
            f"{url}/auth/v1/.well-known/jwks.json", cache_keys=True
        )
    return _jwk_client


def _configured() -> bool:
    return bool(supabase_url() or os.environ.get(JWT_SECRET_ENV, "").strip())


def verify_token(token: str) -> dict:
    """Returns verified claims, or raises HTTPException(401)."""
    try:
        header = jwt.get_unverified_header(token)
    except Exception:
        raise HTTPException(401, "Malformed token.") from None

    alg = header.get("alg", "")
    common = dict(
        algorithms=[alg] if alg else None,
        audience=EXPECTED_AUDIENCE,
        options={"require": ["exp", "sub"]},
    )

    try:
        if alg == "HS256":
            secret = os.environ.get(JWT_SECRET_ENV, "").strip()
            if not secret:
                raise HTTPException(
                    401, "This token is HS256 but no shared secret is configured."
                )
            claims = jwt.decode(token, secret, **common)
        else:
            client = _jwks()
            if client is None:
                raise HTTPException(
                    401, f"No JWKS source configured ({SUPABASE_URL_ENV} is unset)."
                )
            signing_key = client.get_signing_key_from_jwt(token).key
            claims = jwt.decode(token, signing_key, **common)
    except HTTPException:
        raise
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Session expired. Sign in again.") from None
    except jwt.InvalidAudienceError:
        raise HTTPException(401, "Token audience is not 'authenticated'.") from None
    except Exception as exc:  # signature, kid, malformed key material
        log.warning("token rejected: %s", type(exc).__name__)
        raise HTTPException(401, "Invalid token.") from None

    if not claims.get("sub"):
        raise HTTPException(401, "Token has no subject.")
    return claims


def require_scan_auth(request: Request) -> dict | None:
    """FastAPI dependency. Attach to every route that can reach PHI.

    Returns verified claims, or None on the loopback development path.
    """
    if not _configured():
        peer = request.client.host if request.client else ""
        if peer in _LOOPBACK:
            return None
        log.error(
            "refused %s from %s: neither %s nor %s is set",
            request.url.path, peer or "unknown", SUPABASE_URL_ENV, JWT_SECRET_ENV,
        )
        raise HTTPException(
            503,
            "This service is not configured to authenticate remote callers. "
            f"Set {SUPABASE_URL_ENV} (or {JWT_SECRET_ENV}) before exposing it.",
        )

    header = request.headers.get("authorization", "")
    if not header.lower().startswith("bearer "):
        raise HTTPException(401, "Missing bearer token.")
    return verify_token(header[7:].strip())


# ---------------------------------------------------------------------------
# Bank ownership
# ---------------------------------------------------------------------------

def bank_for(claims: dict | None, side: str) -> str | None:
    """The only place a bank id is constructed for an authenticated caller.

    None on the loopback path, where the caller supplies its own id.
    """
    if claims is None:
        return None
    return f"{claims['sub']}-{side}"


def owns_bank(claims: dict | None, bank_id: str | None) -> bool:
    if claims is None:
        return True  # loopback development
    if not bank_id:
        return False
    return bank_id.startswith(f"{claims['sub']}-")


def require_bank_owner(claims: dict | None, bank_id: str | None) -> None:
    """404, deliberately, not 403.

    A 403 confirms the id exists, which turns any scoping check into an
    existence oracle an attacker can enumerate against. Someone else's scan
    must be indistinguishable from a scan that was never there.
    """
    if not owns_bank(claims, bank_id):
        raise HTTPException(404, "Not found.")


def debug_ui_enabled() -> bool:
    """/debug renders raw patient frames, so it is off unless asked for."""
    return os.environ.get("SOLEIQ_DEBUG_UI", "").strip() == "1"
