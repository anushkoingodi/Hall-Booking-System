// ── Constants ─────────────────────────────────────────────────
const ADMIN_USER = "admin";
const ADMIN_PASS = "admin123";

const HALLS = {
  "1":  { name: "L F Rasquina Hall",    capacity: "123 pax" },
  "2":  { name: "Robert Sequeria Hall", capacity: "415 pax" },
  "3":  { name: "Sanidhya Hall",        capacity: "80 pax"  },
  "4":  { name: "Magis Hall",           capacity: "50 pax"  },
  "5":  { name: "Arrupe Hall 1",        capacity: "N/A"     },
  "6":  { name: "Arrupe Hall 2",        capacity: "N/A"     },
  "7":  { name: "Arrupe Hall 3",        capacity: "N/A"     },
  "8":  { name: "AV Room",              capacity: "120 pax" },
  "9":  { name: "Joseph Willy Hall",    capacity: "80 pax"  },
  "10": { name: "Eric Mathias Hall",    capacity: "200 pax" },
  "11": { name: "Xavier Hall",          capacity: "150 pax" }
};

// ── State ─────────────────────────────────────────────────────
let allBookings    = [];
let pendingDeleteId  = null;
let pendingDeleteAll = false;
let autoRefreshTimer = null;

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
  const err  = document.getElementById("login-error");

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
  document.getElementById("admin-layout").classList.add("hidden");
  document.getElementById("login-overlay").classList.remove("hidden");
  document.getElementById("login-user").value = "";
  document.getElementById("login-pass").value = "";
});

// ═══════════════════════════════════════════════════════════════
//  NAVIGATION
// ═══════════════════════════════════════════════════════════════
const SECTIONS = ["dashboard", "bookings", "halls"];
const TITLES = {
  dashboard: ["Dashboard",       "Overview of all hall bookings"],
  bookings:  ["All Bookings",    "Manage and control every booking"],
  halls:     ["Hall Directory",  "View all available halls"],
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
  document.getElementById("page-title").textContent    = TITLES[name][0];
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
    const res  = await fetch("/db-status");
    const data = await res.json();
    if (data.connected) {
      pill.className   = "status-pill connected";
      text.textContent = "DB Connected";
    } else {
      pill.className   = "status-pill disconnected";
      text.textContent = "DB Disconnected";
      showToast("DB Disconnected", "Whitelist your IP on MongoDB Atlas", "error");
    }
  } catch {
    pill.className   = "status-pill disconnected";
    text.textContent = "DB Offline";
  }
}

// ═══════════════════════════════════════════════════════════════
//  STATS
// ═══════════════════════════════════════════════════════════════
async function loadStats() {
  try {
    const res  = await fetch("/admin/stats");
    const data = await res.json();
    if (data.error) return;

    document.getElementById("stat-total").textContent = data.total;
    document.getElementById("stat-today").textContent = data.todayCount;

    // Reset hall counts to 0
    Object.keys(HALLS).forEach(id => {
      const statEl = document.getElementById(`stat-h${id}`);
      const hallEl = document.getElementById(`hall-${id}-count`);
      if (statEl) statEl.textContent = 0;
      if (hallEl) hallEl.textContent = 0;
    });

    data.byHall.forEach(h => {
      const statEl = document.getElementById(`stat-h${h._id}`);
      const hallEl = document.getElementById(`hall-${h._id}-count`);
      if (statEl) statEl.textContent = h.count;
      if (hallEl) hallEl.textContent = h.count;
    });

    document.getElementById("sidebar-count").textContent = data.total;

  } catch (err) {
    console.error("Stats error:", err);
  }
}

// ═══════════════════════════════════════════════════════════════
//  LOAD BOOKINGS
// ═══════════════════════════════════════════════════════════════
async function loadBookings() {
  try {
    const res  = await fetch("/bookings/all");
    const data = await res.json();

    if (!Array.isArray(data)) {
      // DB error
      return;
    }

    allBookings = data;
    applyFilters();
    renderRecent(data);
  } catch (err) {
    console.error("Load bookings error:", err);
  }
}

// ═══════════════════════════════════════════════════════════════
//  FILTERS
// ═══════════════════════════════════════════════════════════════
document.getElementById("search-input").addEventListener("input",  applyFilters);
document.getElementById("filter-hall").addEventListener("change",  applyFilters);
document.getElementById("filter-date").addEventListener("change",  applyFilters);

function applyFilters() {
  const query    = document.getElementById("search-input").value.toLowerCase().trim();
  const hallFilt = document.getElementById("filter-hall").value;
  const dateFilt = document.getElementById("filter-date").value;
  const todayStr = new Date().toISOString().split("T")[0];

  let filtered = allBookings.filter(b => {
    const name      = (HALLS[String(b.hallId)]?.name || "").toLowerCase();
    const userName  = (b.userName  || "").toLowerCase();
    const userEmail = (b.userEmail || "").toLowerCase();
    const matchQ = !query ||
      name.includes(query) ||
      b.date.includes(query) ||
      b.time.toLowerCase().includes(query) ||
      userName.includes(query) ||
      userEmail.includes(query);
    const matchH = !hallFilt || String(b.hallId) === hallFilt;

    let matchD = true;
    if (dateFilt === "today")    matchD = b.date === todayStr;
    if (dateFilt === "upcoming") matchD = b.date >= todayStr;
    if (dateFilt === "past")     matchD = b.date < todayStr;

    return matchQ && matchH && matchD;
  });

  filtered.sort((a, b) => b.date.localeCompare(a.date) || a.time.localeCompare(b.time));
  renderTable(filtered);
}

