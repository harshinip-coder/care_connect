/* =========================================================
   CARECONNECT — SOS & SEQUENTIAL NOTIFICATION ENGINE
   1. Confirmation Modal ([ DECLINE ] / [ CONFIRM SOS ])
   2. One-by-One Sequential Notification Chain
   3. Backend-Driven 3-Second Timeout Evaluation
   4. Real-time 1-Second Polling & Live Tracker Update
   5. Role Dashboard Response Cards & Popup Modals (Guardian, Security, Admin, Volunteer)
   ========================================================= */

let sosPollInterval = null;
let currentActiveEmergencyId = null;
let lastNotifiedStageRole = null;

document.addEventListener("DOMContentLoaded", function () {
    console.log("CareConnect SOS Engine Loaded");
    initSOSButtons();
    initNotificationsBadge();
    startSosPolling();
});

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== "") {
        const cookies = document.cookie.split(";");
        for (let cookie of cookies) {
            cookie = cookie.trim();
            if (cookie.startsWith(name + "=")) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
            }
        }
    }
    return cookieValue;
}

function initSOSButtons() {
    const sosBtns = document.querySelectorAll("#mainSosButton, #sosButton, .sos-main-button, .sos-btn");
    sosBtns.forEach(btn => {
        btn.addEventListener("click", function (e) {
            e.preventDefault();
            openSosConfirmationModal("Medical");
        });
    });
}

function openSosConfirmationModal(category = "Medical") {
    let modal = document.getElementById("sosConfirmModal");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "sosConfirmModal";
        modal.className = "settings-modal-overlay";
        modal.style.cssText = "position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(15,23,42,0.7); display:none; align-items:center; justify-content:center; z-index:9999;";
        modal.innerHTML = `
            <div class="settings-modal-content" style="background:#ffffff; border-radius:24px; max-width:440px; width:90%; padding:32px; text-align:center; box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);">
                <div style="font-size:3.5rem; margin-bottom:12px;">🚨</div>
                <h2 style="color:#ef4444; font-size:1.6rem; font-weight:900; margin-bottom:8px; letter-spacing:-0.5px;">EMERGENCY SOS</h2>
                <p style="font-size:1.05rem; color:#334155; font-weight:600; margin-bottom:24px; line-height:1.4;">Are you sure you want to send an SOS alert?</p>
                <div style="display:flex; gap:12px; justify-content:center;">
                    <button type="button" class="btn btn-secondary" onclick="closeSosConfirmModal()" style="padding:10px 24px; border-radius:12px; font-weight:700; font-size:0.95rem;">DECLINE</button>
                    <button type="button" class="btn btn-danger" onclick="submitSosConfirm('${category}')" id="btnConfirmSosSubmit" style="padding:10px 24px; border-radius:12px; font-weight:700; font-size:0.95rem; background:#dc2626; border:none;">CONFIRM SOS</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    modal.style.display = "flex";
    modal.classList.add("show");
}

function closeSosConfirmModal() {
    const modal = document.getElementById("sosConfirmModal");
    if (modal) {
        modal.style.display = "none";
        modal.classList.remove("show");
    }
}

function submitSosConfirm(category) {
    closeSosConfirmModal();

    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                sendSosPayload(category, lat, lng);
            },
            (error) => {
                sendSosPayload(category, null, null);
            },
            { timeout: 1500 }
        );
    } else {
        sendSosPayload(category, null, null);
    }
}

function sendSosPayload(category, lat, lng) {
    const payload = {
        emergency_type: category || "Medical",
        description: "Emergency SOS triggered by resident",
        latitude: lat,
        longitude: lng
    };

    fetch("/api/emergency/sos/", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": getCookie("csrftoken")
        },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        if (!data.success) {
            alert(data.message || "Failed to dispatch SOS alert.");
            return;
        }

        if (data.created === false) {
            showDuplicateSosModal(data.emergency);
            return;
        }

        currentActiveEmergencyId = data.emergency.id;
        showToastNotification("🚨 SOS Activated!", "Your emergency alert has been sent. Initiating sequential notification chain...", "danger");

        renderLiveEscalationTracker(data.emergency);
        startSosPolling();
    })
    .catch(err => {
        console.error("SOS Dispatch Error:", err);
    });
}

function showDuplicateSosModal(emergency) {
    let modal = document.getElementById("duplicateSosModal");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "duplicateSosModal";
        modal.className = "settings-modal-overlay";
        modal.style.cssText = "position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(15,23,42,0.7); display:none; align-items:center; justify-content:center; z-index:9999;";
        modal.innerHTML = `
            <div class="settings-modal-content" style="background:#ffffff; border-radius:24px; max-width:440px; width:90%; padding:32px; text-align:center;">
                <div style="font-size:3.5rem; margin-bottom:12px;">⚠️</div>
                <h3 style="color:#0f172a; font-weight:800; margin-bottom:8px;">Active SOS Exists</h3>
                <p style="font-size:0.95rem; color:#64748b; margin-bottom:24px;">You already have an active emergency alert in progress.</p>
                <div style="display:flex; gap:12px; justify-content:center;">
                    <button type="button" class="btn btn-secondary" onclick="closeDuplicateSosModal()" style="border-radius:12px; font-weight:700;">Close</button>
                    <button type="button" class="btn btn-primary" onclick="closeDuplicateSosModal(); renderLiveEscalationTracker(currentEmergencyGlobal);" style="border-radius:12px; font-weight:700;">VIEW ACTIVE SOS</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    window.currentEmergencyGlobal = emergency;
    modal.style.display = "flex";
    modal.classList.add("show");
}

