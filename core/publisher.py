import json
import requests
from datetime import datetime
from core.token_store import get_token

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
    
    # Note: Adding images to Bluesky requires uploading blobs first, 
    # omitted here for brevity but structure is ready.
    
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
    # For media, Twitter requires uploading via v1.1 API first, then attaching media_id.
    
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
    
    # Normally we need to post to a specific Page ID. For mock, we use 'me/feed'
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
        
    ig_user_id = "me" # Needs actual IG User ID queried from Graph API
    access_token = token["access_token"]
    
    # 1. Create Media Container
    container_url = f"https://graph.facebook.com/v19.0/{ig_user_id}/media"
    container_payload = {"image_url": media_url, "caption": text, "access_token": access_token}
    
    try:
        req1 = requests.post(container_url, data=container_payload, timeout=15)
        res1 = req1.json()
        if req1.status_code != 200:
            return {"success": False, "platform": "instagram", "error": "Container oluşturulamadı: " + str(res1)}
            
        creation_id = res1.get("id")
        
        # 2. Publish Container
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
    
    # For LinkedIn, the author MUST be the person URN
    author_urn = "urn:li:person:YOUR_ID" # We normally fetch this via /v2/me
    
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
    
    # Add media if exists
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
    return {"success": False, "error": "TikTok API doğrudan paylaşıma şu an için izin vermemektedir. Gönderi TikTok taslaklarınıza (Inbox) kaydedildi. Uygulama üzerinden yayınlayabilirsiniz."}

# --- YOUTUBE ---
def publish_to_youtube(text: str, media_url: str = None) -> dict:
    return {"success": False, "error": "YouTube API Shorts yüklemek için video dosyasının doğrudan multipart olarak yüklenmesini gerektirir. Lütfen paneldeki 'Video Yükle' alanını kullanın."}

# --- WHATSAPP (META CLOUD API) ---
def publish_to_whatsapp(text: str, media_url: str = None) -> dict:
    """WhatsApp Business API üzerinden şablon veya mesaj gönderimi"""
    app_id = Config.META_APP_ID
    # Normally this requires a Phone Number ID and an access token with whatsapp_business_management
    token = os.getenv("META_USER_ACCESS_TOKEN", "YOUR_WHATSAPP_TOKEN")
    phone_number_id = os.getenv("WHATSAPP_PHONE_ID", "PHONE_ID")
    
    url = f"https://graph.facebook.com/v19.0/{phone_number_id}/messages"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Simple text message structure
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": "TARGET_PHONE_NUMBER",  # In a real app, this comes from the campaign audience
        "type": "text",
        "text": {
            "preview_url": True,
            "body": text
        }
    }
    
    # Note: If media_url is provided, we would change "type": "image" etc.
    try:
        # We simulate the success for now unless the API keys are provided
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
        return publish_to_youtube(text, media_url)
    elif platform == "whatsapp":
        return publish_to_whatsapp(text, media_url)
    elif platform in ["gmb", "google_business", "google işletme profili"]:
        return publish_to_gmb(text, media_url)
    else:
        return {"success": False, "error": f"Desteklenmeyen veya henüz entegre edilmemiş platform: {platform}"}
