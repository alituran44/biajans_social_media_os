import os
import sys
import logging
import json
from pydantic import BaseModel, Field
from google import genai
from google.genai import types
from config import Config

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("AIEngines")

class YouTubeContent(BaseModel):
    """
    Sub-schema for YouTube specific video metadata and layout.
    """
    video_title: str = Field(
        description="Dikkat çekici, yüksek tıklama oranına (CTR) sahip, merak uyandıran Türkçe YouTube video/short başlığı."
    )
    video_description: str = Field(
        description="SEO uyumlu, video içeriğini açıklayan, izleyicileri harekete geçiren Türkçe YouTube açıklaması."
    )
    script_outline: str = Field(
        description="Video veya short/reel içeriği için 3-4 maddelik kısa Türkçe akış, kanca giriş ve senaryo taslağı."
    )
    tags: list[str] = Field(
        description="Videonun YouTube aramalarında üst sıralara çıkmasını sağlayacak popüler Türkçe etiketler/anahtar kelimeler."
    )

class SocialContentSchema(BaseModel):
    """
    Pydantic schema to enforce structured multi-platform outputs from Gemini 1.5 Pro.
    """
    instagram_caption: str = Field(
        description="Görsel odaklı, dikkat çekici bir kanca (hook) cümlesiyle başlayan, bol emoji içeren, akıcı Türkçe Instagram açıklaması."
    )
    facebook_post: str = Field(
        description="Topluluk etkileşimi odaklı, daha açıklayıcı, bilgilendirici, paylaşım getirecek ve net bir eylem çağrısı (CTA) içeren Türkçe Facebook gönderisi."
    )
    youtube: YouTubeContent = Field(
        description="YouTube video, short veya reel videoları için hazırlanmış başlık, açıklama, senaryo taslağı ve anahtar kelime seti."
    )
    hashtags: list[str] = Field(
        description="Instagram ve Facebook platformlarının keşfet algoritmalarına uygun popüler Türkçe hashtag'ler."
    )
    image_prompt: str = Field(
        description="Görsel yapay zekalarının (Imagen vb.) harika bir kapak tasarımı veya gönderi görseli çizebilmesi için detaylı, profesyonel, ışık ve kompozisyon belirten İNGİLİZCE imaj promptu."
    )

class CompetitorInfo(BaseModel):
    name: str = Field(description="İl bazındaki gerçek veya son derece gerçekçi rakip firmanın adı.")
    platform: str = Field(description="Rakibin en aktif olduğu sosyal medya kanalı (Instagram, TikTok, Facebook veya LinkedIn).")
    followers: int = Field(description="Takipçi sayısı (örn: 12500).")
    weeklyPosts: int = Field(description="Haftalık paylaşım sıklığı sayısı (örn: 3).")
    growth: float = Field(description="Yüzde olarak haftalık/aylık takipçi büyüme oranı (örn: 1.2).")
    engagement: float = Field(description="Yüzde olarak ortalama etkileşim oranı (örn: 3.4).")

class CompetitorAnalysisSchema(BaseModel):
    competitors: list[CompetitorInfo] = Field(description="Sektör ve il bazında 3 adet rakip firmanın detaylı analizi.")
    opportunity: str = Field(description="Yapay zeka tarafından üretilmiş, sektöre ve ile özel 2-3 cümlelik somut stratejik pazarlama fırsatı analizi.")
    threat: str = Field(description="Yapay zeka tarafından üretilmiş, sektöre ve ile özel 2-3 cümlelik somut stratejik tehdit veya önlem analizi.")

class PersonaSimulation(BaseModel):
    name: str = Field(description="Personanın adı soyadı.")
    type: str = Field(description="Personanın tipi (Detaycı/Şüpheci, Sosyal Medya Meraklısı, Fiyat Avcısı vb.).")
    feedback: str = Field(description="Bu personanın gönderi metnine verdiği 2-3 cümlelik samimi Türkçe geri bildirim/yorum.")
    score: int = Field(description="Personanın gönderiye olan ilgisi/puanı (1 ile 10 arasında bir tamsayı).")

class FocusGroupSimulationSchema(BaseModel):
    personas: list[PersonaSimulation] = Field(description="Gönderiye tepki veren 3 farklı sentetik alıcının detaylı simülasyon çıktısı.")

