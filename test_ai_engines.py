import os
import sys
from unittest.mock import MagicMock, patch

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except AttributeError:
        pass # python < 3.7

# Ensure the project root and 'core' directory can be imported correctly
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from config import Config
from core.ai_engines import AIEngines

def run_mock_tests():
    """
    Runs automated mock tests to verify that the AIEngines architecture,
    schemas, and logic function correctly in isolation.
    """
    print("\n" + "="*50)
    print("RUNNING MOCK TESTS FOR AI ENGINES")
    print("="*50)

    # 1. Mocking Gemini (google.generativeai) content generation
    print("\n--- Testing AIEngines.generate_social_content (MOCK) ---")
    mock_gemini_response = MagicMock()
    mock_gemini_response.text = """
    {
        "instagram_caption": "🚀 Hazır mısınız? Dijital dünyayı sarsacak yeni yapay zeka motorumuz yayında! 💡 Bu motor, sosyal medya stratejilerinizi baştan yazacak. Detaylar için link profilde! #CTA",
        "facebook_post": "Yapay zeka motorumuz yayında!",
        "youtube": {
            "video_title": "Yeni Yapay Zeka Motoru",
            "video_description": "Yapay zeka motorumuzun detayları.",
            "script_outline": "1. Giriş",
            "tags": ["yapayzeka"]
        },
        "hashtags": ["yapayzeka", "dijitalpazarlama", "sosyalmedya", "girisimcilik"],
        "image_prompt": "A modern cyberpunk style office setup, with glowing neon monitors displaying marketing dashboards, a clean minimalist aesthetic, dramatic lighting, high angle shot, realistic photo style, 8k resolution"
    }
    """

    with patch('google.genai.Client') as MockClient:
        mock_client_instance = MockClient.return_value
        mock_client_instance.models.generate_content.return_value = mock_gemini_response
        
        # Override config API key temporarily for test
        with patch.object(Config, 'GEMINI_API_KEY', 'mock_gemini_key'):
            idea_prompt = "Yeni geliştirdiğimiz AI pazarlama aracını duyuran etkileyici bir post"
            result = AIEngines.generate_social_content(idea_prompt)
            
            print(f"User Idea Input: '{idea_prompt}'")
            if result:
                print("[SUCCESS] Content generated successfully!")
                print(f"Captured Instagram Caption:  {result.get('instagram_caption')}")
                print(f"Captured Facebook Post:      {result.get('facebook_post')}")
                print(f"Captured Hashtags:           {result.get('hashtags')}")
                print(f"Captured Image Prompt:       {result.get('image_prompt')}")
            else:
                print("[FAILURE] Content generation returned None.")

    # 2. Mocking OpenAI DALL-E 3 image generation
    print("\n--- Testing AIEngines.generate_image_design (MOCK) ---")
    with patch('openai.OpenAI') as MockOpenAI:
        mock_client = MockOpenAI.return_value
        mock_response = MagicMock()
        mock_image_data = MagicMock()
        mock_image_data.url = "https://images.openai.com/generated_mock_image_12345.png"
        mock_response.data = [mock_image_data]
        mock_client.images.generate.return_value = mock_response
        
        # Override config API key temporarily for test
        with patch.object(Config, 'OPENAI_API_KEY', 'mock_openai_key'):
            image_prompt = "A modern cyberpunk office setup with glowing neon monitors"
            img_url = AIEngines.generate_image_design(image_prompt)
            
            print(f"DALL-E Prompt Input: '{image_prompt}'")
            if img_url:
                print("[SUCCESS] Image generated successfully!")
                print(f"Returned Temporary URL: {img_url}")
            else:
                print("[FAILURE] Image generation returned None.")

    # 3. Mocking Reply Assist (google.generativeai) reply generation
    print("\n--- Testing AIEngines.generate_reply_assist (MOCK) ---")
    mock_gemini_reply = MagicMock()
    mock_gemini_reply.text = "Selam! Siparişiniz yola çıktı, afiyet olsun!"

    with patch('google.genai.Client') as MockClient:
        mock_client_instance = MockClient.return_value
        mock_client_instance.models.generate_content.return_value = mock_gemini_reply
        
        with patch.object(Config, 'GEMINI_API_KEY', 'mock_gemini_key'):
            chat_context = "Müşteri: Merhaba, siparişim ne zaman kargoya verilir?\nDestek/Biz: Merhaba, siparişiniz hazırlanıyor."
            reply = AIEngines.generate_reply_assist(
                chat_context=chat_context,
                platform="instagram",
                brand_name="biAjans",
                writing_style="Samimi ve emojili",
                provider="gemini",
                api_key="mock_gemini_key"
            )
            
            print(f"Chat Context:\n{chat_context}")
            if reply:
                print("[SUCCESS] Reply generated successfully!")
                print(f"Generated Reply: {reply}")
            else:
                print("[FAILURE] Reply generation returned None.")
                
            # Testing offline fallback
            offline_reply = AIEngines.generate_reply_assist(
                chat_context="Müşteri: kargo ücretsiz mi?",
                platform="whatsapp",
                brand_name="biAjans",
                writing_style="Samimi ve emojili",
                provider="default"
            )
            print(f"Offline Fallback Reply: {offline_reply}")
                
    print("\n" + "="*50)
    print("MOCK TESTING COMPLETED")
    print("="*50)

def check_live_status():
    """
    Checks if API keys are configured and offers guidance for live testing.
    """
    print("\n" + "="*50)
    print("API KEY STATUS AND SYSTEM VERIFICATION")
    print("="*50)
    
    gemini_configured = bool(Config.GEMINI_API_KEY) and "your_gemini_api_key_here" not in Config.GEMINI_API_KEY
    openai_configured = bool(Config.OPENAI_API_KEY) and "your_openai_api_key_here" not in Config.OPENAI_API_KEY
    
    print(f"Gemini API Key Configured: {'[YES] OK' if gemini_configured else '[NO] MISSING (Check .env file)'}")
    print(f"OpenAI API Key Configured: {'[YES] OK' if openai_configured else '[NO] MISSING (Check .env file)'}")
    
    if not gemini_configured or not openai_configured:
        print("\nIPUCU: Gercek API testlerini gerceklestirmek icin projeyi olusturdugumuz dizindeki")
        print("   '.env.template' dosyasini '.env' olarak kopyalayabilir ve icerisine")
        print("   kendi API anahtarlarinizi ekleyebilirsiniz.")

if __name__ == "__main__":
    check_live_status()
    run_mock_tests()
