// ── Constants ─────────────────────────────────────────────────
const ADMIN_USER = "admin";
const ADMIN_PASS = "admin124";

const HALLS = {
  "1": { name: "L F Rasquina Hall", capacity: "123 pax" },
  "2": { name: "Robert Sequeria Hall", capacity: "415 pax" },
  "3": { name: "Sanidhya Hall", capacity: "80 pax" },
  "4": { name: "Magis Hall", capacity: "50 pax" },
  "5": { name: "Arrupe Hall 1", capacity: "N/A" },
  "6": { name: "Arrupe Hall 2", capacity: "N/A" },
  "7": { name: "Arrupe Hall 3", capacity: "N/A" },
  "8": { name: "AV Room", capacity: "120 pax" },
  "9": { name: "Joseph Willy Hall", capacity: "80 pax" },
  "10": { name: "Eric Mathias Hall", capacity: "200 pax" },
  "11": { name: "Xavier Hall", capacity: "150 pax" }
};

// ── State ─────────────────────────────────────────────────────
let allBookings = [];
let pendingDeleteId = null;
let pendingDeleteAll = false;
let autoRefreshTimer = null;
let currentStatusFilter = "";

// ── Bootstrap ─────────────────────────────────────────────────
lucide.createIcons();

// ═══════════════════════════════════════════════════════════════
//  LOGIN
// ═══════════════════════════════════════════════════════════════
document.getElementById("login-btn").addEventListener("click", handleLogin);
document.getElementById("login-pass").addEventListener("keydown", e => {
  if (e.key === "Enter") handleLogin();
});
document.getElementById("login-user").addEventListener("keydown", e => {
  if (e.key === "Enter") document.getElementById("login-pass").focus();
});

function handleLogin() {
  const user = document.getElementById("login-user").value.trim();
  const pass = document.getElementById("login-pass").value.trim();
  const err = document.getElementById("login-error");

  if (user === ADMIN_USER && pass === ADMIN_PASS) {
    document.getElementById("login-overlay").classList.add("hidden");
    document.getElementById("admin-layout").classList.remove("hidden");
    startAdmin();
  } else {
    err.classList.remove("hidden");
    document.getElementById("login-pass").value = "";
    setTimeout(() => err.classList.add("hidden"), 3000);
  }
}

// ── LOGOUT ────────────────────────────────────────────────────
document.getElementById("logout-btn").addEventListener("click", () => {
  clearInterval(autoRefreshTimer);
  closeSidebar();
  document.getElementById("admin-layout").classList.add("hidden");
  document.getElementById("login-overlay").classList.remove("hidden");
  document.getElementById("login-user").value = "";
  document.getElementById("login-pass").value = "";
});

// ── SIDEBAR TOGGLE (mobile) ────────────────────────────────────
function openSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const ham = document.getElementById('admin-hamburger');
  if (sidebar) sidebar.classList.add('open');
  if (overlay) overlay.classList.add('open');
  if (ham) ham.classList.add('open');
}
function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const ham = document.getElementById('admin-hamburger');
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('open');
  if (ham) ham.classList.remove('open');
}

const adminHam = document.getElementById('admin-hamburger');
const sidebarOvl = document.getElementById('sidebar-overlay');
if (adminHam) adminHam.addEventListener('click', (e) => { e.stopPropagation(); openSidebar(); });
if (sidebarOvl) sidebarOvl.addEventListener('click', closeSidebar);

// Close sidebar when a nav item is clicked (mobile)
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    if (window.innerWidth < 768) setTimeout(closeSidebar, 150);
  });
});

// ═══════════════════════════════════════════════════════════════
//  NAVIGATION
// ═══════════════════════════════════════════════════════════════
const SECTIONS = ["dashboard", "requests", "bookings", "halls"];
const TITLES = {
  dashboard: ["Dashboard", "Overview of all hall bookings"],
  requests: ["Accept / Reject", "Review booking requests and approve or reject"],
  bookings: ["All Bookings", "Complete list of all hall bookings"],
  halls: ["Hall Directory", "View all available halls"],
};

SECTIONS.forEach(name => {
  document.getElementById(`nav-${name}`).addEventListener("click", e => {
    e.preventDefault();
    switchSection(name);
  });
});