class AIEngines:
    """
    Core AI engine class providing static methods for content generation using Google Gemini
    and image design generation using OpenAI DALL-E 3.
    """

    @staticmethod
    def _build_system_instruction(base_instruction: str, ai_instructions: dict = None) -> str:
        if not ai_instructions:
            return base_instruction
            
        instruction = base_instruction
        writing_style = ai_instructions.get("writingStyle", "").strip()
        if writing_style:
            instruction += f"\n\nGENEL YAZIM TARZI VE ÜSLUP TALİMATLARI:\n{writing_style}"
            
        platform_instructions = []
        for p in ["instagram", "facebook", "youtube", "x", "bluesky", "threads", "linkedin", "google", "pinterest", "tiktok"]:
            inst = ai_instructions.get(p, "").strip()
            if inst:
                platform_instructions.append(f"- {p.upper()}: {inst}")
        if platform_instructions:
            instruction += "\n\nPLATFORMA ÖZEL TALİMATLAR:\n" + "\n".join(platform_instructions)
            
        return instruction

    @staticmethod
    def generate_social_content(user_prompt: str, ai_instructions: dict = None) -> dict:
        """
        Generates structured multi-platform social media content (Instagram, Facebook, YouTube) using google-generativeai.
        
        Args:
            user_prompt (str): The raw social media or marketing idea entered by the user.
            ai_instructions (dict, optional): Custom writing style and platform guidelines.
            
        Returns:
            dict: A dictionary conforming to SocialContentSchema, or None if an error occurs.
        """
        logger.info("Starting multi-platform content generation using Gemini API...")
        
        if not Config.GEMINI_API_KEY:
            logger.error("Error: GEMINI_API_KEY is not configured in config.py or environment variables.")
            return None
            
        try:
            client = genai.Client(api_key=Config.GEMINI_API_KEY)
            
            # System instructions enforcing the professional multi-channel copywriting persona
            base_instruction = (
                "Sen dijital pazarlama, çok kanallı sosyal medya yönetimi (cross-channel marketing) ve "
                "metin yazarlığı (copywriting) alanında dünya çapında uzmanlaşmış kıdemli bir yapay zeka pazarlama asistanısın.\n"
                "Görevin: Kullanıcının girdiği ham fikri veya ürünü analiz ederek, Instagram, Facebook ve YouTube "
                "platformları için özel olarak optimize edilmiş yüksek dönüşümlü içerikler tasarlamaktır.\n\n"
                "Senden istenen çıktılar ve kurallar:\n"
                "1. Instagram Açıklaması: Görsel odaklı, güçlü bir kanca (hook) ile başlayan, emojilerle zenginleştirilmiş akıcı bir Türkçe metin oluştur.\n"
                "2. Facebook Gönderisi: Topluluk katılımı ve paylaşım odaklı, daha açıklayıcı ve bilgilendirici, net bir CTA (Eylem Çağrısı) barındıran Türkçe bir metin oluştur.\n"
                "3. YouTube İçeriği: Video başlığı (CTR odaklı), SEO uyumlu video açıklaması, video/reel akışı için kısa bir senaryo taslağı (script outline) ve video etiketleri oluştur.\n"
                "4. Hashtag'ler: Instagram ve Facebook için popüler ve niş Türkçe hashtag'ler belirle.\n"
                "5. Görsel Tasarım Promptu: Imagen vb. görsel üretim yapay zekalarının bu içeriklere uygun kusursuz, "
                "sanatsal bir kapak veya gönderi görseli tasarlayabilmesi için detaylı, profesyonel, ışık, kompozisyon, stil belirten "
                "İNGİLİZCE detaylı bir imaj promptu oluştur."
            )
            
            system_instruction = AIEngines._build_system_instruction(base_instruction, ai_instructions)
            
            logger.info("Sending prompt to Gemini (gemini-2.5-flash)...")
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=user_prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=SocialContentSchema,
                    system_instruction=system_instruction
                )
            )
            
            if not response or not response.text:
                logger.error("Received empty response text from Gemini API.")
                return None
                
            result_json = json.loads(response.text.strip())
            logger.info("Successfully received and parsed structured output from Gemini.")
            return result_json
            
        except Exception as e:
            logger.error("An unexpected error occurred during Gemini content generation.")
            logger.error(f"Error details: {e}", exc_info=True)
            # Try fallback to gemini-1.5-flash
            try:
                logger.info("Retrying content generation with gemini-1.5-flash...")
                response = client.models.generate_content(
                    model="gemini-1.5-flash",
                    contents=user_prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        response_schema=SocialContentSchema,
                        system_instruction=system_instruction
                    )
                )
                if response and response.text:
                    return json.loads(response.text.strip())
            except Exception as e2:
                logger.error(f"Fallback to gemini-1.5-flash failed: {e2}")
            return None

    @staticmethod
    def generate_image_design(image_prompt: str) -> str:
        """
        Triggers image generation via DALL-E 3 based on the provided English image prompt.
        
        Args:
            image_prompt (str): Detailed English prompt outlining style, composition, lighting, etc.
            
        Returns:
            str: Temporary image URL from OpenAI, or None if generation fails.
        """
        logger.info("Triggering image design generation using OpenAI DALL-E 3...")
        
        if not Config.OPENAI_API_KEY:
            logger.error("Error: OPENAI_API_KEY is not configured in config.py or environment variables.")
            return None

        try:
            import openai
            
            logger.info(f"Sending prompt to DALL-E 3: '{image_prompt}'")
            
            # Check for modern client-based OpenAI API
            if hasattr(openai, "OpenAI"):
                client = openai.OpenAI(api_key=Config.OPENAI_API_KEY)
                response = client.images.generate(
                    model="dall-e-3",
                    prompt=image_prompt,
                    size="1024x1024",
                    quality="standard",
                    n=1
                )
                image_url = response.data[0].url
            else:
                # Fallback to legacy older openai versions (< 1.0.0)
                openai.api_key = Config.OPENAI_API_KEY
                response = openai.Image.create(
                    model="dall-e-3",
                    prompt=image_prompt,
                    size="1024x1024",
                    quality="standard",
                    n=1
                )
                image_url = response['data'][0]['url']
                
            logger.info("Successfully generated image with DALL-E 3.")
            return image_url
            
        except Exception as e:
            logger.error("An unexpected error occurred during DALL-E 3 image generation.")
            logger.error(f"Error details: {e}", exc_info=True)
            return None

    @staticmethod
    def generate_social_content_openrouter(user_prompt: str, api_key: str, model: str) -> dict:
        """
        Generates structured social media content using OpenRouter API.
        """
        logger.info(f"Starting content generation via OpenRouter using model: {model}...")
        
        system_instruction = (
            "Sen dijital pazarlama, çok kanallı sosyal medya yönetimi (cross-channel marketing) ve "
            "metin yazarlığı (copywriting) alanında dünya çapında uzmanlaşmış kıdemli bir yapay zeka pazarlama asistanısın.\n"
            "Görevin: Kullanıcının girdiği ham fikri veya ürünü analiz ederek, Instagram, Facebook ve YouTube "
            "platformları için özel olarak optimize edilmiş yüksek dönüşümlü içerikler tasarlamaktır.\n\n"
            "Senden istenen çıktılar ve kurallar:\n"
            "1. Instagram Açıklaması: Görsel odaklı, güçlü bir kanca (hook) ile başlayan, emojilerle zenginleştirilmiş akıcı bir Türkçe metin oluştur.\n"
            "2. Facebook Gönderisi: Topluluk katılımı ve paylaşım odaklı, daha açıklayıcı ve bilgilendirici, net bir CTA (Eylem Çağrısı) barındıran Türkçe bir metin oluştur.\n"
            "3. YouTube İçeriği: Video başlığı (CTR odaklı), SEO uyumlu video açıklaması, video/reel akışı için kısa bir senaryo taslağı (script outline) ve video etiketleri oluştur.\n"
            "4. Hashtag'ler: Instagram ve Facebook için popüler ve niş Türkçe hashtag'ler belirle.\n"
            "5. Görsel Tasarım Promptu: Imagen vb. görsel üretim yapay zekalarının bu içeriklere uygun kusursuz, "
            "sanatsal bir kapak veya gönderi görseli tasarlayabilmesi için detaylı, profesyonel, ışık, kompozisyon, stil belirten "
            "İNGİLİZCE detaylı bir imaj promptu oluştur.\n\n"
            "CRITICAL RULE: Döneceğin yanıt YALNIZCA geçerli bir JSON objesi olmalıdır. markdown veya text açıklamaları ekleme, sadece saf JSON döndür. JSON yapısı:\n"
            "{\n"
            "  \"instagram_caption\": \"...\",\n"
            "  \"facebook_post\": \"...\",\n"
            "  \"youtube\": {\n"
            "    \"video_title\": \"...\",\n"
            "    \"video_description\": \"...\",\n"
            "    \"script_outline\": \"...\",\n"
            "    \"tags\": [\"...\"]\n"
            "  },\n"
            "  \"hashtags\": [\"...\"],\n"
            "  \"image_prompt\": \"...\"\n"
            "}"
        )

        import urllib.request
        import urllib.error

        url = "https://openrouter.ai/api/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:8080",
            "X-Title": "biAjans",
        }
        
        payload = {
            "model": model or "google/gemma-2-9b-it:free",
            "messages": [
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": user_prompt}
            ],
            "response_format": {"type": "json_object"}
        }

        try:
            req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers, method="POST")
            with urllib.request.urlopen(req, timeout=30) as resp:
                response_data = json.loads(resp.read().decode("utf-8"))
                
            choices = response_data.get("choices", [])
            if not choices:
                logger.error(f"OpenRouter empty choices response: {response_data}")
                return None
                
            content = choices[0].get("message", {}).get("content", "").strip()
            if not content:
                logger.error("OpenRouter empty content in response.")
                return None

            # JSON temizleme (bazı modeller markdown ```json ... ``` ekleyebilir)
            if content.startswith("```"):
                lines = content.splitlines()
                if lines[0].startswith("```json"):
                    content = "\n".join(lines[1:-1])
                elif lines[0].startswith("```"):
                    content = "\n".join(lines[1:-1])
            
            # JSON objesini bulmak için ilk { ve son } aralığını bulalım
            first_brace = content.find("{")
            last_brace = content.rfind("}")
            if first_brace != -1 and last_brace != -1:
                content = content[first_brace:last_brace+1]

            result_json = json.loads(content)
            logger.info("Successfully generated and parsed content from OpenRouter.")
            return result_json

        except Exception as e:
            logger.error(f"Error during OpenRouter generation: {e}", exc_info=True)
            return None

    @staticmethod
    def generate_social_content_custom(user_prompt: str, provider: str, api_key: str, model: str, ai_instructions: dict = None) -> dict:
        """
        Generates structured social media content using custom API providers (openrouter, openai, anthropic, gemini).
        """
        logger.info(f"Starting content generation via Custom Provider: {provider}, Model: {model}...")

        base_instruction = (
            "Sen dijital pazarlama, çok kanallı sosyal medya yönetimi (cross-channel marketing) ve "
            "metin yazarlığı (copywriting) alanında dünya çapında uzmanlaşmış kıdemli bir yapay zeka pazarlama asistanısın.\n"
            "Görevin: Kullanıcının girdiği ham fikri veya ürünü analiz ederek, Instagram, Facebook ve YouTube "
            "platformları için özel olarak optimize edilmiş yüksek dönüşümlü içerikler tasarlamaktır.\n\n"
            "Senden istenen çıktılar ve kurallar:\n"
            "1. Instagram Açıklaması: Görsel odaklı, güçlü bir kanca (hook) ile başlayan, emojilerle zenginleştirilmiş akıcı bir Türkçe metin oluştur.\n"
            "2. Facebook Gönderisi: Topluluk katılımı ve paylaşım odaklı, daha açıklayıcı ve bilgilendirici, net bir CTA (Eylem Çağrısı) barındıran Türkçe bir metin oluştur.\n"
            "3. YouTube İçeriği: Video başlığı (CTR odaklı), SEO uyumlu video açıklaması, video/reel akışı için kısa bir senaryo taslağı (script outline) ve video etiketleri oluştur.\n"
            "4. Hashtag'ler: Instagram ve Facebook için popüler ve niş Türkçe hashtag'ler belirle.\n"
            "5. Görsel Tasarım Promptu: Imagen vb. görsel üretim yapay zekalarının bu içeriklere uygun kusursuz, "
            "sanatsal bir kapak veya gönderi görseli tasarlayabilmesi için detaylı, profesyonel, ışık, kompozisyon, stil belirten "
            "İNGİLİZCE detaylı bir imaj promptu oluştur.\n\n"
            "CRITICAL RULE: Döneceğin yanıt YALNIZCA geçerli bir JSON objesi olmalıdır. markdown veya text açıklamaları ekleme, sadece saf JSON döndür. JSON yapısı:\n"
            "{\n"
            "  \"instagram_caption\": \"...\",\n"
            "  \"facebook_post\": \"...\",\n"
            "  \"youtube\": {\n"
            "    \"video_title\": \"...\",\n"
            "    \"video_description\": \"...\",\n"
            "    \"script_outline\": \"...\",\n"
            "    \"tags\": [\"...\"]\n"
            "  },\n"
            "  \"hashtags\": [\"...\"],\n"
            "  \"image_prompt\": \"...\"\n"
            "}"
        )

        system_instruction = AIEngines._build_system_instruction(base_instruction, ai_instructions)

        import urllib.request
        import urllib.error

        # 1. Setup Request Parameters depending on provider
        url = ""
        headers = {}
        payload = {}

        p_clean = provider.strip().lower()

        if p_clean == "openrouter":
            url = "https://openrouter.ai/api/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost:8080",
                "X-Title": "biAjans",
            }
            payload = {
                "model": model or "google/gemma-2-9b-it:free",
                "messages": [
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": user_prompt}
                ],
                "response_format": {"type": "json_object"}
            }

        elif p_clean == "openai":
            url = "https://api.openai.com/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            }
            payload = {
                "model": model or "gpt-4o-mini",
                "messages": [
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": user_prompt}
                ],
                "response_format": {"type": "json_object"}
            }

        elif p_clean == "anthropic":
            url = "https://api.anthropic.com/v1/messages"
            headers = {
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            }
            payload = {
                "model": model or "claude-3-5-sonnet-20241022",
                "max_tokens": 4000,
                "system": system_instruction,
                "messages": [
                    {"role": "user", "content": user_prompt}
                ]
            }

        elif p_clean == "gemini":
            m_name = model or "gemini-1.5-flash"
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{m_name}:generateContent?key={api_key}"
            headers = {
                "Content-Type": "application/json",
            }
            payload = {
                "contents": [
                    {
                        "parts": [
                            {"text": f"{system_instruction}\n\nKullanıcı Fikri: {user_prompt}"}
                        ]
                    }
                ],
                "generationConfig": {
                    "responseMimeType": "application/json"
                }
            }
        else:
            logger.error(f"Unsupported provider: {p_clean}")
            return None

        # 2. Fire Request
        try:
            req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers, method="POST")
            with urllib.request.urlopen(req, timeout=30) as resp:
                response_data = json.loads(resp.read().decode("utf-8"))

            # 3. Parse Response Content depending on provider
            content = ""
            if p_clean in ["openrouter", "openai"]:
                choices = response_data.get("choices", [])
                if choices:
                    content = choices[0].get("message", {}).get("content", "").strip()
            elif p_clean == "anthropic":
                resp_content = response_data.get("content", [])
                if resp_content:
                    content = resp_content[0].get("text", "").strip()
            elif p_clean == "gemini":
                candidates = response_data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts:
                        content = parts[0].get("text", "").strip()

            if not content:
                logger.error(f"Empty content parsed from provider {p_clean}. Response data: {response_data}")
                return None

            # JSON temizleme (bazı modeller markdown ```json ... ``` ekleyebilir)
            if content.startswith("```"):
                lines = content.splitlines()
                if lines[0].startswith("```json"):
                    content = "\n".join(lines[1:-1])
                elif lines[0].startswith("```"):
                    content = "\n".join(lines[1:-1])
            
            # JSON objesini bulmak için ilk { ve son } aralığını bulalım
            first_brace = content.find("{")
            last_brace = content.rfind("}")
            if first_brace != -1 and last_brace != -1:
                content = content[first_brace:last_brace+1]

            result_json = json.loads(content)
            logger.info(f"Successfully generated and parsed content from Custom Provider: {provider}.")
            return result_json

        except Exception as e:
            logger.error(f"Error during custom provider ({provider}) content generation: {e}", exc_info=True)
            return None

    @staticmethod
    def generate_reply_assist(chat_context: str, platform: str, brand_name: str, writing_style: str, provider: str = "default", api_key: str = "", model: str = "") -> str:
        """
        Generates a context-aware AI reply for the social media inbox using the selected AI engine.
        """
        logger.info(f"Generating inbox reply assist using provider {provider} for platform {platform}...")
        
        system_instruction = (
            f"Sen {brand_name} markası için sosyal medya müşteri ilişkileri ve destek temsilcisi rolündesin.\n"
            f"Görevin, {platform.upper()} platformu üzerinden gelen müşteri mesajına profesyonel, yardımsever "
            f"ve marka kimliğine uygun bir Türkçe cevap yazmaktır.\n"
            f"Genel Yazım Tarzı ve Üslup Talimatı: {writing_style or 'Doğal, samimi ve çözüm odaklı'}\n\n"
            "Kurallar:\n"
            "1. Yanıtın kısa, net ve doğrudan müşterinin sorusunu çözer nitelikte olmalıdır.\n"
            "2. Platform dilini gözeterek emoji kullanabilirsin (özellikle Instagram, WhatsApp ve X için).\n"
            "3. Yalnızca müşteriye gönderilecek ham yanıt metnini döndür, ek açıklama veya tırnak işaretleri ekleme."
        )

        user_prompt = f"Müşteri ile olan son konuşma geçmişi:\n{chat_context}\n\nLütfen bu geçmişe göre en son müşteri mesajını yanıtlayan Türkçe cevabı yaz."

        provider_clean = provider.strip().lower()
        
        # 1. Use custom provider if set
        if provider_clean != "default" and api_key:
            import urllib.request
            import urllib.error
            url = ""
            headers = {}
            payload = {}
            
            if provider_clean == "openrouter":
                url = "https://openrouter.ai/api/v1/chat/completions"
                headers = {
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "http://localhost:8080",
                    "X-Title": "biAjans",
                }
                payload = {
                    "model": model or "google/gemma-2-9b-it:free",
                    "messages": [
                        {"role": "system", "content": system_instruction},
                        {"role": "user", "content": user_prompt}
                    ]
                }
            elif provider_clean == "openai":
                url = "https://api.openai.com/v1/chat/completions"
                headers = {
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                }
                payload = {
                    "model": model or "gpt-4o-mini",
                    "messages": [
                        {"role": "system", "content": system_instruction},
                        {"role": "user", "content": user_prompt}
                    ]
                }
            elif provider_clean == "anthropic":
                url = "https://api.anthropic.com/v1/messages"
                headers = {
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                }
                payload = {
                    "model": model or "claude-3-5-sonnet-20241022",
                    "max_tokens": 1000,
                    "system": system_instruction,
                    "messages": [
                        {"role": "user", "content": user_prompt}
                    ]
                }
            elif provider_clean == "gemini":
                m_name = model or "gemini-1.5-flash"
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{m_name}:generateContent?key={api_key}"
                headers = {
                    "Content-Type": "application/json",
                }
                payload = {
                    "contents": [
                        {
                            "parts": [
                                {"text": f"{system_instruction}\n\nKonuşma geçmişi:\n{chat_context}"}
                            ]
                        }
                    ]
                }
                
            try:
                req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers, method="POST")
                with urllib.request.urlopen(req, timeout=15) as resp:
                    response_data = json.loads(resp.read().decode("utf-8"))
                
                content = ""
                if provider_clean in ["openrouter", "openai"]:
                    choices = response_data.get("choices", [])
                    if choices:
                        content = choices[0].get("message", {}).get("content", "").strip()
                elif provider_clean == "anthropic":
                    resp_content = response_data.get("content", [])
                    if resp_content:
                        content = resp_content[0].get("text", "").strip()
                elif provider_clean == "gemini":
                    candidates = response_data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts:
                            content = parts[0].get("text", "").strip()
                if content:
                    return content
            except Exception as e:
                logger.error(f"Error calling custom AI provider for reply: {e}")
                
        # 2. Fall back to Default system Gemini
        if Config.GEMINI_API_KEY and "your_gemini_api_key_here" not in Config.GEMINI_API_KEY:
            try:
                client = genai.Client(api_key=Config.GEMINI_API_KEY)
                response = client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=user_prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction
                    )
                )
                if response and response.text:
                    return response.text.strip()
            except Exception as e:
                logger.error(f"Fallback to default Gemini for reply failed: {e}")
                
        # 3. Last fallback: rule-based helper
        return AIEngines._get_offline_mock_reply(chat_context, platform, writing_style)

    @staticmethod
    def _get_offline_mock_reply(chat_context: str, platform: str, writing_style: str) -> str:
        """
        Fallback offline rule-based mock assistant based on keywords and user-selected writing style.
        """
        context_lower = chat_context.lower()
        is_friendly = "samimi" in writing_style.lower() or "emoji" in writing_style.lower() or "neşeli" in writing_style.lower()
        
        # 1. Instagram peanut butter scenario
        if "ezme" in context_lower or "fıstık" in context_lower or platform == "instagram":
            if is_friendly:
                return "Selam! 🥜 Taze kavrulmuş yer fıstıklarımızdan elde ettiğimiz ezmeniz yola çıktı! Aras Kargo takip numaranız birazdan SMS olarak telefonunuza iletilecektir. Şimdiden afiyet bal olsun! Bizi tercih ettiğiniz için çok teşekkürler! 🌟🥜"
            else:
                return "Merhaba. Özel kampanyamızdan verdiğiniz fıstık ezmesi siparişiniz bu sabah Aras Kargo'ya teslim edilmiştir. Kargo takip kodunuz gün içerisinde tarafınıza kısa mesaj (SMS) olarak iletilecektir. İlginiz için teşekkür eder, sağlıklı günler dileriz."
                
        # 2. YouTube / coupon code scenario
        if "kupon" in context_lower or "indirim" in context_lower or platform == "youtube":
            if is_friendly:
                return "Selam! ☕️ İndirim kodumuz stok sınırına takılmış olabilir, hiç dert etmeyin! Size özel tek kullanımlık %15 indirim kodunuz: COFFEE15. Hemen sepetinizde uygulayabilirsiniz. Keyifli demlemeler dileriz!"
            else:
                return "Merhaba. Bahsi geçen indirim kuponumuz maalesef stok limiti sebebiyle aktifliğini yitirmiş olabilir. Ancak markamıza gösterdiğiniz ilgi sebebiyle size özel %15 indirim kuponu tanımlanmıştır. COFFEE15 kodunu sepetinizde kullanabilirsiniz."
                
        # 3. Facebook / grind scenario
        if "öğüt" in context_lower or "çekirdek" in context_lower or platform == "facebook":
            return "Merhaba. Sipariş aşamasında kahvenizi dilediğiniz demleme yöntemine (Filtre Kahve Makinesi, French Press, V60, Espresso vb.) uygun olarak taptaze öğüterek gönderiyoruz. French Press için kalın öğütüm seçeneğini tercih edebilirsiniz. Şimdiden afiyet olsun!"
            
        # 4. X / stock scenario
        if "stok" in context_lower or platform == "x":
            return "Merhabalar! Çekirdeklerimizi bu kadar beğenmenize çok mutlu olduk. Yeni taze kavrum çekirdeklerimiz yarın sabah stoklarımızda güncellenecektir. Web sitemizden haber bültenimize kaydolduysanız anlık e-posta bildirimi de alacaksınız. İlginiz için teşekkürler!"
            
        # 5. WhatsApp / general catalog scenario
        if "kargo" in context_lower or "whatsapp" in context_lower or platform == "whatsapp":
            if is_friendly:
                return "Selam! 🌸 Evet, WhatsApp Business kataloğumuz üzerinden doğrudan sipariş verebilirsiniz. Lansmana özel 150 TL ve üzeri tüm siparişlerde kargo tamamen ücretsizdir! Ürün kataloğumuzu inceleyip siparişinizi buradan kolayca tamamlayabilirsiniz. 😊📱"
            else:
                return "Merhaba. WhatsApp Business kataloğumuz üzerinden doğrudan sipariş almaktayız. Kampanyamız kapsamında 150 TL ve üzeri tüm siparişlerde kargo ücretsizdir. Kataloğumuz üzerinden ürünleri seçip siparişinizi doğrudan buradan oluşturabilirsiniz."

        # General backup
        return "Merhaba. Mesajınız ve talebiniz için teşekkür ederiz. Destek ekibimiz en kısa sürede detaylı bilgiyle dönüş yapacaktır. İyi günler dileriz."

    @staticmethod
    def analyze_competitors_ai(sector: str, city: str) -> dict:
        """
        Sektör ve il bazında yapay zeka destekli rakip analizi gerçekleştirir.
        Canlı API üzerinden Gemini'yi yapılandırılmış JSON çıktısı almak üzere çağırır.
        """
        logger.info(f"Starting AI competitor analysis for sector={sector}, city={city}...")
        
        prompt = f"""
        Lütfen {city} ilindeki {sector} sektörü için 3 adet rakip firmanın detaylı rakip analizi raporunu oluştur.
        Analizde rakiplerin adı, en aktif oldukları sosyal platform, takipçi sayıları, paylaşım sıklıkları, büyüme oranları ve etkileşim oranları yer almalıdır.
        Ayrıca bu sektöre ve ile özel 1 adet fırsat (opportunity) ve 1 adet tehdit (threat) analizi üret.
        Rapor dili tamamen Türkçe olmalıdır.
        """
        
        if Config.GEMINI_API_KEY and "your_gemini_api_key_here" not in Config.GEMINI_API_KEY:
            try:
                client = genai.Client(api_key=Config.GEMINI_API_KEY)
                response = client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        response_schema=CompetitorAnalysisSchema,
                        temperature=0.7,
                        system_instruction="Sen bir kıdemli iş zekası ve sosyal medya stratejisti yapay zekasın. Sektör ve il parametrelerine göre en doğru yerel rakip verilerini ve pazarlama analizlerini sağlarsın."
                    )
                )
                if response and response.text:
                    data = json.loads(response.text)
                    return {
                        "success": True, 
                        "competitors": data.get("competitors", []), 
                        "insights": {
                            "opportunity": data.get("opportunity", ""), 
                            "threat": data.get("threat", "")
                        }
                    }
            except Exception as e:
                logger.error(f"Gemini competitor analysis failed: {e}")
                
        return AIEngines._get_offline_competitor_analysis(sector, city)

    @staticmethod
    def _get_offline_competitor_analysis(sector: str, city: str) -> dict:
        """
        Sektör ve il bazlı çevrimdışı yedek (fallback) analiz oluşturucu.
        """
        sector_clean = sector.strip()
        city_clean = city.strip()
        
        if "gıda" in sector_clean.lower() or "kahve" in sector_clean.lower() or "restoran" in sector_clean.lower() or "cafe" in sector_clean.lower():
            comps = [
                {"name": f"Local Coffee {city_clean}", "platform": "Instagram", "followers": 14200, "weeklyPosts": 4, "growth": 1.5, "engagement": 3.8},
                {"name": f"Gurme Fırın {city_clean}", "platform": "Instagram", "followers": 28500, "weeklyPosts": 6, "growth": 2.1, "engagement": 4.2},
                {"name": f"Lezzet Evi {city_clean}", "platform": "Facebook", "followers": 8900, "weeklyPosts": 3, "growth": 0.8, "engagement": 2.4}
            ]
            opp = f"{city_clean} genelinde {sector_clean} sektöründe reels formatında 'hazırlanış videoları' çeken işletmeler daha hızlı organik takipçi kazanıyor. Bu alana odaklanabilirsiniz."
            threat = f"Büyük zincir markalar {city_clean} konumundaki reklam bütçelerini artırıyor. Müşteri tutundurmak için indirim kuponları ve lokal sadakat programları uygulayabilirsiniz."
        elif "spor" in sector_clean.lower() or "sağlık" in sector_clean.lower() or "gym" in sector_clean.lower() or "klinik" in sector_clean.lower():
            comps = [
                {"name": f"Aktif Life {city_clean}", "platform": "Instagram", "followers": 18500, "weeklyPosts": 5, "growth": 2.2, "engagement": 3.5},
                {"name": f"Premium Gym {city_clean}", "platform": "Instagram", "followers": 34000, "weeklyPosts": 7, "growth": 1.9, "engagement": 3.1},
                {"name": f"Fizyoterapi {city_clean}", "platform": "LinkedIn", "followers": 6200, "weeklyPosts": 2, "growth": 1.1, "engagement": 2.8}
            ]
            opp = f"{city_clean} bölgesinde kişiye özel danışmanlık ve başarı hikayeleri paylaşan {sector_clean} hesapları yüksek etkileşim yakalıyor. AI asistanımızla benzer senaryolar kurgulayabilirsiniz."
            threat = f"Yeni nesil butik stüdyolar {city_clean} genelinde mikro-influencer işbirlikleriyle hızlı büyüyor. Benzer kitlelere ulaşmak için yerel reklam bütçenizi optimize etmelisiniz."
        elif "eğitim" in sector_clean.lower() or "kurs" in sector_clean.lower() or "okul" in sector_clean.lower():
            comps = [
                {"name": f"Bilgi Koleji {city_clean}", "platform": "Instagram", "followers": 41000, "weeklyPosts": 6, "growth": 0.9, "engagement": 2.1},
                {"name": f"Akademi {city_clean}", "platform": "Facebook", "followers": 15400, "weeklyPosts": 4, "growth": 1.4, "engagement": 2.7},
                {"name": f"Özel Ders {city_clean}", "platform": "Instagram", "followers": 9800, "weeklyPosts": 5, "growth": 2.8, "engagement": 3.9}
            ]
            opp = f"{city_clean} genelinde sınav ve eğitim rehberliği içeren bilgilendirici carousel (kaydırmalı) gönderiler yüksek paylaşım alıyor. Haftalık içerik planına eklemelisiniz."
            threat = f"Çevrimiçi eğitim devleri yerel anahtar kelimelerde yüksek bütçeli reklamlar veriyor. Fark yaratmak için {city_clean} iline özel başarı hikayelerini ve referanslarınızı ön plana çıkarın."
        else:
            comps = [
                {"name": f"Lider {sector_clean} {city_clean}", "platform": "Instagram", "followers": 22000, "weeklyPosts": 4, "growth": 1.2, "engagement": 3.0},
                {"name": f"Vizyon {sector_clean}", "platform": "LinkedIn", "followers": 11500, "weeklyPosts": 3, "growth": 1.8, "engagement": 3.5},
                {"name": f"{city_clean} {sector_clean} A.Ş.", "platform": "Instagram", "followers": 15600, "weeklyPosts": 5, "growth": 1.0, "engagement": 2.7}
            ]
            opp = f"{city_clean} ilindeki {sector_clean} alanında rakiplerin paylaşım sıklığı oldukça düşük. Her gün düzenli ve özgün AI destekli paylaşımlar yaparak organik görünürlüğünüzü ikiye katlayabilirsiniz."
            threat = f"Sektördeki en yakın rakipleriniz doğrudan mesaj (DM) otomasyonları kullanmaya başladı. Müşteri yanıt hızınızı artırmak için Gelen Kutusu modülünü aktif tutmalısınız."
            
        return {"success": True, "competitors": comps, "insights": {"opportunity": opp, "threat": threat}}

    @staticmethod
    def simulate_focus_group(post_text: str, brand_name: str = "BiAjans", sector: str = "Genel") -> dict:
        """
        Simulates 3 distinct customer personas reacting to the provided post copy.
        """
        post_text = post_text.strip()
        brand_name = brand_name.strip()
        sector = sector.strip()

        api_key = Config.get_gemini_api_key()
        if api_key:
            try:
                client = genai.Client(api_key=api_key)
                prompt = (
                    f"Aşağıdaki sosyal medya gönderisini oku:\n\n"
                    f"\"\"\"\n{post_text}\n\"\"\"\n\n"
                    f"Marka Adı: {brand_name}\n"
                    f"Sektör: {sector}\n\n"
                    f"Görev: Bu gönderiye tepki verecek 3 farklı sentetik müşteri personası oluştur:\n"
                    f"1. Mehmet Ümit (42): Detaycı, şüpheci, fiyat/performans arayan alıcı.\n"
                    f"2. Ece Demir (26): Heyecanlı, sosyal medyayı aktif kullanan, trend meraklısı alıcı.\n"
                    f"3. Can Soylu (34): Kampanya/bütçe avcısı, indirim veya somut fayda arayan alıcı.\n\n"
                    f"Her biri için gönderiye karşı dürüst, samimi Türkçe bir yorum yaz ve gönderiye olan ilgi derecesini (1-10 arası) puanla."
                )

                response = client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        response_schema=FocusGroupSimulationSchema,
                        temperature=0.7,
                        system_instruction="Sen deneyimli bir tüketici psikolojisi simülatörüsün. Sosyal medya içeriklerini okur, belirlenen personalar adına son derece gerçekçi, samimi ve dürüst tüketici yorumları ile sayısal puanlar üretirsin."
                    )
                )

                if response.text:
                    parsed = json.loads(response.text)
                    return {"success": True, "personas": parsed.get("personas", [])}
            except Exception as e:
                logger.error(f"Error generating AI focus group simulation: {e}")

        return AIEngines._get_offline_focus_group_simulation(post_text, brand_name, sector)

    @staticmethod
    def _get_offline_focus_group_simulation(post_text: str, brand_name: str, sector: str) -> dict:
        """
        Generates realistic simulated feedback offline when Gemini is unavailable.
        """
        post_lower = post_text.lower()
        
        m_feedback = "Metin genel olarak güzel ama teknik veya somut detaylar (örneğin fiyat, adres veya garanti durumu) eksik görünüyor. Daha fazla bilgi verilseydi güvenilirlik artardı."
        m_score = 6
        
        e_feedback = "Harika bir kanca kullanılmış! Görselle birlikte Instagram akışında görsem kesinlikle durup incelerim, emojiler ve samimi dil çok enerjik olmuş!"
        e_score = 9
        
        c_feedback = "Güzel bir lansman veya duyuru gibi duruyor ancak alıcı olarak beni çekecek net bir kampanya, indirim veya promosyon koduna yer verilmemiş. Eyleme geçmek için bir neden bulamadım."
        c_score = 5

        if "indirim" in post_lower or "fırsat" in post_lower or "kampanya" in post_lower or "hediye" in post_lower or "ücretsiz" in post_lower:
            c_feedback = "İndirim ve fırsat detayları harika! Tam aradığım gibi somut bir tasarruf imkanı sunuyor. Bütçeme uygun olduğu için hemen kaydeder veya tıklarım."
            c_score = 9
            m_feedback = "Kampanya sunulması iyi fakat şartlar tam açıklanmamış. 'Detaylı bilgi için DM' demek yerine doğrudan koşullar yazılsa daha samimi olurdu."
            m_score = 7
        elif "kahve" in post_lower or "cafe" in post_lower or "lezzet" in post_lower or "yemek" in post_lower or "pizza" in post_lower:
            m_feedback = "Gıda/İçecek paylaşımlarında hijyen, tazelik ve yerellik detayları önemli. Taze kavrulmuş olması güzel detay ama sipariş/teslimat detayları netleşmeli."
            m_score = 7
            e_feedback = "Aromasını ve kokusunu hissettiren harika bir betimleme! Hemen gidip denemek veya sipariş vermek istedim, reels formatında hazırlansa çok iyi çalışır."
            e_score = 9
            c_feedback = "Kahve/Yemek lansmanlarında ilk siparişe özel küçük bir ikram veya indirim sunulması beni daha çabuk ikna ederdi. Fiyat bilgisi de olmalı."
            c_score = 6
        elif "teknoloji" in post_lower or "yazılım" in post_lower or "kod" in post_lower or "ai" in post_lower or "yapay zeka" in post_lower:
            m_feedback = "Yapay zeka ve teknoloji araçlarında vaatlerin arkasının dolu olması lazım. Hangi altyapıyı veya modeli kullandığı belirtilse daha profesyonel dururdu."
            m_score = 5
            e_feedback = "Teknoloji dünyasındaki gelişmeleri bu dille paylaşmanız çok hoş. Trendleri yakalamış, modern bir marka hissi veriyor, paylaşıp kaydederim."
            e_score = 8
            c_feedback = "Yapay zeka araçlarının ücretsiz deneme süresi veya başlangıç kredisi verip vermediği belirtilseydi hemen kaydolurdum. Ücretlendirme şeffaf olmalı."
            c_score = 6

        return {
            "success": True,
            "personas": [
                {
                    "name": "Mehmet Ümit (42)",
                    "type": "Detaycı / Şüpheci Alıcı",
                    "feedback": m_feedback,
                    "score": m_score
                },
                {
                    "name": "Ece Demir (26)",
                    "type": "Trend & Sosyal Medya Meraklısı",
                    "feedback": e_feedback,
                    "score": e_score
                },
                {
                    "name": "Can Soylu (34)",
                    "type": "Fiyat & Kampanya Avcısı",
                    "feedback": c_feedback,
                    "score": c_score
                }
            ]
        }