function closeDuplicateSosModal() {
    const modal = document.getElementById("duplicateSosModal");
    if (modal) {
        modal.style.display = "none";
        modal.classList.remove("show");
    }
}

function startSosPolling() {
    if (sosPollInterval) clearInterval(sosPollInterval);
    pollActiveEmergencyStatus();
    sosPollInterval = setInterval(pollActiveEmergencyStatus, 1000);
}

function pollActiveEmergencyStatus() {
    fetch("/api/emergency/my-active/")
    .then(res => res.json())
    .then(data => {
        if (!data.has_active || !data.emergency) {
            const container = document.getElementById("sosEscalationTrackerContainer");
            if (container) container.innerHTML = "";
            closeResponderPopupModal();
            return;
        }

        const em = data.emergency;
        currentActiveEmergencyId = em.id;
        renderLiveEscalationTracker(em);
        renderRoleResponseCard(em);

        if (em.can_respond) {
            openEmergencyPopupAlertModal(em);
        } else {
            closeResponderPopupModal();
        }

        updateNotificationBadge();
    })
    .catch(err => console.error("Polling Error:", err));
}

function renderLiveEscalationTracker(em) {
    let container = document.getElementById("sosEscalationTrackerContainer");
    if (!container) {
        const parent = document.querySelector(".dashboard-main-content") || document.querySelector(".container.mt-4") || document.body;
        container = document.createElement("div");
        container.id = "sosEscalationTrackerContainer";
        parent.insertBefore(container, parent.firstChild);
    }

    const isResolved = em.status === "RESOLVED";
    const isEscalated = em.status === "ESCALATED";
    const isInProgress = em.status === "IN_PROGRESS";

    let statusHeader = "";
    if (isInProgress) {
        statusHeader = `<span class="sos-status-badge sos-status-accepted"><i class="fa-solid fa-circle-check"></i> ACTIVE — ${em.assigned_responder_role || 'Responder'} Responded</span>`;
    } else if (isEscalated) {
        statusHeader = `<span class="sos-status-badge sos-status-escalated"><i class="fa-solid fa-triangle-exclamation"></i> EMERGENCY ESCALATED</span>`;
    } else if (isResolved) {
        statusHeader = `<span class="sos-status-badge sos-status-accepted"><i class="fa-solid fa-check"></i> RESOLVED</span>`;
    } else {
        statusHeader = `<span class="sos-status-badge sos-status-pending"><i class="fa-solid fa-spinner fa-spin"></i> SEQUENTIAL NOTIFICATION IN PROGRESS (Timeout: ${em.seconds_remaining}s)</span>`;
    }

    let stagesHTML = "";
    em.stages.forEach((st, idx) => {
        const stepNum = idx + 1;
        let rowClass = "sos-step-row";
        let tagHTML = "";

        if (st.status === "ACCEPTED") {
            rowClass += " completed-step";
            tagHTML = `<span class="sos-step-status-tag tag-accepted">✓ Accepted ${st.recipient_name ? '(' + st.recipient_name + ')' : ''}</span>`;
        } else if (st.status === "PENDING") {
            rowClass += " active-step";
            tagHTML = `<span class="sos-step-status-tag tag-notifying">⏳ Waiting for response (${em.seconds_remaining}s)</span>`;
        } else if (st.status === "DECLINED") {
            tagHTML = `<span class="sos-step-status-tag tag-declined">✗ Declined</span>`;
        } else if (st.status === "NO_RESPONSE") {
            tagHTML = `<span class="sos-step-status-tag tag-timeout">⏱ No Response (Timed out)</span>`;
        } else {
            tagHTML = `<span class="sos-step-status-tag tag-waiting">○ Waiting in queue</span>`;
        }

        stagesHTML += `
            <div class="${rowClass}">
                <div class="sos-step-info">
                    <div class="sos-step-num">${stepNum}</div>
                    <div class="sos-step-name">${st.role_label}</div>
                </div>
                <div>${tagHTML}</div>
            </div>
        `;
    });

    let mainMessage = "";
    if (isInProgress) {
        mainMessage = `<div style="background:#dcfce7; color:#15803d; padding:12px 16px; border-radius:12px; margin-top:16px; font-weight:700;">✓ Responder ${em.assigned_responder_name || ''} (${em.assigned_responder_role || 'Assigned'}) has ACCEPTED the call. Assistance is on the way!</div>`;
    } else if (isEscalated) {
        mainMessage = `<div style="background:#fee2e2; color:#b91c1c; padding:12px 16px; border-radius:12px; margin-top:16px; font-weight:700;">🚨 No responder accepted the SOS before timeout. Incident remains ESCALATED until an authorized person resolves it.</div>`;
    }

    container.innerHTML = `
        <div class="sos-escalation-card">
            <div class="sos-escalation-header">
                <div>
                    <h3 style="font-size:1.3rem; font-weight:900; color:#0f172a; margin-bottom:4px;"><i class="fa-solid fa-bell text-red"></i> Live Emergency SOS Status — Incident #${em.id}</h3>
                    <p style="font-size:0.875rem; color:#64748b; margin:0;">Resident: <strong>${em.resident_name}</strong> | Location: <strong>${em.location_address}</strong></p>
                </div>
                <div>${statusHeader}</div>
            </div>
            <div class="sos-steps-container">
                ${stagesHTML}
            </div>
            ${mainMessage}
        </div>
    `;
}

