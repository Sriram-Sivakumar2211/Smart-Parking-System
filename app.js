// ─── DATA ───────────────────────────────────────────────────────────────────
const FLOORS = [
  { name: 'Ground', zones: ['A','B','C','D'] },
  { name: 'Floor 1', zones: ['E','F','G'] },
  { name: 'Floor 2', zones: ['H','I'] },
];

const RATES = { Car:50, Bike:20, Truck:80, EV:40 };

// slot states: free, occupied, reserved, disabled
let slots = {}; // key = `${floor}-${id}`
let selectedSlot = null;
let currentFloor = 0;
let bookings = [];

function initSlots() {
  [0,1,2].forEach(f => {
    for (let i = 1; i <= 30; i++) {
      const r = Math.random();
      let state = r < 0.45 ? 'free' : r < 0.80 ? 'occupied' : r < 0.93 ? 'reserved' : 'disabled';
      slots[`${f}-${i}`] = {
        id: i, floor: f,
        state,
        label: `${FLOORS[f].zones[Math.floor((i-1)/8)]}${String(i).padStart(2,'0')}`,
        vehicle: state==='occupied' ? randomVehicle() : null,
        since: state==='occupied' ? `${Math.floor(Math.random()*180)+1}min ago` : null,
      };
    }
  });
}

function randomVehicle() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const st = ['TN','MH','KA','DL','AP'];
  return `${st[Math.floor(Math.random()*st.length)]} ${String(Math.floor(Math.random()*99)).padStart(2,'0')} ${letters[Math.floor(Math.random()*26)]}${letters[Math.floor(Math.random()*26)]} ${String(Math.floor(Math.random()*9000)+1000)}`;
}

function getFloorStats(f) {
  const all = Object.values(slots).filter(s => s.floor === f);
  return {
    free: all.filter(s => s.state==='free').length,
    occ: all.filter(s => s.state==='occupied').length,
    res: all.filter(s => s.state==='reserved').length,
  };
}

function globalStats() {
  const all = Object.values(slots);
  return {
    free: all.filter(s=>s.state==='free').length,
    occ: all.filter(s=>s.state==='occupied').length,
    res: all.filter(s=>s.state==='reserved').length,
  };
}

// ─── RENDER GRID ────────────────────────────────────────────────────────────
function renderGrid(gridId, floor) {
  const grid = document.getElementById(gridId);
  if (!grid) return;
  grid.innerHTML = '';

  for (let i = 1; i <= 30; i++) {
    const key = `${floor}-${i}`;
    const s = slots[key];

    if (i === 11 || i === 21) {
      const road = document.createElement('div');
      road.className = 'road-strip';
      road.textContent = '— — — — LANE — — — —';
      grid.appendChild(road);
    }

    const el = document.createElement('div');
    el.className = `slot ${s.state}${selectedSlot===key?' selected':''}`;
    el.innerHTML = `<span class="slot-icon">${slotIcon(s)}</span><span class="slot-id">${s.label}</span>`;
    el.title = `${s.label} — ${s.state}`;
    el.onclick = () => clickSlot(key, gridId, floor);
    grid.appendChild(el);
  }
}

function slotIcon(s) {
  if (s.state==='free') return '🟢';
  if (s.state==='occupied') return '🚗';
  if (s.state==='reserved') return '🔒';
  return '⛔';
}

// ─── INTERACTIONS ────────────────────────────────────────────────────────────
function clickSlot(key, gridId, floor) {
  const s = slots[key];
  if (s.state === 'disabled') return;

  if (s.state === 'free') {
    selectedSlot = key;
    renderGrid(gridId, floor);
    const disp = document.getElementById('selectedSlotDisplay');
    if (disp) {
      disp.textContent = `${s.label} — ${FLOORS[floor].name}`;
      disp.classList.add('has-slot');
    }
    return;
  }

  // Show modal for occupied/reserved
  openSlotModal(key);
}

