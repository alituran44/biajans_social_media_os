import http.server
import socketserver
import json
import os
import time
import urllib.parse
import traceback
import sys

from config import Config
from core.ai_engines import AIEngines
from core.oauth_manager import start_oauth_flow, handle_oauth_callback, connect_bluesky
from core.token_store import (
    save_token, get_token, revoke_token,
    get_all_connection_status, is_connected
)

PORT = 8080
DIRECTORY = "static"

# ─── Platform → auth/ URL eşleştirmesi ──────────────────────────────────────
# Bağlan butonlarında kullanılan platform adlarını normalize eder.
_PLATFORM_ALIASES = {
    "web":                    None,        # OAuth yok — RSS / sitemap
    "blog":                   None,        # OAuth yok — RSS
    "facebook":               "meta",
    "instagram":              "meta",
    "threads":                "meta",
    "whatsapp":               "meta",
    "meta reklamlar":         "meta",
    "meta_ads":               "meta",
    "meta":                   "meta",
    "x":                      "x",
    "linkedin":               "linkedin",
    "google ads":             "google",
    "google_ads":             "google",
    "youtube":                "google",
    "google":                 "google",
    "tiktok":                 "tiktok",
    "tiktok ads":             "tiktok",
    "pinterest":              "pinterest",
    "bluesky":                "bluesky",
    "looker stüdyosu":        None,        # Google hesabı gerektirir, özel flow
    "looker_studio":          None,
    "tiktok_kisisel":         "tiktok",
    "tiktok_isletmesi":       "tiktok",
    "google_isletme_profili": "google",
    "tiktok_reklamlari":      "tiktok",
    "looker_studyosu":        None,
    "segirme":                None,
    "mavi_gokyuzu":           "bluesky",
    "e-posta":                None,
}


