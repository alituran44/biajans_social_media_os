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


def get_smartlinks_path():
    path = os.path.join(os.path.dirname(__file__), "core", "smartlinks.json")
    if "VERCEL" in os.environ or os.environ.get("VERCEL"):
        tmp_path = "/tmp/smartlinks.json"
        if not os.path.exists(tmp_path):
            try:
                if os.path.exists(path):
                    import shutil
                    shutil.copy(path, tmp_path)
            except Exception:
                pass
        return tmp_path
    return path


class CustomHTTPRequestHandler(http.server.BaseHTTPRequestHandler):
    """
    Zero-dependency request handler serving index.html, CSS, JS
    and routing API requests including OAuth flows.
    """

    def _get_session_id(self):
        cookie_header = self.headers.get("Cookie", "")
        cookies = {}
        if cookie_header:
            for cookie in cookie_header.split(";"):
                parts = cookie.strip().split("=", 1)
                if len(parts) == 2:
                    cookies[parts[0]] = parts[1]
        return cookies.get("session_id")

    def _get_session(self):
        session_id = self._get_session_id()
        if not session_id:
            return None
        from core.db_manager import get_session, delete_session
        session = get_session(session_id)
        if session:
            if session["expires"] > time.time():
                return session
            else:
                delete_session(session_id)
        return None

    # ──────────────────────────────────────────────────────────────────────────
    # GET
    # ──────────────────────────────────────────────────────────────────────────

    def do_GET(self):
        # Dynamically set APP_BASE_URL from request headers to support Vercel/proxies automatically
        host = self.headers.get("X-Forwarded-Host") or self.headers.get("Host")
        if host:
            proto = self.headers.get("X-Forwarded-Proto", "http")
            Config.APP_BASE_URL = f"{proto}://{host}"

        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path
        qs = urllib.parse.parse_qs(parsed_url.query)

        # Clean URLs normalization (e.g. /dashboard -> /dashboard.html)
        if not path.endswith("/") and not "." in os.path.basename(path):
            potential_file = os.path.join(DIRECTORY, path.lstrip("/") + ".html")
            if os.path.exists(potential_file) and os.path.isfile(potential_file):
                path = path + ".html"

        # Enforce authentication for dashboard.html
        if path == "/dashboard.html":
            if not self._get_session():
                self._redirect("/login.html")
                return

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

        # ── Session check: /api/auth/session ──────────────────────────────────
        if path == "/api/auth/session":
            session = self._get_session()
            if session:
                self.send_json_response({
                    "authenticated": True,
                    "user": {
                        "username": session["username"],
                        "role": session["role"],
                        "email": session["email"]
                    }
                })
            else:
                self.send_json_response({"authenticated": False})
            return

        # ── User List: /api/users/list ────────────────────────────────────────
        if path == "/api/users/list":
            if not self._get_session():
                self.send_json_response({"error": "Unauthorized"}, 401)
                return
            from core.db_manager import list_users
            users = list_users()
            self.send_json_response({"success": True, "users": users})
            return

        # ── Task List: /api/tasks/list ────────────────────────────────────────
        if path == "/api/tasks/list":
            if not self._get_session():
                self.send_json_response({"error": "Unauthorized"}, 401)
                return
            brand_id = qs.get("brand", ["global"])[0]
            from core.db_manager import list_tasks
            tasks = list_tasks(brand_id)
            self.send_json_response({"success": True, "tasks": tasks})
            return

        # ── Connections status: /api/connections/status ───────────────────────
        if path == "/api/connections/status":
            if not self._get_session():
                self.send_json_response({"error": "Unauthorized"}, 401)
                return
            brand_id = qs.get("brand", ["global"])[0]
            status = get_all_connection_status(brand_id)
            self.send_json_response({"status": "ok", "connections": status})
            return

        # ── Competitors Analysis: /api/competitors/analyze ────────────────────
        if path == "/api/competitors/analyze":
            if not self._get_session():
                self.send_json_response({"error": "Unauthorized"}, 401)
                return
            sector = qs.get("sector", ["Gıda & İçecek"])[0]
            city = qs.get("city", ["İstanbul"])[0]
            
            from core.ai_engines import AIEngines
            result = AIEngines.analyze_competitors_ai(sector, city)
            self.send_json_response(result)
            return

        # ── Git Repositories: /api/git/repos ──────────────────────────────────
        if path == "/api/git/repos":
            if not self._get_session():
                self.send_json_response({"error": "Unauthorized"}, 401)
                return
            repos = [
                {
                    "name": "biajans_social_media_os",
                    "description": "Yapay Zeka Destekli Sosyal Medya ve Dijital Pazarlama İşletim Sistemi",
                    "price": 45000,
                    "stars": 12,
                    "language": "Python / JS"
                },
                {
                    "name": "yapay-zeka-ile-soru-uretme",
                    "description": "Yapay Zeka Tabanlı Dinamik Soru Hazırlama & Sınav Portalı",
                    "price": 38000,
                    "stars": 8,
                    "language": "Python"
                },
                {
                    "name": "gelanlasalim-v2",
                    "description": "Yeni Nesil Online Pazarlık ve E-Ticaret Anlaşma Portalı",
                    "price": 35000,
                    "stars": 15,
                    "language": "Javascript"
                },
                {
                    "name": "pdf-soru-kesme",
                    "description": "PDF Belgelerinden Akıllı Soru Kırpma ve Ayıklama Aracı",
                    "price": 32000,
                    "stars": 6,
                    "language": "Python"
                },
                {
                    "name": "gelanlasalim",
                    "description": "Online Pazarlık ve E-Ticaret Teklif Alışveriş Ağı",
                    "price": 25000,
                    "stars": 9,
                    "language": "HTML / JS"
                },
                {
                    "name": "ozel-ders-bulma-yeni",
                    "description": "Yeni Nesil Özel Ders Arama ve Eğitmen Eşleştirme Motoru",
                    "price": 22000,
                    "stars": 5,
                    "language": "Javascript"
                },
                {
                    "name": "bihocam",
                    "description": "Öğretmen - Öğrenci Buluşma ve Ders Rezervasyon Platformu",
                    "price": 18000,
                    "stars": 7,
                    "language": "Vue.js"
                },
                {
                    "name": "mydesirre",
                    "description": "Kişisel Dilek Listesi ve Hediye Paylaşım Ağı",
                    "price": 16500,
                    "stars": 4,
                    "language": "HTML / CSS"
                },
                {
                    "name": "dinapolipizza",
                    "description": "Online Pizza Sipariş ve Restoran Yönetim Paneli",
                    "price": 15000,
                    "stars": 11,
                    "language": "React.js"
                },
                {
                    "name": "mistik-rehber",
                    "description": "Mistik Astrolojik Yorumlama ve Günlük Burç Analizcisi",
                    "price": 14000,
                    "stars": 14,
                    "language": "Python / Flask"
                },
                {
                    "name": "adimizi",
                    "description": "Marka ve İsim Analizi Arama Platformu",
                    "price": 12500,
                    "stars": 3,
                    "language": "Javascript"
                },
                {
                    "name": "Gizemli-Vaka",
                    "description": "İnteraktif Dedektiflik ve Gizem Çözme Hikaye Oyunu",
                    "price": 11000,
                    "stars": 19,
                    "language": "HTML / Canvas"
                },
                {
                    "name": "edeneme",
                    "description": "Öğrenciler İçin Çevrimiçi Deneme Sınavı Çözüm ve Analiz Sistemi",
                    "price": 9500,
                    "stars": 2,
                    "language": "PHP"
                }
            ]
            self.send_json_response({"success": True, "repos": repos})
            return

        # ── CRM Leads List: /api/crm/leads ────────────────────────────────────
        if path == "/api/crm/leads":
            if not self._get_session():
                self.send_json_response({"error": "Unauthorized"}, 401)
                return
            brand_id = qs.get("brand", ["global"])[0]
            from core.db_manager import get_connection
            conn = get_connection()
            cursor = conn.cursor()
            try:
                cursor.execute("""
                    SELECT id, name, email, phone, stage, budget, source, created_at
                    FROM crm_leads
                    WHERE brand_id = ?
                    ORDER BY created_at DESC
                """, (brand_id,))
                leads = [dict(row) for row in cursor.fetchall()]
                self.send_json_response({"success": True, "leads": leads})
            except Exception as e:
                self.send_json_response({"success": False, "error": str(e)}, 500)
            finally:
                conn.close()
            return

        # ── CRM Lead Details: /api/crm/leads/details ──────────────────────────
        if path == "/api/crm/leads/details":
            if not self._get_session():
                self.send_json_response({"error": "Unauthorized"}, 401)
                return
            lead_id = int(qs.get("id", [0])[0])
            from core.db_manager import get_connection
            conn = get_connection()
            cursor = conn.cursor()
            try:
                cursor.execute("SELECT id, name, email, phone, stage, budget, source, created_at FROM crm_leads WHERE id = ?", (lead_id,))
                row = cursor.fetchone()
                if not row:
                    self.send_json_response({"success": False, "error": "Lead not found"}, 404)
                    return
                lead_info = dict(row)

                cursor.execute("SELECT id, sender, message, created_at FROM crm_messages WHERE lead_id = ? ORDER BY created_at ASC", (lead_id,))
                messages = [dict(r) for r in cursor.fetchall()]

                cursor.execute("SELECT id, note_text, created_at FROM crm_notes WHERE lead_id = ? ORDER BY created_at DESC", (lead_id,))
                notes = [dict(r) for r in cursor.fetchall()]

                self.send_json_response({
                    "success": True,
                    "lead": lead_info,
                    "messages": messages,
                    "notes": notes
                })
            except Exception as e:
                self.send_json_response({"success": False, "error": str(e)}, 500)
            finally:
                conn.close()
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
        # Dynamically set APP_BASE_URL from request headers to support Vercel/proxies automatically
        host = self.headers.get("X-Forwarded-Host") or self.headers.get("Host")
        if host:
            proto = self.headers.get("X-Forwarded-Proto", "http")
            Config.APP_BASE_URL = f"{proto}://{host}"

        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path

        # Clean URLs normalization (e.g. /dashboard -> /dashboard.html)
        if not path.endswith("/") and not "." in os.path.basename(path):
            potential_file = os.path.join(DIRECTORY, path.lstrip("/") + ".html")
            if os.path.exists(potential_file) and os.path.isfile(potential_file):
                path = path + ".html"

        content_length = int(self.headers.get("Content-Length", 0))
        post_data = self.rfile.read(content_length) if content_length else b"{}"

        try:
            body = json.loads(post_data.decode("utf-8")) if post_data else {}
        except Exception:
            body = {}

        # Enforce authentication for all /api/ POST requests except login and public lead submit
        if path.startswith("/api/") and path not in ["/api/auth/login", "/api/crm/leads/public-submit"]:
            if not self._get_session():
                self.send_json_response({"error": "Unauthorized", "message": "Lütfen giriş yapın."}, 401)
                return

        # ── Login: /api/auth/login ──────────────────────────────────────────
        if path == "/api/auth/login":
            username = body.get("username", "").strip()
            password = body.get("password", "").strip()
            if not username or not password:
                self.send_json_response({"success": False, "error": "Kullanıcı adı ve şifre zorunludur."}, 400)
                return

            from core.db_manager import get_user_by_username, verify_password, create_session
            user = get_user_by_username(username)
            if user and verify_password(user["password_hash"], password):
                import uuid
                session_id = uuid.uuid4().hex
                # Expires in 24 hours
                expires = time.time() + 24 * 3600
                create_session(session_id, user["username"], user["role"], user["email"], expires)
                
                # Set HttpOnly cookie
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Set-Cookie", f"session_id={session_id}; Path=/; HttpOnly; SameSite=Lax; Max-Age={24*3600}")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                
                resp = {"success": True, "user": {"username": user["username"], "role": user["role"], "email": user["email"]}}
                self.wfile.write(json.dumps(resp, ensure_ascii=False).encode("utf-8"))
            else:
                self.send_json_response({"success": False, "error": "Geçersiz kullanıcı adı veya şifre."}, 400)
            return

        # ── Logout: /api/auth/logout ─────────────────────────────────────────
        if path == "/api/auth/logout":
            session_id = self._get_session_id()
            if session_id:
                from core.db_manager import delete_session
                delete_session(session_id)
            
            # Clear cookie
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Set-Cookie", "session_id=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            
            self.wfile.write(json.dumps({"success": True}).encode("utf-8"))
            return

        # ── Campaign Focus Group Simulation: /api/campaign/simulate ───────────
        if path == "/api/campaign/simulate":
            post_text = body.get("post_text", "").strip()
            brand_name = body.get("brand", "BiAjans").strip()
            sector = body.get("sector", "Genel").strip()
            
            if not post_text:
                self.send_json_response({"success": False, "error": "Gönderi metni boş olamaz."}, 400)
                return
                
            from core.ai_engines import AIEngines
            res = AIEngines.simulate_focus_group(post_text, brand_name, sector)
            self.send_json_response(res)
            return

        # ── Add User: /api/users/add ──────────────────────────────────────────
        if path == "/api/users/add":
            session = self._get_session()
            if session["role"] != "admin":
                self.send_json_response({"success": False, "error": "Yetkiniz yok. Sadece yönetici kullanıcı ekleyebilir."}, 403)
                return

            new_username = body.get("username", "").strip()
            new_email = body.get("email", "").strip()
            new_password = body.get("password", "").strip()
            new_role = body.get("role", "member").strip()

            if not new_username or not new_email or not new_password or not new_role:
                self.send_json_response({"success": False, "error": "Tüm alanlar zorunludur."}, 400)
                return

            from core.db_manager import add_user
            success = add_user(new_username, new_email, new_password, new_role)
            if success:
                self.send_json_response({"success": True})
            else:
                self.send_json_response({"success": False, "error": "Kullanıcı oluşturulamadı veya bu isim zaten kullanımda."}, 400)
            return

        # ── Delete User: /api/users/delete ────────────────────────────────────
        if path == "/api/users/delete":
            session = self._get_session()
            if session["role"] != "admin":
                self.send_json_response({"success": False, "error": "Yetkiniz yok. Sadece yönetici kullanıcı silebilir."}, 403)
                return

            user_id = body.get("user_id")
            if not user_id:
                self.send_json_response({"success": False, "error": "Kullanıcı ID gereklidir."}, 400)
                return

            from core.db_manager import delete_user
            success = delete_user(int(user_id))
            if success:
                self.send_json_response({"success": True})
            else:
                self.send_json_response({"success": False, "error": "Kullanıcı silinemedi."}, 400)
            return

        # ── Add Task: /api/tasks/add ──────────────────────────────────────────
        if path == "/api/tasks/add":
            brand_id = body.get("brand", "global").strip()
            title = body.get("title", "").strip()
            description = body.get("description", "").strip()
            assigned_to = body.get("assigned_to", "").strip() or None
            due_date = body.get("due_date", "").strip() or None

            if not title:
                self.send_json_response({"success": False, "error": "Görev başlığı zorunludur."}, 400)
                return

            from core.db_manager import add_task
            success = add_task(brand_id, title, description, assigned_to, due_date)
            if success:
                self.send_json_response({"success": True})
            else:
                self.send_json_response({"success": False, "error": "Görev oluşturulamadı."}, 400)
            return

        # ── Update Task Status: /api/tasks/update ─────────────────────────────
        if path == "/api/tasks/update":
            task_id = body.get("task_id")
            status = body.get("status", "").strip()

            if not task_id or not status:
                self.send_json_response({"success": False, "error": "Görev ID ve durum zorunludur."}, 400)
                return

            from core.db_manager import update_task_status
            success = update_task_status(int(task_id), status)
            if success:
                self.send_json_response({"success": True})
            else:
                self.send_json_response({"success": False, "error": "Görev güncellenemedi."}, 400)
            return

        # ── Delete Task: /api/tasks/delete ────────────────────────────────────
        if path == "/api/tasks/delete":
            task_id = body.get("task_id")
            if not task_id:
                self.send_json_response({"success": False, "error": "Görev ID gereklidir."}, 400)
                return

            from core.db_manager import delete_task
            success = delete_task(int(task_id))
            if success:
                self.send_json_response({"success": True})
            else:
                self.send_json_response({"success": False, "error": "Görev silinemedi."}, 400)
            return

        # ── Save SmartLinks API: /api/smartlinks/save ────────────────────────
        if path == "/api/smartlinks/save":
            self._handle_smartlinks_save(body)
            return

        # ── Content generation ─────────────────────────────────────────────
        if path == "/api/generate":
            self._handle_generate(body)
            return

        # ── Inbox AI reply assistant ─────────────────────────────────────────
        if path == "/api/inbox/ai-assist":
            self._handle_inbox_ai_assist(body)
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

        # ── CRM: Public Submit Lead ──────────────────────────────────────────
        if path == "/api/crm/leads/public-submit":
            brand_id = body.get("brand", "global").strip()
            name = body.get("name", "").strip()
            email = body.get("email", "").strip() or None
            phone = body.get("phone", "").strip() or None
            message = body.get("message", "").strip()
            
            if not name:
                self.send_json_response({"success": False, "error": "İsim alanı zorunludur."}, 400)
                return
                
            from core.db_manager import get_connection
            conn = get_connection()
            cursor = conn.cursor()
            try:
                # Insert lead
                cursor.execute("""
                    INSERT INTO crm_leads (brand_id, name, email, phone, stage, budget, source, created_at)
                    VALUES (?, ?, ?, ?, 'new', 0.0, 'Web Form', ?)
                """, (brand_id, name, email, phone, int(time.time())))
                lead_id = cursor.lastrowid
                
                # Insert message if provided
                if message:
                    cursor.execute("""
                        INSERT INTO crm_messages (lead_id, sender, message, created_at)
                        VALUES (?, 'lead', ?, ?)
                    """, (lead_id, message, int(time.time())))
                
                conn.commit()
                self.send_json_response({"success": True, "lead_id": lead_id})
            except Exception as e:
                self.send_json_response({"success": False, "error": str(e)}, 500)
            finally:
                conn.close()
            return

        # ── CRM: Add Lead ──────────────────────────────────────────────────
        if path == "/api/crm/leads/add":
            if not self._get_session():
                self.send_json_response({"error": "Unauthorized"}, 401)
                return
            brand_id = body.get("brand", "global").strip()
            name = body.get("name", "").strip()
            email = body.get("email", "").strip() or None
            phone = body.get("phone", "").strip() or None
            budget = float(body.get("budget", 0.0) or 0.0)
            source = body.get("source", "Direct").strip()
            stage = body.get("stage", "new").strip()
            
            if not name:
                self.send_json_response({"success": False, "error": "Name is required"}, 400)
                return
                
            from core.db_manager import get_connection
            conn = get_connection()
            cursor = conn.cursor()
            try:
                cursor.execute("""
                    INSERT INTO crm_leads (brand_id, name, email, phone, stage, budget, source, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (brand_id, name, email, phone, stage, budget, source, int(time.time())))
                lead_id = cursor.lastrowid
                conn.commit()
                self.send_json_response({"success": True, "lead_id": lead_id})
            except Exception as e:
                self.send_json_response({"success": False, "error": str(e)}, 500)
            finally:
                conn.close()
            return

        # ── CRM: Update Lead Stage ─────────────────────────────────────────
        if path == "/api/crm/leads/update-stage":
            if not self._get_session():
                self.send_json_response({"error": "Unauthorized"}, 401)
                return
            lead_id = int(body.get("id") or body.get("lead_id") or 0)
            new_stage = body.get("stage", "").strip()
            
            if not lead_id or not new_stage:
                self.send_json_response({"success": False, "error": "Lead ID and stage are required"}, 400)
                return
                
            from core.db_manager import get_connection
            conn = get_connection()
            cursor = conn.cursor()
            try:
                cursor.execute("UPDATE crm_leads SET stage = ? WHERE id = ?", (new_stage, lead_id))
                conn.commit()
                self.send_json_response({"success": True})
            except Exception as e:
                self.send_json_response({"success": False, "error": str(e)}, 500)
            finally:
                conn.close()
            return

        # ── CRM: Update Lead Details ───────────────────────────────────────
        if path == "/api/crm/leads/update-details":
            if not self._get_session():
                self.send_json_response({"error": "Unauthorized"}, 401)
                return
            lead_id = int(body.get("id", 0))
            name = body.get("name", "").strip()
            email = body.get("email", "").strip() or None
            phone = body.get("phone", "").strip() or None
            budget = float(body.get("budget", 0.0) or 0.0)
            source = body.get("source", "Direct").strip()
            
            if not lead_id or not name:
                self.send_json_response({"success": False, "error": "Lead ID and name are required"}, 400)
                return
                
            from core.db_manager import get_connection
            conn = get_connection()
            cursor = conn.cursor()
            try:
                cursor.execute("""
                    UPDATE crm_leads 
                    SET name = ?, email = ?, phone = ?, budget = ?, source = ?
                    WHERE id = ?
                """, (name, email, phone, budget, source, lead_id))
                conn.commit()
                self.send_json_response({"success": True})
            except Exception as e:
                self.send_json_response({"success": False, "error": str(e)}, 500)
            finally:
                conn.close()
            return

        # ── CRM: Add Message ───────────────────────────────────────────────
        if path == "/api/crm/leads/add-message":
            if not self._get_session():
                self.send_json_response({"error": "Unauthorized"}, 401)
                return
            lead_id = int(body.get("lead_id", 0))
            sender = body.get("sender", "user").strip()
            message = body.get("message", "").strip()
            
            if not lead_id or not message:
                self.send_json_response({"success": False, "error": "Lead ID and message are required"}, 400)
                return
                
            from core.db_manager import get_connection
            conn = get_connection()
            cursor = conn.cursor()
            try:
                cursor.execute("""
                    INSERT INTO crm_messages (lead_id, sender, message, created_at)
                    VALUES (?, ?, ?, ?)
                """, (lead_id, sender, message, int(time.time())))
                conn.commit()
                self.send_json_response({"success": True})
            except Exception as e:
                self.send_json_response({"success": False, "error": str(e)}, 500)
            finally:
                conn.close()
            return

        # ── CRM: Add Note ──────────────────────────────────────────────────
        if path == "/api/crm/leads/add-note":
            if not self._get_session():
                self.send_json_response({"error": "Unauthorized"}, 401)
                return
            lead_id = int(body.get("lead_id", 0))
            note_text = body.get("note_text", "").strip()
            
            if not lead_id or not note_text:
                self.send_json_response({"success": False, "error": "Lead ID and note text are required"}, 400)
                return
                
            from core.db_manager import get_connection
            conn = get_connection()
            cursor = conn.cursor()
            try:
                cursor.execute("""
                    INSERT INTO crm_notes (lead_id, note_text, created_at)
                    VALUES (?, ?, ?)
                """, (lead_id, note_text, int(time.time())))
                conn.commit()
                self.send_json_response({"success": True})
            except Exception as e:
                self.send_json_response({"success": False, "error": str(e)}, 500)
            finally:
                conn.close()
            return

        # ── CRM: AI Suggest Reply ──────────────────────────────────────────
        if path == "/api/crm/leads/ai-suggest":
            if not self._get_session():
                self.send_json_response({"error": "Unauthorized"}, 401)
                return
            lead_id = int(body.get("lead_id", 0))
            
            if not lead_id:
                self.send_json_response({"success": False, "error": "Lead ID is required"}, 400)
                return
                
            from core.db_manager import get_connection
            conn = get_connection()
            cursor = conn.cursor()
            messages = []
            lead_name = "Müşteri"
            try:
                cursor.execute("SELECT name FROM crm_leads WHERE id = ?", (lead_id,))
                row = cursor.fetchone()
                if row:
                    lead_name = row["name"]
                    
                cursor.execute("SELECT sender, message FROM crm_messages WHERE lead_id = ? ORDER BY created_at ASC", (lead_id,))
                messages = [dict(r) for r in cursor.fetchall()]
            except Exception as e:
                self.send_json_response({"success": False, "error": str(e)}, 500)
                conn.close()
                return
            finally:
                conn.close()
                
            convo_str = ""
            for m in messages:
                role = "Müşteri" if m["sender"] == "lead" else "Satış Temsilcimiz"
                convo_str += f"{role}: {m['message']}\n"
                
            prompt = (
                f"Aşağıda bir potansiyel müşterimiz ({lead_name}) ile aramızdaki mesajlaşma geçmişi yer almaktadır.\n\n"
                f"{convo_str}\n"
                f"Lütfen son mesaja karşılık olarak, müşteriyi ikna etmeye yönelik, kibar, profesyonel, samimi ve Türkçe "
                f"bir satış yanıtı önerisi yaz. Başka hiçbir açıklama yazma, doğrudan mesaj taslağını ver."
            )
            
            from core.ai_engines import AIEngines
            openai_keys_present = bool(Config.OPENAI_API_KEY) and "your_openai_api_key_here" not in Config.OPENAI_API_KEY
            gemini_keys_present = bool(Config.GEMINI_API_KEY) and "your_gemini_api_key_here" not in Config.GEMINI_API_KEY
            
            ai_suggested_response = ""
            if gemini_keys_present or openai_keys_present:
                try:
                    if gemini_keys_present:
                        from google import genai
                        client = genai.Client(api_key=Config.GEMINI_API_KEY)
                        response = client.models.generate_content(
                            model='gemini-2.5-flash',
                            contents=prompt
                        )
                        ai_suggested_response = response.text.strip()
                    elif openai_keys_present:
                        from openai import OpenAI
                        client = OpenAI(api_key=Config.OPENAI_API_KEY)
                        response = client.chat.completions.create(
                            model="gpt-4o",
                            messages=[{"role": "user", "content": prompt}]
                        )
                        ai_suggested_response = response.choices[0].message.content.strip()
                except Exception as e:
                    print(f"AI response suggestion error: {e}")
                    
            if not ai_suggested_response:
                ai_suggested_response = (
                    f"Merhaba {lead_name} Hanım/Bey, talebinizi aldık. "
                    f"Size en uygun teklifi ve lansman indirimlerimizi iletmek için sabırsızlanıyoruz. "
                    f"Detaylı bilgi ve randevu için telefon numaramızdan da ulaşabilirsiniz."
                )
                
            self.send_json_response({"success": True, "suggestion": ai_suggested_response})
            return

        # ── CRM: Delete Lead ───────────────────────────────────────────────
        if path == "/api/crm/leads/delete":
            if not self._get_session():
                self.send_json_response({"error": "Unauthorized"}, 401)
                return
            lead_id = int(body.get("lead_id", 0))
            if not lead_id:
                self.send_json_response({"success": False, "error": "Lead ID is required"}, 400)
                return
                
            from core.db_manager import get_connection
            conn = get_connection()
            cursor = conn.cursor()
            try:
                cursor.execute("DELETE FROM crm_leads WHERE id = ?", (lead_id,))
                conn.commit()
                self.send_json_response({"success": True})
            except Exception as e:
                self.send_json_response({"success": False, "error": str(e)}, 500)
            finally:
                conn.close()
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
        base_redirect = "/dashboard.html"

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
        ai_instructions = request_json.get("ai_instructions")

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
                user_prompt, ai_provider, ai_api_key, ai_model, ai_instructions=ai_instructions
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
            social_content = AIEngines.generate_social_content(user_prompt, ai_instructions=ai_instructions)

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

    def _handle_inbox_ai_assist(self, request_json: dict):
        messages = request_json.get("messages", [])
        platform = request_json.get("platform", "general").strip()
        brand_name = request_json.get("brand", "biAjans").strip()
        writing_style = request_json.get("writing_style", "").strip()

        ai_provider = request_json.get("ai_provider", "default").strip().lower()
        ai_api_key = request_json.get("ai_api_key", "").strip()
        ai_model = request_json.get("ai_model", "").strip()

        context_lines = []
        for m in messages:
            sender = "Destek/Biz" if m.get("isSender") else "Müşteri"
            text = m.get("text", "").strip()
            if text:
                context_lines.append(f"{sender}: {text}")
        chat_context = "\n".join(context_lines)

        if not chat_context:
            self.send_json_response({"success": False, "error": "Boş sohbet geçmişi!"}, 400)
            return

        reply_text = AIEngines.generate_reply_assist(
            chat_context=chat_context,
            platform=platform,
            brand_name=brand_name,
            writing_style=writing_style,
            provider=ai_provider,
            api_key=ai_api_key,
            model=ai_model
        )

        if reply_text:
            self.send_json_response({"success": True, "reply": reply_text})
        else:
            self.send_json_response({"success": False, "error": "Yapay zeka yanıt oluşturamadı."}, 500)

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
        smartlinks_path = get_smartlinks_path()
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

        # Build form HTML if enabled
        form_html = ""
        if data.get("form_enabled"):
            form_title = data.get("form_title", "Bize Ulaşın").strip() or "Bize Ulaşın"
            form_btn_text = data.get("form_button_text", "Gönder").strip() or "Gönder"
            form_html = f"""
        <div class="contact-form-card">
            <h3>{form_title}</h3>
            <form id="contactForm">
                <input type="hidden" name="brand" value="{brand_slug}">
                <div class="form-group-custom">
                    <label>Adınız Soyadınız *</label>
                    <input type="text" name="name" required placeholder="Örn. Ahmet Yılmaz" class="form-control-custom-field">
                </div>
                <div class="form-group-custom">
                    <label>Telefon Numaranız</label>
                    <input type="tel" name="phone" placeholder="Örn. 0555 123 45 67" class="form-control-custom-field">
                </div>
                <div class="form-group-custom">
                    <label>E-posta Adresiniz</label>
                    <input type="email" name="email" placeholder="Örn. ahmet@example.com" class="form-control-custom-field">
                </div>
                <div class="form-group-custom">
                    <label>Mesajınız</label>
                    <textarea name="message" rows="3" placeholder="Mesajınızı buraya yazın..." class="form-control-custom-field"></textarea>
                </div>
                <button type="submit" class="form-submit-btn">{form_btn_text}</button>
                <div id="formStatus" class="form-status-alert"></div>
            </form>
            <script>
                document.getElementById('contactForm').addEventListener('submit', async function(e) {{
                    e.preventDefault();
                    const form = e.target;
                    const btn = form.querySelector('button[type="submit"]');
                    const status = document.getElementById('formStatus');
                    
                    const origBtnText = btn.textContent;
                    btn.disabled = true;
                    btn.textContent = 'Gönderiliyor...';
                    status.style.display = 'none';
                    
                    const payload = {{
                        brand: form.brand.value,
                        name: form.name.value,
                        phone: form.phone.value,
                        email: form.email.value,
                        message: form.message.value
                    }};
                    
                    try {{
                        const res = await fetch('/api/crm/leads/public-submit', {{
                            method: 'POST',
                            headers: {{ 'Content-Type': 'application/json' }},
                            body: JSON.stringify(payload)
                        }});
                        const data = await res.json();
                        if (data.success) {{
                            status.style.display = 'block';
                            status.style.backgroundColor = '#d1fae5';
                            status.style.color = '#065f46';
                            status.textContent = 'Talebiniz başarıyla alındı! Teşekkür ederiz. 😊';
                            form.reset();
                        }} else {{
                            status.style.display = 'block';
                            status.style.backgroundColor = '#fee2e2';
                            status.style.color = '#991b1b';
                            status.textContent = 'Hata: ' + (data.error || 'Form gönderilemedi.');
                        }}
                    }} catch (err) {{
                        status.style.display = 'block';
                        status.style.backgroundColor = '#fee2e2';
                        status.style.color = '#991b1b';
                        status.textContent = 'Bir ağ hatası oluştu. Lütfen tekrar deneyin.';
                    }} finally {{
                        btn.disabled = false;
                        btn.textContent = origBtnText;
                    }}
                }});
            </script>
        </div>
            """

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
        .contact-form-card {{
            width: 100%;
            box-sizing: border-box;
            background: var(--btn-bg);
            color: var(--text-color);
            border: var(--btn-border);
            border-radius: 20px;
            padding: 24px;
            margin-bottom: 36px;
            box-shadow: var(--btn-shadow);
            text-align: left;
            backdrop-filter: blur(10px);
        }}
        .contact-form-card h3 {{
            font-size: 15.5px;
            font-weight: 800;
            margin: 0 0 16px 0;
            text-align: center;
        }}
        .form-group-custom {{
            margin-bottom: 12px;
        }}
        .form-group-custom label {{
            display: block;
            font-size: 11px;
            font-weight: 700;
            opacity: 0.85;
            margin-bottom: 4px;
        }}
        .form-control-custom-field {{
            width: 100%;
            box-sizing: border-box;
            padding: 11px 14px;
            border-radius: 8px;
            border: 1px solid rgba(128, 128, 128, 0.25);
            font-family: inherit;
            font-size: 13px;
            outline: none;
            transition: all 0.2s;
        }}
        body.theme-clean-light .form-control-custom-field {{ background: #f8fafc; color: #0f172a; }}
        body.theme-dark-night .form-control-custom-field {{ background: #1e293b; color: #ffffff; }}
        body.theme-soft-lavender .form-control-custom-field {{ background: #f5f3ff; color: #4c1d95; }}
        body.theme-ocean-breeze .form-control-custom-field {{ background: rgba(255, 255, 255, 0.15); color: #ffffff; }}
        body.theme-sunset-glow .form-control-custom-field {{ background: rgba(255, 255, 255, 0.15); color: #ffffff; }}

        .form-control-custom-field:focus {{
            border-color: var(--text-color);
            box-shadow: 0 0 0 2px rgba(128, 128, 128, 0.15);
        }}
        .form-control-custom-field::placeholder {{
            color: var(--text-color);
            opacity: 0.4;
        }}
        .form-submit-btn {{
            width: 100%;
            box-sizing: border-box;
            padding: 13px;
            border-radius: 30px;
            border: none;
            font-weight: 700;
            font-size: 13.5px;
            cursor: pointer;
            transition: opacity 0.2s;
            margin-top: 8px;
        }}
        body.theme-clean-light .form-submit-btn {{ background: #0f172a; color: #ffffff; }}
        body.theme-dark-night .form-submit-btn {{ background: #ffffff; color: #0f172a; }}
        body.theme-soft-lavender .form-submit-btn {{ background: #4c1d95; color: #ffffff; }}
        body.theme-ocean-breeze .form-submit-btn {{ background: #ffffff; color: #0284c7; }}
        body.theme-sunset-glow .form-submit-btn {{ background: #ffffff; color: #db2777; }}

        .form-submit-btn:hover {{
            opacity: 0.95;
        }}
        .form-status-alert {{
            display: none;
            text-align: center;
            font-size: 12px;
            font-weight: bold;
            margin-top: 12px;
            padding: 10px;
            border-radius: 8px;
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
        
        {form_html}
        
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
            links_html=links_html,
            form_html=form_html
        )

        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.end_headers()
        self.wfile.write(html_content.encode("utf-8"))

    def _handle_smartlinks_load(self, brand_slug):
        smartlinks_path = get_smartlinks_path()
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
        smartlinks_path = get_smartlinks_path()
        
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