function switchSection(name) {
  SECTIONS.forEach(s => {
    document.getElementById(`section-${s}`).classList.remove("active");
    document.getElementById(`nav-${s}`).classList.remove("active");
  });
  document.getElementById(`section-${name}`).classList.add("active");
  document.getElementById(`nav-${name}`).classList.add("active");
  document.getElementById("page-title").textContent = TITLES[name][0];
  document.getElementById("page-subtitle").textContent = TITLES[name][1];
}

document.getElementById("view-all-link").addEventListener("click", e => {
  e.preventDefault();
  switchSection("bookings");
});

// ── REFRESH BUTTON ────────────────────────────────────────────
document.getElementById("refresh-btn").addEventListener("click", () => {
  loadAll();
  showToast("Refreshed", "Data reloaded", "success");
});

// ═══════════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════════
async function startAdmin() {
  initHallsUI();
  checkDbStatus();
  await loadAll();
  // Auto-refresh every 8 seconds
  autoRefreshTimer = setInterval(loadAll, 8000);
}

function initHallsUI() {
  const statsGrid = document.getElementById("stats-grid");
  const hallsGrid = document.getElementById("halls-grid");

  if (!statsGrid || !hallsGrid) return;

  const icons = ["mic-2", "presentation", "briefcase", "users", "map-pin", "monitor"];
  const colors = ["auditorium", "seminar", "conference", "auditorium", "seminar", "conference"];

  Object.entries(HALLS).forEach(([id, hall]) => {
    const icon = icons[id % 6];
    const color = colors[id % 6];

    statsGrid.insertAdjacentHTML('beforeend', `
      <div class="stat-card ${color}">
        <div class="stat-icon"><i data-lucide="${icon}"></i></div>
        <div class="stat-info">
          <div class="stat-value" id="stat-h${id}">—</div>
          <div class="stat-label">${hall.name}</div>
        </div>
      </div>
    `);

    hallsGrid.insertAdjacentHTML('beforeend', `
      <div class="hall-card">
        <div class="hall-icon ${color}"><i data-lucide="${icon}"></i></div>
        <div class="hall-details">
          <h3>${hall.name}</h3>
          <p>Capacity: <strong>${hall.capacity}</strong></p>
        </div>
        <div class="hall-stats">
          <div class="hall-stat-box"><div id="hall-${id}-count">—</div><small>Bookings</small></div>
        </div>
      </div>
    `);
  });
  lucide.createIcons();
}

async function loadAll() {
  await Promise.all([loadBookings(), loadStats()]);
}

// ═══════════════════════════════════════════════════════════════
//  DB STATUS
// ═══════════════════════════════════════════════════════════════
async function checkDbStatus() {
  const pill = document.getElementById("db-status-pill");
  const text = document.getElementById("db-status-text");
  try {
    const res = await fetch("/db-status");
    const data = await res.json();
    if (data.connected) {
      pill.className = "status-pill connected";
      text.textContent = "DB Connected";
    } else {
      pill.className = "status-pill disconnected";
      text.textContent = "DB Disconnected";
      showToast("DB Disconnected", "Whitelist your IP on MongoDB Atlas", "error");
    }
  } catch {
    pill.className = "status-pill disconnected";
    text.textContent = "DB Offline";
  }
}

// ═══════════════════════════════════════════════════════════════
//  STATS
// ═══════════════════════════════════════════════════════════════
async function loadStats() {
  try {
    const res = await fetch("/admin/stats");
    const data = await res.json();
    if (data.error) return;

    if (document.getElementById("stat-total")) document.getElementById("stat-total").textContent = data.total || 0;
    if (document.getElementById("stat-pending")) document.getElementById("stat-pending").textContent = data.pendingCount || 0;
    if (document.getElementById("stat-approved")) document.getElementById("stat-approved").textContent = data.approvedCount || 0;
    if (document.getElementById("stat-rejected")) document.getElementById("stat-rejected").textContent = data.rejectedCount || 0;
    if (document.getElementById("stat-today")) document.getElementById("stat-today").textContent = data.todayCount || 0;

    // Reset hall counts to 0
    Object.keys(HALLS).forEach(id => {
      const statEl = document.getElementById(`stat-h${id}`);
      const hallEl = document.getElementById(`hall-${id}-count`);
      if (statEl) statEl.textContent = 0;
      if (hallEl) hallEl.textContent = 0;
    });

    if (Array.isArray(data.byHall)) {
      data.byHall.forEach(h => {
        const statEl = document.getElementById(`stat-h${h._id}`);
        const hallEl = document.getElementById(`hall-${h._id}-count`);
        if (statEl) statEl.textContent = h.count;
        if (hallEl) hallEl.textContent = h.count;
      });
    }

    if (document.getElementById("sidebar-count")) {
      document.getElementById("sidebar-count").textContent = data.total || 0;
    }
    if (document.getElementById("sidebar-pending-count")) {
      document.getElementById("sidebar-pending-count").textContent = data.pendingCount || 0;
    }

  } catch (err) {
    console.error("Stats error:", err);
  }
}