class CustomHTTPRequestHandler(http.server.BaseHTTPRequestHandler):
    """
    Zero-dependency request handler serving index.html, CSS, JS
    and routing API requests including OAuth flows.
    """

    # ──────────────────────────────────────────────────────────────────────────
    # GET
    # ──────────────────────────────────────────────────────────────────────────

    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path
        qs = urllib.parse.parse_qs(parsed_url.query)

        # ── OAuth start: /auth/<platform>/start ──────────────────────────────
        if path.startswith("/auth/") and path.endswith("/start"):
            platform = path.split("/")[2]
            brand_id = qs.get("brand", ["global"])[0]
            self._handle_oauth_start(platform, brand_id)
            return

        # ── OAuth callback: /auth/<platform>/callback ─────────────────────────
        if path.startswith("/auth/") and path.endswith("/callback"):
            platform = path.split("/")[2]
            code  = qs.get("code",  [None])[0]
            state = qs.get("state", [None])[0]
            error = qs.get("error", [None])[0]
            self._handle_oauth_callback(platform, code, state, error)
            return

        # ── SmartLinks: /sl/<brand> ──────────────────────────────────────────
        if path.startswith("/sl/") or path == "/sl":
            parts = [p for p in path.split("/") if p]
            brand_slug = "global"
            if len(parts) >= 2:
                brand_slug = parts[1]
            self._handle_smartlink(brand_slug)
            return

        # ── Load SmartLinks API: /api/smartlinks/load ────────────────────────
        if path == "/api/smartlinks/load":
            brand_slug = qs.get("brand", ["boş-marka"])[0]
            self._handle_smartlinks_load(brand_slug)
            return

        # ── Connections status: /api/connections/status ───────────────────────
        if path == "/api/connections/status":
            brand_id = qs.get("brand", ["global"])[0]
            status = get_all_connection_status(brand_id)
            self.send_json_response({"status": "ok", "connections": status})
            return

        # ── Static file serving ───────────────────────────────────────────────
        if path == "/":
            path = "/index.html"

        file_path = os.path.join(DIRECTORY, path.lstrip("/"))

        abs_dir  = os.path.abspath(DIRECTORY)
        abs_file = os.path.abspath(file_path)
        if not abs_file.startswith(abs_dir):
            self.send_error(403, "Access Denied")
            return

        if os.path.exists(file_path) and os.path.isfile(file_path):
            self.send_response(200)
            if file_path.endswith(".html"):
                self.send_header("Content-Type", "text/html; charset=utf-8")
            elif file_path.endswith(".css"):
                self.send_header("Content-Type", "text/css; charset=utf-8")
            elif file_path.endswith(".js"):
                self.send_header("Content-Type", "application/javascript; charset=utf-8")
            else:
                self.send_header("Content-Type", "application/octet-stream")
            self.end_headers()
            with open(file_path, "rb") as f:
                self.wfile.write(f.read())
        else:
            self.send_error(404, f"File Not Found: {path}")

    # ──────────────────────────────────────────────────────────────────────────
    # POST
    # ──────────────────────────────────────────────────────────────────────────

    def do_POST(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path

        content_length = int(self.headers.get("Content-Length", 0))
        post_data = self.rfile.read(content_length) if content_length else b"{}"

        try:
            body = json.loads(post_data.decode("utf-8")) if post_data else {}
        except Exception:
            body = {}

        # ── Save SmartLinks API: /api/smartlinks/save ────────────────────────
        if path == "/api/smartlinks/save":
            self._handle_smartlinks_save(body)
            return

        # ── Content generation ─────────────────────────────────────────────
        if path == "/api/generate":
            self._handle_generate(body)
            return

        # ── Bluesky bağlantısı (POST — kullanıcı adı + şifre) ─────────────
        if path == "/api/connect/bluesky":
            identifier   = body.get("identifier", "").strip()
            app_password = body.get("app_password", "").strip()
            brand_id     = body.get("brand", "global").strip()
            if not identifier or not app_password:
                self.send_json_response({"success": False, "error": "Kimlik ve şifre zorunludur."}, 400)
                return
            result = connect_bluesky(identifier, app_password)
            if result.get("success"):
                save_token("bluesky", result["token_data"], profile={
                    "handle": result["token_data"].get("handle", identifier),
                    "did":    result["token_data"].get("did", ""),
                }, brand_id=brand_id)
                self.send_json_response({"success": True, "platform": "bluesky"})
            else:
                self.send_json_response({"success": False, "error": result.get("error")}, 400)
            return

        # ── Mock/Simulated platform connection ─────────────────────────────
        if path == "/api/connect/mock":
            platform = body.get("platform", "").strip().lower()
            brand_id = body.get("brand", "global").strip()
            if not platform:
                self.send_json_response({"success": False, "error": "Platform required."}, 400)
                return
            canonical = _PLATFORM_ALIASES.get(platform, platform)
            save_token(canonical, {
                "access_token": "mock_token_" + canonical,
                "expires_at": 0,
            }, profile={
                "name": "Demo " + canonical.title(),
                "id": "demo_id",
            }, brand_id=brand_id)
            self.send_json_response({"success": True, "platform": canonical})
            return

        # ── Platform bağlantısını kes (revoke) ─────────────────────────────
        if path == "/api/disconnect":
            platform = body.get("platform", "").strip().lower()
            brand_id = body.get("brand", "global").strip()
            if not platform:
                self.send_json_response({"success": False, "error": "Platform adı zorunludur."}, 400)
                return
            revoke_token(platform, brand_id=brand_id)
            self.send_json_response({"success": True, "platform": platform})
            return

        # ── Publish Endpoint ───────────────────────────────────────────────
        if path == "/api/publish":
            platform = body.get("platform", "").strip().lower()
            text = body.get("text", "").strip()
            media_url = body.get("media_url", "").strip() or None
            brand_id = body.get("brand", "global").strip()
            if not platform or not text:
                self.send_json_response({"success": False, "error": "Platform and text are required."}, 400)
                return
                
            from core.publisher import publish_content
            result = publish_content(platform, text, media_url, brand_id=brand_id)
            if result.get("success"):
                self.send_json_response(result)
            else:
                self.send_json_response(result, 400)
            return

        # ── Ads Launch Endpoint ────────────────────────────────────────────
        if path == "/api/ads/launch":
            platform = body.get("platform", "").strip().lower()
            brand_id = body.get("brand", "global").strip()
            if not platform:
                self.send_json_response({"success": False, "error": "Platform required."}, 400)
                return
                
            from core.ads_manager import launch_ads
            result = launch_ads(platform, body, brand_id=brand_id)
            if result.get("success"):
                self.send_json_response(result)
            else:
                self.send_json_response(result, 400)
            return

        # ── Analytics Endpoint ─────────────────────────────────────────────
        if path == "/api/analytics/web":
            site_url = body.get("url", "https://siteniz.com").strip()
            from core.analytics_manager import get_web_analytics_data
            result = get_web_analytics_data(site_url)
            self.send_json_response(result)
            return
            
        # ── Looker Embed Endpoint ──────────────────────────────────────────
        if path == "/api/looker/embed":
            report_id = body.get("report_id", "").strip()
            from core.analytics_manager import get_looker_studio_embed_url
            embed_url = get_looker_studio_embed_url(report_id)
            self.send_json_response({"success": True, "embed_url": embed_url})
            return

        self.send_error(404, "Not Found")

    # ──────────────────────────────────────────────────────────────────────────
    # OAuth Handlers
    # ──────────────────────────────────────────────────────────────────────────

    def _handle_oauth_start(self, platform: str, brand_id: str = "global"):
        """
        OAuth akışını başlatır.
        Eğer credentials yapılandırılmışsa → platformu yetkilendirme URL'ine yönlendir.
        Değilse → JSON hata döner.
        """
        canonical = _PLATFORM_ALIASES.get(platform.lower(), platform.lower())
        if canonical is None:
            self.send_json_response({
                "success": False,
                "error": f"'{platform}' için OAuth akışı mevcut değil."
            }, 400)
            return

        if not Config.platform_configured(canonical):
            self.send_json_response({
                "success": False,
                "error": (
                    f"'{canonical}' için OAuth kimlik bilgileri yapılandırılmamış. "
                    f".env dosyasına ilgili CLIENT_ID ve CLIENT_SECRET değerlerini ekleyin."
                ),
                "configured": False,
            }, 503)
            return

        result = start_oauth_flow(canonical, brand_id=brand_id)
        if "error" in result:
            self.send_json_response({"success": False, "error": result["error"]}, 400)
            return

        # JSON yanıt döner → frontend window.location ile yönlendirir
        self.send_json_response({"success": True, "redirect_url": result["redirect_url"]})

    def _handle_oauth_callback(self, platform: str, code, state, error):
        """
        Platform yetkilendirme callback'ini işler.
        Başarılıysa index.html?connected=<platform>&status=success'e yönlendirir.
        """
        base_redirect = "/"

        if error:
            print(f"[OAuth] ❌ {platform} OAuth hatası: {error}")
            redirect = f"{base_redirect}?connected={platform}&status=error&reason={urllib.parse.quote(str(error))}"
            self._redirect(redirect)
            return

        if not code or not state:
            self._redirect(f"{base_redirect}?connected={platform}&status=error&reason=missing_params")
            return

        result = handle_oauth_callback(platform, code, state)

        if result.get("success"):
            save_token(platform, result["token_data"], brand_id=result.get("brand_id", "global"))
            print(f"[OAuth] ✅ {platform} bağlantısı başarıyla kuruldu.")
            self._redirect(f"{base_redirect}?connected={platform}&status=success")
        else:
            err_msg = urllib.parse.quote(str(result.get("error", "Bilinmeyen hata")))
            print(f"[OAuth] ❌ {platform} token alışverişi başarısız: {result.get('error')}")
            self._redirect(f"{base_redirect}?connected={platform}&status=error&reason={err_msg}")

    def _redirect(self, location: str):
        """HTTP 302 yönlendirme."""
        self.send_response(302)
        self.send_header("Location", location)
        self.end_headers()

    # ──────────────────────────────────────────────────────────────────────────
    # Content Generation Handler
    # ──────────────────────────────────────────────────────────────────────────

    def _handle_generate(self, request_json: dict):
        user_prompt = request_json.get("prompt", "").strip()

        if not user_prompt:
            self.send_json_response({"status": "error", "message": "Boş bir açıklama gönderilemez!"}, 400)
            return

        ai_provider = request_json.get("ai_provider", "default").strip().lower()
        ai_api_key = request_json.get("ai_api_key", "").strip()
        ai_model = request_json.get("ai_model", "").strip()

        openai_keys_present = bool(Config.OPENAI_API_KEY) and "your_openai_api_key_here" not in Config.OPENAI_API_KEY

        def get_fallback_image(prompt_text):
            p_lower = prompt_text.lower()
            if "fıstık" in p_lower or "peanut" in p_lower or "ezme" in p_lower:
                return "https://images.unsplash.com/photo-1590080875515-8a3a8dc57fbe?w=1024&q=80"
            elif "kahve" in p_lower or "coffee" in p_lower:
                return "https://images.unsplash.com/photo-1507133750040-4a8f57021571?w=1024&q=80"
            else:
                return "https://images.unsplash.com/photo-1618005182384-a83a8dc57fbe?w=1024&q=80"

        # Custom AI Provider Flow (OpenRouter, OpenAI, Anthropic, Gemini)
        if ai_provider != "default" and ai_api_key:
            print(f"\n[CUSTOM AI ACTIVE] Provider: {ai_provider}, Model: {ai_model} for prompt: {user_prompt}")
            social_content = AIEngines.generate_social_content_custom(
                user_prompt, ai_provider, ai_api_key, ai_model
            )

            if not social_content:
                self.send_json_response({
                    "status": "error",
                    "message": f"{ai_provider.upper()} içerik üretirken hata verdi. Lütfen API anahtarınızı ve internet bağlantınızı kontrol edin."
                }, 500)
                return

            image_prompt = social_content.get("image_prompt", "")
            
            if openai_keys_present:
                image_url = AIEngines.generate_image_design(image_prompt) or get_fallback_image(user_prompt)
            else:
                image_url = get_fallback_image(user_prompt)

            self.send_json_response({
                "status": "success",
                "instagram_caption": social_content.get("instagram_caption", ""),
                "facebook_post": social_content.get("facebook_post", ""),
                "youtube": social_content.get("youtube", {}),
                "hashtags": social_content.get("hashtags", []),
                "image_prompt": image_prompt,
                "image_url": image_url,
            })
            return

        # Default Gemini Flow
        gemini_keys_present = bool(Config.GEMINI_API_KEY) and "your_gemini_api_key_here" not in Config.GEMINI_API_KEY

        if not gemini_keys_present or not openai_keys_present:
            print(f"\n[MOCK MODE ACTIVE] Generating premium mock assets for: '{user_prompt}'")
            time.sleep(1.8)
            response_data = self.get_premium_mock_response(user_prompt)
            self.send_json_response(response_data)
        else:
            print(f"\n[LIVE MODE ACTIVE] Querying Gemini 1.5 Pro and Image Generator for: '{user_prompt}'")
            social_content = AIEngines.generate_social_content(user_prompt)

            if not social_content:
                self.send_json_response({
                    "status": "error",
                    "message": "Gemini içerik üretirken bir hata ile karşılaştı."
                }, 500)
                return

            image_prompt = social_content.get("image_prompt", "")
            image_url = AIEngines.generate_image_design(image_prompt)

            if not image_url:
                self.send_json_response({
                    "status": "error",
                    "message": "Metin başarıyla üretildi fakat görsel çizerken hata verdi."
                }, 500)
                return

            self.send_json_response({
                "status": "success",
                "instagram_caption": social_content.get("instagram_caption", ""),
                "facebook_post": social_content.get("facebook_post", ""),
                "youtube": social_content.get("youtube", {}),
                "hashtags": social_content.get("hashtags", []),
                "image_prompt": image_prompt,
                "image_url": image_url,
            })

    # ──────────────────────────────────────────────────────────────────────────
    # Helpers
    # ──────────────────────────────────────────────────────────────────────────

    def send_json_response(self, data, status_code=200):
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode("utf-8"))

    def log_message(self, format, *args):
        # Konsol çıktısını biraz temizle
        method_path = args[0] if args else ""
        code = args[1] if len(args) > 1 else "-"
        print(f"  [{code}] {method_path}")

    # ──────────────────────────────────────────────────────────────────────────
    # Premium Mock Response (API anahtarı olmadan demo modu)
    # ──────────────────────────────────────────────────────────────────────────

    def get_premium_mock_response(self, prompt):
        p_lower = prompt.lower()

        if "fıstık" in p_lower or "peanut" in p_lower or "ezme" in p_lower:
            return {
                "status": "success",
                "instagram_caption": "🥜 Doğallığın En Saf Hali Sofralarınızda! 🚀\n\nSporcular, sağlıklı beslenenler ve gurme lezzet arayanlar! Katkısız, şeker ilavesiz ve %100 organik fıstık ezmemizle tanışmaya hazır mısınız? 🌟\n\n💪 Antrenman öncesi enerji deposu arayan sporcular için mükemmel bir protein kaynağı. Çocuklar için hem lezzetli hem de aşırı besleyici!\n\n👉 Hemen profilimizdeki linke tıklayarak siparişini ver, lansmana özel %20 indirim fırsatını kaçırma! 🛒\n\n#SağlıklıBeslenme #FıstıkEzmesi #ProteinDeposu",
                "facebook_post": "🌱 Sağlıklı Yaşam ve Temiz Beslenme Arayanlar İçin Harika Bir Haberimiz Var! 🌱\n\n%100 doğal, yerli üretim fıstıklarımızdan elde ettiğimiz katkısız fıstık ezmemiz satışa sunuldu!",
                "youtube": {
                    "video_title": "Evde %100 Katkısız Organik Fıstık Ezmesi Nasıl Yapılır?",
                    "video_description": "Merhaba arkadaşlar! Bu videoda hem sağlıklı beslenenler hem de fitness ile ilgilenenler için mükemmel bir tarif paylaşıyoruz.",
                    "script_outline": "1. Giriş\n2. Malzemeler\n3. Blender Aşaması\n4. Kapanış",
                    "tags": ["FıstıkEzmesiYapımı", "SağlıklıFıstıkEzmesi", "DiyetTarifleri", "SporcuBeslenmesi"]
                },
                "hashtags": ["SağlıklıBeslenme", "FıstıkEzmesi", "OrganikBesinler", "SporcuBeslenmesi"],
                "image_prompt": "A close-up shot of a premium organic peanut butter jar on a rustic wooden kitchen counter",
                "image_url": "https://images.unsplash.com/photo-1590080875515-8a3a8dc57fbe?w=1024&q=80"
            }
        elif "kahve" in p_lower or "coffee" in p_lower:
            return {
                "status": "success",
                "instagram_caption": "☕️ Güne Mükemmel Bir Başlangıç: Taze Çekilmiş Kahve Kokusu! 🌅\n\nHer yudumda özenle seçilmiş nitelikli kahve çekirdeklerinin büyüleyici aromasını hissetmeye hazır olun! ✨",
                "facebook_post": "☕️ Gerçek Nitelikli Kahve Deneyimiyle Tanışın!",
                "youtube": {
                    "video_title": "Üç Farklı Kahve Demleme Yöntemi",
                    "video_description": "V60, French Press ve Chemex yöntemleriyle mükemmel kahve.",
                    "script_outline": "1. Giriş\n2. V60\n3. French Press\n4. Chemex",
                    "tags": ["EvdeKahveDemleme", "BaristaSırları", "NitelikliKahve"]
                },
                "hashtags": ["KahveKeyfi", "NitelikliKahve", "FiltreKahve", "Coffeetime"],
                "image_prompt": "A steaming cup of freshly brewed espresso coffee on a minimalist concrete table",
                "image_url": "https://images.unsplash.com/photo-1507133750040-4a8f57021571?w=1024&q=80"
            }
        else:
            return {
                "status": "success",
                "instagram_caption": "✨ Hayallerinizi Gerçeğe Dönüştürme Vakti! 🚀\n\nİster yeni bir marka kuruyor olun, ister mevcut işinizi büyütüyor olun; doğru strateji ile dijital dünyada zirveye ulaşmak artık çok daha kolay! 💡",
                "facebook_post": "📈 İşinizi Dijital Dünyada Büyütmeye Hazır Mısınız? 📈\n\nGünümüz pazarlama dünyasında ayakta kalmanın sırrı, doğru kanallarda doğru hedef kitleyle buluşmaktır.",
                "youtube": {
                    "video_title": "Sosyal Medyada 0'dan 10.000 Takipçiye Nasıl Ulaşılır? (2026 Güncel Algoritma)",
                    "video_description": "2026 yılı güncel algoritmasını kendi lehine çevirerek organik takipçi kazanmanın 5 altın kuralı.",
                    "script_outline": "1. Giriş\n2. Hook Kuralı\n3. Tutarlılık\n4. Kapanış",
                    "tags": ["SosyalMedyaBüyüme", "TakipçiKazanma", "AlgoritmaSırları"]
                },
                "hashtags": ["Girişimcilik", "DijitalPazarlama", "SosyalMedyaYönetimi", "MarkaStratejisi"],
                "image_prompt": "A premium modern glass workspace with glowing neon lights, floating holographic marketing charts",
                "image_url": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1024&q=80"
            }

    def _handle_smartlink(self, brand_slug):
        # Read from core/smartlinks.json
        smartlinks_path = os.path.join(os.path.dirname(__file__), "core", "smartlinks.json")
        data = {}
        if os.path.exists(smartlinks_path):
            try:
                with open(smartlinks_path, "r", encoding="utf-8") as f:
                    smartlinks_data = json.load(f)
                    data = smartlinks_data.get(brand_slug, {})
            except Exception:
                pass
        
        # Default fallback values
        if not data:
            data = {
                "brand": brand_slug,
                "title": brand_slug.replace("-", " ").title(),
                "subtitle": "biAjans Tarafından Hazırlanmış Sosyal Medya Profili",
                "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80",
                "theme": "ocean-breeze",
                "links": [
                    {"id": 1, "title": "Web Sitemiz", "url": "https://example.com", "icon": "fa-solid fa-globe"},
                    {"id": 2, "title": "Instagram Profilimiz", "url": "https://instagram.com", "icon": "fa-brands fa-instagram"},
                    {"id": 3, "title": "Bize Ulaşın", "url": "https://whatsapp.com", "icon": "fa-brands fa-whatsapp"}
                ]
            }

        # Build links HTML
        links_html = ""
        for link in data.get("links", []):
            icon_class = link.get("icon", "fa-solid fa-link")
            links_html += f'<a href="{link.get("url", "#")}" target="_blank" class="link-btn"><i class="{icon_class}"></i> {link.get("title", "")}</a>\n'

        html_template = """<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&display=swap" rel="stylesheet">
    <style>
        :root {{
            --bg-gradient: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            --text-color: #0f172a;
            --btn-bg: #ffffff;
            --btn-text: #0f172a;
            --btn-border: 1px solid #cbd5e1;
            --btn-shadow: 0 4px 6px rgba(0,0,0,0.03);
            --btn-hover-bg: #f8fafc;
        }}
        
        body.theme-clean-light {{
            --bg-gradient: linear-gradient(to bottom, #f8fafc, #f1f5f9);
            --text-color: #0f172a;
            --btn-bg: #ffffff;
            --btn-text: #0f172a;
            --btn-border: 1px solid #e2e8f0;
            --btn-shadow: 0 4px 10px rgba(0,0,0,0.02);
            --btn-hover-bg: #f8fafc;
        }}
        body.theme-dark-night {{
            --bg-gradient: linear-gradient(to bottom, #0f172a, #020617);
            --text-color: #ffffff;
            --btn-bg: #1e293b;
            --btn-text: #ffffff;
            --btn-border: 1px solid #334155;
            --btn-shadow: 0 4px 10px rgba(0,0,0,0.1);
            --btn-hover-bg: #334155;
        }}
        body.theme-soft-lavender {{
            --bg-gradient: linear-gradient(to bottom, #f5f3ff, #ede9fe);
            --text-color: #4c1d95;
            --btn-bg: #ffffff;
            --btn-text: #5b21b6;
            --btn-border: 1px solid #ddd6fe;
            --btn-shadow: 0 4px 10px rgba(91,33,182,0.05);
            --btn-hover-bg: #f5f3ff;
        }}
        body.theme-ocean-breeze {{
            --bg-gradient: linear-gradient(to bottom, #0284c7, #0369a1);
            --text-color: #ffffff;
            --btn-bg: rgba(255, 255, 255, 0.15);
            --btn-text: #ffffff;
            --btn-border: 1px solid rgba(255, 255, 255, 0.25);
            --btn-shadow: 0 4px 15px rgba(0,0,0,0.05);
            --btn-hover-bg: rgba(255, 255, 255, 0.25);
            backdrop-filter: blur(10px);
        }}
        body.theme-sunset-glow {{
            --bg-gradient: linear-gradient(135deg, #f97316 0%, #db2777 100%);
            --text-color: #ffffff;
            --btn-bg: #ffffff;
            --btn-text: #db2777;
            --btn-border: none;
            --btn-shadow: 0 4px 12px rgba(219,39,119,0.15);
            --btn-hover-bg: #fff5f5;
        }}

        body {{
            margin: 0;
            padding: 40px 20px;
            font-family: 'Outfit', sans-serif;
            background: var(--bg-gradient);
            color: var(--text-color);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            box-sizing: border-box;
        }}
        .container {{
            width: 100%;
            max-width: 480px;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
        }}
        .avatar {{
            width: 96px;
            height: 96px;
            border-radius: 50%;
            object-fit: cover;
            border: 3px solid var(--text-color);
            box-shadow: 0 4px 10px rgba(0,0,0,0.05);
            margin-bottom: 16px;
        }}
        .title {{
            font-size: 20px;
            font-weight: 800;
            margin: 0 0 8px 0;
        }}
        .subtitle {{
            font-size: 13.5px;
            opacity: 0.8;
            font-weight: 600;
            margin: 0 0 32px 0;
            max-width: 300px;
            line-height: 1.4;
        }}
        .links-list {{
            width: 100%;
            display: flex;
            flex-direction: column;
            gap: 16px;
            margin-bottom: 48px;
        }}
        .link-btn {{
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            padding: 16px 24px;
            background: var(--btn-bg);
            color: var(--btn-text);
            border: var(--btn-border);
            border-radius: 30px;
            font-size: 14.5px;
            font-weight: 700;
            text-decoration: none;
            box-shadow: var(--btn-shadow);
            transition: all 0.2s ease-in-out;
            position: relative;
        }}
        .link-btn i {{
            position: absolute;
            left: 24px;
            font-size: 18px;
        }}
        .link-btn:hover {{
            background: var(--btn-hover-bg);
            transform: scale(1.015);
        }}
        .footer {{
            margin-top: auto;
            font-size: 11px;
            opacity: 0.6;
            font-weight: bold;
            display: flex;
            align-items: center;
            gap: 6px;
        }}
        .footer i {{
            font-size: 12px;
        }}
    </style>
</head>
<body class="theme-{theme}">
    <div class="container">
        <img src="{avatar}" alt="Avatar" class="avatar">
        <h1 class="title">{title}</h1>
        <p class="subtitle">{subtitle}</p>
        
        <div class="links-list">
            {links_html}
        </div>
        
        <div class="footer">
            <i class="fa-solid fa-wand-magic-sparkles"></i> biAjans SmartLinks
        </div>
    </div>
</body>
</html>"""

        html_content = html_template.format(
            title=data.get("title", "SmartLink"),
            avatar=data.get("avatar", ""),
            subtitle=data.get("subtitle", ""),
            theme=data.get("theme", "ocean-breeze"),
            links_html=links_html
        )

        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.end_headers()
        self.wfile.write(html_content.encode("utf-8"))

    def _handle_smartlinks_load(self, brand_slug):
        smartlinks_path = os.path.join(os.path.dirname(__file__), "core", "smartlinks.json")
        data = {}
        if os.path.exists(smartlinks_path):
            try:
                with open(smartlinks_path, "r", encoding="utf-8") as f:
                    smartlinks_data = json.load(f)
                    data = smartlinks_data.get(brand_slug, {})
            except Exception:
                pass
        
        if not data:
            data = {
                "brand": brand_slug,
                "title": brand_slug.replace("-", " ").title(),
                "subtitle": "biAjans Tarafından Hazırlanmış Sosyal Medya Profili",
                "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80",
                "theme": "ocean-breeze",
                "links": [
                    {"id": 1, "title": "Web Sitemiz", "url": "https://example.com", "icon": "fa-solid fa-globe"},
                    {"id": 2, "title": "Instagram Profilimiz", "url": "https://instagram.com", "icon": "fa-brands fa-instagram"},
                    {"id": 3, "title": "Bize Ulaşın", "url": "https://whatsapp.com", "icon": "fa-brands fa-whatsapp"}
                ]
            }
        self.send_json_response({"success": True, "data": data})

    def _handle_smartlinks_save(self, body):
        brand_slug = body.get("brand", "boş-marka")
        smartlinks_path = os.path.join(os.path.dirname(__file__), "core", "smartlinks.json")
        
        smartlinks_data = {}
        if os.path.exists(smartlinks_path):
            try:
                with open(smartlinks_path, "r", encoding="utf-8") as f:
                    smartlinks_data = json.load(f)
            except Exception:
                pass
                
        smartlinks_data[brand_slug] = body
        
        # Ensure directories exist
        os.makedirs(os.path.dirname(smartlinks_path), exist_ok=True)
        
        try:
            with open(smartlinks_path, "w", encoding="utf-8") as f:
                json.dump(smartlinks_data, f, indent=4, ensure_ascii=False)
            self.send_json_response({"success": True, "url": f"/sl/{brand_slug}"})
        except Exception as e:
            self.send_json_response({"success": False, "error": str(e)}, 500)


