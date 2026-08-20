/* =========================================================
   CARECONNECT — LOGIN CONTROLLER & SERVER HEALTH MONITOR
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
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", handleLoginSubmit);
    }

    const togglePasswordBtn = document.getElementById("togglePasswordBtn");
    if (togglePasswordBtn) {
        togglePasswordBtn.addEventListener("click", togglePasswordVisibility);
    }

    // Initial server connection check
    checkBackendHealth();
});

async function checkBackendHealth(retryCount = 0) {
    const statusContainer = document.getElementById("serverStatusContainer");

    try {
        let response = await fetch(`${API_BASE_URL}/api/health/`, { method: "GET", credentials: "include" });
        if (!response.ok) {
            response = await fetch(`${API_BASE_URL}/api/auth/login/`, { method: "OPTIONS", credentials: "include" });
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

function togglePasswordVisibility() {
    const passwordInput = document.getElementById("passwordInput");
    const toggleIcon = document.getElementById("togglePasswordBtn");
    if (!passwordInput || !toggleIcon) return;

    if (passwordInput.type === "password") {
        passwordInput.type = "text";
        toggleIcon.classList.remove("fa-eye");
        toggleIcon.classList.add("fa-eye-slash");
    } else {
        passwordInput.type = "password";
        toggleIcon.classList.remove("fa-eye-slash");
        toggleIcon.classList.add("fa-eye");
    }
}

function getDashboardUrlForRole(role) {
    const normalizedRole = (role || "").toLowerCase().trim();
    const dashboards = {
        admin: "/dashboard/admin/admin.html",
        resident: "/dashboard/resident/resident.html",
        guardian: "/dashboard/guardian/guardian.html",
        society_member: "/dashboard/society_member/society_member.html",
        security: "/dashboard/security/security.html",
        volunteer: "/dashboard/volunteer/volunteer.html"
    };
    return dashboards[normalizedRole] || "/index.html";
}

async function handleLoginSubmit(e) {
    e.preventDefault();

    const usernameInput = document.getElementById("usernameInput");
    const passwordInput = document.getElementById("passwordInput");

    const username = usernameInput ? usernameInput.value.trim() : "";
    const password = passwordInput ? passwordInput.value : "";

    if (!username || !password) {
        alert("Please enter both Username and Password.");
        return;
    }

    // Disable button temporarily during request
    const submitBtn = e.target.querySelector("button[type='submit']");
    const originalBtnText = submitBtn ? submitBtn.innerHTML : "";
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Signing In...`;
    }

    try {
        const fetchUrl = `${API_BASE_URL}/api/auth/login/`;
        const response = await fetch(fetchUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            credentials: "include",
            body: JSON.stringify({ username, password })
        });

        let data = null;
        try {
            data = await response.json();
        } catch (jsonErr) {
            data = null;
        }

        if (response.ok && data && data.success && data.user) {
            localStorage.setItem("user", JSON.stringify(data.user));

            const role = (data.user.role || "").toLowerCase().trim();
            const targetUrl = getDashboardUrlForRole(role);
            window.location.href = targetUrl;
        } else {
            const errorMsg = (data && data.message) ? data.message : "Invalid Username or Password. Please try again.";
            alert(errorMsg);
        }
    } catch (err) {
        // Fallback retry check
        const reconnected = await checkBackendHealth();
        if (!reconnected) {
            alert("Unable to connect to the backend server. Please start the server using 'npm run dev' or 'start.bat'.");
        } else {
            alert("Connection restored! Please click Sign In again.");
        }
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        }
    }
}
