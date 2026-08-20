/* =========================================================
   CARECONNECT — AUTH GUARD & SESSION MANAGEMENT
   Validates active Django session role on page load via /api/auth/me/
   Prevents unauthorized role access & dynamic header synchronization
   ========================================================= */

window.getApiBaseUrl = window.getApiBaseUrl || function() {
    if (typeof window !== "undefined" && window.location.port === "8000") {
        return "";
    }
    const hostname = (typeof window !== "undefined" && window.location.hostname) ? window.location.hostname : "127.0.0.1";
    // If hosted on live cloud domain (e.g. vercel.app), point to production Render backend
    if (hostname !== "localhost" && hostname !== "127.0.0.1" && hostname.includes(".app")) {
        return "https://careconnect-api.onrender.com";
    }
    return `http://${hostname}:8000`;
};

window.API_BASE_URL = window.API_BASE_URL || window.getApiBaseUrl();
var API_BASE_URL = window.API_BASE_URL;

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

function detectRoleFromPath() {
    const path = window.location.pathname.toLowerCase();
    if (path.includes("/dashboard/admin")) return "admin";
    if (path.includes("/dashboard/resident")) return "resident";
    if (path.includes("/dashboard/guardian")) return "guardian";
    if (path.includes("/dashboard/society_member")) return "society_member";
    if (path.includes("/dashboard/security")) return "security";
    if (path.includes("/dashboard/volunteer")) return "volunteer";
    return null;
}

async function verifySessionAndRole(requiredRole) {
    const expectedRole = (requiredRole || detectRoleFromPath() || "").toLowerCase().trim();

    // 1. Instant UI render & session retrieval from stored user
    const storedUserRaw = localStorage.getItem("user") || sessionStorage.getItem("user");
    let storedUser = null;
    if (storedUserRaw) {
        try {
            storedUser = JSON.parse(storedUserRaw);
            if (storedUser) {
                updateDynamicHeaderUI(storedUser);
            }
        } catch (e) {}
    }

    // 2. Verify active Django session over API
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/me/`, {
            method: "GET",
            headers: { "Accept": "application/json" },
            credentials: "include"
        });

        if (response.ok) {
            const data = await response.json();
            if (data.authenticated && data.user) {
                const currentRole = (data.user.role || "").toLowerCase().trim();

                // Enforce role access control
                if (expectedRole && currentRole !== expectedRole && currentRole !== "admin") {
                    const correctUrl = getDashboardUrlForRole(currentRole);
                    if (window.location.pathname !== correctUrl) {
                        window.location.href = correctUrl;
                        return null;
                    }
                }

                localStorage.setItem("user", JSON.stringify(data.user));
                updateDynamicHeaderUI(data.user);
                return data.user;
            }
        }
    } catch (err) {
        console.warn("Auth check network notice:", err);
    }

    // 3. Fallback: Trust storedUser if active session check is unauthenticated/cross-origin
    if (storedUser) {
        const storedRole = (storedUser.role || "").toLowerCase().trim();
        if (!expectedRole || storedRole === expectedRole || storedRole === "admin") {
            return storedUser;
        }
    }

    // 4. Redirect unauthenticated requests without stored user session
    localStorage.removeItem("user");
    sessionStorage.removeItem("user");
    window.location.href = "/index.html";
    return null;
}

function updateDynamicHeaderUI(user) {
    if (!user) return;

    const firstName = user.first_name || user.firstName || "";
    const lastName = user.last_name || user.lastName || "";
    const fullName = `${firstName} ${lastName}`.trim() || user.username || "User";
    const roleClean = (user.role || "").toLowerCase().trim();
    const roleFormatted = roleClean.charAt(0).toUpperCase() + roleClean.slice(1).replace("_", " ");

    const welcomeUserName = document.getElementById("welcomeUserName");
    if (welcomeUserName) welcomeUserName.textContent = fullName;

    const welcomeHeaderTitle = document.getElementById("welcomeHeaderTitle");
    if (welcomeHeaderTitle) {
        welcomeHeaderTitle.innerHTML = `Welcome back, <span id="welcomeUserName">${fullName}</span> 👋`;
    }

    const topbarUserName = document.getElementById("topbarUserName");
    if (topbarUserName) topbarUserName.textContent = fullName;

    const topbarUserRole = document.getElementById("topbarUserRole");
    if (topbarUserRole) topbarUserRole.textContent = roleFormatted;

    const userAvatarImg = document.getElementById("userAvatarImg");
    if (userAvatarImg) {
        const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=10b981&color=fff&bold=true`;
        userAvatarImg.src = avatarUrl;
    }
}

async function handleLogout() {
    try {
        await fetch(`${API_BASE_URL}/api/auth/logout/`, {
            method: "POST",
            credentials: "include"
        });
    } catch (e) {}

    localStorage.clear();
    sessionStorage.clear();
    window.location.href = "/index.html";
}

document.addEventListener("DOMContentLoaded", () => {
    if (window.location.pathname.includes("/dashboard/")) {
        const expectedRole = detectRoleFromPath();
        if (expectedRole) {
            verifySessionAndRole(expectedRole);
        }
    }
});

window.getDashboardUrlForRole = getDashboardUrlForRole;
window.verifySessionAndRole = verifySessionAndRole;
window.handleLogout = handleLogout;
