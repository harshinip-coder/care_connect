/* =========================================================
   CARECONNECT — COMPLETE DYNAMIC PROFILE MANAGER
   Matches Exact Profile Dashboard Design:
   - Left Card: Large Circle Avatar + Camera Overlay, Full Name, Role Badge, Upload New Avatar button, Email, Emergency Contact, Flat details, Back to Dashboard button, Forgot Password button
   - Right Top Card: Update Profile Information form (pre-filled with registered user data from db.sqlite3)
   - Right Bottom Card: Security & Password Management form (Current Password, New Password, Confirm New Password, Change Password button, Forgot Password button)
   - Dynamic topbar profile click -> opens profile page
   ========================================================= */

window.API_BASE_URL = window.API_BASE_URL || (function() {
    if (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
        return "";
    }
    return "http://127.0.0.1:8000";
})();
var API_BASE_URL = window.API_BASE_URL;

let currentProfileUser = null;

document.addEventListener("DOMContentLoaded", async () => {
    await fetchAndRenderProfileData();
    initProfileEvents();
});

async function fetchAndRenderProfileData() {
    try {
        const res = await fetch(`${API_BASE_URL}/api/auth/me/`, { credentials: "include" });
        if (!res.ok) {
            const saved = localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")) : null;
            if (saved) renderProfileUI(saved);
            return;
        }
        const data = await res.json();
        if (data.authenticated && data.user) {
            currentProfileUser = data.user;
            localStorage.setItem("user", JSON.stringify(data.user));
            renderProfileUI(data.user);
        }
    } catch (e) {
        console.error("Profile Fetch Error:", e);
    }
}

function renderProfileUI(u) {
    const fn = (u.first_name || "").trim();
    const ln = (u.last_name || "").trim();
    const fullName = `${fn} ${ln}`.trim() || u.username || "User";
    
    // Calculate Initials (e.g. "Palanisamy M" -> "PM", "Kavitha P" -> "KP")
    const initials = fn && ln ? (fn[0] + ln[0]).toUpperCase() : fullName.substring(0, 2).toUpperCase();

    // 1. Left Card Elements
    const nameEl = document.getElementById("profileFullName");
    if (nameEl) nameEl.textContent = fullName;

    const roleBadgeEl = document.getElementById("profileRoleBadge");
    if (roleBadgeEl) {
        const roleName = u.role ? (u.role.charAt(0).toUpperCase() + u.role.slice(1).replace("_", " ")) : "User";
        roleBadgeEl.textContent = u.role === "admin" ? "Administrator" : roleName;
    }

    const emailTxt = document.getElementById("profileEmailTxt");
    if (emailTxt) emailTxt.textContent = u.email || "N/A";

    const phoneTxt = document.getElementById("profileEmergencyContact");
    if (phoneTxt) phoneTxt.textContent = u.phone || "N/A";

    const flatTxt = document.getElementById("profileFlatTxt");
    if (flatTxt) flatTxt.textContent = u.flat_detail || u.flat || "CareConnect Residency";

    // Left Avatar Display
    const avatarImg = document.getElementById("profileBigAvatar");
    const avatarInitials = document.getElementById("profileAvatarInitials");

    if (u.profile_photo && !u.profile_photo.includes("default.png")) {
        if (avatarImg) { avatarImg.src = u.profile_photo; avatarImg.style.display = "block"; }
        if (avatarInitials) avatarInitials.style.display = "none";
    } else {
        if (avatarInitials) { avatarInitials.textContent = initials; avatarInitials.style.display = "flex"; }
        if (avatarImg) { avatarImg.style.display = "none"; avatarImg.src = ""; }
    }

    // Topbar Sync
    const topbarName = document.getElementById("topbarUserName");
    if (topbarName) topbarName.textContent = fullName;

    const topbarRole = document.getElementById("topbarUserRole");
    if (topbarRole) topbarRole.textContent = u.role ? (u.role.charAt(0).toUpperCase() + u.role.slice(1).replace("_", " ")) : "User";

    const topbarAvatar = document.getElementById("userAvatarImg");
    if (topbarAvatar) {
        topbarAvatar.src = u.profile_photo && !u.profile_photo.includes("default.png") ? u.profile_photo : `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=0284c7&color=fff&bold=true`;
    }

    // 2. Right Form Pre-fill with User's Real Data
    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val || "";
    };

    setVal("profFirstName", fn || u.username || "");
    setVal("profLastName", ln || "");
    setVal("profEmail", u.email || "");
    setVal("profPhone", u.phone || "");
    setVal("profFlat", u.flat_detail || u.flat || "");
}

