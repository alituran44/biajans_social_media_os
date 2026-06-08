document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const generateForm = document.getElementById('generateForm');
    const userPromptInput = document.getElementById('userPrompt');
    const charNumLabel = document.getElementById('charNum');
    
    const submitBtn = document.getElementById('submitBtn');
    const btnSpinner = submitBtn.querySelector('.btn-spinner');
    
    const resultsSection = document.getElementById('resultsSection');
    const resetBtn = document.getElementById('resetBtn');
    
    // Platform Copywriting Containers
    const instagramCaption = document.getElementById('instagramCaption');
    const facebookCaption = document.getElementById('facebookCaption');
    const youtubeTitle = document.getElementById('youtubeTitle');
    const youtubeDescription = document.getElementById('youtubeDescription');
    const youtubeScript = document.getElementById('youtubeScript');
    
    const hashtagsOutput = document.getElementById('hashtagsOutput');
    const promptBoxOutput = document.getElementById('promptBoxOutput');
    const imageLoader = document.getElementById('imageLoader');
    const downloadImageBtn = document.getElementById('downloadImageBtn');
    
    // Live Mockups Elements
    const simulatedImage = document.getElementById('simulatedImage');
    const simulatedImageFB = document.querySelector('.simulatedImageFB');
    const simulatedImageYT = document.querySelector('.simulatedImageYT');
    
    const instagramMockup = document.getElementById('instagramMockup');
    const facebookMockup = document.getElementById('facebookMockup');
    const youtubeMockup = document.getElementById('youtubeMockup');
    
    const instagramMockupText = document.getElementById('instagramMockupText');
    const instagramMockupTags = document.getElementById('instagramMockupTags');
    const facebookMockupText = document.getElementById('facebookMockupText');
    const facebookMockupTags = document.getElementById('facebookMockupTags');
    const youtubeMockupTitle = document.getElementById('youtubeMockupTitle');
    const youtubeMockupText = document.getElementById('youtubeMockupText');
    const youtubeMockupTags = document.getElementById('youtubeMockupTags');
    
    // UI Helpers
    const platformTabs = document.querySelectorAll('#platformTabs .tab-btn');
    const tagsHeaderTitle = document.getElementById('tagsHeaderTitle');
    const copyTagsBtnText = document.getElementById('copyTagsBtnText');
    
    // Copy buttons
    const copyCaptionBtn = document.getElementById('copyCaptionBtn');
    const publishCaptionBtn = document.getElementById('publishCaptionBtn');
    const copyHashtagsBtn = document.getElementById('copyHashtagsBtn');
    const copyPromptBtn = document.getElementById('copyPromptBtn');
    
    // Toast
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMsg');
    
    let activeCampaignData = null;
    let activeTab = 'instagram';

    // Character Counter
    userPromptInput.addEventListener('input', () => {
        charNumLabel.textContent = userPromptInput.value.length;
    });

    // Toast Alert Helper
    function showToast(message, isError = false) {
        toastMsg.textContent = message;
        if (isError) {
            toast.style.background = 'rgba(239, 68, 68, 0.9)'; // Red for error
            toast.querySelector('i').className = 'fa-solid fa-circle-exclamation';
        } else {
            toast.style.background = 'rgba(16, 185, 129, 0.9)'; // Green for success
            toast.querySelector('i').className = 'fa-solid fa-circle-check';
        }
        
        toast.classList.remove('hidden');
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }

    // Toggle Content Containers & Live Mockups
    function switchTab(tabName) {
        activeTab = tabName;
        
        // Update Active Tab Button styling
        platformTabs.forEach(btn => {
            if (btn.getAttribute('data-tab') === tabName) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        // Toggle Visibility of Platform Content Panels
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.add('hidden');
        });
        document.getElementById(`${tabName}Content`).classList.remove('hidden');
        
        // Toggle Visibility of Simulated Phone Feed Mockups
        instagramMockup.classList.add('hidden');
        facebookMockup.classList.add('hidden');
        youtubeMockup.classList.add('hidden');
        document.getElementById(`${tabName}Mockup`).classList.remove('hidden');
        
        // Render Contextual Tags
        renderActiveTags();
    }

    // Platform Tab Click Handlers
    platformTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const selectedTab = tab.getAttribute('data-tab');
            switchTab(selectedTab);
        });
    });

    // Render Hashtags / tags dynamically based on the active tab
    function renderActiveTags() {
        hashtagsOutput.innerHTML = '';
        if (!activeCampaignData) return;

        let tagsToLoad = [];
        let prefix = '#';

        if (activeTab === 'youtube') {
            tagsHeaderTitle.textContent = "Video Anahtar Kelimeleri / Tags";
            copyTagsBtnText.textContent = "Tüm Etiketleri Kopyala";
            prefix = '';
            
            if (activeCampaignData.youtube && Array.isArray(activeCampaignData.youtube.tags)) {
                tagsToLoad = activeCampaignData.youtube.tags;
            }
        } else {
            tagsHeaderTitle.textContent = "Stratejik Hashtag'ler";
            copyTagsBtnText.textContent = "Tüm Hashtag'leri Kopyala";
            prefix = '#';
            
            if (Array.isArray(activeCampaignData.hashtags)) {
                tagsToLoad = activeCampaignData.hashtags;
            }
        }

        tagsToLoad.forEach(tag => {
            const tagPill = document.createElement('span');
            tagPill.className = 'hashtag-pill';
            const formattedTag = prefix ? (tag.startsWith(prefix) ? tag : `${prefix}${tag}`) : tag;
            tagPill.textContent = formattedTag;
            
            // Click to copy individual tag
            tagPill.addEventListener('click', () => {
                copyToClipboard(formattedTag);
                showToast(`"${formattedTag}" kopyalandı!`);
            });
            
            hashtagsOutput.appendChild(tagPill);
        });
    }

    // Form Submission (API Trigger)
    generateForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const prompt = userPromptInput.value.trim();
        if (!prompt) return;

        // Set Loading State
        submitBtn.disabled = true;
        btnSpinner.classList.remove('hidden');
        
        // Setup Results Area & Image Preview Loader
        resultsSection.classList.remove('hidden');
        resultsSection.scrollIntoView({ behavior: 'smooth' });
        
        imageLoader.classList.remove('hidden');
        simulatedImage.classList.remove('loaded');
        simulatedImageFB.classList.remove('loaded');
        simulatedImageYT.classList.remove('loaded');
        
        simulatedImage.src = '';
        simulatedImageFB.src = '';
        simulatedImageYT.src = '';
        
        instagramCaption.innerHTML = '<div class="loader-line"></div><div class="loader-line"></div>';
        facebookCaption.innerHTML = '<div class="loader-line"></div><div class="loader-line"></div>';
        youtubeTitle.textContent = '';
        youtubeDescription.innerHTML = '';
        youtubeScript.innerHTML = '';
        
        // Clear mockups
        instagramMockupText.textContent = 'Yükleniyor...';
        instagramMockupTags.textContent = '';
        facebookMockupText.textContent = 'Yükleniyor...';
        facebookMockupTags.textContent = '';
        youtubeMockupTitle.textContent = 'Yükleniyor...';
        youtubeMockupText.textContent = '';
        youtubeMockupTags.textContent = '';
        
        hashtagsOutput.innerHTML = '';
        promptBoxOutput.textContent = 'Prompt hazırlanıyor...';

        try {
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ prompt: prompt })
            });

            if (!response.ok) {
                throw new Error('İçerik üretilirken sunucuda hata oluştu.');
            }

            const data = await response.json();
            
            if (data.status === 'error') {
                throw new Error(data.message || 'Kampanya oluşturulamadı.');
            }

            activeCampaignData = data;
            
            // Populate Platform Content Areas
            instagramCaption.textContent = data.instagram_caption || '';
            facebookCaption.textContent = data.facebook_post || '';
            
            if (data.youtube) {
                youtubeTitle.textContent = data.youtube.video_title || '';
                youtubeDescription.textContent = data.youtube.video_description || '';
                youtubeScript.textContent = data.youtube.script_outline || '';
            }
            
            promptBoxOutput.textContent = data.image_prompt || '';

            // Populate Live Mockups Texts
            instagramMockupText.textContent = data.instagram_caption || '';
            facebookMockupText.textContent = data.facebook_post || '';
            
            if (data.youtube) {
                youtubeMockupTitle.textContent = data.youtube.video_title || '';
                youtubeMockupText.textContent = data.youtube.video_description || '';
            }
            
            // Populate Mockup tags
            if (Array.isArray(data.hashtags)) {
                const igTags = data.hashtags.map(t => t.startsWith('#') ? t : `#${t}`).join(' ');
                instagramMockupTags.textContent = ' ' + igTags;
                facebookMockupTags.textContent = ' ' + igTags;
            }
            
            if (data.youtube && Array.isArray(data.youtube.tags)) {
                youtubeMockupTags.textContent = ' ' + data.youtube.tags.map(t => `#${t.replace(/\s+/g, '')}`).join(' ');
            }

            // Switch to Instagram tab by default on load, rendering tags
            switchTab('instagram');

            // Load DALL-E 3 Image into Simulator preview images
            if (data.image_url) {
                simulatedImage.src = data.image_url;
                simulatedImageFB.src = data.image_url;
                simulatedImageYT.src = data.image_url;
                downloadImageBtn.href = data.image_url;
                
                simulatedImage.onload = () => {
                    imageLoader.classList.add('hidden');
                    simulatedImage.classList.add('loaded');
                    simulatedImageFB.classList.add('loaded');
                    simulatedImageYT.classList.add('loaded');
                };
                
                simulatedImage.onerror = () => {
                    imageLoader.classList.add('hidden');
                    showToast('Görsel yüklenirken bir hata oluştu.', true);
                };
            } else {
                imageLoader.classList.add('hidden');
                showToast('Görsel URL alınamadı.', true);
            }

            showToast('Çok kanallı sosyal medya kampanyanız başarıyla oluşturuldu!');

            // Auto schedule AI generated posts into the Yayın Takvimi!
            if (typeof window.scheduleAiGeneratedCampaign === 'function') {
                window.scheduleAiGeneratedCampaign(data);
            }

        } catch (error) {
            console.error(error);
            imageLoader.classList.add('hidden');
            instagramCaption.textContent = 'Hata oluştu. Lütfen tekrar deneyin.';
            promptBoxOutput.textContent = 'Prompt oluşturulamadı.';
            showToast(error.message || 'Üretim sırasında hata meydana geldi.', true);
        } finally {
            submitBtn.disabled = false;
            btnSpinner.classList.add('hidden');
        }
    });

    // Reset Form & Dashboard
    resetBtn.addEventListener('click', () => {
        userPromptInput.value = '';
        charNumLabel.textContent = '0';
        resultsSection.classList.add('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Copy to Clipboard Core function
    function copyToClipboard(text) {
        if (!text) return;
        const dummy = document.createElement('textarea');
        document.body.appendChild(dummy);
        dummy.value = text;
        dummy.select();
        document.execCommand('copy');
        document.body.removeChild(dummy);
    }

    // Publish Contextual Caption (Adapts to Active Tab)
    if (publishCaptionBtn) {
        publishCaptionBtn.addEventListener('click', async () => {
            if (!activeCampaignData) return;
            
            let textToPublish = '';
            let platformToPublish = '';

            if (activeTab === 'instagram') {
                textToPublish = activeCampaignData.instagram_caption;
                platformToPublish = 'instagram';
            } else if (activeTab === 'facebook') {
                textToPublish = activeCampaignData.facebook_post;
                platformToPublish = 'facebook';
            } else if (activeTab === 'youtube') {
                textToPublish = activeCampaignData.youtube ? (activeCampaignData.youtube.video_title + "\n" + activeCampaignData.youtube.video_description) : "";
                platformToPublish = 'youtube';
            } else {
                textToPublish = activeCampaignData.instagram_caption || activeCampaignData.facebook_post;
                platformToPublish = activeTab;
            }

            if (!textToPublish) {
                showToast('Yayınlanacak içerik bulunamadı.');
                return;
            }
            
            // Try to extract an image url to publish as media
            const mediaUrl = activeCampaignData.image_url || null;
            
            const originalHtml = publishCaptionBtn.innerHTML;
            publishCaptionBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
            publishCaptionBtn.disabled = true;
            
            try {
                const response = await fetch('/api/publish', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ platform: platformToPublish, text: textToPublish, media_url: mediaUrl })
                });
                
                const resData = await response.json();
                if (resData.success) {
                    showToast('Başarıyla Yayınlandı!');
                } else {
                    showToast('Hata: ' + (resData.error || 'Bilinmeyen hata'), true);
                }
            } catch (err) {
                showToast('Hata: ' + err.message, true);
            } finally {
                publishCaptionBtn.innerHTML = originalHtml;
                publishCaptionBtn.disabled = false;
            }
        });
    }

    // Copy Contextual Caption (Adapts to Active Tab)
    copyCaptionBtn.addEventListener('click', () => {
        if (!activeCampaignData) return;
        
        let textToCopy = '';
        let label = '';

        if (activeTab === 'instagram') {
            textToCopy = activeCampaignData.instagram_caption;
            label = 'Instagram açıklaması';
        } else if (activeTab === 'facebook') {
            textToCopy = activeCampaignData.facebook_post;
            label = 'Facebook gönderisi';
        } else if (activeTab === 'youtube') {
            const title = activeCampaignData.youtube ? activeCampaignData.youtube.video_title : '';
            const desc = activeCampaignData.youtube ? activeCampaignData.youtube.video_description : '';
            const script = activeCampaignData.youtube ? activeCampaignData.youtube.script_outline : '';
            textToCopy = `BAŞLIK:\n${title}\n\nAÇIKLAMA:\n${desc}\n\nSENARYO TASLAĞI:\n${script}`;
            label = 'YouTube video paketi';
        }

        if (textToCopy) {
            copyToClipboard(textToCopy);
            showToast(`${label} panoya kopyalandı!`);
        }
    });

    // Copy All Active Tags
    copyHashtagsBtn.addEventListener('click', () => {
        if (!activeCampaignData) return;

        let textToCopy = '';
        let label = '';

        if (activeTab === 'youtube') {
            if (activeCampaignData.youtube && Array.isArray(activeCampaignData.youtube.tags)) {
                textToCopy = activeCampaignData.youtube.tags.join(', ');
                label = 'YouTube etiketleri';
            }
        } else {
            if (Array.isArray(activeCampaignData.hashtags)) {
                textToCopy = activeCampaignData.hashtags
                    .map(t => t.startsWith('#') ? t : `#${t}`)
                    .join(' ');
                label = 'Hashtagler';
            }
        }

        if (textToCopy) {
            copyToClipboard(textToCopy);
            showToast(`${label} panoya kopyalandı!`);
        }
    });

    copyPromptBtn.addEventListener('click', () => {
        if (activeCampaignData) {
            copyToClipboard(activeCampaignData.image_prompt);
            showToast('Görsel tasarım promptu kopyalandı!');
        }
    });

    // CONNECTIONS MODAL MANAGEMENT (METRICOOL STYLE)
    const connectionsModal = document.getElementById('connectionsModal');
    const modalCloseBtn = document.getElementById('modalCloseBtn');
    const btnAddConnection = document.querySelector('.btn-add-connection');
    const btnAlertAction = document.querySelector('.btn-alert-action');
    
    // Open Modal Handlers
    if (btnAddConnection) {
        btnAddConnection.addEventListener('click', () => {
            connectionsModal.classList.remove('hidden');
        });
    }
    if (btnAlertAction) {
        btnAlertAction.addEventListener('click', () => {
            connectionsModal.classList.remove('hidden');
        });
    }

    // Direct Sidebar platform clicks triggers connection modal if not already connected
    document.querySelectorAll('.platform-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (item.id === 'ozetBtn') {
                return; // Ignore "Özet" navigation clicks
            }
            if (item.classList.contains('connected')) {
                e.preventDefault();
                // Toggle expand state for collapsible submenu
                const group = item.closest('.platform-group');
                if (group) {
                    const submenu = group.querySelector('.sidebar-submenu');
                    if (submenu) {
                        const isHidden = submenu.classList.contains('hidden');
                        
                        // Collapse all other submenus first to keep sidebar tidy!
                        document.querySelectorAll('.sidebar-submenu').forEach(sub => sub.classList.add('hidden'));
                        document.querySelectorAll('.platform-item').forEach(p => p.classList.remove('expanded'));
                        
                        if (isHidden) {
                            submenu.classList.remove('hidden');
                            item.classList.add('expanded');
                        } else {
                            submenu.classList.add('hidden');
                            item.classList.remove('expanded');
                        }
                    }
                }
            } else if (!item.classList.contains('active')) {
                // Not connected, open connection modal
                e.preventDefault();
                connectionsModal.classList.remove('hidden');
            }
        });
    });

    // Close Modal Handlers
    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', () => {
            connectionsModal.classList.add('hidden');
        });
    }
    
    if (connectionsModal) {
        connectionsModal.addEventListener('click', (e) => {
            if (e.target === connectionsModal) {
                connectionsModal.classList.add('hidden');
            }
        });
    }

    // Connect All Networks (Hepsini Bağla) Action
    const btnConnectAllNetworks = document.getElementById('btnConnectAllNetworks');
    if (btnConnectAllNetworks) {
        btnConnectAllNetworks.addEventListener('click', () => {
            btnConnectAllNetworks.disabled = true;
            const originalHTML = btnConnectAllNetworks.innerHTML;
            btnConnectAllNetworks.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Bağlanıyor...';
            
            setTimeout(() => {
                document.querySelectorAll('.conn-card').forEach(card => {
                    const network = card.getAttribute('data-network');
                    if (!card.classList.contains('active-connection')) {
                        card.classList.add('active-connection');
                        if (!card.querySelector('.conn-active-badge')) {
                            const checkBadge = document.createElement('span');
                            checkBadge.className = 'conn-active-badge';
                            checkBadge.innerHTML = '<i class="fa-solid fa-check"></i>';
                            card.appendChild(checkBadge);
                        }
                    }
                    if (network) {
                        updateSidebarPlatformStatus(network);
                    }
                });
                
                updateConnectedBrandStatsCount();
                
                btnConnectAllNetworks.disabled = false;
                btnConnectAllNetworks.innerHTML = originalHTML;
                connectionsModal.classList.add('hidden');
                
                showToast("Tüm sosyal medya ağları başarıyla bağlandı! 🚀");
            }, 1000);
        });
    }

    // Unified View Navigation Controller (Ozet, Analitik, Raporlama, Gelen Kutusu, Akilli Baglantilar, Reklamlar, Hashtag Takip, Settings)
    const allViews = [
        { btnId: 'ozetBtn', secId: 'analitikSection' },
        { btnId: 'navPlanlama', secId: 'planlamaSection' },
        { btnId: 'navAnalitik', secId: 'analitikSection' },
        { btnId: 'navRaporlama', secId: 'raporlamaSection' },
        { btnId: 'sideRaporlama', secId: 'raporlamaSection' },
        { btnId: 'sideRaporlar', secId: 'raporlamaSection' },
        { btnId: 'navGelenKutusu', secId: 'gelenKutusuSection' },
        { btnId: 'navAkilliBaglantilar', secId: 'akilliBaglantilarSection' },
        { btnId: 'navReklamlar', secId: 'reklamlarSection' },
        { btnId: 'sideHashtag', secId: 'hashtagTakipSection' },
        { btnId: 'markaAyarlariBtn', secId: 'settingsSection' },
        { btnId: 'hesapAyarlariSideBtn', secId: 'settingsSection' },
        { btnId: 'markaAyarlariSideBtn', secId: 'brandSettingsSection' }
    ];

    function showView(targetSecId, activeBtnId) {
        const biajansAlert = document.querySelector('.biajans-alert');
        const dashboardGrid = document.querySelector('.dashboard-grid');

        // Hide all views
        document.querySelectorAll('.settings-section').forEach(sec => sec.classList.add('hidden'));
        if (biajansAlert) biajansAlert.classList.add('hidden');
        if (dashboardGrid) dashboardGrid.classList.add('hidden');
        if (resultsSection) resultsSection.classList.add('hidden');
        
        // Remove active class from all horizontal top nav items
        document.querySelectorAll('.top-nav-item').forEach(item => item.classList.remove('active'));
        // Remove active background from sidebar items
        document.querySelectorAll('.platform-item').forEach(item => item.classList.remove('active'));
        // Restore footer items styling
        document.querySelectorAll('.sidebar-footer .footer-item').forEach(item => {
            item.style.backgroundColor = '';
            item.style.color = '';
        });

        // Show selected view
        if (targetSecId) {
            const sec = document.getElementById(targetSecId);
            if (sec) {
                sec.classList.remove('hidden');
                sec.scrollIntoView({ behavior: 'smooth' });
            }
        } else {
            // Show main dashboard composer
            if (biajansAlert) biajansAlert.classList.remove('hidden');
            if (dashboardGrid) dashboardGrid.classList.remove('hidden');
            if (activeCampaignData && resultsSection) {
                resultsSection.classList.remove('hidden');
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        // Apply active navigation state styling
        const activeBtn = document.getElementById(activeBtnId);
        if (activeBtn) {
            if (activeBtn.classList.contains('top-nav-item')) {
                activeBtn.classList.add('active');
            } else if (activeBtn.classList.contains('platform-item')) {
                activeBtn.classList.add('active');
            } else if (activeBtn.classList.contains('footer-item')) {
                activeBtn.style.backgroundColor = '#1b1b22';
                activeBtn.style.color = '#ffffff';
            }
        }
    }

    // Bind navigation click event listeners
    allViews.forEach(view => {
        const btn = document.getElementById(view.btnId);
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                showView(view.secId, view.btnId);
            });
        }
    });

    // 1. Settings sub-tabs switching (scoped per settings section to avoid cross-tab interference)
    function initSectionTabs(sectionEl) {
        const tabBtns = sectionEl.querySelectorAll('.settings-tab-btn');
        const tabContents = sectionEl.querySelectorAll('.settings-tab-content');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTab = btn.getAttribute('data-settings-tab');

                // Toggle active styling only within this section
                tabBtns.forEach(b => {
                    b.classList.remove('active');
                    b.style.borderBottomColor = 'transparent';
                    b.style.color = '#64748b';
                });
                btn.classList.add('active');
                btn.style.borderBottomColor = '#6366f1';
                btn.style.color = '#6366f1';

                // Show target panel only within this section
                tabContents.forEach(content => {
                    if (content.id === `${targetTab}-tab`) {
                        content.classList.remove('hidden');
                    } else {
                        content.classList.add('hidden');
                    }
                });
            });
        });
    }

    // Initialize tabs for Account Settings section
    const settingsSection = document.getElementById('settingsSection');
    if (settingsSection) initSectionTabs(settingsSection);

    // Initialize tabs for Brand Settings section
    const brandSettingsSection = document.getElementById('brandSettingsSection');
    if (brandSettingsSection) initSectionTabs(brandSettingsSection);

    // 2. AI configuration accordion toggles
    document.querySelectorAll('.accordion-header').forEach(header => {
        header.addEventListener('click', () => {
            const item = header.closest('.accordion-item');
            const isOpen = item.classList.contains('open');
            
            // Toggle item state
            if (isOpen) {
                item.classList.remove('open');
            } else {
                item.classList.add('open');
            }
        });
    });

    // 3. Save Brand Settings & Update Preview Username Handles
    const saveBrandSettingsBtn = document.getElementById('saveBrandSettingsBtn');
    const settingBrandNameInput = document.getElementById('settingBrandNameInput');
    const settingsBrandTitle = document.getElementById('settingsBrandTitle');
    const brandSelect = document.getElementById('brandSelect');

    if (saveBrandSettingsBtn) {
        saveBrandSettingsBtn.addEventListener('click', () => {
            const newName = settingBrandNameInput.value.trim();
            if (!newName) {
                showToast("Lütfen geçerli bir marka adı girin.", true);
                return;
            }
            
            settingsBrandTitle.textContent = newName;
            
            // Sync top bar selector dropdown
            if (brandSelect) {
                brandSelect.options[brandSelect.selectedIndex].text = newName;
            }
            
            // Update preview frames handle
            const formatHandle = newName.toLowerCase().replace(/\s+/g, '_');
            
            // Instagram mock
            const igHeader = document.querySelector('#instagramMockup .post-meta h4');
            if (igHeader) igHeader.innerHTML = `${formatHandle} <i class="fa-solid fa-circle-check text-li"></i>`;
            const igCaptionStrong = document.querySelector('#instagramMockup .post-caption-box strong');
            if (igCaptionStrong) igCaptionStrong.textContent = formatHandle;
            
            // Facebook mock
            const fbHeader = document.querySelector('#facebookMockup .post-meta h4');
            if (fbHeader) fbHeader.innerHTML = `${newName} <i class="fa-solid fa-circle-check text-li"></i>`;
            
            // YouTube mock
            const ytHeader = document.querySelector('#youtubeMockup .yt-channel-info h5');
            if (ytHeader) ytHeader.textContent = newName;

            // Bio mockup title
            const bioTitle = document.getElementById('bioMockupTitle');
            if (bioTitle) bioTitle.textContent = `@${formatHandle}`;
            
            showToast("Marka ayarları başarıyla güncellendi.");
        });
    }

    // 4. Save AI Config Custom Instructions (shared handler for both account & brand settings)
    const saveAiConfigBtn = document.getElementById('saveAiConfigBtn');
    window.aiInstructions = {
        writingStyle: "",
        x: "",
        bluesky: "",
        facebook: "",
        instagram: "",
        threads: "",
        linkedin: "",
        google: "",
        pinterest: "",
        tiktok: "",
        youtube: ""
    };

    function saveAiConfigHandler() {
        const getVal = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
        window.aiInstructions.writingStyle = getVal('aiGenWritingStyle');
        window.aiInstructions.x           = getVal('aiXInstructions');
        window.aiInstructions.bluesky     = getVal('aiBlueskyInstructions');
        window.aiInstructions.facebook    = getVal('aiFacebookInstructions');
        window.aiInstructions.instagram   = getVal('aiInstagramInstructions');
        window.aiInstructions.threads     = getVal('aiThreadsInstructions');
        window.aiInstructions.linkedin    = getVal('aiLinkedinInstructions');
        window.aiInstructions.google      = getVal('aiGoogleInstructions');
        window.aiInstructions.pinterest   = getVal('aiPinterestInstructions');
        window.aiInstructions.tiktok      = getVal('aiTiktokInstructions');
        window.aiInstructions.youtube     = getVal('aiYoutubeInstructions');
        showToast("Yapay zeka asistanı talimatları başarıyla kaydedildi!");
    }

    ['saveAiConfigBtn', 'saveAiConfigBtnAccount', 'saveAiConfigBtnBrand'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.addEventListener('click', saveAiConfigHandler);
    });

    // 5. Connect platform cards — Gerçek OAuth akışı
    // Platform adını normalize eder (conn-card'daki data-network değerinden URL-slug'a çevirir)
    const _platformSlug = (name) => name.toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g')
        .replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c');

    async function connectPlatform(card, network) {
        // Zaten bağlıysa — bilgi ver
        if (card.classList.contains('active-connection')) {
            showToast(`${network} zaten bağlı durumda. Bağlantıyı kesmek için sağ tıklayın.`, true);
            return;
        }

        const slug = _platformSlug(network);
        const cardTitle = card.querySelector('h4');
        const originalTitle = cardTitle ? cardTitle.textContent : network;

        // Yükleniyor durumu
        const allSameCards = document.querySelectorAll(`.conn-card[data-network="${network}"]`);
        allSameCards.forEach(c => {
            c.style.pointerEvents = 'none';
            c.style.opacity = '0.7';
            const h4 = c.querySelector('h4');
            if (h4) h4.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Bağlanıyor...';
        });

        try {
            const res = await fetch(`/auth/${slug}/start`);
            const data = await res.json();

            if (data.configured === false) {
                // Credentials yapılandırılmamış — kurulum rehberini göster
                allSameCards.forEach(c => {
                    c.style.pointerEvents = 'auto';
                    c.style.opacity = '1';
                    const h4 = c.querySelector('h4');
                    if (h4) h4.textContent = originalTitle;
                });
                _showOAuthSetupGuide(network, slug);
                return;
            }

            if (data.success && data.redirect_url) {
                // Kullanıcıyı OAuth platformuna yönlendir
                window.location.href = data.redirect_url;
                return;
            }

            throw new Error(data.error || 'OAuth başlatılamadı.');

        } catch (err) {
            allSameCards.forEach(c => {
                c.style.pointerEvents = 'auto';
                c.style.opacity = '1';
                const h4 = c.querySelector('h4');
                if (h4) h4.textContent = originalTitle;
            });
            showToast(`${network} bağlantısı başlatılamadı: ${err.message}`, true);
        }
    }

    function _showOAuthSetupGuide(network, slug) {
        // Credentials yokken kılavuz toast mesajı göster
        const portalLinks = {
            'meta': 'developers.facebook.com/apps',
            'facebook': 'developers.facebook.com/apps',
            'instagram': 'developers.facebook.com/apps',
            'google': 'console.cloud.google.com',
            'youtube': 'console.cloud.google.com',
            'google_ads': 'console.cloud.google.com',
            'linkedin': 'linkedin.com/developers',
            'x': 'developer.x.com',
            'tiktok': 'developers.tiktok.com',
            'pinterest': 'developers.pinterest.com',
            'bluesky': 'bsky.app/settings/app-passwords',
        };
        const portal = portalLinks[slug] || 'developer portal';
        showToast(
            `${network} için OAuth credentials yapılandırılmamış. ".env" dosyasına ${network.toUpperCase()}_CLIENT_ID ekleyin (${portal}).`,
            true
        );
    }

    document.querySelectorAll('.conn-card').forEach(card => {
        card.addEventListener('click', () => {
            const network = card.getAttribute('data-network');
            connectPlatform(card, network);
        });
    });

    // Sağ tık → bağlantıyı kes
    document.querySelectorAll('.conn-card').forEach(card => {
        card.addEventListener('contextmenu', async (e) => {
            e.preventDefault();
            if (!card.classList.contains('active-connection')) return;
            const network = card.getAttribute('data-network');
            const slug = _platformSlug(network);
            const confirmed = confirm(`${network} bağlantısını kesmek istiyor musunuz?`);
            if (!confirmed) return;
            try {
                await fetch('/api/disconnect', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ platform: slug }),
                });
                document.querySelectorAll(`.conn-card[data-network="${network}"]`).forEach(c => {
                    c.classList.remove('active-connection');
                    const badge = c.querySelector('.conn-active-badge');
                    if (badge) badge.remove();
                });
                updateSidebarPlatformStatus(network, false);
                updateConnectedBrandStatsCount();
                showToast(`${network} bağlantısı kesildi.`);
            } catch (err) {
                showToast(`Bağlantı kesilemedi: ${err.message}`, true);
            }
        });
    });

    // Sidebar overlay click modal close
    if (connectionsModal) {
        connectionsModal.addEventListener('click', (e) => {
            if (e.target === connectionsModal) {
                connectionsModal.classList.add('hidden');
            }
        });
    }

    // Update Brand Settings statistics count helper
    function updateConnectedBrandStatsCount() {
        const activeCount = document.querySelectorAll('.sidebar .platform-item.connected').length;
        const connectedCountText = document.getElementById('connectedCountText');
        if (connectedCountText) connectedCountText.textContent = activeCount;
    }

    // Helper to dynamically update sidebar platform state (removing "+" and adding checked dot!)
    function updateSidebarPlatformStatus(network) {
        document.querySelectorAll('.platform-item').forEach(item => {
            const spanText = item.querySelector('span').textContent.trim();
            if (spanText.toLowerCase() === network.toLowerCase() || (network === 'TikTok Kişisel' && spanText === 'TikTok')) {
                const plus = item.querySelector('.plus-icon');
                if (plus) plus.remove();
                
                // Show collapsible caret arrow indicator
                const caret = item.querySelector('.submenu-caret');
                if (caret) caret.classList.remove('hidden');
                
                const dot = item.querySelector('.active-dot');
                if (dot) {
                    dot.classList.remove('hidden');
                } else {
                    const newDot = document.createElement('span');
                    newDot.className = 'active-dot';
                    item.appendChild(newDot);
                }
                item.classList.add('connected');
            }
        });
    }

    // INTERACTIVE WIDGETS LOGIC

    // 1. Analytics view Date range changer
    const analyticsDateSelect = document.getElementById('analyticsDateSelect');
    const igFollowersVal = document.getElementById('igFollowersVal');
    const fbLikesVal = document.getElementById('fbLikesVal');
    const ytSubsVal = document.getElementById('ytSubsVal');
    const engagementScaleLabel = document.getElementById('engagementScaleLabel');

    if (analyticsDateSelect) {
        analyticsDateSelect.addEventListener('change', () => {
            const days = analyticsDateSelect.value;
            let multiplier = 1;
            if (days === '7') multiplier = 0.85;
            if (days === '90') multiplier = 1.25;

            // Trigger visual multiplier switch
            if (igFollowersVal) igFollowersVal.textContent = Math.round(24582 * multiplier).toLocaleString();
            if (fbLikesVal) fbLikesVal.textContent = Math.round(12840 * multiplier).toLocaleString();
            if (ytSubsVal) ytSubsVal.textContent = Math.round(8419 * multiplier).toLocaleString();

            showToast("Analitik zaman aralığı güncellendi!");
        });
    }

    // 2. Reporting view simulated Custom PDF/PPT document creation & settings (biAjans Custom Report Builder)
    const activeSelectedMetricsCount = document.getElementById('activeSelectedMetricsCount');
    const checkboxes = document.querySelectorAll('.rapor-section-checkbox');

    function updateSelectedMetricsCount() {
        if (!activeSelectedMetricsCount) return;
        const checkedCount = document.querySelectorAll('.rapor-section-checkbox:checked').length;
        activeSelectedMetricsCount.textContent = checkedCount;
    }

    checkboxes.forEach(chk => {
        chk.addEventListener('change', () => {
            updateSelectedMetricsCount();
            // Visual feedback on row selection
            const row = chk.closest('.rapor-section-row');
            if (row) {
                if (chk.checked) {
                    row.style.background = 'rgba(168, 85, 247, 0.08)';
                    row.querySelector('span').style.color = 'var(--text-primary)';
                } else {
                    row.style.background = 'rgba(255, 255, 255, 0.02)';
                    row.querySelector('span').style.color = 'var(--text-muted)';
                }
            }
        });
        // trigger initial visual feedback
        if (chk.checked) {
            const row = chk.closest('.rapor-section-row');
            if (row) row.style.background = 'rgba(168, 85, 247, 0.08)';
        }
    });
    updateSelectedMetricsCount();

    // Automatic report toggler
    const toggleAutoRapor = document.getElementById('toggleAutoRapor');
    const autoRaporConfigDetails = document.getElementById('autoRaporConfigDetails');
    const autoRaporDisabledNotice = document.getElementById('autoRaporDisabledNotice');

    if (toggleAutoRapor) {
        toggleAutoRapor.addEventListener('change', () => {
            if (toggleAutoRapor.checked) {
                autoRaporConfigDetails.classList.remove('hidden');
                autoRaporDisabledNotice.classList.add('hidden');
                showToast("Otomatik aylık rapor gönderimi aktif edildi! 📅");
            } else {
                autoRaporConfigDetails.classList.add('hidden');
                autoRaporDisabledNotice.classList.remove('hidden');
                showToast("Otomatik aylık rapor gönderimi devre dışı bırakıldı.");
            }
        });
    }

    // New Template Generator
    const btnRaporNewTemplate = document.getElementById('btnRaporNewTemplate');
    const raporTemplateSelect = document.getElementById('raporTemplateSelect');
    if (btnRaporNewTemplate && raporTemplateSelect) {
        btnRaporNewTemplate.addEventListener('click', () => {
            const name = prompt("Yeni Rapor Şablonunun adını girin:", "Özel Müşteri Performansı");
            if (name && name.trim()) {
                const opt = document.createElement('option');
                opt.value = name.toLowerCase().replace(/\s+/g, '_');
                opt.textContent = name.trim();
                raporTemplateSelect.appendChild(opt);
                raporTemplateSelect.value = opt.value;
                showToast(`"${name}" şablonu başarıyla oluşturuldu ve seçildi!`);
            }
        });
    }

    // Save report settings
    const btnRaporlamaSaveTemplate = document.getElementById('btnRaporlamaSaveTemplate');
    if (btnRaporlamaSaveTemplate) {
        btnRaporlamaSaveTemplate.addEventListener('click', () => {
            showToast("biAjans rapor ayarları ve filtreleri başarıyla kaydedildi! 💾");
        });
    }

    // Send email now
    const btnSendRaporEmailNow = document.getElementById('btnSendRaporEmailNow');
    if (btnSendRaporEmailNow) {
        btnSendRaporEmailNow.addEventListener('click', () => {
            const orig = btnSendRaporEmailNow.innerHTML;
            const email = document.getElementById('autoRaporEmail').value || 'yonetici@biajans.com';
            btnSendRaporEmailNow.disabled = true;
            btnSendRaporEmailNow.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Gönderiliyor...';

            setTimeout(() => {
                btnSendRaporEmailNow.disabled = false;
                btnSendRaporEmailNow.innerHTML = orig;
                showToast(`Performans raporu "${email}" adresine başarıyla e-posta olarak gönderildi! ✉️`);
            }, 1000);
        });
    }

    // PDF and PPT builders helper
    function getSelectedPlatformsText() {
        const list = [];
        document.querySelectorAll('.rapor-section-row').forEach(row => {
            const chk = row.querySelector('.rapor-section-checkbox');
            if (chk && chk.checked) {
                const name = row.querySelector('span').textContent.trim();
                const styleSelect = row.querySelector('.rapor-row-select:first-of-type');
                const filterSelect = row.querySelector('.rapor-row-select:last-of-type');
                const styleVal = styleSelect ? styleSelect.value : 'Stil: Standart';
                const filterVal = filterSelect ? filterSelect.value : 'Tüm Veriler';
                list.push(`- ${name} (Detaylar: ${styleVal} | Filtre: ${filterVal})`);
            }
        });
        return list.length > 0 ? list.join('\n') : '- Seçili veri bölümü yok.';
    }

    const btnRaporlamaDownloadPdf = document.getElementById('btnRaporlamaDownloadPdf');
    if (btnRaporlamaDownloadPdf) {
        btnRaporlamaDownloadPdf.addEventListener('click', () => {
            const orig = btnRaporlamaDownloadPdf.innerHTML;
            btnRaporlamaDownloadPdf.disabled = true;
            btnRaporlamaDownloadPdf.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> PDF Raporu İndiriliyor...';

            setTimeout(() => {
                btnRaporlamaDownloadPdf.disabled = false;
                btnRaporlamaDownloadPdf.innerHTML = orig;

                const activeBrandText = document.getElementById('brandSelect') ? document.getElementById('brandSelect').options[document.getElementById('brandSelect').selectedIndex].text : 'Boş marka';
                const selectedPeriod = document.getElementById('raporPeriodSelect') ? document.getElementById('raporPeriodSelect').options[document.getElementById('raporPeriodSelect').selectedIndex].text : 'Bu Ay';
                const selectedLang = document.getElementById('raporLanguageSelect') ? document.getElementById('raporLanguageSelect').options[document.getElementById('raporLanguageSelect').selectedIndex].text : 'Türkçe';
                const selectedTemplate = document.getElementById('raporTemplateSelect') ? document.getElementById('raporTemplateSelect').options[document.getElementById('raporTemplateSelect').selectedIndex].text : 'biAjans Standart';

                const reportContent = `
======================================================================
         BIAJANS PROFESYONEL PERFORMANS ANALİZ RAPORU (PDF BUNDLE)
======================================================================
Marka / Müşteri: ${activeBrandText}
Tarih Aralığı: ${selectedPeriod}
Raporlama Dili: ${selectedLang}
Seçilen Şablon: ${selectedTemplate}
Rapor Üretim Tarihi: ${new Date().toLocaleDateString('tr-TR')} ${new Date().toLocaleTimeString('tr-TR')}
Rapor Durumu: BİTMİŞ & DOĞRULANMIŞ

DAHİL EDİLEN VERİ BÖLÜMLERİ VE FİLTRELERİ:
----------------------------------------------------------------------
${getSelectedPlatformsText()}

ÖZET ANALİZ VE YORUM:
----------------------------------------------------------------------
Yapay Zeka (biAjans AI Engine) verilerine göre bu dönem markanız için etkileşim oranlarında genel bir yükseliş trendi gözlemlenmiştir. Sosyal ağlara gönderilen içeriklerin optimizasyonu ve AI çok kanallı planlayıcı desteği, organik gösterimleri arttırmış ve topluluğunuzla olan iletişimin kalitesini yükseltmiştir.

Tavsiyeler:
1. Instagram Reels formatındaki içerik üretim sıklığını %15 oranında arttırın.
2. WhatsApp VIP Chat üzerinden gelen müşteri dönüşlerine yapay zeka entegrasyonuyla hızlı yanıt vermeye devam edin.
3. Reklam bütçelerini etkileşim oranı en yüksek olan günlere (Salı ve Cuma akşamları) kaydırın.

======================================================================
biAjans AI Marketing & Social Media OS - Raporlama Modülü
======================================================================
`;
                const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `biajans_performans_raporu_${new Date().toISOString().slice(0, 10)}.txt`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                showToast("Özelleştirilmiş PDF Performans Raporu başarıyla indirildi! 📊");
            }, 1000);
        });
    }

    const btnRaporlamaDownloadPpt = document.getElementById('btnRaporlamaDownloadPpt');
    if (btnRaporlamaDownloadPpt) {
        btnRaporlamaDownloadPpt.addEventListener('click', () => {
            const orig = btnRaporlamaDownloadPpt.innerHTML;
            btnRaporlamaDownloadPpt.disabled = true;
            btnRaporlamaDownloadPpt.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> PPT Raporu İndiriliyor...';

            setTimeout(() => {
                btnRaporlamaDownloadPpt.disabled = false;
                btnRaporlamaDownloadPpt.innerHTML = orig;

                const activeBrandText = document.getElementById('brandSelect') ? document.getElementById('brandSelect').options[document.getElementById('brandSelect').selectedIndex].text : 'Boş marka';
                const selectedPeriod = document.getElementById('raporPeriodSelect') ? document.getElementById('raporPeriodSelect').options[document.getElementById('raporPeriodSelect').selectedIndex].text : 'Bu Ay';

                const reportContent = `
======================================================================
         BIAJANS SUNUM DEĞERLENDİRME SLAYTLARI (PPT BUNDLE)
======================================================================
Müşteri Sunumu: ${activeBrandText}
Sunum Periyodu: ${selectedPeriod}
Yayıncı Platform: biAjans Raporlama Sunucusu

SLAYT 1: KAPAK VE GİRİŞ
- biAjans AI Performans Sunumu
- Marka: ${activeBrandText}
- Periyot: ${selectedPeriod}

SLAYT 2: SOSYAL AĞ PERFORMANSI
- Seçilen Bölümler ve Entegre Veriler
- Gösterim ve Etkileşim Trend Analizleri

SLAYT 3: AKSİYON PLANLARI VE STRATEJİ
- biAjans AI Post Planlayıcı Raporu
- Gelecek Dönem İçerik Önerileri

======================================================================
biAjans AI Marketing & Social Media OS - Raporlama Sunumu
======================================================================
`;
                const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `biajans_sunum_slaytlari_${new Date().toISOString().slice(0, 10)}.txt`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                showToast("Müşteri Sunum Slaytları (PPT) başarıyla indirildi! 📉");
            }, 1000);
        });
    }

    // 3. Looker Studio connection simulation
    const btnRaporlarLookerConnect = document.getElementById('btnRaporlarLookerConnect');
    if (btnRaporlarLookerConnect) {
        btnRaporlarLookerConnect.addEventListener('click', () => {
            if (btnRaporlarLookerConnect.classList.contains('connected')) {
                showToast("Looker Studio zaten bağlı durumda.", true);
                return;
            }

            btnRaporlarLookerConnect.disabled = true;
            btnRaporlarLookerConnect.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Looker API Bağlanıyor...';

            setTimeout(() => {
                btnRaporlarLookerConnect.disabled = false;
                btnRaporlarLookerConnect.innerHTML = '<i class="fa-solid fa-circle-check"></i> Looker Studio Bağlı';
                btnRaporlarLookerConnect.classList.add('connected');
                btnRaporlarLookerConnect.style.backgroundColor = '#d1fae5';
                btnRaporlarLookerConnect.style.color = '#065f46';
                btnRaporlarLookerConnect.style.borderColor = '#34d399';

                // Sync connection modal cards and sidebars
                updateSidebarPlatformStatus('Looker Stüdyosu');
                updateConnectedBrandStatsCount();

                showToast("Looker Studio entegrasyonu başarıyla kuruldu! Gösterge paneli aktif.");
            }, 1500);
        });
    }

    // 4. Premium Upgrade Modal controllers
    const premiumUpgradeModal = document.getElementById('premiumUpgradeModal');
    const premiumModalCloseBtn = document.getElementById('premiumModalCloseBtn');
    const pricingBillingToggle = document.getElementById('pricingBillingToggle');
    const upgradeTriggers = document.querySelectorAll('.btnUpgradeTrigger, #btnRaporTopUpgrade, #btnUpgradeSmartLinks');

    if (upgradeTriggers.length > 0) {
        upgradeTriggers.forEach(trigger => {
            trigger.addEventListener('click', (e) => {
                e.preventDefault();
                /* unlocked */
            });
        });
    }

    if (premiumModalCloseBtn && premiumUpgradeModal) {
        premiumModalCloseBtn.addEventListener('click', () => {
            premiumUpgradeModal.classList.add('hidden');
        });
    }

    if (pricingBillingToggle) {
        pricingBillingToggle.addEventListener('change', () => {
            const isYearly = pricingBillingToggle.checked;
            
            const starterVal = document.getElementById('priceValStarter');
            const starterPeriod = document.getElementById('periodValStarter');
            const advancedVal = document.getElementById('priceValAdvanced');
            const advancedPeriod = document.getElementById('periodValAdvanced');
            const enterpriseVal = document.getElementById('priceValEnterprise');
            const enterprisePeriod = document.getElementById('periodValEnterprise');

            if (isYearly) {
                if (starterVal) starterVal.textContent = "8€";
                if (starterPeriod) starterPeriod.textContent = "/yıl (yıllık fatura)";
                if (advancedVal) advancedVal.textContent = "19€";
                if (advancedPeriod) advancedPeriod.textContent = "/yıl (yıllık fatura)";
                if (enterpriseVal) enterpriseVal.textContent = "39€";
                if (enterprisePeriod) enterprisePeriod.textContent = "/yıl (yıllık fatura)";
                showToast("Yıllık faturalandırma seçildi (%20 indirim uygulandı!)");
            } else {
                if (starterVal) starterVal.textContent = "10€";
                if (starterPeriod) starterPeriod.textContent = "/ay";
                if (advancedVal) advancedVal.textContent = "24€";
                if (advancedPeriod) advancedPeriod.textContent = "/ay";
                if (enterpriseVal) enterpriseVal.textContent = "49€";
                if (enterprisePeriod) enterprisePeriod.textContent = "/ay";
            }
        });
    }

    // Connect confirm pricing choices
    document.querySelectorAll('.btnUpgradeConfirm').forEach(btn => {
        btn.addEventListener('click', () => {
            const plan = btn.getAttribute('data-plan');
            const originalHTML = btn.innerHTML;
            
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Kart Doğrulanıyor...';

            setTimeout(() => {
                btn.disabled = false;
                btn.innerHTML = originalHTML;
                if (premiumUpgradeModal) premiumUpgradeModal.classList.add('hidden');
                
                showToast(`Harika! biAjans ${plan} planına başarıyla geçiş yaptınız. Premium özellikler açıldı! 🎉`);
            }, 1400);
        });
    });

    // 5. Connect Raporlama alert connection button
    const btnRaporlamaConnectSoc = document.getElementById('btnRaporlamaConnectSoc');
    if (btnRaporlamaConnectSoc) {
        btnRaporlamaConnectSoc.addEventListener('click', () => {
            if (connectionsModal) connectionsModal.classList.remove('hidden');
        });
    }

    // 6. smart inbox controllers (Dual-State)
    const btnActivateInboxDemo = document.getElementById('btnActivateInboxDemo');
    const btnDeactivateInboxDemo = document.getElementById('btnDeactivateInboxDemo');
    const inboxPromoState = document.getElementById('inboxPromoState');
    const inboxActiveState = document.getElementById('inboxActiveState');
    const btnInboxConnectSoc = document.getElementById('btnInboxConnectSoc');
    const btnInboxFooterConnect = document.getElementById('btnInboxFooterConnect');

    function activateSocialInbox() {
        if (inboxPromoState && inboxActiveState) {
            inboxPromoState.classList.add('hidden');
            inboxActiveState.classList.remove('hidden');
            renderConsolidatedInboxList();
            renderActiveInboxChat();
            showToast("Birleşik Sosyal Gelen Kutusu Aktif Edildi! ⚡");
        }
    }

    function deactivateSocialInbox() {
        if (inboxPromoState && inboxActiveState) {
            inboxActiveState.classList.add('hidden');
            inboxPromoState.classList.remove('hidden');
        }
    }

    if (btnActivateInboxDemo) btnActivateInboxDemo.addEventListener('click', activateSocialInbox);
    if (btnDeactivateInboxDemo) btnDeactivateInboxDemo.addEventListener('click', deactivateSocialInbox);

    if (btnInboxConnectSoc) {
        btnInboxConnectSoc.addEventListener('click', () => {
            if (connectionsModal) connectionsModal.classList.remove('hidden');
        });
    }
    if (btnInboxFooterConnect) {
        btnInboxFooterConnect.addEventListener('click', () => {
            if (connectionsModal) connectionsModal.classList.remove('hidden');
        });
    }

    // Consolidated unified inbox messages data models
    const inboxChatsData = {
        'Melis Yılmaz': {
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&q=80',
            handle: '@melis_ylmz',
            platform: 'instagram',
            tag: 'VIP',
            tagClass: 'tag-vip',
            note: 'Lansman fıstık ezmesi kampanyasından geldi.',
            time: '2 dk',
            unread: true,
            messages: [
                { text: 'Merhaba, lansman özel indirimli fıstık ezmesi siparişi vermiştim. Kargo takip kodum gelmedi de ne zaman ulaşır acaba?', isSender: false },
                { text: 'Merhaba Melis Hanım, siparişiniz için çok teşekkür ederiz. Sistemlerimizi kontrol ettim, kargonuz bu sabah Aras Kargo\'ya teslim edilmiş. Takip kodunuz birazdan SMS olarak iletilecektir.', isSender: true },
                { text: 'Çok teşekkür ederim hızlı cevabınız için! Harikasınız 🥜🌟', isSender: false }
            ],
            replyPreset: 'Çok teşekkürler Can Bey, kargomu heyecanla bekliyorum! İyi çalışmalar dilerim. 🥜😊'
        },
        'Can Polat': {
            avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&q=80',
            handle: '@can_polat',
            platform: 'youtube',
            tag: 'Lead',
            tagClass: 'tag-lead',
            note: 'Kahve lansman indirim kuponu talep ediyor.',
            time: '5 dk',
            unread: true,
            messages: [
                { text: 'Merhaba, kahve lansman indirim kuponu sepet sayfasında çalışmıyor.', isSender: false },
                { text: 'Merhaba Can Bey, kupon kodları ilk 100 siparişte geçerliydi. Ancak sizler için özel tek kullanımlık %15 indirim kuponu tanımlayabilirim.', isSender: true }
            ],
            replyPreset: 'Süpersiniz Can Bey! Kodu gönderirseniz hemen Etiyopya ve Kolombiya çekirdeklerinden sipariş geçeceğim!'
        },
        'Didem Şen': {
            avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&q=80',
            handle: '@didem_sen',
            platform: 'facebook',
            tag: 'Yeni',
            tagClass: 'tag-lead',
            note: 'Filtre kahve öğütme seçeneklerini sordu.',
            time: '15 dk',
            unread: false,
            messages: [
                { text: 'Harika bir çalışma olmuş, tebrikler! Filtre kahve makineleri için çekirdek öğütüyor musunuz yoksa sadece çekirdek olarak mı gönderiyorsunuz?', isSender: false }
            ],
            replyPreset: 'Çok teşekkürler bilgi için! French press demlememe uygun kalınlıkta siparişimi geçiyorum. Kolay gelsin.'
        },
        'Hakan Kaya': {
            avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80&q=80',
            handle: '@hakan_kaya',
            platform: 'x',
            tag: 'Müşteri',
            tagClass: 'tag-recurring',
            note: 'Etiyopya çekirdek stok durumunu sorguluyor.',
            time: '1 sa',
            unread: false,
            messages: [
                { text: 'Etiyopya çekirdeklerinizin stokları ne zaman yenilenecek? Geçen hafta aldığım paket bitti bitecek, çok beğendik!', isSender: false }
            ],
            replyPreset: 'Süpersiniz! Bildirim listesine kaydoldum, taze kavrumları heyecanla bekliyorum ☕️🔥'
        },
        'Esra Mert': {
            avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&q=80',
            handle: '@esra_mert',
            platform: 'linkedin',
            tag: 'Recurring',
            tagClass: 'tag-recurring',
            note: 'B2B sosyal medya kurumsal teklifi istedi.',
            time: '4 sa',
            unread: false,
            messages: [
                { text: 'Merhabalar Can Bey, sosyal medya ajansınızla kurumsal iş ortaklığı kurmak istiyoruz. Ajans teklifinizi ve portfolyonuzu iletebilir misiniz?', isSender: false }
            ],
            replyPreset: 'Teşekkürler Can Bey, teklif dosyasını ekibimizle birlikte inceleyip en kısa sürede dönüş sağlayacağım.'
        },
        'Zeynep Demir': {
            avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&q=80',
            handle: '+90 532 123 4567',
            platform: 'whatsapp',
            tag: 'VIP',
            tagClass: 'tag-vip',
            note: 'WhatsApp Business kataloğundan sipariş vermek istiyor.',
            time: '1 dk',
            unread: true,
            messages: [
                { text: 'Merhaba! WhatsApp kataloğunuz üzerinden doğrudan sipariş verebiliyor muyuz? Bir de 150 TL üzeri kargo ücretsiz kampanyası devam ediyor mu? 🌸', isSender: false }
            ],
            replyPreset: 'Harika, çok teşekkürler! Hemen kataloğunuzdan ürünleri seçip siparişimi buradan tamamlıyorum. 📱👍'
        }
    };

    let activeInboxChatKey = 'Melis Yılmaz';
    let inboxActiveFilter = 'all';

    // Renders the single-screen consolidated inbox list based on active filtering tabs
    function renderConsolidatedInboxList() {
        const unifiedInboxList = document.getElementById('unifiedInboxList');
        if (!unifiedInboxList) return;

        unifiedInboxList.innerHTML = '';
        let matchCount = 0;

        Object.keys(inboxChatsData).forEach(key => {
            const chat = inboxChatsData[key];
            if (inboxActiveFilter !== 'all' && chat.platform !== inboxActiveFilter) return;

            matchCount++;
            
            const threadItem = document.createElement('div');
            threadItem.className = `chat-thread-item ${key === activeInboxChatKey ? 'active' : ''}`;
            
            // Custom HSL branding outline for selected
            const borderStyle = key === activeInboxChatKey ? 'border: 1.5px solid var(--accent);' : 'border: 1px solid var(--card-border);';
            threadItem.style.cssText = `padding: 12px 10px; border-radius: 6px; background-color: #ffffff; ${borderStyle} cursor: pointer; display: flex; gap: 10px; align-items: center; position: relative;`;
            
            // Platform branding color configurations
            let platformColor = '#db2777'; // IG
            if (chat.platform === 'facebook') platformColor = '#1877f2';
            if (chat.platform === 'youtube') platformColor = '#ef4444';
            if (chat.platform === 'linkedin') platformColor = '#0077b5';
            if (chat.platform === 'x') platformColor = '#0f172a';
            if (chat.platform === 'whatsapp') platformColor = '#25d366';

            const lastMessageText = chat.messages[chat.messages.length - 1].text;

            threadItem.innerHTML = `
                <div style="position: relative; flex-shrink: 0;">
                    <img src="${chat.avatar}" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover;">
                    <span style="position: absolute; bottom: -2px; right: -2px; width: 14px; height: 14px; border-radius: 50%; background-color: ${platformColor}; color: white; display: flex; align-items: center; justify-content: center; font-size: 8px; border: 1.5px solid white;">
                        <i class="fa-brands fa-${chat.platform === 'x' ? 'x-twitter' : chat.platform}"></i>
                    </span>
                </div>
                <div style="overflow: hidden; text-align: left; width: 100%;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <h5 style="font-size: 12px; font-weight: 700; color: var(--text-primary); margin: 0;">${key}</h5>
                        <span style="font-size: 9px; color: var(--text-muted);">${chat.time}</span>
                    </div>
                    <p style="font-size: 10.5px; color: var(--text-secondary); text-overflow: ellipsis; overflow: hidden; white-space: nowrap; margin: 3px 0 0 0;">${lastMessageText}</p>
                </div>
                <span class="badge-tag-inbox ${chat.tagClass}" style="margin-left: 4px;">${chat.tag}</span>
                ${chat.unread ? `<span style="width: 6px; height: 6px; border-radius: 50%; background-color: var(--accent); margin-left: 6px; flex-shrink: 0;" class="unread-dot-badge"></span>` : ''}
            `;

            threadItem.addEventListener('click', () => {
                activeInboxChatKey = key;
                chat.unread = false; // Mark unread off
                renderConsolidatedInboxList();
                renderActiveInboxChat();
            });

            unifiedInboxList.appendChild(threadItem);
        });

        // Update active count dynamically
        const inboxCountAll = document.getElementById('inboxCountAll');
        if (inboxCountAll) inboxCountAll.textContent = matchCount;
    }

    // Renders active conversation pane detail contents
    function renderActiveInboxChat() {
        const viewport = document.getElementById('inboxActiveMessagesViewport');
        const activeName = document.getElementById('activeInboxName');
        const activeHandle = document.getElementById('activeInboxHandle');
        const activeAvatar = document.getElementById('activeInboxAvatar');
        const activePlatformIcon = document.getElementById('activeInboxPlatformIcon');
        const activeTagBadge = document.getElementById('activeInboxTagBadge');
        const inboxCustNoteInput = document.getElementById('inboxCustNoteInput');

        if (!viewport || !inboxChatsData) return;

        const chat = inboxChatsData[activeInboxChatKey];
        if (!chat) return;

        // Populate metadata
        if (activeName) activeName.textContent = activeInboxChatKey;
        if (activeHandle) activeHandle.textContent = chat.handle;
        if (activeAvatar) activeAvatar.src = chat.avatar;
        
        if (inboxCustNoteInput) inboxCustNoteInput.value = chat.note;

        if (activeTagBadge) {
            activeTagBadge.textContent = chat.tag;
            activeTagBadge.className = `badge-tag-inbox ${chat.tagClass}`;
        }

        // Platform specific branding on header icon
        if (activePlatformIcon) {
            let platformColor = '#db2777'; // IG
            if (chat.platform === 'facebook') platformColor = '#1877f2';
            if (chat.platform === 'youtube') platformColor = '#ef4444';
            if (chat.platform === 'linkedin') platformColor = '#0077b5';
            if (chat.platform === 'x') platformColor = '#0f172a';
            if (chat.platform === 'whatsapp') platformColor = '#25d366';
            
            activePlatformIcon.style.backgroundColor = platformColor;
            activePlatformIcon.innerHTML = `<i class="fa-brands fa-${chat.platform === 'x' ? 'x-twitter' : chat.platform}"></i>`;
        }

        viewport.innerHTML = '';

        chat.messages.forEach(msg => {
            const bubble = document.createElement('div');
            bubble.className = msg.isSender ? 'inbox-msg-sent' : 'inbox-msg-received';
            bubble.textContent = msg.text;
            viewport.appendChild(bubble);
        });

        // Scroll automatically to bottom
        viewport.scrollTop = viewport.scrollHeight;
    }

    // Handles platform filtering buttons click events
    document.querySelectorAll('.inbox-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.inbox-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            inboxActiveFilter = btn.getAttribute('data-inbox-filter');
            
            // Auto switch active selected key to first matching row to avoid blank threads!
            const firstMatch = Object.keys(inboxChatsData).find(key => {
                return inboxActiveFilter === 'all' || inboxChatsData[key].platform === inboxActiveFilter;
            });
            if (firstMatch) activeInboxChatKey = firstMatch;

            renderConsolidatedInboxList();
            renderActiveInboxChat();
        });
    });

    // Save Customer internal note helper
    const btnSaveInboxNote = document.getElementById('btnSaveInboxNote');
    if (btnSaveInboxNote) {
        btnSaveInboxNote.addEventListener('click', () => {
            const noteVal = document.getElementById('inboxCustNoteInput').value.trim();
            if (inboxChatsData[activeInboxChatKey]) {
                inboxChatsData[activeInboxChatKey].note = noteVal;
                showToast(`${activeInboxChatKey} müşteri notu kaydedildi.`);
            }
        });
    }

    // Sending message via active unified inbox stream
    const inboxActiveSendBtn = document.getElementById('inboxActiveSendBtn');
    const inboxActiveResponseInput = document.getElementById('inboxActiveResponseInput');

    function sendActiveInboxMessage() {
        if (!inboxActiveResponseInput) return;
        const text = inboxActiveResponseInput.value.trim();
        if (!text) return;

        const chat = inboxChatsData[activeInboxChatKey];
        if (!chat) return;

        // Push sent message
        chat.messages.push({ text: text, isSender: true });
        inboxActiveResponseInput.value = '';
        
        renderConsolidatedInboxList();
        renderActiveInboxChat();
        showToast("Mesajınız gönderildi.");

        // Simulate customer response latency after 1.5 seconds
        setTimeout(() => {
            chat.messages.push({ text: chat.replyPreset, isSender: false });
            renderConsolidatedInboxList();
            renderActiveInboxChat();
            showToast(`${activeInboxChatKey} yeni bir mesaj gönderdi!`);
        }, 1500);
    }

    if (inboxActiveSendBtn) inboxActiveSendBtn.addEventListener('click', sendActiveInboxMessage);
    if (inboxActiveResponseInput) {
        inboxActiveResponseInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendActiveInboxMessage();
        });
    }

    // 7. biAjans Yapay Zeka (AI) Yanıt Asistanı 🪄
    const inboxAiAssistBtn = document.getElementById('inboxAiAssistBtn');
    const inboxAiSpinner = document.getElementById('inboxAiSpinner');

    if (inboxAiAssistBtn) {
        inboxAiAssistBtn.addEventListener('click', () => {
            const chat = inboxChatsData[activeInboxChatKey];
            if (!chat) return;

            inboxAiAssistBtn.disabled = true;
            if (inboxAiSpinner) inboxAiSpinner.classList.remove('hidden');

            setTimeout(() => {
                inboxAiAssistBtn.disabled = false;
                if (inboxAiSpinner) inboxAiSpinner.classList.add('hidden');

                const lastCustMessage = chat.messages.filter(m => !m.isSender).slice(-1)[0]?.text || '';
                const brandName = document.getElementById('settingsBrandTitle') ? document.getElementById('settingsBrandTitle').textContent : 'Boş marka';
                const styleText = window.aiInstructions && window.aiInstructions.writingStyle ? window.aiInstructions.writingStyle : '';

                // Build a gorgeous contextual generative reply in Turkish!
                let aiResponse = "";
                const isFriendlyStyle = styleText.toLowerCase().includes('samimi') || styleText.toLowerCase().includes('emoji');

                if (chat.platform === 'instagram' || lastCustMessage.includes('ezme')) {
                    if (isFriendlyStyle) {
                        aiResponse = `Selam Melis Hanım! 🥜 Taze kavrulmuş yer fıstıklarımızdan elde ettiğimiz ezmeniz bu sabah yola çıktı! Aras Kargo takip numaranız birazdan telefonunuza SMS olarak düşecektir. Şimdiden afiyet bal olsun! Lansman fırsatımızı tercih ettiğiniz için çok teşekkürler! 🌟🥜`;
                    } else {
                        aiResponse = `Merhaba Melis Hanım. Lansman özel kampanyamızdan verdiğiniz fıstık ezmesi siparişiniz bu sabah Aras Kargo'ya güvenle teslim edilmiştir. Kargo takip kodunuz sistemde tanımlanmakta olup gün içerisinde tarafınıza kısa mesaj (SMS) olarak iletilecektir. İlginiz için teşekkür eder, sağlıklı günler dileriz.`;
                    }
                } else if (chat.platform === 'youtube' || lastCustMessage.includes('kupon')) {
                    if (isFriendlyStyle) {
                        aiResponse = `Selam Can Bey! ☕️ Kupon kodumuz ilk 100 kişilik stok sınırına takılmış olabilir, hiç dert etmeyin! Size özel tek kullanımlık %15 indirim kodunuz: COFFEE15. Hemen sepetinizde uygulayabilirsiniz. Keyifli demlemeler dileriz!`;
                    } else {
                        aiResponse = `Merhaba Can Bey. Bahsi geçen lansman indirim kuponumuz maalesef ilk 100 siparişte geçerli limitli bir koddur. Ancak markamıza gösterdiğiniz ilgi sebebiyle size özel %15 indirim kuponu tanımlanmıştır. Sipariş sayfasında COFFEE15 kodunu uygulayarak indirimli siparişinizi geçebilirsiniz.`;
                    }
                } else if (chat.platform === 'facebook' || lastCustMessage.includes('öğüt')) {
                    aiResponse = `Merhaba Didem Hanım. Tebrikleriniz için çok teşekkür ederiz. Sipariş aşamasında kahvenizi dilediğiniz demleme yöntemine (Filtre Kahve Makinesi, French Press, V60, Espresso vb.) uygun olarak taptaze öğüterek gönderiyoruz. French Press için kalın öğütüm seçeneğini tercih edebilirsiniz. Şimdiden afiyet olsun!`;
                } else if (chat.platform === 'x' || lastCustMessage.includes('stok')) {
                    aiResponse = `Merhabalar! Etiyopya çekirdeklerimizi bu kadar beğenmenize çok mutlu olduk. Yeni taze kavrum Etiyopya çekirdeklerimiz yarın sabah stoklarda yenilenecektir. Web sitemizden bildirim listesine kaydolduysanız anlık e-posta da alacaksınız. İlginiz için teşekkürler!`;
                } else if (chat.platform === 'whatsapp' || lastCustMessage.includes('kargo') || lastCustMessage.includes('whatsapp')) {
                    if (isFriendlyStyle) {
                        aiResponse = `Selam Zeynep Hanım! 🌸 Evet, WhatsApp Business kataloğumuz üzerinden doğrudan sipariş verebilirsiniz. Lansmana özel 150 TL ve üzeri tüm siparişlerde kargo tamamen ücretsizdir! Ürün kataloğumuzu inceleyip siparişinizi buradan kolayca tamamlayabilirsiniz. 😊📱`;
                    } else {
                        aiResponse = `Merhaba Zeynep Hanım. WhatsApp Business kataloğumuz üzerinden doğrudan sipariş almaktayız. Lansman kampanyamız kapsamında 150 TL ve üzeri tüm siparişlerde kargo ücreti alınmamaktadır. Kataloğumuz üzerinden ürünleri seçip siparişinizi doğrudan buradan oluşturabilirsiniz.`;
                    }
                } else {
                    aiResponse = `Merhaba Esra Hanım. Mesajınız ve kurumsal ortaklık talebiniz için çok teşekkür ederiz. Sosyal medya ajansımıza ait güncel hizmet portfolyomuzu ve markalara özel B2B çalışma teklifimizi mail adresinize ileteceğiz. En kısa sürede ortak bir toplantıda görüşmek üzere.`;
                }

                if (inboxActiveResponseInput) {
                    inboxActiveResponseInput.value = aiResponse;
                    // Pulse input field to draw attention
                    inboxActiveResponseInput.style.borderColor = 'var(--accent)';
                    inboxActiveResponseInput.style.boxShadow = '0 0 0 3px rgba(140, 219, 41, 0.15)';
                    setTimeout(() => {
                        inboxActiveResponseInput.style.borderColor = '';
                        inboxActiveResponseInput.style.boxShadow = '';
                    }, 800);
                }

                showToast("Yapay zeka asistanı mesajın içeriğine ve marka ayarlarına göre harika bir yanıt taslağı hazırladı!");
            }, 800);
        });
    }

    // 8. Auto activate active social inbox if any connection is clicked
    document.querySelectorAll('.conn-card').forEach(card => {
        card.addEventListener('click', () => {
            // Trigger automatic active inbox unlock after connection sequence!
            setTimeout(() => {
                activateSocialInbox();
            }, 1050);
        });
    });

    // 9. Interactive Ads Connect Buttons handlers
    const connectMetaBtn = document.getElementById('btnConnectMetaAds');
    const connectGoogleBtn = document.getElementById('btnConnectGoogleAds');
    const connectTiktokBtn = document.getElementById('btnConnectTiktokAds');

    function bindAdConnection(button, networkName, floatLabelId, successVal) {
        if (!button) return;
        button.addEventListener('click', () => {
            if (button.classList.contains('connected')) {
                showToast(`${networkName} zaten bağlı durumda.`, true);
                return;
            }

            const originalHTML = button.innerHTML;
            button.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Bağlanıyor...';
            button.style.pointerEvents = 'none';

            setTimeout(() => {
                button.innerHTML = '<i class="fa-solid fa-circle-check"></i> Bağlandı';
                button.classList.add('connected');
                button.style.pointerEvents = 'auto';

                // Pulse the count label to represent active stats activation!
                const label = document.getElementById(floatLabelId);
                if (label) {
                    label.textContent = successVal;
                    label.style.transform = 'scale(1.25)';
                    label.style.transition = 'transform 0.3s ease';
                    setTimeout(() => { label.style.transform = 'scale(1)'; }, 300);
                }

                // Sync connection modal cards and sidebars status dynamically!
                updateSidebarPlatformStatus(networkName);
                updateSidebarPlatformStatus(networkName === 'Meta Ads' ? 'Facebook' : (networkName === 'Google Ads' ? 'Google Ads' : 'TikTok Kişisel'));
                updateConnectedBrandStatsCount();

                showToast(`${networkName} reklam hesabınız başarıyla bağlandı ve aktif kampanyalar panele aktarıldı!`);
                activateSocialInbox(); // Connect active social inbox!
            }, 1000);
        });
    }

    bindAdConnection(connectMetaBtn, 'Meta Ads', 'metaAdsCountLabel', '24');
    bindAdConnection(connectGoogleBtn, 'Google Ads', 'googleAdsCountLabel', '23');
    bindAdConnection(connectTiktokBtn, 'TikTok Ads', 'tiktokMockupTags', '8');

    // ----------------------------------------------------
    // METRICOOL YAYIN PLANLAMA & SOSYAL TAKVİM (PLANNING)
    // ----------------------------------------------------

    const planlamaPromoState = document.getElementById('planlamaPromoState');
    const planlamaActiveState = document.getElementById('planlamaActiveState');
    const btnActivatePlanlamaDemo = document.getElementById('btnActivatePlanlamaDemo');
    const btnDeactivatePlanlamaDemo = document.getElementById('btnDeactivatePlanlamaDemo');
    const btnPlanlamaConnectSoc = document.getElementById('btnPlanlamaConnectSoc');
    const btnPlanlamaFooterConnect = document.getElementById('btnPlanlamaFooterConnect');
    const calendarMonthGrid = document.getElementById('calendarMonthGrid');

    // Modal elements
    const schedulePostModal = document.getElementById('schedulePostModal');
    const scheduleModalCloseBtn = document.getElementById('scheduleModalCloseBtn');
    const btnCancelSchedule = document.getElementById('btnCancelSchedule');
    const btnConfirmSchedule = document.getElementById('btnConfirmSchedule');
    const schedulePostText = document.getElementById('schedulePostText');
    const schedulePostDate = document.getElementById('schedulePostDate');
    const schedulePostTime = document.getElementById('schedulePostTime');
    const checkSchedIG = document.getElementById('checkSchedIG');
    const checkSchedFB = document.getElementById('checkSchedFB');
    const checkSchedTT = document.getElementById('checkSchedTT');

    const postDetailModal = document.getElementById('postDetailModal');
    const postDetailCloseBtn = document.getElementById('postDetailCloseBtn');
    const btnCancelEdit = document.getElementById('btnCancelEdit');
    const btnConfirmEdit = document.getElementById('btnConfirmEdit');
    const btnDeleteScheduledPost = document.getElementById('btnDeleteScheduledPost');
    const editPostId = document.getElementById('editPostId');
    const editPostText = document.getElementById('editPostText');
    const editPostDate = document.getElementById('editPostDate');
    const editPostTime = document.getElementById('editPostTime');
    const editPostPlatformBadge = document.getElementById('editPostPlatformBadge');

    let calendarPostsData = [
        {
            id: 'mock1',
            date: '2026-05-12',
            time: '18:00',
            platform: 'instagram',
            text: 'Taptaze yer fıstığı ezmesi lansmanımıza özel sürpriz indirim fırsatı Instagram hikayelerinde! 🥜🔥'
        },
        {
            id: 'mock2',
            date: '2026-05-13',
            time: '13:00',
            platform: 'facebook',
            text: 'İlk 100 siparişe özel tanımladığımız sepette geçerli %15 indirim kuponlarını kaçırmayın!'
        },
        {
            id: 'mock3',
            date: '2026-05-13',
            time: '15:00',
            platform: 'tiktok',
            text: 'Gurme baristamızın elinden Etiyopya taze demleme kahve sanatı videosu! ☕️✨ #aesthetic #coffee'
        },
        {
            id: 'mock4',
            date: '2026-05-14',
            time: '09:00',
            platform: 'youtube',
            text: 'Evde profesyonel kahve demleme teknikleri ve taze kavrum çekirdek seçimi rehberimiz YouTube kanalımızda yayında.'
        },
        {
            id: 'mock5',
            date: '2026-05-20',
            time: '12:00',
            platform: 'instagram',
            text: 'VIP kulübümüze özel gurme filtre kahve tadım setleri ön satışta. Detaylar link in bio\'da!'
        },
        {
            id: 'mock6',
            date: '2026-05-26', // Bugün
            time: '10:00',
            platform: 'linkedin',
            text: 'Sosyal medya yönetim paneli biAjans AI Entegrasyonu ile artık yayında! Markaların kurumsal gücünü katlıyoruz. 🚀'
        }
    ];

    function activatePlanlama() {
        if (planlamaPromoState && planlamaActiveState) {
            planlamaPromoState.classList.add('hidden');
            planlamaActiveState.classList.remove('hidden');
            renderSocialCalendar();
        }
    }

    function deactivatePlanlama() {
        if (planlamaPromoState && planlamaActiveState) {
            planlamaActiveState.classList.add('hidden');
            planlamaPromoState.classList.remove('hidden');
        }
    }

    if (btnActivatePlanlamaDemo) btnActivatePlanlamaDemo.addEventListener('click', activatePlanlama);
    if (btnDeactivatePlanlamaDemo) btnDeactivatePlanlamaDemo.addEventListener('click', deactivatePlanlama);

    function triggerPlatformConnectionPlanner() {
        if (connectionsModal) connectionsModal.classList.remove('hidden');
        setTimeout(() => {
            activatePlanlama();
        }, 1200);
    }

    if (btnPlanlamaConnectSoc) btnPlanlamaConnectSoc.addEventListener('click', triggerPlatformConnectionPlanner);
    if (btnPlanlamaFooterConnect) btnPlanlamaFooterConnect.addEventListener('click', triggerPlatformConnectionPlanner);

    // Auto activate calendar if any connection is clicked (extends previous handlers)
    document.querySelectorAll('.conn-card').forEach(card => {
        card.addEventListener('click', () => {
            setTimeout(() => {
                activatePlanlama();
            }, 1050);
        });
    });

    // Render Calendar Monthly Grid (April 27 to May 31, 2026 - Exactly 35 Cells)
    function renderSocialCalendar() {
        if (!calendarMonthGrid) return;
        calendarMonthGrid.innerHTML = '';

        // May 2026 grid setup. 35 cells.
        // Cell 0-3: April 27, 28, 29, 30 (inactive)
        // Cell 4-34: May 1 to May 31 (active)
        for (let i = 0; i < 35; i++) {
            let dayNum, cellDate, isInactive = false;
            
            if (i < 4) {
                dayNum = 27 + i;
                cellDate = `2026-04-${dayNum}`;
                isInactive = true;
            } else {
                let mDay = i - 3;
                dayNum = mDay;
                let dayStr = mDay < 10 ? `0${mDay}` : `${mDay}`;
                cellDate = `2026-05-${dayStr}`;
            }

            const cell = document.createElement('div');
            cell.className = `calendar-day-cell ${isInactive ? 'inactive' : ''} ${cellDate === '2026-05-26' ? 'today' : ''}`;
            cell.setAttribute('data-date', cellDate);

            // Add day number
            const numberLabel = document.createElement('div');
            numberLabel.className = 'calendar-day-number';
            numberLabel.textContent = dayNum;
            cell.appendChild(numberLabel);

            // Render matching posts inside this day cell
            const dayPosts = calendarPostsData.filter(p => p.date === cellDate);
            dayPosts.forEach(post => {
                const pill = document.createElement('a');
                pill.href = '#';
                
                let platClass = 'ig';
                let iconClass = 'instagram';
                if (post.platform === 'facebook') { platClass = 'fb'; iconClass = 'facebook-f'; }
                if (post.platform === 'tiktok') { platClass = 'tt'; iconClass = 'tiktok'; }
                if (post.platform === 'youtube') { platClass = 'yt'; iconClass = 'youtube'; }
                if (post.platform === 'linkedin') { platClass = 'li'; iconClass = 'linkedin-in'; }

                pill.className = `calendar-post-pill ${platClass}`;
                pill.innerHTML = `<i class="fa-brands fa-${iconClass}"></i> ${post.text}`;
                
                pill.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openPostDetailModal(post);
                });

                cell.appendChild(pill);
            });

            // Click cell to schedule new post (if not inactive)
            if (!isInactive) {
                cell.addEventListener('click', () => {
                    openSchedulePostModal(cellDate);
                });
            }

            calendarMonthGrid.appendChild(cell);
        }
    }

    // Modal helper functions
    function openSchedulePostModal(date) {
        if (!schedulePostModal) return;
        if (schedulePostDate) schedulePostDate.value = date;
        if (schedulePostText) schedulePostText.value = '';
        schedulePostModal.classList.remove('hidden');
    }

    function closeSchedulePostModal() {
        if (schedulePostModal) schedulePostModal.classList.add('hidden');
    }

    if (scheduleModalCloseBtn) scheduleModalCloseBtn.addEventListener('click', closeSchedulePostModal);
    if (btnCancelSchedule) btnCancelSchedule.addEventListener('click', closeSchedulePostModal);

    if (btnConfirmSchedule) {
        btnConfirmSchedule.addEventListener('click', () => {
            const text = schedulePostText.value.trim();
            const date = schedulePostDate.value;
            const time = schedulePostTime.value;
            
            if (!text) {
                showToast("Gönderi içeriği boş olamaz!", true);
                return;
            }
            if (!date) {
                showToast("Lütfen bir tarih seçin!", true);
                return;
            }

            // Read target platforms checked
            const selectedPlats = [];
            if (checkSchedIG && checkSchedIG.checked) selectedPlats.push('instagram');
            if (checkSchedFB && checkSchedFB.checked) selectedPlats.push('facebook');
            if (checkSchedTT && checkSchedTT.checked) selectedPlats.push('tiktok');

            if (selectedPlats.length === 0) {
                showToast("Lütfen en az bir platform seçin!", true);
                return;
            }

            // Schedule for each selected platform
            selectedPlats.forEach(plat => {
                calendarPostsData.push({
                    id: 'post_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                    date: date,
                    time: time,
                    platform: plat,
                    text: text
                });
            });

            closeSchedulePostModal();
            renderSocialCalendar();
            showToast("Sosyal medya gönderiniz yayın takvimine planlandı!");
        });
    }

    // Edit Modal helpers
    function openPostDetailModal(post) {
        if (!postDetailModal) return;
        if (editPostId) editPostId.value = post.id;
        if (editPostText) editPostText.value = post.text;
        if (editPostDate) editPostDate.value = post.date;
        if (editPostTime) editPostTime.value = post.time;

        if (editPostPlatformBadge) {
            let color = '#db2777';
            let icon = 'instagram';
            if (post.platform === 'facebook') { color = '#1877f2'; icon = 'facebook-f'; }
            if (post.platform === 'tiktok') { color = '#000000'; icon = 'tiktok'; }
            if (post.platform === 'youtube') { color = '#ef4444'; icon = 'youtube'; }
            if (post.platform === 'linkedin') { color = '#0077b5'; icon = 'linkedin'; }

            editPostPlatformBadge.innerHTML = `
                <span style="background-color: ${color}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; display: inline-flex; align-items: center; gap: 6px;">
                    <i class="fa-brands fa-${icon}"></i> ${post.platform.toUpperCase()}
                </span>
            `;
        }

        postDetailModal.classList.remove('hidden');
    }

    function closePostDetailModal() {
        if (postDetailModal) postDetailModal.classList.add('hidden');
    }

    if (postDetailCloseBtn) postDetailCloseBtn.addEventListener('click', closePostDetailModal);
    if (btnCancelEdit) btnCancelEdit.addEventListener('click', closePostDetailModal);

    if (btnConfirmEdit) {
        btnConfirmEdit.addEventListener('click', () => {
            const id = editPostId.value;
            const text = editPostText.value.trim();
            const date = editPostDate.value;
            const time = editPostTime.value;

            if (!text) {
                showToast("Gönderi içeriği boş olamaz!", true);
                return;
            }

            const post = calendarPostsData.find(p => p.id === id);
            if (post) {
                post.text = text;
                post.date = date;
                post.time = time;
                closePostDetailModal();
                renderSocialCalendar();
                showToast("Gönderi detayları başarıyla güncellendi.");
            }
        });
    }

    if (btnDeleteScheduledPost) {
        btnDeleteScheduledPost.addEventListener('click', () => {
            const id = editPostId.value;
            calendarPostsData = calendarPostsData.filter(p => p.id !== id);
            closePostDetailModal();
            renderSocialCalendar();
            showToast("Planlanmış gönderi takvimden kaldırıldı.", true);
        });
    }

    // AI Composer auto-scheduling integration
    window.scheduleAiGeneratedCampaign = function(data) {
        if (!data) return;

        // Clean existing AI scheduled mock posts to avoid duplicate spamming
        calendarPostsData = calendarPostsData.filter(p => !p.id.startsWith('ai_'));

        // Schedule IG post (Today at 18:00)
        if (data.instagram_caption) {
            calendarPostsData.push({
                id: 'ai_ig',
                date: '2026-05-26', // Bugün
                time: '18:00',
                platform: 'instagram',
                text: data.instagram_caption
            });
        }

        // Schedule FB post (Tomorrow at 13:00)
        if (data.facebook_post) {
            calendarPostsData.push({
                id: 'ai_fb',
                date: '2026-05-27', // Yarın
                time: '13:00',
                platform: 'facebook',
                text: data.facebook_post
            });
        }

        // Schedule YT post (Day after tomorrow at 09:00)
        if (data.youtube && data.youtube.video_title) {
            calendarPostsData.push({
                id: 'ai_yt',
                date: '2026-05-28', // Ertesi gün
                time: '09:00',
                platform: 'youtube',
                text: `[YOUTUBE KAMPANYASI] Başlık: ${data.youtube.video_title} - Açıklama: ${data.youtube.video_description}`
            });
        }

        // Sync and switch display
        activatePlanlama();
        showToast("Kampanya içerikleriniz Yayın Takvimine otomatik olarak planlandı! 📅✨");
    };

    // ----------------------------------------------------
    // METRICOOL HASHTAG TAKİPÇİSİ (HASHTAG TRACKER)
    // ----------------------------------------------------

    const hashtagSessionInput = document.getElementById('hashtagSessionInput');
    const btnNetXSess = document.getElementById('btnNetXSess');
    const btnNetIGSess = document.getElementById('btnNetIGSess');
    const hashtagSessionStart = document.getElementById('hashtagSessionStart');
    const hashtagSessionDuration = document.getElementById('hashtagSessionDuration');
    const btnCreateHashtagSession = document.getElementById('btnCreateHashtagSession');
    
    const hashtagBalanceLabel = document.getElementById('hashtagBalanceLabel');
    const btnPurchaseTrackerDays = document.getElementById('btnPurchaseTrackerDays');
    
    const hashtagSearchInput = document.getElementById('hashtagSearchInput');
    const hashtagSessionTableBody = document.getElementById('hashtagSessionTableBody');

    let hashtagTrackerBalance = 0;
    let selectedSessNetX = true;
    let selectedSessNetIG = false;

    let hashtagSessions = [
        {
            id: 'sess1',
            hashtag: '#SMMW20',
            networks: ['x'],
            created: '4 Mart 2020, 09:27',
            start: '28 Mart 2020, 11:00',
            duration: 8,
            status: 'completed',
            xPosts: '21.6K',
            igPosts: '0'
        },
        {
            id: 'sess2',
            hashtag: '#inbound19',
            networks: ['x', 'instagram'],
            created: '4 Eylül 2019, 09:17',
            start: '4 Eylül 2019, 01:00',
            duration: 3,
            status: 'completed',
            xPosts: '19.5K',
            igPosts: '3.14K'
        },
        {
            id: 'sess3',
            hashtag: '#SMMW19',
            networks: ['x', 'instagram'],
            created: '20 Mart 2019, 11:33',
            start: '20 Mart 2019, 07:00',
            duration: 4,
            status: 'completed',
            xPosts: '75.8K',
            igPosts: '5.54K'
        },
        {
            id: 'sess4',
            hashtag: '#GPIS18',
            networks: ['x'],
            created: '4 Eylül 2018, 15:20',
            start: '4 Eylül 2018, 01:00',
            duration: 4,
            status: 'completed',
            xPosts: '31.3K',
            igPosts: '0'
        },
        {
            id: 'sess5',
            hashtag: '#CannesAslanları',
            networks: ['x'],
            created: '18 Haziran 2018, 16:34',
            start: '18 Haziran 2018, 01:00',
            duration: 5,
            status: 'completed',
            xPosts: '9.4K',
            igPosts: '0'
        }
    ];

    // Toggle target platforms styling
    if (btnNetXSess) {
        btnNetXSess.addEventListener('click', () => {
            selectedSessNetX = !selectedSessNetX;
            if (selectedSessNetX) {
                btnNetXSess.style.cssText = 'flex: 1; padding: 6px; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer; border: 1.5px solid var(--accent); background-color: #fefcf0;';
            } else {
                btnNetXSess.style.cssText = 'flex: 1; padding: 6px; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer; border: 1px solid var(--card-border); background-color: #ffffff;';
            }
        });
    }

    if (btnNetIGSess) {
        btnNetIGSess.addEventListener('click', () => {
            selectedSessNetIG = !selectedSessNetIG;
            if (selectedSessNetIG) {
                btnNetIGSess.style.cssText = 'flex: 1; padding: 6px; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer; border: 1.5px solid var(--accent); background-color: #fefcf0;';
            } else {
                btnNetIGSess.style.cssText = 'flex: 1; padding: 6px; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer; border: 1px solid var(--card-border); background-color: #ffffff;';
            }
        });
    }

    // Purchase day credits simulator
    if (btnPurchaseTrackerDays) {
        btnPurchaseTrackerDays.addEventListener('click', () => {
            hashtagTrackerBalance += 5;
            if (hashtagBalanceLabel) {
                hashtagBalanceLabel.textContent = `Bakiyeniz: ${hashtagTrackerBalance} gün`;
                hashtagBalanceLabel.style.color = '#b45309';
            }
            showToast("5 gün takip kredisi bakiyenize başarıyla tanımlandı! 💰");
        });
    }

    // Render historical list matching screenshot
    function renderHashtagSessions() {
        if (!hashtagSessionTableBody) return;
        hashtagSessionTableBody.innerHTML = '';

        const query = hashtagSearchInput ? hashtagSearchInput.value.trim().toLowerCase() : '';

        hashtagSessions.forEach(sess => {
            if (query && !sess.hashtag.toLowerCase().includes(query)) return;

            const row = document.createElement('tr');
            row.className = 'hashtag-table-row';
            row.style.borderBottom = '1px solid var(--card-border)';
            
            // Build network icons markup
            let netIcons = '';
            if (sess.networks.includes('x')) netIcons += '<i class="fa-brands fa-x-twitter" style="margin-left: 4px; color: #000;"></i>';
            if (sess.networks.includes('instagram')) netIcons += '<i class="fa-brands fa-instagram" style="margin-left: 4px; color: #db2777;"></i>';

            // Durum badge
            let statusTag = '';
            if (sess.status === 'completed') {
                statusTag = '<span class="tag-completed">Tamamlandı</span>';
            } else {
                statusTag = '<span class="tag-active-tracking"><i class="fa-solid fa-spinner fa-spin" style="margin-right: 3.5px;"></i> İzleniyor</span>';
            }

            row.innerHTML = `
                <td style="padding: 12px 8px; font-weight: 700; color: var(--text-primary);">
                    ${sess.hashtag} ${netIcons}
                </td>
                <td style="padding: 12px 8px; color: var(--text-secondary);">${sess.created}</td>
                <td style="padding: 12px 8px; color: var(--text-secondary);">${sess.start}</td>
                <td style="padding: 12px 8px; text-align: center; font-weight: bold; color: var(--text-primary);">${sess.duration}</td>
                <td style="padding: 12px 8px;">${statusTag}</td>
                <td style="padding: 12px 8px; text-align: right; font-weight: bold; color: var(--text-primary);">${sess.xPosts}</td>
                <td style="padding: 12px 8px; text-align: right; font-weight: bold; color: var(--text-primary);">${sess.igPosts}</td>
                <td style="padding: 12px 8px; text-align: center; display: flex; gap: 4px; justify-content: center; align-items: center; min-height: 44px;">
                    <button class="hashtag-action-btn" title="Gerçek Zamanlı Monitör" disabled style="opacity: 0.4;"><i class="fa-solid fa-clock-rotate-left"></i></button>
                    <button class="hashtag-action-btn" title="Analitik Panel"><i class="fa-solid fa-chart-pie"></i></button>
                    <button class="hashtag-action-btn delete" title="Verileri Sil"><i class="fa-solid fa-trash-can"></i></button>
                </td>
            `;

            // Action delete row
            const deleteBtn = row.querySelector('.hashtag-action-btn.delete');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => {
                    // Soft fade transition
                    row.style.opacity = '0.3';
                    row.style.transform = 'scale(0.98)';
                    row.style.transition = 'all 0.3s ease';
                    
                    setTimeout(() => {
                        hashtagSessions = hashtagSessions.filter(s => s.id !== sess.id);
                        renderHashtagSessions();
                        showToast(`"${sess.hashtag}" takip oturumu ve tüm verileri kalıcı olarak silindi.`, true);
                    }, 300);
                });
            }

            // Action analytics details
            const analyticBtn = row.querySelector('.hashtag-action-btn:not([disabled])');
            if (analyticBtn) {
                analyticBtn.addEventListener('click', () => {
                    showToast(`"${sess.hashtag}" hashtag analitik verileri başarıyla yüklendi! 📈`);
                    showView('analitikSection', 'navAnalitik'); // Toggles automatically to analytics screen!
                });
            }

            hashtagSessionTableBody.appendChild(row);
        });
    }

    // Create dynamic tracking session
    if (btnCreateHashtagSession) {
        btnCreateHashtagSession.addEventListener('click', () => {
            const hashtagVal = hashtagSessionInput.value.trim();
            const startVal = hashtagSessionStart.value.trim();
            const durationVal = parseInt(hashtagSessionDuration.value);

            if (!hashtagVal) {
                showToast("Lütfen izlenecek ilişik etiketi (hashtag) girin!", true);
                return;
            }

            if (!hashtagVal.startsWith('#')) {
                showToast("Etiket formatı geçersiz, hashtag simgesi (#) içermelidir!", true);
                return;
            }

            if (!selectedSessNetX && !selectedSessNetIG) {
                showToast("Lütfen izlenecek en az bir sosyal ağ seçin!", true);
                return;
            }

            // Balance check
            if (hashtagTrackerBalance < durationVal) {
                showToast("Oturum oluşturmak için bakiyeniz yetersiz. Lütfen kredi gün satın alın! 💰", true);
                return;
            }

            // Deduct from balance
            hashtagTrackerBalance -= durationVal;
            if (hashtagBalanceLabel) {
                hashtagBalanceLabel.textContent = `Bakiyeniz: ${hashtagTrackerBalance} gün`;
            }

            // Setup networks
            const nets = [];
            if (selectedSessNetX) nets.push('x');
            if (selectedSessNetIG) nets.push('instagram');

            // Format date-time
            const now = new Date();
            const monthNames = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
            const timeStr = `${now.getHours() < 10 ? '0' + now.getHours() : now.getHours()}:${now.getMinutes() < 10 ? '0' + now.getMinutes() : now.getMinutes()}`;
            const createdStr = `${now.getDate()} ${monthNames[now.getMonth()]} ${now.getFullYear()}, ${timeStr}`;

            const newSess = {
                id: 'sess_' + Date.now(),
                hashtag: hashtagVal,
                networks: nets,
                created: createdStr,
                start: startVal,
                duration: durationVal,
                status: 'tracking',
                xPosts: selectedSessNetX ? '12' : '0',
                igPosts: selectedSessNetIG ? '6' : '0'
            };

            hashtagSessions.unshift(newSess);
            renderHashtagSessions();
            hashtagSessionInput.value = '';
            showToast(`"${hashtagVal}" hashtag takip oturumu başarıyla oluşturuldu ve anlık izleme başlatıldı! 🚀`);

            // Simulate growing posts counts after 5 seconds to represent active tracking session!
            setTimeout(() => {
                const found = hashtagSessions.find(s => s.id === newSess.id);
                if (found) {
                    if (selectedSessNetX) found.xPosts = '124';
                    if (selectedSessNetIG) found.igPosts = '84';
                    renderHashtagSessions();
                    showToast(`"${hashtagVal}" oturumunda yeni gönderiler izlendi! 📈`);
                }
            }, 5000);
        });
    }

    // Wire up search input dynamically
    if (hashtagSearchInput) {
        hashtagSearchInput.addEventListener('input', renderHashtagSessions);
    }

    // Collapsible Submenus Navigation Trigger
    document.querySelectorAll('.submenu-item').forEach(subItem => {
        subItem.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation(); // Prevent toggling the parent collapse state
            
            const action = subItem.getAttribute('data-action');
            const platform = subItem.getAttribute('data-platform');
            
            // Remove active state from other submenu items
            document.querySelectorAll('.submenu-item').forEach(i => i.classList.remove('active'));
            subItem.classList.add('active');
            
            if (action === 'analitik') {
                // Switch to Analytics view
                showView('analitikSection', 'navAnalitik');
                
                // Emulate pre-filtering values to Instagram, Facebook, etc.
                const igVal = document.getElementById('igFollowersVal');
                const fbVal = document.getElementById('fbLikesVal');
                const ytVal = document.getElementById('ytSubsVal');
                
                if (platform === 'Instagram' && igVal) {
                    showToast(`Instagram analitik grafikleri yüklendi! Takipçi: ${igVal.textContent} 📊`);
                } else if (platform === 'Facebook' && fbVal) {
                    showToast(`Facebook analitik grafikleri yüklendi! Beğeni: ${fbVal.textContent} 📊`);
                } else if (platform === 'YouTube' && ytVal) {
                    showToast(`YouTube analitik grafikleri yüklendi! Abone: ${ytVal.textContent} 📊`);
                } else {
                    showToast(`${platform} detaylı analitik grafikleri yüklendi! 📊`);
                }
            } 
            else if (action === 'gelen-kutusu') {
                // Switch to Inbox
                showView('gelenKutusuSection', 'navGelenKutusu');
                // Activate the social inbox automatically if it's in landing state
                activateSocialInbox();
                
                // Filter the messages dynamically by triggering the click on the platform filter button!
                const filterBtn = document.querySelector(`.inbox-filter-btn[data-inbox-filter="${platform.toLowerCase()}"]`);
                if (filterBtn) {
                    filterBtn.click();
                    showToast(`${platform} birleşik gelen kutusu başarıyla filtrelendi! ✉️`);
                } else {
                    showToast(`${platform} birleşik gelen kutusu yüklendi! ✉️`);
                }
            } 
            else if (action === 'planlama') {
                // Switch to Planlama (Main Composer Dashboard)
                showView(null, 'ozetBtn');
                
                // Pre-select/Check the target platform channel check pill in the composer
                document.querySelectorAll('.channel-check-pill').forEach(pill => {
                    const pillText = pill.textContent.trim().toLowerCase();
                    const targetText = platform.toLowerCase();
                    const checkbox = pill.querySelector('input[type="checkbox"]');
                    if (pillText.includes(targetText) && checkbox) {
                        checkbox.checked = true;
                        pill.classList.add('checked');
                    }
                });
                
                showToast(`${platform} çok kanallı planlayıcıda seçildi! 📅`);
            }
            else if (action === 'reklamlar') {
                // Switch to Ads section
                showView('reklamlarSection', 'navReklamlar');
                
                const targetCardId = platform === 'Meta Ads' ? 'cardMetaAds' : (platform === 'Google Ads' ? 'cardGoogleAds' : 'cardTiktokAds');
                const targetCard = document.getElementById(targetCardId);
                if (targetCard) {
                    setTimeout(() => {
                        targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        // Add temporary highlight glow effect
                        targetCard.style.outline = '2px solid #6366f1';
                        targetCard.style.boxShadow = '0 0 20px rgba(99, 102, 241, 0.4)';
                        targetCard.style.transition = 'all 0.5s ease';
                        setTimeout(() => {
                            targetCard.style.outline = '';
                            targetCard.style.boxShadow = '';
                        }, 2000);
                    }, 300);
                }
                showToast(`${platform} reklam detayları yüklendi! 📊`);
            }
        });
    });

    // ==========================================
    // SANDWICH MENU DROPDOWN CONTROLLERS
    // ==========================================
    const sandwichMenuBtn = document.getElementById('sandwichMenuBtn');
    const sandwichDropdown = document.getElementById('sandwichDropdown');
    
    if (sandwichMenuBtn && sandwichDropdown) {
        // Toggle dropdown open/close
        sandwichMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            sandwichDropdown.classList.toggle('hidden');
        });
        
        // Hide dropdown when clicking anywhere else
        document.addEventListener('click', (e) => {
            if (!sandwichDropdown.contains(e.target) && e.target !== sandwichMenuBtn && !sandwichMenuBtn.contains(e.target)) {
                sandwichDropdown.classList.add('hidden');
            }
        });
        
        // Add Brand click
        const sandAddBrand = document.getElementById('sandAddBrand');
        if (sandAddBrand) {
            sandAddBrand.addEventListener('click', () => {
                showToast("Yeni marka ekleme sihirbazı başlatıldı! 🏢");
                sandwichDropdown.classList.add('hidden');
            });
        }
        
        // Connections click (opens connectionsModal)
        const sandConnections = document.getElementById('sandConnections');
        if (sandConnections) {
            sandConnections.addEventListener('click', () => {
                if (connectionsModal) connectionsModal.classList.remove('hidden');
                sandwichDropdown.classList.add('hidden');
            });
        }
        
        // Brand Settings click (switches to Brand Settings Section)
        const sandBrandSettings = document.getElementById('sandBrandSettings');
        if (sandBrandSettings) {
            sandBrandSettings.addEventListener('click', () => {
                showView('brandSettingsSection', 'markaAyarlariSideBtn');
                sandwichDropdown.classList.add('hidden');
            });
        }
        
        // User management click
        const sandUserMgmt = document.getElementById('sandUserMgmt');
        if (sandUserMgmt) {
            sandUserMgmt.addEventListener('click', () => {
                showToast("Kullanıcı Yönetimi: Ekip yönetimi paneli Premium planlarda aktiftir. 👥");
                sandwichDropdown.classList.add('hidden');
            });
        }
        
        // Plans & Billing click (opens premiumUpgradeModal)
        const sandPlansBilling = document.getElementById('sandPlansBilling');
        if (sandPlansBilling) {
            sandPlansBilling.addEventListener('click', () => {
                /* unlocked */
                sandwichDropdown.classList.add('hidden');
            });
        }
        
        // My Tasks click
        const sandMyTasks = document.getElementById('sandMyTasks');
        if (sandMyTasks) {
            sandMyTasks.addEventListener('click', () => {
                showToast("Görevlerim: Sosyal medya görevleriniz ve onay süreçleriniz yüklendi. 📝");
                sandwichDropdown.classList.add('hidden');
            });
        }
        
        // Language change click
        const sandLanguage = document.getElementById('sandLanguage');
        if (sandLanguage) {
            sandLanguage.addEventListener('click', () => {
                showToast("Dil tercihi başarıyla Türkçe (TR) olarak seçildi. 🌐");
                sandwichDropdown.classList.add('hidden');
            });
        }
        
        // Account Settings click (switches to Account Settings Section)
        const sandAccountSettings = document.getElementById('sandAccountSettings');
        if (sandAccountSettings) {
            sandAccountSettings.addEventListener('click', () => {
                showView('settingsSection', 'hesapAyarlariSideBtn');
                sandwichDropdown.classList.add('hidden');
                showToast("Hesap Ayarları yüklendi. ⚙️");
            });
        }
        
        // Help Center click
        const sandHelpCenter = document.getElementById('sandHelpCenter');
        if (sandHelpCenter) {
            sandHelpCenter.addEventListener('click', () => {
                showToast("Yardım Merkezi: Canlı destek ve bilgi tabanına bağlanılıyor... ℹ️");
                sandwichDropdown.classList.add('hidden');
            });
        }
        
        // What's New click
        const sandWhatsNew = document.getElementById('sandWhatsNew');
        if (sandWhatsNew) {
            sandWhatsNew.addEventListener('click', () => {
                showToast("Yenilikler: Son güncellemede eklenen yapay zeka asistanı aktif edildi! 📣");
                sandwichDropdown.classList.add('hidden');
            });
        }
        
        // Affiliation click
        const sandAffiliation = document.getElementById('sandAffiliation');
        if (sandAffiliation) {
            sandAffiliation.addEventListener('click', () => {
                showToast("Ortaklık Programı: Davet bağlantınız başarıyla kopyalandı! 🤝");
                sandwichDropdown.classList.add('hidden');
            });
        }
        
        // Logout click
        const sandLogout = document.getElementById('sandLogout');
        if (sandLogout) {
            sandLogout.addEventListener('click', () => {
                showToast("Güvenli çıkış yapılıyor... biAjans'ı tercih ettiğiniz için teşekkür ederiz! 👋");
                sandwichDropdown.classList.add('hidden');
                setTimeout(() => {
                    location.reload();
                }, 1200);
            });
        }
        
        // Legal Terms click
        const sandLegal = document.getElementById('sandLegal');
        if (sandLegal) {
            sandLegal.addEventListener('click', () => {
                showToast("Kullanım Şartları ve Gizlilik Politikası görüntülendi. 📄");
                sandwichDropdown.classList.add('hidden');
            });
        }
    }

    // ==========================================
    // NEW SETTINGS INTERACTION LISTENERS
    // ==========================================
    
    // Save Preferences click
    const btnSavePreferences = document.getElementById('btnSavePreferences');
    if (btnSavePreferences) {
        btnSavePreferences.addEventListener('click', () => {
            showToast("Hesap tercihleri ve aylık özet ayarları başarıyla kaydedildi! 💾");
        });
    }
    
    // Delete Account click
    const btnDeleteAccount = document.getElementById('btnDeleteAccount');
    if (btnDeleteAccount) {
        btnDeleteAccount.addEventListener('click', () => {
            const conf = confirm("Hesabınızı kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.");
            if (conf) {
                showToast("Hesap silme talebi alındı. biAjans'ı kullandığınız için teşekkür ederiz! 😞", true);
            }
        });
    }
    
    // Save Access click
    const btnSaveAccess = document.getElementById('btnSaveAccess');
    if (btnSaveAccess) {
        btnSaveAccess.addEventListener('click', () => {
            showToast("Erişim bilgileri ve şifre başarıyla güncellendi! 🔐");
        });
    }
    
    // Enable Two-Factor click
    const btnEnableTwoFactor = document.getElementById('btnEnableTwoFactor');
    if (btnEnableTwoFactor) {
        btnEnableTwoFactor.addEventListener('click', () => {
            showToast("2FA İki Faktörlü Kimlik Doğrulama kurulum ekranı açıldı! 📱");
        });
    }
    
    // Promo Upgrade Plan click
    const btnPromoUpgradePlan = document.getElementById('btnPromoUpgradePlan');
    if (btnPromoUpgradePlan) {
        btnPromoUpgradePlan.addEventListener('click', () => {
            /* unlocked */
            showToast("Yıllık plan teklifi detayları yüklendi! 🎁");
        });
    }
    
    // Save Billing click
    const btnSaveBilling = document.getElementById('btnSaveBilling');
    if (btnSaveBilling) {
        btnSaveBilling.addEventListener('click', () => {
            showToast("Fatura şirket ve vergi bilgileri başarıyla kaydedildi! 🧾");
        });
    }
    
    // Upgrade plans from API tab click
    const btnUpgradePlansAPI = document.getElementById('btnUpgradePlansAPI');
    if (btnUpgradePlansAPI) {
        btnUpgradePlansAPI.addEventListener('click', () => {
            /* unlocked */
            showToast("REST API erişimi için planınızı yükseltin! ⚡");
        });
    }

    // ==========================================
    // STARTUP: OAuth Callback URL param handler
    // ==========================================
    (function handleOAuthCallback() {
        const params = new URLSearchParams(window.location.search);
        const connectedPlatform = params.get('connected');
        const status = params.get('status');
        const reason = params.get('reason');

        if (!connectedPlatform) return;

        // URL'i temizle (history.replaceState ile paramları gizle)
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);

        const platformLabel = connectedPlatform.charAt(0).toUpperCase() + connectedPlatform.slice(1);

        if (status === 'success') {
            showToast(`✅ ${platformLabel} başarıyla bağlandı! Veriler senkronize ediliyor...`);
            // Bağlantı durumlarını yenile
            setTimeout(() => syncConnectionStatus(), 800);
        } else {
            const errMsg = reason ? decodeURIComponent(reason) : 'Bilinmeyen hata';
            showToast(`❌ ${platformLabel} bağlantısı başarısız: ${errMsg}`, true);
        }
    })();

    // ==========================================
    // STARTUP: Gerçek bağlantı durumlarını sunucudan çek
    // ==========================================
    async function syncConnectionStatus() {
        try {
            const res  = await fetch('/api/connections/status');
            const data = await res.json();
            if (!data || !data.connections) return;

            const connections = data.connections;

            // Platform slug → data-network değerleri eşleştirmesi
            const slugToNetworkNames = {
                meta:       ['Facebook', 'Instagram', 'Threads', 'WhatsApp', 'Meta Reklamlar'],
                google:     ['YouTube', 'Google Ads', 'Looker Stüdyosu'],
                linkedin:   ['LinkedIn'],
                x:          ['X'],
                tiktok:     ['TikTok Kişisel', 'TikTok Ads'],
                pinterest:  ['Pinterest'],
                bluesky:    ['Bluesky'],
            };

            Object.entries(connections).forEach(([slug, info]) => {
                if (!info.connected) return;
                const networkNames = slugToNetworkNames[slug] || [];
                networkNames.forEach(name => {
                    document.querySelectorAll(`.conn-card[data-network="${name}"]`).forEach(card => {
                        if (!card.classList.contains('active-connection')) {
                            card.classList.add('active-connection');
                            if (!card.querySelector('.conn-active-badge')) {
                                const badge = document.createElement('span');
                                badge.className = 'conn-active-badge';
                                badge.style.cssText = 'position:absolute;top:-6px;right:-6px;width:18px;height:18px;border-radius:50%;background-color:#10b981;color:#fff;display:flex;align-items:center;justify-content:center;font-size:9px;';
                                badge.innerHTML = '<i class="fa-solid fa-check"></i>';
                                card.style.position = 'relative';
                                card.appendChild(badge);
                            }
                            updateSidebarPlatformStatus(name);
                        }
                    });
                });
            });

            updateConnectedBrandStatsCount();

        } catch (err) {
            // Sessizce geç — sunucu henüz OAuth endpoint'lerini desteklemeyebilir
            console.debug('[biAjans] Bağlantı durumu çekilemedi:', err.message);
        }
    }

    // Sayfa yüklenince bağlantı durumlarını getir
    syncConnectionStatus();

    // Call initial rendering
    renderHashtagSessions();

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

});


    