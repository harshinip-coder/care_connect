/* =========================================================
   CARECONNECT — MODULE CRUD MANAGER (Add, Edit, Delete, Filter)
   Full Backend Requirements Parity for Resident, Guardian, Volunteer, and Security
   With Modern Toast Popup Alerts & Real-Time Count Sync
   ========================================================= */

window.getApiBaseUrl = window.getApiBaseUrl || function() {
    if (typeof window !== "undefined" && window.location.port === "8000") {
        return "";
    }
    return "http://127.0.0.1:8000";
};
window.API_BASE_URL = window.API_BASE_URL || window.getApiBaseUrl();

let currentModuleName = "";
let moduleRecords = [];

const DEFAULT_DATA = {
    residents: [
        { id: 101, username: "harshini_p", first_name: "Harshini", last_name: "P", name: "Harshini P", email: "harshini@careconnect.com", phone: "+91 98765 43210", gender: "Female", blood_group: "O+", dob: "1995-04-12", address: "Flat 101, Block A", detail: "Block A, Flat 101", status: "Active" },
        { id: 102, username: "rajesh_k", first_name: "Rajesh", last_name: "Kumar", name: "Rajesh Kumar", email: "rajesh@careconnect.com", phone: "+91 98123 45678", gender: "Male", blood_group: "B+", dob: "1988-09-20", address: "Flat 204, Block A", detail: "Block A, Flat 204", status: "Active" },
        { id: 103, username: "sunita_s", first_name: "Sunita", last_name: "Sharma", name: "Sunita Sharma", email: "sunita@careconnect.com", phone: "+91 97654 32109", gender: "Female", blood_group: "A+", dob: "1975-11-05", address: "Flat 105, Block B", detail: "Block B, Flat 105", status: "Active" },
        { id: 104, username: "venkatesh_r", first_name: "Venkatesh", last_name: "Rao", name: "Venkatesh Rao", email: "venkatesh@careconnect.com", phone: "+91 96543 21098", gender: "Male", blood_group: "O+", dob: "1960-01-15", address: "Flat 302, Block B", detail: "Block B, Flat 302", status: "Active" }
    ],
    guardians: [
        { id: 201, resident: "Harshini P", first_name: "Anand", last_name: "P", name: "Anand P", email: "anand.p@gmail.com", phone: "+91 98765 00001", relationship: "Father", address: "123 Main Street, Bangalore", is_primary: true, detail: "Harshini P (Father)", status: "Verified" },
        { id: 202, resident: "Rajesh Kumar", first_name: "Priya", last_name: "Kumar", name: "Priya Kumar", email: "priya.k@gmail.com", phone: "+91 98123 00002", relationship: "Daughter", address: "456 City View, Bangalore", is_primary: false, detail: "Rajesh Kumar (Daughter)", status: "Verified" },
        { id: 203, resident: "Sunita Sharma", first_name: "Amit", last_name: "Sharma", name: "Amit Sharma", email: "amit.s@gmail.com", phone: "+91 97654 00003", relationship: "Son", address: "789 Park Avenue, Bangalore", is_primary: true, detail: "Sunita Sharma (Son)", status: "Verified" }
    ],
    volunteers: [
        { id: 301, first_name: "Kavita", last_name: "Reddy", name: "Kavita Reddy", email: "kavita.reddy@careconnect.org", phone: "+91 99887 76655", blood_group: "O+", address: "Block B, Flat 202 - Medical Emergency & Medicine Escort", detail: "Medical Emergency & Medicine Escort", availability: "Available", status: "Available" },
        { id: 302, first_name: "Suresh", last_name: "Menon", name: "Suresh Menon", email: "suresh.menon@careconnect.org", phone: "+91 98776 65544", blood_group: "B+", address: "Block A, Flat 301 - Grocery Shopping & Errands", detail: "Grocery Shopping & Errands", availability: "Available", status: "Available" },
        { id: 303, first_name: "Deepa", last_name: "Verma", name: "Deepa Verma", email: "deepa.verma@careconnect.org", phone: "+91 97665 54433", blood_group: "A+", address: "Block C, Flat 104 - Elderly Care & Companionship", detail: "Elderly Care & Companionship", availability: "Busy", status: "Busy" }
    ],
    security: [
        { id: 401, first_name: "Ramesh", last_name: "Singh", name: "Ramesh Singh", email: "ramesh.security@careconnect.org", phone: "+91 95544 33221", shift: "Morning", status: "On Duty", assigned_block: "Main Gate & Block A", detail: "Main Gate (Morning Shift)" },
        { id: 402, first_name: "Vikram", last_name: "Patil", name: "Vikram Patil", email: "vikram.security@careconnect.org", phone: "+91 94433 22110", shift: "Night", status: "On Duty", assigned_block: "Back Gate & Block B", detail: "Back Gate (Night Shift)" },
        { id: 403, first_name: "Mahesh", last_name: "Yadav", name: "Mahesh Yadav", email: "mahesh.security@careconnect.org", phone: "+91 93322 11009", shift: "Evening", status: "Off Duty", assigned_block: "Clubhouse / Patrol", detail: "Clubhouse / Patrol (Evening Shift)" }
    ],
    society: [
        { id: 501, name: "Elevator Maintenance Notice", detail: "Block A lift servicing scheduled for Wednesday 10 AM", phone: "Society Admin (+91 98765 00000)", status: "Broadcasted" },
        { id: 502, name: "Free Health Checkup Camp", detail: "Senior citizen wellness checkup at Clubhouse on Sunday", phone: "Health Committee", status: "Active" },
        { id: 503, name: "Water Tank Cleaning Notice", detail: "Water supply maintenance on Saturday 2 PM to 5 PM", phone: "Society Office", status: "Active" }
    ]
};

