import os
import sys
import logging
import json
from pydantic import BaseModel, Field
import google.generativeai as genai
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

class AIEngines:
    """
    Core AI engine class providing static methods for content generation using Google Gemini
    and image design generation using OpenAI DALL-E 3.
    """

    @staticmethod
    def generate_social_content(user_prompt: str) -> dict:
        """
        Generates structured multi-platform social media content (Instagram, Facebook, YouTube) using google-generativeai.
        
        Args:
            user_prompt (str): The raw social media or marketing idea entered by the user.
            
        Returns:
            dict: A dictionary conforming to SocialContentSchema, or None if an error occurs.
        """
        logger.info("Starting multi-platform content generation using Gemini API...")
        
        if not Config.GEMINI_API_KEY:
            logger.error("Error: GEMINI_API_KEY is not configured in config.py or environment variables.")
            return None
            
        try:
            genai.configure(api_key=Config.GEMINI_API_KEY)
            
            # System instructions enforcing the professional multi-channel copywriting persona
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
                "İNGİLİZCE detaylı bir imaj promptu oluştur."
            )
            
            # Setup Gemini 1.5 Pro model with response schema to guarantee structured outputs
            model = genai.GenerativeModel(
                model_name="gemini-1.5-pro",
                generation_config={
                    "response_mime_type": "application/json",
                    "response_schema": SocialContentSchema
                },
                system_instruction=system_instruction
            )
            
            logger.info("Sending prompt to Gemini...")
            response = model.generate_content(user_prompt)
            
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
                model = genai.GenerativeModel(
                    model_name="gemini-1.5-flash",
                    generation_config={
                        "response_mime_type": "application/json",
                        "response_schema": SocialContentSchema
                    },
                    system_instruction=system_instruction
                )
                response = model.generate_content(user_prompt)
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
    def generate_social_content_custom(user_prompt: str, provider: str, api_key: str, model: str) -> dict:
        """
        Generates structured social media content using custom API providers (openrouter, openai, anthropic, gemini).
        """
        logger.info(f"Starting content generation via Custom Provider: {provider}, Model: {model}...")

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
