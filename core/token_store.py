"""
token_store.py
==============
Güvenli token saklama ve otomatik yenileme katmanı (Veritabanı & AES-256 Şifreleme destekli).
Tokenlar SQLite veritabanına şifrelenmiş (AES-256/Fernet) olarak yazılır.
"""

import json
import time
import base64
import hashlib
from typing import Optional
from cryptography.fernet import Fernet

from config import Config
from core.db_manager import get_connection

# ─── Fernet Şifreleme Anahtarını Derleme ──────────────────────────────────────
# Config.APP_SECRET_KEY değerini SHA256'dan geçirip base64 url-safe formatına çeviriyoruz.
_KEY_HASH = hashlib.sha256(Config.APP_SECRET_KEY.encode("utf-8")).digest()
_FERNET_KEY = base64.urlsafe_b64encode(_KEY_HASH)
_cipher = Fernet(_FERNET_KEY)

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

def _encrypt_data(data: dict) -> str:
    """Dictionary verisini JSON string yapıp AES ile şifreler."""
    json_str = json.dumps(data)
    encrypted_bytes = _cipher.encrypt(json_str.encode("utf-8"))
    return encrypted_bytes.decode("utf-8")

def _decrypt_data(encrypted_str: str) -> dict:
    """AES şifreli string'i çözer ve dict'e çevirir."""
    decrypted_bytes = _cipher.decrypt(encrypted_str.encode("utf-8"))
    return json.loads(decrypted_bytes.decode("utf-8"))

# ─── Public API ──────────────────────────────────────────────────────────────

