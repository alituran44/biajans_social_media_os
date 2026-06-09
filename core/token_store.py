"""
token_store.py
==============
Güvenli token saklama ve otomatik yenileme katmanı.

Tokenlar 'core/tokens.json' dosyasına kaydedilir.
Üretim ortamında bu dosyayı şifrelenmiş bir veritabanıyla değiştirin.

Yapı:
{
  "meta": {
    "access_token": "...",
    "refresh_token": "...",
    "expires_at": 1234567890,
    "connected_at": 1234567890,
    "profile": { "name": "...", "id": "..." }
  },
  "google": { ... },
  ...
}
"""

import json
import os
import time
from typing import Optional

# Token dosyası yolu
_TOKEN_FILE = os.path.join(os.path.dirname(__file__), "tokens.json")

# Platform grupları: alt-platformlar birincil platform tokenını paylaşır
_PLATFORM_GROUP = {
    "facebook":  "meta",
    "instagram": "meta",
    "threads":   "meta",
    "whatsapp":  "meta",
    "meta_ads":  "meta",
    "youtube":   "google",
    "google_ads":"google",
}


def _resolve_platform(platform: str) -> str:
    """Alt-platformu birincil platform anahtarına çöz."""
    return _PLATFORM_GROUP.get(platform.lower(), platform.lower())