async function initModulePage(moduleName) {
    currentModuleName = moduleName;
    renderTableHeader();

    const tbody = document.getElementById("moduleTableBody");
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 28px; color: #64748b;"><i class="fa-solid fa-spinner fa-spin me-2" style="color:#0284c7;"></i> Loading records from database...</td></tr>`;
    }

    // Fetch real database records directly from Django API
    try {
        const baseUrl = typeof getApiBaseUrl === "function" ? getApiBaseUrl() : (typeof API_BASE_URL !== "undefined" ? API_BASE_URL : "");
        const res = await fetch(`${baseUrl}/api/users/list/?role=${moduleName}`, { credentials: "include" });
        if (res.ok) {
            const data = await res.json();
            if (data.records) {
                moduleRecords = data.records;
                saveToLocalStorage();
                renderTable();
                return;
            }
        }
    } catch (err) {
        console.warn("API list fetch notice:", err);
    }

    const stored = localStorage.getItem(`cc_${moduleName}_data`);
    if (stored) {
        try {
            moduleRecords = JSON.parse(stored);
        } catch (e) {
            moduleRecords = [];
        }
    } else {
        moduleRecords = [];
    }
    renderTable();
}

function saveToLocalStorage() {
    localStorage.setItem(`cc_${currentModuleName}_data`, JSON.stringify(moduleRecords));
    if (typeof window.initCommunityCounts === "function") {
        window.initCommunityCounts();
    }
}

function isReadOnlyMode() {
    if (window.isReadOnly === true) return true;
    try {
        const u = localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")) : null;
        if (u && u.role === "society_member") return true;
    } catch(e) {}
    return false;
}

function renderTableHeader() {
    const tableHeader = document.querySelector(".custom-table thead tr");
    if (!tableHeader) return;

    const mod = (currentModuleName || "").toLowerCase().trim();
    const readOnly = isReadOnlyMode();
    const actionsTh = readOnly ? '' : '<th>Actions</th>';

    if (mod === "guardians" || mod === "guardian") {
        tableHeader.innerHTML = `
            <th>ID</th>
            <th>Guardian Name</th>
            <th>Resident</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Relationship</th>
            <th>Type</th>
            ${actionsTh}
        `;
    } else if (mod === "society" || mod === "societies") {
        tableHeader.innerHTML = `
            <th>ID</th>
            <th>Society Name</th>
            <th>Location / Address</th>
            <th>Total Blocks</th>
            <th>Total Flats</th>
            <th>Status</th>
            ${actionsTh}
        `;
    } else if (mod === "society_member" || mod === "society_members") {
        tableHeader.innerHTML = `
            <th>ID</th>
            <th>Member Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Designation / Role</th>
            <th>Society</th>
            <th>Status</th>
            ${actionsTh}
        `;
    } else if (mod === "security") {
        tableHeader.innerHTML = `
            <th>ID</th>
            <th>Guard Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Shift</th>
            <th>Status</th>
            <th>Assigned Block</th>
            ${actionsTh}
        `;
    } else if (mod === "volunteers" || mod === "volunteer") {
        tableHeader.innerHTML = `
            <th>ID</th>
            <th>Volunteer Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Blood Group</th>
            <th>Availability</th>
            <th>Address / Details</th>
            ${actionsTh}
        `;
    } else if (mod === "residents" || mod === "resident") {
        tableHeader.innerHTML = `
            <th>ID</th>
            <th>Resident Name</th>
            <th>Username</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Gender / Blood</th>
            <th>Flat / Block</th>
            ${actionsTh}
        `;
    } else if (mod === "block" || mod === "blocks") {
        tableHeader.innerHTML = `
            <th>ID</th>
            <th>Block Name</th>
            <th>Society Details</th>
            <th>Total Floors</th>
            <th>Status</th>
            ${actionsTh}
        `;
    } else if (mod === "flat" || mod === "flats") {
        tableHeader.innerHTML = `
            <th>ID</th>
            <th>Flat Number</th>
            <th>Block Details</th>
            <th>Owner Contact</th>
            <th>Status</th>
            ${actionsTh}
        `;
    } else if (mod === "emergency" || mod === "emergencies" || mod === "alerts" || mod === "alert") {
        tableHeader.innerHTML = `
            <th>Alert Code</th>
            <th>Emergency Type</th>
            <th>Resident</th>
            <th>Location / Address</th>
            <th>Timestamp</th>
            <th>Status</th>
            ${actionsTh}
        `;
    }
}