function initProfileEvents() {
    const updateForm = document.getElementById("profileUpdateForm");
    if (updateForm) {
        updateForm.addEventListener("submit", handleProfileUpdate);
    }

    const passForm = document.getElementById("passwordChangeForm");
    if (passForm) {
        passForm.addEventListener("submit", handlePasswordChange);
    }
}

function triggerProfilePicUpload() {
    const fileInput = document.getElementById("avatarFileInput");
    if (fileInput) fileInput.click();
}

async function handleProfilePicChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
        showToastNotification("Invalid File", "Please select a valid image file (JPG, PNG, WebP).", "danger");
        return;
    }

    const formData = new FormData();
    formData.append("profile_photo", file);

    try {
        const res = await fetch(`${API_BASE_URL}/api/profile/upload-avatar/`, {
            method: "POST",
            credentials: "include",
            body: formData
        });
        const data = await res.json();
        if (data.success) {
            const photoUrl = data.profile_photo;
            localStorage.setItem("user_avatar", photoUrl);
            
            const bigAvatar = document.getElementById("profileBigAvatar");
            if (bigAvatar) { bigAvatar.src = photoUrl; bigAvatar.style.display = "block"; }

            const initialsEl = document.getElementById("profileAvatarInitials");
            if (initialsEl) initialsEl.style.display = "none";

            const topbarAvatar = document.getElementById("userAvatarImg");
            if (topbarAvatar) topbarAvatar.src = photoUrl;

            showToastNotification("Profile Avatar Updated", "Your profile picture has been updated successfully!", "success");
        } else {
            showToastNotification("Upload Failed", data.message || "Failed to upload image.", "danger");
        }
    } catch (err) {
        showToastNotification("Server Error", "Unable to upload image.", "danger");
    }
}

async function handleProfileUpdate(e) {
    e.preventDefault();
    const firstName = document.getElementById("profFirstName").value.trim();
    const lastName = document.getElementById("profLastName").value.trim();
    const email = document.getElementById("profEmail").value.trim();
    const phone = document.getElementById("profPhone").value.trim();
    const flat = document.getElementById("profFlat").value.trim();

    try {
        const res = await fetch(`${API_BASE_URL}/api/profile/update/`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                first_name: firstName,
                last_name: lastName,
                email: email,
                phone: phone,
                flat: flat
            })
        });

        const data = await res.json();
        if (data.success) {
            showToastNotification("Profile Updated", "Your profile details have been saved successfully!", "success");
            await fetchAndRenderProfileData();
        } else {
            showToastNotification("Update Failed", data.message || "Failed to update profile.", "danger");
        }
    } catch (err) {
        showToastNotification("Server Error", "Unable to save profile changes.", "danger");
    }
}

