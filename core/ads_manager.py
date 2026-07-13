import json
import requests
from datetime import datetime
from core.token_store import get_token

def create_meta_ad_campaign(budget_try: int, audience: dict, creative: dict, ad_account_id: str, brand_id: str = "global") -> dict:
    """
    Kapsamlı Meta Ads (Facebook/Instagram) kampanya oluşturma fonksiyonu.
    Graph API kullanılarak Campaign, AdSet ve Ad sırasıyla oluşturulur.
    """
    token = get_token("meta_ads", brand_id=brand_id) or get_token("facebook", brand_id=brand_id) or get_token("meta", brand_id=brand_id)
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
        res_camp = requests.post(f"{base_url}/campaigns", headers=headers, json=campaign_payload)
        camp_data = res_camp.json()
        if "error" in camp_data:
            return {"success": False, "error": f"Meta Campaign Hatası: {camp_data['error'].get('message')}"}
        campaign_id = camp_data.get("id")
        
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
        res_adset = requests.post(f"{base_url}/adsets", headers=headers, json=adset_payload)
        adset_data = res_adset.json()
        if "error" in adset_data:
            return {"success": False, "error": f"Meta AdSet Hatası: {adset_data['error'].get('message')}"}
        adset_id = adset_data.get("id")
        
        # 3. Ad Creative Oluşturma
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
        res_creative = requests.post(f"{base_url}/adcreatives", headers=headers, json=creative_payload)
        creative_data = res_creative.json()
        if "error" in creative_data:
            return {"success": False, "error": f"Meta AdCreative Hatası: {creative_data['error'].get('message')}"}
        ad_creative_id = creative_data.get("id")
        
        # 4. Ad Oluşturma
        ad_payload = {
            "name": "biAjans AI Reklamı",
            "adset_id": adset_id,
            "creative": {"creative_id": ad_creative_id},
            "status": "PAUSED"
        }
        res_ad = requests.post(f"{base_url}/ads", headers=headers, json=ad_payload)
        ad_data = res_ad.json()
        if "error" in ad_data:
            return {"success": False, "error": f"Meta Ad Hatası: {ad_data['error'].get('message')}"}
        ad_id = ad_data.get("id")
        
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

def create_google_ad_campaign(budget_try: int, audience: dict, creative: dict, customer_id: str, brand_id: str = "global") -> dict:
    """
    Google Ads kampanyası oluşturma. Google Ads REST API v16 kullanılarak
    CampaignBudget ve Search Campaign oluşturulur.
    """
    token = get_token("google_ads", brand_id=brand_id) or get_token("google", brand_id=brand_id)
    if not token or not token.get("access_token"):
        return {"success": False, "error": "Google Ads yetkilendirmesi bulunamadı. Lütfen Ayarlar > Entegrasyonlar kısmından Google Ads'i bağlayın."}
        
    access_token = token["access_token"]
    developer_token = "YOUR_DEVELOPER_TOKEN"
    
    headers = {
        "Authorization": f"Bearer {access_token}",
        "developer-token": developer_token,
        "login-customer-id": customer_id,
        "Content-Type": "application/json"
    }
    
    # 1. CampaignBudget Oluşturma
    budget_url = f"https://googleads.googleapis.com/v16/customers/{customer_id}/campaignBudgets:mutate"
    budget_payload = {
        "operations": [{
            "create": {
                "name": f"biAjans Bütçe - {datetime.now().strftime('%Y%m%d_%H%M')}",
                "amountMicros": budget_try * 1000000,
                "deliveryMethod": "STANDARD"
            }
        }]
    }
    
    try:
        res_budget = requests.post(budget_url, headers=headers, json=budget_payload)
        budget_data = res_budget.json()
        if "error" in budget_data:
            return {"success": False, "error": f"Google Ads Bütçe Hatası: {budget_data['error'].get('message')}"}
        
        budget_resource = budget_data.get("results", [{}])[0].get("resourceName")
        if not budget_resource:
            return {"success": False, "error": "Google Ads Bütçe Kaynağı oluşturulamadı."}
            
        # 2. Campaign Oluşturma
        url = f"https://googleads.googleapis.com/v16/customers/{customer_id}/campaigns:mutate"
        campaign_payload = {
            "operations": [{
                "create": {
                    "name": f"biAjans AI Arama Ağı Kampanyası - {datetime.now().strftime('%Y%m%d_%H%M')}",
                    "advertisingChannelType": "SEARCH",
                    "status": "PAUSED",
                    "campaignBudget": budget_resource,
                    "manualCpc": {}
                }
            }]
        }
        res_camp = requests.post(url, headers=headers, json=campaign_payload)
        camp_data = res_camp.json()
        if "error" in camp_data:
            return {"success": False, "error": f"Google Ads Kampanya Hatası: {camp_data['error'].get('message')}"}
            
        campaign_resource = camp_data.get("results", [{}])[0].get("resourceName")
        
        return {
            "success": True,
            "platform": "google_ads",
            "data": {
                "campaign_id": campaign_resource,
                "budget": budget_try,
                "keywords": audience.get("keywords", []),
                "status": "Google Ads'e taslak kampanya olarak başarıyla gönderildi."
            }
        }
    except Exception as e:
        return {"success": False, "platform": "google_ads", "error": str(e)}

