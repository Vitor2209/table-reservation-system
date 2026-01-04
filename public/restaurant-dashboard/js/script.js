// ========================================
// Restaurant Reservation Dashboard (Vanilla JS)
// Connected to a Node.js API (no deps)
// ========================================

/** API helpers */
async function apiGet(url) {
  const res = await fetch(url, { headers: { "Accept": "application/json" } });
  if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`);
  return res.json();
}
async function apiSend(url, method, body) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.message || data?.error || `${method} ${url} failed`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}
const apiPost = (u, b) => apiSend(u, "POST", b);
const apiPut = (u, b) => apiSend(u, "PUT", b);
const apiDelete = (u) => apiSend(u, "DELETE", {});

// ========================================
// State
// ========================================
let settings = null;
let closed = null;
let reservations = [];
let currentFilter = "waiting";
let currentWeekStart = getMonday(new Date());

// Drag & drop state
let draggingReservationId = null;

// ========================================
// DOM Elements
// ========================================
const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");
const sidebarClose = document.getElementById("sidebarClose");
const hamburgerBtn = document.getElementById("hamburgerBtn");

const calendarGrid = document.getElementById("calendarGrid");
const weekLabel = document.getElementById("weekLabel");
const prevWeekBtn = document.getElementById("prevWeek");
const nextWeekBtn = document.getElementById("nextWeek");

const filterTabs = document.querySelectorAll(".filter-tab");

const newReservationBtn = document.getElementById("addReservationBtn");
const reservationModal = document.getElementById("reservationModal");
const reservationForm = document.getElementById("reservationForm");
const closeModalBtn = document.getElementById("closeModal");
const cancelModalBtn = document.getElementById("cancelBtn");
const deleteReservationBtn = document.getElementById("deleteReservationBtn");

const reservationIdInput = document.getElementById("reservationId");
const customerNameInput = document.getElementById("customerName");
const customerPhoneInput = document.getElementById("customerPhone");
const reservationDateInput = document.getElementById("reservationDate");
const reservationTimeInput = document.getElementById("reservationTime");
const guestCountInput = document.getElementById("guestCount");
const reservationStatusSelect = document.getElementById("reservationStatus");
const reservationNotesInput = document.getElementById("notes");

const toast = document.getElementById("toast");
const toastMessage = document.getElementById("toastMessage");

// Top buttons
const previewBtn = document.getElementById("previewBtn");
const helpBtn = document.getElementById("helpBtn");

// Extra modals
const previewModal = document.getElementById("previewModal");
const previewBody = document.getElementById("previewBody");
const printPreviewBtn = document.getElementById("printPreviewBtn");

const helpModal = document.getElementById("helpModal");
const helpRestaurant = document.getElementById("helpRestaurant");
const helpWhatsApp = document.getElementById("helpWhatsApp");
const openWhatsAppBtn = document.getElementById("openWhatsAppBtn");

// Drawers
const historyDrawer = document.getElementById("historyDrawer");
const closedDrawer = document.getElementById("closedDrawer");
const settingsDrawer = document.getElementById("settingsDrawer");

const historySearch = document.getElementById("historySearch");
const historyStatus = document.getElementById("historyStatus");
const historyTableBody = document.querySelector("#historyTable tbody");

const openHourInput = document.getElementById("openHour");
const closeHourInput = document.getElementById("closeHour");
const weeklyClosedGrid = document.getElementById("weeklyClosedGrid");
const closedDateInput = document.getElementById("closedDateInput");
const addClosedDateBtn = document.getElementById("addClosedDateBtn");
const closedDatesChips = document.getElementById("closedDatesChips");
const saveClosedBtn = document.getElementById("saveClosedBtn");

const restaurantNameInput = document.getElementById("restaurantName");
const supportWhatsAppInput = document.getElementById("supportWhatsApp");
const supportMessageInput = document.getElementById("supportMessage");
const saveSettingsBtn = document.getElementById("saveSettingsBtn");

// Sidebar nav items
const navItems = document.querySelectorAll(".nav-item");

// ========================================
// Utilities
// ========================================
function showToast(message, type = "success") {
  toast.classList.remove("error");
  if (type === "error") toast.classList.add("error");
  toastMessage.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3000);
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toISODate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseISODate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0..6 (Sun..Sat)
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatWeekLabel(weekStart) {
  const weekEnd = addDays(weekStart, 6);
  const options = { month: "short", day: "numeric" };
  const a = weekStart.toLocaleDateString("en-GB", options);
  const b = weekEnd.toLocaleDateString("en-GB", options);
  return `${a} - ${b}`;
}

function timeToMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function minutesToTime(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${pad2(h)}:${pad2(m)}`;
}
function formatTimeLabel(t) {
  // 24h -> 12h label like 3:00 PM
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}:${pad2(m)} ${ampm}`;
}

function normalizePhoneToWa(phone) {
  // remove everything except digits
  const digits = String(phone || "").replace(/[^\d]/g, "");
  return digits;
}

function dayKeyFromISO(isoDate) {
  // isoDate: YYYY-MM-DD -> monday|tuesday|...
  const d = parseISODate(isoDate);
  const map = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  return map[d.getDay()];
}

function isDateClosed(isoDate) {
  const list = Array.isArray(closed?.closedDates) ? closed.closedDates : [];
  if (list.includes(isoDate)) return true;
  const key = dayKeyFromISO(isoDate);
  return Boolean(closed?.weeklyClosed?.[key]);
}

function isSlotClosed(isoDate, time) {
  // Day closure
  if (isDateClosed(isoDate)) return true;
  // Outside opening/closing (defensive)
  const open = settings?.openingHour || "11:00";
  const close = settings?.closingHour || "23:00";
  const m = timeToMinutes(time);
  return m < timeToMinutes(open) || m > timeToMinutes(close);
}

function openModal(modalEl) {
  modalEl.classList.add("active");
}
function closeModal(modalEl) {
  modalEl.classList.remove("active");
}
function openDrawer(drawerEl) {
  drawerEl.classList.add("open");
}
function closeDrawer(drawerEl) {
  drawerEl.classList.remove("open");
}

function closeAllDrawers() {
  [historyDrawer, closedDrawer, settingsDrawer].forEach((d) => {
    if (d) d.classList.remove("open");
  });
}

function buildTimeOptions({ dateIso, selected } = {}) {
  const open = settings?.openingHour || "11:00";
  const close = settings?.closingHour || "23:00";
  const step = 30; // minutes

  // reset options
  reservationTimeInput.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Select time";
  reservationTimeInput.appendChild(placeholder);

  const startM = timeToMinutes(open);
  const endM = timeToMinutes(close);
  for (let m = startM; m <= endM; m += step) {
    const t = minutesToTime(m);
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = formatTimeLabel(t);
    if (dateIso && isSlotClosed(dateIso, t)) {
      opt.disabled = true;
      opt.textContent += " (Closed)";
    }
    if (selected && selected === t) opt.selected = true;
    reservationTimeInput.appendChild(opt);
  }

  // If nothing selected, try to auto-select first non-disabled option
  if (!reservationTimeInput.value) {
    const firstOk = Array.from(reservationTimeInput.options).find((o) => o.value && !o.disabled);
    if (firstOk) reservationTimeInput.value = firstOk.value;
  }
}

// ========================================
// Data loading
// ========================================
async function loadAll() {
  try {
    settings = await apiGet("/api/settings");
    closed = await apiGet("/api/closed");

    // Apply hours to UI (Closed drawer)
    openHourInput.value = settings.openingHour || "11:00";
    closeHourInput.value = settings.closingHour || "23:00";

    restaurantNameInput.value = settings.restaurantName || "";
    supportWhatsAppInput.value = settings.supportWhatsApp || "";
    supportMessageInput.value = settings.supportMessage || "";

    // Help modal display
    helpRestaurant.textContent = settings.restaurantName || "—";
    helpWhatsApp.textContent = settings.supportWhatsApp || "—";

    // Build time dropdown options based on opening/closing hours
    buildTimeOptions({ dateIso: toISODate(new Date()) });

    renderWeeklyClosed();
    renderClosedDates();

    await loadReservationsForCurrentWeek();
    render();
  } catch (e) {
    console.error(e);
    showToast(
      "Backend not reachable. Start with: npm install && npm start",
      "error"
    );
    // Still render empty UI so user sees something
    settings = settings || {
      restaurantName: "Restaurant",
      supportWhatsApp: "+447700900123",
      supportMessage: "Hi! I need help.",
      openingHour: "11:00",
      closingHour: "23:00",
      slotMinutes: 30,
    };
    closed = closed || { closedDates: [], weeklyClosed: {} };
    reservations = [];
    render();
  }
}

async function loadReservationsForCurrentWeek() {
  const from = toISODate(currentWeekStart);
  const to = toISODate(addDays(currentWeekStart, 6));
  // Load all statuses; filter in UI
  reservations = await apiGet(`/api/reservations?from=${from}&to=${to}&status=all`);
}

// ========================================
// Calendar rendering
// ========================================
function buildTimeSlots() {
  const open = settings?.openingHour || "11:00";
  const close = settings?.closingHour || "23:00";
  const step = Number(settings?.slotMinutes || 30);

  const startMin = timeToMinutes(open);
  const endMin = timeToMinutes(close);

  const slots = [];
  for (let m = startMin; m <= endMin; m += step) {
    slots.push(minutesToTime(m));
  }
  return slots;
}

function getWeekDays(weekStart) {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

function render() {
  weekLabel.textContent = formatWeekLabel(currentWeekStart);
  renderCalendar();
}

function renderCalendar() {
  const weekDays = getWeekDays(currentWeekStart);
  const timeSlots = buildTimeSlots();

  // clear grid
  calendarGrid.innerHTML = "";

  // Header row: first cell empty, then 7 days
  const emptyHeader = document.createElement("div");
  emptyHeader.className = "calendar-header";
  emptyHeader.textContent = "";
  calendarGrid.appendChild(emptyHeader);

  weekDays.forEach((d) => {
    const header = document.createElement("div");
    header.className = "calendar-header";
    const dayName = d.toLocaleDateString("en-GB", { weekday: "short" });
    const dayNum = d.getDate();
    header.innerHTML = `<div class="day-name">${dayName}</div><div class="day-date">${dayNum}</div>`;
    calendarGrid.appendChild(header);
  });

  // Data rows
  timeSlots.forEach((t) => {
    const timeLabel = document.createElement("div");
    timeLabel.className = "time-slot";
    timeLabel.textContent = formatTimeLabel(t);
    calendarGrid.appendChild(timeLabel);

    weekDays.forEach((d) => {
      const iso = toISODate(d);

      const cell = document.createElement("div");
      cell.className = "calendar-cell";
      cell.dataset.date = iso;
      cell.dataset.time = t;

      // Mark closed slots
      const closedSlot = isSlotClosed(iso, t);
      if (closedSlot) cell.classList.add("is-closed");

      // Drag & drop handlers
      cell.addEventListener("dragover", (ev) => {
        if (!draggingReservationId) return;
        if (cell.classList.contains("is-closed")) return;
        ev.preventDefault(); // allow drop
        cell.classList.add("drop-target");
      });
      cell.addEventListener("dragleave", () => cell.classList.remove("drop-target"));
      cell.addEventListener("drop", async (ev) => {
        ev.preventDefault();
        cell.classList.remove("drop-target");
        const id = ev.dataTransfer?.getData("text/reservation-id") || draggingReservationId;
        if (!id) return;
        if (cell.classList.contains("is-closed")) {
          showToast("This slot is closed ⛔", "error");
          return;
        }
        await moveReservationToSlot(id, iso, t);
      });

      cell.addEventListener("click", (ev) => {
        // avoid open modal when clicking a card (card has stopPropagation)
        if (cell.classList.contains("is-closed")) {
          showToast("Closed time slot ⛔", "error");
          return;
        }
        openReservationModal({ mode: "create", date: iso, time: t });
      });

      // add reservations for this cell
      const cellReservations = reservations
        .filter((r) => r.date === iso && r.time === t)
        .filter((r) => currentFilter === "all" ? true : r.status === currentFilter);

      cellReservations.forEach((r) => {
        const card = buildReservationCard(r);
        cell.appendChild(card);
      });

      calendarGrid.appendChild(cell);
    });
  });
}

async function moveReservationToSlot(id, newDate, newTime) {
  const r = reservations.find((x) => x.id === id) || (window.__allReservations || []).find((x) => x.id === id);
  if (!r) return;

  // No-op
  if (r.date === newDate && r.time === newTime) return;

  // Prevent moving into closed dates
  if (isSlotClosed(newDate, newTime)) {
    showToast("This slot is closed ⛔", "error");
    return;
  }

  try {
    const updated = await apiPut(`/api/reservations/${encodeURIComponent(id)}`, {
      ...r,
      date: newDate,
      time: newTime,
    });

    // Update local state
    const idx = reservations.findIndex((x) => x.id === id);
    if (idx >= 0) reservations[idx] = updated;
    if (window.__allReservations) {
      const a = window.__allReservations.findIndex((x) => x.id === id);
      if (a >= 0) window.__allReservations[a] = updated;
    }

    showToast("Reservation moved ✅");
    renderCalendar();
    renderHistoryTable();
  } catch (err) {
    console.error(err);
    if (err.status === 409 && err.data?.error === "slot_closed") {
      showToast("This slot is closed ⛔", "error");
    } else if (err.status === 409) {
      showToast("Time slot already taken ⚠️", "error");
    } else {
      showToast("Failed to move reservation", "error");
    }
  }
}

function buildReservationCard(r) {
  const card = document.createElement("div");
  card.className = `reservation-card status-${r.status}`;
  card.setAttribute("draggable", "true");
  card.dataset.reservationId = r.id;
  card.innerHTML = `
    <div class="reservation-name">${escapeHtml(r.name)}</div>
    <div class="reservation-id">${escapeHtml(r.phone || "")}</div>
    <div class="reservation-guests">${Number(r.guests)} guests • <span class="badge badge-${r.status}">${r.status}</span></div>
  `;

  card.addEventListener("dragstart", (ev) => {
    draggingReservationId = r.id;
    card.classList.add("is-dragging");
    ev.dataTransfer?.setData("text/reservation-id", r.id);
    ev.dataTransfer?.setData("text/plain", r.id);
    ev.dataTransfer && (ev.dataTransfer.effectAllowed = "move");
  });
  card.addEventListener("dragend", () => {
    draggingReservationId = null;
    card.classList.remove("is-dragging");
    document.querySelectorAll(".calendar-cell.drop-target").forEach((el) => el.classList.remove("drop-target"));
  });

  card.addEventListener("click", (ev) => {
    ev.stopPropagation();
    openReservationModal({ mode: "edit", reservation: r });
  });

  return card;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ========================================
// Reservation modal (create/edit/delete)
// ========================================
function openReservationModal({ mode, date, time, reservation }) {
  const isEdit = mode === "edit";
  reservationIdInput.value = isEdit ? reservation.id : "";
  document.querySelector("#reservationModal .modal-header h2").textContent = isEdit ? "Edit Reservation" : "New Reservation";
  reservationForm.querySelector('button[type="submit"]').textContent = isEdit ? "Save Changes" : "Create Reservation";

  deleteReservationBtn.style.display = isEdit ? "inline-flex" : "none";

  if (isEdit) {
    // Rebuild times for the selected date so the dropdown is always populated
    buildTimeOptions({ dateIso: reservation.date || toISODate(new Date()), selected: reservation.time });
    customerNameInput.value = reservation.name || "";
    customerPhoneInput.value = reservation.phone || "";
    reservationDateInput.value = reservation.date || "";
    reservationTimeInput.value = reservation.time || "";
    guestCountInput.value = reservation.guests || 2;
    reservationStatusSelect.value = reservation.status || "waiting";
    reservationNotesInput.value = reservation.notes || "";
  } else {
    reservationForm.reset();
    customerNameInput.value = "";
    customerPhoneInput.value = "";
    reservationDateInput.value = date || toISODate(new Date());
    // Ensure time options exist for the chosen date
    const chosenDate = reservationDateInput.value;
    buildTimeOptions({ dateIso: chosenDate, selected: time || (settings?.openingHour || "11:00") });
    reservationTimeInput.value = time || (settings?.openingHour || "11:00");
    guestCountInput.value = 2;
    reservationStatusSelect.value = "waiting";
    reservationNotesInput.value = "";
  }

  openModal(reservationModal);
}

async function handleReservationSubmit(e) {
  e.preventDefault();

  const payload = {
    id: reservationIdInput.value || undefined,
    name: customerNameInput.value.trim(),
    phone: customerPhoneInput.value.trim(),
    date: reservationDateInput.value,
    time: reservationTimeInput.value,
    guests: Number(guestCountInput.value),
    status: reservationStatusSelect.value,
    notes: reservationNotesInput.value.trim(),
  };

  // Prevent creating/updating into closed slots
  if (isSlotClosed(payload.date, payload.time)) {
    showToast("This slot is closed ⛔", "error");
    return;
  }

  try {
    if (payload.id) {
      const updated = await apiPut(`/api/reservations/${encodeURIComponent(payload.id)}`, payload);
      // update local state
      const idx = reservations.findIndex((r) => r.id === updated.id);
      if (idx >= 0) reservations[idx] = updated;
      showToast("Reservation updated ✅");
    } else {
      const created = await apiPost("/api/reservations", payload);
      reservations.push(created);
      showToast("Reservation created ✅");
    }

    closeModal(reservationModal);
    renderCalendar();
    renderHistoryTable();
  } catch (err) {
    console.error(err);
    if (err.status === 409 && err.data?.error === "slot_closed") {
      showToast("This slot is closed ⛔", "error");
    } else if (err.status === 409) {
      showToast("Time slot already taken ⚠️", "error");
    } else {
      showToast(err.message || "Failed to save reservation", "error");
    }
  }
}

async function handleDeleteReservation() {
  const id = reservationIdInput.value;
  if (!id) return;

  const ok = confirm("Delete this reservation?");
  if (!ok) return;

  try {
    await apiDelete(`/api/reservations/${encodeURIComponent(id)}`);
    reservations = reservations.filter((r) => r.id !== id);
    closeModal(reservationModal);
    renderCalendar();
    renderHistoryTable();
    showToast("Reservation deleted 🗑️");
  } catch (err) {
    console.error(err);
    showToast("Failed to delete reservation", "error");
  }
}

// ========================================
// History drawer
// ========================================
function renderHistoryTable() {
  if (!historyTableBody) return;

  const q = (historySearch?.value || "").trim().toLowerCase();
  const st = historyStatus?.value || "all";

  // show all (not only current week) - load fresh when opening drawer
  const rows = (window.__allReservations || reservations)
    .filter((r) => (st === "all" ? true : r.status === st))
    .filter((r) => {
      if (!q) return true;
      const hay = `${r.name} ${r.phone} ${r.date} ${r.time}`.toLowerCase();
      return hay.includes(q);
    })
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  historyTableBody.innerHTML = "";
  rows.forEach((r) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(r.date)}</td>
      <td>${escapeHtml(r.time)}</td>
      <td>${escapeHtml(r.name)}</td>
      <td>${escapeHtml(r.phone || "")}</td>
      <td>${Number(r.guests)}</td>
      <td><span class="badge badge-${r.status}">${r.status}</span></td>
      <td><button class="btn btn-outline btn-sm" data-edit="${escapeHtml(r.id)}">Edit</button></td>
    `;
    historyTableBody.appendChild(tr);
  });

  historyTableBody.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-edit");
      const r = (window.__allReservations || reservations).find((x) => x.id === id);
      if (r) openReservationModal({ mode: "edit", reservation: r });
    });
  });
}

