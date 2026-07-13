import json
import os
import requests
from datetime import datetime
from core.token_store import get_token
from config import Config

# --- BLUESKY ---
def publish_to_bluesky(text: str, media_url: str = None, brand_id: str = "global") -> dict:
    token = get_token("bluesky", brand_id=brand_id)
    if not token or not token.get("access_token") or not token.get("did"):
        return {"success": False, "error": "Bluesky bağlanmamış veya token süresi dolmuş."}
        
    url = "https://bsky.social/xrpc/com.atproto.repo.createRecord"
    headers = {
        "Authorization": f"Bearer {token['access_token']}",
        "Content-Type": "application/json"
    }
    
    now = datetime.utcnow().isoformat()[:-3] + "Z"
    record = {
        "$type": "app.bsky.feed.post",
        "text": text,
        "createdAt": now
    }
    
    payload = {
        "repo": token["did"],
        "collection": "app.bsky.feed.post",
        "record": record
    }
    
    try:
        req = requests.post(url, headers=headers, json=payload, timeout=15)
        res = req.json()
        if req.status_code == 200:
            return {"success": True, "platform": "bluesky", "data": res}
        else:
            return {"success": False, "platform": "bluesky", "error": str(res)}
    except Exception as e:
        return {"success": False, "platform": "bluesky", "error": str(e)}

# --- X (TWITTER) ---
def publish_to_x(text: str, media_url: str = None, brand_id: str = "global") -> dict:
    token = get_token("x", brand_id=brand_id)
    if not token or not token.get("access_token"):
        return {"success": False, "error": "X (Twitter) bağlanmamış veya token eksik."}
        
    url = "https://api.twitter.com/2/tweets"
    headers = {
        "Authorization": f"Bearer {token['access_token']}",
        "Content-Type": "application/json"
    }
    
    payload = {"text": text}
    
    try:
        req = requests.post(url, headers=headers, json=payload, timeout=15)
        res = req.json()
        if req.status_code in (200, 201):
            return {"success": True, "platform": "x", "data": res}
        else:
            return {"success": False, "platform": "x", "error": str(res)}
    except Exception as e:
        return {"success": False, "platform": "x", "error": str(e)}

# --- FACEBOOK ---
def publish_to_facebook(text: str, media_url: str = None, brand_id: str = "global") -> dict:
    token = get_token("facebook", brand_id=brand_id) or get_token("meta", brand_id=brand_id)
    if not token or not token.get("access_token"):
        return {"success": False, "error": "Facebook bağlanmamış."}
    
    page_id = "me" 
    access_token = token["access_token"]
    
    if media_url:
        url = f"https://graph.facebook.com/v19.0/{page_id}/photos"
        payload = {"url": media_url, "caption": text, "access_token": access_token}
    else:
        url = f"https://graph.facebook.com/v19.0/{page_id}/feed"
        payload = {"message": text, "access_token": access_token}
        
    try:
        req = requests.post(url, data=payload, timeout=15)
        res = req.json()
        if req.status_code == 200:
            return {"success": True, "platform": "facebook", "data": res}
        else:
            return {"success": False, "platform": "facebook", "error": str(res)}
    except Exception as e:
        return {"success": False, "platform": "facebook", "error": str(e)}

# --- INSTAGRAM ---
def publish_to_instagram(text: str, media_url: str = None, brand_id: str = "global") -> dict:
    token = get_token("instagram", brand_id=brand_id) or get_token("meta", brand_id=brand_id)
    if not token or not token.get("access_token"):
        return {"success": False, "error": "Instagram bağlanmamış."}
    
    if not media_url:
        return {"success": False, "error": "Instagram API'si görsel veya video olmadan metin paylaşımına izin vermez. Lütfen medyanızı yükleyin."}
        
    ig_user_id = "me"
    access_token = token["access_token"]
    
    container_url = f"https://graph.facebook.com/v19.0/{ig_user_id}/media"
    container_payload = {"image_url": media_url, "caption": text, "access_token": access_token}
    
    try:
        req1 = requests.post(container_url, data=container_payload, timeout=15)
        res1 = req1.json()
        if req1.status_code != 200:
            return {"success": False, "platform": "instagram", "error": "Container oluşturulamadı: " + str(res1)}
            
        creation_id = res1.get("id")
        
        publish_url = f"https://graph.facebook.com/v19.0/{ig_user_id}/media_publish"
        publish_payload = {"creation_id": creation_id, "access_token": access_token}
        
        req2 = requests.post(publish_url, data=publish_payload, timeout=15)
        res2 = req2.json()
        if req2.status_code == 200:
            return {"success": True, "platform": "instagram", "data": res2}
        else:
            return {"success": False, "platform": "instagram", "error": str(res2)}
    except Exception as e:
        return {"success": False, "platform": "instagram", "error": str(e)}

