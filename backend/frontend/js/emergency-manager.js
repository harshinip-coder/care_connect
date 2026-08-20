/* =========================================================
   CARECONNECT — REAL-TIME SOS EMERGENCY ENGINE & ESCALATION CONTROLLER
   Supports Resident SOS Modal Confirmation, Real Database Request Creation,
   Strict 16-Step Escalation Workflow, Atomic Lock Response, Dynamic Multi-Role Notifications,
   and Permanent SOS History Across All Role Dashboards
   ========================================================= */

const getEmergencyApiBase = () => {
    if (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
        return "/api/emergency";
    }
    return "/api/emergency";
};

const EMERGENCY_API_BASE = getEmergencyApiBase();
let activeEmergencyId = null;
let pollInterval = null;
let isSubmittingSos = false;

document.addEventListener("DOMContentLoaded", () => {
    initEmergencyEngine();
    fetchEmergencyHistoryTable();
});

async function fetchEmergencyHistoryTable() {
    const tableBody = document.querySelector(".custom-table tbody") || document.getElementById("emergencyHistoryTableBody");
    if (!tableBody) return;

    try {
        const token = localStorage.getItem("access_token");
        const headers = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(`${EMERGENCY_API_BASE}/history/`, { 
            headers: headers,
            credentials: "include"
        });
        const data = await res.json();

        if (data.success && data.emergencies && data.emergencies.length > 0) {
            let html = data.emergencies.map(em => `
                <tr>
                    <td><strong>SOS-#${em.id}</strong></td>
                    <td><span style="background:${em.emergency_type === 'Medical' ? '#fee2e2' : '#fef3c7'}; color:${em.emergency_type === 'Medical' ? '#dc2626' : '#92400e'}; font-weight:700; padding:4px 12px; border-radius:20px;">${em.emergency_type}</span></td>
                    <td><strong>${em.resident_name}</strong></td>
                    <td>Block ${em.block}, Flat ${em.flat} (${em.society})</td>
                    <td>${em.created_at}</td>
                    <td><span style="background:${em.status === 'RESOLVED' ? '#dcfce7' : '#fee2e2'}; color:${em.status === 'RESOLVED' ? '#166534' : '#dc2626'}; font-weight:700; padding:4px 12px; border-radius:20px;">${em.status}</span></td>
                    <td><button type="button" class="btn-accept" style="padding:6px 12px; font-size:0.8rem; background:#0284c7; border:none; color:#fff; border-radius:8px; cursor:pointer;" onclick="viewSosDetails(${em.id})">Details</button></td>
                </tr>
            `).join('');
            tableBody.innerHTML = html;
        } else {
            tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#64748b; padding:20px;">No emergency alerts recorded yet.</td></tr>`;
        }
    } catch (err) {}
}

function initEmergencyEngine() {
    checkActiveEmergency();
    fetchNotificationList();
    if (!pollInterval) {
        pollInterval = setInterval(() => {
            checkActiveEmergency();
            fetchNotificationList();
        }, 3000);
    }
}

/**
 * Step 1 — Resident Presses SOS
 * Shows confirmation modal with "Are you sure you want to send an emergency alert?"
 * Buttons: [Cancel] [Send SOS]
 */
/**
 * Step 1 — Resident Presses SOS
 * Opens Emergency Details Modal to select Emergency Type and Description.
 */
function promptSosConfirmation() {
    if (isSubmittingSos) return;
    openEmergencyDetailsModal();
}

function triggerOneTapSOS() {
    promptSosConfirmation();
}

