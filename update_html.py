import re
import sys

def main():
    file_path = "static/index.html"
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Add Media URL Input
    target1 = r'(<div class="char-count"><span id="charNum">0</span> karakter</div>\s*</div>)'
    replacement1 = r'\1\n                                <input type="url" id="mediaUrlInput" class="form-control" placeholder="Görsel veya Video URL\'sini girin (Instagram, YouTube için zorunludur)" style="margin-top: 10px; padding: 12px; background: #26273b; border: 1px solid #363a4f; color: white; border-radius: 8px; width: 100%; box-sizing: border-box;" />'
    
    if not re.search(target1, content):
        print("Target 1 not found!")
    
    content = re.sub(target1, replacement1, content)

    # 2. Add Ads Launch Form
    target2 = r'(<div class="reklam-platforms-grid">)'
    
    replacement2 = r'''
                        <div class="card" style="margin-bottom: 24px; padding: 20px; background: #1f1f2e; border: 1px solid #363a4f; border-radius: 8px;">
                            <h3 style="font-size: 16px; margin-top: 0; margin-bottom: 15px; color: white;">Hızlı Reklam Kampanyası Başlat</h3>
                            <form id="adsLaunchForm">
                                <div style="display: flex; gap: 15px; margin-bottom: 15px;">
                                    <div style="flex: 1;">
                                        <label style="display: block; font-size: 12px; color: #94a3b8; margin-bottom: 5px;">Platform</label>
                                        <select id="adPlatform" class="form-control" style="width: 100%; padding: 10px; background: #26273b; color: white; border: 1px solid #363a4f; border-radius: 6px;">
                                            <option value="meta_ads">Meta Ads (Facebook & Instagram)</option>
                                            <option value="google_ads">Google Ads</option>
                                            <option value="tiktok_ads">TikTok Ads</option>
                                        </select>
                                    </div>
                                    <div style="flex: 1;">
                                        <label style="display: block; font-size: 12px; color: #94a3b8; margin-bottom: 5px;">Günlük Bütçe (TL)</label>
                                        <input type="number" id="adBudget" class="form-control" value="100" style="width: 100%; padding: 10px; background: #26273b; color: white; border: 1px solid #363a4f; border-radius: 6px;" required>
                                    </div>
                                </div>
                                <div style="margin-bottom: 15px;">
                                    <label style="display: block; font-size: 12px; color: #94a3b8; margin-bottom: 5px;">Reklam Metni</label>
                                    <textarea id="adText" class="form-control" style="width: 100%; padding: 10px; background: #26273b; color: white; border: 1px solid #363a4f; border-radius: 6px; height: 60px;" placeholder="Hedef kitlenizi etkileyecek reklam metniniz..."></textarea>
                                </div>
                                <button type="submit" id="btnLaunchAd" class="btn" style="background: #3b82f6; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 600;">
                                    Kampanyayı Başlat <i class="fa-solid fa-rocket"></i>
                                </button>
                            </form>
                        </div>
                        
\1'''
    
    if not re.search(target2, content):
        print("Target 2 not found!")
        
    content = re.sub(target2, replacement2, content)

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
        
    print("Successfully updated index.html")

if __name__ == "__main__":
    main()
