/* =========================================================
   CARECONNECT — GUARDIAN DASHBOARD MANAGER JAVASCRIPT
   100% Database-Driven Integration connected to Django Backend:
   - Session Authentication & Role Guard ("guardian")
   - Topbar: Avatar, User Name, Bell Popover, Settings Gear, Global Search
   - SOS Accept & Decline Response State Machine
   - My Assigned Residents Grid & Privacy-Safe Detail Modal
   - Categorized Emergency Alerts (Active, Responding, Resolved, History) + Audit Timelines
   - Profile Update, Photo Upload, Password Change, Logout
   ========================================================= */

window.API_BASE_URL = window.API_BASE_URL || (function() {
    if (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
        return "";
    }
    return "http://127.0.0.1:8000";
})();
var API_BASE_URL = window.API_BASE_URL;

let globalGuardianUser = null;
let globalAssignedResidents = [];
let globalGuardianNotifications = [];

async function initGuardianApp() {
    if (typeof verifySessionAndRole === "function") {
        globalGuardianUser = await verifySessionAndRole("guardian");
        if (!globalGuardianUser) return;
    } else {
        await fetchGuardianMe();
    }

    initGuardianTopbar();
    initGuardianNotificationsPolling();

    // Execute functions if target DOM containers exist
    await fetchAssignedResidents();
    initGuardianEmergencyPolling();

    const path = window.location.pathname;
    if (path.includes("emergency.html")) {
        initGuardianEmergencyPage();
    } else if (path.includes("guardians.html") || path.includes("my-residents")) {
        initMyResidentsPage();
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initGuardianApp);
} else {
    initGuardianApp();
}

async function fetchGuardianMe() {
    try {
        const res = await fetch(`${API_BASE_URL}/api/auth/me/`, { credentials: "include" });
        if (!res.ok) return null;
        const data = await res.json();
        if (!data.authenticated || (data.user.role !== "guardian" && data.user.role !== "admin")) {
            return null;
        }
        globalGuardianUser = data.user;
        return data.user;
    } catch (e) {
        return null;
    }
}

/* ================= 1. TOPBAR & USER DISPLAY ================= */
function initGuardianTopbar() {
    if (!globalGuardianUser) return;

    const user = globalGuardianUser;
    const fn = (user.first_name || "").trim();
    const ln = (user.last_name || "").trim();
    const fullName = `${fn} ${ln}`.trim() || user.username || "Guardian";
    const displayName = fullName;

    // Set Welcome Header
    const welcomeHeader = document.getElementById("welcomeHeaderTitle");
    if (welcomeHeader) {
        welcomeHeader.innerHTML = `Welcome back, <span id="welcomeUserName">${displayName}</span> 👋`;
    }

    // Set Topbar Info
    const topbarName = document.getElementById("topbarUserName");
    if (topbarName) topbarName.textContent = displayName;

    const topbarRole = document.getElementById("topbarUserRole");
    if (topbarRole) topbarRole.textContent = "Guardian";

    // Set Avatar
    const topbarAvatar = document.getElementById("userAvatarImg");
    if (topbarAvatar) {
        const avatarUrl = user.profile_photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0284c7&color=fff&bold=true`;
        topbarAvatar.src = avatarUrl;
        topbarAvatar.onerror = function() {
            this.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0284c7&color=fff&bold=true`;
        };
    }

    // Initialize Search Input Event
    const searchInput = document.querySelector(".topbar-search-box input, #topbarSearchInput");
    if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener("input", (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                handleGuardianSearch(e.target.value);
            }, 300);
        });
    }

    // Sidebar toggle
    const toggleBtn = document.querySelector(".sidebar-toggle-btn");
    if (toggleBtn) {
        toggleBtn.addEventListener("click", () => {
            document.body.classList.toggle("sidebar-collapsed");
        });
    }
}