async function openHistoryDrawer() {
  try {
    window.__allReservations = await apiGet("/api/reservations?status=all");
  } catch {
    window.__allReservations = reservations;
  }
  renderHistoryTable();
  openDrawer(historyDrawer);
}

// ========================================
// Closed days/hours drawer
// ========================================
function renderWeeklyClosed() {
  const days = [
    ["monday", "Monday"],
    ["tuesday", "Tuesday"],
    ["wednesday", "Wednesday"],
    ["thursday", "Thursday"],
    ["friday", "Friday"],
    ["saturday", "Saturday"],
    ["sunday", "Sunday"],
  ];
  weeklyClosedGrid.innerHTML = "";
  days.forEach(([key, label]) => {
    const item = document.createElement("div");
    item.className = "weekly-item";
    const checked = Boolean(closed?.weeklyClosed?.[key]);
    item.innerHTML = `
      <span>${label}</span>
      <input type="checkbox" data-weekly="${key}" ${checked ? "checked" : ""} />
    `;
    weeklyClosedGrid.appendChild(item);
  });
}

function renderClosedDates() {
  const list = Array.isArray(closed?.closedDates) ? closed.closedDates : [];
  closedDatesChips.innerHTML = "";
  list.sort().forEach((d) => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.innerHTML = `<span>${escapeHtml(d)}</span><button type="button" data-remove-date="${escapeHtml(d)}">✕</button>`;
    closedDatesChips.appendChild(chip);
  });

  closedDatesChips.querySelectorAll("[data-remove-date]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const d = btn.getAttribute("data-remove-date");
      closed.closedDates = (closed.closedDates || []).filter((x) => x !== d);
      renderClosedDates();
    });
  });
}

