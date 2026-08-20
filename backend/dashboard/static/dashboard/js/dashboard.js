/* ==========================================
   CARECONNECT DASHBOARD JS & SETTINGS & SEARCH
========================================== */

document.addEventListener("DOMContentLoaded", function () {

    // Load notification counts on page load
    loadNavbarNotifications();

    // Load stored settings on load
    loadSavedSettings();

    /* ===============================
       CURRENT DATE
    =============================== */
    const dateEl = document.getElementById("todayDate");
    if (dateEl) {
        const today = new Date();
        dateEl.innerHTML = today.toLocaleDateString("en-IN", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        });
    }

    /* ===============================
       SIDEBAR TOGGLE
    =============================== */
    const sidebarToggleBtn = document.getElementById("sidebarToggleBtn");
    const sidebar = document.querySelector(".sidebar");
    if (sidebarToggleBtn && sidebar) {
        sidebarToggleBtn.addEventListener("click", function() {
            if (sidebar.style.display === "none") {
                sidebar.style.display = "flex";
            } else {
                sidebar.style.display = "none";
            }
        });
    }
});

/* ==========================================
   NAVBAR NOTIFICATIONS LOADER & DROPDOWN
========================================== */
function loadNavbarNotifications() {
    fetch("/api/notifications/")
        .then(res => res.json())
        .then(data => {
            const countBadge = document.getElementById("notificationCountBadge");
            const dropdownBadge = document.getElementById("notifDropdownBadge");
            const dropdownContent = document.getElementById("notificationDropdownContent");

            const count = data.unread_count || 0;
            const notifs = data.notifications || [];

            if (countBadge) countBadge.innerText = count;
            if (dropdownBadge) dropdownBadge.innerText = `${count} New`;

            if (!dropdownContent) return;

            if (notifs.length === 0) {
                dropdownContent.innerHTML = `
                    <div class="p-4 text-center text-muted">
                        <i class="fa-regular fa-bell-slash fs-3 d-block mb-2 text-secondary opacity-50"></i>
                        <p class="fw-bold mb-0 text-dark small">No Notifications Available</p>
                        <span class="small text-muted">You're all caught up!</span>
                    </div>
                `;
            } else {
                let html = '<div class="list-group list-group-flush">';
                notifs.forEach(n => {
                    html += `
                        <div class="list-group-item p-3 border-bottom ${n.is_read ? 'bg-light' : 'bg-white'}" onclick="markNotifRead(${n.id}, this)">
                            <div class="d-flex align-items-center justify-content-between mb-1">
                                <strong class="small text-dark fw-bold">${escapeHtml(n.title)}</strong>
                                <span class="text-muted" style="font-size:0.7rem;">${n.created_at}</span>
                            </div>
                            <p class="small text-secondary m-0 mb-1" style="font-size:0.8rem; line-height:1.3;">${escapeHtml(n.message)}</p>
                            ${!n.is_read ? '<span class="badge bg-danger rounded-pill float-end" style="font-size:0.65rem;">New</span>' : ''}
                        </div>
                    `;
                });
                html += '</div>';
                dropdownContent.innerHTML = html;
            }
        })
        .catch(err => {
            const dropdownContent = document.getElementById("notificationDropdownContent");
            if (dropdownContent) {
                dropdownContent.innerHTML = `
                    <div class="p-4 text-center text-muted">
                        <i class="fa-regular fa-bell-slash fs-3 d-block mb-2 text-secondary opacity-50"></i>
                        <p class="fw-bold mb-0 text-dark small">No Notifications Available</p>
                        <span class="small text-muted">You're all caught up!</span>
                    </div>
                `;
            }
        });
}