/* ================= 2. GLOBAL SEARCH POP OVER ================= */
async function handleGuardianSearch(query) {
    let overlay = document.getElementById("guardianSearchOverlay");
    if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = "guardianSearchOverlay";
        overlay.style.cssText = "position:absolute; top:60px; left:260px; width:380px; background:#ffffff; border:1px solid #e2e8f0; border-radius:18px; box-shadow:0 12px 32px rgba(0,0,0,0.12); z-index:99999; padding:16px; display:none;";
        document.body.appendChild(overlay);
    }

    const q = (query || "").trim();
    if (!q || q.length < 2) {
        overlay.style.display = "none";
        return;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/api/guardians/search/?q=${encodeURIComponent(q)}`, { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();

        let html = `<div style="font-size:0.8rem; font-weight:700; color:#64748b; margin-bottom:8px;">Search Results for "${q}"</div>`;

        if ((!data.residents || data.residents.length === 0) && (!data.emergencies || data.emergencies.length === 0)) {
            html += `<div style="padding:16px; text-align:center; color:#94a3b8; font-size:0.85rem;">No results found</div>`;
        } else {
            if (data.residents && data.residents.length > 0) {
                html += `<div style="font-size:0.75rem; font-weight:800; color:#0284c7; margin-top:6px; margin-bottom:4px;">ASSIGNED RESIDENTS</div>`;
                data.residents.forEach(r => {
                    html += `
                        <div onclick="location.href='/dashboard/guardian/guardians.html?id=${r.id}'" style="padding:8px 10px; border-radius:10px; cursor:pointer; background:#f8fafc; margin-bottom:6px; font-size:0.85rem;">
                            <strong style="color:#0f172a;">${r.name}</strong> <span style="color:#64748b;">(Block ${r.block} • Flat ${r.flat})</span>
                            <div style="font-size:0.75rem; color:#0284c7;">Phone: ${r.phone}</div>
                        </div>
                    `;
                });
            }
            if (data.emergencies && data.emergencies.length > 0) {
                html += `<div style="font-size:0.75rem; font-weight:800; color:#dc2626; margin-top:10px; margin-bottom:4px;">EMERGENCY ALERTS</div>`;
                data.emergencies.forEach(em => {
                    html += `
                        <div onclick="location.href='/dashboard/guardian/emergency.html?id=${em.id}'" style="padding:8px 10px; border-radius:10px; cursor:pointer; background:#fff5f5; margin-bottom:6px; font-size:0.85rem; border:1px solid #fecaca;">
                            <strong style="color:#dc2626;">${em.type}</strong> — <span style="color:#334155;">${em.resident}</span>
                            <div style="font-size:0.75rem; color:#64748b;">${em.location} • ${em.time_str}</div>
                        </div>
                    `;
                });
            }
        }

        overlay.innerHTML = html;
        overlay.style.display = "block";

        const clickOutside = (evt) => {
            if (!overlay.contains(evt.target)) {
                overlay.style.display = "none";
                document.removeEventListener("click", clickOutside);
            }
        };
        setTimeout(() => document.addEventListener("click", clickOutside), 10);

    } catch (e) {
        console.error("Guardian Search Error:", e);
    }
}

/* ================= 3. NOTIFICATION BELL & POLLING ================= */
function initGuardianNotificationsPolling() {
    fetchGuardianNotifications();
    setInterval(fetchGuardianNotifications, 6000);
}

async function fetchGuardianNotifications() {
    try {
        const res = await fetch(`${API_BASE_URL}/api/notifications/`, { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        globalGuardianNotifications = data.notifications || [];

        const unreadCount = data.unread_count || globalGuardianNotifications.filter(n => !n.is_read).length;
        const badge = document.getElementById("notifBadge") || document.getElementById("notificationCount");
        if (badge) {
            badge.textContent = unreadCount > 0 ? unreadCount : "";
            badge.style.display = unreadCount > 0 ? "inline-block" : "none";
        }
    } catch (e) {}
}

function toggleGuardianNotificationPopover(e) {
    if (e && e.stopPropagation) e.stopPropagation();
    let popover = document.getElementById("guardianNotifPopover");
    if (!popover) {
        popover = document.createElement("div");
        popover.id = "guardianNotifPopover";
        popover.style.cssText = "position:fixed; top:70px; right:80px; width:340px; background:#ffffff; border-radius:20px; box-shadow:0 16px 40px rgba(0,0,0,0.15); border:1px solid #e2e8f0; z-index:99999; padding:20px; display:none;";
        document.body.appendChild(popover);
    }

    if (popover.style.display === "block") {
        popover.style.display = "none";
        return;
    }

    let html = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px solid #f1f5f9; padding-bottom:8px;">
            <h4 style="margin:0; font-size:0.95rem; font-weight:800; color:#0f172a;"><i class="fa-solid fa-bell text-teal me-2"></i>Notifications</h4>
            <div style="display:flex; align-items:center; gap:10px;">
                <span style="font-size:0.75rem; color:#64748b; font-weight:700;">${globalGuardianNotifications.length} Total</span>
                ${globalGuardianNotifications.length > 0 ? `<span onclick="markGuardianNotificationsRead()" style="font-size:0.75rem; color:#0284c7; font-weight:700; cursor:pointer; text-decoration:underline;">Mark all read</span>` : ''}
            </div>
        </div>
    `;

    if (!globalGuardianNotifications || globalGuardianNotifications.length === 0) {
        html += `
            <div style="text-align:center; padding:24px 12px; color:#64748b; background:#f8fafc; border-radius:14px; border:1px dashed #cbd5e1;">
                <i class="fa-regular fa-bell-slash" style="font-size:1.8rem; color:#94a3b8; margin-bottom:6px; display:block;"></i>
                <strong style="font-size:0.85rem; color:#334155; display:block;">No Notifications</strong>
                <span style="font-size:0.75rem; color:#94a3b8;">You are all caught up!</span>
            </div>
        `;
    } else {
        html += `<div style="max-height:280px; overflow-y:auto;">`;
        globalGuardianNotifications.forEach(n => {
            html += `
                <div style="padding:10px; border-bottom:1px solid #f1f5f9; font-size:0.82rem;">
                    <strong style="color:#0f172a; display:block;">${n.title || 'Emergency Notification'}</strong>
                    <span style="color:#64748b; display:block;">${n.message || n.text || ''}</span>
                    <span style="font-size:0.7rem; color:#94a3b8; margin-top:2px; display:block;">${n.created_at || ''}</span>
                </div>
            `;
        });
        html += `</div>`;
    }

    popover.innerHTML = html;
    popover.style.display = "block";

    const closeHandler = (evt) => {
        if (!popover.contains(evt.target) && !evt.target.closest("#notifBtn, .notification-btn")) {
            popover.style.display = "none";
            document.removeEventListener("click", closeHandler);
        }
    };
    setTimeout(() => document.addEventListener("click", closeHandler), 10);
}