function openClosedDrawer() {
  openHourInput.value = settings.openingHour || "11:00";
  closeHourInput.value = settings.closingHour || "23:00";
  renderWeeklyClosed();
  renderClosedDates();
  openDrawer(closedDrawer);
}

addClosedDateBtn?.addEventListener("click", () => {
  const d = closedDateInput.value;
  if (!d) return;
  closed.closedDates = closed.closedDates || [];
  if (!closed.closedDates.includes(d)) closed.closedDates.push(d);
  closedDateInput.value = "";
  renderClosedDates();
});

saveClosedBtn?.addEventListener("click", async () => {
  const weekly = {};
  weeklyClosedGrid.querySelectorAll("[data-weekly]").forEach((cb) => {
    const key = cb.getAttribute("data-weekly");
    weekly[key] = cb.checked;
  });

  const nextClosed = {
    closedDates: closed.closedDates || [],
    weeklyClosed: weekly,
  };

  try {
    closed = await apiPut("/api/closed", nextClosed);
    // hours saved in settings
    settings = await apiPut("/api/settings", {
      openingHour: openHourInput.value || "11:00",
      closingHour: closeHourInput.value || "23:00",
    });
    showToast("Closed days & hours saved ✅");
    closeDrawer(closedDrawer);
    renderCalendar();
  } catch (err) {
    console.error(err);
    showToast("Failed to save closed days/hours", "error");
  }
});

