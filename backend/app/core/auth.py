from functools import lru_cache
import json
from typing import Any
from urllib.error import URLError
from urllib.request import urlopen

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import InvalidTokenError, PyJWKClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.deps import get_db
from app.models.user import User


bearer_scheme = HTTPBearer(auto_error=True)


def _default_descope_discovery_url() -> str:
    if settings.descope_project_id:
        return f"https://api.descope.com/{settings.descope_project_id}/.well-known/openid-configuration"
    return ""


@lru_cache
def get_oidc_configuration() -> dict[str, Any]:
    discovery_url = settings.descope_discovery_url or _default_descope_discovery_url()
    if not discovery_url:
        return {}

    try:
        with urlopen(discovery_url, timeout=5) as response:
            return json.loads(response.read().decode("utf-8"))
    except (URLError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to fetch OIDC discovery configuration",
        ) from exc


def get_effective_jwks_url() -> str:
    if settings.descope_jwks_url:
        return settings.descope_jwks_url
    return str(get_oidc_configuration().get("jwks_uri") or "")


def get_effective_issuer() -> str:
    if settings.descope_issuer:
        return settings.descope_issuer
    return str(get_oidc_configuration().get("issuer") or "")


@lru_cache
def get_jwks_client() -> PyJWKClient:
    jwks_url = get_effective_jwks_url()
    if not jwks_url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="JWKS URL is not configured (set DESCOPE_JWKS_URL or DESCOPE_DISCOVERY_URL)",
        )
    return PyJWKClient(jwks_url)


def extract_roles(payload: dict[str, Any]) -> set[str]:
    roles: set[str] = set()

    direct_role = payload.get("role")
    if isinstance(direct_role, str):
        roles.add(direct_role)

    direct_roles = payload.get("roles")
    if isinstance(direct_roles, list):
        roles.update(str(role) for role in direct_roles)

    custom_claims = payload.get("customClaims")
    if isinstance(custom_claims, dict):
        custom_roles = custom_claims.get("roles")
        if isinstance(custom_roles, list):
            roles.update(str(role) for role in custom_roles)

    return roles


def verify_descope_jwt(token: str) -> dict[str, Any]:
    try:
        signing_key = get_jwks_client().get_signing_key_from_jwt(token).key

        decode_kwargs: dict[str, Any] = {
            "algorithms": ["RS256"],
            "options": {"require": ["exp", "iat", "sub"]},
        }

        if settings.descope_audience:
            decode_kwargs["audience"] = settings.descope_audience
        else:
            decode_kwargs["options"]["verify_aud"] = False

        issuer = get_effective_issuer()
        if issuer:
            decode_kwargs["issuer"] = issuer

        return jwt.decode(token, signing_key, **decode_kwargs)

    except InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        ) from exc


def _get_primary_role(roles: set[str]) -> str:
    if "super_admin" in roles:
        return "super_admin"
    if "admin" in roles:
        return "admin"
    return "user"


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    payload = verify_descope_jwt(credentials.credentials)
    descope_user_id = str(payload.get("sub") or "").strip()

    if not descope_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing subject (sub)",
        )

    email = str(payload.get("email") or f"{descope_user_id}@descope.local")
    full_name = payload.get("name")
    roles = extract_roles(payload)
    inferred_role = _get_primary_role(roles)

    user = db.scalar(select(User).where(User.descope_user_id == descope_user_id))

    if user is None:
        user = User(
            descope_user_id=descope_user_id,
            email=email,
            full_name=full_name if isinstance(full_name, str) else None,
            role=inferred_role,
            status="active",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        changed = False
        if user.email != email:
            user.email = email
            changed = True
        if isinstance(full_name, str) and user.full_name != full_name:
            user.full_name = full_name
            changed = True
        if inferred_role in {"admin", "super_admin"} and user.role != inferred_role:
            user.role = inferred_role
            changed = True
        if changed:
            db.commit()
            db.refresh(user)

    if user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is not active",
        )

    return user


def require_roles(allowed_roles: set[str]):
    def _role_dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return current_user

    return _role_dependency


def get_current_admin(current_user: User = Depends(require_roles({"admin", "super_admin"}))) -> User:
    return current_user
