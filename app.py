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
    "web":           None,        # OAuth yok — RSS / sitemap
    "blog":          None,        # OAuth yok — RSS
    "facebook":      "meta",
    "instagram":     "meta",
    "threads":       "meta",
    "whatsapp":      "meta",
    "meta reklamlar":"meta",
    "meta_ads":      "meta",
    "meta":          "meta",
    "x":             "x",
    "linkedin":      "linkedin",
    "google ads":    "google",
    "google_ads":    "google",
    "youtube":       "google",
    "google":        "google",
    "tiktok":        "tiktok",
    "tiktok ads":    "tiktok",
    "pinterest":     "pinterest",
    "bluesky":       "bluesky",
    "looker stüdyosu": None,      # Google hesabı gerektirir, özel flow
    "looker_studio": None,
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
            self._handle_oauth_start(platform)
            return

        # ── OAuth callback: /auth/<platform>/callback ─────────────────────────
        if path.startswith("/auth/") and path.endswith("/callback"):
            platform = path.split("/")[2]
            code  = qs.get("code",  [None])[0]
            state = qs.get("state", [None])[0]
            error = qs.get("error", [None])[0]
            self._handle_oauth_callback(platform, code, state, error)
            return

        # ── Connections status: /api/connections/status ───────────────────────
        if path == "/api/connections/status":
            status = get_all_connection_status()
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

        # ── Content generation ─────────────────────────────────────────────
        if path == "/api/generate":
            self._handle_generate(body)
            return

        # ── Bluesky bağlantısı (POST — kullanıcı adı + şifre) ─────────────
        if path == "/api/connect/bluesky":
            identifier   = body.get("identifier", "").strip()
            app_password = body.get("app_password", "").strip()
            if not identifier or not app_password:
                self.send_json_response({"success": False, "error": "Kimlik ve şifre zorunludur."}, 400)
                return
            result = connect_bluesky(identifier, app_password)
            if result.get("success"):
                save_token("bluesky", result["token_data"], profile={
                    "handle": result["token_data"].get("handle", identifier),
                    "did":    result["token_data"].get("did", ""),
                })
                self.send_json_response({"success": True, "platform": "bluesky"})
            else:
                self.send_json_response({"success": False, "error": result.get("error")}, 400)
            return

        # ── Platform bağlantısını kes (revoke) ─────────────────────────────
        if path == "/api/disconnect":
            platform = body.get("platform", "").strip().lower()
            if not platform:
                self.send_json_response({"success": False, "error": "Platform adı zorunludur."}, 400)
                return
            revoke_token(platform)
            self.send_json_response({"success": True, "platform": platform})
            return

        # ── Publish Endpoint ───────────────────────────────────────────────
        if path == "/api/publish":
            platform = body.get("platform", "").strip().lower()
            text = body.get("text", "").strip()
            media_url = body.get("media_url", "").strip() or None
            if not platform or not text:
                self.send_json_response({"success": False, "error": "Platform and text are required."}, 400)
                return
                
            from core.publisher import publish_content
            result = publish_content(platform, text, media_url)
            if result.get("success"):
                self.send_json_response(result)
            else:
                self.send_json_response(result, 400)
            return

        # ── Ads Launch Endpoint ────────────────────────────────────────────
        if path == "/api/ads/launch":
            platform = body.get("platform", "").strip().lower()
            if not platform:
                self.send_json_response({"success": False, "error": "Platform required."}, 400)
                return
                
            from core.ads_manager import launch_ads
            result = launch_ads(platform, body)
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

    def _handle_oauth_start(self, platform: str):
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

        result = start_oauth_flow(canonical)
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
            save_token(platform, result["token_data"])
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

        gemini_keys_present = bool(Config.GEMINI_API_KEY) and "your_gemini_api_key_here" not in Config.GEMINI_API_KEY
        openai_keys_present = bool(Config.OPENAI_API_KEY) and "your_openai_api_key_here" not in Config.OPENAI_API_KEY

        if not gemini_keys_present or not openai_keys_present:
            print(f"\n[MOCK MODE ACTIVE] Generating premium mock assets for: '{user_prompt}'")
            time.sleep(1.8)
            response_data = self.get_premium_mock_response(user_prompt)
            self.send_json_response(response_data)
        else:
            print(f"\n[LIVE MODE ACTIVE] Querying Gemini 1.5 Pro and DALL-E 3 for: '{user_prompt}'")
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
                    "message": "Metin başarıyla üretildi fakat DALL-E 3 görsel çizerken hata verdi."
                }, 500)
                return

            self.send_json_response({
                "status": "success",
                "instagram_facebook_caption": social_content.get("instagram_facebook_caption", ""),
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


def main():
    os.makedirs(DIRECTORY, exist_ok=True)

    handler = CustomHTTPRequestHandler
    socketserver.TCPServer.allow_reuse_address = True

    with socketserver.TCPServer(("", PORT), handler) as httpd:
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