// ========================================
// Settings drawer
// ========================================
function openSettingsDrawer() {
  restaurantNameInput.value = settings.restaurantName || "";
  supportWhatsAppInput.value = settings.supportWhatsApp || "";
  supportMessageInput.value = settings.supportMessage || "";
  openDrawer(settingsDrawer);
}

saveSettingsBtn?.addEventListener("click", async () => {
  try {
    settings = await apiPut("/api/settings", {
      restaurantName: restaurantNameInput.value.trim(),
      supportWhatsApp: supportWhatsAppInput.value.trim(),
      supportMessage: supportMessageInput.value.trim(),
    });
    helpRestaurant.textContent = settings.restaurantName || "—";
    helpWhatsApp.textContent = settings.supportWhatsApp || "—";
    showToast("Settings saved ✅");
    closeDrawer(settingsDrawer);
  } catch (err) {
    console.error(err);
    showToast("Failed to save settings", "error");
  }
});

// ========================================
// Preview & Help
// ========================================
function openPreview() {
  const weekDays = getWeekDays(currentWeekStart);
  const from = toISODate(currentWeekStart);
  const to = toISODate(addDays(currentWeekStart, 6));

  const list = reservations
    .filter((r) => r.date >= from && r.date <= to)
    .slice()
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  const counts = {
    waiting: list.filter((r) => r.status === "waiting").length,
    confirmed: list.filter((r) => r.status === "confirmed").length,
    cancelled: list.filter((r) => r.status === "cancelled").length,
  };

  const html = `
    <div class="preview-summary">
      <p><strong>${escapeHtml(settings.restaurantName || "Restaurant")}</strong></p>
      <p>Week: <strong>${escapeHtml(formatWeekLabel(currentWeekStart))}</strong></p>
      <div class="chips">
        <span class="chip">Waiting: ${counts.waiting}</span>
        <span class="chip">Confirmed: ${counts.confirmed}</span>
        <span class="chip">Cancelled: ${counts.cancelled}</span>
      </div>
      <hr style="border:0;border-top:1px solid rgba(255,255,255,.08);margin:14px 0;">
      ${weekDays
        .map((d) => {
          const iso = toISODate(d);
          const items = list.filter((r) => r.date === iso);
          const title = d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" });
          if (!items.length) return `<div style="margin-bottom:12px"><strong>${title}</strong><div class="muted small">No reservations</div></div>`;
          return `
            <div style="margin-bottom:12px">
              <strong>${title}</strong>
              <div style="margin-top:8px;display:flex;flex-direction:column;gap:8px">
                ${items
                  .map(
                    (r) => `
                    <div class="help-card">
                      <div style="display:flex;justify-content:space-between;gap:12px">
                        <div><strong>${escapeHtml(r.time)}</strong> • ${escapeHtml(r.name)}</div>
                        <div><span class="badge badge-${r.status}">${r.status}</span></div>
                      </div>
                      <div class="muted small">${escapeHtml(r.phone || "")} • ${Number(r.guests)} guests</div>
                      ${r.notes ? `<div class="muted small">Notes: ${escapeHtml(r.notes)}</div>` : ""}
                    </div>
                  `
                  )
                  .join("")}
              </div>
            </div>
          `;
        })
        .join("")}
    </div>
  `;

  previewBody.innerHTML = html;
  openModal(previewModal);
}

