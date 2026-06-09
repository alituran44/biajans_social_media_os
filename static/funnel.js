/* Onboarding Funnel JS Controller */
document.addEventListener('DOMContentLoaded', () => {
    // Pricing configurations (Market Tailored Pricing in TL)
    const PRICING_PLANS = {
        starter: {
            name: 'Başlangıç / Solo',
            prices: { monthly: 12500, halfYearly: 9900, yearly: 7500 },
            periods: { monthly: 'Aylık', halfYearly: '6 Aylık', yearly: 'Yıllık' }
        },
        growth: {
            name: 'Growth / Pro',
            prices: { monthly: 27500, halfYearly: 22000, yearly: 16500 },
            periods: { monthly: 'Aylık', halfYearly: '6 Aylık', yearly: 'Yıllık' }
        },
        agency: {
            name: 'Enterprise / Corporate',
            prices: { monthly: 59500, halfYearly: 47500, yearly: 35500 },
            periods: { monthly: 'Aylık', halfYearly: '6 Aylık', yearly: 'Yıllık' }
        }
    };

    // Central state object
    const state = {
        currentStep: 1,
        brandName: '',
        brandIndustry: '',
        channels: [],
        budget: '',
        pricingPlan: 'growth',    // starter, growth, agency
        pricingCycle: 'monthly',   // monthly, halfYearly, yearly
    };

    // DOM Elements
    const stepViews = document.querySelectorAll('.funnel-step-view');
    const stepDots = document.querySelectorAll('.step-dot');
    const stepLineProgress = document.getElementById('stepLineProgress');
    const btnPrev = document.getElementById('btnPrev');
    const btnNext = document.getElementById('btnNext');
    const btnCheckoutSubmit = document.getElementById('btnCheckoutSubmit');
    const billingCycleToggle = document.getElementById('billingCycleToggle');
    const mainBillingCycleToggle = document.getElementById('mainBillingCycleToggle');
    const cycleLabels = document.querySelectorAll('.pricing-cycle-label');

    // Industry logos
    const INDUSTRY_LOGOS = {
        'Gıda & İçecek': 'https://images.unsplash.com/photo-1511920170033-f8396924c348?w=150&q=80',
        'Sağlık & Spor': 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=150&q=80',
        'E-Ticaret': 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=150&q=80',
        'Eğitim': 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=150&q=80',
        'Yazılım': 'https://images.unsplash.com/photo-1607799279861-4dd421887fb3?w=150&q=80',
        'Teknoloji': 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=150&q=80',
        'Moda & Giyim': 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=150&q=80',
        'Diğer': 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80'
    };

    // Initialize pricing displays
    updatePricingDisplay();
    goToStep(1);

    // Dynamic brand card preview setup
    const randomIdCode = 'M-' + Math.floor(10000 + Math.random() * 90000);
    const vBrandIdCode = document.getElementById('vBrandIdCode');
    if (vBrandIdCode) vBrandIdCode.textContent = 'ID: ' + randomIdCode;

    const nameInput = document.getElementById('funnelBrandName');
    const vName = document.getElementById('vBrandName');
    if (nameInput && vName) {
        nameInput.addEventListener('input', () => {
            vName.textContent = nameInput.value.trim() || 'Markanız';
        });
    }

    const indSelect = document.getElementById('funnelIndustry');
    const customIndGroup = document.getElementById('customIndustryGroup');
    const customIndInput = document.getElementById('funnelCustomIndustry');
    const vIndustry = document.getElementById('vBrandIndustry');
    const vLogo = document.getElementById('vBrandLogo');

    if (indSelect) {
        indSelect.addEventListener('change', () => {
            const val = indSelect.value;
            if (val === 'Diğer') {
                if (customIndGroup) customIndGroup.style.display = 'block';
                if (customIndInput) {
                    customIndInput.focus();
                    if (vIndustry) vIndustry.textContent = customIndInput.value.trim() || 'Diğer (Yazın...)';
                } else {
                    if (vIndustry) vIndustry.textContent = 'Diğer';
                }
                if (vLogo) {
                    vLogo.style.backgroundImage = `url('${INDUSTRY_LOGOS['Diğer']}')`;
                }
            } else {
                if (customIndGroup) customIndGroup.style.display = 'none';
                if (customIndInput) customIndInput.value = '';
                if (vIndustry) vIndustry.textContent = val;
                if (vLogo && INDUSTRY_LOGOS[val]) {
                    vLogo.style.backgroundImage = `url('${INDUSTRY_LOGOS[val]}')`;
                }
            }
        });
    }

    if (customIndInput && vIndustry) {
        customIndInput.addEventListener('input', () => {
            vIndustry.textContent = customIndInput.value.trim() || 'Diğer (Yazın...)';
        });
    }

    // Industry Card Grid selection handler
    document.querySelectorAll('.industry-card').forEach(card => {
        card.addEventListener('click', () => {
            document.querySelectorAll('.industry-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            
            const value = card.getAttribute('data-value');
            if (indSelect) {
                indSelect.value = value;
                // Dispatch change event to trigger existing UI sync logic
                indSelect.dispatchEvent(new Event('change'));
            }
        });
    });



    // Event: Channel Multi-Select
    document.querySelectorAll('.channel-card-checkbox').forEach(card => {
        card.addEventListener('click', () => {
            const checkbox = card.querySelector('input');
            const channelVal = checkbox.value;
            
            checkbox.checked = !checkbox.checked;
            
            if (checkbox.checked) {
                card.classList.add('selected');
                if (!state.channels.includes(channelVal)) {
                    state.channels.push(channelVal);
                }
            } else {
                card.classList.remove('selected');
                state.channels = state.channels.filter(c => c !== channelVal);
            }
        });
    });

    // Event: Budget Radio Selector
    document.querySelectorAll('.budget-card-radio').forEach(card => {
        card.addEventListener('click', () => {
            document.querySelectorAll('.budget-card-radio').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            
            const radio = card.querySelector('input');
            radio.checked = true;
            state.budget = radio.value;
        });
    });

    // Event: Billing Cycle Switcher Toggle (Shared Logic)
    function toggleBillingCycle() {
        if (state.pricingCycle === 'monthly') {
            state.pricingCycle = 'halfYearly';
        } else if (state.pricingCycle === 'halfYearly') {
            state.pricingCycle = 'yearly';
        } else {
            state.pricingCycle = 'monthly';
        }
        
        syncToggleUI();
        updatePricingDisplay();
    }

    function syncToggleUI() {
        const toggles = [billingCycleToggle, mainBillingCycleToggle];
        toggles.forEach(toggle => {
            if (!toggle) return;
            if (state.pricingCycle === 'monthly') {
                toggle.className = 'toggle-switch-container';
            } else if (state.pricingCycle === 'halfYearly') {
                toggle.className = 'toggle-switch-container half-yearly';
            } else {
                toggle.className = 'toggle-switch-container yearly';
            }
        });

        const labels = document.querySelectorAll('.pricing-cycle-label');
        labels.forEach(lbl => {
            if (lbl.getAttribute('data-cycle') === state.pricingCycle) {
                lbl.classList.add('active');
            } else {
                lbl.classList.remove('active');
            }
        });
    }

    if (billingCycleToggle) {
        billingCycleToggle.addEventListener('click', toggleBillingCycle);
    }
    if (mainBillingCycleToggle) {
        mainBillingCycleToggle.addEventListener('click', toggleBillingCycle);
    }

    // Event: Pricing Plan Card Selection (Wizard & Main Grid Sync)
    function selectPricingPlan(plan) {
        state.pricingPlan = plan;
        
        // Sync funnel step cards selection UI
        document.querySelectorAll('.pricing-card').forEach(c => {
            if (c.getAttribute('data-plan') === plan) {
                c.classList.add('selected');
            } else {
                c.classList.remove('selected');
            }
        });

        // Sync main pricing section cards selection UI
        document.querySelectorAll('.main-pricing-card').forEach(c => {
            if (c.getAttribute('data-plan') === plan) {
                c.classList.add('selected');
            } else {
                c.classList.remove('selected');
            }
        });
    }

    document.querySelectorAll('.pricing-card').forEach(card => {
        card.addEventListener('click', () => {
            selectPricingPlan(card.getAttribute('data-plan'));
        });
    });

    document.querySelectorAll('.main-pricing-card').forEach(card => {
        card.addEventListener('click', () => {
            selectPricingPlan(card.getAttribute('data-plan'));
            
            // Smooth scroll to the onboarding funnel section
            const funnelEl = document.getElementById('funnel');
            if (funnelEl) {
                funnelEl.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // Event: Footer Navigation Buttons
    if (btnNext) {
        btnNext.addEventListener('click', () => {
            if (validateStep(state.currentStep)) {
                goToStep(state.currentStep + 1);
            }
        });
    }

    if (btnPrev) {
        btnPrev.addEventListener('click', () => {
            goToStep(state.currentStep - 1);
        });
    }

    // Event: Complete Checkout Form
    if (btnCheckoutSubmit) {
        btnCheckoutSubmit.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Check consent check box
            const recurringConsent = document.getElementById('checkoutRecurringConsent');
            if (recurringConsent && !recurringConsent.checked) {
                alert('Ödemenin otomatik tahsil edilmesi ve Abonelik Sözleşmesi onayını işaretlemeniz gerekmektedir.');
                return;
            }
            
            if (validateStep(5)) {
                btnCheckoutSubmit.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Ödeme Onaylanıyor...';
                btnCheckoutSubmit.disabled = true;
                
                setTimeout(() => {
                    completeCheckoutAndLaunch();
                }, 2000);
            }
        });
    }

    // Sanal POS radio selector toggle active style
    const posOptions = document.querySelectorAll('.pos-option');
    posOptions.forEach(opt => {
        opt.addEventListener('click', (e) => {
            if (e.target.tagName === 'INPUT') {
                posOptions.forEach(o => {
                    o.classList.remove('active');
                    o.style.border = '1px solid var(--card-border)';
                    o.style.background = 'rgba(255, 255, 255, 0.01)';
                });
                opt.classList.add('active');
                opt.style.border = '1px solid var(--primary)';
                opt.style.background = 'var(--primary-glow)';
                return;
            }
            
            e.preventDefault();
            posOptions.forEach(o => {
                o.classList.remove('active');
                o.style.border = '1px solid var(--card-border)';
                o.style.background = 'rgba(255, 255, 255, 0.01)';
            });
            opt.classList.add('active');
            opt.style.border = '1px solid var(--primary)';
            opt.style.background = 'var(--primary-glow)';
            const radio = opt.querySelector('input[type="radio"]');
            if (radio) radio.checked = true;
        });
    });

    // Card preview dynamic sync
    const checkoutCardName = document.getElementById('checkoutCardName');
    const checkoutCardNum = document.getElementById('checkoutCardNum');
    const checkoutExpiry = document.getElementById('checkoutExpiry');

    if (checkoutCardName) {
        checkoutCardName.addEventListener('input', (e) => {
            const vCardName = document.getElementById('vCardName');
            if (vCardName) {
                vCardName.textContent = e.target.value.trim().toUpperCase() || 'AD SOYAD';
            }
        });
    }

    if (checkoutCardNum) {
        checkoutCardNum.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, ''); // Numbers only
            // Format card number: Add space every 4 digits
            const formatted = value.match(/.{1,4}/g)?.join(' ') || '';
            e.target.value = formatted.substring(0, 19);

            const vCardNumber = document.getElementById('vCardNumber');
            if (vCardNumber) {
                vCardNumber.textContent = formatted || '•••• •••• •••• ••••';
            }
        });
    }

    if (checkoutExpiry) {
        checkoutExpiry.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, ''); // Numbers only
            if (value.length > 2) {
                value = value.substring(0, 2) + '/' + value.substring(2, 4);
            }
            e.target.value = value.substring(0, 5);

            const vCardExpiry = document.getElementById('vCardExpiry');
            if (vCardExpiry) {
                vCardExpiry.textContent = e.target.value || 'AA/YY';
            }
        });
    }

    // Navigation Step Engine
    function goToStep(step) {
        state.currentStep = step;

        // Hide/Show step panels
        stepViews.forEach(view => {
            if (parseInt(view.getAttribute('data-step')) === step) {
                view.classList.add('active');
            } else {
                view.classList.remove('active');
            }
        });

        // Update circular indicators
        stepDots.forEach(dot => {
            const dotStep = parseInt(dot.getAttribute('data-step'));
            if (dotStep === step) {
                dot.className = 'step-dot active';
            } else if (dotStep < step) {
                dot.className = 'step-dot completed';
                dot.innerHTML = '<i class="fa-solid fa-check"></i>';
            } else {
                dot.className = 'step-dot';
                dot.innerHTML = dotStep;
            }
        });

        // Line progress width bar percentage
        if (stepLineProgress) {
            const percent = ((step - 1) / (stepDots.length - 1)) * 100;
            stepLineProgress.style.width = `${percent}%`;
        }

        // Configure footer navigation visibility
        if (step === 1) {
            btnPrev.classList.add('hidden');
        } else {
            btnPrev.classList.remove('hidden');
        }

        if (step === 5) {
            btnNext.classList.add('hidden');
            btnCheckoutSubmit.classList.remove('hidden');
            renderCheckoutSummary();
        } else {
            btnNext.classList.remove('hidden');
            btnCheckoutSubmit.classList.add('hidden');
        }
    }

    // Step Validation Engine
    function validateStep(step) {
        if (step === 1) {
            const nameEl = document.getElementById('funnelBrandName');
            const indEl = document.getElementById('funnelIndustry');
            state.brandName = nameEl ? nameEl.value.trim() : '';
            state.brandIndustry = indEl ? indEl.value : '';

            if (!state.brandName) {
                alert('Lütfen Markanızın Adını girin.');
                return false;
            }
            if (!state.brandIndustry) {
                alert('Lütfen sektörünüzü seçin.');
                return false;
            }
            if (state.brandIndustry === 'Diğer') {
                const customIndEl = document.getElementById('funnelCustomIndustry');
                const customVal = customIndEl ? customIndEl.value.trim() : '';
                if (!customVal) {
                    alert('Lütfen sektörünüzü yazın.');
                    return false;
                }
                state.brandIndustry = customVal;
            }
            return true;
        }

        if (step === 2) {
            if (state.channels.length === 0) {
                // Warn but allow proceeding (maybe they'll connect later)
                const proceed = confirm('Herhangi bir sosyal ağ seçmediniz. Devam etmek istiyor musunuz?');
                return proceed;
            }
            return true;
        }

        if (step === 3) {
            if (!state.budget) {
                alert('Lütfen reklam bütçenizi seçin.');
                return false;
            }
            return true;
        }

        if (step === 4) {
            if (!state.pricingPlan) {
                alert('Lütfen devam etmek için bir paket seçin.');
                return false;
            }
            return true;
        }

        if (step === 5) {
            const ccNum = document.getElementById('checkoutCardNum');
            const ccExpiry = document.getElementById('checkoutExpiry');
            const ccCvv = document.getElementById('checkoutCvv');
            
            if (!ccNum || !ccNum.value.trim()) {
                alert('Lütfen kart numaranızı girin.');
                return false;
            }
            if (!ccExpiry || !ccExpiry.value.trim()) {
                alert('Lütfen son kullanma tarihini girin.');
                return false;
            }
            if (!ccCvv || !ccCvv.value.trim() || ccCvv.value.trim().length < 3) {
                alert('Lütfen geçerli bir CVV kodu girin.');
                return false;
            }
            return true;
        }

        return true;
    }

    // Pricing Dynamic Value Updates
    function updatePricingDisplay() {
        const plans = ['starter', 'growth', 'agency'];
        plans.forEach(plan => {
            const price = PRICING_PLANS[plan].prices[state.pricingCycle];
            
            // Wizard pricing display elements
            const priceEl = document.getElementById(`price_${plan}`);
            const periodEl = document.getElementById(`period_${plan}`);
            if (priceEl) priceEl.textContent = `₺${price}`;
            if (periodEl) {
                if (state.pricingCycle === 'monthly') {
                    periodEl.textContent = 'TL / aylık';
                } else if (state.pricingCycle === 'halfYearly') {
                    periodEl.textContent = `TL / ay (6 aylık faturalandırılır)`;
                } else {
                    periodEl.textContent = `TL / ay (yıllık faturalandırılır)`;
                }
            }

            // Main landing page pricing display elements
            const mainPriceEl = document.getElementById(`main_price_${plan}`);
            const mainPeriodEl = document.getElementById(`main_period_${plan}`);
            if (mainPriceEl) mainPriceEl.textContent = `₺${price}`;
            if (mainPeriodEl) {
                if (state.pricingCycle === 'monthly') {
                    mainPeriodEl.textContent = 'TL / aylık';
                } else if (state.pricingCycle === 'halfYearly') {
                    mainPeriodEl.textContent = `TL / ay (6 aylık faturalandırılır)`;
                } else {
                    mainPeriodEl.textContent = `TL / ay (yıllık faturalandırılır)`;
                }
            }
        });
    }

    // Render payment summary before checkout submission
    function renderCheckoutSummary() {
        const planObj = PRICING_PLANS[state.pricingPlan];
        const monthlyRate = planObj.prices[state.pricingCycle];
        
        let multiplier = 1;
        let cycleText = 'Aylık Plan';
        if (state.pricingCycle === 'halfYearly') {
            multiplier = 6;
            cycleText = '6 Aylık Fatura Dönemi';
        } else if (state.pricingCycle === 'yearly') {
            multiplier = 12;
            cycleText = 'Yıllık Fatura Dönemi';
        }

        const totalBilled = monthlyRate * multiplier;

        const summaryPlanName = document.getElementById('summaryPlanName');
        const summaryCycleText = document.getElementById('summaryCycleText');
        const summaryRateText = document.getElementById('summaryRateText');
        const summaryBilledTotal = document.getElementById('summaryBilledTotal');

        if (summaryPlanName) summaryPlanName.textContent = `biAjans AI - ${planObj.name}`;
        if (summaryCycleText) summaryCycleText.textContent = cycleText;
        if (summaryRateText) summaryRateText.textContent = `₺${monthlyRate} / ay`;
        if (summaryBilledTotal) summaryBilledTotal.textContent = `₺${totalBilled.toLocaleString('tr-TR')}`;
    }

    // Create brand entry in local storage database and log in
    function completeCheckoutAndLaunch() {
        try {
            // Load existing brands array
            const BRANDS_KEY = 'biAjans_brands';
            let storedBrands = [];
            try {
                const stored = localStorage.getItem(BRANDS_KEY);
                storedBrands = stored ? JSON.parse(stored) : [];
            } catch (e) {
                storedBrands = [];
            }

            // Create unique ID
            const brandId = 'brand_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
            
            // Map industry logo
            const defaultLogo = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80';
            const brandLogo = INDUSTRY_LOGOS[state.brandIndustry] || defaultLogo;

            // Map selected ad budget values
            const budgetMap = {
                'starter': '4000',
                'growth': '12000',
                'premium': '30000',
                'enterprise': '80000'
            };
            const paymentAmount = budgetMap[state.budget] || '12000';

            // Get selected Sanal POS gateway
            const selectedPOSRadio = document.querySelector('input[name="checkoutPosSelect"]:checked');
            const selectedPOS = selectedPOSRadio ? selectedPOSRadio.value : 'PayTR';
            
            // Get consent checkbox
            const recurringConsentCheckbox = document.getElementById('checkoutRecurringConsent');
            const recurringConsent = recurringConsentCheckbox ? recurringConsentCheckbox.checked : true;

            // Get card info for preview in dashboard
            const cardNameInput = document.getElementById('checkoutCardName');
            const cardName = cardNameInput ? cardNameInput.value.trim() : 'ALİ TURAN';
            
            const cardNumInput = document.getElementById('checkoutCardNum');
            const cardNumVal = cardNumInput ? cardNumInput.value.replace(/\D/g, '') : '5642';
            const last4 = cardNumVal.substring(Math.max(0, cardNumVal.length - 4)) || '5642';
            
            const cardExpiryInput = document.getElementById('checkoutExpiry');
            const cardExpiryVal = cardExpiryInput ? cardExpiryInput.value.trim() : '12/28';

            // Create New Brand Object
            const newBrand = {
                id: brandId,
                name: state.brandName,
                logo: brandLogo,
                industry: state.brandIndustry,
                payment: paymentAmount,  // Ads budget mapped
                currency: 'TL',
                requirements: `Funnel onboarding üzerinden kuruldu. Bağlı platform hedefleri: ${state.channels.join(', ')}.`,
                meetingDate: '',
                zoomLink: '',
                posSettings: {
                    gateway: selectedPOS,
                    merchantId: selectedPOS === 'PayTR' ? '238491' : '987654',
                    apiKey: selectedPOS === 'PayTR' ? 'pk_live_51MszB6KSD9' : 'kolay_live_992384',
                    autoCharge: recurringConsent,
                    cardNumber: last4,
                    cardHolder: cardName,
                    cardExpiry: cardExpiryVal
                },
                onboarding: { 
                    step1: true,   // Profil tamamlandı
                    step2: false,  // Sosyal ağlar henüz bağlanmadı
                    step3: true,   // AI Kurulumu yapıldı (seçilen plan)
                    step4: false   // İlk kampanya planlanmadı
                },
                muhasebe: {
                    monthlyAmount: paymentAmount,
                    currency: 'TL',
                    paymentDay: 1,
                    entries: []
                },
                crm: {
                    contactName: '',
                    contactTitle: '',
                    phone: '',
                    email: '',
                    whatsapp: '',
                    address: '',
                    notes: []
                }
            };

            // Append brand and save
            storedBrands.push(newBrand);
            localStorage.setItem(BRANDS_KEY, JSON.stringify(storedBrands));

            // Set as active brand
            localStorage.setItem('biAjans_active_brand_id', brandId);

            // Redirect user to the dashboard with success parameter
            window.location.href = `dashboard.html?connected=checkout&status=success&brand=${brandId}`;

        } catch (e) {
            console.error('Funnel checkout execution error:', e);
            alert('Kurulum sırasında bir hata oluştu: ' + e.message);
            btnCheckoutSubmit.innerHTML = '<i class="fa-solid fa-credit-card"></i> Ödemeyi Tamamla';
            btnCheckoutSubmit.disabled = false;
        }
    }

    // FAQ Accordion click handlers
    document.querySelectorAll('.faq-question').forEach(q => {
        q.addEventListener('click', () => {
            const item = q.closest('.faq-item');
            const isActive = item.classList.contains('active');
            
            // Close all items
            document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));
            
            // If it wasn't active, open it
            if (!isActive) {
                item.classList.add('active');
            }
        });
    });

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetEl = document.querySelector(targetId);
            if (targetEl) {
                targetEl.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
});
