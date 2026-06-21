"""
oauth_manager.py
================
Platform başına OAuth 2.0 flow yöneticisi.
Her platformun authorization URL oluşturma ve token alma mantığını kapsar.

Desteklenen platformlar:
  Meta (Facebook, Instagram, Threads, WhatsApp Business, Meta Ads)
  Google (YouTube, Google Ads, Looker Studio)
  LinkedIn
  X (Twitter)
  TikTok
  Pinterest
  Bluesky (AT Protocol — uygulama şifresi tabanlı)
"""

import hashlib
import hmac
import json
import os
import secrets
import time
import urllib.parse
import urllib.request
from typing import Optional

from config import Config


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _build_url(base: str, params: dict) -> str:
    return f"{base}?{urllib.parse.urlencode(params)}"


def _http_post(url: str, data: dict, headers: Optional[dict] = None) -> dict:
    """Basit urllib POST. Harici kütüphane gerektirmez."""
    encoded = urllib.parse.urlencode(data).encode("utf-8")
    req = urllib.request.Request(url, data=encoded, method="POST")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")
    req.add_header("Accept", "application/json")
    if headers:
        for k, v in headers.items():
            req.add_header(k, v)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        return {"error": str(e), "error_description": body}
    except Exception as e:
        return {"error": str(e)}


def _generate_state() -> str:
    """CSRF koruması için kriptografik olarak güvenli rastgele state."""
    return secrets.token_urlsafe(32)


def _pkce_pair() -> tuple[str, str]:
    """
    PKCE (RFC 7636) code_verifier ve code_challenge çifti üret.
    X (Twitter) OAuth 2.0 için zorunlu.
    """
    verifier = secrets.token_urlsafe(64)
    challenge = hashlib.sha256(verifier.encode()).digest()
    challenge_b64 = (
        __import__("base64")
        .urlsafe_b64encode(challenge)
        .rstrip(b"=")
        .decode()
    )
    return verifier, challenge_b64


# ─────────────────────────────────────────────────────────────────────────────
# META — Facebook · Instagram · Threads · WhatsApp · Meta Ads
# ─────────────────────────────────────────────────────────────────────────────

class MetaOAuth:
    AUTH_URL     = "https://www.facebook.com/v19.0/dialog/oauth"
    TOKEN_URL    = "https://graph.facebook.com/v19.0/oauth/access_token"
    LONG_TOKEN_URL = "https://graph.facebook.com/v19.0/oauth/access_token"

    @classmethod
    def authorization_url(cls, state: str) -> str:
        params = {
            "client_id":     Config.META_APP_ID,
            "redirect_uri":  Config.oauth_redirect_uri("meta"),
            "scope":         Config.META_SCOPES,
            "response_type": "code",
            "state":         state,
        }
        return _build_url(cls.AUTH_URL, params)

    @classmethod
    def exchange_code(cls, code: str) -> dict:
        """Authorization code → short-lived access token."""
        return _http_post(cls.TOKEN_URL, {
            "client_id":     Config.META_APP_ID,
            "client_secret": Config.META_APP_SECRET,
            "redirect_uri":  Config.oauth_redirect_uri("meta"),
            "code":          code,
        })

    @classmethod
    def exchange_long_lived(cls, short_token: str) -> dict:
        """Short-lived → long-lived (60 gün geçerli) user access token."""
        url = (
            f"{cls.LONG_TOKEN_URL}?"
            f"grant_type=fb_exchange_token"
            f"&client_id={Config.META_APP_ID}"
            f"&client_secret={Config.META_APP_SECRET}"
            f"&fb_exchange_token={short_token}"
        )
        req = urllib.request.Request(url)
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                return json.loads(resp.read().decode())
        except Exception as e:
            return {"error": str(e)}

    @classmethod
    def get_pages(cls, access_token: str) -> dict:
        """Kullanıcının yönettiği Facebook sayfalarını listele."""
        url = f"https://graph.facebook.com/v19.0/me/accounts?access_token={access_token}"
        try:
            with urllib.request.urlopen(url, timeout=10) as resp:
                return json.loads(resp.read().decode())
        except Exception as e:
            return {"error": str(e)}


# ─────────────────────────────────────────────────────────────────────────────
# GOOGLE — YouTube · Google Ads · Looker Studio
# ─────────────────────────────────────────────────────────────────────────────

