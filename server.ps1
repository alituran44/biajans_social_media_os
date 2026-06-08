# ----------------------------------------------------
# Aether Web Server - Zero Dependency HTTP Listener
# Serves static/ on http://localhost:8000
# Replicates the /api/generate POST endpoint from app.py
# ----------------------------------------------------

$port = 8000
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")

# Mock JSON responses exactly matching app.py's structure, using 100% plain ASCII text
$peanutJson = '{
    "status": "success",
    "instagram_caption": "Dogalligin En Saf Hali Sofralarinizda! Sporcular, saglikli beslenenler ve gurme lezzet arayanlar! Katkisiz, seker ilavesiz ve %100 organik fistik ezmemizle tanismaya hazir misiniz? Antrenman oncesi enerji deposu arayan sporcular icin mukemmel bir protein kaynagi. Cocuklar icin hem lezzetli hem de asiri besleyici! Hemen profilimizdeki linke tiklayarak siparisini ver, lansmana ozel %20 indirim firsatini kacirma! #SaglikliBeslenme #FistikEzmesi #ProteinDeposu",
    "facebook_post": "Saglikli Yasam ve Temiz Beslenme Arayanlar Icin Harika Bir Haberimiz Var! %100 dogal, yerli uretim fistiklarimizdan elde ettigimiz katkisiz fistik ezmemiz satisa sunuldu! Icindekiler: Yalnizca taze kavrulmus yer fistigi! Seker, koruyucu, yapay tatlandirici veya palm yagi KESINLIKLE icermez. Neden Bizim Fistik Ezmemiz? Yuksek Lif ve Protein Kaynagi, Kalp Dostu Doymamis Yaglar, Uzun Sure Tok Tutma Ozelligi. Spor oncesi yulaflariniza lezzet katmak ya da cocuklariniza guvenli bir atistirmalik sunmak istiyorsaniz lansmanimiza ozel kargo firsatlarini kacirmayin. Detaylar ve online siparis icin web sitemizi ziyaret edin!",
    "youtube": {
        "video_title": "Evde %100 Katkisiz Organik Fistik Ezmesi Nasil Yapilir? (Sporcular Icin Protein Deposu)",
        "video_description": "Merhaba arkadaslar! Bu videoda hem saglikli beslenenler hem de fitness ile ilgilenenler icin mukemmel bir tarif paylasiyoruz: %100 katkisiz, sifir seker ve seker ilavesiz organik fistik ezmesi yapimi! Fistik ezmesinin faydalari nelerdir, spor oncesinde nasil tuketilmelidir ve dogru kivam nasil tuketilir tum detaylariyla bu videoda. Lansman indirimlerimizi inceleyin.",
        "script_outline": "1. Giris: Fistik ezmesinin goruntusu ve sporcular icin onemi. 2. Malzemeler: Yalnizca cig veya kavrulmus organik yer fistigi. 3. Blender Asamasi: Yagini salana kadar cekme puf noktalari. 4. Kapanis: Web sitesi siparis yonlendirmesi.",
        "tags": ["FistikEzmesiYapimi", "SaglikliFistikEzmesi", "DiyetTarifleri", "SporcuBeslenmesi"]
    },
    "hashtags": ["SaglikliBeslenme", "FistikEzmesi", "OrganikBesinler", "SporcuBeslenmesi", "TemizGida"],
    "image_prompt": "A close-up shot of a premium organic peanut butter jar on a rustic wooden kitchen counter, scattered whole peanuts around, warm afternoon sunlight casting long soft shadows, cinematic lighting, shallow depth of field, 8k, photorealistic",
    "image_url": "https://images.unsplash.com/photo-1590080875515-8a3a8dc57fbe?w=1024"
}'