function printPreview() {
  const w = window.open("", "_blank");
  if (!w) return;

  w.document.write(`
    <html>
      <head>
        <title>Reservations Preview</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          body{font-family:Arial,Helvetica,sans-serif;padding:18px;}
          h1,h2,h3{margin:0 0 10px;}
          .muted{color:#555;}
          .card{border:1px solid #ddd;border-radius:10px;padding:10px;margin:8px 0;}
          .row{display:flex;justify-content:space-between;gap:12px;}
          .badge{padding:2px 8px;border-radius:999px;font-size:12px;border:1px solid #ddd;}
        </style>
      </head>
      <body>
        ${previewBody.innerHTML}
        <script>window.onload=()=>window.print();</script>
      </body>
    </html>
  `);
  w.document.close();
}

function openHelp() {
  helpRestaurant.textContent = settings?.restaurantName || "—";
  helpWhatsApp.textContent = settings?.supportWhatsApp || "—";
  openModal(helpModal);
}

function openWhatsAppSupport() {
  const phoneDigits = normalizePhoneToWa(settings?.supportWhatsApp || "");
  const msg = encodeURIComponent(settings?.supportMessage || "Hi! I need help.");
  if (!phoneDigits) {
    showToast("Support WhatsApp not set in Settings", "error");
    return;
  }
  window.open(`https://wa.me/${phoneDigits}?text=${msg}`, "_blank");
}