function openSlotModal(key) {
  const s = slots[key];
  document.getElementById('modalTitle').textContent = `Slot ${s.label}`;
  document.getElementById('modalSub').textContent = `${FLOORS[s.floor].name} · ${s.state.charAt(0).toUpperCase()+s.state.slice(1)}`;

  const grid = document.getElementById('slotInfoGrid');
  const actions = document.getElementById('modalActions');

  if (s.state === 'occupied') {
    grid.innerHTML = `
      <div class="slot-info-item"><div class="slot-info-label">Vehicle</div><div class="slot-info-value" style="font-size:12px">${s.vehicle}</div></div>
      <div class="slot-info-item"><div class="slot-info-label">Parked Since</div><div class="slot-info-value">${s.since}</div></div>
      <div class="slot-info-item"><div class="slot-info-label">Status</div><div class="slot-info-value" style="color:var(--red)">Occupied</div></div>
      <div class="slot-info-item"><div class="slot-info-label">Floor</div><div class="slot-info-value">${FLOORS[s.floor].name}</div></div>
    `;
    actions.innerHTML = `
      <button class="btn btn-ghost" onclick="closeModals()">Close</button>
      <button class="btn btn-primary" style="background:var(--red);color:#fff" onclick="checkOut('${key}')">Check Out 🚪</button>
    `;
  } else {
    grid.innerHTML = `
      <div class="slot-info-item"><div class="slot-info-label">Slot</div><div class="slot-info-value">${s.label}</div></div>
      <div class="slot-info-item"><div class="slot-info-label">Status</div><div class="slot-info-value" style="color:var(--yellow)">Reserved</div></div>
      <div class="slot-info-item"><div class="slot-info-label">Floor</div><div class="slot-info-value">${FLOORS[s.floor].name}</div></div>
      <div class="slot-info-item"><div class="slot-info-label">Action</div><div class="slot-info-value">Cancel reservation?</div></div>
    `;
    actions.innerHTML = `
      <button class="btn btn-ghost" onclick="closeModals()">Close</button>
      <button class="btn btn-primary" style="background:var(--yellow);color:#000" onclick="cancelReservation('${key}')">Cancel Reservation</button>
    `;
  }

  document.getElementById('slotModal').classList.add('open');
}

function checkOut(key) {
  const s = slots[key];
  addActivity(`Check-out: ${s.vehicle}`, `Slot ${s.label}`, 'red');
  addBookingRow(s.label, s.vehicle, 'Car', '120min', 'completed');
  s.state = 'free';
  s.vehicle = null;
  s.since = null;
  closeModals();
  rerenderAll();
  updateStats();
  showToast(`${s.label} is now free!`, 'success');
}

function cancelReservation(key) {
  const s = slots[key];
  s.state = 'free';
  closeModals();
  rerenderAll();
  updateStats();
  showToast(`Reservation for ${s.label} cancelled.`, 'warn');
}

function scheduleExpiry(key, vehicle, label, durMs) {
  setTimeout(() => {
    const s = slots[key];
    if (!s || s.state === 'free') return;
    s.state = 'free';
    s.vehicle = null;
    s.since = null;
    addActivity(`Expired: ${vehicle}`, `Slot ${label} is now free`, 'blue');
    rerenderAll();
    updateStats();
    showToast(`Slot ${label} booking expired — now available!`, 'warn');
  }, durMs);
}