class GoogleOAuth:
    AUTH_URL  = "https://accounts.google.com/o/oauth2/v2/auth"
    TOKEN_URL = "https://oauth2.googleapis.com/token"

    @classmethod
    def authorization_url(cls, state: str) -> str:
        params = {
            "client_id":             Config.GOOGLE_CLIENT_ID,
            "redirect_uri":          Config.oauth_redirect_uri("google"),
            "response_type":         "code",
            "scope":                 Config.GOOGLE_SCOPES,
            "state":                 state,
            "access_type":           "offline",   # refresh_token almak için
            "prompt":                "consent",   # her seferinde refresh_token gönder
        }
        return _build_url(cls.AUTH_URL, params)

    @classmethod
    def exchange_code(cls, code: str) -> dict:
        return _http_post(cls.TOKEN_URL, {
            "code":          code,
            "client_id":     Config.GOOGLE_CLIENT_ID,
            "client_secret": Config.GOOGLE_CLIENT_SECRET,
            "redirect_uri":  Config.oauth_redirect_uri("google"),
            "grant_type":    "authorization_code",
        })

    @classmethod
    def refresh_token(cls, refresh_tok: str) -> dict:
        return _http_post(cls.TOKEN_URL, {
            "client_id":     Config.GOOGLE_CLIENT_ID,
            "client_secret": Config.GOOGLE_CLIENT_SECRET,
            "refresh_token": refresh_tok,
            "grant_type":    "refresh_token",
        })


# ─────────────────────────────────────────────────────────────────────────────
# LINKEDIN
# ─────────────────────────────────────────────────────────────────────────────

class LinkedInOAuth:
    AUTH_URL  = "https://www.linkedin.com/oauth/v2/authorization"
    TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken"

    @classmethod
    def authorization_url(cls, state: str) -> str:
        params = {
            "response_type": "code",
            "client_id":     Config.LINKEDIN_CLIENT_ID,
            "redirect_uri":  Config.oauth_redirect_uri("linkedin"),
            "state":         state,
            "scope":         Config.LINKEDIN_SCOPES,
        }
        return _build_url(cls.AUTH_URL, params)

    @classmethod
    def exchange_code(cls, code: str) -> dict:
        return _http_post(cls.TOKEN_URL, {
            "grant_type":    "authorization_code",
            "code":          code,
            "client_id":     Config.LINKEDIN_CLIENT_ID,
            "client_secret": Config.LINKEDIN_CLIENT_SECRET,
            "redirect_uri":  Config.oauth_redirect_uri("linkedin"),
        })


# ─────────────────────────────────────────────────────────────────────────────
# X (TWITTER) — OAuth 2.0 + PKCE
# ─────────────────────────────────────────────────────────────────────────────

class XOAuth:
    AUTH_URL  = "https://twitter.com/i/oauth2/authorize"
    TOKEN_URL = "https://api.twitter.com/2/oauth2/token"

    @classmethod
    def authorization_url(cls, state: str, code_challenge: str) -> str:
        params = {
            "response_type":         "code",
            "client_id":             Config.X_CLIENT_ID,
            "redirect_uri":          Config.oauth_redirect_uri("x"),
            "scope":                 Config.X_SCOPES,
            "state":                 state,
            "code_challenge":        code_challenge,
            "code_challenge_method": "S256",
        }
        return _build_url(cls.AUTH_URL, params)

    @classmethod
    def exchange_code(cls, code: str, code_verifier: str) -> dict:
        import base64
        creds = base64.b64encode(
            f"{Config.X_CLIENT_ID}:{Config.X_CLIENT_SECRET}".encode()
        ).decode()
        return _http_post(
            cls.TOKEN_URL,
            {
                "code":          code,
                "grant_type":    "authorization_code",
                "redirect_uri":  Config.oauth_redirect_uri("x"),
                "code_verifier": code_verifier,
            },
            headers={"Authorization": f"Basic {creds}"},
        )

    @classmethod
    def refresh_token(cls, refresh_tok: str) -> dict:
        import base64
        creds = base64.b64encode(
            f"{Config.X_CLIENT_ID}:{Config.X_CLIENT_SECRET}".encode()
        ).decode()
        return _http_post(
            cls.TOKEN_URL,
            {"grant_type": "refresh_token", "refresh_token": refresh_tok},
            headers={"Authorization": f"Basic {creds}"},
        )


# ─────────────────────────────────────────────────────────────────────────────
# TIKTOK
# ─────────────────────────────────────────────────────────────────────────────