function markNotifRead(id, el) {
    fetch(`/api/notifications/${id}/read/`, { method: "POST" })
        .then(() => {
            el.classList.remove('bg-white');
            el.classList.add('bg-light');
            const badge = el.querySelector('.badge');
            if (badge) badge.remove();
        });
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/* ==========================================
   NAVBAR LIVE SEARCH
========================================== */
function handleNavbarSearch(query) {
    const resultsBox = document.getElementById("navbarSearchResults");
    if (!resultsBox) return;

    query = query.trim().toLowerCase();
    if (query.length === 0) {
        resultsBox.style.display = "none";
        resultsBox.innerHTML = "";
        return;
    }

    const searchableItems = [
        { title: "Dashboard Overview", category: "Navigation", icon: "fa-house", link: "/dashboard/resident/" },
        { title: "My Profile Information", category: "Account", icon: "fa-user", link: "/profile/" },
        { title: "My Guardians List", category: "Safety", icon: "fa-user-shield", link: "/my-guardians/" },
        { title: "Emergency SOS Control", category: "Emergency", icon: "fa-circle-exclamation", link: "#sosSection" },
        { title: "Emergency History Logs", category: "History", icon: "fa-clock-rotate-left", link: "/emergency/" },
        { title: "Settings & Preferences", category: "Settings", icon: "fa-gear", action: "openSettings" },
        { title: "Help & Support Helpline", category: "Support", icon: "fa-circle-question", action: "openSupport" },
        { title: "Medical Emergency Alert", category: "Emergency", icon: "fa-kit-medical", link: "/emergency/" },
        { title: "Security Alert & Intrusion", category: "Emergency", icon: "fa-shield-halved", link: "/emergency/" }
    ];

    const matches = searchableItems.filter(item => 
        item.title.toLowerCase().includes(query) || item.category.toLowerCase().includes(query)
    );

    if (matches.length === 0) {
        resultsBox.innerHTML = `
            <div class="p-3 text-center text-muted small">
                No matching results found for "${escapeHtml(query)}"
            </div>
        `;
    } else {
        let html = '';
        matches.forEach(m => {
            if (m.link) {
                html += `
                    <a href="${m.link}" class="d-flex align-items-center justify-content-between p-2.5 px-3 text-decoration-none text-dark border-bottom hover-bg-light">
                        <div class="d-flex align-items-center gap-2">
                            <i class="fa-solid ${m.icon} text-primary fs-6"></i>
                            <span class="fw-bold small">${m.title}</span>
                        </div>
                        <span class="badge bg-light text-secondary border small">${m.category}</span>
                    </a>
                `;
            } else if (m.action === 'openSettings') {
                html += `
                    <div onclick="var modal = new bootstrap.Modal(document.getElementById('settingsModal')); modal.show();" 
                         class="d-flex align-items-center justify-content-between p-2.5 px-3 text-dark border-bottom cursor-pointer hover-bg-light">
                        <div class="d-flex align-items-center gap-2">
                            <i class="fa-solid ${m.icon} text-primary fs-6"></i>
                            <span class="fw-bold small">${m.title}</span>
                        </div>
                        <span class="badge bg-light text-secondary border small">${m.category}</span>
                    </div>
                `;
            }
        });
        resultsBox.innerHTML = html;
    }
    resultsBox.style.display = "block";
}

document.addEventListener("click", function(e) {
    const resultsBox = document.getElementById("navbarSearchResults");
    const searchInput = document.getElementById("navbarSearchInput");
    if (resultsBox && searchInput && !resultsBox.contains(e.target) && !searchInput.contains(e.target)) {
        resultsBox.style.display = "none";
    }
});

/* ==========================================
   SETTINGS & PREFERENCES (Matching Pic 2)
========================================== */
const TRANSLATIONS = {
    hi: {
        "Welcome back,": "पुनः स्वागत है,",
        "Dashboard": "डैशबोर्ड",
        "Profile": "प्रोफ़ाइल",
        "My Guardians": "मेरे अभिभावक",
        "Emergency Alerts": "आपातकालीन अलर्ट",
        "Emergency History": "आपातकालीन इतिहास",
        "Notifications": "सूचनाएं",
        "Settings": "सेटिंग्स",
        "Need Help? Tap the SOS Button": "सहायता चाहिए? एसओएस बटन दबाएं",
        "Current Status": "वर्तमान स्थिति",
        "All Good": "सब ठीक है",
        "Recent Emergency Alerts": "हाल के आपातकालीन अलर्ट",
        "Quick Actions": "त्वरित कार्रवाई"
    },
    bn: {
        "Welcome back,": "পুনরায় স্বাগতম,",
        "Dashboard": "ড্যাশবোর্ড",
        "Profile": "প্রোফাইল",
        "My Guardians": "আমার অভিভাবক",
        "Emergency Alerts": "জরুরী সতর্কতা",
        "Emergency History": "জরুরী ইতিহাস",
        "Notifications": "বিজ্ঞপ্তি",
        "Settings": "সেটিংস",
        "Need Help? Tap the SOS Button": "সাহায্য দরকার? SOS বোতামে চাপুন",
        "Current Status": "বর্তমান অবস্থা",
        "All Good": "সব ঠিক আছে",
        "Recent Emergency Alerts": "সাম্প্রতিক জরুরী সতর্কতা",
        "Quick Actions": "দ্রুত পদক্ষেপ"
    },
    mr: {
        "Welcome back,": "पुन्हा स्वागत आहे,",
        "Dashboard": "डॅशबोर्ड",
        "Profile": "प्रोफाईल",
        "My Guardians": "माझे पालक",
        "Emergency Alerts": "आणीबाणी अलर्ट",
        "Emergency History": "आणीबाणी इतिहास",
        "Notifications": "सूचना",
        "Settings": "सेटिंग्ज",
        "Need Help? Tap the SOS Button": "मदत हवी आहे? SOS बटण दाबा",
        "Current Status": "सध्याची स्थिती",
        "All Good": "सर्व ठीक आहे",
        "Recent Emergency Alerts": "अलीकडील आणीबाणी अलर्ट",
        "Quick Actions": "जलद कृती"
    },
    te: {
        "Welcome back,": "మళ్ళీ స్వాగతం,",
        "Dashboard": "డాష్‌బోర్డ్",
        "Profile": "ప్రొఫైల్",
        "My Guardians": "నా సంరక్షకులు",
        "Emergency Alerts": "అత్యవసర హెచ్చరికలు",
        "Emergency History": "అత్యవసర చరిత్ర",
        "Notifications": "నోటిఫికేషన్‌లు",
        "Settings": "సెట్టింగ్‌లు",
        "Need Help? Tap the SOS Button": "సహాయం కావాలా? SOS బటన్‌ను నొక్కండి",
        "Current Status": "ప్రస్తుత స్థితి",
        "All Good": "అంతా బాగుంది",
        "Recent Emergency Alerts": "ఇటీవలి అత్యవసర హెచ్చరికలు",
        "Quick Actions": "త్వరిత చర్యలు"
    },
    ta: {
        "Welcome back,": "மீண்டும் வருக,",
        "Dashboard": "டேஷ்போர்டு",
        "Profile": "சுயவிவரம்",
        "My Guardians": "என் பாதுகாவலர்கள்",
        "Emergency Alerts": "அவசர எச்சரிக்கைகள்",
        "Emergency History": "அவசர வரலாறு",
        "Notifications": "அறிவிப்புகள்",
        "Settings": "அமைப்புகள்",
        "Need Help? Tap the SOS Button": "உதவி தேவையா? SOS பொத்தானைத் தட்டவும்",
        "Current Status": "தற்போதைய நிலை",
        "All Good": "எல்லாம் நன்று",
        "Recent Emergency Alerts": "சமீபத்திய அவசர எச்சரிக்கைகள்",
        "Quick Actions": "விரைவான చర్యகள்"
    }
};

let activeLang = 'en';
let activeTheme = 'light';
let activeAccent = '#10b981';

function setAppLanguage(lang, btn) {
    activeLang = lang;
    if (btn) {
        document.querySelectorAll('#langSelectorGroup .lang-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    }
    applyLanguageTranslations(lang);
}

function setAppTheme(theme, btn) {
    activeTheme = theme;
    if (btn) {
        document.querySelectorAll('#themeSelectorGroup .theme-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    }
    if (theme === 'dark') {
        document.body.classList.add('bg-dark', 'text-white');
        document.body.style.background = "#0f172a";
    } else {
        document.body.classList.remove('bg-dark', 'text-white');
        document.body.style.background = "#f8fafc";
    }
}

function setAppAccent(color, btn) {
    activeAccent = color;
    if (btn) {
        document.querySelectorAll('#accentSelectorGroup .accent-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    }
    document.documentElement.style.setProperty('--primary-color', color);
    const picker = document.getElementById("customColorPicker");
    if (picker) picker.value = color;
}

function saveSettingsPreferences() {
    localStorage.setItem("careconnect_lang", activeLang);
    localStorage.setItem("careconnect_theme", activeTheme);
    localStorage.setItem("careconnect_accent", activeAccent);

    // Close modal
    const modalEl = document.getElementById("settingsModal");
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();

    alert("⚙️ Settings Saved Successfully!");
}

function resetSettingsDefaults() {
    setAppLanguage('en', document.querySelector('[data-lang="en"]'));
    setAppTheme('light', document.querySelector('[data-theme="light"]'));
    setAppAccent('#10b981', document.querySelector('[data-accent="#10b981"]'));
    localStorage.clear();
    alert("Settings reset to defaults!");
}

function loadSavedSettings() {
    const savedLang = localStorage.getItem("careconnect_lang");
    const savedTheme = localStorage.getItem("careconnect_theme");
    const savedAccent = localStorage.getItem("careconnect_accent");

    if (savedLang) {
        const btn = document.querySelector(`[data-lang="${savedLang}"]`);
        setAppLanguage(savedLang, btn);
    }
    if (savedTheme) {
        const btn = document.querySelector(`[data-theme="${savedTheme}"]`);
        setAppTheme(savedTheme, btn);
    }
    if (savedAccent) {
        const btn = document.querySelector(`[data-accent="${savedAccent}"]`);
        setAppAccent(savedAccent, btn);
    }
}

function applyLanguageTranslations(lang) {
    if (lang === 'en' || !TRANSLATIONS[lang]) return;
    const dict = TRANSLATIONS[lang];

    const elements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, span, a, label, strong, p');
    elements.forEach(el => {
        const text = el.innerText ? el.innerText.trim() : '';
        if (dict[text]) {
            el.innerText = dict[text];
        }
    });
}