/* =========================================================
   CARECONNECT — RESIDENT DASHBOARD JAVASCRIPT
   Handles dynamic DB counts (4/3/3/3/3), SOS alerts, localized dates, search, drawer & quick modals
   With Toast Popup Notifications & Flowchart Integration
   ========================================================= */

const getApiBaseUrl = () => {
    if (typeof window !== "undefined" && window.location.port === "8000") {
        return "";
    }
    return "http://127.0.0.1:8000";
};

window.API_BASE_URL = window.API_BASE_URL || getApiBaseUrl();
var API_BASE_URL = window.API_BASE_URL;

document.addEventListener("DOMContentLoaded", async () => {
    if (typeof verifySessionAndRole === "function") {
        const user = await verifySessionAndRole("resident");
        if (!user) return;
    }
    initDateTime();
    initCommunityCounts();
    initRecentAlerts();
    initNotificationCount();
    initSOS();
    initSearchAndDrawer();
    if (typeof initSettingsManager === "function") initSettingsManager();
});

/* ================= AUTH & USER HELPER ================= */
function getAccessToken() {
    return localStorage.getItem("access_token") || sessionStorage.getItem("access_token") || null;
}

function getSavedUser() {
    const userData = localStorage.getItem("user") || sessionStorage.getItem("user");
    if (!userData) return null;
    try {
        return JSON.parse(userData);
    } catch (e) {
        return null;
    }
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

async function apiRequest(endpoint, options = {}) {
    const token = getAccessToken();
    const headers = {
        "Accept": "application/json",
        ...(options.headers || {})
    };
    if (options.body) headers["Content-Type"] = "application/json";
    if (token) headers["Authorization"] = `Bearer ${token}`;

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, { credentials: "include", ...options, headers });
        if (response.status === 401) return null;
        if (!response.ok) return null;
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            return await response.json();
        }
        return null;
    } catch (err) {
        return null;
    }
}

/* ================= USER INFORMATION & AVATAR SYNC ================= */
async function initUserInformation() {
    const savedUser = getSavedUser();
    let user = savedUser;

    const customAvatar = localStorage.getItem("user_avatar");
    if (customAvatar) {
        const topbarAvatar = document.getElementById("userAvatarImg");
        if (topbarAvatar) topbarAvatar.src = customAvatar;
    }

    const backendUser = await apiRequest("/api/auth/me/");
    if (backendUser) user = backendUser;

    if (user) {
        const firstName = user.first_name || user.firstName || "";
        const lastName = user.last_name || user.lastName || "";
        const username = user.username || "User";
        const fullName = `${firstName} ${lastName}`.trim() || username;
        const role = user.role || user.user_type || "Resident";

        setText("welcomeUserName", fullName);
        setText("topbarUserName", fullName);
        setText("topbarUserRole", role.charAt(0).toUpperCase() + role.slice(1));
    }
}

/* ================= LOCALIZED DATE & TIME ================= */
function initDateTime() {
    updateDateTime();
    setInterval(updateDateTime, 1000);
}

function updateDateTime() {
    const now = new Date();
    const optionsDate = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    const langMap = { en: 'en-US', hi: 'hi-IN', bn: 'bn-IN', mr: 'mr-IN', te: 'te-IN', ta: 'ta-IN' };
    const currentLang = document.documentElement.lang || localStorage.getItem('cc_language') || 'en';
    const locale = langMap[currentLang] || 'en-US';
    const dateFormatted = now.toLocaleDateString(locale, optionsDate);
    
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const timeFormatted = `${hours}:${minutes} ${ampm}`;

    setText("currentDate", dateFormatted);
    setText("currentTime", timeFormatted);
}

window.updateDateTime = updateDateTime;

/* ================= EXACT DATABASE RECORD COUNTS ================= */
async function initCommunityCounts() {
    try {
        const statsData = await apiRequest("/api/dashboard/admin-stats/");
        if (statsData && statsData.stats) {
            setText("residentCount", statsData.stats.resident_count ?? 0);
            setText("guardianCount", statsData.stats.guardian_count ?? 0);
            setText("volunteerCount", statsData.stats.volunteer_count ?? 0);
            setText("securityCount", statsData.stats.security_count ?? 0);
            setText("activeAlertCount", statsData.stats.active_alerts_count ?? 0);
            return;
        }
    } catch (e) {}

    let resCount = await fetchCountFromAPI("/api/users/list/?role=residents", "residents");
    let guardCount = await fetchCountFromAPI("/api/users/list/?role=guardians", "guardians");
    let volCount = await fetchCountFromAPI("/api/users/list/?role=volunteers", "volunteers");
    let secCount = await fetchCountFromAPI("/api/users/list/?role=security", "security");
    let alertCount = await fetchCountFromAPI("/api/emergency/list/", "active_alerts");

    setText("residentCount", resCount);
    setText("guardianCount", guardCount);
    setText("volunteerCount", volCount);
    setText("securityCount", secCount);
    setText("activeAlertCount", alertCount);
}