// ═══════════════════════════════════════════════════════════════
//  LOAD BOOKINGS
// ═══════════════════════════════════════════════════════════════
async function loadBookings() {
  try {
    const res = await fetch("/bookings/all");
    const data = await res.json();

    if (!Array.isArray(data)) {
      // DB error
      return;
    }

    allBookings = data;
    applyFilters();
    applyRequestFilters();
    renderRecent(data);
  } catch (err) {
    console.error("Load bookings error:", err);
  }
}

// ═══════════════════════════════════════════════════════════════
//  ALL BOOKINGS FILTERS & TABLE/MOBILE RENDERING
// ═══════════════════════════════════════════════════════════════
const searchInput = document.getElementById("search-input");
const filterHall = document.getElementById("filter-hall");
const filterDate = document.getElementById("filter-date");
const filterStatus = document.getElementById("filter-status");

if (searchInput) searchInput.addEventListener("input", applyFilters);
if (filterHall) filterHall.addEventListener("change", applyFilters);
if (filterDate) filterDate.addEventListener("change", applyFilters);
if (filterStatus) filterStatus.addEventListener("change", applyFilters);

function applyFilters() {
  const query = (searchInput ? searchInput.value : "").toLowerCase().trim();
  const hallFilt = filterHall ? filterHall.value : "";
  const dateFilt = filterDate ? filterDate.value : "";
  const statusFilt = filterStatus ? filterStatus.value : "";
  const todayStr = new Date().toISOString().split("T")[0];

  let filtered = allBookings.filter(b => {
    const hallName = (HALLS[String(b.hallId)]?.name || "").toLowerCase();
    const userName = (b.userName || "").toLowerCase();
    const userEmail = (b.userEmail || "").toLowerCase();
    const dept = (b.dept || "").toLowerCase();
    const phone = (b.phone || "").toLowerCase();
    const eventName = (b.eventName || "").toLowerCase();
    const bookingStatus = b.status || "Pending";

    const matchQ = !query ||
      hallName.includes(query) ||
      b.date.includes(query) ||
      b.time.toLowerCase().includes(query) ||
      userName.includes(query) ||
      userEmail.includes(query) ||
      dept.includes(query) ||
      phone.includes(query) ||
      eventName.includes(query);

    const matchH = !hallFilt || String(b.hallId) === hallFilt;

    let matchD = true;
    if (dateFilt === "today") matchD = b.date === todayStr;
    if (dateFilt === "upcoming") matchD = b.date >= todayStr;
    if (dateFilt === "past") matchD = b.date < todayStr;

    const matchS = !statusFilt || bookingStatus === statusFilt;

    return matchQ && matchH && matchD && matchS;
  });

  filtered.sort((a, b) => b.date.localeCompare(a.date) || a.time.localeCompare(b.time));
  renderTable(filtered);
  renderMobileCards(filtered);
}

