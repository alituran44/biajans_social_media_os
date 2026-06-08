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
        description="Görsel yapay zekalarının (DALL-E 3 veya Imagen) harika bir kapak tasarımı veya gönderi görseli çizebilmesi için detaylı, profesyonel, ışık ve kompozisyon belirten İNGİLİZCE imaj promptu."
    )

class AIEngines:
    """
    Core AI engine class providing static methods for content generation using Google Gemini
    and image design generation using OpenAI DALL-E 3.
    """

    @staticmethod
    def generate_social_content(user_prompt: str) -> dict:
        """
        Generates structured multi-platform social media content (Instagram, Facebook, YouTube) using gemini-1.5-pro.
        
        Args:
            user_prompt (str): The raw social media or marketing idea entered by the user.
            
        Returns:
            dict: A dictionary conforming to SocialContentSchema, or None if an error occurs.
        """
        logger.info("Starting multi-platform content generation using Odysseus backend...")
        
        try:
            import urllib.request
            import urllib.parse
            import uuid
            
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
                "5. Görsel Tasarım Promptu: DALL-E 3 veya Imagen gibi görsel üretim yapay zekalarının bu içeriklere uygun kusursuz, "
                "sanatsal bir kapak veya gönderi görseli tasarlayabilmesi için detaylı, profesyonel, ışık, kompozisyon, stil belirten "
                "İNGİLİZCE detaylı bir imaj promptu oluştur.\n\n"
                "ÇIKTI FORMATI: Lütfen sadece geçerli bir JSON objesi döndür. Markdown code block (```json) kullanma, doğrudan JSON verisini yaz. JSON şu anahtarları içermelidir: instagram_caption, facebook_post, youtube (video_title, video_description, script_outline, tags listesi içeren obje), hashtags (liste), image_prompt."
            )
            
            combined_prompt = system_instruction + "\n\nKullanıcı Fikri/İsteği: " + user_prompt
            
            # Call Odysseus backend
            url = "http://localhost:7000/api/chat"
            payload = json.dumps({
                "message": combined_prompt,
                "session": "temp_marketing_" + str(uuid.uuid4())[:8],
                "mode": "chat"
            }).encode('utf-8')
            
            req = urllib.request.Request(url, data=payload, method='POST')
            req.add_header('Content-Type', 'application/json')
            
            logger.info(f"Sending prompt to Odysseus at {url}")
            
            with urllib.request.urlopen(req, timeout=120) as resp:
                response_data = json.loads(resp.read().decode('utf-8'))
                
            reply_text = response_data.get("response", "")
            
            # Clean up potential markdown JSON formatting
            if reply_text.startswith("```json"):
                reply_text = reply_text[7:]
            if reply_text.startswith("```"):
                reply_text = reply_text[3:]
            if reply_text.endswith("```"):
                reply_text = reply_text[:-3]
                
            result_json = json.loads(reply_text.strip())
            logger.info("Successfully received multi-platform structured output from Odysseus.")
            return result_json
            
        except Exception as e:
            logger.error("An unexpected error occurred during Odysseus content generation.")
            logger.error(f"Error details: {e}", exc_info=True)
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
