import os

def load_env_file(filepath=".env"):
    """
    Manually parses a simple .env file and loads values into os.environ.
    This avoids requiring python-dotenv as a hard dependency, making the module more robust.
    """
    if os.path.exists(filepath):
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#"):
                        continue
                    if "=" in line:
                        key, val = line.split("=", 1)
                        key = key.strip()
                        val = val.strip().strip("'\"")
                        # Only set if not already set by system environment
                        if key not in os.environ:
                            os.environ[key] = val
        except Exception as e:
            print(f"[Warning] Failed to load .env file: {e}")

# Load environment variables from .env
load_env_file()

class Config:
    """
    Centralized configuration class for the AI Marketing & Social Media OS.
    Reads API keys from environment variables or a local .env file.
    """

    # ─── AI API Keys ─────────────────────────────────────────────────────────
    GEMINI_API_KEY  = os.getenv("GEMINI_API_KEY",  "")
    OPENAI_API_KEY  = os.getenv("OPENAI_API_KEY",  "")

    # ─── App Base URL (used as OAuth redirect base) ───────────────────────────
    # For local dev: http://localhost:8000
    # For production: https://yourdomain.com
    APP_BASE_URL    = os.getenv("APP_BASE_URL", "http://localhost:8000")
    APP_SECRET_KEY  = os.getenv("APP_SECRET_KEY", "biajans-oauth-secret-change-in-production")

    # ─── Meta (Facebook · Instagram · Threads · WhatsApp · Meta Ads) ─────────
    # Portal: https://developers.facebook.com/apps/
    META_APP_ID     = os.getenv("META_APP_ID",     "")
    META_APP_SECRET = os.getenv("META_APP_SECRET", "")
    # Scopes requested:
    #   pages_read_engagement, pages_show_list, instagram_basic,
    #   instagram_content_publish, ads_read, whatsapp_business_management
    META_SCOPES     = "pages_read_engagement,pages_show_list,pages_manage_posts,instagram_basic,instagram_content_publish,instagram_manage_insights,ads_read,ads_management,whatsapp_business_management"

    # ─── Google (YouTube · Google Ads · Looker Studio) ───────────────────────
    # Portal: https://console.cloud.google.com/apis/credentials
    GOOGLE_CLIENT_ID     = os.getenv("GOOGLE_CLIENT_ID",     "")
    GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
    # Scopes requested:
    #   youtube.readonly, yt-analytics.readonly, adwords (Google Ads)
    GOOGLE_SCOPES = (
        "openid email profile "
        "https://www.googleapis.com/auth/youtube.readonly "
        "https://www.googleapis.com/auth/yt-analytics.readonly "
        "https://www.googleapis.com/auth/adwords"
    )

    # ─── LinkedIn ────────────────────────────────────────────────────────────
    # Portal: https://www.linkedin.com/developers/apps
    LINKEDIN_CLIENT_ID     = os.getenv("LINKEDIN_CLIENT_ID",     "")
    LINKEDIN_CLIENT_SECRET = os.getenv("LINKEDIN_CLIENT_SECRET", "")
    LINKEDIN_SCOPES        = "openid profile email r_organization_social w_organization_social r_ads r_ads_reporting"

    # ─── X (Twitter) ─────────────────────────────────────────────────────────
    # Portal: https://developer.x.com/en/portal/dashboard
    X_CLIENT_ID     = os.getenv("X_CLIENT_ID",     "")
    X_CLIENT_SECRET = os.getenv("X_CLIENT_SECRET", "")
    X_SCOPES        = "tweet.read tweet.write users.read offline.access"

    # ─── TikTok ──────────────────────────────────────────────────────────────
    # Portal: https://developers.tiktok.com/
    TIKTOK_CLIENT_KEY    = os.getenv("TIKTOK_CLIENT_KEY",    "")
    TIKTOK_CLIENT_SECRET = os.getenv("TIKTOK_CLIENT_SECRET", "")
    TIKTOK_SCOPES        = "user.info.basic,video.list,video.upload"

    # ─── Pinterest ───────────────────────────────────────────────────────────
    # Portal: https://developers.pinterest.com/apps/
    PINTEREST_APP_ID     = os.getenv("PINTEREST_APP_ID",     "")
    PINTEREST_APP_SECRET = os.getenv("PINTEREST_APP_SECRET", "")
    PINTEREST_SCOPES     = "boards:read,boards:write,pins:read,pins:write,user_accounts:read,ads:read"

    # ─── Bluesky (AT Protocol — no OAuth, uses app passwords) ────────────────
    # Settings: https://bsky.app/settings/app-passwords
    BLUESKY_IDENTIFIER = os.getenv("BLUESKY_IDENTIFIER", "")  # handle: user.bsky.social
    BLUESKY_APP_PASSWORD = os.getenv("BLUESKY_APP_PASSWORD", "")

    # ─── Helper: OAuth Redirect URI builder ──────────────────────────────────
    @classmethod
    def oauth_redirect_uri(cls, platform: str) -> str:
        """Returns the full redirect URI for a given platform."""
        return f"{cls.APP_BASE_URL}/auth/{platform}/callback"

    # ─── Helper: Check if a platform has credentials configured ──────────────
    @classmethod
    def platform_configured(cls, platform: str) -> bool:
        """Returns True if OAuth credentials are set for the given platform."""
        mapping = {
            "meta":        (cls.META_APP_ID,          cls.META_APP_SECRET),
            "facebook":    (cls.META_APP_ID,          cls.META_APP_SECRET),
            "instagram":   (cls.META_APP_ID,          cls.META_APP_SECRET),
            "threads":     (cls.META_APP_ID,          cls.META_APP_SECRET),
            "whatsapp":    (cls.META_APP_ID,          cls.META_APP_SECRET),
            "meta_ads":    (cls.META_APP_ID,          cls.META_APP_SECRET),
            "google":      (cls.GOOGLE_CLIENT_ID,     cls.GOOGLE_CLIENT_SECRET),
            "youtube":     (cls.GOOGLE_CLIENT_ID,     cls.GOOGLE_CLIENT_SECRET),
            "google_ads":  (cls.GOOGLE_CLIENT_ID,     cls.GOOGLE_CLIENT_SECRET),
            "linkedin":    (cls.LINKEDIN_CLIENT_ID,   cls.LINKEDIN_CLIENT_SECRET),
            "x":           (cls.X_CLIENT_ID,          cls.X_CLIENT_SECRET),
            "tiktok":      (cls.TIKTOK_CLIENT_KEY,    cls.TIKTOK_CLIENT_SECRET),
            "pinterest":   (cls.PINTEREST_APP_ID,     cls.PINTEREST_APP_SECRET),
            "bluesky":     (cls.BLUESKY_IDENTIFIER,   cls.BLUESKY_APP_PASSWORD),
        }
        pair = mapping.get(platform.lower())
        if not pair:
            return False
        return all(bool(v) for v in pair)
