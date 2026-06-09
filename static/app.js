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
            // Load AI settings from localStorage
            const activeAiProvider = localStorage.getItem('activeAiProvider') || 'default';
            const aiApiKey = localStorage.getItem(activeAiProvider + 'ApiKey') || '';
            const aiModel = localStorage.getItem(activeAiProvider + 'Model') || '';

            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    prompt: prompt,
                    ai_provider: activeAiProvider,
                    ai_api_key: aiApiKey,
                    ai_model: aiModel,
                    // Legacy properties for compatibility
                    use_openrouter: (activeAiProvider === 'openrouter'),
                    openrouter_api_key: localStorage.getItem('openrouterApiKey') || '',
                    openrouter_model: localStorage.getItem('openrouterModel') || ''
                })
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
                    body: JSON.stringify({ platform: platformToPublish, text: textToPublish, media_url: mediaUrl, brand: getCurrentBrandId() })
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
        { btnId: 'ozetBtn', secId: null },
        { btnId: 'navPlanlama', secId: 'planlamaSection' },
        { btnId: 'navAnalitik', secId: 'analitikSection' },
        { btnId: 'navRaporlama', secId: 'raporlamaSection' },
        { btnId: 'sideRaporlama', secId: 'raporlamaSection' },
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
        
        if (targetSecId === 'akilliBaglantilarSection') {
            if (typeof loadSmartLinks === 'function') {
                loadSmartLinks();
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

        // Save AI settings to localStorage
        const activeProvSelect = document.getElementById('aiProviderSelectAccount') || document.getElementById('aiProviderSelectBrand');
        if (activeProvSelect) {
            localStorage.setItem('activeAiProvider', activeProvSelect.value);
        }
        
        const providers = ['openrouter', 'openai', 'anthropic', 'gemini'];
        providers.forEach(p => {
            const keyInput = document.getElementById(p + 'ApiKeyInputAccount') || document.getElementById(p + 'ApiKeyInputBrand');
            const modelSelect = document.getElementById(p + 'ModelSelectAccount') || document.getElementById(p + 'ModelSelectBrand');
            
            if (keyInput) {
                localStorage.setItem(p + 'ApiKey', keyInput.value.trim());
            }
            if (modelSelect) {
                localStorage.setItem(p + 'Model', modelSelect.value);
            }
        });

        syncComposerSelect();
        showToast("Yapay zeka talimatları ve API yapılandırması başarıyla kaydedildi!");
    }

    ['saveAiConfigBtn', 'saveAiConfigBtnAccount', 'saveAiConfigBtnBrand'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.addEventListener('click', saveAiConfigHandler);
    });

    // Load AI settings from localStorage on startup
    const openrouterModelSelectComposer = document.getElementById('openrouterModelSelectComposer');
    const savedProvider = localStorage.getItem('activeAiProvider') || 'default';
    
    // Set provider select values
    const provSelect1 = document.getElementById('aiProviderSelectAccount');
    const provSelect2 = document.getElementById('aiProviderSelectBrand');
    if (provSelect1) provSelect1.value = savedProvider;
    if (provSelect2) provSelect2.value = savedProvider;

    // Load API Keys and Models
    const providersList = ['openrouter', 'openai', 'anthropic', 'gemini'];
    const defaultModels = {
        openrouter: 'google/gemma-2-9b-it:free',
        openai: 'gpt-4o-mini',
        anthropic: 'claude-3-5-sonnet-20241022',
        gemini: 'gemini-1.5-flash'
    };

    providersList.forEach(p => {
        const savedKey = localStorage.getItem(p + 'ApiKey') || '';
        const savedModel = localStorage.getItem(p + 'Model') || defaultModels[p];

        const keyInput1 = document.getElementById(p + 'ApiKeyInputAccount');
        const keyInput2 = document.getElementById(p + 'ApiKeyInputBrand');
        if (keyInput1) keyInput1.value = savedKey;
        if (keyInput2) keyInput2.value = savedKey;

        const modelSelect1 = document.getElementById(p + 'ModelSelectAccount');
        const modelSelect2 = document.getElementById(p + 'ModelSelectBrand');
        if (modelSelect1) modelSelect1.value = savedModel;
        if (modelSelect2) modelSelect2.value = savedModel;

        // Sync inputs in real time
        setupInputSync(keyInput1, keyInput2, 'input', 'value');
        setupInputSync(modelSelect1, modelSelect2, 'change', 'value');
    });

    // Sync provider select inputs
    setupInputSync(provSelect1, provSelect2, 'change', 'value');
    if (provSelect1) {
        provSelect1.addEventListener('change', () => {
            updateAiFieldsDisplay(provSelect1.value);
            localStorage.setItem('activeAiProvider', provSelect1.value);
            syncComposerSelect();
        });
    }
    if (provSelect2) {
        provSelect2.addEventListener('change', () => {
            updateAiFieldsDisplay(provSelect2.value);
            localStorage.setItem('activeAiProvider', provSelect2.value);
            syncComposerSelect();
        });
    }

    // Set fields visibility display on startup
    updateAiFieldsDisplay(savedProvider);
    syncComposerSelect();

    // Helper visibility toggler
    function updateAiFieldsDisplay(provider) {
        // Account fields
        document.querySelectorAll('.ai-fields-group-account').forEach(el => el.style.display = 'none');
        if (provider === 'openrouter') {
            const el = document.getElementById('aiFieldsOpenRouterAccount');
            if (el) el.style.display = 'grid';
        } else if (provider === 'openai') {
            const el = document.getElementById('aiFieldsOpenAIAccount');
            if (el) el.style.display = 'grid';
        } else if (provider === 'anthropic') {
            const el = document.getElementById('aiFieldsAnthropicAccount');
            if (el) el.style.display = 'grid';
        } else if (provider === 'gemini') {
            const el = document.getElementById('aiFieldsGeminiAccount');
            if (el) el.style.display = 'grid';
        } else {
            const el = document.getElementById('aiFieldsDefaultAccount');
            if (el) el.style.display = 'block';
        }

        // Brand fields
        document.querySelectorAll('.ai-fields-group-brand').forEach(el => el.style.display = 'none');
        if (provider === 'openrouter') {
            const el = document.getElementById('aiFieldsOpenRouterBrand');
            if (el) el.style.display = 'block';
        } else if (provider === 'openai') {
            const el = document.getElementById('aiFieldsOpenAIBrand');
            if (el) el.style.display = 'block';
        } else if (provider === 'anthropic') {
            const el = document.getElementById('aiFieldsAnthropicBrand');
            if (el) el.style.display = 'block';
        } else if (provider === 'gemini') {
            const el = document.getElementById('aiFieldsGeminiBrand');
            if (el) el.style.display = 'block';
        } else {
            const el = document.getElementById('aiFieldsDefaultBrand');
            if (el) el.style.display = 'block';
        }
    }

    // Real-time synchronization event listeners
    function setupInputSync(el1, el2, eventName, propName) {
        if (!el1 || !el2) return;
        el1.addEventListener(eventName, () => {
            el2[propName] = el1[propName];
        });
        el2.addEventListener(eventName, () => {
            el1[propName] = el2[propName];
        });
    }

    function parseModelValue(val) {
        if (val === 'default') {
            return { provider: 'default', model: 'default' };
        } else if (val.startsWith('openai:')) {
            return { provider: 'openai', model: val.replace('openai:', '') };
        } else if (val.startsWith('anthropic:')) {
            return { provider: 'anthropic', model: val.replace('anthropic:', '') };
        } else if (val.startsWith('gemini:')) {
            return { provider: 'gemini', model: val.replace('gemini:', '') };
        } else {
            return { provider: 'openrouter', model: val };
        }
    }

    function syncComposerSelect() {
        const composer = document.getElementById('openrouterModelSelectComposer');
        if (!composer) return;
        const provider = localStorage.getItem('activeAiProvider') || 'default';
        if (provider === 'default') {
            composer.value = 'default';
        } else {
            const model = localStorage.getItem(provider + 'Model') || defaultModels[provider];
            if (provider === 'openrouter') {
                composer.value = model;
            } else {
                composer.value = provider + ':' + model;
            }
        }
    }

    // Sync Composer selection directly to settings
    if (openrouterModelSelectComposer) {
        openrouterModelSelectComposer.addEventListener('change', () => {
            const val = openrouterModelSelectComposer.value;
            const parsed = parseModelValue(val);
            
            localStorage.setItem('activeAiProvider', parsed.provider);
            if (parsed.provider !== 'default') {
                localStorage.setItem(parsed.provider + 'Model', parsed.model);
            }
            
            // Sync values to settings UI
            const p1 = document.getElementById('aiProviderSelectAccount');
            const p2 = document.getElementById('aiProviderSelectBrand');
            if (p1) p1.value = parsed.provider;
            if (p2) p2.value = parsed.provider;
            
            if (parsed.provider !== 'default') {
                const modelSelect1 = document.getElementById(parsed.provider + 'ModelSelectAccount');
                const modelSelect2 = document.getElementById(parsed.provider + 'ModelSelectBrand');
                if (modelSelect1) modelSelect1.value = parsed.model;
                if (modelSelect2) modelSelect2.value = parsed.model;
            }
            
            updateAiFieldsDisplay(parsed.provider);
            const modelNameOnly = parsed.model.split('/').pop().split(':')[0];
            showToast(`Yazım Modeli Değiştirildi: ${modelNameOnly}`);
        });
    }

    // Dynamic password togglers visibility
    document.querySelectorAll('.toggle-password-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            const input = document.getElementById(targetId);
            if (!input) return;
            const icon = btn.querySelector('i');
            if (input.type === 'password') {
                input.type = 'text';
                if (icon) icon.className = 'fa-solid fa-eye';
            } else {
                input.type = 'password';
                if (icon) icon.className = 'fa-solid fa-eye-slash';
            }
        });
    });

    // Logo click listener to switch to main dashboard Composer
    const headerLogoArea = document.getElementById('headerLogoArea');
    if (headerLogoArea) {
        headerLogoArea.addEventListener('click', () => {
            showView(null, 'ozetBtn');
        });
    }

    // Toggle checked class on channel-check-pill when checkbox changes
    document.querySelectorAll('.channel-check-pill').forEach(pill => {
        const checkbox = pill.querySelector('input[type="checkbox"]');
        if (checkbox) {
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    pill.classList.add('checked');
                } else {
                    pill.classList.remove('checked');
                }
            });
        }
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
            const brandId = getCurrentBrandId();
            const res = await fetch(`/auth/${slug}/start?brand=${brandId}`);
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
        // Credentials yokken kılavuz toast mesajı göster ve modalı aç
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
            `${network} için OAuth credentials yapılandırılmamış. Kurulum adımları açılıyor...`,
            true
        );
        if (window.openHowToConnectFor) {
            window.openHowToConnectFor(network);
        }
    }

    document.querySelectorAll('.conn-card').forEach(card => {
        card.addEventListener('click', () => {
            const network = card.getAttribute('data-network');
            if (card.classList.contains('active-connection')) {
                showToast(`${network} zaten bağlı durumda. Bağlantıyı kesmek için sağ tıklayın.`, true);
                return;
            }
            
            // Web, Blog, E-posta, Looker Stüdyosu, Twitch - OAuth flow yok, direkt yardım rehberini aç
            const noOAuthPlatforms = ['Web', 'Blog', 'E-posta', 'Looker Stüdyosu', 'Twitch'];
            if (noOAuthPlatforms.includes(network)) {
                if (window.openHowToConnectFor) {
                    window.openHowToConnectFor(network);
                }
                return;
            }

            // Bluesky - App password flow
            if (network === 'Bluesky') {
                const identifier = prompt("Bluesky Kullanıcı Adı (örn: adiniz.bsky.social):");
                if (!identifier) return;
                const appPassword = prompt("Bluesky Uygulama Şifresi (App Password):");
                if (!appPassword) return;
                
                // Yükleniyor durumu
                card.style.pointerEvents = 'none';
                card.style.opacity = '0.7';
                const h4 = card.querySelector('h4');
                const originalTitle = h4 ? h4.textContent : 'Bluesky';
                if (h4) h4.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Bağlanıyor...';

                fetch('/api/connect/bluesky', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ identifier: identifier, app_password: appPassword, brand: getCurrentBrandId() })
                })
                .then(res => res.json())
                .then(data => {
                    card.style.pointerEvents = 'auto';
                    card.style.opacity = '1';
                    if (h4) h4.textContent = originalTitle;
                    
                    if (data.success) {
                        card.classList.add('active-connection');
                        if (!card.querySelector('.conn-active-badge')) {
                            const badge = document.createElement('span');
                            badge.className = 'conn-active-badge';
                            badge.style.cssText = 'position:absolute;top:-6px;right:-6px;width:18px;height:18px;border-radius:50%;background-color:#10b981;color:#fff;display:flex;align-items:center;justify-content:center;font-size:9px;';
                            badge.innerHTML = '<i class="fa-solid fa-check"></i>';
                            card.style.position = 'relative';
                            card.appendChild(badge);
                        }
                        updateSidebarPlatformStatus('Bluesky', true);
                        updateConnectedBrandStatsCount();
                        showToast("Bluesky başarıyla bağlandı!");
                    } else {
                        showToast(`Bluesky bağlantısı başarısız: ${data.error}`, true);
                    }
                })
                .catch(err => {
                    card.style.pointerEvents = 'auto';
                    card.style.opacity = '1';
                    if (h4) h4.textContent = originalTitle;
                    showToast(`Bluesky bağlantısı sırasında hata: ${err.message}`, true);
                });
                return;
            }

            // Normal OAuth Platformları
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
                    body: JSON.stringify({ platform: slug, brand: getCurrentBrandId() }),
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
    function updateSidebarPlatformStatus(network, isConnected = true) {
        document.querySelectorAll('.platform-item').forEach(item => {
            const spanText = item.querySelector('span').textContent.trim();
            if (spanText.toLowerCase() === network.toLowerCase() || (network === 'TikTok Kişisel' && spanText === 'TikTok')) {
                const plus = item.querySelector('.plus-icon');
                const caret = item.querySelector('.submenu-caret');
                const dot = item.querySelector('.active-dot');
                const platformGroup = item.closest('.platform-group');
                const submenu = platformGroup ? platformGroup.querySelector('.sidebar-submenu') : null;

                if (isConnected) {
                    if (plus) plus.classList.add('hidden');
                    if (caret) caret.classList.remove('hidden');
                    if (dot) dot.classList.remove('hidden');
                    item.classList.add('connected');
                } else {
                    if (plus) plus.classList.remove('hidden');
                    if (caret) caret.classList.add('hidden');
                    if (dot) dot.classList.add('hidden');
                    item.classList.remove('connected');
                    if (submenu) submenu.classList.add('hidden');
                }
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
        },
        'Ahmet Selim': {
            avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&q=80',
            handle: 'ahmet.selim@example.com',
            platform: 'email',
            tag: 'Destek',
            tagClass: 'tag-lead',
            note: 'Filtre kahve makinesi indirim kodu istiyor.',
            time: '10 dk',
            unread: true,
            messages: [
                { text: 'Merhaba, web sitenizdeki abonelik bültenine kaydoldum fakat indirim kuponu e-postası gelmedi. Kontrol edebilir misiniz?', isSender: false },
                { text: 'Merhaba Ahmet Bey, e-posta adresinizi kontrol ettim. Aktivasyon linkini onaylamadığınız için kupon gönderilmemiş görünüyor. Şimdi onayınız yapıldı, gelen kutunuzu kontrol edebilir misiniz?', isSender: true },
                { text: 'Çok teşekkürler, şimdi e-postam geldi! Kuponu hemen kullanıyorum. Kolay gelsin.', isSender: false }
            ],
            replyPreset: 'Harika Ahmet Bey! Siparişinizle ilgili herhangi bir sorunuz olursa bize her zaman bu mail üzerinden ulaşabilirsiniz.'
        },
        'Selin Soylu': {
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&q=80',
            handle: 'selin.soylu@agency.com',
            platform: 'email',
            tag: 'Ortaklık',
            tagClass: 'tag-recurring',
            note: 'Yeni marka lansman çekimleri için sponsorluk teklifi.',
            time: '2 sa',
            unread: false,
            messages: [
                { text: 'Merhabalar, biAjans ekibi! Yeni kuracağımız sağlıklı atıştırmalık markamızın lansman çekimleri için ürün yerleştirme ve sponsorluk detaylarını görüşmek isteriz. Sunumumuzu ekte paylaşıyorum.', isSender: false }
            ],
            replyPreset: 'İlginiz için teşekkürler Selin Hanım! Sunumunuzu pazarlama ekibimizle paylaştım, en geç yarın gün sonuna kadar detaylı geri dönüş sağlayacağız.'
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
            if (chat.platform === 'email') platformColor = '#0d9488';

            const lastMessageText = chat.messages[chat.messages.length - 1].text;
            const isEmail = chat.platform === 'email';
            const iconClass = chat.platform === 'x' ? 'fa-brands fa-x-twitter' : isEmail ? 'fa-solid fa-envelope' : `fa-brands fa-${chat.platform}`;

            threadItem.innerHTML = `
                <div style="position: relative; flex-shrink: 0;">
                    <img src="${chat.avatar}" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover;">
                    <span style="position: absolute; bottom: -2px; right: -2px; width: 14px; height: 14px; border-radius: 50%; background-color: ${platformColor}; color: white; display: flex; align-items: center; justify-content: center; font-size: 8px; border: 1.5px solid white;">
                        <i class="${iconClass}"></i>
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
            if (chat.platform === 'email') platformColor = '#0d9488';
            
            const isEmail = chat.platform === 'email';
            const iconClass = chat.platform === 'x' ? 'fa-brands fa-x-twitter' : isEmail ? 'fa-solid fa-envelope' : `fa-brands fa-${chat.platform}`;
            
            activePlatformIcon.style.backgroundColor = platformColor;
            activePlatformIcon.innerHTML = `<i class="${iconClass}"></i>`;
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
    const checkSchedYT = document.getElementById('checkSchedYT');
    const checkSchedLI = document.getElementById('checkSchedLI');

    // Photo/Image elements for calendar scheduling
    const schedulePostImageUrl = document.getElementById('schedulePostImageUrl');
    const btnSchedulePostAutoImage = document.getElementById('btnSchedulePostAutoImage');
    const schedulePostImagePreviewContainer = document.getElementById('schedulePostImagePreviewContainer');
    const schedulePostImagePreview = document.getElementById('schedulePostImagePreview');

    // Photo/Image elements for calendar editing/viewing
    const editPostImageUrl = document.getElementById('editPostImageUrl');
    const editPostImagePreviewContainer = document.getElementById('editPostImagePreviewContainer');
    const editPostImagePreview = document.getElementById('editPostImagePreview');

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
                const cameraIcon = post.image_url ? ' <i class="fa-solid fa-camera" title="Görsel ekli" style="margin-left: 4px;"></i>' : '';
                pill.innerHTML = `<i class="fa-brands fa-${iconClass}"></i> ${post.text}${cameraIcon}`;
                
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
    const updateImagePreview = (input, container, imgEl) => {
        if (input && container && imgEl) {
            const val = input.value.trim();
            if (val) {
                imgEl.src = val;
                container.style.display = 'block';
            } else {
                container.style.display = 'none';
            }
        }
    };

    if (schedulePostImageUrl) {
        schedulePostImageUrl.addEventListener('input', () => {
            updateImagePreview(schedulePostImageUrl, schedulePostImagePreviewContainer, schedulePostImagePreview);
        });
    }
    if (editPostImageUrl) {
        editPostImageUrl.addEventListener('input', () => {
            updateImagePreview(editPostImageUrl, editPostImagePreviewContainer, editPostImagePreview);
        });
    }

    function openSchedulePostModal(date) {
        if (!schedulePostModal) return;
        if (schedulePostDate) schedulePostDate.value = date;
        if (schedulePostText) schedulePostText.value = '';
        if (schedulePostImageUrl) {
            schedulePostImageUrl.value = '';
            if (schedulePostImagePreviewContainer) schedulePostImagePreviewContainer.style.display = 'none';
        }

        // AI Görseli Al butonu kontrolü
        if (btnSchedulePostAutoImage) {
            if (activeCampaignData && activeCampaignData.image_url) {
                btnSchedulePostAutoImage.style.display = 'inline-block';
                btnSchedulePostAutoImage.onclick = (e) => {
                    e.preventDefault();
                    if (schedulePostImageUrl) {
                        schedulePostImageUrl.value = activeCampaignData.image_url;
                        updateImagePreview(schedulePostImageUrl, schedulePostImagePreviewContainer, schedulePostImagePreview);
                    }
                };
            } else {
                btnSchedulePostAutoImage.style.display = 'none';
                btnSchedulePostAutoImage.onclick = null;
            }
        }

        // Hazır Gönderiler Bölümünü Doldur
        const readyContainer = document.getElementById('readyPostsContainer');
        const readyList = document.getElementById('readyPostsList');
        
        if (readyContainer && readyList) {
            readyList.innerHTML = '';
            let hasReady = false;

            if (activeCampaignData) {
                const addReadyOption = (platform, text, title = '') => {
                    if (!text) return;
                    hasReady = true;

                    const item = document.createElement('div');
                    item.style.display = 'flex';
                    item.style.alignItems = 'center';
                    item.style.justifyContent = 'space-between';
                    item.style.gap = '8px';
                    item.style.padding = '8px 10px';
                    item.style.background = 'var(--card-bg)';
                    item.style.border = '1px solid var(--card-border)';
                    item.style.borderRadius = '6px';

                    let iconHtml = '';
                    let pName = '';
                    let pillColor = '';
                    if (platform === 'instagram') { iconHtml = '<i class="fa-brands fa-instagram text-ig"></i>'; pName = 'Instagram'; pillColor = '#db2777'; }
                    if (platform === 'facebook') { iconHtml = '<i class="fa-brands fa-facebook text-fb"></i>'; pName = 'Facebook'; pillColor = '#1877f2'; }
                    if (platform === 'youtube') { iconHtml = '<i class="fa-brands fa-youtube text-yt"></i>'; pName = 'YouTube'; pillColor = '#ef4444'; }
                    if (platform === 'linkedin') { iconHtml = '<i class="fa-brands fa-linkedin text-li" style="color: #0077b5;"></i>'; pName = 'LinkedIn'; pillColor = '#0077b5'; }

                    const labelDiv = document.createElement('div');
                    labelDiv.style.display = 'flex';
                    labelDiv.style.flexDirection = 'column';
                    labelDiv.style.gap = '2px';
                    labelDiv.style.flex = '1';
                    labelDiv.style.minWidth = '0';

                    const platformTitle = document.createElement('span');
                    platformTitle.style.fontWeight = 'bold';
                    platformTitle.style.fontSize = '11px';
                    platformTitle.style.color = pillColor;
                    platformTitle.innerHTML = `${iconHtml} ${pName}`;

                    const textPreview = document.createElement('span');
                    textPreview.style.fontSize = '10.5px';
                    textPreview.style.color = 'var(--text-secondary)';
                    textPreview.style.whiteSpace = 'nowrap';
                    textPreview.style.overflow = 'hidden';
                    textPreview.style.textOverflow = 'ellipsis';
                    textPreview.textContent = title ? `${title} - ${text}` : text;

                    labelDiv.appendChild(platformTitle);
                    labelDiv.appendChild(textPreview);

                    const selectBtn = document.createElement('button');
                    selectBtn.className = 'btn btn-outline-all';
                    selectBtn.style.padding = '4px 10px';
                    selectBtn.style.fontSize = '10px';
                    selectBtn.style.height = 'auto';
                    selectBtn.textContent = 'Kullan';
                    
                    selectBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        if (schedulePostText) {
                            schedulePostText.value = title ? `Başlık: ${title}\n\nAçıklama: ${text}` : text;
                        }
                        
                        // Select target checkbox and trigger design updates
                        const platforms = {
                            instagram: checkSchedIG,
                            facebook: checkSchedFB,
                            tiktok: checkSchedTT,
                            youtube: checkSchedYT,
                            linkedin: checkSchedLI
                        };

                        Object.keys(platforms).forEach(k => {
                            const chk = platforms[k];
                            if (chk) {
                                chk.checked = (k === platform);
                                chk.dispatchEvent(new Event('change'));
                            }
                        });

                        showToast(`${pName} hazır gönderisi forma dolduruldu! ✨`);
                    });

                    item.appendChild(labelDiv);
                    item.appendChild(selectBtn);
                    readyList.appendChild(item);
                };

                if (activeCampaignData.instagram_caption) {
                    addReadyOption('instagram', activeCampaignData.instagram_caption);
                }
                if (activeCampaignData.facebook_post) {
                    addReadyOption('facebook', activeCampaignData.facebook_post);
                }
                if (activeCampaignData.youtube && (activeCampaignData.youtube.video_title || activeCampaignData.youtube.video_description)) {
                    addReadyOption('youtube', activeCampaignData.youtube.video_description, activeCampaignData.youtube.video_title);
                }
            }

            if (hasReady) {
                readyContainer.style.display = 'block';
            } else {
                readyContainer.style.display = 'none';
            }
        }

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
            if (checkSchedYT && checkSchedYT.checked) selectedPlats.push('youtube');
            if (checkSchedLI && checkSchedLI.checked) selectedPlats.push('linkedin');

            if (selectedPlats.length === 0) {
                showToast("Lütfen en az bir platform seçin!", true);
                return;
            }

            const imgUrl = schedulePostImageUrl ? schedulePostImageUrl.value.trim() : '';

            // Schedule for each selected platform
            selectedPlats.forEach(plat => {
                calendarPostsData.push({
                    id: 'post_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                    date: date,
                    time: time,
                    platform: plat,
                    text: text,
                    image_url: imgUrl
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
        if (editPostImageUrl) {
            editPostImageUrl.value = post.image_url || '';
            updateImagePreview(editPostImageUrl, editPostImagePreviewContainer, editPostImagePreview);
        }

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
                if (editPostImageUrl) {
                    post.image_url = editPostImageUrl.value.trim();
                }
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
    const btnNetGoogleSess = document.getElementById('btnNetGoogleSess');
    const hashtagSessionStart = document.getElementById('hashtagSessionStart');
    const hashtagSessionDuration = document.getElementById('hashtagSessionDuration');
    const btnCreateHashtagSession = document.getElementById('btnCreateHashtagSession');
    
    const hashtagBalanceLabel = document.getElementById('hashtagBalanceLabel');
    const btnPurchaseTrackerDays = document.getElementById('btnPurchaseTrackerDays');
    
    const hashtagSearchInput = document.getElementById('hashtagSearchInput');
    const hashtagSessionTableBody = document.getElementById('hashtagSessionTableBody');

    let hashtagTrackerBalance = 10;
    let selectedSessNetX = true;
    let selectedSessNetIG = false;
    let selectedSessNetGoogle = false;

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
            igPosts: '0',
            googleVolume: '0'
        },
        {
            id: 'sess2',
            hashtag: '#inbound19',
            networks: ['x', 'instagram', 'google'],
            created: '4 Eylül 2019, 09:17',
            start: '4 Eylül 2019, 01:00',
            duration: 3,
            status: 'completed',
            xPosts: '19.5K',
            igPosts: '3.14K',
            googleVolume: '1.24K'
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
            igPosts: '5.54K',
            googleVolume: '0'
        },
        {
            id: 'sess4',
            hashtag: '#GPIS18',
            networks: ['x', 'google'],
            created: '4 Eylül 2018, 15:20',
            start: '4 Eylül 2018, 01:00',
            duration: 4,
            status: 'completed',
            xPosts: '31.3K',
            igPosts: '0',
            googleVolume: '450'
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
            igPosts: '0',
            googleVolume: '0'
        }
    ];

    // Toggle target platforms styling
    if (btnNetXSess) {
        btnNetXSess.addEventListener('click', () => {
            selectedSessNetX = !selectedSessNetX;
            if (selectedSessNetX) {
                btnNetXSess.style.cssText = 'flex: 1; padding: 8px; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer; border: 1.5px solid var(--accent); background-color: #fefcf0; border-radius: 4px; transition: all 0.2s ease;';
            } else {
                btnNetXSess.style.cssText = 'flex: 1; padding: 8px; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer; border: 1px solid var(--card-border); background-color: #ffffff; border-radius: 4px; transition: all 0.2s ease;';
            }
        });
    }

    if (btnNetIGSess) {
        btnNetIGSess.addEventListener('click', () => {
            selectedSessNetIG = !selectedSessNetIG;
            if (selectedSessNetIG) {
                btnNetIGSess.style.cssText = 'flex: 1; padding: 8px; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer; border: 1.5px solid var(--accent); background-color: #fefcf0; border-radius: 4px; transition: all 0.2s ease;';
            } else {
                btnNetIGSess.style.cssText = 'flex: 1; padding: 8px; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer; border: 1px solid var(--card-border); background-color: #ffffff; border-radius: 4px; transition: all 0.2s ease;';
            }
        });
    }

    if (btnNetGoogleSess) {
        btnNetGoogleSess.addEventListener('click', () => {
            selectedSessNetGoogle = !selectedSessNetGoogle;
            if (selectedSessNetGoogle) {
                btnNetGoogleSess.style.cssText = 'flex: 1; padding: 8px; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer; border: 1.5px solid var(--accent); background-color: #fefcf0; border-radius: 4px; transition: all 0.2s ease;';
            } else {
                btnNetGoogleSess.style.cssText = 'flex: 1; padding: 8px; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer; border: 1px solid var(--card-border); background-color: #ffffff; border-radius: 4px; transition: all 0.2s ease;';
            }
        });
    }

    // Purchase day credits simulator replaced with connection handlers
    const btnGoToConnectionsFromTracker = document.getElementById('btnGoToConnectionsFromTracker');
    if (btnGoToConnectionsFromTracker) {
        btnGoToConnectionsFromTracker.addEventListener('click', () => {
            const connectionsModal = document.getElementById('connectionsModal');
            if (connectionsModal) connectionsModal.classList.remove('hidden');
        });
    }

    const btnRefreshHashtagConnections = document.getElementById('btnRefreshHashtagConnections');
    if (btnRefreshHashtagConnections) {
        btnRefreshHashtagConnections.addEventListener('click', async () => {
            await syncConnectionStatus();
            showToast("Bağlantı durumları başarıyla yenilendi! 🔄");
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
            if (sess.networks.includes('google')) netIcons += '<i class="fa-brands fa-google" style="margin-left: 4px; color: #4285f4;"></i>';

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
                <td style="padding: 12px 8px; text-align: right; font-weight: bold; color: var(--text-primary);">${sess.xPosts || '0'}</td>
                <td style="padding: 12px 8px; text-align: right; font-weight: bold; color: var(--text-primary);">${sess.igPosts || '0'}</td>
                <td style="padding: 12px 8px; text-align: right; font-weight: bold; color: var(--text-primary);">${sess.googleVolume || '0'}</td>
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

            if (!selectedSessNetX && !selectedSessNetIG && !selectedSessNetGoogle) {
                showToast("Lütfen izlenecek en az bir ağ seçin!", true);
                return;
            }

            // Setup networks
            const nets = [];
            if (selectedSessNetX) nets.push('x');
            if (selectedSessNetIG) nets.push('instagram');
            if (selectedSessNetGoogle) nets.push('google');

            // Format date-time
            const now = new Date();
            const monthNames = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
            const timeStr = `${now.getHours() < 10 ? '0' + now.getHours() : now.getHours()}`;
            const minStr = `${now.getMinutes() < 10 ? '0' + now.getMinutes() : now.getMinutes()}`;
            const createdStr = `${now.getDate()} ${monthNames[now.getMonth()]} ${now.getFullYear()}, ${timeStr}:${minStr}`;

            const newSess = {
                id: 'sess_' + Date.now(),
                hashtag: hashtagVal,
                networks: nets,
                created: createdStr,
                start: startVal,
                duration: durationVal,
                status: 'tracking',
                xPosts: selectedSessNetX ? '12' : '0',
                igPosts: selectedSessNetIG ? '6' : '0',
                googleVolume: selectedSessNetGoogle ? '8' : '0'
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
                    if (selectedSessNetGoogle) found.googleVolume = '92';
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
            const brandId = getCurrentBrandId();
            const res  = await fetch(`/api/connections/status?brand=${brandId}`);
            const data = await res.json();
            if (!data || !data.connections) return;

            const connections = data.connections;

            // Update Hashtag Tracker status indicators if they exist
            const hashtagConnXStatus = document.getElementById('hashtagConnXStatus');
            const hashtagConnIGStatus = document.getElementById('hashtagConnIGStatus');

            if (hashtagConnXStatus) {
                if (connections.x && connections.x.connected) {
                    hashtagConnXStatus.innerHTML = '<i class="fa-solid fa-circle" style="font-size: 8px; color: #10b981;"></i> Aktif';
                    hashtagConnXStatus.style.color = '#10b981';
                } else {
                    hashtagConnXStatus.innerHTML = '<i class="fa-solid fa-circle" style="font-size: 8px; color: #ef4444;"></i> Bağlantı Yok';
                    hashtagConnXStatus.style.color = '#ef4444';
                }
            }

            if (hashtagConnIGStatus) {
                if (connections.meta && connections.meta.connected) {
                    hashtagConnIGStatus.innerHTML = '<i class="fa-solid fa-circle" style="font-size: 8px; color: #10b981;"></i> Aktif';
                    hashtagConnIGStatus.style.color = '#10b981';
                } else {
                    hashtagConnIGStatus.innerHTML = '<i class="fa-solid fa-circle" style="font-size: 8px; color: #ef4444;"></i> Bağlantı Yok';
                    hashtagConnIGStatus.style.color = '#ef4444';
                }
            }

            const hashtagConnGoogleStatus = document.getElementById('hashtagConnGoogleStatus');
            if (hashtagConnGoogleStatus) {
                if (connections.google && connections.google.connected) {
                    hashtagConnGoogleStatus.innerHTML = '<i class="fa-solid fa-circle" style="font-size: 8px; color: #10b981;"></i> Aktif';
                    hashtagConnGoogleStatus.style.color = '#10b981';
                } else {
                    hashtagConnGoogleStatus.innerHTML = '<i class="fa-solid fa-circle" style="font-size: 8px; color: #ef4444;"></i> Bağlantı Yok';
                    hashtagConnGoogleStatus.style.color = '#ef4444';
                }
            }

            // Platform slug → data-network değerleri eşleştirmesi
            const slugToNetworkNames = {
                meta:       ['Facebook', 'Instagram', 'Threads', 'WhatsApp', 'Meta Reklamlar'],
                google:     ['YouTube', 'Google Ads', 'Looker Stüdyosu', 'Google İşletme Profili'],
                linkedin:   ['LinkedIn'],
                x:          ['X'],
                tiktok:     ['TikTok Kişisel', 'TikTok İşletmesi', 'TikTok Reklamları', 'TikTok Ads'],
                pinterest:  ['Pinterest'],
                bluesky:    ['Bluesky'],
            };

            // Clear all connection states first
            document.querySelectorAll('.conn-card').forEach(card => {
                card.classList.remove('active-connection');
                const badge = card.querySelector('.conn-active-badge');
                if (badge) badge.remove();
            });
            Object.values(slugToNetworkNames).flat().forEach(name => {
                updateSidebarPlatformStatus(name, false);
            });

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
                        account_id: 'act_123456789',
                        brand: getCurrentBrandId()
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

    // --- GOOGLE HASHTAG GUIDE & SIMULATION LOGIC ---
    const googleHashtagGuideModal = document.getElementById('googleHashtagGuideModal');
    const btnGoogleTrackerGuide = document.getElementById('btnGoogleTrackerGuide');
    const googleHashtagGuideCloseBtn = document.getElementById('googleHashtagGuideCloseBtn');
    const googleHashtagGuideClose = document.getElementById('googleHashtagGuideClose');
    const btnConnectGoogleSearchMock = document.getElementById('btnConnectGoogleSearchMock');

    const hashtagRowX = document.getElementById('hashtagRowX');
    const hashtagRowIG = document.getElementById('hashtagRowIG');
    const hashtagRowGoogle = document.getElementById('hashtagRowGoogle');

    function openGoogleGuide() {
        if (googleHashtagGuideModal) {
            googleHashtagGuideModal.classList.remove('hidden');
        }
    }

    function closeGoogleGuide() {
        if (googleHashtagGuideModal) {
            googleHashtagGuideModal.classList.add('hidden');
        }
    }

    if (btnGoogleTrackerGuide) {
        btnGoogleTrackerGuide.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            openGoogleGuide();
        });
    }

    if (googleHashtagGuideCloseBtn) {
        googleHashtagGuideCloseBtn.addEventListener('click', closeGoogleGuide);
    }
    if (googleHashtagGuideClose) {
        googleHashtagGuideClose.addEventListener('click', closeGoogleGuide);
    }

    async function connectMockPlatform(platform, platformLabel) {
        try {
            const brandId = getCurrentBrandId();
            const res = await fetch('/api/connect/mock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ platform: platform, brand: brandId })
            });
            const data = await res.json();
            if (data.success) {
                showToast(`✅ ${platformLabel} simüle bağlantısı kuruldu!`);
                await syncConnectionStatus();
            } else {
                showToast(`❌ Bağlantı hatası: ${data.error}`, true);
            }
        } catch (err) {
            showToast(`❌ Bağlantı hatası: ${err.message}`, true);
        }
    }

    if (btnConnectGoogleSearchMock) {
        btnConnectGoogleSearchMock.addEventListener('click', async () => {
            btnConnectGoogleSearchMock.disabled = true;
            const origText = btnConnectGoogleSearchMock.textContent;
            btnConnectGoogleSearchMock.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Bağlanıyor...';
            
            await connectMockPlatform('google', 'Google Search API');
            
            btnConnectGoogleSearchMock.disabled = false;
            btnConnectGoogleSearchMock.textContent = origText;
            closeGoogleGuide();
        });
    }

    // Bind connection row click events to prompt/help modal
    if (hashtagRowX) {
        hashtagRowX.addEventListener('click', () => {
            const startReal = confirm("X / Twitter API bağlantısını gerçek hesabınızla kurmak için 'Tamam'a tıklayın.\nTest amaçlı hızlı simüle bağlantı kurmak için 'İptal'e tıklayın.");
            if (startReal) {
                const connectionsModal = document.getElementById('connectionsModal');
                if (connectionsModal) connectionsModal.classList.remove('hidden');
                const card = document.querySelector('.conn-card[data-network="X"]');
                if (card) card.click();
            } else {
                connectMockPlatform('x', 'X / Twitter API');
            }
        });
    }

    if (hashtagRowIG) {
        hashtagRowIG.addEventListener('click', () => {
            const startReal = confirm("Instagram Graph API bağlantısını gerçek hesabınızla kurmak için 'Tamam'a tıklayın.\nTest amaçlı hızlı simüle bağlantı kurmak için 'İptal'e tıklayın.");
            if (startReal) {
                const connectionsModal = document.getElementById('connectionsModal');
                if (connectionsModal) connectionsModal.classList.remove('hidden');
                const card = document.querySelector('.conn-card[data-network="Instagram"]');
                if (card) card.click();
            } else {
                connectMockPlatform('instagram', 'Instagram Graph API');
            }
        });
    }

    if (hashtagRowGoogle) {
        hashtagRowGoogle.addEventListener('click', (e) => {
            if (e.target.id === 'btnGoogleTrackerGuide') return;
            openGoogleGuide();
        });
    }

    // --- HOW TO CONNECT HELPER MODAL LOGIC ---
    const btnHowToConnect = document.getElementById('btnHowToConnect');
    const howToConnectModal = document.getElementById('howToConnectModal');
    const howToConnectCloseBtn = document.getElementById('howToConnectCloseBtn');
    const btnHowToConnectClose = document.getElementById('btnHowToConnectClose');

    if (btnHowToConnect && howToConnectModal) {
        btnHowToConnect.addEventListener('click', (e) => {
            e.preventDefault();
            howToConnectModal.classList.remove('hidden');
        });
    }

    function closeHowToConnectModal() {
        if (howToConnectModal) {
            howToConnectModal.classList.add('hidden');
        }
    }

    if (howToConnectCloseBtn) howToConnectCloseBtn.addEventListener('click', closeHowToConnectModal);
    if (btnHowToConnectClose) btnHowToConnectClose.addEventListener('click', closeHowToConnectModal);

    // Tab switching logic inside help modal
    const helpTabBtns = document.querySelectorAll('.help-tab-btn');
    const helpTabPanels = document.querySelectorAll('.help-tab-panel');

    helpTabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Reset all buttons
            helpTabBtns.forEach(b => {
                b.classList.remove('active');
                b.style.color = '#64748b';
                b.style.borderBottomColor = 'transparent';
            });
            // Style active button
            btn.classList.add('active');
            btn.style.color = '#6366f1';
            btn.style.borderBottomColor = '#6366f1';

            // Show target panel
            const targetTab = btn.getAttribute('data-help-tab');
            helpTabPanels.forEach(panel => {
                if (panel.id === `help-panel-${targetTab}`) {
                    panel.style.display = 'flex';
                } else {
                    panel.style.display = 'none';
                }
            });
        });
    });

    // Helper to open guides for a specific platform
    window.openHowToConnectFor = function(network) {
        if (!howToConnectModal) return;

        // Open modal
        howToConnectModal.classList.remove('hidden');

        // Map network name to the correct tab category
        const socialPlatforms = [
            'Facebook', 'Instagram', 'Threads', 'X', 'Bluesky', 
            'LinkedIn', 'Pinterest', 'TikTok Kişisel', 'TikTok İşletmesi', 
            'YouTube', 'Twitch'
        ];
        const adsPlatforms = [
            'Meta Reklamlar', 'Google Ads', 'TikTok Reklamları', 'Looker Stüdyosu'
        ];

        let tabType = 'web';
        if (socialPlatforms.includes(network)) {
            tabType = 'social';
        } else if (adsPlatforms.includes(network)) {
            tabType = 'ads';
        }

        // Click the corresponding tab button
        const tabBtn = document.querySelector(`.help-tab-btn[data-help-tab="${tabType}"]`);
        if (tabBtn) {
            tabBtn.click();
        }

        // Scroll to and highlight the platform guide block
        setTimeout(() => {
            const platformSelector = network.replace(/\s+/g, '-');
            const guideBlock = document.querySelector(`[data-help-platform~="${platformSelector}"]`);
            if (guideBlock) {
                guideBlock.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                // Add flash pulse effect
                guideBlock.classList.add('help-guide-highlight');
                setTimeout(() => {
                    guideBlock.classList.remove('help-guide-highlight');
                }, 2000);
            }
        }, 120);
    };

    // Bind connect buttons inside guide modal
    document.querySelectorAll('.btn-help-connect').forEach(btn => {
        btn.addEventListener('click', () => {
            const network = btn.getAttribute('data-connect-network');
            const card = document.querySelector(`.conn-card[data-network="${network}"]`);
            if (card) {
                closeHowToConnectModal();
                card.click();
            }
        });
    });

    // ==========================================================================
    // SMARTLINKS LIVE EDITOR & SIMULATOR LOGIC
    // ==========================================================================

    const slAvatarUrlInput = document.getElementById('slAvatarUrl');
    const slTitleInput = document.getElementById('slTitle');
    const slSubtitleInput = document.getElementById('slSubtitle');
    const slThemeSelect = document.getElementById('slThemeSelect');
    const slLinksContainer = document.getElementById('slLinksContainer');
    const slAddLinkBtn = document.getElementById('slAddLinkBtn');
    const slSaveBtn = document.getElementById('slSaveBtn');

    // Simulator elements
    const slSimAvatar = document.getElementById('slSimAvatar');
    const slSimTitle = document.getElementById('slSimTitle');
    const slSimSubtitle = document.getElementById('slSimSubtitle');
    const slSimLinks = document.getElementById('slSimLinks');
    const slSimulatorPhone = document.getElementById('slSimulatorPhone');

    // Live URL Bar elements
    const slLiveUrlBar = document.getElementById('slLiveUrlBar');
    const slLiveUrlText = document.getElementById('slLiveUrlText');
    const slCopyUrlBtn = document.getElementById('slCopyUrlBtn');
    const slVisitUrlBtn = document.getElementById('slVisitUrlBtn');

    // Map brand values to actual slugs or names
    function getSelectedBrandValue() {
        const brandSelect = document.getElementById('brandSelect');
        return brandSelect ? brandSelect.value : 'global';
    }

    function getSelectedBrandName() {
        const brandSelect = document.getElementById('brandSelect');
        if (brandSelect && brandSelect.selectedIndex >= 0) {
            return brandSelect.options[brandSelect.selectedIndex].text;
        }
        return 'Boş marka';
    }

    // Load SmartLinks data for active brand
    window.loadSmartLinks = async function() {
        if (!slAvatarUrlInput) return;
        const brand = getSelectedBrandValue();
        try {
            const response = await fetch(`/api/smartlinks/load?brand=${brand}`);
            const resData = await response.json();
            if (resData.success && resData.data) {
                const data = resData.data;
                slAvatarUrlInput.value = data.avatar || '';
                slTitleInput.value = data.title || getSelectedBrandName();
                slSubtitleInput.value = data.subtitle || '';
                slThemeSelect.value = data.theme || 'clean-light';
                
                // Clear and rebuild rows
                slLinksContainer.innerHTML = '';
                if (Array.isArray(data.links) && data.links.length > 0) {
                    data.links.forEach(link => addLinkRow(link.title, link.url, link.icon));
                } else {
                    // Default links if none exist
                    addLinkRow('Web Sitemiz', 'https://example.com', 'fa-solid fa-globe');
                    addLinkRow('Instagram Profilimiz', 'https://instagram.com', 'fa-brands fa-instagram');
                }
                
                // Show URL bar for the brand
                if (brand) {
                    const pageUrl = `${window.location.origin}/sl/${brand}`;
                    slLiveUrlText.textContent = pageUrl;
                    slVisitUrlBtn.href = `/sl/${brand}`;
                    slLiveUrlBar.classList.remove('hidden');
                }

                updateSmartLinksPreview();
            }
        } catch (err) {
            console.error('SmartLinks loading error:', err);
            showToast('Akıllı bağlantı ayarları yüklenemedi.', true);
        }
    };

    // Add a single row to the links builder
    function addLinkRow(title = '', url = '', icon = 'fa-solid fa-link') {
        if (!slLinksContainer) return;
        const row = document.createElement('div');
        row.className = 'sl-builder-row';
        row.innerHTML = `
            <select class="sl-link-icon form-control-custom" style="width: auto; flex-shrink: 0; min-width: 90px; padding: 6px 8px;">
                <option value="fa-solid fa-globe">🌐 Site</option>
                <option value="fa-brands fa-instagram">📸 Instagram</option>
                <option value="fa-brands fa-whatsapp">💬 WhatsApp</option>
                <option value="fa-brands fa-facebook">👥 Facebook</option>
                <option value="fa-solid fa-play">🎥 YouTube</option>
                <option value="fa-brands fa-linkedin">💼 LinkedIn</option>
                <option value="fa-brands fa-x-twitter">🐦 X</option>
                <option value="fa-brands fa-tiktok">🎵 TikTok</option>
                <option value="fa-brands fa-github">💻 GitHub</option>
                <option value="fa-solid fa-envelope">✉️ E-posta</option>
            </select>
            <input type="text" class="sl-link-title form-control-custom" placeholder="Buton Metni" value="${title}" style="flex: 1; padding: 6px 10px;">
            <input type="text" class="sl-link-url form-control-custom" placeholder="URL Adresi" value="${url}" style="flex: 2; padding: 6px 10px;">
            <button class="remove-btn" title="Bağlantıyı Sil"><i class="fa-solid fa-trash"></i></button>
        `;

        // Set initial icon selection
        const select = row.querySelector('.sl-link-icon');
        select.value = icon;

        // Bind live updates
        row.querySelectorAll('input, select').forEach(input => {
            input.addEventListener('input', updateSmartLinksPreview);
            input.addEventListener('change', updateSmartLinksPreview);
        });

        // Bind remove button
        row.querySelector('.remove-btn').addEventListener('click', (e) => {
            e.preventDefault();
            row.remove();
            updateSmartLinksPreview();
        });

        slLinksContainer.appendChild(row);
        updateSmartLinksPreview();
    }

    // Real-time update of mockup simulator preview
    function updateSmartLinksPreview() {
        if (!slSimAvatar || !slSimTitle || !slSimSubtitle || !slSimLinks || !slSimulatorPhone) return;

        // Avatar
        const avatarUrl = slAvatarUrlInput.value.trim();
        slSimAvatar.src = avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80';

        // Title & Subtitle
        slSimTitle.textContent = slTitleInput.value.trim() || getSelectedBrandName();
        slSimSubtitle.textContent = slSubtitleInput.value.trim() || 'Açıklama girilmedi...';

        // Theme classes
        slSimulatorPhone.className = '';
        const theme = slThemeSelect.value;
        slSimulatorPhone.classList.add(`theme-${theme}`);

        // Rebuild simulated buttons
        slSimLinks.innerHTML = '';
        const rows = slLinksContainer.querySelectorAll('.sl-builder-row');
        rows.forEach(row => {
            const iconVal = row.querySelector('.sl-link-icon').value;
            const titleVal = row.querySelector('.sl-link-title').value.trim();
            const urlVal = row.querySelector('.sl-link-url').value.trim();

            if (titleVal) {
                const btn = document.createElement('a');
                btn.className = 'sl-sim-btn';
                btn.href = urlVal || '#';
                btn.target = '_blank';
                btn.innerHTML = `<i class="${iconVal}"></i> ${titleVal}`;
                slSimLinks.appendChild(btn);
            }
        });
    }

    // Event listeners for basic settings inputs
    if (slAvatarUrlInput) slAvatarUrlInput.addEventListener('input', updateSmartLinksPreview);
    if (slTitleInput) slTitleInput.addEventListener('input', updateSmartLinksPreview);
    if (slSubtitleInput) slSubtitleInput.addEventListener('input', updateSmartLinksPreview);
    if (slThemeSelect) slThemeSelect.addEventListener('change', updateSmartLinksPreview);

    // Add link row trigger
    if (slAddLinkBtn) {
        slAddLinkBtn.addEventListener('click', (e) => {
            e.preventDefault();
            addLinkRow('', '', 'fa-solid fa-link');
        });
    }

    // Save & Publish trigger
    if (slSaveBtn) {
        slSaveBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const brand = getSelectedBrandValue();
            
            // Build links payload
            const links = [];
            const rows = slLinksContainer.querySelectorAll('.sl-builder-row');
            rows.forEach((row, idx) => {
                const iconVal = row.querySelector('.sl-link-icon').value;
                const titleVal = row.querySelector('.sl-link-title').value.trim();
                const urlVal = row.querySelector('.sl-link-url').value.trim();
                if (titleVal) {
                    links.push({
                        id: idx + 1,
                        title: titleVal,
                        url: urlVal,
                        icon: iconVal
                    });
                }
            });

            const payload = {
                brand: brand,
                title: slTitleInput.value.trim() || getSelectedBrandName(),
                subtitle: slSubtitleInput.value.trim(),
                avatar: slAvatarUrlInput.value.trim(),
                theme: slThemeSelect.value,
                links: links
            };

            const origHtml = slSaveBtn.innerHTML;
            slSaveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Yayınlanıyor...';
            slSaveBtn.disabled = true;

            try {
                const response = await fetch('/api/smartlinks/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                const resData = await response.json();
                if (resData.success) {
                    showToast('Akıllı bağlantılarınız başarıyla kaydedildi ve yayınlandı!');
                    
                    if (brand) {
                        const pageUrl = `${window.location.origin}/sl/${brand}`;
                        slLiveUrlText.textContent = pageUrl;
                        slVisitUrlBtn.href = `/sl/${brand}`;
                        slLiveUrlBar.classList.remove('hidden');
                    }
                } else {
                    showToast('Kaydetme hatası: ' + resData.error, true);
                }
            } catch (err) {
                console.error(err);
                showToast('Yayınlanırken ağ hatası oluştu: ' + err.message, true);
            } finally {
                slSaveBtn.innerHTML = origHtml;
                slSaveBtn.disabled = false;
            }
        });
    }

    // Copy live url button trigger
    if (slCopyUrlBtn) {
        slCopyUrlBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const urlText = slLiveUrlText.textContent;
            navigator.clipboard.writeText(urlText).then(() => {
                showToast('Akıllı bağlantı URL\'si panoya kopyalandı!');
            }).catch(err => {
                console.error('Copy error:', err);
            });
        });
    }

    // Reload smartlinks when switching brand dropdown
    const brandSelectSelector = document.getElementById('brandSelect');
    if (brandSelectSelector) {
        brandSelectSelector.addEventListener('change', () => {
            const akilliSection = document.getElementById('akilliBaglantilarSection');
            if (akilliSection && !akilliSection.classList.contains('hidden')) {
                if (typeof window.loadSmartLinks === 'function') {
                    window.loadSmartLinks();
                }
            }
        });
    }

    // ============================================================
    // BRAND MANAGEMENT SYSTEM
    // Stores all brand data in localStorage under 'biAjans_brands'
    // ============================================================

    const BRANDS_KEY = 'biAjans_brands';

    // Default brand data
    const defaultBrands = [
        {
            id: 'global',
            name: 'Boş marka',
            logo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80',
            industry: '',
            payment: '',
            currency: 'TL',
            requirements: '',
            meetingDate: '',
            zoomLink: '',
            onboarding: { step1: false, step2: false, step3: false, step4: false }
        },
        {
            id: 'coffee',
            name: 'Local Coffee Shop',
            logo: 'https://images.unsplash.com/photo-1511920170033-f8396924c348?w=150&q=80',
            industry: 'Gıda & İçecek',
            payment: '12000',
            currency: 'TL',
            requirements: 'Haftalık en az 5 gönderi. Instagram reels öncelikli. Kahve sezonu kampanyaları yapılacak.',
            meetingDate: '',
            zoomLink: '',
            onboarding: { step1: true, step2: true, step3: false, step4: false }
        },
        {
            id: 'fitness',
            name: 'Health & Fitness',
            logo: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=150&q=80',
            industry: 'Sağlık & Spor',
            payment: '18000',
            currency: 'TL',
            requirements: 'Motivasyon odaklı içerik. TikTok ve Instagram eş zamanlı paylaşım. Sporcu hikayeleri ve dönüşüm videoları.',
            meetingDate: '',
            zoomLink: '',
            onboarding: { step1: true, step2: false, step3: false, step4: false }
        }
    ];

    // Load brands from localStorage or use defaults
    function loadBrandsFromStorage() {
        try {
            const stored = localStorage.getItem(BRANDS_KEY);
            return stored ? JSON.parse(stored) : defaultBrands;
        } catch (e) {
            return defaultBrands;
        }
    }

    // Save brands array to localStorage
    function saveBrandsToStorage(brands) {
        try {
            localStorage.setItem(BRANDS_KEY, JSON.stringify(brands));
        } catch (e) {
            console.warn('Brand save error:', e);
        }
    }

    // Generate unique ID for new brand
    function generateBrandId() {
        return 'brand_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    }

    // Helper to get connected platforms count for a brand (high fidelity mock)
    function getBrandConnectedCount(brand) {
        const activeId = document.getElementById('brandSelect')?.value;
        if (brand.id === activeId) {
            return document.querySelectorAll('.sidebar .platform-item.connected').length;
        }
        if (brand.id === 'coffee') return 2;
        if (brand.id === 'fitness') return 3;
        return 1; // Default fallback
    }

    // Custom brand dropdown renderer
    function renderCustomBrandDropdown() {
        const menu = document.getElementById('settingsBrandDropdownMenu');
        if (!menu) return;

        const activeId = document.getElementById('brandSelect')?.value || 'global';
        const activeBrand = brandsData.find(b => b.id === activeId);

        // Update the main toggle container
        const titleSpan = document.getElementById('settingsBrandTitle');
        const subtitleSpan = document.getElementById('settingsBrandSubtitle');
        const avatarImg = document.getElementById('settingsBrandAvatarImg');
        const avatarIcon = document.getElementById('settingsBrandAvatarIcon');
        const countLabel = document.getElementById('brandStatsCountLabel');

        if (activeBrand) {
            if (titleSpan) titleSpan.textContent = activeBrand.name;
            
            const connCount = getBrandConnectedCount(activeBrand);
            if (subtitleSpan) {
                subtitleSpan.innerHTML = `<span id="connectedCountText">${connCount}</span> platform bağlı`;
            }

            if (avatarImg && avatarIcon) {
                if (activeBrand.logo) {
                    avatarImg.src = activeBrand.logo;
                    avatarImg.style.display = 'block';
                    avatarIcon.style.display = 'none';
                } else {
                    avatarImg.style.display = 'none';
                    avatarIcon.style.display = 'block';
                }
            }

            // Update stats count text (X / Y)
            const currentIdx = brandsData.findIndex(b => b.id === activeId);
            if (countLabel) {
                countLabel.innerHTML = `Markalar (${currentIdx !== -1 ? currentIdx + 1 : 1} / ${brandsData.length}) <i class="fa-regular fa-question-circle" style="font-size: 10px; cursor: help;"></i>`;
            }
        }

        // Render list items
        menu.innerHTML = '';
        brandsData.forEach(brand => {
            const isActive = brand.id === activeId;
            const connCount = getBrandConnectedCount(brand);
            
            const item = document.createElement('div');
            item.className = 'custom-brand-item';
            item.setAttribute('data-brand-id', brand.id);
            
            item.innerHTML = `
                <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
                    <div style="width: 32px; height: 32px; border-radius: 50%; overflow: hidden; background-color: #cbd5e1; display: flex; align-items: center; justify-content: center; color: #ffffff;">
                        ${brand.logo ? `<img src="${brand.logo}" style="width: 100%; height: 100%; object-fit: cover;" />` : `<i class="fa-solid fa-user-tie" style="font-size: 14px;"></i>`}
                    </div>
                    <div style="display: flex; flex-direction: column; text-align: left;">
                        <span style="font-size: 13.5px; font-weight: 700; color: #1e293b;">${brand.name}</span>
                        <span style="font-size: 10.5px; color: #94a3b8; font-weight: 600;">${connCount} platform bağlı • ${brand.industry || 'Genel'}</span>
                    </div>
                </div>
                ${isActive ? `<i class="fa-solid fa-circle-check" style="color: #6366f1; font-size: 16px;"></i>` : ''}
            `;
            
            item.addEventListener('click', () => {
                const sel = document.getElementById('brandSelect');
                if (sel) {
                    sel.value = brand.id;
                    sel.dispatchEvent(new Event('change'));
                }
                menu.classList.add('hidden');
                showToast(`Marka seçildi: ${brand.name}`);
            });
            
            menu.appendChild(item);
        });
    }

    // Toggle dropdown visibility
    const settingsBrandSelectToggle = document.getElementById('settingsBrandSelectToggle');
    if (settingsBrandSelectToggle) {
        settingsBrandSelectToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const menu = document.getElementById('settingsBrandDropdownMenu');
            if (menu) {
                menu.classList.toggle('hidden');
            }
        });
    }

    // Document click to close custom dropdown
    document.addEventListener('click', (e) => {
        const menu = document.getElementById('settingsBrandDropdownMenu');
        const toggle = document.getElementById('settingsBrandSelectToggle');
        if (menu && toggle && !toggle.contains(e.target) && !menu.contains(e.target)) {
            menu.classList.add('hidden');
        }
    });

    // Brands Table View Modal Populator & Events
    const btnViewAsTable = document.getElementById('btnViewAsTable');
    const brandsTableModal = document.getElementById('brandsTableModal');
    const brandsTableModalClose = document.getElementById('brandsTableModalClose');
    const brandsTableModalCloseBtn = document.getElementById('brandsTableModalCloseBtn');
    const brandsTableModalBody = document.getElementById('brandsTableModalBody');

    function renderBrandsTableModal() {
        if (!brandsTableModalBody) return;
        brandsTableModalBody.innerHTML = '';
        
        brandsData.forEach(brand => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid #f1f5f9';
            tr.style.transition = 'background-color 0.2s';
            
            const monthlyAmountVal = brand.muhasebe?.monthlyAmount || brand.payment || '—';
            const currencyVal = brand.muhasebe?.currency || brand.currency || 'TL';
            const formattedBudget = monthlyAmountVal !== '—' ? formatMoney(monthlyAmountVal, currencyVal) : '—';
            
            const rawMeetingDate = brand.meetingDate || '';
            let formattedMeeting = '—';
            if (rawMeetingDate) {
                const d = new Date(rawMeetingDate);
                formattedMeeting = d.toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
            }
            
            const connCount = getBrandConnectedCount(brand);
            
            tr.innerHTML = `
                <td style="padding: 12px 8px;">
                    <div style="width: 36px; height: 36px; border-radius: 50%; overflow: hidden; background-color: #cbd5e1; display: flex; align-items: center; justify-content: center; color: #ffffff;">
                        ${brand.logo ? `<img src="${brand.logo}" style="width: 100%; height: 100%; object-fit: cover;" />` : `<i class="fa-solid fa-user-tie" style="font-size: 16px;"></i>`}
                    </div>
                </td>
                <td style="padding: 12px 8px; font-weight: 700; color: #1e293b;">${brand.name}</td>
                <td style="padding: 12px 8px; color: #64748b; font-weight: 600;">${brand.industry || 'Genel'}</td>
                <td style="padding: 12px 8px; color: #0f172a; font-weight: 700;">${formattedBudget}</td>
                <td style="padding: 12px 8px; color: #64748b; font-weight: 600;">${formattedMeeting}</td>
                <td style="padding: 12px 8px; text-align: right;">
                    <button class="btn btn-outline-all btn-select-table-brand" data-brand-id="${brand.id}" style="font-size: 11.5px; padding: 6px 12px; border-radius: 6px; cursor: pointer; border: 1.5px solid #6366f1; background: transparent; color: #6366f1; font-weight: 700; transition: all 0.2s;">Seç</button>
                </td>
            `;
            
            // Hover effect
            tr.addEventListener('mouseenter', () => tr.style.backgroundColor = '#f8fafc');
            tr.addEventListener('mouseleave', () => tr.style.backgroundColor = 'transparent');
            
            // Select button handler
            const selectBtn = tr.querySelector('.btn-select-table-brand');
            if (selectBtn) {
                selectBtn.addEventListener('click', () => {
                    const sel = document.getElementById('brandSelect');
                    if (sel) {
                        sel.value = brand.id;
                        sel.dispatchEvent(new Event('change'));
                    }
                    if (brandsTableModal) brandsTableModal.classList.add('hidden');
                    showToast(`Marka seçildi: ${brand.name}`);
                });
            }
            
            brandsTableModalBody.appendChild(tr);
        });
    }

    if (btnViewAsTable && brandsTableModal) {
        btnViewAsTable.addEventListener('click', () => {
            renderBrandsTableModal();
            brandsTableModal.classList.remove('hidden');
        });
    }

    const closeBrandsTableModal = () => {
        if (brandsTableModal) brandsTableModal.classList.add('hidden');
    };

    if (brandsTableModalClose) brandsTableModalClose.addEventListener('click', closeBrandsTableModal);
    if (brandsTableModalCloseBtn) brandsTableModalCloseBtn.addEventListener('click', closeBrandsTableModal);
    if (brandsTableModal) {
        brandsTableModal.addEventListener('click', (e) => {
            if (e.target === brandsTableModal) closeBrandsTableModal();
        });
    }

    // Rebuild brand dropdown from brands array
    function rebuildBrandDropdown(brands, selectedId) {
        const sel = document.getElementById('brandSelect');
        if (!sel) return;
        const currentVal = selectedId || sel.value;
        sel.innerHTML = '';
        brands.forEach(b => {
            const opt = document.createElement('option');
            opt.value = b.id;
            opt.textContent = b.name;
            sel.appendChild(opt);
        });
        if (currentVal) sel.value = currentVal;

        if (typeof renderCustomBrandDropdown === 'function') {
            renderCustomBrandDropdown();
        }
    }

    // Populate brand config form from brand object
    function populateBrandForm(brand) {
        if (!brand) return;

        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val || '';
        };
        const setChecked = (id, checked) => {
            const el = document.getElementById(id);
            if (el) el.checked = !!checked;
        };

        setVal('settingBrandNameInput', brand.name);
        setVal('settingBrandPaymentInput', brand.payment);
        setVal('settingBrandRequirementsInput', brand.requirements);
        setVal('settingBrandMeetingDateInput', brand.meetingDate);
        setVal('settingBrandZoomLinkInput', brand.zoomLink);

        // Currency
        const currSel = document.getElementById('settingBrandCurrencySelect');
        if (currSel) currSel.value = brand.currency || 'TL';

        // Logo
        const logoImg = document.getElementById('brandAvatarPreview');
        if (logoImg && brand.logo) logoImg.src = brand.logo;

        // Brand title
        const brandTitle = document.getElementById('settingsBrandTitle');
        if (brandTitle) brandTitle.textContent = brand.name;

        // Onboarding checkboxes
        const ob = brand.onboarding || {};
        setChecked('obStep1', ob.step1);
        setChecked('obStep2', ob.step2);
        setChecked('obStep3', ob.step3);
        setChecked('obStep4', ob.step4);

        // Zoom meeting widget
        updateMeetingWidget(brand.meetingDate, brand.zoomLink);
    }

    // Update the green meeting widget
    function updateMeetingWidget(meetingDate, zoomLink) {
        const widget = document.getElementById('activeMeetingWidget');
        const timeText = document.getElementById('activeMeetingTimeText');
        const linkBtn = document.getElementById('activeMeetingLinkBtn');

        if (!widget) return;

        if (meetingDate && zoomLink) {
            widget.style.display = 'flex';
            widget.classList.remove('hidden');
            const d = new Date(meetingDate);
            if (timeText) timeText.textContent = d.toLocaleString('tr-TR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
            if (linkBtn) linkBtn.href = zoomLink;
        } else {
            widget.style.display = 'none';
            widget.classList.add('hidden');
        }
    }

    // Initialize brand system
    let brandsData = loadBrandsFromStorage();
    rebuildBrandDropdown(brandsData, brandsData[0]?.id);
    // NOTE: populateBrandForm is called below via populateBrandFormExtended after muhasebe/crm init

    // Brand dropdown change → handled further below by populateBrandFormExtended
    const brandDropdown = document.getElementById('brandSelect');

    // Save Brand Settings button → persist all form values
    const saveBrandBtn = document.getElementById('saveBrandSettingsBtn');
    if (saveBrandBtn) {
        // Override existing simple handler with full data save
        saveBrandBtn.addEventListener('click', () => {
            const selectedId = brandDropdown ? brandDropdown.value : 'global';
            const brandIndex = brandsData.findIndex(b => b.id === selectedId);
            if (brandIndex === -1) return;

            const getVal = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
            const getChecked = id => { const el = document.getElementById(id); return el ? el.checked : false; };

            const newName = getVal('settingBrandNameInput') || brandsData[brandIndex].name;

            brandsData[brandIndex] = {
                ...brandsData[brandIndex],
                name: newName,
                payment: getVal('settingBrandPaymentInput'),
                currency: (document.getElementById('settingBrandCurrencySelect') || {}).value || 'TL',
                requirements: getVal('settingBrandRequirementsInput'),
                meetingDate: getVal('settingBrandMeetingDateInput'),
                zoomLink: getVal('settingBrandZoomLinkInput'),
                logo: (document.getElementById('brandAvatarPreview') || {}).src || brandsData[brandIndex].logo,
                onboarding: {
                    step1: getChecked('obStep1'),
                    step2: getChecked('obStep2'),
                    step3: getChecked('obStep3'),
                    step4: getChecked('obStep4')
                }
            };

            saveBrandsToStorage(brandsData);
            rebuildBrandDropdown(brandsData, selectedId);

            // Update meeting widget after save
            updateMeetingWidget(brandsData[brandIndex].meetingDate, brandsData[brandIndex].zoomLink);

            // Update preview handles
            const formatHandle = newName.toLowerCase().replace(/\s+/g, '_');
            const igHeader = document.querySelector('#instagramMockup .post-meta h4');
            if (igHeader) igHeader.innerHTML = `${formatHandle} <i class="fa-solid fa-circle-check text-li"></i>`;
            const fbHeader = document.querySelector('#facebookMockup .post-meta h4');
            if (fbHeader) fbHeader.innerHTML = `${newName} <i class="fa-solid fa-circle-check text-li"></i>`;
            const ytHeader = document.querySelector('#youtubeMockup .yt-channel-info h5');
            if (ytHeader) ytHeader.textContent = newName;
            const bioTitle = document.getElementById('bioMockupTitle');
            if (bioTitle) bioTitle.textContent = `@${formatHandle}`;
            const settingsBrandTitle = document.getElementById('settingsBrandTitle');
            if (settingsBrandTitle) settingsBrandTitle.textContent = newName;

            showToast('✅ Marka ayarları başarıyla kaydedildi.');
        });
    }

    // Meeting date/link inputs → live widget update
    const meetingDateInput = document.getElementById('settingBrandMeetingDateInput');
    const zoomLinkInput = document.getElementById('settingBrandZoomLinkInput');
    if (meetingDateInput) meetingDateInput.addEventListener('change', () => updateMeetingWidget(meetingDateInput.value, zoomLinkInput ? zoomLinkInput.value : ''));
    if (zoomLinkInput) zoomLinkInput.addEventListener('input', () => updateMeetingWidget(meetingDateInput ? meetingDateInput.value : '', zoomLinkInput.value));

    // ---- LOGO UPLOAD SYSTEM (File from computer + URL) ----

    // Helper: set logo image on preview
    function setLogoPreview(src) {
        const logoImg = document.getElementById('brandAvatarPreview');
        if (logoImg) logoImg.src = src;
        showToast('Logo güncellendi. Kaydetmek için "Değişiklikleri kaydet" butonuna basın.');
    }

    // "Bilgisayardan Yükle" button → trigger hidden file input
    const selectAvatarFileBtn = document.getElementById('selectAvatarFileBtn');
    const brandLogoFileInput = document.getElementById('brandLogoFileInput');

    if (selectAvatarFileBtn && brandLogoFileInput) {
        selectAvatarFileBtn.addEventListener('click', () => {
            brandLogoFileInput.click();
        });
        brandLogoFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            if (!file.type.startsWith('image/')) {
                showToast('Lütfen geçerli bir görsel dosyası seçin.', true);
                return;
            }
            const reader = new FileReader();
            reader.onload = (ev) => {
                setLogoPreview(ev.target.result);
            };
            reader.readAsDataURL(file);
            // Reset input so same file can be re-selected
            brandLogoFileInput.value = '';
        });
    }

    // Clicking on the avatar preview circle also triggers file picker
    const avatarPreviewWrapper = document.getElementById('avatarPreviewWrapper');
    if (avatarPreviewWrapper && brandLogoFileInput) {
        avatarPreviewWrapper.addEventListener('click', () => brandLogoFileInput.click());
        // Hover effect
        avatarPreviewWrapper.addEventListener('mouseenter', () => {
            const overlay = avatarPreviewWrapper.querySelector('.avatar-hover-overlay');
            const icon = avatarPreviewWrapper.querySelector('.fa-camera');
            if (overlay) overlay.style.background = 'rgba(0,0,0,0.45)';
            if (icon) icon.style.opacity = '1';
        });
        avatarPreviewWrapper.addEventListener('mouseleave', () => {
            const overlay = avatarPreviewWrapper.querySelector('.avatar-hover-overlay');
            const icon = avatarPreviewWrapper.querySelector('.fa-camera');
            if (overlay) overlay.style.background = 'rgba(0,0,0,0)';
            if (icon) icon.style.opacity = '0';
        });
    }

    // "URL ile Ekle" button → prompt for URL
    const selectAvatarBtn = document.getElementById('selectAvatarBtn');
    if (selectAvatarBtn) {
        selectAvatarBtn.addEventListener('click', () => {
            const url = prompt('Logo görsel URL\'sini girin (Unsplash, CDN veya doğrudan link):');
            if (url && url.trim()) {
                setLogoPreview(url.trim());
            }
        });
    }

    // ---- ADD BRAND MODAL ----
    const addBrandModal = document.getElementById('addBrandModal');

    function openAddBrandModal() {
        if (!addBrandModal) return;
        // Reset form
        const form = document.getElementById('addBrandForm');
        if (form) form.reset();
        const preview = document.getElementById('newBrandLogoPreview');
        const urlInput = document.getElementById('newBrandLogoUrl');
        const defaultLogo = 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=150&q=80';
        if (preview) preview.src = defaultLogo;
        if (urlInput) urlInput.value = defaultLogo;

        addBrandModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    function closeAddBrandModal() {
        if (!addBrandModal) return;
        addBrandModal.classList.add('hidden');
        document.body.style.overflow = '';
    }

    // Open modal triggers
    const sandAddBrand = document.getElementById('sandAddBrand');
    if (sandAddBrand) {
        sandAddBrand.addEventListener('click', () => {
            // Close sandwich menu first
            const sandwichDropdown = document.getElementById('sandwichDropdown');
            if (sandwichDropdown) sandwichDropdown.classList.add('hidden');
            openAddBrandModal();
        });
    }

    // Close modal triggers
    const addBrandModalClose = document.getElementById('addBrandModalClose');
    const addBrandModalCancelBtn = document.getElementById('addBrandModalCancelBtn');
    if (addBrandModalClose) addBrandModalClose.addEventListener('click', closeAddBrandModal);
    if (addBrandModalCancelBtn) addBrandModalCancelBtn.addEventListener('click', closeAddBrandModal);

    // Close on backdrop click
    if (addBrandModal) {
        addBrandModal.addEventListener('click', (e) => {
            if (e.target === addBrandModal) closeAddBrandModal();
        });
    }

    // Modal logo: file upload support
    const newBrandLogoFileInput = document.getElementById('newBrandLogoFileInput');
    const newBrandLogoFileBtn = document.getElementById('newBrandLogoFileBtn');
    const newBrandLogoWrapper = document.getElementById('newBrandLogoWrapper');

    function setModalLogoPreview(src) {
        const preview = document.getElementById('newBrandLogoPreview');
        const urlInput = document.getElementById('newBrandLogoUrl');
        if (preview) preview.src = src;
        if (urlInput) urlInput.value = src;
    }

    if (newBrandLogoFileBtn && newBrandLogoFileInput) {
        newBrandLogoFileBtn.addEventListener('click', () => newBrandLogoFileInput.click());
        newBrandLogoFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => setModalLogoPreview(ev.target.result);
            reader.readAsDataURL(file);
            newBrandLogoFileInput.value = '';
        });
    }

    // Clicking the logo preview circle also picks a file
    if (newBrandLogoWrapper && newBrandLogoFileInput) {
        newBrandLogoWrapper.addEventListener('click', () => newBrandLogoFileInput.click());
    }

    // "URL Gir" button (modal)
    const newBrandLogoBtn = document.getElementById('newBrandLogoBtn');
    if (newBrandLogoBtn) {
        newBrandLogoBtn.addEventListener('click', () => {
            const url = prompt('Logo URL\'si girin (Unsplash, CDN veya doğrudan görsel linki):');
            if (url && url.trim()) setModalLogoPreview(url.trim());
        });
    }

    // Add Brand Form Submit
    const addBrandForm = document.getElementById('addBrandForm');
    if (addBrandForm) {
        addBrandForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const nameInput = document.getElementById('newBrandName');
            const name = nameInput ? nameInput.value.trim() : '';
            if (!name) {
                showToast('Lütfen bir marka adı girin.', true);
                return;
            }

            const getVal = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };

            const newBrand = {
                id: generateBrandId(),
                name: name,
                logo: getVal('newBrandLogoUrl') || 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=150&q=80',
                industry: getVal('newBrandIndustry'),
                payment: getVal('newBrandPayment'),
                currency: (document.getElementById('newBrandCurrency') || {}).value || 'TL',
                requirements: getVal('newBrandRequirements'),
                meetingDate: getVal('newBrandMeetingDate'),
                zoomLink: getVal('newBrandZoomLink'),
                onboarding: { step1: false, step2: false, step3: false, step4: false },
                muhasebe: { monthlyAmount: getVal('newBrandPayment'), currency: (document.getElementById('newBrandCurrency') || {}).value || 'TL', paymentDay: 1, entries: [] },
                crm: { contactName: '', contactTitle: '', phone: '', email: '', whatsapp: '', address: '', notes: [] }
            };

            brandsData.push(newBrand);
            saveBrandsToStorage(brandsData);
            rebuildBrandDropdown(brandsData, newBrand.id);

            // Switch to new brand
            const sel = document.getElementById('brandSelect');
            if (sel) sel.value = newBrand.id;
            populateBrandForm(newBrand);

            closeAddBrandModal();
            showToast(`✅ "${name}" markası başarıyla eklendi! Marka Ayarları sekmesinden düzenleyebilirsiniz.`);
        });
    }

    // ---- HEADER "MARKA EKLE" BUTTON FIX ----
    const btnAddBrandHeader = document.getElementById('btnAddBrandHeader');
    if (btnAddBrandHeader) {
        btnAddBrandHeader.addEventListener('click', openAddBrandModal);
    }
    // Also wire .btn-add-brand class (catches any others)
    document.querySelectorAll('.btn-add-brand').forEach(btn => {
        if (btn.id !== 'btnAddBrandHeader') {
            btn.addEventListener('click', openAddBrandModal);
        }
    });

    // ---- GO TO MUHASEBE TAB shortcuts ----
    document.querySelectorAll('.goto-muhasebe-tab').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            const muhBtn = document.querySelector('[data-settings-tab="muhasebe-config"]');
            if (muhBtn) muhBtn.click();
        });
    });

    // ---- CRM NOTE ADD BUTTON shortcut ----
    const addCrmNoteBtn = document.getElementById('addCrmNoteBtn');
    if (addCrmNoteBtn) {
        addCrmNoteBtn.addEventListener('click', () => {
            const inp = document.getElementById('crmNoteText');
            if (inp) inp.focus();
        });
    }

    // ============================================================
    // MUHASEBE (ACCOUNTING) SYSTEM
    // ============================================================

    const CURRENCY_SYMBOLS = { TL: '₺', USD: '$', EUR: '€', GBP: '£' };

    function formatMoney(amount, currency) {
        const sym = CURRENCY_SYMBOLS[currency] || currency;
        return `${sym}${Number(amount).toLocaleString('tr-TR')}`;
    }

    function getCurrentBrandId() {
        const sel = document.getElementById('brandSelect');
        return sel ? sel.value : 'global';
    }

    function getCurrentBrand() {
        return brandsData.find(b => b.id === getCurrentBrandId());
    }

    function renderMuhasebeSummary(brand) {
        if (!brand) return;
        const m = brand.muhasebe || { monthlyAmount: brand.payment || 0, currency: brand.currency || 'TL', paymentDay: 1, entries: [] };
        const currency = m.currency || brand.currency || 'TL';

        // Set form values
        const monthlyInput = document.getElementById('muhMonthlyInput');
        const currSel = document.getElementById('muhCurrencySelect');
        const dayInput = document.getElementById('muhPaymentDay');
        if (monthlyInput) monthlyInput.value = m.monthlyAmount || brand.payment || '';
        if (currSel) currSel.value = currency;
        if (dayInput) dayInput.value = m.paymentDay || 1;

        // Summary display
        const muhMonthlyAmount = document.getElementById('muhMonthlyAmount');
        if (muhMonthlyAmount) muhMonthlyAmount.textContent = m.monthlyAmount ? formatMoney(m.monthlyAmount, currency) : '—';

        // Brand summary card
        const summaryDisp = document.getElementById('brandPaymentSummaryDisplay');
        if (summaryDisp) summaryDisp.textContent = m.monthlyAmount ? formatMoney(m.monthlyAmount, currency) : '—';

        const entries = m.entries || [];
        const paid = entries.filter(e => e.status === 'odendi');
        const pending = entries.filter(e => e.status !== 'odendi');
        const paidTotal = paid.reduce((s, e) => s + Number(e.amount || 0), 0);
        const pendingTotal = pending.reduce((s, e) => s + Number(e.amount || 0), 0);

        const muhCollectedAmount = document.getElementById('muhCollectedAmount');
        const muhCollectedCount = document.getElementById('muhCollectedCount');
        const muhPendingAmount = document.getElementById('muhPendingAmount');
        const muhPendingCount = document.getElementById('muhPendingCount');
        if (muhCollectedAmount) muhCollectedAmount.textContent = paidTotal ? formatMoney(paidTotal, currency) : '—';
        if (muhCollectedCount) muhCollectedCount.textContent = `${paid.length} ödeme`;
        if (muhPendingAmount) muhPendingAmount.textContent = pendingTotal ? formatMoney(pendingTotal, currency) : '—';
        if (muhPendingCount) muhPendingCount.textContent = `${pending.length} ödeme`;

        renderPaymentHistory(entries, currency);
    }

    function renderPaymentHistory(entries, currency) {
        const container = document.getElementById('paymentHistoryList');
        if (!container) return;
        if (!entries || entries.length === 0) {
            container.innerHTML = `<div style="padding:32px; text-align:center; color:#94a3b8;">
                <i class="fa-solid fa-receipt" style="font-size:32px; margin-bottom:10px; display:block; opacity:0.4;"></i>
                <p style="font-size:12px; font-weight:600; margin:0;">Henüz ödeme kaydı yok. "Ödeme Kaydı Ekle" butonuyla ekleyin.</p>
            </div>`;
            return;
        }
        const sorted = [...entries].sort((a, b) => new Date(b.date) - new Date(a.date));
        container.innerHTML = sorted.map((e, i) => {
            const statusMap = {
                odendi: { label: 'Ödendi', bg: '#dcfce7', color: '#166534', icon: 'fa-check-circle' },
                bekliyor: { label: 'Bekliyor', bg: '#fef3c7', color: '#92400e', icon: 'fa-clock' },
                gecikti: { label: 'Gecikmiş', bg: '#fee2e2', color: '#991b1b', icon: 'fa-exclamation-circle' }
            };
            const st = statusMap[e.status] || statusMap['bekliyor'];
            const dateStr = e.date ? new Date(e.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
            return `<div style="display:flex; align-items:center; gap:12px; padding:12px 16px; border-bottom:1px solid #f1f5f9; transition:background 0.15s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">
                <div style="flex:1;">
                    <div style="font-size:12.5px; font-weight:700; color:#1e293b;">${e.description || 'Aylık Ödeme'}</div>
                    <div style="font-size:11px; color:#94a3b8; font-weight:600; margin-top:2px;">${dateStr}</div>
                </div>
                <div style="font-size:14px; font-weight:800; color:#1e293b;">${formatMoney(e.amount, currency)}</div>
                <div style="background:${st.bg}; color:${st.color}; font-size:10px; font-weight:800; padding:3px 10px; border-radius:20px; white-space:nowrap;">
                    <i class="fa-solid ${st.icon}"></i> ${st.label}
                </div>
                <button onclick="deleteMuhasebeEntry(${i})" style="background:none; border:none; color:#94a3b8; cursor:pointer; font-size:13px; padding:4px;" title="Sil"><i class="fa-solid fa-trash-can"></i></button>
            </div>`;
        }).join('');
    }

    window.deleteMuhasebeEntry = function(index) {
        const brand = getCurrentBrand();
        if (!brand || !brand.muhasebe) return;
        const sorted = [...brand.muhasebe.entries].sort((a, b) => new Date(b.date) - new Date(a.date));
        const entryToDelete = sorted[index];
        brand.muhasebe.entries = brand.muhasebe.entries.filter(e => e !== entryToDelete);
        saveBrandsToStorage(brandsData);
        renderMuhasebeSummary(brand);
        showToast('Ödeme kaydı silindi.');
    };

    // Save Muhasebe settings
    const saveMuhasebeBtn = document.getElementById('saveMuhasebeBtn');
    if (saveMuhasebeBtn) {
        saveMuhasebeBtn.addEventListener('click', () => {
            const brand = getCurrentBrand();
            if (!brand) return;
            if (!brand.muhasebe) brand.muhasebe = { entries: [] };
            const monthlyInput = document.getElementById('muhMonthlyInput');
            const currSel = document.getElementById('muhCurrencySelect');
            const dayInput = document.getElementById('muhPaymentDay');
            brand.muhasebe.monthlyAmount = monthlyInput ? monthlyInput.value : '';
            brand.muhasebe.currency = currSel ? currSel.value : 'TL';
            brand.muhasebe.paymentDay = dayInput ? Number(dayInput.value) : 1;
            // Sync to main brand fields too
            brand.payment = brand.muhasebe.monthlyAmount;
            brand.currency = brand.muhasebe.currency;
            saveBrandsToStorage(brandsData);
            renderMuhasebeSummary(brand);
            showToast('💰 Muhasebe ayarları kaydedildi.');
        });
    }

    // Add payment entry modal (inline prompt approach)
    const addPaymentEntryBtn = document.getElementById('addPaymentEntryBtn');
    if (addPaymentEntryBtn) {
        addPaymentEntryBtn.addEventListener('click', () => {
            const brand = getCurrentBrand();
            if (!brand) return;
            if (!brand.muhasebe) brand.muhasebe = { entries: [] };
            const currency = brand.muhasebe.currency || brand.currency || 'TL';
            const monthlyAmt = brand.muhasebe.monthlyAmount || brand.payment || '';

            const amount = prompt(`Ödeme tutarı (${CURRENCY_SYMBOLS[currency] || currency}):`, monthlyAmt);
            if (!amount || isNaN(Number(amount))) return;

            const description = prompt('Açıklama:', 'Aylık Hizmet Bedeli') || 'Aylık Hizmet Bedeli';
            const dateInput = prompt('Tarih (YYYY-MM-DD):', new Date().toISOString().slice(0, 10));
            const status = prompt('Durum (odendi / bekliyor / gecikti):', 'odendi') || 'odendi';

            brand.muhasebe.entries.push({ amount: Number(amount), description, date: dateInput || new Date().toISOString().slice(0, 10), status });
            saveBrandsToStorage(brandsData);
            renderMuhasebeSummary(brand);
            showToast('✅ Ödeme kaydı eklendi.');
        });
    }

    // ============================================================
    // CRM SYSTEM
    // ============================================================

    function renderCrmData(brand) {
        if (!brand) return;
        const crm = brand.crm || {};
        const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
        setVal('crmContactName', crm.contactName);
        setVal('crmContactTitle', crm.contactTitle);
        setVal('crmPhone', crm.phone);
        setVal('crmEmail', crm.email);
        setVal('crmWhatsapp', crm.whatsapp);
        setVal('crmAddress', crm.address);
        renderCrmNotes(crm.notes || []);
        updateCrmActionLinks(crm);
    }

    function updateCrmActionLinks(crm) {
        const phoneBtn = document.getElementById('crmPhoneCallBtn');
        const emailBtn = document.getElementById('crmEmailBtn');
        const waBtn = document.getElementById('crmWhatsappBtn');
        if (phoneBtn) phoneBtn.href = crm.phone ? `tel:${crm.phone}` : '#';
        if (emailBtn) emailBtn.href = crm.email ? `mailto:${crm.email}` : '#';
        if (waBtn) waBtn.href = crm.whatsapp ? `https://wa.me/${crm.whatsapp.replace(/\D/g, '')}` : '#';
    }

    function renderCrmNotes(notes) {
        const container = document.getElementById('crmNotesList');
        const countEl = document.getElementById('crmNoteCount');
        if (!container) return;
        if (countEl) countEl.textContent = `${notes.length} not`;
        if (notes.length === 0) {
            container.innerHTML = `<div style="padding:28px; text-align:center; color:#94a3b8;">
                <i class="fa-solid fa-comments" style="font-size:28px; display:block; margin-bottom:8px; opacity:0.3;"></i>
                <p style="font-size:12px; font-weight:600; margin:0;">Henüz iletişim notu yok.</p>
            </div>`;
            return;
        }
        const typeIcons = { telefon: '📞', email: '✉️', whatsapp: '💬', toplanti: '🎥', not: '📝', gorev: '✅' };
        const typeBg = { telefon: '#dcfce7', email: '#ede9fe', whatsapp: '#dcfce7', toplanti: '#dbeafe', not: '#fef9c3', gorev: '#d1fae5' };
        container.innerHTML = [...notes].reverse().map((n, revIdx) => {
            const idx = notes.length - 1 - revIdx;
            const icon = typeIcons[n.type] || '📝';
            const bg = typeBg[n.type] || '#f1f5f9';
            const dateStr = n.date ? new Date(n.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
            return `<div style="display:flex; align-items:flex-start; gap:10px; padding:12px 16px; border-bottom:1px solid #f1f5f9;">
                <div style="background:${bg}; border-radius:8px; width:32px; height:32px; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:14px;">${icon}</div>
                <div style="flex:1; min-width:0;">
                    <div style="font-size:12.5px; font-weight:600; color:#1e293b; word-break:break-word;">${n.text}</div>
                    <div style="font-size:10.5px; color:#94a3b8; font-weight:600; margin-top:3px;">${dateStr}</div>
                </div>
                <button onclick="deleteCrmNote(${idx})" style="background:none; border:none; color:#cbd5e1; cursor:pointer; font-size:12px; padding:2px; flex-shrink:0;" title="Sil"><i class="fa-solid fa-xmark"></i></button>
            </div>`;
        }).join('');
    }

    window.deleteCrmNote = function(index) {
        const brand = getCurrentBrand();
        if (!brand || !brand.crm) return;
        brand.crm.notes.splice(index, 1);
        saveBrandsToStorage(brandsData);
        renderCrmNotes(brand.crm.notes || []);
        showToast('Not silindi.');
    };

    // Add CRM note submit
    const addCrmNoteSubmitBtn = document.getElementById('addCrmNoteSubmitBtn');
    if (addCrmNoteSubmitBtn) {
        addCrmNoteSubmitBtn.addEventListener('click', () => {
            const brand = getCurrentBrand();
            if (!brand) return;
            if (!brand.crm) brand.crm = { notes: [] };
            const typeEl = document.getElementById('crmNoteType');
            const textEl = document.getElementById('crmNoteText');
            const text = textEl ? textEl.value.trim() : '';
            if (!text) { showToast('Lütfen bir not girin.', true); return; }
            brand.crm.notes.push({ type: typeEl ? typeEl.value : 'not', text, date: new Date().toISOString() });
            saveBrandsToStorage(brandsData);
            renderCrmNotes(brand.crm.notes);
            if (textEl) textEl.value = '';
            showToast('✅ İletişim notu eklendi.');
        });
    }

    // Also allow Enter key in CRM note input
    const crmNoteText = document.getElementById('crmNoteText');
    if (crmNoteText) {
        crmNoteText.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const btn = document.getElementById('addCrmNoteSubmitBtn');
                if (btn) btn.click();
            }
        });
    }

    // Live CRM link updates
    ['crmPhone', 'crmEmail', 'crmWhatsapp'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', () => {
                const brand = getCurrentBrand();
                if (!brand) return;
                if (!brand.crm) brand.crm = {};
                if (id === 'crmPhone') brand.crm.phone = el.value;
                if (id === 'crmEmail') brand.crm.email = el.value;
                if (id === 'crmWhatsapp') brand.crm.whatsapp = el.value;
                updateCrmActionLinks(brand.crm);
            });
        }
    });

    // Save CRM data
    const saveCrmBtn = document.getElementById('saveCrmBtn');
    if (saveCrmBtn) {
        saveCrmBtn.addEventListener('click', () => {
            const brand = getCurrentBrand();
            if (!brand) return;
            if (!brand.crm) brand.crm = { notes: [] };
            const getVal = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
            brand.crm.contactName = getVal('crmContactName');
            brand.crm.contactTitle = getVal('crmContactTitle');
            brand.crm.phone = getVal('crmPhone');
            brand.crm.email = getVal('crmEmail');
            brand.crm.whatsapp = getVal('crmWhatsapp');
            brand.crm.address = getVal('crmAddress');
            saveBrandsToStorage(brandsData);
            updateCrmActionLinks(brand.crm);
            showToast('👥 CRM bilgileri kaydedildi.');
        });
    }

    // ---- EXTEND populateBrandForm to include Muhasebe + CRM ----
    const _origPopulate = populateBrandForm;
    function populateBrandFormExtended(brand) {
        _origPopulate(brand);
        renderMuhasebeSummary(brand);
        renderCrmData(brand);
        if (typeof renderCustomBrandDropdown === 'function') {
            renderCustomBrandDropdown();
        }
        if (typeof syncConnectionStatus === 'function') {
            syncConnectionStatus();
        }
    }

    // Initialize muhasebe/crm if missing on any brand
    brandsData.forEach(b => {
        if (!b.muhasebe) b.muhasebe = { monthlyAmount: b.payment || '', currency: b.currency || 'TL', paymentDay: 1, entries: [] };
        if (!b.crm) b.crm = { contactName: '', contactTitle: '', phone: '', email: '', whatsapp: '', address: '', notes: [] };
    });
    saveBrandsToStorage(brandsData);

    // Wire single brand dropdown change listener
    if (brandDropdown) {
        brandDropdown.addEventListener('change', () => {
            const brand = brandsData.find(b => b.id === brandDropdown.value);
            if (brand) populateBrandFormExtended(brand);
        });
    }

    // Initial render for active brand
    populateBrandFormExtended(brandsData[0]);

});





    