function renderTable(filterQuery = "") {
    const tbody = document.getElementById("moduleTableBody");
    if (!tbody) return;

    tbody.innerHTML = "";
    const filtered = moduleRecords.filter(rec => {
        if (!filterQuery) return true;
        const q = filterQuery.toLowerCase();
        return (
            (rec.name && rec.name.toLowerCase().includes(q)) ||
            (rec.first_name && rec.first_name.toLowerCase().includes(q)) ||
            (rec.last_name && rec.last_name.toLowerCase().includes(q)) ||
            (rec.username && rec.username.toLowerCase().includes(q)) ||
            (rec.email && rec.email.toLowerCase().includes(q)) ||
            (rec.detail && rec.detail.toLowerCase().includes(q)) ||
            (rec.phone && rec.phone.toLowerCase().includes(q)) ||
            (rec.type && rec.type.toLowerCase().includes(q)) ||
            (rec.resident && rec.resident.toLowerCase().includes(q)) ||
            (rec.address && rec.address.toLowerCase().includes(q)) ||
            (rec.location && rec.location.toLowerCase().includes(q)) ||
            (rec.block_name && rec.block_name.toLowerCase().includes(q)) ||
            (rec.flat_number && rec.flat_number.toLowerCase().includes(q))
        );
    });

    const mod = (currentModuleName || "").toLowerCase().trim();
    const colCount = (mod.includes("guardian") || mod.includes("security") || mod.includes("volunteer") || mod.includes("resident") || mod.includes("emergency") || mod.includes("alert") || mod.includes("society_member")) ? 8 : (mod.includes("society") ? 7 : 6);

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${colCount}" style="text-align:center; padding: 28px; color: #94a3b8;"><i class="fa-regular fa-folder-open me-2"></i> No ${mod.replace('_', ' ')} records found.</td></tr>`;
        return;
    }

    const readOnly = isReadOnlyMode();
    const actionTd = (idx) => readOnly ? '' : `
        <td>
            <button type="button" class="btn-action-sm btn-edit" onclick="openModuleModal('edit', ${idx})"><i class="fa-solid fa-pen-to-square"></i> Edit</button>
            <button type="button" class="btn-action-sm btn-delete" onclick="deleteModuleRecord(${idx})"><i class="fa-solid fa-trash"></i> Delete</button>
        </td>
    `;

    filtered.forEach((rec, index) => {
        const tr = document.createElement("tr");
        const displayName = rec.name || `${rec.first_name || ''} ${rec.last_name || ''}`.trim() || rec.username || 'N/A';

        if (mod === "guardians" || mod === "guardian") {
            const isPrimary = rec.is_primary !== false && rec.guardian_type !== 'Secondary Guardian';
            const primaryBadge = isPrimary
                ? `<span style="background:#f3e8ff; color:#7e22ce; padding:4px 10px; border-radius:12px; font-weight:700; font-size:0.75rem;"><i class="fa-solid fa-star me-1"></i> Primary Guardian</span>`
                : `<span style="background:#f1f5f9; color:#475569; padding:4px 10px; border-radius:12px; font-weight:600; font-size:0.75rem;"><i class="fa-solid fa-user me-1"></i> Secondary Guardian</span>`;
            tr.innerHTML = `
                <td>#${rec.id}</td>
                <td><strong>${displayName}</strong></td>
                <td>${rec.resident || rec.detail || 'Deepan P'}</td>
                <td>${rec.email || 'N/A'}</td>
                <td>${rec.phone || 'N/A'}</td>
                <td><span style="background:#e0f2fe; color:#0369a1; padding:3px 8px; border-radius:6px; font-weight:600; font-size:0.8rem;">${rec.relationship || 'Parent'}</span></td>
                <td>${primaryBadge}</td>
                ${actionTd(index)}
            `;
        } else if (mod === "security") {
            const statusColor = rec.status === "On Duty" ? "background:#dcfce7; color:#15803d;" : "background:#f1f5f9; color:#64748b;";
            const shiftBadge = rec.shift === "Morning" ? "background:#fef3c7; color:#b45309;" : rec.shift === "Evening" ? "background:#e0e7ff; color:#4338ca;" : "background:#1e293b; color:#f8fafc;";
            tr.innerHTML = `
                <td>#${rec.id}</td>
                <td><strong>${displayName}</strong></td>
                <td>${rec.email || 'N/A'}</td>
                <td>${rec.phone || 'N/A'}</td>
                <td><span style="${shiftBadge} padding:4px 10px; border-radius:12px; font-weight:700; font-size:0.75rem;">${rec.shift || 'Morning'}</span></td>
                <td><span style="${statusColor} padding:4px 10px; border-radius:12px; font-weight:700; font-size:0.75rem;">${rec.status || 'On Duty'}</span></td>
                <td>${rec.assigned_block || rec.detail || 'Main Gate & Block A'}</td>
                ${actionTd(index)}
            `;
        } else if (mod === "volunteers" || mod === "volunteer") {
            const statusColor = rec.availability === "Available" ? "background:#dcfce7; color:#15803d;" : rec.availability === "Busy" ? "background:#fee2e2; color:#b91c1c;" : "background:#f1f5f9; color:#64748b;";
            tr.innerHTML = `
                <td>#${rec.id}</td>
                <td><strong>${displayName}</strong></td>
                <td>${rec.email || 'N/A'}</td>
                <td>${rec.phone || 'N/A'}</td>
                <td><span style="background:#fee2e2; color:#991b1b; padding:3px 8px; border-radius:6px; font-weight:700; font-size:0.8rem;">${rec.blood_group || 'O+'}</span></td>
                <td><span style="${statusColor} padding:4px 10px; border-radius:12px; font-weight:700; font-size:0.75rem;">${rec.availability || rec.status || 'Available'}</span></td>
                <td>${rec.address || rec.detail || 'Emergency Volunteer'}</td>
                ${actionTd(index)}
            `;
        } else if (mod === "residents" || mod === "resident") {
            tr.innerHTML = `
                <td>#${rec.id}</td>
                <td><strong>${displayName}</strong></td>
                <td><code>@${rec.username || 'resident'}</code></td>
                <td>${rec.email || 'N/A'}</td>
                <td>${rec.phone || 'N/A'}</td>
                <td>${rec.gender || 'Male'} (${rec.blood_group || 'O+'})</td>
                <td>${rec.detail || rec.address || 'Block A, Flat 101'}</td>
                ${actionTd(index)}
            `;
        } else if (mod === "society" || mod === "societies") {
            tr.innerHTML = `
                <td>#${rec.id}</td>
                <td><strong>${rec.name || rec.society_name || 'UK'}</strong></td>
                <td>${rec.address || rec.detail || 'Main Road'}</td>
                <td>${rec.blocks || rec.total_blocks || '2 Blocks'}</td>
                <td>${rec.flats || rec.total_flats || '2 Flats'}</td>
                <td><span style="background:#dcfce7; color:#15803d; font-weight:700; padding:4px 10px; border-radius:20px; font-size:0.75rem;">${rec.status || 'Active'}</span></td>
                ${actionTd(index)}
            `;
        } else if (mod === "society_member" || mod === "society_members") {
            tr.innerHTML = `
                <td>#${rec.id}</td>
                <td><strong>${displayName}</strong></td>
                <td>${rec.email || 'N/A'}</td>
                <td>${rec.phone || 'N/A'}</td>
                <td><span style="background:#e0f2fe; color:#0369a1; font-weight:700; padding:4px 10px; border-radius:12px; font-size:0.75rem;">${rec.designation || rec.detail || 'Committee Member'}</span></td>
                <td>${rec.society || 'UK'}</td>
                <td><span style="background:#dcfce7; color:#15803d; font-weight:700; padding:4px 10px; border-radius:20px; font-size:0.75rem;">${rec.status || 'Active'}</span></td>
                ${actionTd(index)}
            `;
        } else if (mod === "block" || mod === "blocks") {
            tr.innerHTML = `
                <td>#${rec.id}</td>
                <td><strong>${rec.name || ('Block ' + (rec.block_name || 'A'))}</strong></td>
                <td>${rec.detail || rec.society || 'UK'}</td>
                <td>${rec.total_floors ? rec.total_floors + ' Floors' : '5 Floors'}</td>
                <td><span style="background:#dcfce7; color:#15803d; font-weight:700; padding:4px 10px; border-radius:20px; font-size:0.75rem;">${rec.status || 'Active'}</span></td>
                ${actionTd(index)}
            `;
        } else if (mod === "flat" || mod === "flats") {
            const statusColor = rec.status === "Occupied" ? "background:#dcfce7; color:#15803d;" : "background:#f1f5f9; color:#64748b;";
            tr.innerHTML = `
                <td>#${rec.id}</td>
                <td><strong>${rec.name || ('Flat ' + (rec.flat_number || '101'))}</strong></td>
                <td>${rec.detail || rec.block || 'Block A'}</td>
                <td>${rec.phone || '+91 6374643862'}</td>
                <td><span style="${statusColor} font-weight:700; padding:4px 10px; border-radius:20px; font-size:0.75rem;">${rec.status || 'Occupied'}</span></td>
                ${actionTd(index)}
            `;
        } else if (mod === "emergency" || mod === "emergencies" || mod === "alerts" || mod === "alert") {
            const isAct = rec.status === "Active" || rec.status === "ACTIVE";
            const statusBadge = isAct
                ? `<span style="background:#fee2e2; color:#dc2626; font-weight:800; padding:4px 12px; border-radius:20px; font-size:0.75rem;"><i class="fa-solid fa-triangle-exclamation"></i> Active</span>`
                : `<span style="background:#dcfce7; color:#166534; font-weight:800; padding:4px 12px; border-radius:20px; font-size:0.75rem;"><i class="fa-solid fa-circle-check"></i> ${rec.status || 'Resolved'}</span>`;
            tr.innerHTML = `
                <td style="font-weight:800; color:${isAct ? '#dc2626' : '#475569'};">${rec.code || ('SOS-' + String(rec.id).padStart(5, '0'))}</td>
                <td style="font-weight:700;">${rec.type || rec.name || 'Medical Emergency'}</td>
                <td><strong>${rec.resident || 'Resident'}</strong></td>
                <td>${rec.location || rec.detail || 'Block A, Flat 101'}</td>
                <td>${rec.time_str || 'Recently'}</td>
                <td>${statusBadge}</td>
                ${actionTd(index)}
            `;
        } else {
            tr.innerHTML = `
                <td>#${rec.id}</td>
                <td><strong>${displayName}</strong></td>
                <td>${rec.detail || rec.address || 'N/A'}</td>
                <td>${rec.phone || 'N/A'}</td>
                <td><span style="background:#dcfce7; color:#15803d; font-weight:700; padding:4px 10px; border-radius:20px; font-size:0.75rem;">${rec.status || 'Active'}</span></td>
                ${actionTd(index)}
            `;
        }
        tbody.appendChild(tr);
    });

    if (typeof window.translatePage === "function") {
        window.translatePage();
    }
}

