import re

with open('static/app.js', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Remove the incorrectly appended block at the end
content = re.sub(r'// --- ADS MANAGER LOGIC ---.*', '', content, flags=re.DOTALL)

new_logic = """
    // --- ADS MANAGER LOGIC ---
    const adsLaunchForm = document.getElementById('adsLaunchForm');
    if (adsLaunchForm) {
        adsLaunchForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const platform = document.getElementById('adPlatform').value;
            const budget = document.getElementById('adBudget').value;
            const text = document.getElementById('adText').value;
            const btn = document.getElementById('btnLaunchAd');
            
            if (!text) {
                showToast('Lütfen reklam metni girin!', true);
                return;
            }
            
            const origHtml = btn.innerHTML;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> İşleniyor...';
            btn.disabled = true;
            
            try {
                const response = await fetch('/api/ads/launch', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        platform: platform,
                        budget: budget,
                        creative: { text: text },
                        account_id: 'act_123456789'
                    })
                });
                
                const data = await response.json();
                if (data.success) {
                    showToast(data.platform + ' kampanyası başarıyla başlatıldı! ID: ' + data.data.campaign_id);
                } else {
                    showToast('Hata: ' + data.error, true);
                }
            } catch (error) {
                console.error(error);
                showToast('Ağ hatası oluştu: ' + error.message, true);
            } finally {
                btn.innerHTML = origHtml;
                btn.disabled = false;
            }
        });
    }
"""

content = content.replace('    renderHashtagSessions();\n});', '    renderHashtagSessions();\n' + new_logic + '\n});')

with open('static/app.js', 'w', encoding='utf-8') as f:
    f.write(content)
