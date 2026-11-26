lucide.createIcons();

document.addEventListener('DOMContentLoaded', () => {

  // ── Current session user ──────────────────────────────────────
  function getCurrentUser() {
    return JSON.parse(sessionStorage.getItem('hb_user') || 'null');
  }

  // ── Hall data ─────────────────────────────────────────────────
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

  // ── DOM refs ──────────────────────────────────────────────────
  const bookingForm       = document.getElementById('booking-form');
  const hallSelect        = document.getElementById('hall-select');
  const dateInput         = document.getElementById('date-select');
  const timeHiddenStart   = document.getElementById('time-select-start');
  const timeHiddenEnd     = document.getElementById('time-select-end');
  const timeError         = document.getElementById('time-error');
  const bookingsContainer = document.getElementById('bookings-container');
  const emptyState        = document.getElementById('empty-state');
  const bookingCountBadge = document.getElementById('booking-count');
  const historyTbody      = document.getElementById('history-tbody');
  const historyTableWrap  = document.getElementById('history-table-wrap');
  const historyEmptyState = document.getElementById('history-empty-state');
  const pdHistoryCount    = document.getElementById('pd-history-count');
  const historyModal      = document.getElementById('history-modal-overlay');
  const pdHistoryBtn      = document.getElementById('pd-history-btn');
  const navHistoryLink    = document.getElementById('nav-history-link');
  const drawerHistoryLink = document.getElementById('drawer-history');
  const bnavHistoryLink   = document.getElementById('bnav-history');
  const closeHistoryBtn   = document.getElementById('close-history-btn');

  function openHistoryModal(e) {
    if (e) e.preventDefault();
    if (!historyModal) return;
    historyModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    const dropdown = document.getElementById('profile-dropdown');
    if (dropdown) dropdown.classList.remove('open');
  }
  function closeHistoryModal() {
    if (!historyModal) return;
    historyModal.classList.add('hidden');
    document.body.style.overflow = '';
  }
  if (pdHistoryBtn) pdHistoryBtn.addEventListener('click', openHistoryModal);
  if (navHistoryLink) navHistoryLink.addEventListener('click', openHistoryModal);
  if (drawerHistoryLink) drawerHistoryLink.addEventListener('click', openHistoryModal);
  if (bnavHistoryLink) bnavHistoryLink.addEventListener('click', openHistoryModal);
  if (closeHistoryBtn) closeHistoryBtn.addEventListener('click', closeHistoryModal);
  if (historyModal) {
    historyModal.addEventListener('click', e => {
      if (e.target === historyModal) closeHistoryModal();
    });
  }
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && historyModal && !historyModal.classList.contains('hidden')) {
      closeHistoryModal();
    }
  });
  const submitBtn         = document.getElementById('submit-btn');
  const tpTriggerStart    = document.getElementById('tp-trigger-start');
  const tpTriggerTextStart= document.getElementById('tp-trigger-text-start');
  const tpTriggerEnd      = document.getElementById('tp-trigger-end');
  const tpTriggerTextEnd  = document.getElementById('tp-trigger-text-end');

  // ── Set min date to today ─────────────────────────────────────
  dateInput.min = new Date().toISOString().split('T')[0];

  // ══════════════════════════════════════════════════════════════
  //  RADIAL TIME PICKER ENGINE
  // ══════════════════════════════════════════════════════════════
  const TP = {
    // state
    target:  'start',  // 'start' | 'end'
    mode:    'hour',   // 'hour' | 'minute'
    hour:    9,        // 1–12
    minute:  0,        // 0–59
    ampm:    'AM',
    dragging: false,

    // elements
    overlay:     document.getElementById('tp-overlay'),
    headerLabel: document.getElementById('tp-header-label'),
    dispHour:    document.getElementById('tp-disp-hour'),
    dispMin:     document.getElementById('tp-disp-min'),
    amBtn:       document.getElementById('tp-am'),
    pmBtn:       document.getElementById('tp-pm'),
    clock:       document.getElementById('tp-clock'),
    numbersG:    document.getElementById('tp-numbers'),
    ticksG:      document.getElementById('tp-ticks'),
    hand:        document.getElementById('tp-hand'),
    tip:         document.getElementById('tp-tip'),
    tipText:     document.getElementById('tp-tip-text'),
    cancelBtn:   document.getElementById('tp-cancel'),
    okBtn:       document.getElementById('tp-ok'),

    // SVG constants (viewBox 0 0 280 280, center 140,140)
    CX: 140, CY: 140,
    R_NUMBERS: 100,  // radius for number positions
    R_NEEDLE:  98,   // needle length
    R_TICK_O:  128,  // tick outer radius (at clock edge)
    R_TICK_I:  118,  // tick inner radius

    init() {
      this.renderTicks();
      this.bindEvents();
    },

    // ── Open / Close ──────────────────────────────────────────
    open(target) {
      this.target = target;
      this.mode   = 'hour';
      this.overlay.classList.remove('hidden');
      this.render();
    },
    close() {
      this.overlay.classList.add('hidden');
    },
    confirm() {
      const h = String(this.hour).padStart(2,  '0');
      const m = String(this.minute).padStart(2, '0');
      const val = `${h}:${m} ${this.ampm}`;
      
      if (this.target === 'start') {
        timeHiddenStart.value = val;
        tpTriggerTextStart.textContent = val;
        tpTriggerStart.classList.add('has-value');
      } else {
        timeHiddenEnd.value = val;
        tpTriggerTextEnd.textContent = val;
        tpTriggerEnd.classList.add('has-value');
      }

      if (timeHiddenStart.value && timeHiddenEnd.value) {
        timeError.classList.add('hidden');
      }
      this.close();
    },

    // ── Render ────────────────────────────────────────────────
    render() {
      // Header label
      this.headerLabel.textContent = this.mode === 'hour' ? 'SELECT HOUR' : 'SELECT MINUTE';

      // Numeric display
      this.dispHour.textContent = String(this.hour).padStart(2, '0');
      this.dispMin.textContent  = String(this.minute).padStart(2, '0');
      this.dispHour.classList.toggle('active', this.mode === 'hour');
      this.dispMin.classList.toggle('active',  this.mode === 'minute');

      // AM/PM
      this.amBtn.classList.toggle('active', this.ampm === 'AM');
      this.pmBtn.classList.toggle('active', this.ampm === 'PM');

      // Clock
      this.renderNumbers();
      this.updateNeedle();
    },

    // ── Tick marks ────────────────────────────────────────────
    renderTicks() {
      const ns = 'http://www.w3.org/2000/svg';
      this.ticksG.innerHTML = '';
      for (let i = 0; i < 60; i++) {
        const angle = (i * 6 - 90) * Math.PI / 180;
        const isMajor = i % 5 === 0;
        const ri = isMajor ? this.R_TICK_I - 4 : this.R_TICK_I + 2;
        const ro = this.R_TICK_O;

        const line = document.createElementNS(ns, 'line');
        line.setAttribute('x1', this.CX + ri * Math.cos(angle));
        line.setAttribute('y1', this.CY + ri * Math.sin(angle));
        line.setAttribute('x2', this.CX + ro * Math.cos(angle));
        line.setAttribute('y2', this.CY + ro * Math.sin(angle));
        line.setAttribute('class', isMajor ? 'tp-tick-major' : 'tp-tick-minor');
        this.ticksG.appendChild(line);
      }
    },

    // ── Clock numbers ─────────────────────────────────────────
    renderNumbers() {
      const ns = 'http://www.w3.org/2000/svg';
      this.numbersG.innerHTML = '';

      if (this.mode === 'hour') {
        // 12 hour numbers: 12, 1, 2 … 11
        for (let i = 0; i < 12; i++) {
          const label = i === 0 ? 12 : i;
          const angle = (i * 30 - 90) * Math.PI / 180;
          const x = this.CX + this.R_NUMBERS * Math.cos(angle);
          const y = this.CY + this.R_NUMBERS * Math.sin(angle);
          const selected = label === this.hour;
          this._addNumber(ns, label, x, y, selected);
        }
      } else {
        // 12 minute labels: 00, 05, 10 … 55
        for (let i = 0; i < 12; i++) {
          const label = i * 5;
          const angle = (i * 30 - 90) * Math.PI / 180;
          const x = this.CX + this.R_NUMBERS * Math.cos(angle);
          const y = this.CY + this.R_NUMBERS * Math.sin(angle);
          const selected = label === this.minute || (this.minute % 5 !== 0 && label === Math.round(this.minute / 5) * 5 % 60);
          this._addNumber(ns, String(label).padStart(2, '0'), x, y, selected);
        }
      }
    },

    _addNumber(ns, label, x, y, selected) {
      // Hover area (larger invisible circle)
      const hit = document.createElementNS(ns, 'circle');
      hit.setAttribute('cx', x); hit.setAttribute('cy', y); hit.setAttribute('r', 22);
      hit.setAttribute('fill', 'transparent'); hit.setAttribute('cursor', 'pointer');
      hit.addEventListener('pointerdown', e => { e.stopPropagation(); this._onNumberClick(Number(label)); });
      this.numbersG.appendChild(hit);

      // Visible background
      const bg = document.createElementNS(ns, 'circle');
      bg.setAttribute('cx', x); bg.setAttribute('cy', y); bg.setAttribute('r', 20);
      bg.setAttribute('fill', selected ? '#FF7034' : 'transparent');
      bg.setAttribute('pointer-events', 'none');
      this.numbersG.appendChild(bg);

      // Text
      const txt = document.createElementNS(ns, 'text');
      txt.setAttribute('x', x); txt.setAttribute('y', y);
      txt.setAttribute('text-anchor', 'middle');
      txt.setAttribute('dominant-baseline', 'central');
      txt.setAttribute('fill', selected ? '#fff' : '#334155');
      txt.setAttribute('font-size', this.mode === 'minute' ? '12' : '14');
      txt.setAttribute('font-weight', selected ? '700' : '500');
      txt.setAttribute('font-family', 'Inter, sans-serif');
      txt.setAttribute('pointer-events', 'none');
      txt.textContent = label;
      this.numbersG.appendChild(txt);
    },

    _onNumberClick(value) {
      if (this.mode === 'hour') {
        this.hour = value;
        this.render();
        // Auto-advance to minute mode
        setTimeout(() => { this.mode = 'minute'; this.render(); }, 220);
      } else {
        this.minute = typeof value === 'string' ? Number(value) : value;
        this.render();
      }
    },

    // ── Needle ────────────────────────────────────────────────
    updateNeedle() {
      let angle;
      let displayVal;

      if (this.mode === 'hour') {
        angle      = ((this.hour % 12) * 30 - 90) * Math.PI / 180;
        displayVal = this.hour;
      } else {
        angle      = (this.minute * 6 - 90) * Math.PI / 180;
        displayVal = String(this.minute).padStart(2, '0');
      }

      const tx = this.CX + this.R_NEEDLE * Math.cos(angle);
      const ty = this.CY + this.R_NEEDLE * Math.sin(angle);

      this.hand.setAttribute('x2', tx);
      this.hand.setAttribute('y2', ty);
      this.tip.setAttribute('cx', tx);
      this.tip.setAttribute('cy', ty);
      this.tipText.setAttribute('x', tx);
      this.tipText.setAttribute('y', ty);
      this.tipText.textContent = displayVal;
    },

    // ── Drag / Click on clock face ────────────────────────────
    _getSVGAngle(e) {
      const rect   = this.clock.getBoundingClientRect();
      const scaleX = 280 / rect.width;
      const scaleY = 280 / rect.height;
      const cx     = e.clientX - rect.left;
      const cy     = e.clientY - rect.top;
      const svgX   = cx * scaleX - this.CX;
      const svgY   = cy * scaleY - this.CY;
      return Math.atan2(svgY, svgX) * 180 / Math.PI; // -180 to 180
    },

    _processAngle(angleDeg) {
      // Normalize: 0 = 12 o'clock, going clockwise
      const norm = ((angleDeg + 90) % 360 + 360) % 360;

      if (this.mode === 'hour') {
        const h  = Math.round(norm / 30) % 12;
        this.hour = h === 0 ? 12 : h;
      } else {
        this.minute = Math.round(norm / 6) % 60;
      }
      this.render();
    },

    // ── Events ────────────────────────────────────────────────
    bindEvents() {
      // Trigger
      tpTriggerStart.addEventListener('click', () => this.open('start'));
      tpTriggerEnd.addEventListener('click', () => this.open('end'));

      // Cancel / backdrop
      this.cancelBtn.addEventListener('click', () => this.close());
      this.overlay.addEventListener('click', e => { if (e.target === this.overlay) this.close(); });

      // OK
      this.okBtn.addEventListener('click', () => this.confirm());

      // AM / PM
      this.amBtn.addEventListener('click', () => { this.ampm = 'AM'; this.render(); });
      this.pmBtn.addEventListener('click', () => { this.ampm = 'PM'; this.render(); });

      // Mode switch via display
      this.dispHour.addEventListener('click', () => { this.mode = 'hour';   this.render(); });
      this.dispMin.addEventListener('click',  () => { this.mode = 'minute'; this.render(); });

      // Keyboard shortcut
      document.addEventListener('keydown', e => {
        if (!this.overlay.classList.contains('hidden')) {
          if (e.key === 'Escape') this.close();
          if (e.key === 'Enter')  this.confirm();
        }
      });

      // Pointer drag on clock
      this.clock.addEventListener('pointerdown', e => {
        this.dragging = true;
        this.clock.setPointerCapture(e.pointerId);
        this._processAngle(this._getSVGAngle(e));
      });

      this.clock.addEventListener('pointermove', e => {
        if (!this.dragging) return;
        this._processAngle(this._getSVGAngle(e));
      });

      this.clock.addEventListener('pointerup', e => {
        if (!this.dragging) return;
        this.dragging = false;
        this.clock.releasePointerCapture(e.pointerId);
        // Auto-advance to minute after releasing hour selection
        if (this.mode === 'hour') {
          setTimeout(() => { this.mode = 'minute'; this.render(); }, 180);
        }
      });
    }
  };

  // Init the time picker
  TP.init();

  // ══════════════════════════════════════════════════════════════
  //  HALL AVAILABILITY CARDS (Hero)
  // ══════════════════════════════════════════════════════════════
  // Active subset of halls shown in hero (center is always idx 1)
  let heroHalls = [1, 2, 3]; 

  hallSelect.addEventListener('change', () => {
    const selId = Number(hallSelect.value);
    if (!selId) return;

    // Remove glow class from all
    [1, 2, 3].forEach(i => document.getElementById(`hfc-${i}`).classList.remove('hfc-selected'));

    // Pick previous, current, next hall IDs to display
    const prev = selId > 1 ? selId - 1 : 11;
    const next = selId < 11 ? selId + 1 : 1;
    heroHalls = [prev, selId, next];

    updateHeroCardsUI();

    // Add glow class to the center card (which is the selected one)
    document.getElementById('hfc-2').classList.add('hfc-selected');
  });

  async function updateHeroCards() {
    try {
      const res  = await fetch('/bookings/all');
      const data = await res.json();
      if (!Array.isArray(data)) return;

      const today = new Date().toISOString().split('T')[0];
      window.bookedPerHall = {};
      data.filter(b => b.date === today && b.status !== 'Cancelled' && b.status !== 'Rejected').forEach(b => {
        const k = String(b.hallId);
        window.bookedPerHall[k] = (window.bookedPerHall[k] || 0) + 1;
      });

      updateHeroCardsUI();
    } catch {}
  }

  function updateHeroCardsUI() {
    const booked = window.bookedPerHall || {};
    
    // Icon map based on type
    const icons = ["mic-2", "presentation", "briefcase", "users", "map-pin", "monitor"];
    const colors = ["auditorium", "seminar", "conference", "auditorium", "seminar", "conference"];

    heroHalls.forEach((hallId, idx) => {
      // Map array [prev, sel, next] to DOM IDs [1, 2, 3]
      const domId = idx + 1; 
      const el   = document.getElementById(`hfc-status-${domId}`);
      const card = document.getElementById(`hfc-${domId}`);
      if (!el || !card) return;

      const hallInfo = HALLS[String(hallId)];
      if(!hallInfo) return;

      // Update card content
      card.querySelector('.hfc-name').textContent = hallInfo.name;
      card.querySelector('.hfc-cap').innerHTML = `<i data-lucide="users"></i> ${hallInfo.capacity}`;
      
      const iconWrap = card.querySelector('.hfc-icon');
      iconWrap.className = `hfc-icon ${colors[hallId % 6]}`;
      iconWrap.innerHTML = `<i data-lucide="${icons[hallId % 6]}"></i>`;

      const count = booked[String(hallId)] || 0;
      if (count === 0) {
        el.className = 'hfc-status available';
        el.innerHTML = '<span class="status-dot"></span> Available';
      } else if (count < 3) {
        const free = 3 - count;
        el.className = 'hfc-status available';
        el.innerHTML = `<span class="status-dot"></span> ${free} Slot${free > 1 ? 's' : ''} Free`;
      } else {
        el.className = 'hfc-status booked';
        el.innerHTML = '<span class="status-dot"></span> Fully Booked';
      }
    });
    
    lucide.createIcons();
  }

  // ══════════════════════════════════════════════════════════════
  //  DB STATUS BANNER
  // ══════════════════════════════════════════════════════════════
  async function checkDbStatus() {
    try {
      const res  = await fetch('/db-status');
      const data = await res.json();
      if (!data.connected) showDbBanner();
    } catch { showDbBanner(); }
  }

  function showDbBanner() {
    if (document.getElementById('db-banner')) return;
    const b = document.createElement('div');
    b.id = 'db-banner';
    b.style.cssText = 'background:#FEF2F2;border-bottom:1px solid #FECACA;color:#DC2626;padding:0.6rem 2rem;text-align:center;font-size:0.875rem;font-weight:500;position:fixed;top:80px;left:0;right:0;z-index:999';
    b.innerHTML = '⚠️ DB not connected — <a href="https://cloud.mongodb.com" target="_blank" style="color:#DC2626;font-weight:700;text-decoration:underline;">Whitelist IP on MongoDB Atlas</a>.';
    document.body.appendChild(b);
    document.querySelector('main').style.marginTop = '42px';
  }

  checkDbStatus();

  // ══════════════════════════════════════════════════════════════
  //  BOOKING FORM SUBMIT
  // ══════════════════════════════════════════════════════════════
  bookingForm.addEventListener('submit', async e => {
    e.preventDefault();

    const hallId = hallSelect.value;
    const date   = dateInput.value;
    const start  = timeHiddenStart.value;
    const end    = timeHiddenEnd.value;
    const eventName = (document.getElementById('event-name')?.value || '').trim();
    const participants = document.getElementById('event-participants')?.value || '';

    if (!start || !end) {
      timeError.classList.remove('hidden');
      tpTriggerStart.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (!start) { tpTriggerStart.style.borderColor = 'var(--error)'; setTimeout(() => { tpTriggerStart.style.borderColor = ''; }, 2000); }
      if (!end) { tpTriggerEnd.style.borderColor = 'var(--error)'; setTimeout(() => { tpTriggerEnd.style.borderColor = ''; }, 2000); }
      return;
    }
    
    const time = `${start} - ${end}`;
    timeError.classList.add('hidden');
    if (!hallId || !date) return;

    // attach current user info
    const currentUser = getCurrentUser();
    const userEmail   = currentUser ? (currentUser.email || '').trim().toLowerCase() : '';
    const userName    = currentUser ? currentUser.name  : '';
    const dept        = currentUser ? currentUser.dept  : '';
    const phone       = currentUser ? currentUser.phone : '';

    setLoading(true);

    try {
      const res  = await fetch('/book', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          hallId: Number(hallId),
          date,
          time,
          userEmail,
          userName,
          dept,
          phone,
          eventName,
          participants
        })
      });
      const data = await res.json();

      if (data.success) {
        showToast('Booking Submitted 🎉', data.message, 'success');
        bookingForm.reset();
        timeHiddenStart.value = '';
        timeHiddenEnd.value = '';
        tpTriggerTextStart.textContent = 'Start...';
        tpTriggerTextEnd.textContent = 'End...';
        tpTriggerStart.classList.remove('has-value');
        tpTriggerEnd.classList.remove('has-value');
        await loadBookings();
        updateHeroCards();
        document.getElementById('bookings').scrollIntoView({ behavior: 'smooth' });
      } else {
        showToast('Booking Failed', data.message, 'error');
      }
    } catch {
      showToast('Error', 'Could not reach the server.', 'error');
    } finally {
      setLoading(false);
    }
  });

  function setLoading(on) {
    submitBtn.disabled  = on;
    submitBtn.innerHTML = on
      ? '<span>Confirming...</span>'
      : '<i data-lucide="calendar-check"></i><span>Confirm Booking</span>';
    if (!on) lucide.createIcons();
  }

  // ══════════════════════════════════════════════════════════════
  //  LOAD & RENDER BOOKINGS
  // ══════════════════════════════════════════════════════════════
  async function loadBookings() {
    try {
      const currentUser = getCurrentUser();
      const email = currentUser && currentUser.email ? encodeURIComponent(currentUser.email.trim().toLowerCase()) : '';
      const url   = email ? `/bookings?email=${email}` : '/bookings';
      const res   = await fetch(url);
      const data  = await res.json();
      renderBookings(Array.isArray(data) ? data : []);
    } catch {}
  }

  // ══════════════════════════════════════════════════════════════
  //  TIME PARSING & AUTOMATIC LIFECYCLE CATEGORISATION
  // ══════════════════════════════════════════════════════════════
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function parseTimeToMinutes(str) {
    if (!str || typeof str !== 'string') return null;
    const clean = str.trim();
    const match = clean.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
    if (!match) return null;

    let hours = Number(match[1]);
    const minutes = Number(match[2]);
    const period = match[3] ? match[3].toUpperCase() : null;

    if (!Number.isInteger(hours) || !Number.isInteger(minutes) || minutes < 0 || minutes > 59) {
      return null;
    }

    if (period) {
      if (hours < 1 || hours > 12) return null;
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
    } else if (hours < 0 || hours > 23) {
      return null;
    }

    return hours * 60 + minutes;
  }

  function getBookingSchedule(booking, now = new Date()) {
    const rawTime = typeof booking.time === 'string' ? booking.time : '';
    const parts = rawTime.split(/\s*[-–]\s*/);
    const startTimeText = parts[0] ? parts[0].trim() : '';
    const endTimeText = parts[1] ? parts[1].trim() : '';

    const dateMatch = typeof booking.date === 'string'
      ? booking.date.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/)
      : null;

    if (!dateMatch) {
      return { startTimeText, endTimeText, startMin: 0, endMin: 0, endDateTime: null, isPast: false };
    }

    const year = Number(dateMatch[1]);
    const month = Number(dateMatch[2]);
    const day = Number(dateMatch[3]);

    const parsedStart = parseTimeToMinutes(startTimeText);
    const startMin = parsedStart !== null
      ? parsedStart
      : (typeof booking.startMin === 'number' && Number.isFinite(booking.startMin) ? booking.startMin : 0);

    const parsedEnd = parseTimeToMinutes(endTimeText);
    const endMin = parsedEnd !== null
      ? parsedEnd
      : (typeof booking.endMin === 'number' && Number.isFinite(booking.endMin) ? booking.endMin : null);

    if (endMin === null || endMin < 0 || endMin > 1440) {
      return { startTimeText, endTimeText, startMin, endMin: 0, endDateTime: null, isPast: false };
    }

    const endDateTime = new Date(year, month - 1, day, Math.floor(endMin / 60), endMin % 60, 0, 0);
    if (Number.isNaN(endDateTime.getTime())) {
      return { startTimeText, endTimeText, startMin, endMin: 0, endDateTime: null, isPast: false };
    }

    return {
      startTimeText,
      endTimeText,
      startMin,
      endMin,
      endDateTime,
      isPast: now.getTime() >= endDateTime.getTime()
    };
  }

  function renderBookingCard(b, schedule, isHistory) {
    const hall = HALLS[String(b.hallId)] || { name: 'Hall ' + b.hallId, capacity: '' };
    const status = b.status || 'Pending';
    const statusClass = status === 'Approved' ? 'approved' : (status === 'Rejected' ? 'rejected' : 'pending');
    const eventNameHtml = b.eventName
      ? `<div style="font-size:0.85rem;color:#FF7034;font-weight:600;margin-top:2px;">${escapeHtml(b.eventName)}</div>`
      : '';
    const capacityText = b.participants ? `${b.participants} pax` : (hall.capacity || 'N/A');

    if (isHistory) {
      const startLabel = schedule.startTimeText || '—';
      const endLabel = schedule.endTimeText || '—';
      return `
        <div class="booking-item history-item status-${statusClass}" id="history-${b._id}">
          <div class="booking-item-header">
            <div>
              <div class="booking-item-title">${escapeHtml(hall.name)}</div>
              ${eventNameHtml}
            </div>
            <div class="booking-status ${statusClass}">${escapeHtml(status)}</div>
          </div>
          <div class="booking-item-details">
            <div class="detail-row"><i data-lucide="calendar"></i><span>${formatDate(b.date)}</span></div>
            <div class="detail-row"><i data-lucide="clock-3"></i><span>Start: ${escapeHtml(startLabel)}</span></div>
            <div class="detail-row"><i data-lucide="clock"></i><span>End: ${escapeHtml(endLabel)}</span></div>
            <div class="detail-row"><i data-lucide="users"></i><span>${escapeHtml(capacityText)}</span></div>
            ${b.eventName ? `<div class="detail-row"><i data-lucide="bookmark"></i><span>Purpose: ${escapeHtml(b.eventName)}</span></div>` : ''}
          </div>
        </div>`;
    }

    return `
      <div class="booking-item status-${statusClass}" id="booking-${b._id}">
        <div class="booking-item-header">
          <div>
            <div class="booking-item-title">${escapeHtml(hall.name)}</div>
            ${eventNameHtml}
          </div>
          <div class="booking-status ${statusClass}">${escapeHtml(status)}</div>
        </div>
        <div class="booking-item-details">
          <div class="detail-row"><i data-lucide="users"></i><span>${escapeHtml(capacityText)}</span></div>
          <div class="detail-row"><i data-lucide="calendar"></i><span>${formatDate(b.date)}</span></div>
          <div class="detail-row"><i data-lucide="clock"></i><span>${escapeHtml(b.time || '')}</span></div>
        </div>
        <button class="cancel-btn" onclick="deleteBooking('${b._id}')" id="del-${b._id}">
          🗑️ Cancel Booking
        </button>
      </div>`;
  }

  function renderBookings(bookings) {
    const now = new Date();
    const upcoming = [];
    const history = [];

    bookings.forEach(b => {
      const schedule = getBookingSchedule(b, now);
      const status = b.status || 'Pending';
      const isInactive = status === 'Cancelled' || status === 'Rejected';
      if (schedule.isPast || isInactive) {
        history.push({ booking: b, schedule });
      } else {
        upcoming.push({ booking: b, schedule });
      }
    });

    upcoming.sort((a, b) =>
      String(a.booking.date || '').localeCompare(String(b.booking.date || '')) ||
      a.schedule.startMin - b.schedule.startMin
    );

    history.sort((a, b) =>
      String(b.booking.date || '').localeCompare(String(a.booking.date || '')) ||
      b.schedule.endMin - a.schedule.endMin
    );

    bookingCountBadge.textContent = upcoming.length;
    if (upcoming.length === 0) {
      bookingsContainer.innerHTML = '';
      emptyState.classList.add('visible');
    } else {
      emptyState.classList.remove('visible');
      bookingsContainer.innerHTML = upcoming
        .map(({ booking, schedule }) => renderBookingCard(booking, schedule, false))
        .join('');
    }

    if (historyTbody && historyTableWrap && historyEmptyState) {
      if (pdHistoryCount) pdHistoryCount.textContent = history.length;
      if (history.length === 0) {
        historyTbody.innerHTML = '';
        historyTableWrap.style.display = 'none';
        historyEmptyState.classList.add('visible');
      } else {
        historyTableWrap.style.display = 'block';
        historyEmptyState.classList.remove('visible');
        historyTbody.innerHTML = history.map(({ booking: b, schedule }) => {
          const hall = HALLS[String(b.hallId)] || { name: 'Hall ' + b.hallId, capacity: '' };
          const status = b.status || 'Pending';
          const statusClass = status === 'Approved' ? 'approved'
            : (status === 'Rejected' ? 'rejected'
            : (status === 'Cancelled' ? 'cancelled' : 'pending'));
          const purpose = b.eventName ? escapeHtml(b.eventName) : '—';
          const pax = b.participants ? `${b.participants}` : (hall.capacity || '—');
          const timeRange = (schedule.startTimeText && schedule.endTimeText)
            ? `${escapeHtml(schedule.startTimeText)} – ${escapeHtml(schedule.endTimeText)}`
            : escapeHtml(b.time || '—');
          return `
            <tr id="history-${b._id}">
              <td style="font-weight:600;">${escapeHtml(hall.name)}</td>
              <td>${purpose}</td>
              <td style="white-space:nowrap;">${formatDate(b.date)}</td>
              <td style="white-space:nowrap;">${timeRange}</td>
              <td>${escapeHtml(pax)}</td>
              <td><span class="booking-status ${statusClass}">${escapeHtml(status)}</span></td>
            </tr>`;
        }).join('');
      }
    }

    lucide.createIcons();
  }

  // ══════════════════════════════════════════════════════════════
  //  DELETE BOOKING
  // ══════════════════════════════════════════════════════════════
  window.deleteBooking = async function(id) {
    const btn = document.getElementById(`del-${id}`);
    if (btn) { btn.disabled = true; btn.textContent = 'Cancelling...'; }

    try {
      const res  = await fetch(`/bookings/${id}/cancel`, { method: 'PATCH' });
      const data = await res.json();

      if (data.success) {
        showToast('Cancelled', 'Booking cancelled and moved to history.', 'success');
        const card = document.getElementById(`booking-${id}`);
        if (card) {
          card.style.transition = 'opacity 0.3s, transform 0.3s';
          card.style.opacity    = '0';
          card.style.transform  = 'scale(0.95)';
          setTimeout(async () => { await loadBookings(); updateHeroCards(); }, 320);
        } else {
          await loadBookings(); updateHeroCards();
        }
      } else {
        showToast('Error', data.message || 'Could not cancel.', 'error');
        if (btn) { btn.disabled = false; btn.textContent = '🗑️ Cancel Booking'; }
      }
    } catch {
      showToast('Error', 'Server error.', 'error');
      if (btn) { btn.disabled = false; btn.textContent = '🗑️ Cancel Booking'; }
    }
  };

  // ══════════════════════════════════════════════════════════════
  //  HELPERS
  // ══════════════════════════════════════════════════════════════
  function formatDate(dateStr) {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', {
      weekday: 'short', year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  function showToast(title, message, type = 'success') {
    const c    = document.getElementById('toast-container');
    const t    = document.createElement('div');
    t.className = `toast ${type}`;
    const icon  = type === 'success' ? 'check-circle' : 'alert-circle';
    t.innerHTML = `
      <div style="color:var(--${type === 'success' ? 'success' : 'error'});flex-shrink:0"><i data-lucide="${icon}"></i></div>
      <div class="toast-content"><h4>${title}</h4><p>${message}</p></div>`;
    c.appendChild(t);
    lucide.createIcons();
    setTimeout(() => t.classList.add('show'), 10);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 350); }, 4500);
  }

  // ══════════════════════════════════════════════════════════════
  //  BOOT
  // ══════════════════════════════════════════════════════════════
  loadBookings();
  updateHeroCards();
  setInterval(() => { loadBookings(); updateHeroCards(); }, 10000);
});