class TikTokOAuth:
    AUTH_URL  = "https://www.tiktok.com/v2/auth/authorize/"
    TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/"

    @classmethod
    def authorization_url(cls, state: str, code_challenge: str) -> str:
        params = {
            "client_key":            Config.TIKTOK_CLIENT_KEY,
            "scope":                 Config.TIKTOK_SCOPES,
            "response_type":         "code",
            "redirect_uri":          Config.oauth_redirect_uri("tiktok"),
            "state":                 state,
            "code_challenge":        code_challenge,
            "code_challenge_method": "S256",
        }
        return _build_url(cls.AUTH_URL, params)

    @classmethod
    def exchange_code(cls, code: str, code_verifier: str) -> dict:
        return _http_post(cls.TOKEN_URL, {
            "client_key":    Config.TIKTOK_CLIENT_KEY,
            "client_secret": Config.TIKTOK_CLIENT_SECRET,
            "code":          code,
            "grant_type":    "authorization_code",
            "redirect_uri":  Config.oauth_redirect_uri("tiktok"),
            "code_verifier": code_verifier,
        })


# ─────────────────────────────────────────────────────────────────────────────
# PINTEREST
# ─────────────────────────────────────────────────────────────────────────────

class PinterestOAuth:
    AUTH_URL  = "https://www.pinterest.com/oauth/"
    TOKEN_URL = "https://api.pinterest.com/v5/oauth/token"

    @classmethod
    def authorization_url(cls, state: str) -> str:
        params = {
            "client_id":     Config.PINTEREST_APP_ID,
            "redirect_uri":  Config.oauth_redirect_uri("pinterest"),
            "response_type": "code",
            "scope":         Config.PINTEREST_SCOPES,
            "state":         state,
        }
        return _build_url(cls.AUTH_URL, params)

    @classmethod
    def exchange_code(cls, code: str) -> dict:
        import base64
        creds = base64.b64encode(
            f"{Config.PINTEREST_APP_ID}:{Config.PINTEREST_APP_SECRET}".encode()
        ).decode()
        return _http_post(
            cls.TOKEN_URL,
            {
                "grant_type":   "authorization_code",
                "code":         code,
                "redirect_uri": Config.oauth_redirect_uri("pinterest"),
            },
            headers={"Authorization": f"Basic {creds}"},
        )


# ─────────────────────────────────────────────────────────────────────────────
# BLUESKY (AT Protocol — OAuth değil, uygulama şifresi kullanır)
# ─────────────────────────────────────────────────────────────────────────────

class BlueskyAuth:
    SERVER_URL = "https://bsky.social/xrpc"

    @classmethod
    def create_session(cls, identifier: str, app_password: str) -> dict:
        """
        AT Protocol createSession — access/refresh JWT döner.
        identifier: DID veya handle (ornek.bsky.social)
        app_password: Kullanıcının bsky.app/settings'ten oluşturduğu uygulama şifresi
        """
        url = f"{cls.SERVER_URL}/com.atproto.server.createSession"
        payload = json.dumps({"identifier": identifier, "password": app_password}).encode()
        req = urllib.request.Request(url, data=payload, method="POST")
        req.add_header("Content-Type", "application/json")
        req.add_header("Accept", "application/json")
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                return json.loads(resp.read().decode())
        except urllib.error.HTTPError as e:
            return {"error": e.read().decode()}
        except Exception as e:
            return {"error": str(e)}

    @classmethod
    def refresh_session(cls, refresh_jwt: str) -> dict:
        url = f"{cls.SERVER_URL}/com.atproto.server.refreshSession"
        req = urllib.request.Request(url, data=b"", method="POST")
        req.add_header("Authorization", f"Bearer {refresh_jwt}")
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                return json.loads(resp.read().decode())
        except Exception as e:
            return {"error": str(e)}


# ─────────────────────────────────────────────────────────────────────────────
# Platform Router — URL oluşturucu ve code exchanger
# ─────────────────────────────────────────────────────────────────────────────

# PKCE state'leri bellekte tutar (üretimde Redis/DB kullanın)
_oauth_state_store: dict[str, dict] = {}


def start_oauth_flow(platform: str, brand_id: str = "global") -> dict:
    """
    Verilen platform için OAuth başlatma parametrelerini döner.
    Return: { "redirect_url": str, "state": str }
    """
    platform = platform.lower()
    state = _generate_state()

    if platform in ("meta", "facebook", "instagram", "threads", "whatsapp", "meta_ads"):
        url = MetaOAuth.authorization_url(state)
        _oauth_state_store[state] = {"platform": platform, "brand_id": brand_id}

    elif platform in ("google", "youtube", "google_ads"):
        url = GoogleOAuth.authorization_url(state)
        _oauth_state_store[state] = {"platform": platform, "brand_id": brand_id}

    elif platform == "linkedin":
        url = LinkedInOAuth.authorization_url(state)
        _oauth_state_store[state] = {"platform": platform, "brand_id": brand_id}

    elif platform == "x":
        verifier, challenge = _pkce_pair()
        url = XOAuth.authorization_url(state, challenge)
        _oauth_state_store[state] = {"platform": platform, "code_verifier": verifier, "brand_id": brand_id}

    elif platform == "tiktok":
        verifier, challenge = _pkce_pair()
        url = TikTokOAuth.authorization_url(state, challenge)
        _oauth_state_store[state] = {"platform": platform, "code_verifier": verifier, "brand_id": brand_id}

    elif platform == "pinterest":
        url = PinterestOAuth.authorization_url(state)
        _oauth_state_store[state] = {"platform": platform, "brand_id": brand_id}

    else:
        return {"error": f"Desteklenmeyen platform: {platform}"}

    return {"redirect_url": url, "state": state}