# --- LINKEDIN ---
def publish_to_linkedin(text: str, media_url: str = None, brand_id: str = "global") -> dict:
    token = get_token("linkedin", brand_id=brand_id)
    if not token or not token.get("access_token"):
        return {"success": False, "error": "LinkedIn bağlanmamış."}
        
    url = "https://api.linkedin.com/v2/ugcPosts"
    headers = {
        "Authorization": f"Bearer {token['access_token']}",
        "X-Restli-Protocol-Version": "2.0.0",
        "Content-Type": "application/json"
    }
    
    author_urn = "urn:li:person:YOUR_ID"
    
    payload = {
        "author": author_urn,
        "lifecycleState": "PUBLISHED",
        "specificContent": {
            "com.linkedin.ugc.ShareContent": {
                "shareCommentary": {"text": text},
                "shareMediaCategory": "NONE"
            }
        },
        "visibility": {"com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"}
    }
    
    if media_url:
        payload["specificContent"]["com.linkedin.ugc.ShareContent"]["shareMediaCategory"] = "ARTICLE"
        payload["specificContent"]["com.linkedin.ugc.ShareContent"]["media"] = [
            {"status": "READY", "originalUrl": media_url}
        ]
    
    try:
        req = requests.post(url, headers=headers, json=payload, timeout=15)
        res = req.json()
        if req.status_code in (200, 201):
            return {"success": True, "platform": "linkedin", "data": res}
        else:
            return {"success": False, "platform": "linkedin", "error": str(res)}
    except Exception as e:
        return {"success": False, "platform": "linkedin", "error": str(e)}

# --- TIKTOK ---
def publish_to_tiktok(text: str, media_url: str = None, brand_id: str = "global") -> dict:
    """
    TikTok Content Posting API v2 kullanılarak doğrudan video paylaşımı tetiklenir.
    """
    token = get_token("tiktok", brand_id=brand_id)
    if not token or not token.get("access_token"):
        return {"success": False, "error": "TikTok yetkilendirmesi bulunamadı. Lütfen Ayarlar > Entegrasyonlar kısmından TikTok'u bağlayın."}
        
    if not media_url:
        return {"success": False, "error": "TikTok API'si video olmadan doğrudan paylaşım yapamaz. Lütfen bir video URL'si ekleyin."}
        
    access_token = token["access_token"]
    url = "https://open.tiktokapis.com/v2/post/publish/video/init/"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json; charset=UTF-8"
    }
    
    payload = {
        "post_info": {
            "title": text,
            "privacy_level": "PUBLIC_TO_EVERYONE",
            "disable_duet": False,
            "disable_stitch": False,
            "disable_comment": False
        },
        "source_info": {
            "source": "PULL_FROM_URL",
            "video_url": media_url
        }
    }
    
    try:
        res = requests.post(url, headers=headers, json=payload, timeout=15)
        res_data = res.json()
        if "error" in res_data and res_data["error"].get("code") != "ok":
            return {"success": False, "platform": "tiktok", "error": res_data["error"].get("message")}
            
        return {"success": True, "platform": "tiktok", "data": res_data.get("data", {})}
    except Exception as e:
        return {"success": False, "platform": "tiktok", "error": str(e)}

# --- YOUTUBE ---
def publish_to_youtube(text: str, media_url: str = None, brand_id: str = "global") -> dict:
    """
    YouTube Data API v3 üzerinden multipart video yüklemesi gerçekleştirilir.
    """
    token = get_token("youtube", brand_id=brand_id) or get_token("google", brand_id=brand_id)
    if not token or not token.get("access_token"):
        return {"success": False, "error": "YouTube yetkilendirmesi bulunamadı. Lütfen Ayarlar > Entegrasyonlar kısmından YouTube (Google) bağlayın."}
        
    if not media_url:
        return {"success": False, "error": "YouTube'a sadece video yüklenebilir. Lütfen video URL'sini belirtin."}
        
    access_token = token["access_token"]
    
    # 1. Medya dosyasını indir
    try:
        video_response = requests.get(media_url, stream=True, timeout=30)
        if not video_response.ok:
            return {"success": False, "error": f"Belirtilen video URL'sinden video indirilemedi: HTTP {video_response.status_code}"}
        video_content = video_response.content
    except Exception as e:
        return {"success": False, "error": f"Video indirilirken hata oluştu: {str(e)}"}
        
    # 2. YouTube API'ye multipart olarak yükle
    url = "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status"
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    
    metadata = {
        "snippet": {
            "title": text[:100] if len(text) > 100 else text,
            "description": text,
            "categoryId": "22"
        },
        "status": {
            "privacyStatus": "public",
            "selfDeclaredMadeForKids": False
        }
    }
    
    files = {
        "json": (None, json.dumps(metadata), "application/json; charset=UTF-8"),
        "media": ("video.mp4", video_content, "video/mp4")
    }
    
    try:
        res = requests.post(url, headers=headers, files=files, timeout=60)
        res_data = res.json()
        if "error" in res_data:
            return {"success": False, "platform": "youtube", "error": res_data["error"].get("message")}
            
        return {"success": True, "platform": "youtube", "data": res_data}
    except Exception as e:
        return {"success": False, "platform": "youtube", "error": str(e)}