def create_tiktok_ad_campaign(budget_try: int, audience: dict, creative: dict, advertiser_id: str, brand_id: str = "global") -> dict:
    """
    TikTok for Business API v1.3 üzerinden reklam kampanyası oluşturulur.
    """
    token = get_token("tiktok_ads", brand_id=brand_id) or get_token("tiktok", brand_id=brand_id)
    if not token or not token.get("access_token"):
        return {"success": False, "error": "TikTok Ads yetkilendirmesi bulunamadı. Lütfen Ayarlar > Entegrasyonlar kısmından TikTok Ads'i bağlayın."}
        
    access_token = token["access_token"]
    url = "https://business-api.tiktok.com/open_api/v1.3/campaign/create/"
    headers = {
        "Access-Token": access_token,
        "Content-Type": "application/json"
    }
    
    payload = {
        "advertiser_id": advertiser_id,
        "campaign_name": f"biAjans AI Kampanya - {datetime.now().strftime('%Y%m%d_%H%M')}",
        "objective_type": "TRAFFIC",
        "budget_mode": "BUDGET_MODE_DAY",
        "budget": float(budget_try),
        "operation_status": "DISABLE" # Pasif (Taslak)
    }
    
    try:
        res = requests.post(url, headers=headers, json=payload)
        res_data = res.json()
        if res_data.get("code") != 0:
            return {"success": False, "error": f"TikTok Ads API Hatası: {res_data.get('message')}"}
            
        campaign_id = res_data.get("data", {}).get("campaign_id")
        return {
            "success": True,
            "platform": "tiktok_ads",
            "data": {
                "campaign_id": campaign_id,
                "budget": budget_try,
                "status": "TikTok Business Manager'a taslak olarak aktarıldı."
            }
        }
    except Exception as e:
        return {"success": False, "platform": "tiktok_ads", "error": str(e)}

def launch_ads(platform: str, config: dict, brand_id: str = "global") -> dict:
    """Ads yönlendiricisi"""
    platform = platform.lower()
    budget = int(config.get("budget", 100))
    audience = config.get("audience", {})
    creative = config.get("creative", {})
    account_id = config.get("account_id", "test_account")
    
    if platform in ["meta_ads", "facebook_ads", "instagram_ads"]:
        return create_meta_ad_campaign(budget, audience, creative, account_id, brand_id=brand_id)
    elif platform == "google_ads":
        return create_google_ad_campaign(budget, audience, creative, account_id, brand_id=brand_id)
    elif platform == "tiktok_ads":
        return create_tiktok_ad_campaign(budget, audience, creative, account_id, brand_id=brand_id)
    else:
        return {"success": False, "error": f"Desteklenmeyen reklam platformu: {platform}"}