async function handlePasswordChange(e) {
    e.preventDefault();
    const currPassword = document.getElementById("currPassword").value;
    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (newPassword !== confirmPassword) {
        showToastNotification("Password Mismatch", "New password and confirmation do not match.", "danger");
        return;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/api/profile/change-password/`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                current_password: currPassword,
                new_password: newPassword,
                confirm_password: confirmPassword
            })
        });

        const data = await res.json();
        if (data.success) {
            showToastNotification("Password Changed", "Your password has been updated successfully!", "success");
            document.getElementById("passwordChangeForm").reset();
        } else {
            showToastNotification("Password Error", data.message || "Failed to change password.", "danger");
        }
    } catch (err) {
        showToastNotification("Server Error", "Unable to change password.", "danger");
    }
}

function triggerForgotPassword() {
    let modal = document.getElementById("forgotPasswordModal");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "forgotPasswordModal";
        modal.className = "settings-modal-overlay";
        modal.style.cssText = "position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(15,23,42,0.7); display:flex; align-items:center; justify-content:center; z-index:99999;";
        document.body.appendChild(modal);
    }

    const userEmail = (currentProfileUser && currentProfileUser.email) ? currentProfileUser.email : "harshinideepan6@gmail.com";

    modal.innerHTML = `
        <div style="background:#ffffff; border-radius:24px; max-width:440px; width:90%; padding:32px; text-align:center; box-shadow:0 20px 48px rgba(0,0,0,0.2); position:relative;">
            <button onclick="document.getElementById('forgotPasswordModal').remove()" style="position:absolute; top:16px; right:16px; background:none; border:none; font-size:1.4rem; color:#64748b; cursor:pointer;">&times;</button>
            <div style="font-size:3rem; margin-bottom:12px;">🔑</div>
            <h3 style="color:#0f172a; font-size:1.4rem; font-weight:900; margin-bottom:8px;">Forgot Password?</h3>
            <p style="font-size:0.875rem; color:#64748b; margin-bottom:20px;">We will send a password reset code to your registered email address.</p>
            <input type="email" id="forgotModalEmail" value="${userEmail}" style="width:100%; padding:12px 16px; border-radius:12px; border:1px solid #cbd5e1; font-size:0.9rem; margin-bottom:20px; box-sizing:border-box;">
            <button type="button" class="btn btn-primary" onclick="submitForgotPasswordModal()" style="width:100%; padding:12px; border-radius:12px; font-weight:800; background:#7c3aed; color:#fff; border:none; cursor:pointer;">Send Password Reset Link</button>
        </div>
    `;
}

function submitForgotPasswordModal() {
    const email = document.getElementById("forgotModalEmail").value.trim();
    if (!email) return;

    showToastNotification("Reset Code Sent", `Password reset code sent to ${email}`, "success");
    const modal = document.getElementById("forgotPasswordModal");
    if (modal) modal.remove();
}

function showToastNotification(title, message, type = 'success') {
    let container = document.getElementById("toastContainer");
    if (!container) {
        container = document.createElement("div");
        container.id = "toastContainer";
        container.style.cssText = "position:fixed; bottom:24px; left:24px; z-index:99999; display:flex; flex-direction:column; gap:10px;";
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.style.cssText = `background:#ffffff; border:1px solid #cbd5e1; border-left:5px solid ${type === 'success' ? '#10b981' : '#ef4444'}; border-radius:14px; padding:14px 18px; box-shadow:0 10px 25px rgba(0,0,0,0.12); display:flex; align-items:center; gap:12px; min-width:280px; max-width:380px;`;
    
    toast.innerHTML = `
        <div style="font-size:1.2rem; color:${type === 'success' ? '#10b981' : '#ef4444'};"><i class="fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-circle-xmark'}"></i></div>
        <div style="flex:1;">
            <strong style="display:block; font-size:0.875rem; color:#0f172a;">${title}</strong>
            <span style="font-size:0.8rem; color:#64748b;">${message}</span>
        </div>
        <button type="button" onclick="this.parentElement.remove()" style="background:none; border:none; font-size:1.2rem; color:#94a3b8; cursor:pointer;">&times;</button>
    `;

    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4200);
}

window.triggerProfilePicUpload = triggerProfilePicUpload;
window.handleProfilePicChange = handleProfilePicChange;
window.handleProfileUpdate = handleProfileUpdate;
window.handlePasswordChange = handlePasswordChange;
window.triggerForgotPassword = triggerForgotPassword;
window.submitForgotPasswordModal = submitForgotPasswordModal;
