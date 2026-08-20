/* =========================================================
   CARECONNECT — SETTINGS DASHBOARD & TRANSLATION ENGINE
   Supports:
   1. 🌐 Language Translation Tool (Hindi, Bengali, Marathi, Telugu, Tamil, English)
   2. 🌗 Theme (Light, Dark, System Default)
   3. 🎨 Accent Color (Blue, Teal, Purple, Green, Custom Color Picker)
   4. 🔤 Font & Text Size (Small, Medium, Large, Extra Large)
   5. ✨ Animations (Enabled, Reduced Motion, Disabled)
   6. 🧭 Navigation Style (Expanded, Icon Only)
   7. ♿ Contrast & Accessibility
   8. 🚨 Emergency UI Appearance
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    initSettingsManager();
});

function initSettingsManager() {
    loadSavedSettings();
    attachSettingsButtonListener();
}

function loadSavedSettings() {
    const saved = localStorage.getItem("cc_appearance_settings");
    if (!saved) return;
    try {
        const settings = JSON.parse(saved);
        applySettingsToDOM(settings);
    } catch (e) {}
}

function applySettingsToDOM(settings) {
    if (!settings) return;

    if (settings.theme) document.documentElement.setAttribute("data-theme", settings.theme);
    
    let accentHex = "#00d2b3";
    let accentDark = "#00a896";
    let accentLight = "#e6faf7";
    let accentGlow = "rgba(0, 210, 179, 0.25)";

    if (settings.accent === "blue") {
        accentHex = "#2563eb";
        accentDark = "#1d4ed8";
        accentLight = "#eff6ff";
        accentGlow = "rgba(37, 99, 235, 0.25)";
    } else if (settings.accent === "purple") {
        accentHex = "#7c5dfa";
        accentDark = "#6c46fa";
        accentLight = "#f3f0ff";
        accentGlow = "rgba(124, 93, 250, 0.25)";
    } else if (settings.accent === "green") {
        accentHex = "#10b981";
        accentDark = "#059669";
        accentLight = "#ecfdf5";
        accentGlow = "rgba(16, 185, 129, 0.25)";
    } else if (settings.accent === "custom" && settings.customAccent) {
        accentHex = settings.customAccent;
        accentDark = settings.customAccent;
        accentLight = "rgba(0, 210, 179, 0.15)";
        accentGlow = "rgba(0, 210, 179, 0.25)";
    }

    document.documentElement.style.setProperty("--accent-color", accentHex);
    document.documentElement.style.setProperty("--accent-dark", accentDark);
    document.documentElement.style.setProperty("--accent-light", accentLight);
    document.documentElement.style.setProperty("--accent-glow", accentGlow);
    document.documentElement.style.setProperty("--accent-gradient", `linear-gradient(90deg, #061838 0%, ${accentHex} 100%)`);
    document.documentElement.setAttribute("data-accent", settings.accent || "teal");

    if (settings.fontSize) document.documentElement.setAttribute("data-font-size", settings.fontSize);
    if (settings.navStyle) document.documentElement.setAttribute("data-nav-style", settings.navStyle);
    if (settings.highContrast) document.documentElement.setAttribute("data-high-contrast", "true");
    else document.documentElement.removeAttribute("data-high-contrast");
}

function attachSettingsButtonListener() {
    const btn = document.getElementById("settingsButton");
    if (btn) {
        btn.addEventListener("click", openSettingsModal);
    }
}

function openSettingsModal() {
    let modal = document.getElementById("settingsModal");
    if (!modal) {
        modal = createSettingsModalDOM();
        document.body.appendChild(modal);
    }
    modal.classList.add("show");
}

function closeSettingsModal() {
    const modal = document.getElementById("settingsModal");
    if (modal) modal.classList.remove("show");
}

function createSettingsModalDOM() {
    const modal = document.createElement("div");
    modal.id = "settingsModal";
    modal.className = "settings-modal-overlay";

    const currentLang = localStorage.getItem("cc_language") || "en";
    const saved = localStorage.getItem("cc_appearance_settings");
    const settings = saved ? JSON.parse(saved) : {
        theme: 'light',
        accent: 'teal',
        customAccent: '#00d2b3',
        fontSize: 'medium',
        animations: 'enabled',
        navStyle: 'expanded',
        highContrast: false,
        largerButtons: false
    };

    modal.innerHTML = `
        <div class="settings-modal-card">
            
            <!-- HEADER -->
            <div class="settings-modal-header">
                <h3><i class="fa-solid fa-gear" style="color:var(--accent-color, #00d2b3);"></i> Settings & Preferences</h3>
                <button type="button" class="settings-close-btn" onclick="closeSettingsModal()">&times;</button>
            </div>

            <!-- BODY -->
            <div class="settings-modal-body">
                
                <!-- 1. LANGUAGE TRANSLATION TOOL (6 LANGUAGES) -->
                <div class="setting-card-block">
                    <div class="setting-card-title">
                        <span>🌐 1. Language Translation Tool</span>
                    </div>
                    <p style="font-size:0.85rem; color:#64748b; margin-bottom:12px;">
                        Select your preferred native language to translate all CareConnect dashboards instantly:
                    </p>
                    <div class="option-buttons-row">
                        <button type="button" class="option-btn-pill ${currentLang === 'en' ? 'active' : ''}" onclick="selectLanguage('en', this)">🇬🇧 English</button>
                        <button type="button" class="option-btn-pill ${currentLang === 'hi' ? 'active' : ''}" onclick="selectLanguage('hi', this)">🇮🇳 हिंदी (Hindi)</button>
                        <button type="button" class="option-btn-pill ${currentLang === 'bn' ? 'active' : ''}" onclick="selectLanguage('bn', this)">🇮🇳 বাংলা (Bengali)</button>
                        <button type="button" class="option-btn-pill ${currentLang === 'mr' ? 'active' : ''}" onclick="selectLanguage('mr', this)">🇮🇳 मराठी (Marathi)</button>
                        <button type="button" class="option-btn-pill ${currentLang === 'te' ? 'active' : ''}" onclick="selectLanguage('te', this)">🇮🇳 తెలుగు (Telugu)</button>
                        <button type="button" class="option-btn-pill ${currentLang === 'ta' ? 'active' : ''}" onclick="selectLanguage('ta', this)">🇮🇳 தமிழ் (Tamil)</button>
                    </div>
                </div>

                <!-- 2. THEME MODE -->
                <div class="setting-card-block">
                    <div class="setting-card-title">
                        <span>🌗 2. Theme Mode</span>
                    </div>
                    <div class="option-buttons-row">
                        <button type="button" class="option-btn-pill ${settings.theme === 'light' ? 'active' : ''}" onclick="updateAppearance('theme', 'light', this)">☀️ Light Mode</button>
                        <button type="button" class="option-btn-pill ${settings.theme === 'dark' ? 'active' : ''}" onclick="updateAppearance('theme', 'dark', this)">🌙 Dark Mode</button>
                        <button type="button" class="option-btn-pill ${settings.theme === 'system' ? 'active' : ''}" onclick="updateAppearance('theme', 'system', this)">🌓 System Default</button>
                    </div>
                </div>

                <!-- 3. DYNAMIC ACCENT COLOR WITH CUSTOM PICKER -->
                <div class="setting-card-block">
                    <div class="setting-card-title">
                        <span>🎨 3. Accent Color</span>
                    </div>
                    <div class="option-buttons-row">
                        <button type="button" class="option-btn-pill ${settings.accent === 'blue' ? 'active' : ''}" onclick="updateAppearance('accent', 'blue', this)">
                            <span style="width:14px;height:14px;border-radius:50%;background:#2563eb;display:inline-block;"></span> Blue
                        </button>
                        <button type="button" class="option-btn-pill ${settings.accent === 'teal' || !settings.accent ? 'active' : ''}" onclick="updateAppearance('accent', 'teal', this)">
                            <span style="width:14px;height:14px;border-radius:50%;background:#00d2b3;display:inline-block;"></span> Teal
                        </button>
                        <button type="button" class="option-btn-pill ${settings.accent === 'purple' ? 'active' : ''}" onclick="updateAppearance('accent', 'purple', this)">
                            <span style="width:14px;height:14px;border-radius:50%;background:#7c5dfa;display:inline-block;"></span> Purple
                        </button>
                        <button type="button" class="option-btn-pill ${settings.accent === 'green' ? 'active' : ''}" onclick="updateAppearance('accent', 'green', this)">
                            <span style="width:14px;height:14px;border-radius:50%;background:#10b981;display:inline-block;"></span> Green
                        </button>

                        <!-- CUSTOM COLOR PICKER BUTTON -->
                        <button type="button" class="option-btn-pill ${settings.accent === 'custom' ? 'active' : ''}" id="customAccentBtn" onclick="activateCustomColor(this)">
                            🎨 Custom: 
                            <input type="color" id="customColorInput" value="${settings.customAccent || '#00d2b3'}" style="width:24px; height:24px; border:none; border-radius:50%; cursor:pointer; background:transparent;" onchange="handleCustomColorChange(this.value)">
                        </button>
                    </div>
                </div>

                <!-- 4. FONT & TEXT -->
                <div class="setting-card-block">
                    <div class="setting-card-title">
                        <span>🔤 4. Font & Text Size</span>
                    </div>
                    <div class="option-buttons-row">
                        <button type="button" class="option-btn-pill ${settings.fontSize === 'small' ? 'active' : ''}" onclick="updateAppearance('fontSize', 'small', this)">Small</button>
                        <button type="button" class="option-btn-pill ${settings.fontSize === 'medium' || !settings.fontSize ? 'active' : ''}" onclick="updateAppearance('fontSize', 'medium', this)">Medium</button>
                        <button type="button" class="option-btn-pill ${settings.fontSize === 'large' ? 'active' : ''}" onclick="updateAppearance('fontSize', 'large', this)">Large</button>
                        <button type="button" class="option-btn-pill ${settings.fontSize === 'xlarge' ? 'active' : ''}" onclick="updateAppearance('fontSize', 'xlarge', this)">Extra Large</button>
                    </div>
                </div>

                <!-- 5. ANIMATIONS -->
                <div class="setting-card-block">
                    <div class="setting-card-title">
                        <span>✨ 5. Animations & Motion</span>
                    </div>
                    <div class="option-buttons-row">
                        <button type="button" class="option-btn-pill ${settings.animations === 'enabled' || !settings.animations ? 'active' : ''}" onclick="updateAppearance('animations', 'enabled', this)">● Enabled</button>
                        <button type="button" class="option-btn-pill ${settings.animations === 'reduced' ? 'active' : ''}" onclick="updateAppearance('animations', 'reduced', this)">○ Reduced Motion</button>
                        <button type="button" class="option-btn-pill ${settings.animations === 'disabled' ? 'active' : ''}" onclick="updateAppearance('animations', 'disabled', this)">○ Disabled</button>
                    </div>
                </div>

                <!-- 6. NAVIGATION STYLE -->
                <div class="setting-card-block">
                    <div class="setting-card-title">
                        <span>🧭 6. Navigation Sidebar Style</span>
                    </div>
                    <div class="option-buttons-row">
                        <button type="button" class="option-btn-pill ${settings.navStyle === 'expanded' || !settings.navStyle ? 'active' : ''}" onclick="updateAppearance('navStyle', 'expanded', this)">● Expanded</button>
                        <button type="button" class="option-btn-pill ${settings.navStyle === 'icon-only' ? 'active' : ''}" onclick="updateAppearance('navStyle', 'icon-only', this)">○ Icon Only</button>
                    </div>
                </div>

                <!-- 7. CONTRAST & ACCESSIBILITY -->
                <div class="setting-card-block">
                    <div class="setting-card-title">
                        <span>♿ 7. Contrast & Accessibility</span>
                    </div>
                    <div class="checkbox-group-grid">
                        <label class="checkbox-label-card">
                            <input type="checkbox" ${settings.highContrast ? 'checked' : ''} onchange="toggleAccessibilitySetting('highContrast', this.checked)">
                            <span>High Contrast</span>
                        </label>
                        <label class="checkbox-label-card">
                            <input type="checkbox" ${settings.largerButtons ? 'checked' : ''} onchange="toggleAccessibilitySetting('largerButtons', this.checked)">
                            <span>Larger Buttons</span>
                        </label>
                    </div>
                </div>

            </div>

            <!-- FOOTER -->
            <div class="settings-modal-footer">
                <button type="button" class="option-btn-pill" onclick="resetAppearanceDefaults()">Reset Defaults</button>
                <button type="button" class="btn-gradient-submit" style="padding:10px 22px;" onclick="saveAppearanceSettings()">
                    <i class="fa-solid fa-floppy-disk"></i> Save Changes
                </button>
            </div>

        </div>
    `;

    return modal;
}

function selectLanguage(langCode, btnEl) {
    if (btnEl && btnEl.parentElement) {
        btnEl.parentElement.querySelectorAll('.option-btn-pill').forEach(b => b.classList.remove('active'));
        btnEl.classList.add('active');
    }
    if (typeof window.translatePage === "function") {
        window.translatePage(langCode);
    }
}

function updateAppearance(key, value, btnEl) {
    if (btnEl && btnEl.parentElement) {
        btnEl.parentElement.querySelectorAll('.option-btn-pill').forEach(b => b.classList.remove('active'));
        btnEl.classList.add('active');
    }

    const saved = localStorage.getItem("cc_appearance_settings");
    let settings = saved ? JSON.parse(saved) : {};
    settings[key] = value;
    localStorage.setItem("cc_appearance_settings", JSON.stringify(settings));
    applySettingsToDOM(settings);
}

function activateCustomColor(btnEl) {
    const input = document.getElementById("customColorInput");
    const val = input ? input.value : "#00d2b3";
    handleCustomColorChange(val);

    if (btnEl && btnEl.parentElement) {
        btnEl.parentElement.querySelectorAll('.option-btn-pill').forEach(b => b.classList.remove('active'));
        btnEl.classList.add('active');
    }
}

function handleCustomColorChange(hexColor) {
    const saved = localStorage.getItem("cc_appearance_settings");
    let settings = saved ? JSON.parse(saved) : {};
    settings.accent = "custom";
    settings.customAccent = hexColor;
    localStorage.setItem("cc_appearance_settings", JSON.stringify(settings));
    applySettingsToDOM(settings);
}

function toggleAccessibilitySetting(key, isChecked) {
    const saved = localStorage.getItem("cc_appearance_settings");
    let settings = saved ? JSON.parse(saved) : {};
    settings[key] = isChecked;
    localStorage.setItem("cc_appearance_settings", JSON.stringify(settings));
    applySettingsToDOM(settings);
}

function saveAppearanceSettings() {
    closeSettingsModal();
    if (typeof showToastNotification === 'function') {
        showToastNotification('Settings Saved', 'Language and appearance preferences updated live!', 'success');
    }
}

function resetAppearanceDefaults() {
    localStorage.removeItem("cc_appearance_settings");
    localStorage.removeItem("cc_language");
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-accent");
    document.documentElement.removeAttribute("data-font-size");
    document.documentElement.removeAttribute("data-nav-style");
    document.documentElement.style.removeProperty("--accent-color");
    document.documentElement.style.removeProperty("--accent-dark");
    document.documentElement.style.removeProperty("--accent-light");
    document.documentElement.style.removeProperty("--accent-glow");
    document.documentElement.style.removeProperty("--accent-gradient");
    if (typeof window.translatePage === "function") {
        window.translatePage("en");
    }
    closeSettingsModal();
    if (typeof showToastNotification === 'function') {
        showToastNotification('Settings Reset', 'Appearance & Language reset to English defaults.', 'info');
    }
}