def _load_all() -> dict:
    """Token dosyasını oku. Dosya yoksa boş dict döner."""
    if not os.path.exists(_TOKEN_FILE):
        return {}
    try:
        with open(_TOKEN_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def _save_all(data: dict) -> None:
    """Token dosyasına yaz."""
    os.makedirs(os.path.dirname(_TOKEN_FILE), exist_ok=True)
    with open(_TOKEN_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


# Helper to load tokens specifically for a brand
def _load_brand_tokens(brand_id: str = "global") -> dict:
    all_tokens = _load_all()
    # Check if there is flat format
    is_old_format = False
    for k, v in all_tokens.items():
        if k in ["meta", "google", "linkedin", "x", "tiktok", "pinterest", "bluesky"] and isinstance(v, dict) and "access_token" in v:
            is_old_format = True
            break
            
    if is_old_format:
        # Migrate flat format to global brand
        all_tokens = {"global": all_tokens}
        _save_all(all_tokens)
        
    return all_tokens.get(brand_id, {})

# ─── Public API ──────────────────────────────────────────────────────────────

def save_token(platform: str, token_data: dict, profile: Optional[dict] = None, brand_id: str = "global") -> None:
    """
    Token'ı kaydet.
    token_data: { access_token, refresh_token (opsiyonel), expires_at, token_type }
    profile:    { name, id, avatar_url } gibi ek profil bilgisi
    """
    key = _resolve_platform(platform)
    all_tokens = _load_all()
    
    is_old_format = False
    for k, v in all_tokens.items():
        if k in ["meta", "google", "linkedin", "x", "tiktok", "pinterest", "bluesky"] and isinstance(v, dict) and "access_token" in v:
            is_old_format = True
            break
    if is_old_format:
        all_tokens = {"global": all_tokens}
        
    if brand_id not in all_tokens:
        all_tokens[brand_id] = {}
        
    all_tokens[brand_id][key] = {
        **token_data,
        "connected_at": int(time.time()),
        "profile": profile or {},
    }
    _save_all(all_tokens)
    print(f"[TokenStore] ✅ '{key}' token kaydedildi (Marka: {brand_id}).")


def get_token(platform: str, brand_id: str = "global") -> Optional[dict]:
    """
    Verilen platform için token kaydını döner.
    Token bulunamazsa None döner.
    """
    key = _resolve_platform(platform)
    brand_tokens = _load_brand_tokens(brand_id)
    return brand_tokens.get(key)


def is_connected(platform: str, brand_id: str = "global") -> bool:
    """Platforma ait geçerli bir token var mı?"""
    token = get_token(platform, brand_id)
    if not token:
        return False
    access = token.get("access_token", "")
    if not access:
        return False
    # Token süresi dolmuş mu? (30 saniye erken kontrol)
    expires_at = token.get("expires_at", 0)
    if expires_at and expires_at < time.time() + 30:
        return False
    return True


def is_expired(platform: str, brand_id: str = "global") -> bool:
    """Token mevcut ama süresi dolmuş mu?"""
    token = get_token(platform, brand_id)
    if not token:
        return False
    expires_at = token.get("expires_at", 0)
    return expires_at > 0 and expires_at < time.time() + 30


def revoke_token(platform: str, brand_id: str = "global") -> None:
    """Platformun token kaydını sil (bağlantıyı kes)."""
    key = _resolve_platform(platform)
    all_tokens = _load_all()
    
    is_old_format = False
    for k, v in all_tokens.items():
        if k in ["meta", "google", "linkedin", "x", "tiktok", "pinterest", "bluesky"] and isinstance(v, dict) and "access_token" in v:
            is_old_format = True
            break
    if is_old_format:
        all_tokens = {"global": all_tokens}
        
    if brand_id in all_tokens and key in all_tokens[brand_id]:
        del all_tokens[brand_id][key]
        _save_all(all_tokens)
        print(f"[TokenStore] 🔌 '{key}' bağlantısı kesildi (Marka: {brand_id}).")


def get_all_connection_status(brand_id: str = "global") -> dict:
    """
    Tüm platformların bağlantı durumunu döner.
    Frontend'in /api/connections/status endpoint'i için kullanılır.
    """
    brand_tokens = _load_brand_tokens(brand_id)
    platforms = [
        "meta", "google", "linkedin", "x", "tiktok", "pinterest", "bluesky"
    ]
    status = {}
    for p in platforms:
        token = brand_tokens.get(p, {})
        access = token.get("access_token", "")
        expires_at = token.get("expires_at", 0)
        connected = bool(access) and (expires_at == 0 or expires_at > time.time() + 30)
        status[p] = {
            "connected":    connected,
            "expires_at":   expires_at,
            "connected_at": token.get("connected_at", 0),
            "profile":      token.get("profile", {}),
        }

    # Alt-platformlar üst platformun durumunu miras alır
    for sub, parent in _PLATFORM_GROUP.items():
        status[sub] = status.get(parent, {"connected": False, "profile": {}, "expires_at": 0})

    return status


def try_refresh_token(platform: str, brand_id: str = "global") -> bool:
    """
    Eğer token süresi dolmuşsa yenilemeyi dene.
    Başarılıysa True, başarısız veya refresh_token yoksa False döner.
    """
    key = _resolve_platform(platform)
    token = get_token(key, brand_id)
    if not token:
        return False

    refresh_tok = token.get("refresh_token", "")
    if not refresh_tok:
        return False

    # Lazy import — döngüsel import önleme
    from core.oauth_manager import GoogleOAuth, XOAuth

    result: dict = {}
    if key == "google":
        result = GoogleOAuth.refresh_token(refresh_tok)
    elif key == "x":
        result = XOAuth.refresh_token(refresh_tok)
    else:
        # Meta, LinkedIn, TikTok, Pinterest refresh flow eklenebilir
        return False

    if "access_token" in result:
        token["access_token"] = result["access_token"]
        token["expires_at"] = int(time.time()) + result.get("expires_in", 3600)
        if "refresh_token" in result:
            token["refresh_token"] = result["refresh_token"]
        
        all_tokens = _load_all()
        is_old_format = False
        for k, v in all_tokens.items():
            if k in ["meta", "google", "linkedin", "x", "tiktok", "pinterest", "bluesky"] and isinstance(v, dict) and "access_token" in v:
                is_old_format = True
                break
        if is_old_format:
            all_tokens = {"global": all_tokens}
            
        if brand_id not in all_tokens:
            all_tokens[brand_id] = {}
        all_tokens[brand_id][key] = token
        _save_all(all_tokens)
        print(f"[TokenStore] 🔄 '{key}' token başarıyla yenilendi (Marka: {brand_id}).")
        return True

    print(f"[TokenStore] ❌ '{key}' token yenilenemedi: {result.get('error')} (Marka: {brand_id})")
    return False