function renderTable(bookings) {
  const tbody = document.getElementById("bookings-tbody");
  const empty = document.getElementById("table-empty");
  const footer = document.getElementById("results-count");

  if (!tbody) return;

  if (bookings.length === 0) {
    tbody.innerHTML = "";
    if (empty) empty.classList.remove("hidden");
    if (footer) footer.textContent = "No bookings match your filters";
    return;
  }

  if (empty) empty.classList.add("hidden");
  if (footer) footer.textContent = `Showing ${bookings.length} booking${bookings.length !== 1 ? "s" : ""}`;

  const colors = ["auditorium", "seminar", "conference", "auditorium", "seminar", "conference"];

  tbody.innerHTML = bookings.map((b, i) => {
    const hallName = HALLS[String(b.hallId)]?.name || `Hall ${b.hallId}`;
    const cls = colors[b.hallId % 6] || "auditorium";
    const userHtml = userCell(b);
    const status = b.status || "Pending";
    const eventName = b.eventName || "—";
    return `
      <tr id="row-${b._id}">
        <td class="row-index">${i + 1}</td>
        <td><span class="hall-chip ${cls}">${hallName}</span></td>
        <td><span style="font-weight:600;color:#fff;">${escapeHtml(eventName)}</span></td>
        <td>${formatDate(b.date)}</td>
        <td>${b.time}</td>
        <td>${userHtml}</td>
        <td><span class="bci-status-badge ${status}" style="font-size:0.7rem;padding:0.2rem 0.6rem;">${status}</span></td>
        <td>
          <button class="del-btn" id="adel-${b._id}" onclick="confirmDelete('${b._id}')">
            <i data-lucide="trash-2"></i> Delete
          </button>
        </td>
      </tr>
    `;
  }).join("");

  lucide.createIcons();
}

// ═══════════════════════════════════════════════════════════════
//  ACCEPT / REJECT REQUESTS FILTERS & QUICK TABS
// ═══════════════════════════════════════════════════════════════
const reqSearchInput = document.getElementById("req-search-input");
const reqFilterHall = document.getElementById("req-filter-hall");
const reqFilterDate = document.getElementById("req-filter-date");

if (reqSearchInput) reqSearchInput.addEventListener("input", applyRequestFilters);
if (reqFilterHall) reqFilterHall.addEventListener("change", applyRequestFilters);
if (reqFilterDate) reqFilterDate.addEventListener("change", applyRequestFilters);

// Bind Status Tab Buttons
document.querySelectorAll(".status-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    currentStatusFilter = tab.dataset.status || "";
    updateTabButtons();
    applyRequestFilters();
  });
});

function updateTabButtons() {
  document.querySelectorAll(".status-tab").forEach(tab => {
    const s = tab.dataset.status || "";
    tab.classList.toggle("active", s === currentStatusFilter);
  });
}

function updateTabBadges() {
  const allCount = allBookings.length;
  const pendingCount = allBookings.filter(b => (b.status || "Pending") === "Pending").length;
  const approvedCount = allBookings.filter(b => b.status === "Approved").length;
  const rejectedCount = allBookings.filter(b => b.status === "Rejected").length;

  const bAll = document.getElementById("tab-badge-all");
  const bPen = document.getElementById("tab-badge-pending");
  const bApp = document.getElementById("tab-badge-approved");
  const bRej = document.getElementById("tab-badge-rejected");
  const sidePen = document.getElementById("sidebar-pending-count");

  if (bAll) bAll.textContent = allCount;
  if (bPen) bPen.textContent = pendingCount;
  if (bApp) bApp.textContent = approvedCount;
  if (bRej) bRej.textContent = rejectedCount;
  if (sidePen) sidePen.textContent = pendingCount;
}

function applyRequestFilters() {
  updateTabBadges();

  const query = (reqSearchInput ? reqSearchInput.value : "").toLowerCase().trim();
  const hallFilt = reqFilterHall ? reqFilterHall.value : "";
  const dateFilt = reqFilterDate ? reqFilterDate.value : "";
  const statusFilt = currentStatusFilter;
  const todayStr = new Date().toISOString().split("T")[0];

  let filtered = allBookings.filter(b => {
    const hallName = (HALLS[String(b.hallId)]?.name || "").toLowerCase();
    const userName = (b.userName || "").toLowerCase();
    const userEmail = (b.userEmail || "").toLowerCase();
    const dept = (b.dept || "").toLowerCase();
    const phone = (b.phone || "").toLowerCase();
    const eventName = (b.eventName || "").toLowerCase();
    const bookingStatus = b.status || "Pending";

    const matchQ = !query ||
      hallName.includes(query) ||
      b.date.includes(query) ||
      b.time.toLowerCase().includes(query) ||
      userName.includes(query) ||
      userEmail.includes(query) ||
      dept.includes(query) ||
      phone.includes(query) ||
      eventName.includes(query);

    const matchH = !hallFilt || String(b.hallId) === hallFilt;

    let matchD = true;
    if (dateFilt === "today") matchD = b.date === todayStr;
    if (dateFilt === "upcoming") matchD = b.date >= todayStr;
    if (dateFilt === "past") matchD = b.date < todayStr;

    const matchS = !statusFilt || bookingStatus === statusFilt;

    return matchQ && matchH && matchD && matchS;
  });

  filtered.sort((a, b) => b.date.localeCompare(a.date) || a.time.localeCompare(b.time));
  renderBookingCards(filtered);
}

