# biAjans AI OS — Yapay Zeka Sosyal Medya & Reklam İşletim Sistemi

biAjans AI OS, markanızın içerik üretimi, planlaması, hashtag takibi ve çok kanallı reklam yönetimini (Meta, Google, TikTok Ads) yapay zeka ile otomatikleştiren, gelişmiş ve premium tasarımlı yeni nesil bir ajans işletim sistemidir.

---

## ⚡ Temel Özellikler

- **Çok Kanallı AI Composer**: GPT-4o, Gemini 2.0 Flash, Claude 4 Sonnet, Llama 4 ve Grok 3 modellerini entegre ederek tek bir platform üzerinden tüm sosyal mecralara özel kreatif içerik, görsel promptu ve video senaryoları tasarlar.
- **Resmi API Yayıncısı**: Entegre OAuth bağlantıları ile Instagram, Facebook, YouTube, LinkedIn, TikTok ve Bluesky gibi platformlara tek tıkla gönderi planlar veya canlı paylaşım yapar.
- **Çok Kanallı Reklam Yönetimi & ROAS**: Meta Ads, Google Ads ve TikTok Ads platformlarında yapay zeka destekli bütçe ve kampanya optimizasyonları sağlar.
- **Akıllı Marka Onboarding Sihirbazı**: Yenilenen aurora efektli, yüksek kontrastlı ve glassmorphic tasarımlı onboarding akışı.
- **Sanal POS Entegrasyonu**: PayTR ve Payn Kolay BDDK lisanslı altyapıları ile periyodik kart saklama (tokenization) ve otomatik faturalandırma.
- **Gelişmiş SEO & AI Arama Motoru Optimizasyonu (GEO / AIO)**:
  - Sayfa içi Schema.org JSON-LD yapılandırılmış verileri.
  - AI arama botları (GPTBot, ClaudeBot, PerplexityBot vb.) için optimize edilmiş `robots.txt` ve `sitemap.xml` haritaları.

---

## 🛠️ Yerel Geliştirme Kurulumu

### 1. Gereksinimlerin Yüklenmesi
Sistemde Python 3.9+ kurulu olduğundan emin olun, ardından gerekli kütüphaneleri yükleyin:
```bash
pip install -r requirements.txt
```

### 2. Çevresel Değişkenlerin Yapılandırılması
Kök dizindeki `.env.template` dosyasını `.env` adıyla kopyalayın ve kendi API anahtarlarınızı, OAuth kimlik bilgilerinizi girin:
```bash
cp .env.template .env
```

### 3. Uygulamanın Başlatılması
Sunucuyu yerel modda çalıştırmak için:
```bash
python app.py
```
Sunucu varsayılan olarak **`http://localhost:8080`** portunda çalışacaktır.

---

## 🚀 Canlıya Alma / Üretim Ortamı Dağıtım Kılavuzu (Production Deployment)

Uygulamayı canlı bir sunucuya (örneğin Ubuntu VPS) taşırken aşağıdaki adımları uygulayın.

### 1. Sunucu Hazırlığı
Sunucuyu güncelleyin ve gerekli paketleri yükleyin:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install python3-pip python3-venv git nginx -y
```

### 2. Proje Klonlama ve Sanal Ortam Oluşturma
Projeyi sunucunuza yükledikten sonra proje klasöründe sanal ortam oluşturup paketleri kurun:
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 3. Canlı .env Ayarları
Sunucudaki `.env` dosyasında şu iki değeri mutlaka canlı ortamınıza göre güncelleyin:
- `APP_BASE_URL`: Canlı domain adresiniz olmalıdır (örn: `https://biajans.com`). OAuth yönlendirme (Callback) URL'lerinin doğru çalışması için bu kritiktir.
- `APP_SECRET_KEY`: Oturum güvenliği için rastgele, karmaşık bir şifreleme anahtarı girin.

### 4. Systemd Servisi Oluşturma (Arka Planda Sürekli Çalışma)
Sunucu yeniden başladığında uygulamanın otomatik açılması ve arka planda güvenle çalışması için bir Systemd servis dosyası tanımlayın:
```bash
sudo nano /etc/systemd/system/biajans.service
```

Aşağıdaki yapılandırmayı yapıştırın (kullanıcı adı ve dosya yollarını sunucunuza göre düzenleyin):
```ini
[Unit]
Description=biAjans AI OS Service
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/biajans_social_media_os
ExecStart=/home/ubuntu/biajans_social_media_os/venv/bin/python app.py
Restart=always
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=multi-user.target
```

Servisi aktifleştirin ve başlatın:
```bash
sudo systemctl daemon-reload
sudo systemctl enable biajans
sudo systemctl start biajans
```

Servis durumunu kontrol etmek için:
```bash
sudo systemctl status biajans
```

### 5. Nginx Tersine Vekil (Reverse Proxy) & SSL Yapılandırması
Nginx'i, 80/443 portundan gelen istekleri biAjans'ın çalıştığı `8080` portuna yönlendirecek şekilde yapılandırın.

Nginx konfigürasyon dosyasını oluşturun:
```bash
sudo nano /etc/nginx/sites-available/biajans
```

Aşağıdaki blok kodunu yapıştırın (domain adresinizi değiştirmeyi unutmayın):
```nginx
server {
    listen 80;
    server_name biajans.com www.biajans.com;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Konfigürasyonu aktif edin ve Nginx'i test edip yeniden başlatın:
```bash
sudo ln -s /etc/nginx/sites-available/biajans /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### SSL (HTTPS) Sertifikası Kurulumu (Let's Encrypt)
Domaininize ücretsiz SSL sertifikası tanımlayarak HTTPS güvenliğini aktif edin:
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d biajans.com -d www.biajans.com
```
Certbot, Nginx dosyanızı otomatik olarak HTTPS yönlendirmesi ekleyerek güncelleyecektir.

---

## 🔍 SEO & AIO (AI Arama Motoru Optimizasyonu) Kontrol Listesi

- [x] **robots.txt**: `static/robots.txt` dosyası canlıdadır. Arama motorlarının yanı sıra `GPTBot`, `OAI-SearchBot`, `ClaudeBot`, `PerplexityBot` ve `Google-Extended` gibi yapay zeka crawleri için izinler verilmiştir.
- [x] **sitemap.xml**: `static/sitemap.xml` haritası hazır durumdadır ve robots.txt içerisinde tanımlıdır.
- [x] **Schema.org Structured Data**: Ana sayfada (`index.html`) ve yardım merkezinde (`help.html`) AI arama motorlarının markayı ve hizmetleri daha iyi anlamlandırması için `Organization`, `WebSite`, `SoftwareApplication` ve `FAQPage` JSON-LD şemaları yer almaktadır.
- [x] **Meta & Open Graph**: Tüm sosyal paylaşımlarda görsel ve açıklamaların zengin görünmesi için gerekli Facebook/Twitter meta etiketleri yapılandırılmıştır.