// ========================================
// Event listeners
// ========================================
// Sidebar mobile
hamburgerBtn?.addEventListener("click", () => {
  sidebar.classList.add("open");
  sidebarOverlay.classList.add("active");
});
sidebarClose?.addEventListener("click", () => {
  sidebar.classList.remove("open");
  sidebarOverlay.classList.remove("active");
});
sidebarOverlay?.addEventListener("click", () => {
  sidebar.classList.remove("open");
  sidebarOverlay.classList.remove("active");
});

// Week navigation
prevWeekBtn?.addEventListener("click", async () => {
  currentWeekStart = addDays(currentWeekStart, -7);
  await loadReservationsForCurrentWeek().catch(() => {});
  render();
});
nextWeekBtn?.addEventListener("click", async () => {
  currentWeekStart = addDays(currentWeekStart, 7);
  await loadReservationsForCurrentWeek().catch(() => {});
  render();
});

// Filters
filterTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    filterTabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    currentFilter = tab.dataset.status;
    renderCalendar();
  });
});

// Create button
newReservationBtn?.addEventListener("click", () => {
  openReservationModal({ mode: "create" });
});

// Modal close
closeModalBtn?.addEventListener("click", () => closeModal(reservationModal));
cancelModalBtn?.addEventListener("click", () => closeModal(reservationModal));