$coffeeJson = '{
    "status": "success",
    "instagram_caption": "Gune Mukemmel Bir Baslangic: Taze Cekilmis Kahve Kokusu! Her yudumda ozenle secilmis nitelikli kahve cekirdeklerinin buyuleyici aromasini hissetmeye hazir olun! Ciftlikten fincaniniza uzanan bu essiz lezzet seruveni, sabahlarinize enerji katacak. Ozenle kavrulmus, yogun govdeli ve kadifemsi kremasiyla tam aradiginiz filtre kahve deneyimi simdi sizlerle. Bu benzersiz lezzeti hemen kesfetmek icin link profilde! #KahveKeyfi",
    "facebook_post": "Gercek Nitelikli Kahve Deneyimiyle Tanisin! Kahve sadece sabahları uyanmak icin icilen bir icecek degildir; kahve bir yasam bicimi, bir ritueldir. Biz, dunyanin en seckin kahve tarlalarindan ozenle topladigimiz %100 Arabica cekirdeklerini, profillerine en uygun derecede kavurarak fincaniniza getiriyoruz. Urun Seceneklerimiz: Aromatik ve meyvemsi Etiyopya Sidamo, Yogun govdeli ve cikolata notali Kolombiya Supremo, Kadifemsi ve yumusak icimli kafeinsiz ozel seriler. Kahve cekirdeklerimizi dilediginiz demleme yontemine uygun taptaze ogutuyoruz. Hemen siparis verin!",
    "youtube": {
        "video_title": "Uc Farkli Kahve Demleme Yontemi: Evde Profesyonel Barista Gibi Kahve Yapin!",
        "video_description": "Evde mukemmel nitelikli kahve demlemenin sirlarini paylasiyoruz! V60, French Press ve Chemex yontemleriyle cekirdeklerin tum aromasini nasil ortaya cikaracaginizi adim adim ogrenin. Detaylar aciklamada.",
        "script_outline": "1. Giris: Nitelikli kahvenin onemi. 2. V60 Demleme: Su sicakligi ve dokus teknikleri. 3. French Press: Demleme suresi. 4. Kapanis: Tat karsilastirmasi.",
        "tags": ["EvdeKahveDemleme", "BaristaSirlari", "V60Demleme", "FrenchPressKahve"]
    },
    "hashtags": ["KahveKeyfi", "NitelikliKahve", "FiltreKahve", "KahveKokusu", "GununKahvesi"],
    "image_prompt": "A steaming cup of freshly brewed espresso coffee on a minimalist concrete table, coffee beans scattered beautifully, soft warm side lighting, volumetric smoke, high detail, photorealistic, 8k",
    "image_url": "https://images.unsplash.com/photo-1507133750040-4a8f57021571?w=1024"
}'

$defaultJson = '{
    "status": "success",
    "instagram_caption": "Hayallerinizi Gercege Donusturme Vakti! Ister yeni bir marka kuruyor olun, ister mevcut isinizi buyutuyor olun; dogru strateji ve kreatif bakis acisiyla dijital dunyada zirveye ulasmak artik cok daha kolay! Kampanyaniza ozel cozumlerimizle hedef kitlenizin kalbine dokunun. Bizimle birlikte yeni nesil pazarlama seruvenine adim atmaya hazir misiniz? Sorulariniz icin link profilde!",
    "facebook_post": "Isinizi Dijital Dunyada Buyutmeye Hazir Misiniz? Gunumuz pazarlama dunyasinda ayakta kalmanin sirri, dogru kanallarda dogru hedef kitleyle bulusmaktir. Biz, markanizin hikayesini en dogru sosyal medya stratejileriyle birlestiriyor, donusumlerinizi ve etkilesimlerinizi artiriyoruz. Neler Sunuyoruz? Hedef Kitle ve Rakip Analizi, Kreatif Icerik ve Gorsel Tasarim Uretimi, SEO ve Cok Kanalli Reklam Yonetimi. Gelin, markanizin dijital dunyadaki potansiyelini birlikte en ust duzeye cikaralim. Detayli bilgi edinmek icin bize hemen mesaj gonderin!",
    "youtube": {
        "video_title": "Sosyal Medyada 0 dan 10.000 Takipciye Nasil Ulasilir? (2026 Guncel Algoritma Sirlari)",
        "video_description": "Sosyal medyada organik olarak buyumek ve sadik bir kitle olusturmak hic bu kadar zor ama ayni zamanda bu kadar sistematik olmamisti! Bu videoda, 2026 yili guncel algoritmasini kendi lehine cevirerek organik takipçi kazanmanın 5 altin kuralini anlatiyoruz. Kanala abone olmayi unutmayin!",
        "script_outline": "1. Giris: Sosyal medyada buyumenin zorlugu. 2. Kanca Kurali: Ilk 3 saniyede izleyiciyi videoda tutma. 3. Tutarlilik: Yayinsemasi. 4. Kapanis: Abone ol cagrisi.",
        "tags": ["SosyalMedyaBuyume", "TakipciKazanma", "AlgoritmaSirlari", "DijitalPazarlamaRehberi"]
    },
    "hashtags": ["Girisimcilik", "DijitalPazarlama", "BasariHikayesi", "SosyalMedyaYonetimi", "MarkaStratejisi"],
    "image_prompt": "A premium modern glass workspace with glowing neon lights, floating holographic marketing charts and social media icons, sleek tech aesthetics, ultra-realistic digital art style, volumetric light, 8k resolution",
    "image_url": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1024"
}'