// ═══════════════════════════════════════════════════════════════
//  RENDER INDIVIDUAL BOOKING CARDS (Accept / Reject Space)
// ═══════════════════════════════════════════════════════════════
function renderBookingCards(bookings) {
  const container = document.getElementById("booking-cards-grid");
  const empty = document.getElementById("req-empty");
  const footer = document.getElementById("req-results-count");

  if (!container) return;

  if (bookings.length === 0) {
    container.innerHTML = "";
    if (empty) empty.classList.remove("hidden");
    if (footer) footer.textContent = "No booking requests match your filters";
    return;
  }

  if (empty) empty.classList.add("hidden");
  if (footer) footer.textContent = `Showing ${bookings.length} request${bookings.length !== 1 ? "s" : ""}`;

  container.innerHTML = bookings.map(b => {
    const hallName = HALLS[String(b.hallId)]?.name || `Hall ${b.hallId}`;
    const status = b.status || "Pending";
    const statusIcon = status === "Approved" ? "check-circle" : (status === "Rejected" ? "x-circle" : "clock-3");

    // Details from booking object
    const lecturerName = b.userName || "Not specified";
    const department   = b.dept || "Not specified";
    const email        = b.userEmail || "Not specified";
    const contact      = b.phone || "Not specified";

    const eventName    = b.eventName || "Campus Event / Lecture";
    const bookingDate  = formatDate(b.date);
    const timeSlot     = b.time;
    const participants = b.participants ? `${b.participants} Attendees` : "Open / Not specified";

    const isApproved   = status === "Approved";
    const isRejected   = status === "Rejected";

    return `
      <div class="booking-card-item status-${status}" id="bcard-${b._id}">
        <!-- Top Card Header -->
        <div class="bci-header">
          <div class="bci-header-left">
            <div class="bci-hall-chip">
              <i data-lucide="building"></i>
              <span>${hallName}</span>
            </div>
            <div class="bci-event-title">${escapeHtml(eventName)}</div>
          </div>
          <div class="bci-status-badge ${status}">
            <i data-lucide="${statusIcon}"></i>
            <span>${status}</span>
          </div>
        </div>

        <!-- Middle Sections: User & Event Details -->
        <div class="bci-sections">
          <!-- 1. USER DETAILS -->
          <div class="bci-block">
            <div class="bci-block-title">
              <i data-lucide="user-check"></i> USER DETAILS
            </div>
            <div class="bci-grid">
              <div class="bci-field">
                <span class="bci-field-label">Lecturer Name</span>
                <span class="bci-field-val" title="${escapeHtml(lecturerName)}">
                  <i data-lucide="user"></i> ${escapeHtml(lecturerName)}
                </span>
              </div>
              <div class="bci-field">
                <span class="bci-field-label">Department</span>
                <span class="bci-field-val" title="${escapeHtml(department)}">
                  <i data-lucide="graduation-cap"></i> ${escapeHtml(department)}
                </span>
              </div>
              <div class="bci-field">
                <span class="bci-field-label">Email</span>
                <span class="bci-field-val" title="${escapeHtml(email)}">
                  <i data-lucide="mail"></i> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a>
                </span>
              </div>
              <div class="bci-field">
                <span class="bci-field-label">Contact Number</span>
                <span class="bci-field-val" title="${escapeHtml(contact)}">
                  <i data-lucide="phone"></i> ${escapeHtml(contact)}
                </span>
              </div>
            </div>
          </div>

          <!-- 2. EVENT DETAILS -->
          <div class="bci-block">
            <div class="bci-block-title">
              <i data-lucide="calendar"></i> EVENT DETAILS
            </div>
            <div class="bci-grid">
              <div class="bci-field full-width">
                <span class="bci-field-label">Event Name</span>
                <span class="bci-field-val" title="${escapeHtml(eventName)}">
                  <i data-lucide="bookmark"></i> ${escapeHtml(eventName)}
                </span>
              </div>
              <div class="bci-field">
                <span class="bci-field-label">Venue</span>
                <span class="bci-field-val" title="${escapeHtml(hallName)}">
                  <i data-lucide="map-pin"></i> ${escapeHtml(hallName)}
                </span>
              </div>
              <div class="bci-field">
                <span class="bci-field-label">Booking Date</span>
                <span class="bci-field-val">
                  <i data-lucide="calendar-days"></i> ${bookingDate}
                </span>
              </div>
              <div class="bci-field">
                <span class="bci-field-label">Time Slot</span>
                <span class="bci-field-val">
                  <i data-lucide="clock"></i> ${escapeHtml(timeSlot)}
                </span>
              </div>
              <div class="bci-field">
                <span class="bci-field-label">Participants</span>
                <span class="bci-field-val">
                  <i data-lucide="users"></i> ${escapeHtml(participants)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Bottom Action Buttons: Approve (Green) & Reject (Red) -->
        <div class="bci-actions">
          <button class="btn-approve" id="app-btn-${b._id}" onclick="updateBookingStatus('${b._id}', 'Approved')" ${isApproved ? 'disabled' : ''}>
            <i data-lucide="check"></i>
            <span>${isApproved ? 'Approved ✓' : 'APPROVE'}</span>
          </button>
          <button class="btn-reject" id="rej-btn-${b._id}" onclick="updateBookingStatus('${b._id}', 'Rejected')" ${isRejected ? 'disabled' : ''}>
            <i data-lucide="x"></i>
            <span>${isRejected ? 'Rejected ✕' : 'REJECT'}</span>
          </button>
          <button class="btn-delete-card" onclick="confirmDelete('${b._id}')" title="Delete Booking">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      </div>
    `;
  }).join("");

  lucide.createIcons();
}