async function markGuardianNotificationsRead() {
    try {
        await fetch(`${API_BASE_URL}/api/notifications/mark-all-read/`, {
            method: "POST",
            credentials: "include"
        });
    } catch (e) {}
    globalGuardianNotifications = [];
    const badge = document.getElementById("notifBadge") || document.getElementById("notificationCount");
    if (badge) {
        badge.textContent = "0";
        badge.style.display = "none";
    }
    const popover = document.getElementById("guardianNotifPopover");
    if (popover) {
        popover.style.display = "none";
    }
}

/* ================= 4. DASHBOARD PAGE & SOS ACCEPT/DECLINE ================= */
function initGuardianEmergencyPolling() {
    if (typeof checkActiveEmergency === "function") {
        checkActiveEmergency();
        return;
    }
    fetchActiveEmergencyForGuardian();
    setInterval(fetchActiveEmergencyForGuardian, 3000);
}


async function fetchActiveEmergencyForGuardian() {
    const listContainer = document.getElementById("emergencyNotificationsList");
    const banner = document.getElementById("liveSosStatusBanner");
    if (!listContainer && !banner) return;

    try {
        let emergency = null;

        // 1. Check user-targeted active emergency endpoint
        const res = await fetch(`${API_BASE_URL}/api/emergency/my-active/`, { credentials: "include" });
        if (res.ok) {
            const data = await res.json();
            if (data.has_active && data.emergency) {
                emergency = data.emergency;
            }
        }

        // 2. Fallback check all active emergencies in society
        if (!emergency) {
            const res2 = await fetch(`${API_BASE_URL}/api/emergency/list/`, { credentials: "include" });
            if (res2.ok) {
                const data2 = await res2.json();
                const records = data2.records || [];
                const activeRecord = records.find(r => r.status === "Active" || r.status === "NOTIFYING_PRIMARY_GUARDIAN" || r.status === "NOTIFYING_SECONDARY_GUARDIAN" || r.status === "RESPONDING" || r.status === "ACKNOWLEDGED");
                if (activeRecord) {
                    emergency = activeRecord;
                }
            }
        }

        if (!emergency) {
            if (banner) banner.style.display = "none";
            if (listContainer) {
                listContainer.innerHTML = `
                    <div class="alert-card-item" style="background:#ffffff; border-radius:16px; padding:20px; border:1px solid #e2e8f0; display:flex; align-items:center; justify-content:space-between;">
                        <div>
                            <span style="font-size:0.875rem; color:#64748b;" data-i18n="no_recent_alerts">No active emergency notifications right now.</span>
                        </div>
                    </div>
                `;
            }
            return;
        }

        renderEmergencyCardUI(emergency, listContainer, banner);

    } catch (e) {
        console.error("Fetch Active Emergency Error:", e);
    }
}