try {
    $listener.Start()
    Write-Host "Aether Server running at http://localhost:$port/"
    Write-Host "Press Ctrl+C to stop the server."
} catch {
    Write-Host "Failed to start listener on port $port."
    Exit
}

# Serve Files & API Requests Loop
while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $urlPath = $request.Url.LocalPath

        # Handle API POST Generation Request
        if ($urlPath -eq "/api/generate" -and $request.HttpMethod -eq "POST") {
            # Read JSON body
            $reader = New-Object System.IO.StreamReader($request.InputStream)
            $postData = $reader.ReadToEnd()
            $requestJson = ConvertFrom-Json $postData
            $userPrompt = $requestJson.prompt

            Write-Host "[API REQUEST] Generating campaign for prompt: $userPrompt"

            # Match keyword and pick corresponding string
            $p_lower = $userPrompt.ToLower()
            $jsonStr = $defaultJson
            if ($p_lower.Contains("fistik") -or $p_lower.Contains("peanut") -or $p_lower.Contains("ezme")) {
                $jsonStr = $peanutJson
            }
            elseif ($p_lower.Contains("kahve") -or $p_lower.Contains("coffee")) {
                $jsonStr = $coffeeJson
            }

            # Send JSON response
            $response.StatusCode = 200
            $response.ContentType = "application/json; charset=utf-8"
            
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($jsonStr)
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        }
        else {
            # Handle Static Files serving (maps root requests to static/ folder)
            if ($urlPath -eq "/") {
                $urlPath = "/index.html"
            }

            # Map to static subfolder safely
            $cleanUrl = $urlPath.Replace('/', '\').TrimStart('\')
            $localPath = Join-Path (Get-Location) "static\$cleanUrl"

            if (Test-Path $localPath -PathType Leaf) {
                # Determine Content Type
                $ext = [System.IO.Path]::GetExtension($localPath).ToLower()
                $contentType = "application/octet-stream"
                switch ($ext) {
                    ".html" { $contentType = "text/html; charset=utf-8" }
                    ".css"  { $contentType = "text/css; charset=utf-8" }
                    ".js"   { $contentType = "application/javascript; charset=utf-8" }
                    ".png"  { $contentType = "image/png" }
                    ".jpg"  { $contentType = "image/jpeg" }
                    ".jpeg" { $contentType = "image/jpeg" }
                    ".svg"  { $contentType = "image/svg+xml" }
                    ".ico"  { $contentType = "image/x-icon" }
                }

                $response.ContentType = $contentType
                $response.StatusCode = 200

                # Read and send file bytes
                $bytes = [System.IO.File]::ReadAllBytes($localPath)
                $response.ContentLength64 = $bytes.Length
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            } else {
                # File Not Found
                $response.StatusCode = 404
                $response.ContentType = "text/html"
                $msg = "<h3>404 Not Found</h3><p>Static file not found: $urlPath</p>"
                $bytes = [System.Text.Encoding]::UTF8.GetBytes($msg)
                $response.ContentLength64 = $bytes.Length
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            }
        }
    } catch {
        Write-Host "Error serving request: $_"
    } finally {
        if ($null -ne $response) {
            $response.Close()
        }
    }
}