function filterModuleList(query) {
    renderTable(query);
}

function openModuleModal(action, index = null) {
    const modal = document.getElementById("crudModal");
    const title = document.getElementById("crudModalTitle");
    const recordIndexInput = document.getElementById("recordIndex");
    const container = document.getElementById("dynamicFormContainer") || document.querySelector("#crudModal form");

    if (!modal) return;

    const entitySingular = currentModuleName === "security" ? "Security Personnel" : (currentModuleName.charAt(0).toUpperCase() + currentModuleName.slice(1, -1));
    const isEdit = (action === "edit" && index !== null);
    const rec = isEdit ? moduleRecords[index] : {};

    title.textContent = isEdit ? `Edit ${entitySingular}` : `Add New ${entitySingular}`;
    recordIndexInput.value = isEdit ? index : "-1";

    let formHTML = "";

    if (currentModuleName === "guardians") {
        const residentsList = DEFAULT_DATA.residents.map(r => r.name);
        const relChoices = ["Father", "Mother", "Brother", "Sister", "Son", "Daughter", "Friend", "Relative", "Other"];
        formHTML = `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px;">
                <div>
                    <label style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:4px;">Resident</label>
                    <select id="inputResident" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px;" required>
                        ${residentsList.map(resName => `<option value="${resName}" ${(rec.resident || rec.detail?.split(' ')[0]) === resName ? 'selected' : ''}>${resName}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:4px;">Relationship</label>
                    <select id="inputRelationship" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px;" required>
                        ${relChoices.map(rel => `<option value="${rel}" ${rec.relationship === rel ? 'selected' : ''}>${rel}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px;">
                <div>
                    <label style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:4px;">First Name</label>
                    <input type="text" id="inputFirstName" value="${rec.first_name || rec.name?.split(' ')[0] || ''}" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px;" required>
                </div>
                <div>
                    <label style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:4px;">Last Name</label>
                    <input type="text" id="inputLastName" value="${rec.last_name || rec.name?.split(' ')[1] || ''}" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px;" required>
                </div>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px;">
                <div>
                    <label style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:4px;">Email</label>
                    <input type="email" id="inputEmail" value="${rec.email || ''}" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px;" required>
                </div>
                <div>
                    <label style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:4px;">Phone</label>
                    <input type="text" id="inputPhone" value="${rec.phone || ''}" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px;" required>
                </div>
            </div>
            <div style="margin-bottom:12px;">
                <label style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:4px;">Address / Location</label>
                <textarea id="inputAddress" rows="2" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px;" placeholder="e.g. Block A, Flat 101">${rec.address || ''}</textarea>
            </div>
            <div style="margin-bottom:16px;">
                <label style="display:block; font-size:0.85rem; font-weight:700; margin-bottom:4px; color:#0f172a;">Guardian Type</label>
                <select id="inputGuardianType" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px; font-weight:600;" required>
                    <option value="Primary Guardian" ${rec.guardian_type === 'Primary Guardian' || rec.is_primary !== false ? 'selected' : ''}>Primary Guardian (Primary Emergency Contact)</option>
                    <option value="Secondary Guardian" ${rec.guardian_type === 'Secondary Guardian' || rec.is_primary === false ? 'selected' : ''}>Secondary Guardian (Secondary Contact)</option>
                </select>
            </div>
        `;
    } else if (currentModuleName === "security") {
        const shifts = ["Morning", "Evening", "Night"];
        const statuses = ["On Duty", "Off Duty"];
        formHTML = `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px;">
                <div>
                    <label style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:4px;">First Name</label>
                    <input type="text" id="inputFirstName" value="${rec.first_name || rec.name?.split(' ')[0] || ''}" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px;" required>
                </div>
                <div>
                    <label style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:4px;">Last Name</label>
                    <input type="text" id="inputLastName" value="${rec.last_name || rec.name?.split(' ')[1] || ''}" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px;" required>
                </div>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px;">
                <div>
                    <label style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:4px;">Email</label>
                    <input type="email" id="inputEmail" value="${rec.email || ''}" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px;" required>
                </div>
                <div>
                    <label style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:4px;">Phone</label>
                    <input type="text" id="inputPhone" value="${rec.phone || ''}" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px;" required>
                </div>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px;">
                <div>
                    <label style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:4px;">Shift</label>
                    <select id="inputShift" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px;" required>
                        ${shifts.map(s => `<option value="${s}" ${rec.shift === s ? 'selected' : ''}>${s}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:4px;">Status</label>
                    <select id="inputStatus" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px;" required>
                        ${statuses.map(st => `<option value="${st}" ${rec.status === st ? 'selected' : ''}>${st}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div style="margin-bottom:16px;">
                <label style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:4px;">Assigned Block</label>
                <input type="text" id="inputAssignedBlock" value="${rec.assigned_block || rec.detail || ''}" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px;" placeholder="e.g. Main Gate, Block A" required>
            </div>
        `;
    } else if (currentModuleName === "volunteers") {
        const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
        const availabilities = ["Available", "Busy", "Offline"];
        formHTML = `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px;">
                <div>
                    <label style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:4px;">First Name</label>
                    <input type="text" id="inputFirstName" value="${rec.first_name || rec.name?.split(' ')[0] || ''}" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px;" required>
                </div>
                <div>
                    <label style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:4px;">Last Name</label>
                    <input type="text" id="inputLastName" value="${rec.last_name || rec.name?.split(' ')[1] || ''}" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px;" required>
                </div>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px;">
                <div>
                    <label style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:4px;">Email</label>
                    <input type="email" id="inputEmail" value="${rec.email || ''}" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px;" required>
                </div>
                <div>
                    <label style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:4px;">Phone</label>
                    <input type="text" id="inputPhone" value="${rec.phone || ''}" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px;" required>
                </div>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px;">
                <div>
                    <label style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:4px;">Blood Group</label>
                    <select id="inputBloodGroup" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px;">
                        ${bloodGroups.map(bg => `<option value="${bg}" ${rec.blood_group === bg ? 'selected' : ''}>${bg}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:4px;">Availability</label>
                    <select id="inputAvailability" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px;" required>
                        ${availabilities.map(av => `<option value="${av}" ${(rec.availability || rec.status) === av ? 'selected' : ''}>${av}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div style="margin-bottom:16px;">
                <label style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:4px;">Address & Specialization</label>
                <textarea id="inputAddress" rows="2" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px;" placeholder="Address or service specialization details">${rec.address || rec.detail || ''}</textarea>
            </div>
        `;
    } else if (currentModuleName === "residents") {
        const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
        const genders = ["Male", "Female", "Other"];
        formHTML = `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px;">
                <div>
                    <label style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:4px;">Username</label>
                    <input type="text" id="inputUsername" value="${rec.username || ''}" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px;" required>
                </div>
                <div>
                    <label style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:4px;">Phone</label>
                    <input type="text" id="inputPhone" value="${rec.phone || ''}" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px;" required>
                </div>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px;">
                <div>
                    <label style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:4px;">First Name</label>
                    <input type="text" id="inputFirstName" value="${rec.first_name || rec.name?.split(' ')[0] || ''}" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px;" required>
                </div>
                <div>
                    <label style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:4px;">Last Name</label>
                    <input type="text" id="inputLastName" value="${rec.last_name || rec.name?.split(' ')[1] || ''}" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px;" required>
                </div>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px;">
                <div>
                    <label style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:4px;">Email</label>
                    <input type="email" id="inputEmail" value="${rec.email || ''}" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px;" required>
                </div>
                <div>
                    <label style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:4px;">Flat & Block</label>
                    <input type="text" id="inputDetail" value="${rec.detail || ''}" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px;" placeholder="e.g. Block A, Flat 101" required>
                </div>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px;">
                <div>
                    <label style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:4px;">Gender</label>
                    <select id="inputGender" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px;">
                        ${genders.map(g => `<option value="${g}" ${rec.gender === g ? 'selected' : ''}>${g}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:4px;">Blood Group</label>
                    <select id="inputBloodGroup" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px;">
                        ${bloodGroups.map(bg => `<option value="${bg}" ${rec.blood_group === bg ? 'selected' : ''}>${bg}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div style="margin-bottom:16px;">
                <label style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:4px;">Address</label>
                <textarea id="inputAddress" rows="2" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px;">${rec.address || ''}</textarea>
            </div>
        `;
    } else if (currentModuleName === "block") {
        formHTML = `
            <div style="margin-bottom:12px;">
                <label style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:4px;">Block Name</label>
                <input type="text" id="inputName" value="${rec.name || rec.block_name || ''}" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px;" placeholder="e.g. Block A" required>
            </div>
            <div style="margin-bottom:12px;">
                <label style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:4px;">Total Floors</label>
                <input type="number" id="inputFloors" value="${rec.total_floors || 5}" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px;" required>
            </div>
            <div style="margin-bottom:16px;">
                <label style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:4px;">Society Details</label>
                <input type="text" id="inputDetail" value="${rec.detail || rec.society || 'UK'}" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px;">
            </div>
        `;
    } else if (currentModuleName === "flat") {
        formHTML = `
            <div style="margin-bottom:12px;">
                <label style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:4px;">Flat Number</label>
                <input type="text" id="inputName" value="${rec.name || rec.flat_number || ''}" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px;" placeholder="e.g. Flat 101" required>
            </div>
            <div style="margin-bottom:12px;">
                <label style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:4px;">Block Details</label>
                <input type="text" id="inputDetail" value="${rec.detail || rec.block || 'Block A'}" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px;" placeholder="e.g. Block A" required>
            </div>
            <div style="margin-bottom:16px;">
                <label style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:4px;">Owner Contact Phone</label>
                <input type="text" id="inputPhone" value="${rec.phone || '+91 6374643862'}" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px;">
            </div>
        `;
    } else if (currentModuleName === "emergency" || currentModuleName === "alerts") {
        const types = ["Medical Emergency", "Fire", "Security Threat", "Accident", "Crime / Intrusion", "Other"];
        const statuses = ["Active", "Resolved", "Cancelled"];
        formHTML = `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px;">
                <div>
                    <label style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:4px;">Emergency Type</label>
                    <select id="inputType" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px;" required>
                        ${types.map(t => `<option value="${t}" ${(rec.type || rec.name) === t ? 'selected' : ''}>${t}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:4px;">Status</label>
                    <select id="inputStatus" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px;" required>
                        ${statuses.map(st => `<option value="${st}" ${rec.status === st ? 'selected' : ''}>${st}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div style="margin-bottom:12px;">
                <label style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:4px;">Resident Name</label>
                <input type="text" id="inputResident" value="${rec.resident || 'Deepan P'}" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px;" required>
            </div>
            <div style="margin-bottom:16px;">
                <label style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:4px;">Location / Address</label>
                <input type="text" id="inputLocation" value="${rec.location || rec.detail || 'Block A, Flat 101'}" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px;" required>
            </div>
        `;
    } else {
        formHTML = `
            <div style="margin-bottom:14px;"><label style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:4px;">Title / Name</label><input type="text" id="inputName" value="${rec.name || ''}" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px;" required></div>
            <div style="margin-bottom:14px;"><label style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:4px;">Details</label><input type="text" id="inputDetail" value="${rec.detail || ''}" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px;" required></div>
            <div style="margin-bottom:20px;"><label style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:4px;">Phone / Contact</label><input type="text" id="inputPhone" value="${rec.phone || ''}" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px;" required></div>
        `;
    }

    const dynamicContainer = document.getElementById("dynamicFormContainer");
    if (dynamicContainer) {
        dynamicContainer.innerHTML = formHTML;
    }

    modal.classList.add("show");
}

function closeCrudModal() {
    const modal = document.getElementById("crudModal");
    if (modal) modal.classList.remove("show");
}

async function saveModuleRecord(e) {
    if (e && e.preventDefault) e.preventDefault();
    const index = parseInt(document.getElementById("recordIndex").value, 10);
    const entitySingular = currentModuleName === "security" ? "Security Personnel" : (currentModuleName.charAt(0).toUpperCase() + currentModuleName.slice(1, -1));

    let recordData = { role: currentModuleName };

    if (currentModuleName === "guardians") {
        const resident = document.getElementById("inputResident")?.value || "";
        const rel = document.getElementById("inputRelationship")?.value || "Relative";
        const firstName = document.getElementById("inputFirstName")?.value.trim() || "";
        const lastName = document.getElementById("inputLastName")?.value.trim() || "";
        const email = document.getElementById("inputEmail")?.value.trim() || "";
        const phone = document.getElementById("inputPhone")?.value.trim() || "";
        const address = document.getElementById("inputAddress")?.value.trim() || "";
        const guardianType = document.getElementById("inputGuardianType")?.value || "Primary Guardian";
        const isPrimary = guardianType === "Primary Guardian";

        if (!firstName || !lastName || !phone) {
            alert("Please fill in First Name, Last Name, and Phone number.");
            return;
        }

        const fullName = `${firstName} ${lastName}`;
        recordData = { ...recordData, resident, first_name: firstName, last_name: lastName, name: fullName, email, phone, relationship: rel, address, guardian_type: guardianType, is_primary: isPrimary, detail: `${resident} (${rel})`, status: "Verified" };
    } else if (currentModuleName === "security") {
        const firstName = document.getElementById("inputFirstName")?.value.trim() || "";
        const lastName = document.getElementById("inputLastName")?.value.trim() || "";
        const email = document.getElementById("inputEmail")?.value.trim() || "";
        const phone = document.getElementById("inputPhone")?.value.trim() || "";
        const shift = document.getElementById("inputShift")?.value || "Morning";
        const status = document.getElementById("inputStatus")?.value || "On Duty";
        const assignedBlock = document.getElementById("inputAssignedBlock")?.value.trim() || "";

        if (!firstName || !lastName || !phone || !assignedBlock) {
            alert("Please fill in First Name, Last Name, Phone, and Assigned Block.");
            return;
        }

        const fullName = `${firstName} ${lastName}`;
        recordData = { ...recordData, first_name: firstName, last_name: lastName, name: fullName, email, phone, shift, status, assigned_block: assignedBlock, detail: `${assignedBlock} (${shift} Shift)` };
    } else if (currentModuleName === "volunteers") {
        const firstName = document.getElementById("inputFirstName")?.value.trim() || "";
        const lastName = document.getElementById("inputLastName")?.value.trim() || "";
        const email = document.getElementById("inputEmail")?.value.trim() || "";
        const phone = document.getElementById("inputPhone")?.value.trim() || "";
        const bloodGroup = document.getElementById("inputBloodGroup")?.value || "O+";
        const availability = document.getElementById("inputAvailability")?.value || "Available";
        const address = document.getElementById("inputAddress")?.value.trim() || "";

        if (!firstName || !lastName || !phone) {
            alert("Please fill in First Name, Last Name, and Phone.");
            return;
        }

        const fullName = `${firstName} ${lastName}`;
        recordData = { ...recordData, first_name: firstName, last_name: lastName, name: fullName, email, phone, blood_group: bloodGroup, availability, status: availability, address, detail: address || "Volunteer Assistance" };
    } else if (currentModuleName === "residents") {
        const username = document.getElementById("inputUsername")?.value.trim() || "";
        const firstName = document.getElementById("inputFirstName")?.value.trim() || "";
        const lastName = document.getElementById("inputLastName")?.value.trim() || "";
        const email = document.getElementById("inputEmail")?.value.trim() || "";
        const phone = document.getElementById("inputPhone")?.value.trim() || "";
        const detail = document.getElementById("inputDetail")?.value.trim() || "";
        const gender = document.getElementById("inputGender")?.value || "Male";
        const bloodGroup = document.getElementById("inputBloodGroup")?.value || "O+";
        const address = document.getElementById("inputAddress")?.value.trim() || "";

        if (!username || !firstName || !lastName || !phone) {
            alert("Please fill in Username, First Name, Last Name, and Phone.");
            return;
        }

        const fullName = `${firstName} ${lastName}`;
        recordData = { ...recordData, username, first_name: firstName, last_name: lastName, name: fullName, email, phone, detail, gender, blood_group: bloodGroup, address, status: "Active" };
    } else if (currentModuleName === "block") {
        const name = document.getElementById("inputName")?.value.trim() || "";
        const floors = document.getElementById("inputFloors")?.value || "5";
        const detail = document.getElementById("inputDetail")?.value.trim() || "";
        if (!name) return;
        recordData = { ...recordData, name, block_name: name.replace('Block ', ''), total_floors: floors, detail, status: "Active" };
    } else if (currentModuleName === "flat") {
        const name = document.getElementById("inputName")?.value.trim() || "";
        const detail = document.getElementById("inputDetail")?.value.trim() || "";
        const phone = document.getElementById("inputPhone")?.value.trim() || "";
        if (!name) return;
        recordData = { ...recordData, name, flat_number: name.replace('Flat ', ''), detail, phone, status: "Occupied" };
    } else if (currentModuleName === "emergency" || currentModuleName === "alerts") {
        const type = document.getElementById("inputType")?.value || "Medical Emergency";
        const status = document.getElementById("inputStatus")?.value || "Active";
        const resident = document.getElementById("inputResident")?.value.trim() || "Deepan P";
        const location = document.getElementById("inputLocation")?.value.trim() || "Block A, Flat 101";
        recordData = { ...recordData, type, emergency_type: type, name: type, status, resident, location, detail: location };
    } else {
        const name = document.getElementById("inputName")?.value.trim() || "";
        const detail = document.getElementById("inputDetail")?.value.trim() || "";
        const phone = document.getElementById("inputPhone")?.value.trim() || "";
        if (!name || !detail) return;
        recordData = { ...recordData, name, detail, phone, status: "Active" };
    }

    if (index >= 0 && index < moduleRecords.length) {
        recordData.id = moduleRecords[index].id;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/api/users/save/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(recordData)
        });
        if (res.ok) {
            const resObj = await res.json();
            if (resObj.record) {
                recordData = { ...recordData, ...resObj.record };
            }
        }
    } catch (err) {}

    if (index >= 0 && index < moduleRecords.length) {
        moduleRecords[index] = recordData;
        showToastNotification(`${entitySingular} Updated`, `"${recordData.name}" details updated successfully!`, 'success');
    } else {
        if (!recordData.id) recordData.id = 100 + moduleRecords.length + 1;
        moduleRecords.unshift(recordData);
        showToastNotification(`${entitySingular} Created`, `"${recordData.name}" added successfully!`, 'success');
    }

    saveToLocalStorage();
    renderTable();
    closeCrudModal();
}

async function deleteModuleRecord(index) {
    const rec = moduleRecords[index];
    const entitySingular = currentModuleName === "security" ? "Security Personnel" : (currentModuleName.charAt(0).toUpperCase() + currentModuleName.slice(1, -1));
    const displayName = rec.name || `${rec.first_name || ''} ${rec.last_name || ''}`.trim();
    
    if (confirm(`Are you sure you want to delete "${displayName}"?`)) {
        if (rec.id) {
            try {
                await fetch(`${API_BASE_URL}/api/users/delete/`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ id: rec.id })
                });
            } catch (err) {}
        }

        moduleRecords.splice(index, 1);
        saveToLocalStorage();
        renderTable();
        showToastNotification(`${entitySingular} Deleted`, `"${displayName}" deleted successfully.`, 'danger');
    }
}

function showToastNotification(title, message, type = 'success') {
    let container = document.getElementById("toastContainer");
    if (!container) {
        container = document.createElement("div");
        container.id = "toastContainer";
        container.className = "toast-container";
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `toast-popup toast-${type}`;
    const iconClass = type === 'success' ? 'fa-circle-check' : type === 'danger' ? 'fa-circle-xmark' : 'fa-bell';

    toast.innerHTML = `
        <div class="toast-icon"><i class="fa-solid ${iconClass}"></i></div>
        <div class="toast-content">
            <strong>${title}</strong>
            <span>${message}</span>
        </div>
        <button type="button" class="toast-close" onclick="this.parentElement.remove()">&times;</button>
    `;

    container.appendChild(toast);
    setTimeout(() => toast.classList.add("show"), 10);

    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 300);
    }, 4200);
}

// Auto-detect module from URL and initialize immediately
function detectModuleFromCurrentPath() {
    if (typeof window === "undefined") return null;
    const p = window.location.pathname.toLowerCase();
    if (p.includes("/residents.html")) return "residents";
    if (p.includes("/guardians.html")) return "guardians";
    if (p.includes("/society_member") || p.includes("/society-member") || p.includes("/members.html")) return "society_member";
    if (p.includes("/society.html") || p.includes("/societies.html")) return "society";
    if (p.includes("/blocks.html") || p.includes("/block.html")) return "block";
    if (p.includes("/flats.html") || p.includes("/flat.html")) return "flat";
    if (p.includes("/security.html")) return "security";
    if (p.includes("/volunteers.html") || p.includes("/volunteer.html")) return "volunteers";
    if (p.includes("/emergency.html") || p.includes("/alerts.html")) return "emergency";
    return null;
}

async function autoInitModule() {
    const mod = detectModuleFromCurrentPath();
    if (mod && (!currentModuleName || currentModuleName !== mod)) {
        await initModulePage(mod);
    }
}

if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", autoInitModule);
    } else {
        autoInitModule();
    }
}

window.initModulePage = initModulePage;
window.renderTable = renderTable;
window.filterModuleList = filterModuleList;