# --- WHATSAPP (META CLOUD API) ---
def publish_to_whatsapp(text: str, media_url: str = None) -> dict:
    """WhatsApp Business API üzerinden şablon veya mesaj gönderimi"""
    app_id = Config.META_APP_ID
    token = os.getenv("META_USER_ACCESS_TOKEN", "YOUR_WHATSAPP_TOKEN")
    phone_number_id = os.getenv("WHATSAPP_PHONE_ID", "PHONE_ID")
    
    url = f"https://graph.facebook.com/v19.0/{phone_number_id}/messages"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": "TARGET_PHONE_NUMBER",
        "type": "text",
        "text": {
            "preview_url": True,
            "body": text
        }
    }
    
    try:
        if token == "YOUR_WHATSAPP_TOKEN":
            return {"success": True, "platform": "whatsapp", "data": {"message": "Simüle edildi: WhatsApp mesajı sıraya alındı (Gerçek Token bekleniyor)."}}
            
        req = requests.post(url, headers=headers, json=payload, timeout=10)
        res = req.json()
        if req.status_code in (200, 201):
            return {"success": True, "platform": "whatsapp", "data": res}
        else:
            return {"success": False, "platform": "whatsapp", "error": str(res)}
    except Exception as e:
        return {"success": False, "platform": "whatsapp", "error": str(e)}

# --- GOOGLE İŞLETME PROFİLİ (GMB) ---
def publish_to_gmb(text: str, media_url: str = None) -> dict:
    """Google Business Profile API üzerinden Local Post atma"""
    token = os.getenv("GOOGLE_ACCESS_TOKEN", "YOUR_GOOGLE_TOKEN")
    account_id = os.getenv("GMB_ACCOUNT_ID", "ACCOUNT_ID")
    location_id = os.getenv("GMB_LOCATION_ID", "LOCATION_ID")
    
    url = f"https://mybusiness.googleapis.com/v4/accounts/{account_id}/locations/{location_id}/localPosts"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "languageCode": "tr",
        "summary": text,
        "callToAction": {
            "actionType": "LEARN_MORE",
            "url": "https://siteniz.com"
        }
    }
    
    if media_url:
        payload["media"] = [
            {
                "mediaFormat": "PHOTO",
                "sourceUrl": media_url
            }
        ]
        
    try:
        if token == "YOUR_GOOGLE_TOKEN":
             return {"success": True, "platform": "gmb", "data": {"message": "Simüle edildi: Google İşletme Profili gönderisi paylaşıldı (Gerçek Token bekleniyor)."}}
             
        req = requests.post(url, headers=headers, json=payload, timeout=10)
        res = req.json()
        if req.status_code in (200, 201):
            return {"success": True, "platform": "gmb", "data": res}
        else:
            return {"success": False, "platform": "gmb", "error": str(res)}
    except Exception as e:
        return {"success": False, "platform": "gmb", "error": str(e)}

def publish_content(platform: str, text: str, media_url: str = None, brand_id: str = "global") -> dict:
    """Yayınlama Yönlendiricisi (Router)"""
    platform = platform.lower()
    
    if platform == "bluesky":
        return publish_to_bluesky(text, media_url, brand_id=brand_id)
    elif platform in ["x", "twitter"]:
        return publish_to_x(text, media_url, brand_id=brand_id)
    elif platform == "facebook":
        return publish_to_facebook(text, media_url, brand_id=brand_id)
    elif platform == "instagram":
        return publish_to_instagram(text, media_url, brand_id=brand_id)
    elif platform == "linkedin":
        return publish_to_linkedin(text, media_url, brand_id=brand_id)
    elif platform == "tiktok":
        return publish_to_tiktok(text, media_url, brand_id=brand_id)
    elif platform == "youtube":
        return publish_to_youtube(text, media_url, brand_id=brand_id)
    elif platform == "whatsapp":
        return publish_to_whatsapp(text, media_url)
    elif platform in ["gmb", "google_business", "google işletme profili"]:
        return publish_to_gmb(text, media_url)
    else:
        return {"success": False, "error": f"Desteklenmeyen veya henüz entegre edilmemiş platform: {platform}"}