function renderRoleResponseCard(em) {
    let card = document.getElementById("sosRoleResponseCard");
    if (!card) {
        const main = document.querySelector(".dashboard-main-content") || document.querySelector(".container.mt-4") || document.body;
        card = document.createElement("div");
        card.id = "sosRoleResponseCard";
        main.insertBefore(card, main.firstChild);
    }

    if (!em.can_respond) {
        card.innerHTML = "";
        return;
    }

    const activeStage = em.stages.find(s => s.status === "PENDING");
    const roleTitle = activeStage ? activeStage.role_label : "Emergency Alert";

    card.innerHTML = `
        <div style="background:#fef2f2; border:2px solid #ef4444; border-radius:20px; padding:24px; margin-bottom:24px; box-shadow:0 10px 25px rgba(239,68,68,0.2);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <h3 style="color:#ef4444; font-weight:900; font-size:1.3rem; margin:0;"><i class="fa-solid fa-triangle-exclamation"></i> 🚨 ACTION REQUIRED: ${roleTitle.toUpperCase()}</h3>
                <span style="background:#ef4444; color:#fff; padding:4px 12px; border-radius:12px; font-weight:800; font-size:0.85rem;">⏳ ${em.seconds_remaining}s REMAINING</span>
            </div>
            <p style="font-size:1.05rem; color:#1e293b; font-weight:700; margin-bottom:4px;">Resident ${em.resident_name} has triggered an emergency SOS!</p>
            <p style="font-size:0.9rem; color:#475569; margin-bottom:16px;"><strong>Location:</strong> ${em.location_address} | <strong>Emergency Type:</strong> ${em.emergency_type}</p>
            <div style="display:flex; gap:16px;">
                <button type="button" class="btn btn-success fw-bold px-4 py-2" onclick="respondToEmergency(${em.id}, 'ACCEPT')" style="border-radius:12px; font-size:1rem; background:#16a34a; border:none;">
                    <i class="fa-solid fa-check me-1"></i> ACCEPT
                </button>
                <button type="button" class="btn btn-outline-danger fw-bold px-4 py-2" onclick="respondToEmergency(${em.id}, 'DECLINE')" style="border-radius:12px; font-size:1rem;">
                    <i class="fa-solid fa-xmark me-1"></i> DECLINE
                </button>
            </div>
        </div>
    `;
}