window.initCommunityCounts = initCommunityCounts;

async function fetchCountFromAPI(endpoint, localKey) {
    const data = await apiRequest(endpoint);
    if (data) {
        if (localKey === "active_alerts" && data.stats) {
            return data.stats.active_alerts_count || 0;
        }
        if (data.records && Array.isArray(data.records)) {
            return data.records.length;
        }
        if (typeof data.count === "number") return data.count;
        if (Array.isArray(data)) return data.length;
    }
    const stored = localStorage.getItem(`cc_${localKey}_data`);
    if (stored) {
        try {
            return JSON.parse(stored).length;
        } catch (e) {}
    }
    return 0;
}

/* ================= RECENT ALERTS (DYNAMIC DB + EMPTY STATE) ================= */
async function initRecentAlerts() {
    const container = document.getElementById("recentAlertsList");
    if (!container) return;

    const lang = localStorage.getItem("cc_language") || "en";

    let alerts = [];
    try {
        const res = await fetch(`${API_BASE_URL}/api/emergency/list/`, { credentials: "include" });
        if (res.ok) {
            const data = await res.json();
            if (data.records) alerts = data.records;
        }
    } catch(e) {}

    if (!alerts || alerts.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:28px 12px; background:#f8fafc; border-radius:14px; border:1px dashed #cbd5e1; margin-top:8px;">
                <i class="fa-regular fa-bell-slash" style="font-size:2rem; color:#94a3b8; margin-bottom:8px; display:block;"></i>
                <strong style="display:block; font-size:0.92rem; color:#334155; margin-bottom:2px;">${typeof getTranslationText === 'function' ? getTranslationText('no_recent_alerts', lang) : 'No Recent Alerts'}</strong>
                <span style="font-size:0.8rem; color:#64748b;">${typeof getTranslationText === 'function' ? getTranslationText('no_alerts_sub', lang) : 'Stay safe, stay connected.'}</span>
            </div>
        `;
        return;
    }

    container.innerHTML = "";
    alerts.slice(0, 3).forEach(alert => {
        const item = document.createElement("div");
        item.className = "alert-feed-item";
        const isActive = alert.status === "Active" || alert.status === "ACTIVE" || alert.status === "PENDING";
        const isCancel = (alert.status || "").toUpperCase().includes("CANCEL");

        let typeKey = "type_medical";
        if ((alert.type || "").toLowerCase().includes("fire")) typeKey = "type_fire";
        else if ((alert.type || "").toLowerCase().includes("security")) typeKey = "type_security";

        const translatedType = typeof getTranslationText === 'function' ? getTranslationText(typeKey, lang) : (alert.type || 'Emergency SOS');

        let statusKey = isActive ? "status_active" : (isCancel ? "status_cancelled" : "status_resolved");
        const translatedStatus = typeof getTranslationText === 'function' ? getTranslationText(statusKey, lang) : (isActive ? 'Active' : 'Resolved');

        const iconClass = typeKey === "type_medical" ? "fa-heart-pulse text-red bg-red-light" : 
                          typeKey === "type_security" ? "fa-shield-cat text-blue bg-blue-light" : "fa-handshake-angle text-orange bg-orange-light";

        item.innerHTML = `
            <div class="alert-feed-icon ${iconClass}"><i class="fa-solid ${iconClass.split(' ')[0]}"></i></div>
            <div class="alert-feed-info">
                <strong>${translatedType}</strong>
                <span>${alert.location || 'Block A, Flat 101'}</span>
            </div>
            <span class="status-pill ${isActive ? 'status-active' : (isCancel ? 'status-cancelled' : 'status-resolved')}">${translatedStatus}</span>
        `;
        container.appendChild(item);
    });
}

let userNotifications = [];

async function initNotificationCount() {
    try {
        const res = await fetch(`${API_BASE_URL}/api/notifications/`, { credentials: "include" });
        if (res.ok) {
            const data = await res.json();
            if (data.notifications) userNotifications = data.notifications;
        }
    } catch(e) {}

    const badge = document.getElementById("notificationCount");
    if (badge) {
        badge.textContent = userNotifications.length > 0 ? userNotifications.length : "0";
    }
}

function toggleNotificationsPopover(e) {
    if (e && e.stopPropagation) e.stopPropagation();
    let popover = document.getElementById("notificationPopover");
    if (!popover) {
        popover = document.createElement("div");
        popover.id = "notificationPopover";
        popover.style.cssText = "position:fixed; top:70px; right:70px; width:340px; background:#ffffff; border-radius:20px; box-shadow:0 20px 45px rgba(0,0,0,0.15); border:1px solid #e2e8f0; z-index:99999; padding:20px; display:none;";
        document.body.appendChild(popover);
    }

    if (popover.style.display === "block") {
        popover.style.display = "none";
        return;
    }

    let contentHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; border-bottom:1.5px solid #f1f5f9; padding-bottom:10px;">
            <h4 style="font-size:0.98rem; font-weight:800; margin:0; color:#0f172a;"><i class="fa-solid fa-bell text-teal me-2"></i>Notifications</h4>
            <span style="font-size:0.78rem; font-weight:700; color:#64748b;">${userNotifications.length} items</span>
        </div>
    `;

    if (!userNotifications || userNotifications.length === 0) {
        contentHTML += `
            <div style="text-align:center; padding:24px 16px; color:#64748b; background:#f8fafc; border-radius:14px; border:1px dashed #cbd5e1;">
                <i class="fa-regular fa-bell-slash" style="font-size:2rem; color:#94a3b8; margin-bottom:10px; display:block;"></i>
                <strong style="display:block; font-size:0.92rem; color:#334155; margin-bottom:2px;">No Recent Notifications</strong>
                <span style="font-size:0.8rem; color:#64748b;">There are no recent notifications</span>
            </div>
        `;
    } else {
        contentHTML += `<div style="max-height:260px; overflow-y:auto;">`;
        userNotifications.forEach(notif => {
            contentHTML += `
                <div style="padding:10px; border-bottom:1px solid #f1f5f9; font-size:0.85rem;">
                    <strong style="color:#0f172a; display:block;">${notif.title || 'Notification'}</strong>
                    <span style="color:#64748b;">${notif.message || notif.text}</span>
                </div>
            `;
        });
        contentHTML += `</div>`;
    }

    popover.innerHTML = contentHTML;
    popover.style.display = "block";

    const closeHandler = function (evt) {
        if (!popover.contains(evt.target) && !evt.target.closest("#notificationBtn")) {
            popover.style.display = "none";
            document.removeEventListener("click", closeHandler);
        }
    };
    setTimeout(() => document.addEventListener("click", closeHandler), 10);
}

/* ================= SOS ACTIVATION & CONFIRMATION MODAL ================= */
function initSOS() {
    const mainSosBtn = document.getElementById("mainSosButton");
    if (mainSosBtn) {
        mainSosBtn.addEventListener("click", () => {
            if (typeof promptSosConfirmation === "function") {
                promptSosConfirmation();
            } else if (typeof triggerOneTapSOS === "function") {
                triggerOneTapSOS();
            }
        });
    }
}

function openSosCategoryModal() {
    let modal = document.getElementById("sosConfirmModal");
    if (typeof openSosConfirmationModal === "function") {
        openSosConfirmationModal("Medical");
        return;
    }
    if (!modal) {
        modal = createSosCategoryModalDOM();
        document.body.appendChild(modal);
    }
    modal.classList.add("show");
}

function closeSosCategoryModal() {
    const modal = document.getElementById("sosCategoryModal") || document.getElementById("sosConfirmModal");
    if (modal) modal.classList.remove("show");
}

function createSosCategoryModalDOM() {
    const modal = document.createElement("div");
    modal.id = "sosConfirmModal";
    modal.className = "settings-modal-overlay";
    modal.style.cssText = "position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(15,23,42,0.7); display:none; align-items:center; justify-content:center; z-index:9999;";
    modal.innerHTML = `
        <div class="settings-modal-content" style="background:#ffffff; border-radius:24px; max-width:440px; width:90%; padding:32px; text-align:center;">
            <div style="font-size:3.5rem; margin-bottom:12px;">🚨</div>
            <h2 style="color:#ef4444; font-size:1.6rem; font-weight:900; margin-bottom:8px;">EMERGENCY SOS</h2>
            <p style="font-size:1.05rem; color:#334155; font-weight:600; margin-bottom:24px;">Are you sure you want to send an SOS alert?</p>
            <div style="display:flex; gap:12px; justify-content:center;">
                <button type="button" class="btn btn-secondary" onclick="closeSosConfirmModal()" style="padding:10px 24px; border-radius:12px; font-weight:700;">DECLINE</button>
                <button type="button" class="btn btn-danger" onclick="submitSosConfirm('Medical')" style="padding:10px 24px; border-radius:12px; font-weight:700; background:#dc2626; border:none;">CONFIRM SOS</button>
            </div>
        </div>
    `;
    return modal;
}

function triggerCategorySOS(category) {
    if (typeof submitSosConfirm === "function") {
        submitSosConfirm(category);
    }
}

function initSearchAndDrawer() {
    const searchInput = document.getElementById("dashboardSearch");
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            const query = e.target.value.toLowerCase().trim();
            if (query.length > 2 && typeof filterModuleList === "function") {
                filterModuleList(query);
            }
        });
    }
}