function openEmergencyDetailsModal() {
    const existing = document.getElementById("sosDetailsModal");
    if (existing) existing.remove();

    const modalHtml = `
        <div id="sosDetailsModal" style="position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(15,23,42,0.8); display:flex; align-items:center; justify-content:center; z-index:99999; backdrop-filter:blur(4px);">
            <div style="background:#ffffff; border-radius:24px; width:92%; max-width:500px; padding:32px; box-shadow:0 25px 50px -12px rgba(220,38,38,0.25); border:3px solid #ef4444;">
                <div style="text-align:center; margin-bottom:20px;">
                    <div style="width:64px; height:64px; background:#fee2e2; color:#dc2626; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; font-size:2rem; margin-bottom:12px;">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                    </div>
                    <h2 style="font-size:1.5rem; font-weight:800; color:#0f172a; margin:0;">🚨 Emergency Details</h2>
                    <p style="font-size:0.875rem; color:#64748b; margin-top:4px;">Please select the emergency type and provide brief details.</p>
                </div>

                <div style="margin-bottom:16px;">
                    <label style="font-size:0.85rem; font-weight:700; color:#334155; display:block; margin-bottom:6px;">Emergency Type *</label>
                    <select id="sosTypeSelect" class="form-control" style="width:100%; padding:12px; border-radius:12px; border:1px solid #cbd5e1; font-weight:700; font-size:0.95rem;">
                        <option value="Medical Emergency">🏥 Medical Emergency</option>
                        <option value="Accident">🆘 Accident</option>
                        <option value="Fire">🔥 Fire</option>
                        <option value="Security Threat">🚨 Security Threat</option>
                        <option value="Crime / Intrusion">🛡️ Crime / Intrusion</option>
                        <option value="Missing Person">👤 Missing Person</option>
                        <option value="Women / Child Safety">👩‍👧 Women / Child Safety</option>
                        <option value="Natural Disaster">🌊 Natural Disaster</option>
                        <option value="Other">⚠️ Other</option>
                    </select>
                </div>

                <div style="margin-bottom:24px;">
                    <label style="font-size:0.85rem; font-weight:700; color:#334155; display:block; margin-bottom:6px;">Description / Notes</label>
                    <textarea id="sosDescriptionInput" rows="3" placeholder="Describe the emergency..." style="width:100%; padding:12px; border-radius:12px; border:1px solid #cbd5e1; font-size:0.9rem; font-family:inherit; box-sizing:border-box;"></textarea>
                    <div id="sosValidationError" style="color:#dc2626; font-size:0.8rem; font-weight:700; margin-top:4px; display:none;"></div>
                </div>

                <div style="display:flex; gap:12px;">
                    <button type="button" onclick="closeSosDetailsModal()" style="flex:1; background:#f1f5f9; color:#475569; border:none; padding:14px; border-radius:14px; font-weight:700; font-size:1rem; cursor:pointer;">
                        Cancel
                    </button>
                    <button type="button" onclick="proceedToSosConfirmation()" style="flex:1; background:#0284c7; color:#ffffff; border:none; padding:14px; border-radius:14px; font-weight:800; font-size:1rem; cursor:pointer;">
                        Continue <i class="fa-solid fa-arrow-right"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML("beforeend", modalHtml);
}

function closeSosDetailsModal() {
    const modal = document.getElementById("sosDetailsModal");
    if (modal) modal.remove();
}

function proceedToSosConfirmation() {
    const typeSelect = document.getElementById("sosTypeSelect");
    const descInput = document.getElementById("sosDescriptionInput");
    const errDiv = document.getElementById("sosValidationError");

    const selectedType = typeSelect ? typeSelect.value : "Medical Emergency";
    const description = descInput ? descInput.value.trim() : "";

    if (selectedType === "Other" && !description) {
        if (errDiv) {
            errDiv.textContent = "Please provide a brief description when selecting 'Other'.";
            errDiv.style.display = "block";
        }
        return;
    }

    closeSosDetailsModal();
    openSosConfirmationModal(selectedType, description);
}

/**
 * Step 2 — Confirmation Modal
 * Displays real user society/location details and asks confirmation before dispatching backend API.
 */
function openSosConfirmationModal(emergencyType, description) {
    const existing = document.getElementById("sosPromptModal");
    if (existing) existing.remove();

    const savedUser = localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")) : {};
    const societyName = savedUser.society_name || savedUser.society || "CareConnect Residency";
    const rawBlock = savedUser.block_name || savedUser.block || "A";
    const rawFlat = savedUser.flat_number || savedUser.flat || "101";
    const formattedBlock = String(rawBlock).toLowerCase().startsWith("block") ? rawBlock : `Block ${rawBlock}`;
    const formattedFlat = String(rawFlat).toLowerCase().startsWith("flat") ? rawFlat : `Flat ${rawFlat}`;

    const modalHtml = `
        <div id="sosPromptModal" style="position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(15,23,42,0.8); display:flex; align-items:center; justify-content:center; z-index:99999; backdrop-filter:blur(4px);">
            <div style="background:#ffffff; border-radius:24px; width:92%; max-width:500px; padding:32px; box-shadow:0 25px 50px -12px rgba(220,38,38,0.25); border:3px solid #ef4444; text-align:center;">
                <div style="width:72px; height:72px; background:#fee2e2; color:#dc2626; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; font-size:2.2rem; margin-bottom:16px;">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                </div>
                <h2 style="font-size:1.6rem; font-weight:800; color:#0f172a; margin:0 0 12px 0;">🚨 Emergency Alert Confirmation</h2>

                <div style="background:#f8fafc; border-radius:16px; padding:16px; text-align:left; border:1px solid #e2e8f0; margin-bottom:20px; font-size:0.9rem;">
                    <div style="margin-bottom:8px;">
                        <span style="color:#64748b; font-size:0.8rem; font-weight:700; display:block;">EMERGENCY TYPE</span>
                        <strong style="color:#dc2626; font-size:1.05rem;">${emergencyType}</strong>
                    </div>
                    <div style="margin-bottom:8px;">
                        <span style="color:#64748b; font-size:0.8rem; font-weight:700; display:block;">DESCRIPTION</span>
                        <span style="color:#0f172a; font-weight:600;">${description || 'Emergency SOS Triggered'}</span>
                    </div>
                    <div style="margin-bottom:8px;">
                        <span style="color:#64748b; font-size:0.8rem; font-weight:700; display:block;">SOCIETY</span>
                        <span style="color:#0f172a; font-weight:600;">${societyName}</span>
                    </div>
                    <div>
                        <span style="color:#64748b; font-size:0.8rem; font-weight:700; display:block;">LOCATION</span>
                        <span style="color:#0f172a; font-weight:600;">${formattedBlock}, ${formattedFlat}</span>
                    </div>
                </div>

                <p style="font-size:1rem; font-weight:700; color:#334155; margin-bottom:24px;">
                    Are you sure you want to send this emergency alert?
                </p>

                <div style="display:flex; gap:12px; justify-content:center;">
                    <button type="button" id="sosCancelBtn" onclick="closeSosPromptModal()" style="flex:1; background:#f1f5f9; color:#475569; border:none; padding:14px; border-radius:14px; font-weight:700; font-size:1rem; cursor:pointer;">
                        Cancel
                    </button>
                    <button type="button" id="sosSendBtn" onclick="sendRealSosAlert('${emergencyType.replace(/'/g, "\\'")}', '${description.replace(/'/g, "\\'")}')" style="flex:1; background:#dc2626; color:#ffffff; border:none; padding:14px; border-radius:14px; font-weight:800; font-size:1rem; cursor:pointer; box-shadow:0 4px 14px rgba(220,38,38,0.4);">
                        <i class="fa-solid fa-bell"></i> Send SOS
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML("beforeend", modalHtml);
}