function quickBook() {
  if (!selectedSlot) { showToast('Select a free slot first!', 'error'); return; }
  const vehicle = document.getElementById('qVehicle').value.trim();
  if (!vehicle) { showToast('Enter vehicle number!', 'error'); return; }
  const type = document.getElementById('qType').value;
  const dur = parseInt(document.getElementById('qDuration').value) || 120;
  const s = slots[selectedSlot];
  const key = selectedSlot;
  s.state = 'occupied';
  s.vehicle = vehicle.toUpperCase();
  s.since = 'just now';
  addActivity(`Booked: ${vehicle.toUpperCase()}`, `Slot ${s.label} · ${dur}min`, 'green');
  const feeAmount = RATES[type]*dur;
  const fee = `₹${feeAmount}`;
  updateRevenue(feeAmount);
  addBookingRow(s.label, vehicle.toUpperCase(), type, `${dur}min`, 'active', fee);
  bookings.push({slot:s.label, vehicle:vehicle.toUpperCase(), type, dur, status:'active', fee});
  renderAllBookingsTbody();
  scheduleExpiry(key, vehicle.toUpperCase(), s.label, dur * 60 * 1000);
  selectedSlot = null;
  document.getElementById('qVehicle').value = '';
  document.getElementById('selectedSlotDisplay').textContent = 'Click a free slot on the map';
  document.getElementById('selectedSlotDisplay').classList.remove('has-slot');
  rerenderAll();
  updateStats();
  showToast(`Slot ${s.label} booked for ${vehicle.toUpperCase()}!`, 'success');
  // update badge
  const active = bookings.filter(b=>b.status==='active').length;
  document.getElementById('bookingBadge').textContent = active;
}

function createBooking() {
  const vehicle = document.getElementById('bVehicle').value.trim();
  if (!vehicle) { showToast('Enter vehicle number!', 'error'); return; }
  const type = document.getElementById('bType').value;
  const dur = parseInt(document.getElementById('bDuration').value) || 120;
  // find a free slot
  const free = Object.values(slots).find(s=>s.state==='free'&&s.floor===0);
  if (!free) { showToast('No free slots available!', 'error'); return; }
  const freeKey = `${free.floor}-${free.id}`;
  free.state = 'reserved';
  const feeAmount = RATES[type]*dur;
  const fee = `₹${feeAmount}`;
  updateRevenue(feeAmount);
  addActivity(`Reserved: ${vehicle.toUpperCase()}`, `Slot ${free.label}`, 'yellow');
  addBookingRow(free.label, vehicle.toUpperCase(), type, `${dur}min`, 'reserved', fee);
  bookings.push({slot:free.label, vehicle:vehicle.toUpperCase(), type, dur, status:'reserved', fee});
  renderAllBookingsTbody();
  scheduleExpiry(freeKey, vehicle.toUpperCase(), free.label, dur * 60 * 1000);
  rerenderAll();
  updateStats();
  closeModals();
  document.getElementById('bVehicle').value = '';
  showToast(`Slot ${free.label} reserved for ${vehicle.toUpperCase()}!`, 'success');
}

function rerenderAll() {
  renderGrid('parkingGrid', currentFloor);
  renderGrid('parkingGrid2', currentFloor);
}

