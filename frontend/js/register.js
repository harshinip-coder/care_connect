/* =========================================================
   CARECONNECT — REGISTER CONTROLLER & SERVER HEALTH MONITOR
   ========================================================= */

// Dynamic Base URL calculation (supports Vite proxy / direct API)
const getApiBaseUrl = () => {
    if (typeof window !== "undefined" && window.getApiBaseUrl) {
        return window.getApiBaseUrl();
    }
    return ""; // Always use relative URL so Vite dev proxy (/api) handles network requests
};

const API_BASE_URL = getApiBaseUrl();
let isBackendConnected = false;

document.addEventListener("DOMContentLoaded", () => {
    const registerForm = document.getElementById("registerForm");
    if (registerForm) {
        registerForm.addEventListener("submit", handleRegisterSubmit);
    }

    const togglePassBtn = document.getElementById("toggleRegPasswordBtn");
    if (togglePassBtn) {
        togglePassBtn.addEventListener("click", () => toggleRegPassword("regPasswordInput", "toggleRegPasswordBtn"));
    }

    const toggleConfPassBtn = document.getElementById("toggleRegConfirmPasswordBtn");
    if (toggleConfPassBtn) {
        toggleConfPassBtn.addEventListener("click", () => toggleRegPassword("regConfirmPasswordInput", "toggleRegConfirmPasswordBtn"));
    }

    // Initial server connection check
    checkBackendHealth();
});

async function checkBackendHealth(retryCount = 0) {
    const statusContainer = document.getElementById("serverStatusContainer");

    try {
        let response = await fetch(`${API_BASE_URL}/api/health/`, { method: "GET", credentials: "include" });
        if (!response.ok) {
            response = await fetch(`${API_BASE_URL}/api/auth/register/`, { method: "OPTIONS", credentials: "include" });
        }

        // Any response (even 400 or 405) means the Django server is online and reachable
        if (response.ok || response.status < 500) {
            isBackendConnected = true;
            if (statusContainer) {
                statusContainer.style.display = "none";
                statusContainer.innerHTML = "";
            }
            return true;
        }
    } catch (err) {
        isBackendConnected = false;
    }

    // Show status banner if server is unreachable
    if (statusContainer) {
        statusContainer.style.display = "block";
        statusContainer.innerHTML = `
            <div style="background: #fef2f2; border: 1.5px solid #fca5a5; color: #991b1b; padding: 12px 16px; border-radius: 12px; font-size: 0.85rem; display: flex; align-items: center; justify-content: space-between; gap: 10px;">
                <div style="display:flex; align-items:center; gap:8px;">
                    <i class="fa-solid fa-circle-exclamation" style="color:#ef4444; font-size:1.1rem;"></i>
                    <span>Connecting to CareConnect Backend... (Attempting auto-reconnect)</span>
                </div>
                <button type="button" onclick="checkBackendHealth()" style="background:#ef4444; color:#fff; border:none; padding:4px 10px; border-radius:6px; font-size:0.75rem; font-weight:700; cursor:pointer;">Retry</button>
            </div>
        `;
    }

    // Automatically retry health check up to 5 times every 3 seconds
    if (retryCount < 5) {
        setTimeout(() => checkBackendHealth(retryCount + 1), 3000);
    }

    return false;
}

function toggleRegPassword(inputId, iconId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);
    if (!input || !icon) return;

    if (input.type === "password") {
        input.type = "text";
        icon.classList.remove("fa-eye");
        icon.classList.add("fa-eye-slash");
    } else {
        input.type = "password";
        icon.classList.remove("fa-eye-slash");
        icon.classList.add("fa-eye");
    }
}

async function handleRegisterSubmit(e) {
    e.preventDefault();

    const username = document.getElementById("usernameInput") ? document.getElementById("usernameInput").value.trim() : "";
    const firstName = document.getElementById("firstNameInput") ? document.getElementById("firstNameInput").value.trim() : "";
    const lastName = document.getElementById("lastNameInput") ? document.getElementById("lastNameInput").value.trim() : "";
    const role = document.getElementById("roleSelect") ? document.getElementById("roleSelect").value : "resident";
    const bloodGroup = document.getElementById("bloodGroupSelect") ? document.getElementById("bloodGroupSelect").value : "";
    const dob = document.getElementById("dobInput") ? document.getElementById("dobInput").value.trim() : "";
    const mobile = document.getElementById("mobileInput") ? document.getElementById("mobileInput").value.trim() : "";
    const email = document.getElementById("emailInput") ? document.getElementById("emailInput").value.trim() : "";
    const password = document.getElementById("regPasswordInput") ? document.getElementById("regPasswordInput").value : "";
    const confirmPassword = document.getElementById("regConfirmPasswordInput") ? document.getElementById("regConfirmPasswordInput").value : "";

    if (password !== confirmPassword) {
        alert("Passwords do not match. Please verify your password entry.");
        return;
    }

    const finalUsername = username || mobile || (email ? email.split('@')[0] : (firstName ? firstName.toLowerCase().replace(/\s+/g, '') : "user" + Math.floor(Math.random() * 1000)));

    const userObj = {
        username: finalUsername,
        password: password,
        first_name: firstName,
        last_name: lastName,
        role: role,
        blood_group: bloodGroup,
        dob: dob,
        phone: mobile,
        email: email
    };

    // Disable button temporarily during request
    const submitBtn = e.target.querySelector("button[type='submit']");
    const originalBtnText = submitBtn ? submitBtn.innerHTML : "";
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Creating Account...`;
    }

    try {
        const fetchUrl = `${API_BASE_URL}/api/auth/register/`;
        const response = await fetch(fetchUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            credentials: "include",
            body: JSON.stringify(userObj)
        });

        let data = null;
        try {
            data = await response.json();
        } catch (jsonErr) {
            data = null;
        }

        if (response.ok && data && data.success) {
            alert(data.message || "Registration successful! Please sign in.");
            window.location.href = "/index.html";
        } else {
            const errorMsg = (data && data.message) ? data.message : `Registration failed (Status ${response.status}). Please try again.`;
            alert(errorMsg);
        }
    } catch (err) {
        const reconnected = await checkBackendHealth();
        if (!reconnected) {
            alert("Unable to connect to registration server. Please start the server using 'npm run dev' or 'start.bat'.");
        } else {
            alert("Connection restored! Please click Create Account again.");
        }
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        }
    }
}