// Clicking overlays that have data-close
document.addEventListener("click", (e) => {
  const target = e.target;
  if (!(target instanceof HTMLElement)) return;
  const closeId = target.getAttribute("data-close");
  if (!closeId) return;
  const el = document.getElementById(closeId);
  if (!el) return;
  if (el.classList.contains("modal")) closeModal(el);
  if (el.classList.contains("drawer")) closeDrawer(el);
});

// Reservation form submit
reservationForm?.addEventListener("submit", handleReservationSubmit);
deleteReservationBtn?.addEventListener("click", handleDeleteReservation);

// Rebuild available times whenever the date changes
reservationDateInput?.addEventListener("change", () => {
  const d = reservationDateInput.value || toISODate(new Date());
  const current = reservationTimeInput.value || undefined;
  buildTimeOptions({ dateIso: d, selected: current });
});

// Preview & Help
previewBtn?.addEventListener("click", openPreview);
printPreviewBtn?.addEventListener("click", printPreview);

helpBtn?.addEventListener("click", openHelp);
openWhatsAppBtn?.addEventListener("click", openWhatsAppSupport);

// Drawers close buttons
document.querySelectorAll(".drawer [data-close]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const id = btn.getAttribute("data-close");
    const el = document.getElementById(id);
    if (el) closeDrawer(el);
  });
});

// Sidebar navigation
navItems.forEach((item) => {
  item.addEventListener("click", async (e) => {
    e.preventDefault();
    navItems.forEach((n) => n.classList.remove("active"));
    item.classList.add("active");

    const page = item.dataset.page;

    // Always close any open drawers when switching sections
    closeAllDrawers();

    // Close sidebar on mobile
    sidebar.classList.remove("open");
    sidebarOverlay.classList.remove("active");

    if (page === "reservations" || page === "calendar") {
      // just stay on main page
      // no toast needed, just ensure drawers are closed
      return;
    }
    if (page === "history") {
      await openHistoryDrawer();
      return;
    }
    if (page === "closed") {
      openClosedDrawer();
      return;
    }
    if (page === "settings") {
      openSettingsDrawer();
      return;
    }
  });
});

// History table search/filter
historySearch?.addEventListener("input", renderHistoryTable);
historyStatus?.addEventListener("change", renderHistoryTable);

// Init
loadAll();