def save_token(platform: str, token_data: dict, profile: Optional[dict] = None, brand_id: str = "global") -> None:
    """
    Token'ı şifreleyerek veritabanına kaydeder.
    token_data: { access_token, refresh_token (opsiyonel), expires_at, token_type }
    profile:    { name, id, avatar_url } gibi ek profil bilgisi
    """
    key = platform.lower()
    encrypted_token_data = _encrypt_data(token_data)
    profile_json = json.dumps(profile or {})
    connected_at = int(time.time())
    
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT OR REPLACE INTO tokens (brand_id, platform, encrypted_token_data, profile_json, connected_at)
            VALUES (?, ?, ?, ?, ?)
        """, (brand_id, key, encrypted_token_data, profile_json, connected_at))
        conn.commit()
        print(f"[TokenStore] ✅ '{key}' token şifrelenerek veritabanına kaydedildi (Marka: {brand_id}).")
    except Exception as e:
        print(f"[TokenStore] ❌ Token kaydedilirken hata oluştu: {e}")
    finally:
        conn.close()

def get_token(platform: str, brand_id: str = "global") -> Optional[dict]:
    """
    Verilen platform için çözülmüş token kaydını döner.
    Geriye dönük uyumluluk için önce spesifik adı (örn: instagram) dener,
    bulamazsa parent platformu (örn: meta) dener.
    """
    key = platform.lower()
    conn = get_connection()
    cursor = conn.cursor()
    token = None
    try:
        cursor.execute("""
            SELECT encrypted_token_data, profile_json, connected_at 
            FROM tokens 
            WHERE brand_id = ? AND platform = ?
        """, (brand_id, key))
        row = cursor.fetchone()
        if row:
            token_data = _decrypt_data(row["encrypted_token_data"])
            profile_data = json.loads(row["profile_json"]) if row["profile_json"] else {}
            token = {
                **token_data,
                "connected_at": row["connected_at"],
                "profile": profile_data
            }
    except Exception as e:
        print(f"[TokenStore] ❌ Token okunurken veya çözülürken hata oluştu: {e}")
    finally:
        conn.close()

    if token:
        return token

    # Fallback to parent platform (örn: meta, google)
    parent = _resolve_platform(platform)
    if parent != key:
        return get_token(parent, brand_id)
    return None

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
    key = platform.lower()
    conn = get_connection()
    cursor = conn.cursor()
    try:
        # Silinecek platform
        cursor.execute("""
            DELETE FROM tokens 
            WHERE brand_id = ? AND platform = ?
        """, (brand_id, key))
        
        # Eğer bu bir alt-platform ise ve parent platform da varsa, parent'ı da sil
        parent = _resolve_platform(platform)
        if parent != key:
            cursor.execute("""
                DELETE FROM tokens 
                WHERE brand_id = ? AND platform = ?
            """, (brand_id, parent))
            
        conn.commit()
        print(f"[TokenStore] 🔌 '{key}' bağlantısı veritabanından kesildi (Marka: {brand_id}).")
    except Exception as e:
        print(f"[TokenStore] ❌ Bağlantı kesilirken hata oluştu: {e}")
    finally:
        conn.close()

def get_all_connection_status(brand_id: str = "global") -> dict:
    """
    Tüm platformların bağlantı durumunu döner.
    """
    platforms = [
        "meta", "google", "linkedin", "x", "tiktok", "pinterest", "bluesky",
        "facebook", "instagram", "threads", "whatsapp", "meta_ads", "youtube", "google_ads", "tiktok_ads"
    ]
    status = {}
    
    # Varsayılan boş durumları doldur
    for p in platforms:
        status[p] = {
            "connected":    False,
            "expires_at":   0,
            "connected_at": 0,
            "profile":      {},
        }
        
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT platform, encrypted_token_data, profile_json, connected_at 
            FROM tokens 
            WHERE brand_id = ?
        """, (brand_id,))
        rows = cursor.fetchall()
        for row in rows:
            plat = row["platform"]
            if plat in status:
                try:
                    token_data = _decrypt_data(row["encrypted_token_data"])
                    profile_data = json.loads(row["profile_json"]) if row["profile_json"] else {}
                    access = token_data.get("access_token", "")
                    expires_at = token_data.get("expires_at", 0)
                    connected = bool(access) and (expires_at == 0 or expires_at > time.time() + 30)
                    
                    status[plat] = {
                        "connected":    connected,
                        "expires_at":   expires_at,
                        "connected_at": row["connected_at"],
                        "profile":      profile_data,
                    }
                except Exception as e:
                    print(f"[TokenStore] Status çözülürken hata: {e}")
    except Exception as e:
        print(f"[TokenStore] Bağlantı durumları çekilirken hata: {e}")
    finally:
        conn.close()

    # Alt-platformlar üst platformun durumunu miras alır SADECE kendileri bağlı değilse ve parent bağlıysa!
    for sub, parent in _PLATFORM_GROUP.items():
        if not status[sub]["connected"]:
            parent_status = status.get(parent, {"connected": False, "profile": {}, "expires_at": 0})
            if parent_status["connected"]:
                status[sub] = parent_status

    return status

def try_refresh_token(platform: str, brand_id: str = "global") -> bool:
    """
    Eğer token süresi dolmuşsa yenilemeyi dene.
    """
    key = _resolve_platform(platform)
    token = get_token(key, brand_id)
    if not token:
        return False

    refresh_tok = token.get("refresh_token", "")
    if not refresh_tok:
        return False

    # Döngüsel import önleme
    from core.oauth_manager import GoogleOAuth, XOAuth

    result: dict = {}
    if key == "google":
        result = GoogleOAuth.refresh_token(refresh_tok)
    elif key == "x":
        result = XOAuth.refresh_token(refresh_tok)
    else:
        return False

    if "access_token" in result:
        token["access_token"] = result["access_token"]
        token["expires_at"] = int(time.time()) + result.get("expires_in", 3600)
        if "refresh_token" in result:
            token["refresh_token"] = result["refresh_token"]
        
        save_token(key, token, profile=token.get("profile"), brand_id=brand_id)
        print(f"[TokenStore] 🔄 '{key}' token başarıyla yenilendi (Marka: {brand_id}).")
        return True

    print(f"[TokenStore] ❌ '{key}' token yenilenemedi: {result.get('error')} (Marka: {brand_id})")
    return False