function setFloor(f, el) {
  currentFloor = f;
  el.parentElement.querySelectorAll('.floor-tab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
  selectedSlot = null;
  rerenderAll();
}

let totalRevenue = 4820;

function updateRevenue(amount) {
  totalRevenue += amount;
  document.getElementById('revenueToday').textContent = '₹' + totalRevenue.toLocaleString('en-IN');
}

function updateStats() {
  const st = globalStats();
  document.getElementById('freeCount').textContent = st.free;
  document.getElementById('occCount').textContent = st.occ;
  document.getElementById('resCount').textContent = st.res;
}

// ─── ACTIVITY ────────────────────────────────────────────────────────────────
const ACTIVITIES = [];
function addActivity(title, sub, color) {
  const colors = {green:'var(--green)',red:'var(--red)',yellow:'var(--yellow)',blue:'var(--blue)'};
  ACTIVITIES.unshift({title, sub, color: colors[color]||colors.green, time: new Date().toLocaleTimeString([], {minute:'2-digit'})});
  renderActivity();
}

function renderActivity() {
  const list = document.getElementById('activityList');
  if (!list) return;
  list.innerHTML = ACTIVITIES.slice(0,8).map(a=>`
    <div class="activity-item">
      <div class="act-dot" style="background:${a.color}"></div>
      <div class="act-info">
        <div class="act-title">${a.title}</div>
        <div class="act-sub">${a.sub}</div>
      </div>
      <div class="act-time">${a.time}</div>
    </div>
  `).join('');
}

// ─── BOOKINGS TABLE ──────────────────────────────────────────────────────────
const initBookingsData = [
  {slot:'A01', vehicle:'TN 01 AB 1234', type:'Car', dur:'120min', status:'active', fee:'₹100'},
  {slot:'B03', vehicle:'MH 02 CD 5678', type:'Bike', dur:'60min', status:'completed', fee:'₹20'},
  {slot:'A05', vehicle:'KA 03 EF 9012', type:'EV', dur:'180min', status:'active', fee:'₹120'},
  {slot:'C02', vehicle:'DL 04 GH 3456', type:'Car', dur:'240min', status:'reserved', fee:'₹200'},
  {slot:'B07', vehicle:'AP 05 IJ 7890', type:'Truck', dur:'120min', status:'completed', fee:'₹160'},
];

function addBookingRow(slot, vehicle, type, dur, status, fee='—') {
  const tbody = document.getElementById('bookingsTbody');
  const row = document.createElement('tr');
  row.innerHTML = `
    <td><strong>${slot}</strong></td>
    <td><div class="vehicle-type">${typeIcon(type)} ${vehicle}</div></td>
    <td style="font-family:'DM Mono',monospace;font-size:11px">${dur}</td>
    <td><span class="pill ${status}">${statusIcon(status)} ${status}</span></td>
    <td style="font-family:'DM Mono',monospace;font-size:12px;color:var(--accent)">${fee}</td>
  `;
  tbody.insertBefore(row, tbody.firstChild);
}

function renderAllBookingsTbody() {
  const tbody = document.getElementById('allBookingsTbody');
  if (!tbody) return;
  const all = [...initBookingsData, ...bookings].reverse();
  tbody.innerHTML = all.map(b=>`
    <tr>
      <td><strong>${b.slot}</strong></td>
      <td>${b.vehicle}</td>
      <td style="font-family:'DM Mono',monospace;font-size:11px">${b.type}</td>
      <td style="font-family:'DM Mono',monospace;font-size:11px">${b.dur||'—'}</td>
      <td><span class="pill ${b.status}">${statusIcon(b.status)} ${b.status}</span></td>
      <td style="font-family:'DM Mono',monospace;font-size:12px;color:var(--accent)">${b.fee||'—'}</td>
      <td><button class="btn btn-ghost" style="padding:4px 10px;font-size:11px" onclick="showToast('Action taken!','success')">⚡</button></td>
    </tr>
  `).join('');
}

function typeIcon(t) {
  return {Car:'🚗',Bike:'🏍️',Truck:'🚛',EV:'⚡'}[t]||'🚗';
}
function statusIcon(s) {
  return {active:'🟢',completed:'⚫',reserved:'🟡',violation:'🔴'}[s]||'';
}

function initBookingsTable() {
  initBookingsData.forEach(b=>addBookingRow(b.slot, b.vehicle, b.type, b.dur, b.status, b.fee));
}

// ─── VEHICLES TABLE ──────────────────────────────────────────────────────────
const VEHICLES_DATA = [
  {no:'TN 01 AB 1234', type:'Car', owner:'Rajesh Kumar', visits:12, status:'active'},
  {no:'MH 02 CD 5678', type:'Bike', owner:'Priya Sharma', visits:8, status:'active'},
  {no:'KA 03 EF 9012', type:'EV', owner:'Karthik R', visits:5, status:'active'},
  {no:'DL 04 GH 3456', type:'Car', owner:'Meera Iyer', visits:20, status:'completed'},
  {no:'AP 05 IJ 7890', type:'Truck', owner:'Suresh P', visits:3, status:'active'},
];

function initVehiclesTable() {
  const tbody = document.getElementById('vehiclesTbody');
  if (!tbody) return;
  tbody.innerHTML = VEHICLES_DATA.map(v=>`
    <tr>
      <td style="font-family:'DM Mono',monospace;font-size:12px">${v.no}</td>
      <td><div class="vehicle-type">${typeIcon(v.type)} ${v.type}</div></td>
      <td>${v.owner}</td>
      <td style="font-family:'DM Mono',monospace;text-align:center">${v.visits}</td>
      <td><span class="pill ${v.status}">${statusIcon(v.status)} ${v.status}</span></td>
    </tr>
  `).join('');
}

// ─── CHART ────────────────────────────────────────────────────────────────────
const CHART_DATA = [
  {h:'0min',v:15},{h:'60min',v:35},{h:'120min',v:65},{h:'180min',v:80},{h:'240min',v:90},
  {h:'300min',v:85},{h:'360min',v:75},{h:'420min',v:70},{h:'480min',v:82},{h:'540min',v:88},
  {h:'600min',v:78},{h:'660min',v:60},{h:'720min',v:45},{h:'780min',v:30},
];

function renderChart(id, data) {
  const el = document.getElementById(id);
  if (!el) return;
  const max = Math.max(...data.map(d=>d.v));
  el.innerHTML = data.map(d=>`
    <div class="bar-group">
      <div class="bar" style="height:${(d.v/max)*100}%;background:linear-gradient(to top,var(--accent2),var(--accent))">
        <span class="bar-val" style="color:var(--accent)">${d.v}%</span>
      </div>
      <div class="bar-label">${d.h}</div>
    </div>
  `).join('');
}

const MONTH_CHART = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map(m=>({h:m,v:Math.floor(Math.random()*40)+50}));

// ─── NAV ─────────────────────────────────────────────────────────────────────
function setNav(el, panel) {
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  el.classList.add('active');
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
  document.getElementById(`panel-${panel}`).classList.add('active');
  document.getElementById('pageTitle').textContent = el.querySelector(':not(.nav-icon):not(.badge)')?.textContent.trim() || panel;

  if (panel === 'parking') renderGrid('parkingGrid2', currentFloor);
  if (panel === 'bookings') renderAllBookingsTbody();
  if (panel === 'vehicles') initVehiclesTable();
  if (panel === 'reports') renderChart('monthChartBars', MONTH_CHART);
}

// ─── MODALS ───────────────────────────────────────────────────────────────────
function openBookingModal() { document.getElementById('bookingModal').classList.add('open'); }
function closeModals() {
  document.querySelectorAll('.modal-overlay').forEach(m=>m.classList.remove('open'));
}
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) closeModals();
});