// ═══════════════════════════════════════════════════════════════
//  RENDER TABLE (All Bookings section)
// ═══════════════════════════════════════════════════════════════
function renderTable(bookings) {
  const tbody  = document.getElementById("bookings-tbody");
  const empty  = document.getElementById("table-empty");
  const footer = document.getElementById("results-count");

  if (bookings.length === 0) {
    tbody.innerHTML    = "";
    empty.classList.remove("hidden");
    footer.textContent = "No bookings match your filters";
    return;
  }

  empty.classList.add("hidden");
  footer.textContent = `Showing ${bookings.length} booking${bookings.length !== 1 ? "s" : ""}`;

  const todayStr = new Date().toISOString().split("T")[0];

  tbody.innerHTML = bookings.map((b, i) => {
    const isPast   = b.date < todayStr;
    const hallName = HALLS[String(b.hallId)]?.name || `Hall ${b.hallId}`;
    const colors = ["auditorium", "seminar", "conference", "auditorium", "seminar", "conference"];
    const cls      = colors[b.hallId % 6] || "auditorium";
    const userHtml = userCell(b);
    return `
      <tr id="row-${b._id}">
        <td class="row-index">${i + 1}</td>
        <td><span class="hall-chip ${cls}">${hallName}</span></td>
        <td>${formatDate(b.date)}</td>
        <td>${b.time}</td>
        <td>${userHtml}</td>
        <td><span class="status-badge ${isPast ? "past" : ""}">${isPast ? "Completed" : "Booked"}</span></td>
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
//  RENDER RECENT (Dashboard)
// ═══════════════════════════════════════════════════════════════
function renderRecent(bookings) {
  const container = document.getElementById("recent-bookings-table");
  const recent    = [...bookings]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  if (recent.length === 0) {
    container.innerHTML = `<div style="padding:2.5rem;text-align:center;color:var(--text-muted);font-size:0.9rem;">No bookings yet — they will appear here once users make them.</div>`;
    return;
  }

  const todayStr = new Date().toISOString().split("T")[0];

  container.innerHTML = `
    <table class="bookings-table">
      <thead>
        <tr><th>#</th><th>Hall</th><th>Date</th><th>Time</th><th>Status</th><th>Action</th></tr>
      </thead>
      <tbody>
        ${recent.map((b, i) => {
          const isPast   = b.date < todayStr;
          const hallName = HALLS[String(b.hallId)] || `Hall ${b.hallId}`;
          const cls      = HALL_CLASS[String(b.hallId)] || "h1";
          return `
            <tr id="drow-${b._id}">
              <td class="row-index">${i + 1}</td>
              <td><span class="hall-chip ${cls}">${hallName}</span></td>
              <td>${formatDate(b.date)}</td>
              <td>${b.time}</td>
              <td><span class="status-badge ${isPast ? "past" : ""}">${isPast ? "Completed" : "Booked"}</span></td>
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
window.confirmDelete = function(id) {
  pendingDeleteId  = id;
  pendingDeleteAll = false;
  document.getElementById("modal-title").textContent   = "Delete Booking?";
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
  pendingDeleteId  = null;
  document.getElementById("modal-title").textContent   = "Clear ALL Bookings?";
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
  confirmBtn.disabled    = true;
  confirmBtn.textContent = "Deleting...";

  const isAll = pendingDeleteAll;
  const idToDel = pendingDeleteId;

  closeModal();

  if (isAll) {
    await deleteAll();
  } else if (idToDel) {
    await deleteSingle(idToDel);
  }

  confirmBtn.disabled    = false;
  confirmBtn.textContent = "Delete";
});

function closeModal() {
  document.getElementById("confirm-modal").classList.add("hidden");
  pendingDeleteId  = null;
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
    const res  = await fetch(`/bookings/${id}`, { method: "DELETE" });
    const data = await res.json();

    if (data.success) {
      showToast("Deleted ✓", "Booking removed successfully.", "success");

      // Animate rows out
      ["row-" + id, "drow-" + id].forEach(rowId => {
        const row = document.getElementById(rowId);
        if (row) {
          row.style.transition = "opacity 0.25s, transform 0.25s";
          row.style.opacity    = "0";
          row.style.transform  = "translateX(10px)";
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
    const res  = await fetch("/admin/delete-all", { method: "POST" });
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
  const name  = b.userName  || '';
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
        ${name  ? `<div style="font-weight:600;font-size:0.85rem;color:#ffffff;">${name}</div>` : ''}
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

function showToast(title, message, type = "success") {
  const container = document.getElementById("toast-container");
  const toast     = document.createElement("div");
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