function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ═══════════════════════════════════════════════════════════════
//  APPROVE & REJECT ACTIONS
// ═══════════════════════════════════════════════════════════════
window.updateBookingStatus = async function(id, newStatus) {
  const appBtn = document.getElementById(`app-btn-${id}`);
  const rejBtn = document.getElementById(`rej-btn-${id}`);

  if (appBtn) appBtn.disabled = true;
  if (rejBtn) rejBtn.disabled = true;

  try {
    const res = await fetch(`/api/bookings/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus })
    });
    const data = await res.json();

    if (data.success) {
      showToast(
        newStatus === "Approved" ? "Booking Approved 🎉" : "Booking Rejected ❌",
        data.message || `Booking status updated to ${newStatus}.`,
        newStatus === "Approved" ? "success" : "error"
      );

      // Update local state and re-render smoothly
      const idx = allBookings.findIndex(b => b._id === id);
      if (idx !== -1) {
        allBookings[idx].status = newStatus;
      }
      applyRequestFilters();
      applyFilters();
      renderRecent(allBookings);
      loadStats();
    } else {
      showToast("Cannot Update Status", data.message || "Failed to update booking status.", "error");
      if (appBtn) appBtn.disabled = false;
      if (rejBtn) rejBtn.disabled = false;
    }
  } catch (err) {
    showToast("Network Error", "Could not connect to server.", "error");
    if (appBtn) appBtn.disabled = false;
    if (rejBtn) rejBtn.disabled = false;
  }
};

// ═══════════════════════════════════════════════════════════════
//  RENDER RECENT (Dashboard)
// ═══════════════════════════════════════════════════════════════
function renderRecent(bookings) {
  const container = document.getElementById("recent-bookings-table");
  if (!container) return;
  const recent = [...bookings]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  if (recent.length === 0) {
    container.innerHTML = `<div style="padding:2.5rem;text-align:center;color:var(--text-muted);font-size:0.9rem;">No bookings yet — they will appear here once users make them.</div>`;
    return;
  }

  const colors = ["auditorium", "seminar", "conference", "auditorium", "seminar", "conference"];

  container.innerHTML = `
    <table class="bookings-table">
      <thead>
        <tr><th>#</th><th>Hall</th><th>Date</th><th>Time</th><th>User / Event</th><th>Status</th><th>Action</th></tr>
      </thead>
      <tbody>
        ${recent.map((b, i) => {
          const hallName = HALLS[String(b.hallId)]?.name || `Hall ${b.hallId}`;
          const cls = colors[b.hallId % 6] || "auditorium";
          const status = b.status || "Pending";
          const eventOrUser = b.eventName ? b.eventName : (b.userName || "Booking");
          return `
            <tr id="drow-${b._id}">
              <td class="row-index">${i + 1}</td>
              <td><span class="hall-chip ${cls}">${hallName}</span></td>
              <td>${formatDate(b.date)}</td>
              <td>${b.time}</td>
              <td><span style="font-weight:600;font-size:0.85rem;color:#fff;">${escapeHtml(eventOrUser)}</span></td>
              <td><span class="bci-status-badge ${status}" style="font-size:0.7rem;padding:0.2rem 0.6rem;">${status}</span></td>
              <td>
                <button class="del-btn" id="ddel-${b._id}" onclick="confirmDelete('${b._id}')">
                  <i data-lucide="trash-2"></i> Delete
                </button>
              </td>
            </tr>`;
        }).join("")}
      </tbody>
    </table>
  `;
  lucide.createIcons();
}

// ═══════════════════════════════════════════════════════════════
//  DELETE — Single
// ═══════════════════════════════════════════════════════════════
window.confirmDelete = function (id) {
  pendingDeleteId = id;
  pendingDeleteAll = false;
  document.getElementById("modal-title").textContent = "Delete Booking?";
  document.getElementById("modal-message").textContent = "This will permanently remove the booking. The action cannot be undone.";
  document.getElementById("confirm-modal").classList.remove("hidden");
};

// ═══════════════════════════════════════════════════════════════
//  DELETE — All
// ═══════════════════════════════════════════════════════════════
document.getElementById("delete-all-btn").addEventListener("click", () => {
  if (allBookings.length === 0) {
    showToast("Nothing to clear", "There are no bookings to delete.", "error");
    return;
  }
  pendingDeleteAll = true;
  pendingDeleteId = null;
  document.getElementById("modal-title").textContent = "Clear ALL Bookings?";
  document.getElementById("modal-message").textContent = `This will permanently delete all ${allBookings.length} bookings. This cannot be undone.`;
  document.getElementById("confirm-modal").classList.remove("hidden");
});

// ═══════════════════════════════════════════════════════════════
//  MODAL
// ═══════════════════════════════════════════════════════════════
document.getElementById("modal-cancel").addEventListener("click", closeModal);
document.getElementById("confirm-modal").addEventListener("click", e => {
  if (e.target.id === "confirm-modal") closeModal();
});

document.getElementById("modal-confirm").addEventListener("click", async () => {
  const confirmBtn = document.getElementById("modal-confirm");
  confirmBtn.disabled = true;
  confirmBtn.textContent = "Deleting...";

  const isAll = pendingDeleteAll;
  const idToDel = pendingDeleteId;

  closeModal();

  if (isAll) {
    await deleteAll();
  } else if (idToDel) {
    await deleteSingle(idToDel);
  }

  confirmBtn.disabled = false;
  confirmBtn.textContent = "Delete";
});

function closeModal() {
  document.getElementById("confirm-modal").classList.add("hidden");
  pendingDeleteId = null;
  pendingDeleteAll = false;
}

// ── Delete one ────────────────────────────────────────────────
async function deleteSingle(id) {
  // Optimistic UI: disable button immediately
  ["adel-" + id, "ddel-" + id].forEach(btnId => {
    const btn = document.getElementById(btnId);
    if (btn) { btn.disabled = true; btn.innerHTML = '<i data-lucide="loader-2"></i> Deleting...'; lucide.createIcons(); }
  });

  try {
    const res = await fetch(`/bookings/${id}`, { method: "DELETE" });
    const data = await res.json();

    if (data.success) {
      showToast("Deleted ✓", "Booking removed successfully.", "success");

      // Animate rows out
      ["row-" + id, "drow-" + id].forEach(rowId => {
        const row = document.getElementById(rowId);
        if (row) {
          row.style.transition = "opacity 0.25s, transform 0.25s";
          row.style.opacity = "0";
          row.style.transform = "translateX(10px)";
        }
      });

      setTimeout(() => loadAll(), 300);
    } else {
      showToast("Error", data.message || "Could not delete booking.", "error");
      await loadAll(); // re-render to restore buttons
    }
  } catch (err) {
    showToast("Error", "Server error. Try again.", "error");
    await loadAll();
  }
}

// ── Delete all ────────────────────────────────────────────────
async function deleteAll() {
  try {
    const res = await fetch("/admin/delete-all", { method: "POST" });
    const data = await res.json();
    showToast("Cleared ✓", `All bookings have been deleted.`, "success");
    await loadAll();
  } catch (err) {
    showToast("Error", "Failed to clear bookings.", "error");
  }
}

// ═══════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════

// Renders a user identity cell: avatar + name + email
function userCell(b) {
  const name = b.userName || '';
  const email = b.userEmail || '';
  if (!name && !email) {
    return `<span style="color:#94A3B8;font-style:italic;font-size:0.8rem;">Anonymous</span>`;
  }
  const initial = name ? name.charAt(0).toUpperCase() : email.charAt(0).toUpperCase();
  return `
    <div style="display:flex;align-items:center;gap:0.6rem;">
      <div style="width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,#FF7034,#FFA07A);
                  color:#fff;font-weight:800;font-size:0.78rem;display:flex;align-items:center;
                  justify-content:center;flex-shrink:0;">${initial}</div>
      <div>
        ${name ? `<div style="font-weight:600;font-size:0.85rem;color:#ffffff;">${name}</div>` : ''}
        ${email ? `<div style="font-size:0.75rem;color:#64748B;">${email}</div>` : ''}
      </div>
    </div>`;
}
function formatDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", {
    weekday: "short", year: "numeric", month: "short", day: "numeric"
  });
}

// ═══════════════════════════════════════════════════════════════
//  MOBILE BOOKING CARDS
// ═══════════════════════════════════════════════════════════════
function renderMobileCards(bookings) {
  const container = document.getElementById('mobile-bookings-list');
  if (!container) return;

  if (bookings.length === 0) {
    container.innerHTML = `
      <div class="mobile-empty">
        <i data-lucide="inbox"></i>
        <p>No bookings found</p>
      </div>`;
    lucide.createIcons();
    return;
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const colorMap = ['auditorium', 'seminar', 'conference', 'auditorium', 'seminar', 'conference'];

  container.innerHTML = bookings.map(b => {
    const isPast = b.date < todayStr;
    const hallName = HALLS[String(b.hallId)]?.name || `Hall ${b.hallId}`;
    const cls = colorMap[b.hallId % 6] || 'auditorium';
    const name = b.userName || '';
    const email = b.userEmail || '';
    const initial = name ? name.charAt(0).toUpperCase()
      : email ? email.charAt(0).toUpperCase() : '?';
    return `
      <div class="mobile-booking-card" id="mbc-${b._id}">
        <div class="mbc-header">
          <span class="mbc-hall-chip ${cls}">${hallName}</span>
          <span class="mbc-status ${isPast ? 'past' : ''}">${isPast ? 'Completed' : 'Booked'}</span>
        </div>
        <div class="mbc-body">
          <div class="mbc-row"><i data-lucide="calendar"></i><span>${formatDate(b.date)}</span></div>
          <div class="mbc-row"><i data-lucide="clock"></i><span>${b.time}</span></div>
        </div>
        <div class="mbc-user">
          <div class="mbc-avatar">${initial}</div>
          <div class="mbc-user-info">
            <div class="mbc-user-name">${name || 'Anonymous'}</div>
            <div class="mbc-user-email">${email}</div>
          </div>
          <button class="mbc-del-btn" id="mbc-del-${b._id}" onclick="confirmDelete('${b._id}')">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      </div>`;
  }).join('');

  lucide.createIcons();
}

function showToast(title, message, type = "success") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;

  const icon = type === "success" ? "check-circle" : "alert-circle";
  toast.innerHTML = `
    <i data-lucide="${icon}" class="toast-icon"></i>
    <div class="toast-body">
      <strong>${title}</strong>
      <span>${message}</span>
    </div>
  `;

  container.appendChild(toast);
  lucide.createIcons();

  setTimeout(() => toast.classList.add("show"), 10);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 400);
  }, 4000);
}
