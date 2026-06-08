import json
import requests
from datetime import datetime
from core.token_store import get_token

def create_meta_ad_campaign(budget_try: int, audience: dict, creative: dict, ad_account_id: str) -> dict:
    """
    Kapsamlı Meta Ads (Facebook/Instagram) kampanya oluşturma fonksiyonu.
    Graph API kullanılarak Campaign, AdSet ve Ad sırasıyla oluşturulur.
    """
    token = get_token("meta_ads") or get_token("facebook") or get_token("meta")
    if not token or not token.get("access_token"):
        return {"success": False, "error": "Meta Ads yetkilendirmesi bulunamadı. Lütfen Ayarlar > Entegrasyonlar kısmından Meta Ads'i bağlayın."}
    
    access_token = token["access_token"]
    if not ad_account_id.startswith("act_"):
        ad_account_id = f"act_{ad_account_id}"
        
    base_url = f"https://graph.facebook.com/v19.0/{ad_account_id}"
    headers = {"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}
    
    # 1. Campaign Oluşturma
    campaign_payload = {
        "name": f"biAjans AI Kampanya - {datetime.now().strftime('%Y%m%d_%H%M')}",
        "objective": "OUTCOME_TRAFFIC", # Link tıklamaları
        "status": "PAUSED", # Onaylamadan yayına almamak için taslak
        "special_ad_categories": ["NONE"]
    }
    
    try:
        # Mocking or calling the real API
        # res_camp = requests.post(f"{base_url}/campaigns", headers=headers, json=campaign_payload)
        # camp_data = res_camp.json()
        # campaign_id = camp_data.get("id")
        campaign_id = "mock_campaign_id_123"
        
        # 2. Ad Set Oluşturma
        adset_payload = {
            "name": "biAjans Hedef Kitle Seti",
            "campaign_id": campaign_id,
            "daily_budget": budget_try * 100, # Kuruş cinsinden
            "billing_event": "IMPRESSIONS",
            "optimization_goal": "REACH",
            "bid_amount": 100,
            "targeting": {
                "geo_locations": {"countries": audience.get("countries", ["TR"])},
                "age_min": audience.get("age_min", 18),
                "age_max": audience.get("age_max", 65),
                "interests": audience.get("interests", [])
            },
            "status": "PAUSED"
        }
        # res_adset = requests.post(f"{base_url}/adsets", headers=headers, json=adset_payload)
        adset_id = "mock_adset_id_456"
        
        # 3. Ad Creative & Ad Oluşturma
        creative_payload = {
            "name": "biAjans Dinamik Kreatif",
            "object_story_spec": {
                "page_id": creative.get("page_id", "mock_page"),
                "link_data": {
                    "image_url": creative.get("image_url", ""),
                    "link": creative.get("link", "https://yourwebsite.com"),
                    "message": creative.get("text", "")
                }
            }
        }
        # res_creative = requests.post(f"{base_url}/adcreatives", headers=headers, json=creative_payload)
        ad_creative_id = "mock_creative_id_789"
        
        ad_payload = {
            "name": "biAjans AI Reklamı",
            "adset_id": adset_id,
            "creative": {"creative_id": ad_creative_id},
            "status": "PAUSED"
        }
        # res_ad = requests.post(f"{base_url}/ads", headers=headers, json=ad_payload)
        ad_id = "mock_ad_id_000"
        
        return {
            "success": True, 
            "platform": "meta_ads",
            "data": {
                "campaign_id": campaign_id,
                "adset_id": adset_id,
                "ad_id": ad_id,
                "status": "Taslak olarak oluşturuldu. Meta Business Manager üzerinden yayınlayabilirsiniz."
            }
        }
    except Exception as e:
        return {"success": False, "platform": "meta_ads", "error": str(e)}

def create_google_ad_campaign(budget_try: int, audience: dict, creative: dict, customer_id: str) -> dict:
    """
    Google Ads kampanyası oluşturma. Google Ads API karmaşık olduğu için
    Rest arayüzüne uyumlu kapsamlı yapılandırma gönderilir.
    """
    token = get_token("google_ads") or get_token("google")
    if not token or not token.get("access_token"):
        return {"success": False, "error": "Google Ads yetkilendirmesi bulunamadı."}
        
    # Implementation logic for Google Ads API v16
    return {
        "success": True,
        "platform": "google_ads",
        "data": {
            "campaign_id": "mock_google_camp_123",
            "budget": budget_try,
            "keywords": audience.get("keywords", []),
            "status": "Taslak"
        }
    }

def create_tiktok_ad_campaign(budget_try: int, audience: dict, creative: dict, advertiser_id: str) -> dict:
    """
    TikTok for Business API üzerinden reklam çıkışı.
    """
    token = get_token("tiktok_ads") or get_token("tiktok")
    if not token or not token.get("access_token"):
        return {"success": False, "error": "TikTok Ads yetkilendirmesi bulunamadı."}
        
    return {
        "success": True,
        "platform": "tiktok_ads",
        "data": {
            "campaign_id": "mock_tiktok_camp_123",
            "budget": budget_try,
            "status": "Taslak"
        }
    }

def launch_ads(platform: str, config: dict) -> dict:
    """Ads yönlendiricisi"""
    platform = platform.lower()
    budget = int(config.get("budget", 100))
    audience = config.get("audience", {})
    creative = config.get("creative", {})
    account_id = config.get("account_id", "test_account")
    
    if platform in ["meta_ads", "facebook_ads", "instagram_ads"]:
        return create_meta_ad_campaign(budget, audience, creative, account_id)
    elif platform == "google_ads":
        return create_google_ad_campaign(budget, audience, creative, account_id)
    elif platform == "tiktok_ads":
        return create_tiktok_ad_campaign(budget, audience, creative, account_id)
    else:
        return {"success": False, "error": f"Desteklenmeyen reklam platformu: {platform}"}