function renderEmergencyCardUI(em, listContainer, banner) {
    const emId = em.id;
    const emType = em.emergency_type || em.type || "Medical Emergency";
    const resName = em.resident_name || em.resident || "Resident";
    const location = em.location_address || em.location || "CareConnect Residency";
    const timeStr = em.created_at || em.time_str || "Just now";
    const statusStr = em.status || "ACTIVE";
    const isResponding = statusStr === "RESPONDING" || statusStr === "ACKNOWLEDGED";
    const desc = em.description || em.message || "";
    const secondsRemaining = em.seconds_remaining || null;

    const html = `
        <div style="background:${isResponding ? '#f0fdf4' : '#fff5f5'}; border:2px solid ${isResponding ? '#22c55e' : '#ef4444'}; border-radius:18px; padding:20px; box-shadow:0 8px 24px rgba(239,68,68,0.12); margin-bottom:12px;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px; margin-bottom:10px;">
                <div>
                    <span style="background:${isResponding ? '#dcfce7' : '#fee2e2'}; color:${isResponding ? '#15803d' : '#dc2626'}; font-size:0.75rem; font-weight:800; padding:4px 12px; border-radius:20px; text-transform:uppercase; display:inline-block; margin-bottom:6px;">
                        ${isResponding ? '✅ RESPONDING — YOU ACCEPTED' : '🚨 ACTIVE EMERGENCY ALERT'}
                    </span>
                    <h3 style="font-size:1.25rem; font-weight:900; color:#0f172a; margin:0 0 4px 0;">${emType}</h3>
                    <div style="font-size:0.95rem; font-weight:800; color:#0f172a;">Resident: <span style="color:#0284c7;">${resName}</span></div>
                </div>
                ${secondsRemaining !== null ? `
                    <div style="background:#fee2e2; color:#dc2626; padding:6px 12px; border-radius:12px; font-weight:800; font-size:0.8rem; display:flex; align-items:center; gap:6px;">
                        <i class="fa-solid fa-clock fa-spin"></i> Timeout in ${secondsRemaining}s
                    </div>
                ` : ''}
            </div>

            <div style="background:#ffffff; border-radius:12px; padding:12px; border:1px solid #e2e8f0; font-size:0.85rem; color:#334155; margin-bottom:16px;">
                ${desc ? `<div style="margin-bottom:4px;"><strong>Details:</strong> ${desc}</div>` : ''}
                <div><strong>Location:</strong> ${location}</div>
                <div style="font-size:0.75rem; color:#94a3b8; margin-top:4px;">Triggered: ${timeStr}</div>
            </div>

            ${isResponding ? `
                <div style="display:flex; align-items:center; gap:8px; color:#15803d; font-weight:800; font-size:0.95rem; background:#dcfce7; padding:10px 16px; border-radius:12px;">
                    <i class="fa-solid fa-circle-check" style="font-size:1.2rem;"></i> You are actively responding to this emergency.
                </div>
            ` : `
                <div style="display:flex; gap:12px; justify-content:flex-end;">
                    <button type="button" onclick="declineGuardianSOS(${emId})" style="background:#ffffff; color:#dc2626; border:2px solid #fca5a5; padding:10px 20px; border-radius:12px; font-weight:800; font-size:0.9rem; cursor:pointer; transition:all 0.15s ease;">
                        <i class="fa-solid fa-xmark me-1"></i> DECLINE
                    </button>
                    <button type="button" onclick="acceptGuardianSOS(${emId})" style="background:#16a34a; color:#ffffff; border:none; padding:10px 24px; border-radius:12px; font-weight:800; font-size:0.9rem; cursor:pointer; box-shadow:0 4px 12px rgba(22,163,74,0.3); transition:all 0.15s ease;">
                        <i class="fa-solid fa-check me-1"></i> ACCEPT SOS
                    </button>
                </div>
            `}
        </div>
    `;

    if (listContainer) listContainer.innerHTML = html;
    if (banner) {
        banner.innerHTML = html;
        banner.style.display = "block";
        banner.style.padding = "0";
        banner.style.border = "none";
        banner.style.background = "none";
    }
}