// ─── TOAST ────────────────────────────────────────────────────────────────────
function showToast(msg, type='success') {
  const wrap = document.getElementById('toastWrap');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${{success:'✅',error:'❌',warn:'⚠️'}[type]||'ℹ️'}</span><span>${msg}</span>`;
  wrap.appendChild(el);
  setTimeout(()=>el.remove(), 4000);
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
initSlots();
renderGrid('parkingGrid', 0);
updateStats();
initBookingsTable();
renderChart('chartBars', CHART_DATA);

// seed activities
[
  ['System started', 'SmartPark Central online', 'blue'],
  ['Vehicle entered', 'TN 01 AB 1234 · Slot A01', 'green'],
  ['Reservation made', 'Slot C02 reserved · 240min', 'yellow'],
  ['Check-out', 'MH 02 CD 5678 · ₹40', 'red'],
].forEach(([t,s,c])=>addActivity(t,s,c));

// simulate live updates
setInterval(() => {
  const freeSlots = Object.keys(slots).filter(k=>slots[k].state==='free');
  if (freeSlots.length > 5 && Math.random() > 0.5) {
    const key = freeSlots[Math.floor(Math.random()*freeSlots.length)];
    const s = slots[key];
    s.state = 'occupied';
    s.vehicle = randomVehicle();
    s.since = 'just now';
    addActivity(`Vehicle entered`, `${s.vehicle} · ${s.label}`, 'green');
    rerenderAll();
    updateStats();
  }
}, 8000);