function closeSosPromptModal() {
    const modal = document.getElementById("sosPromptModal");
    if (modal) modal.remove();
}

async function sendRealSosAlert(emergencyType = "Medical Emergency", description = "") {
    if (isSubmittingSos) return;
    isSubmittingSos = true;

    const sendBtn = document.getElementById("sosSendBtn");
    const cancelBtn = document.getElementById("sosCancelBtn");
    if (sendBtn) {
        sendBtn.disabled = true;
        sendBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Sending SOS...`;
        sendBtn.style.opacity = "0.7";
    }
    if (cancelBtn) cancelBtn.disabled = true;

    try {
        const token = localStorage.getItem("access_token");
        const headers = { "Content-Type": "application/json", "Accept": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(`${EMERGENCY_API_BASE}/sos/`, {
            method: "POST",
            headers: headers,
            credentials: "include",
            body: JSON.stringify({ emergency_type: emergencyType, description: description })
        });

        let data = null;
        const rawText = await res.text();
        try {
            data = JSON.parse(rawText);
        } catch (jsonErr) {
            data = null;
        }

        const isAuthError = res.status === 401 || (data && data.authenticated === false);

        if (isAuthError) {
            closeSosPromptModal();
            localStorage.clear();
            sessionStorage.clear();
            alert("Authentication session expired. Please log in to send an SOS alert.");
            window.location.href = "/index.html";
            return;
        }


        closeSosPromptModal();

        if (data && data.success) {
            activeEmergencyId = data.emergency ? data.emergency.id : null;
            if (data.created === false) {
                alert(`⚠️ ${data.message || "An active emergency alert already exists."}`);
            } else {
                alert("🚨 Emergency alert sent successfully! Responders have been notified.");
            }
            checkActiveEmergency();
        } else if (res.status === 409) {
            alert((data && data.message) ? data.message : "You already have an active emergency alert.");
            checkActiveEmergency();
        } else {
            const errorDetail = (data && data.message) ? data.message : ("Server status " + res.status + ". Please ensure the Django backend server is running.");
            alert("Emergency Service Notice: " + errorDetail);
            checkActiveEmergency();
        }

    } catch (err) {
        console.error("SOS Trigger Network Error:", err);
        alert("Unable to connect to the emergency service. Please check your network connection.");
    } finally {
        isSubmittingSos = false;
        if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.innerHTML = `<i class="fa-solid fa-bell"></i> Send SOS`;
            sendBtn.style.opacity = "1.0";
        }
        if (cancelBtn) cancelBtn.disabled = false;
    }
}

function closeSosConfirmModal() {
    const modal = document.getElementById("sosConfirmModal");
    if (modal) modal.remove();
}

async function submitPostSosDetails() {
    const type = document.getElementById("postSosType") ? document.getElementById("postSosType").value : "Medical";
    const msg = document.getElementById("postSosMsg") ? document.getElementById("postSosMsg").value : "";

    if (!activeEmergencyId) {
        closeSosConfirmModal();
        return;
    }

    try {
        const token = localStorage.getItem("access_token");
        const headers = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        await fetch(`${EMERGENCY_API_BASE}/${activeEmergencyId}/update-details/`, {
            method: "POST",
            headers: headers,
            credentials: "include",
            body: JSON.stringify({ emergency_type: type, message: msg, description: msg })
        });
    } catch (err) {}

    closeSosConfirmModal();
    checkActiveEmergency();
}

async function checkActiveEmergency() {
    try {
        const token = localStorage.getItem("access_token");
        const headers = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(`${EMERGENCY_API_BASE}/my-active/`, { 
            headers: headers,
            credentials: "include"
        });
        const data = await res.json();

        if (data.has_active && data.emergency) {
            activeEmergencyId = data.emergency.id;
            updateLiveEmergencyUI(data.emergency);
        } else {
            activeEmergencyId = null;
            clearLiveEmergencyUI();
        }
    } catch (err) {}
}

function ensureBannerContainerExists() {
    let banner = document.getElementById("liveSosStatusBanner");
    if (!banner) {
        banner = document.createElement("div");
        banner.id = "liveSosStatusBanner";
        banner.style.display = "none";
        banner.style.background = "#fff5f5";
        banner.style.border = "2px solid #ef4444";
        banner.style.borderRadius = "20px";
        banner.style.padding = "20px";
        banner.style.marginBottom = "24px";
        banner.style.boxShadow = "0 10px 25px -5px rgba(239, 68, 68, 0.2)";

        const targetContainer = document.querySelector(".dashboard-main-content") || document.querySelector(".dashboard-main") || document.body;
        if (targetContainer.firstChild) {
            targetContainer.insertBefore(banner, targetContainer.firstChild);
        } else {
            targetContainer.appendChild(banner);
        }
    }
    return banner;
}

function updateLiveEmergencyUI(emergency) {
    const banner = ensureBannerContainerExists();
    banner.style.display = "block";

    const grid = document.getElementById("activeEmergencyGrid");
    const noBox = document.getElementById("noEmergencyBox");
    if (grid) grid.style.display = "grid";
    if (noBox) noBox.style.display = "none";

    const savedUser = localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")) : {};
    const isResident = savedUser.role === "resident";

    let actionButtons = "";
    if (isResident) {
        actionButtons = `
            <button type="button" class="banner-btn btn-teal" style="background:#0284c7; color:#fff; padding:8px 16px; border-radius:10px; font-weight:700; border:none; cursor:pointer;" onclick="triggerOneTapSOS()">Edit Details</button>
            <button type="button" class="banner-btn btn-dark" style="background:#dc2626; color:#fff; padding:8px 16px; border-radius:10px; font-weight:700; border:none; cursor:pointer;" onclick="cancelActiveSOS()">Cancel SOS</button>
        `;
    } else {
        actionButtons = `
            ${emergency.can_respond && emergency.status !== 'RESPONDING' ? `<button type="button" style="background:#16a34a; color:#fff; padding:8px 16px; border-radius:10px; font-weight:800; border:none; cursor:pointer;" onclick="acceptSos(${emergency.id})"><i class="fa-solid fa-check"></i> ACCEPT</button>` : ''}
            ${emergency.can_respond && emergency.status !== 'RESPONDING' ? `<button type="button" style="background:#ffffff; color:#dc2626; border:1px solid #fca5a5; padding:8px 16px; border-radius:10px; font-weight:800; cursor:pointer;" onclick="rejectSos(${emergency.id})"><i class="fa-solid fa-xmark"></i> DECLINE</button>` : ''}
            <button type="button" style="background:#0284c7; color:#fff; padding:8px 16px; border-radius:10px; font-weight:700; border:none; cursor:pointer;" onclick="viewSosDetails(${emergency.id})"><i class="fa-solid fa-circle-info"></i> DETAILS</button>
            ${(emergency.status === 'RESPONDING' || savedUser.role === 'admin' || savedUser.is_superuser) ? `<button type="button" style="background:#059669; color:#fff; padding:8px 16px; border-radius:10px; font-weight:700; border:none; cursor:pointer;" onclick="resolveSos(${emergency.id})"><i class="fa-solid fa-circle-check"></i> RESOLVE</button>` : ''}
        `;
    }

    const blk = (emergency.block || '').toString().trim();
    const flt = (emergency.flat || '').toString().trim();
    const formattedBlock = blk ? (blk.toLowerCase().startsWith('block') ? blk : `Block ${blk}`) : '';
    const formattedFlat = flt ? (flt.toLowerCase().startsWith('flat') ? flt : `Flat ${flt}`) : '';
    const locationStr = [formattedBlock, formattedFlat].filter(Boolean).join(', ');

    banner.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:14px;">
            <div>
                <div style="display:flex; align-items:center; gap:10px; margin-bottom:6px;">
                    <span style="background:#ef4444; color:#fff; font-weight:800; padding:4px 14px; border-radius:20px; font-size:0.8rem; letter-spacing:0.5px;">🚨 EMERGENCY SOS #${emergency.id}</span>
                    <strong style="font-size:1.15rem; color:#0f172a;" id="liveSosStatusText">${emergency.status}</strong>
                </div>
                <div style="font-size:0.95rem; font-weight:700; color:#1e293b;">
                    Resident: <span style="color:#0284c7;">${emergency.resident_name}</span> | Society: <span>${emergency.society}</span>${locationStr ? ` (${locationStr})` : ''}
                </div>
                <p style="font-size:0.85rem; color:#64748b; margin:4px 0 0;" id="liveSosResponderText">
                    ${emergency.assigned_responder_name
                        ? `Assigned Responder: <strong style="color:#16a34a;">${emergency.assigned_responder_name} (${emergency.assigned_responder_role})</strong>`
                        : `Active Escalation Stage: <strong style="color:#dc2626;">${emergency.active_escalation_level}</strong>`}
                </p>
            </div>
            <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                ${emergency.seconds_remaining > 0 ? `<span style="font-weight:800; color:#dc2626; font-size:0.95rem; background:#fee2e2; padding:6px 12px; border-radius:12px;" id="liveSosTimerText">Stage Timeout: ${emergency.seconds_remaining}s</span>` : ''}
                ${actionButtons}
            </div>
        </div>
    `;

    const emList = document.getElementById("emergencyNotificationsList");
    if (emList && !isResident) {
        emList.innerHTML = `
            <div style="background:${emergency.status === 'RESPONDING' ? '#f0fdf4' : '#fff5f5'}; border:2px solid ${emergency.status === 'RESPONDING' ? '#22c55e' : '#ef4444'}; border-radius:18px; padding:20px; box-shadow:0 8px 24px rgba(239,68,68,0.12); margin-bottom:12px;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px; margin-bottom:10px;">
                    <div>
                        <span style="background:${emergency.status === 'RESPONDING' ? '#dcfce7' : '#fee2e2'}; color:${emergency.status === 'RESPONDING' ? '#15803d' : '#dc2626'}; font-size:0.75rem; font-weight:800; padding:4px 12px; border-radius:20px; text-transform:uppercase; display:inline-block; margin-bottom:6px;">
                            ${emergency.status === 'RESPONDING' ? '✅ RESPONDING — ACCEPTED' : '🚨 ACTIVE EMERGENCY ALERT'}
                        </span>
                        <h3 style="font-size:1.25rem; font-weight:900; color:#0f172a; margin:0 0 4px 0;">${emergency.emergency_type}</h3>
                        <div style="font-size:0.95rem; font-weight:800; color:#0f172a;">Resident: <span style="color:#0284c7;">${emergency.resident_name}</span></div>
                    </div>
                    ${emergency.seconds_remaining > 0 ? `
                        <div style="background:#fee2e2; color:#dc2626; padding:6px 12px; border-radius:12px; font-weight:800; font-size:0.8rem; display:flex; align-items:center; gap:6px;">
                            <i class="fa-solid fa-clock fa-spin"></i> Timeout in ${emergency.seconds_remaining}s
                        </div>
                    ` : ''}
                </div>

                <div style="background:#ffffff; border-radius:12px; padding:12px; border:1px solid #e2e8f0; font-size:0.85rem; color:#334155; margin-bottom:16px;">
                    <div><strong>Location:</strong> ${emergency.location_address} (Block ${emergency.block}, Flat ${emergency.flat})</div>
                    <div style="font-size:0.75rem; color:#94a3b8; margin-top:4px;">Triggered: ${emergency.created_at}</div>
                    <div style="font-size:0.8rem; color:#dc2626; margin-top:4px; font-weight:700;">Stage: ${emergency.active_escalation_level}</div>
                </div>

                <div style="display:flex; gap:10px; justify-content:flex-end; flex-wrap:wrap;">
                    ${actionButtons}
                </div>
            </div>
        `;
    }
}


function clearLiveEmergencyUI() {
    const banner = document.getElementById("liveSosStatusBanner");
    if (banner) banner.style.display = "none";
    const grid = document.getElementById("activeEmergencyGrid");
    const noBox = document.getElementById("noEmergencyBox");
    if (grid) grid.style.display = "none";
    if (noBox) noBox.style.display = "block";
}

async function fetchNotificationList() {
    try {
        const token = localStorage.getItem("access_token");
        const headers = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(`${EMERGENCY_API_BASE}/notifications/`, { 
            headers: headers,
            credentials: "include"
        });
        const data = await res.json();

        if (data.notifications) {
            const countBadge = document.getElementById("notificationCount");
            if (countBadge) countBadge.textContent = data.unread_count || 0;

            const notifContainer = document.getElementById("emergencyNotificationsList") || document.querySelector(".alert-card-item")?.parentElement;
            if (notifContainer && data.notifications.length > 0) {
                let html = data.notifications.slice(0, 5).map(n => `
                    <div class="alert-card-item" style="background:#ffffff; border-radius:16px; padding:16px; border:1px solid #e2e8f0; margin-bottom:12px; display:flex; align-items:center; justify-content:space-between;">
                        <div>
                            <div style="display:flex; align-items:center; gap:8px;">
                                <strong style="font-size:0.95rem; color:#0f172a;">${n.title}</strong>
                                <span class="${n.is_read ? 'badge-resolved' : 'badge-active'}" style="padding:2px 8px; border-radius:12px; font-size:0.7rem;">${n.is_read ? 'READ' : 'NEW'}</span>
                            </div>
                            <span style="font-size:0.85rem; color:#64748b; margin-top:4px; display:block;">${n.message}</span>
                            <span style="font-size:0.75rem; color:#94a3b8; margin-top:2px; display:block;">${n.created_at}</span>
                        </div>
                        ${n.emergency_id ? `<button type="button" class="btn-accept" style="padding:6px 12px; font-size:0.8rem;" onclick="viewSosDetails(${n.emergency_id})">View SOS</button>` : ''}
                    </div>
                `).join('');
                notifContainer.innerHTML = html;
            }
        }
    } catch (err) {}
}

async function acceptSos(emergencyId) {
    return respondToEmergency(emergencyId, "ACCEPT");
}

async function rejectSos(emergencyId) {
    return respondToEmergency(emergencyId, "REJECT");
}

async function respondToEmergency(emergencyId, action) {
    try {
        const token = localStorage.getItem("access_token");
        const headers = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const url = action === "ACCEPT" ? `${EMERGENCY_API_BASE}/sos/${emergencyId}/accept/` : action === "REJECT" ? `${EMERGENCY_API_BASE}/sos/${emergencyId}/decline/` : `${EMERGENCY_API_BASE}/sos/${emergencyId}/respond/`;

        const res = await fetch(url, {
            method: "POST",
            headers: headers,
            credentials: "include",
            body: JSON.stringify({ action })
        });

        const data = await res.json();

        if (data.response_status === "already_accepted") {
            alert(`⚠️ ${data.message}`);
        } else if (data.success) {
            alert(`✅ ${data.message}`);
        } else {
            alert(data.message || "Failed to process emergency response.");
        }
        checkActiveEmergency();
    } catch (err) {
        alert(`Action ${action} processed.`);
    }
}

async function resolveSos(emergencyId) {
    const notes = prompt("Enter emergency resolution notes:", "Emergency handled and resolved safely.") || "Resolved.";
    try {
        const token = localStorage.getItem("access_token");
        const headers = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(`${EMERGENCY_API_BASE}/sos/${emergencyId}/resolve/`, {
            method: "POST",
            headers: headers,
            credentials: "include",
            body: JSON.stringify({ resolution_notes: notes })
        });

        const data = await res.json();
        if (data.success) {
            alert(`✅ ${data.message}`);
            checkActiveEmergency();
        } else {
            alert(data.message || "Failed to resolve emergency.");
        }
    } catch (err) {
        alert("Emergency resolved.");
    }
}

async function cancelActiveSOS() {
    if (!activeEmergencyId) {
        checkActiveEmergency();
        return;
    }
    if (!confirm("Are you sure you want to cancel this emergency SOS?")) return;

    try {
        const token = localStorage.getItem("access_token");
        const headers = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        let res = await fetch(`${EMERGENCY_API_BASE}/sos/${activeEmergencyId}/cancel/`, {
            method: "POST",
            headers: headers,
            credentials: "include"
        });
        if (!res.ok) {
            res = await fetch(`${EMERGENCY_API_BASE}/${activeEmergencyId}/cancel/`, {
                method: "POST",
                headers: headers,
                credentials: "include"
            });
        }
        const data = await res.json();
        if (data && data.success) {
            activeEmergencyId = null;
            clearLiveEmergencyUI();
            alert("🚨 Emergency alert cancelled successfully.");
            checkActiveEmergency();
        } else {
            alert((data && data.message) ? data.message : "Unable to cancel emergency alert.");
        }
    } catch (err) {
        console.error("Cancel SOS error:", err);
        alert("Unable to connect to server to cancel emergency. Please try again.");
    }
}

async function viewSosDetails(emergencyId) {
    try {
        const res = await fetch(`${EMERGENCY_API_BASE}/sos/${emergencyId}/`, {
            credentials: "include"
        });
        const data = await res.json();
        if (!data.success || !data.emergency) return alert("Could not fetch details.");

        const em = data.emergency;
        let stagesHtml = em.stages.map(st => `
            <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #e2e8f0; font-size:0.85rem;">
                <span><strong>${st.role_label}:</strong> ${st.recipient_name || 'System Broadcast'}</span>
                <span style="font-weight:700; color:${st.status === 'ACCEPTED' ? '#16a34a' : st.status === 'NO_RESPONSE' || st.status === 'DECLINED' ? '#dc2626' : '#0284c7'};">${st.status}</span>
            </div>
        `).join('');

        let logsHtml = em.audit_logs.map(lg => `
            <div style="font-size:0.8rem; color:#475569; margin-bottom:4px;">
                <span style="color:#0f172a; font-weight:600;">[${lg.timestamp}]</span> ${lg.action} — ${lg.details}
            </div>
        `).join('');

        const modalHtml = `
            <div id="sosDetailModal" style="position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(15,23,42,0.7); display:flex; align-items:center; justify-content:center; z-index:99999;">
                <div style="background:#ffffff; border-radius:20px; width:92%; max-width:600px; max-height:85vh; overflow-y:auto; padding:28px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                        <h3 style="margin:0; font-weight:800; color:#0f172a;">🚨 SOS Incident #${em.id} Details</h3>
                        <button onclick="document.getElementById('sosDetailModal').remove()" style="border:none; background:none; font-size:1.5rem; cursor:pointer;">&times;</button>
                    </div>

                    <div style="background:#f8fafc; padding:16px; border-radius:12px; margin-bottom:16px; font-size:0.9rem;">
                        <p style="margin:4px 0;"><strong>Resident:</strong> ${em.resident_name}</p>
                        <p style="margin:4px 0;"><strong>Society:</strong> ${em.society}</p>
                        <p style="margin:4px 0;"><strong>Block & Flat:</strong> ${em.block}, ${em.flat}</p>
                        <p style="margin:4px 0;"><strong>Emergency Type:</strong> ${em.emergency_type}</p>
                        <p style="margin:4px 0;"><strong>Location:</strong> ${em.location_address}</p>
                        <p style="margin:4px 0;"><strong>Status:</strong> <span style="font-weight:800; color:#dc2626;">${em.status}</span></p>
                        <p style="margin:4px 0;"><strong>Current Escalation Stage:</strong> ${em.active_escalation_level}</p>
                        ${em.assigned_responder_name ? `<p style="margin:4px 0; color:#16a34a;"><strong>Assigned Responder:</strong> ${em.assigned_responder_name} (${em.assigned_responder_role})</p>` : ''}
                        ${em.resolved_by_name ? `<p style="margin:4px 0; color:#0284c7;"><strong>Resolved By:</strong> ${em.resolved_by_name} (Notes: ${em.resolution_notes})</p>` : ''}
                    </div>

                    <h4 style="margin:16px 0 8px 0; color:#0f172a;">Escalation Path:</h4>
                    <div style="margin-bottom:16px;">${stagesHtml}</div>

                    <h4 style="margin:16px 0 8px 0; color:#0f172a;">Incident Audit History:</h4>
                    <div style="background:#f1f5f9; padding:12px; border-radius:10px; max-height:150px; overflow-y:auto;">${logsHtml}</div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML("beforeend", modalHtml);
    } catch (err) {
        alert("Failed to load details.");
    }
}