async function acceptGuardianSOS(id) {
    try {
        const res = await fetch(`${API_BASE_URL}/api/emergency/sos/${id}/accept/`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" }
        });
        const data = await res.json();
        if (data.success) {
            alert("SOS Alert Accepted! You are now marked as the active responder.");
            fetchActiveEmergencyForGuardian();
        } else {
            alert(data.message || "Failed to accept SOS alert.");
        }
    } catch (e) {
        alert("Server error accepting SOS.");
    }
}

async function declineGuardianSOS(id) {
    try {
        const res = await fetch(`${API_BASE_URL}/api/emergency/sos/${id}/decline/`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" }
        });
        const data = await res.json();
        if (data.success) {
            alert("SOS Alert Declined. Escalating to next responder tier.");
            fetchActiveEmergencyForGuardian();
        } else {
            alert(data.message || "Failed to decline SOS alert.");
        }
    } catch (e) {
        alert("Server error declining SOS.");
    }
}

/* ================= 5. MY RESIDENTS PAGE & MODAL ================= */
async function fetchAssignedResidents() {
    const container = document.getElementById("myResidentsContainer") || document.getElementById("guardianResidentList") || document.getElementById("assignedResidentsGrid");
    if (!container) return;

    try {
        const res = await fetch(`${API_BASE_URL}/api/guardians/my-residents/`, { credentials: "include" });
        if (!res.ok) {
            container.innerHTML = `
                <div style="padding:20px; text-align:center; color:#ef4444; font-size:0.85rem;">
                    Unable to load assigned residents. <button onclick="fetchAssignedResidents()" style="background:none; border:none; color:#0284c7; font-weight:700; cursor:pointer; text-decoration:underline;">Retry</button>
                </div>
            `;
            return;
        }
        const data = await res.json();
        globalAssignedResidents = data.residents || [];

        if (globalAssignedResidents.length === 0) {
            container.innerHTML = `
                <div style="padding:32px; text-align:center; background:#f8fafc; border-radius:18px; border:1px dashed #cbd5e1; grid-column: 1 / -1;">
                    <i class="fa-solid fa-user-shield" style="font-size:2.4rem; color:#94a3b8; margin-bottom:10px; display:block;"></i>
                    <strong style="font-size:1rem; color:#334155; display:block;">No residents are currently assigned to you.</strong>
                    <span style="font-size:0.85rem; color:#64748b;">Assigned resident accounts will appear here automatically.</span>
                </div>
            `;
            return;
        }

        container.innerHTML = globalAssignedResidents.map(r => `
            <div class="resident-card-item" style="background:#ffffff; border-radius:20px; padding:20px; border:1px solid #e2e8f0; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:16px; margin-bottom:16px;">
                <div style="display:flex; align-items:center; gap:16px;">
                    <img src="${r.profile_photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.name)}&background=0284c7&color=fff&bold=true`}" alt="${r.name}" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(r.name)}&background=0284c7&color=fff&bold=true'" style="width:52px; height:52px; border-radius:50%; object-fit:cover; border:2px solid #0284c7;">
                    <div>
                        <strong style="font-size:1.05rem; color:#0f172a; display:block;">${r.name}</strong>
                        <div style="font-size:0.85rem; color:#64748b; margin-top:2px;">${r.block} • ${r.flat}</div>
                        <div style="font-size:0.8rem; color:#0284c7; font-weight:700; margin-top:4px;">${r.relationship} (${r.guardian_type})</div>
                    </div>
                </div>
                <div style="display:flex; gap:10px; align-items:center;">
                    <button type="button" class="btn btn-secondary" onclick="openResidentDetailModal(${r.id})" style="padding:8px 16px; border-radius:10px; font-weight:700; background:#f1f5f9; border:1px solid #cbd5e1; color:#334155; cursor:pointer;">View Details</button>
                    <a href="tel:${r.phone}" class="btn-call-resident" style="padding:8px 16px; border-radius:10px; font-weight:700; text-decoration:none; display:inline-flex; align-items:center; gap:6px; background:#0284c7; color:#ffffff;"><i class="fa-solid fa-phone"></i> Call</a>
                </div>
            </div>
        `).join('');

    } catch (e) {
        console.error("Fetch Assigned Residents Error:", e);
        if (container) {
            container.innerHTML = `
                <div style="padding:20px; text-align:center; color:#ef4444; font-size:0.85rem;">
                    Unable to load assigned residents. <button onclick="fetchAssignedResidents()" style="background:none; border:none; color:#0284c7; font-weight:700; cursor:pointer; text-decoration:underline;">Retry</button>
                </div>
            `;
        }
    }
}

function openResidentDetailModal(resId) {
    const res = globalAssignedResidents.find(r => r.id === resId);
    if (!res) return;

    let modal = document.getElementById("residentDetailModal");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "residentDetailModal";
        modal.className = "modal-overlay";
        modal.style.cssText = "position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(15,23,42,0.6); z-index:99999; display:flex; align-items:center; justify-content:center;";
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div style="background:#ffffff; border-radius:24px; max-width:520px; width:90%; padding:28px; box-shadow:0 20px 48px rgba(0,0,0,0.2); position:relative;">
            <button onclick="document.getElementById('residentDetailModal').remove()" style="position:absolute; top:16px; right:16px; background:none; border:none; font-size:1.4rem; color:#64748b; cursor:pointer;">&times;</button>
            <div style="display:flex; align-items:center; gap:16px; margin-bottom:20px; border-bottom:1px solid #f1f5f9; padding-bottom:16px;">
                <img src="${res.profile_photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(res.name)}&background=0284c7&color=fff&bold=true`}" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(res.name)}&background=0284c7&color=fff&bold=true'" style="width:64px; height:64px; border-radius:50%; object-fit:cover; border:3px solid #0284c7;">
                <div>
                    <h3 style="margin:0; font-size:1.25rem; font-weight:800; color:#0f172a;">${res.name}</h3>
                    <div style="font-size:0.85rem; color:#64748b;">${res.block} • ${res.flat} (${res.society})</div>
                    <span style="font-size:0.75rem; font-weight:800; color:#0284c7;">${res.relationship} — ${res.guardian_type}</span>
                </div>
            </div>
            
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; font-size:0.85rem; margin-bottom:20px;">
                <div style="background:#f8fafc; padding:10px 14px; border-radius:12px;"><span style="color:#64748b; display:block;">Blood Group</span><strong style="color:#0f172a;">${res.blood_group}</strong></div>
                <div style="background:#f8fafc; padding:10px 14px; border-radius:12px;"><span style="color:#64748b; display:block;">Phone</span><strong style="color:#0f172a;">${res.phone}</strong></div>
                <div style="background:#f8fafc; padding:10px 14px; border-radius:12px; grid-column:span 2;"><span style="color:#64748b; display:block;">Medical Conditions</span><strong style="color:#0f172a;">${res.medical_conditions}</strong></div>
                <div style="background:#f8fafc; padding:10px 14px; border-radius:12px; grid-column:span 2;"><span style="color:#64748b; display:block;">Allergies</span><strong style="color:#0f172a;">${res.allergies}</strong></div>
            </div>

            <a href="tel:${res.phone}" class="btn" style="display:block; width:100%; text-align:center; padding:12px; border-radius:12px; background:#0284c7; color:#fff; text-decoration:none; font-weight:800; box-sizing:border-box;"><i class="fa-solid fa-phone me-2"></i> Call Resident Now</a>
        </div>
    `;
}

function initMyResidentsPage() {
    fetchAssignedResidents();
}

function initGuardianEmergencyPage() {
    fetchGuardianEmergencyAlerts();
}

async function fetchGuardianEmergencyAlerts() {
    const activeCont = document.getElementById("activeAlertsList") || document.getElementById("activeAlertsTab");
    const respondingCont = document.getElementById("respondingAlertsList") || document.getElementById("respondingAlertsTab");
    const resolvedCont = document.getElementById("resolvedAlertsList") || document.getElementById("resolvedAlertsTab");
    const historyCont = document.getElementById("historyAlertsList") || document.getElementById("historyAlertsTab");

    if (!activeCont && !respondingCont && !resolvedCont && !historyCont) return;

    try {
        const res = await fetch(`${API_BASE_URL}/api/guardians/emergency-alerts/`, { credentials: "include" });
        if (!res.ok) {
            const errorHtml = `<div style="padding:24px; text-align:center; color:#ef4444; font-size:0.9rem;">Unable to load emergency alerts. <button onclick="fetchGuardianEmergencyAlerts()" style="background:none; border:none; color:#0284c7; font-weight:700; cursor:pointer; text-decoration:underline;">Retry</button></div>`;
            if (activeCont) activeCont.innerHTML = errorHtml;
            if (respondingCont) respondingCont.innerHTML = errorHtml;
            if (resolvedCont) resolvedCont.innerHTML = errorHtml;
            if (historyCont) historyCont.innerHTML = errorHtml;
            return;
        }
        const data = await res.json();

        if (activeCont) renderEmergencyAlertTab(activeCont, data.active || [], "active");
        if (respondingCont) renderEmergencyAlertTab(respondingCont, data.responding || [], "responding");
        if (resolvedCont) renderEmergencyAlertTab(resolvedCont, data.resolved || [], "resolved");
        if (historyCont) renderEmergencyAlertTab(historyCont, data.history || [], "history");

    } catch (e) {
        console.error("Fetch Emergency Alerts Error:", e);
    }
}

function renderEmergencyAlertTab(container, list, tabType) {
    if (!container) return;
    if (!list || list.length === 0) {
        container.innerHTML = `
            <div style="padding:36px; text-align:center; color:#64748b; background:#f8fafc; border-radius:18px; border:1px dashed #cbd5e1; margin-top:8px;">
                <i class="fa-regular fa-bell-slash" style="font-size:2rem; color:#94a3b8; margin-bottom:8px; display:block;"></i>
                <strong style="font-size:0.95rem; color:#334155; display:block;">No emergency records found in this category.</strong>
                <span style="font-size:0.8rem; color:#94a3b8;">All alerts involving your assigned residents will appear here automatically.</span>
            </div>
        `;
        return;
    }

    container.innerHTML = list.map(em => {
        const isResolved = em.status === 'RESOLVED' || em.status === 'CANCELLED';
        const isResponding = em.status === 'RESPONDING' || em.status === 'ACKNOWLEDGED';
        const isActive = !isResolved && !isResponding;
        
        let badgeClass = 'badge-active';
        let badgeText = em.status;
        if (em.status === 'RESOLVED') {
            badgeClass = 'badge-resolved';
            badgeText = 'RESOLVED';
        } else if (em.status === 'CANCELLED') {
            badgeClass = 'badge-pending';
            badgeText = 'CANCELLED';
        } else if (isResponding) {
            badgeClass = 'badge-resolved';
            badgeText = 'RESPONDING';
        }

        return `
            <div class="alert-card-item" style="background:#ffffff; border-radius:20px; padding:22px; border:1px solid #e2e8f0; margin-bottom:16px; box-shadow:0 2px 10px rgba(0,0,0,0.03);">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:14px; width:100%;">
                    <div style="flex:1; min-width:280px;">
                        <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
                            <span class="${badgeClass}" style="font-size:0.75rem; text-transform:uppercase; font-weight:800; letter-spacing:0.5px;">${badgeText}</span>
                            <span style="font-size:0.8rem; font-weight:800; color:#64748b;">${em.code || ('SOS-#' + em.id)}</span>
                        </div>
                        <h3 style="margin:0 0 6px 0; font-size:1.2rem; font-weight:900; color:#0f172a;">
                            <i class="fa-solid fa-triangle-exclamation text-red me-2"></i>${em.type}
                        </h3>
                        <div style="font-size:0.95rem; font-weight:800; color:#1e293b; margin-bottom:4px;">
                            Resident: <span style="color:#0284c7;">${em.resident}</span> <span style="color:#64748b; font-weight:600; font-size:0.85rem;">(${em.block}, ${em.flat})</span>
                        </div>
                        <div style="font-size:0.85rem; color:#475569; margin-top:2px;">
                            <i class="fa-solid fa-location-dot text-muted me-1"></i> ${em.location}
                        </div>
                        ${em.description ? `<div style="font-size:0.85rem; color:#64748b; margin-top:4px; font-style:italic;">"${em.description}"</div>` : ''}
                        <div style="font-size:0.75rem; color:#94a3b8; margin-top:6px;">
                            <i class="fa-regular fa-clock me-1"></i> Triggered: ${em.time_str || em.created_at || 'Just now'}
                            ${em.assigned_responder ? ` • <strong style="color:#16a34a;">Responder: ${em.assigned_responder}</strong>` : ''}
                        </div>
                    </div>

                    <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap; align-self:center;">
                        ${isActive ? `
                            <button type="button" class="btn-decline" onclick="declineGuardianSOS(${em.id})" style="padding:8px 16px; border-radius:10px; font-weight:800; font-size:0.85rem;">
                                <i class="fa-solid fa-xmark me-1"></i> Decline
                            </button>
                            <button type="button" class="btn-accept" onclick="acceptGuardianSOS(${em.id})" style="padding:8px 18px; border-radius:10px; font-weight:800; font-size:0.85rem;">
                                <i class="fa-solid fa-check me-1"></i> Accept SOS
                            </button>
                        ` : ''}
                        <button type="button" class="btn" onclick="openGuardianAlertDetailModal(${em.id})" style="background:#f1f5f9; border:1px solid #cbd5e1; color:#334155; padding:8px 16px; border-radius:10px; font-weight:700; font-size:0.85rem; cursor:pointer;">
                            <i class="fa-solid fa-circle-info me-1"></i> Details
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

async function openGuardianAlertDetailModal(emId) {
    if (typeof viewSosDetails === "function") {
        viewSosDetails(emId);
        return;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/api/emergency/sos/${emId}/`, { credentials: "include" });
        if (!res.ok) return alert("Unable to load emergency incident details.");
        const data = await res.json();
        const em = data.emergency || data.record;
        if (!em) return alert("Details unavailable.");

        let existing = document.getElementById("guardianSosDetailModal");
        if (existing) existing.remove();

        let auditsHtml = (em.audit_logs || []).map(a => `
            <div style="padding:8px 0; border-bottom:1px solid #f1f5f9; font-size:0.8rem;">
                <span style="font-weight:700; color:#0f172a;">[${a.timestamp || a.time_str}]</span>
                <strong style="color:#0284c7;"> ${a.action}:</strong> ${a.details || ''}
            </div>
        `).join('') || '<div style="color:#94a3b8; font-size:0.8rem;">No audit entries yet.</div>';

        const modalHtml = `
            <div id="guardianSosDetailModal" style="position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(15,23,42,0.7); display:flex; align-items:center; justify-content:center; z-index:99999; backdrop-filter:blur(4px);">
                <div style="background:#ffffff; border-radius:24px; width:92%; max-width:560px; max-height:85vh; overflow-y:auto; padding:28px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; border-bottom:1px solid #f1f5f9; padding-bottom:12px;">
                        <h3 style="margin:0; font-size:1.25rem; font-weight:800; color:#0f172a;">🚨 Emergency Incident #${em.id}</h3>
                        <button onclick="document.getElementById('guardianSosDetailModal').remove()" style="background:none; border:none; font-size:1.5rem; color:#64748b; cursor:pointer;">&times;</button>
                    </div>

                    <div style="background:#f8fafc; border-radius:16px; padding:16px; border:1px solid #e2e8f0; margin-bottom:16px; font-size:0.9rem;">
                        <p style="margin:4px 0;"><strong>Resident:</strong> ${em.resident_name || em.resident || 'Resident'}</p>
                        <p style="margin:4px 0;"><strong>Emergency Type:</strong> <span style="color:#dc2626; font-weight:800;">${em.emergency_type || em.type || 'Medical'}</span></p>
                        <p style="margin:4px 0;"><strong>Location:</strong> ${em.location_address || em.location || 'Society'}</p>
                        <p style="margin:4px 0;"><strong>Status:</strong> <span style="font-weight:800; color:#0284c7;">${em.status}</span></p>
                        <p style="margin:4px 0;"><strong>Active Stage:</strong> ${em.active_escalation_level || 'N/A'}</p>
                        ${em.assigned_responder_name ? `<p style="margin:4px 0; color:#16a34a;"><strong>Responder:</strong> ${em.assigned_responder_name}</p>` : ''}
                    </div>

                    <h4 style="font-size:0.95rem; font-weight:800; color:#0f172a; margin:16px 0 8px;">Incident Audit Timeline</h4>
                    <div style="background:#f8fafc; padding:12px; border-radius:12px; max-height:160px; overflow-y:auto; border:1px solid #e2e8f0;">
                        ${auditsHtml}
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML("beforeend", modalHtml);
    } catch (e) {
        alert("Server error retrieving incident details.");
    }
}

window.fetchAssignedResidents = fetchAssignedResidents;
window.openResidentDetailModal = openResidentDetailModal;
window.openGuardianAlertDetailModal = openGuardianAlertDetailModal;
window.acceptGuardianSOS = acceptGuardianSOS;
window.declineGuardianSOS = declineGuardianSOS;
window.fetchGuardianEmergencyAlerts = fetchGuardianEmergencyAlerts;
window.toggleGuardianNotificationPopover = toggleGuardianNotificationPopover;