def main():
    os.makedirs(DIRECTORY, exist_ok=True)

    handler = CustomHTTPRequestHandler
    socketserver.ThreadingTCPServer.allow_reuse_address = True

    with socketserver.ThreadingTCPServer(("", PORT), handler) as httpd:
        print("\n" + "="*60)
        print("    biAjans — AI Marketing & Social Media OS")
        print("="*60)
        print(f"  --> Local Address  : http://localhost:{PORT}")
        print(f"  --> Static Folder  : {DIRECTORY}/")
        print(f"  --> OAuth Callback : {Config.APP_BASE_URL}/auth/<platform>/callback")
        print(f"  --> Connections API: http://localhost:{PORT}/api/connections/status")
        print("  --> Press CTRL+C to terminate.")
        print("="*60)

        gemini_ok = bool(Config.GEMINI_API_KEY) and "your_" not in Config.GEMINI_API_KEY
        openai_ok = bool(Config.OPENAI_API_KEY) and "your_" not in Config.OPENAI_API_KEY

        if not gemini_ok or not openai_ok:
            print("\n[UYARI] AI anahtarları yapılandırılmamış -> MOCK MOD aktif.")
            print("         Test için 'fıstık ezmesi' veya 'kahve' yazın.\n")

        configured_platforms = [
            p for p in ["meta", "google", "linkedin", "x", "tiktok", "pinterest", "bluesky"]
            if Config.platform_configured(p)
        ]
        if configured_platforms:
            print(f"[OAuth] Yapılandırılmış platformlar: {', '.join(configured_platforms)}")
        else:
            print("[OAuth] Henüz OAuth kimlik bilgisi yapılandırılmamış.")
            print("        .env dosyasına platform credentials ekleyin.\n")

        print("-"*60 + "\n")

        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down... Goodbye!")
            sys.exit(0)


if __name__ == "__main__":
    main()