def handle_oauth_callback(platform: str, code: str, state: str) -> dict:
    """
    OAuth callback'ten gelen code ve state ile token alışverişi yapar.
    Return: { "success": bool, "platform": str, "token_data": dict, "brand_id": str }
    """
    platform = platform.lower()
    state_data = _oauth_state_store.pop(state, None)

    if state_data is None:
        return {"success": False, "error": "Geçersiz veya süresi dolmuş state parametresi."}

    brand_id = state_data.get("brand_id", "global")
    original_platform = state_data.get("platform", platform)
    token_data: dict = {}

    try:
        if platform in ("meta", "facebook", "instagram", "threads", "whatsapp", "meta_ads"):
            short = MetaOAuth.exchange_code(code)
            if "error" in short:
                return {"success": False, "error": short}
            short_tok = short.get("access_token", "")
            long = MetaOAuth.exchange_long_lived(short_tok)
            token_data = {
                "access_token":  long.get("access_token", short_tok),
                "token_type":    "bearer",
                "expires_at":    int(time.time()) + long.get("expires_in", 5183944),
            }

        elif platform in ("google", "youtube", "google_ads"):
            result = GoogleOAuth.exchange_code(code)
            if "error" in result:
                return {"success": False, "error": result}
            token_data = {
                "access_token":  result.get("access_token", ""),
                "refresh_token": result.get("refresh_token", ""),
                "token_type":    result.get("token_type", "bearer"),
                "expires_at":    int(time.time()) + result.get("expires_in", 3600),
            }

        elif platform == "linkedin":
            result = LinkedInOAuth.exchange_code(code)
            if "error" in result:
                return {"success": False, "error": result}
            token_data = {
                "access_token": result.get("access_token", ""),
                "token_type":   "bearer",
                "expires_at":   int(time.time()) + result.get("expires_in", 5183944),
            }

        elif platform == "x":
            verifier = state_data.get("code_verifier", "")
            result = XOAuth.exchange_code(code, verifier)
            if "error" in result:
                return {"success": False, "error": result}
            token_data = {
                "access_token":  result.get("access_token", ""),
                "refresh_token": result.get("refresh_token", ""),
                "token_type":    result.get("token_type", "bearer"),
                "expires_at":    int(time.time()) + result.get("expires_in", 7200),
            }

        elif platform == "tiktok":
            verifier = state_data.get("code_verifier", "")
            result = TikTokOAuth.exchange_code(code, verifier)
            if "error" in result:
                return {"success": False, "error": result}
            token_data = {
                "access_token":  result.get("access_token", ""),
                "refresh_token": result.get("refresh_token", ""),
                "token_type":    "bearer",
                "expires_at":    int(time.time()) + result.get("expires_in", 86400),
            }

        elif platform == "pinterest":
            result = PinterestOAuth.exchange_code(code)
            if "error" in result:
                return {"success": False, "error": result}
            token_data = {
                "access_token":  result.get("access_token", ""),
                "refresh_token": result.get("refresh_token", ""),
                "token_type":    "bearer",
                "expires_at":    int(time.time()) + result.get("expires_in", 2592000),
            }

        else:
            return {"success": False, "error": f"Desteklenmeyen platform: {platform}"}

    except Exception as e:
        return {"success": False, "error": str(e)}

    return {"success": True, "platform": original_platform, "token_data": token_data, "brand_id": brand_id}


def connect_bluesky(identifier: str, app_password: str) -> dict:
    """Bluesky bağlantısı — doğrudan uygulama şifresiyle."""
    result = BlueskyAuth.create_session(identifier, app_password)
    if "error" in result or "accessJwt" not in result:
        return {"success": False, "error": result.get("error", "Bilinmeyen hata")}
    return {
        "success": True,
        "platform": "bluesky",
        "token_data": {
            "access_token":  result["accessJwt"],
            "refresh_token": result.get("refreshJwt", ""),
            "did":           result.get("did", ""),
            "handle":        result.get("handle", ""),
            "token_type":    "bearer",
            "expires_at":    int(time.time()) + 7200,
        },
    }