function openEmergencyPopupAlertModal(em) {
    if (!em.can_respond) return;

    let modal = document.getElementById("responderEmergencyAlertPopupModal");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "responderEmergencyAlertPopupModal";
        modal.className = "settings-modal-overlay";
        modal.style.cssText = "position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(15,23,42,0.85); display:none; align-items:center; justify-content:center; z-index:99999; backdrop-filter:blur(6px);";
        document.body.appendChild(modal);
    }

    const activeStage = em.stages.find(s => s.status === "PENDING");
    const roleTitle = activeStage ? activeStage.role_label : "Emergency Alert";

    modal.innerHTML = `
        <div class="settings-modal-content" style="background:#ffffff; border-radius:28px; max-width:480px; width:92%; padding:36px; text-align:center; box-shadow:0 30px 60px -12px rgba(239,68,68,0.5); border:3px solid #ef4444;">
            <div style="font-size:3.8rem; margin-bottom:8px;">🚨</div>
            <span style="background:#fee2e2; color:#b91c1c; padding:4px 14px; border-radius:12px; font-weight:800; font-size:0.8rem; letter-spacing:0.5px; text-transform:uppercase;">YOUR STAGE: ${roleTitle}</span>
            <h2 style="color:#ef4444; font-size:1.7rem; font-weight:900; margin:12px 0 6px;">IMMEDIATE SOS ALERT!</h2>
            <p style="font-size:1.05rem; color:#1e293b; font-weight:700; margin-bottom:4px;">Resident ${em.resident_name} needs urgent emergency response!</p>
            <p style="font-size:0.9rem; color:#64748b; margin-bottom:16px;"><strong>Location:</strong> ${em.location_address}</p>
            
            <div style="background:#fef3c7; color:#b45309; padding:10px 16px; border-radius:14px; font-weight:800; font-size:1.1rem; margin-bottom:24px; display:inline-block;">
                ⏳ TIME REMAINING TO RESPOND: ${em.seconds_remaining}s
            </div>

            <div style="display:flex; gap:14px; justify-content:center;">
                <button type="button" class="btn btn-outline-secondary" onclick="closeResponderPopupModal(); respondToEmergency(${em.id}, 'DECLINE');" style="padding:12px 24px; border-radius:14px; font-weight:800; flex:1;">DECLINE</button>
                <button type="button" class="btn btn-danger" onclick="closeResponderPopupModal(); respondToEmergency(${em.id}, 'ACCEPT');" style="padding:12px 24px; border-radius:14px; font-weight:800; background:#dc2626; border:none; flex:1; font-size:1.05rem;">ACCEPT SOS</button>
            </div>
        </div>
    `;
    modal.style.display = "flex";
    modal.classList.add("show");
}

function closeResponderPopupModal() {
    const modal = document.getElementById("responderEmergencyAlertPopupModal");
    if (modal) {
        modal.style.display = "none";
        modal.classList.remove("show");
    }
}

function respondToEmergency(emergencyId, action) {
    fetch(`/api/emergency/${emergencyId}/respond/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": getCookie("csrftoken")
        },
        body: JSON.stringify({ action: action })
    })
    .then(res => res.json())
    .then(data => {
        closeResponderPopupModal();
        if (data.success) {
            showToastNotification(action === 'ACCEPT' ? "Emergency Accepted!" : "Emergency Declined", data.message, action === 'ACCEPT' ? 'success' : 'warning');
        } else {
            alert(data.message || "Failed to record response.");
        }
        pollActiveEmergencyStatus();
    })
    .catch(err => console.error("Response Error:", err));
}

function resolveEmergencyIncident(emergencyId) {
    if (!confirm("Are you sure you want to mark this emergency as RESOLVED?")) return;

    fetch(`/api/emergency/${emergencyId}/resolve/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": getCookie("csrftoken")
        }
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showToastNotification("Emergency Resolved", "Incident marked as resolved. Responder status released.", "success");
        } else {
            alert(data.message || "Failed to resolve emergency.");
        }
        pollActiveEmergencyStatus();
    })
    .catch(err => console.error("Resolve Error:", err));
}

function initNotificationsBadge() {
    updateNotificationBadge();
}

function updateNotificationBadge() {
    fetch("/api/notifications/")
    .then(res => res.json())
    .then(data => {
        const badges = document.querySelectorAll("#notificationCount, .nav-icon .badge, .topbar-right .notification-badge");
        badges.forEach(b => {
            if (data.unread_count > 0) {
                b.textContent = data.unread_count;
                b.style.display = "inline-block";
            } else {
                b.textContent = "0";
            }
        });
    })
    .catch(err => {});
}

function showToastNotification(title, message, type = 'success') {
    let container = document.getElementById("toastContainer");
    if (!container) {
        container = document.createElement("div");
        container.id = "toastContainer";
        container.className = "toast-container";
        container.style.cssText = "position:fixed; bottom:24px; right:24px; z-index:99999; display:flex; flex-direction:column; gap:10px;";
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `toast-popup toast-${type}`;
    toast.style.cssText = "background:#ffffff; border-radius:14px; padding:16px 20px; box-shadow:0 10px 25px rgba(0,0,0,0.15); border-left:6px solid " + (type === 'danger' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#10b981') + "; display:flex; align-items:center; gap:14px; max-width:380px;";

    toast.innerHTML = `
        <div class="toast-content">
            <strong style="display:block; font-size:0.95rem; color:#0f172a;">${title}</strong>
            <span style="font-size:0.85rem; color:#64748b;">${message}</span>
        </div>
        <button type="button" style="background:none; border:none; font-size:1.2rem; cursor:pointer;" onclick="this.parentElement.remove()">&times;</button>
    `;

    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4200);
}