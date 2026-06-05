// ── Config ─────────────────────────────────────────────────────────────────
// Restrict this API key in Google Cloud Console to:
//   • Sheets API only
//   • HTTP referrers: your GitHub Pages domain
const API_KEY        = 'AIzaSyAZczEsV1gbPOhZU1N4-Qu4rlQP72Sdnog';
const SPREADSHEET_ID = '1GCW6VUrmC-A5EjqgIOtilqbZU4422KnEePjhjKXwkdU';
const SHEET_NAME     = 'Prosjektoppgaver';

// Paste your deployed Apps Script Web App URL here after setup
let APPS_SCRIPT_URL  = 'https://script.google.com/macros/s/AKfycbzYoY7vwqixC5QhvElpdhh33us5c4Ni9TEvK3ZnosFSx3dJo3jPLRQHFZyEwNx7jTSg/exec';

// ── State ───────────────────────────────────────────────────────────────────
const STATUSES   = ['Ikke startet', 'Pågår', 'Blokkert', 'Fullført'];
const COL_IDS    = ['col-0', 'col-1', 'col-2', 'col-3'];

let tasks       = [];
let currentView = 'kanban';

// ── Fetch (read via Sheets API) ─────────────────────────────────────────────
async function fetchTasks() {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}`
            + `/values/${encodeURIComponent(SHEET_NAME)}`
            + `?key=${API_KEY}&valueRenderOption=FORMATTED_VALUE`;

  const res  = await fetch(url);
  if (!res.ok) throw new Error(`Sheets API feil: ${res.status}`);
  const data = await res.json();

  const rows = data.values || [];
  if (rows.length < 2) return [];

  const headers = rows[0];
  return rows.slice(1)
    .map((row, i) => {
      const t = { _row: i + 2 };
      headers.forEach((h, j) => { t[h] = (row[j] ?? ''); });
      return t;
    })
    .filter(t => t['Oppgave'] && t['Oppgave'].trim() !== '' && t['Oppgave'] !== 'Oppgave');
}

// ── Write (via Apps Script) ─────────────────────────────────────────────────
async function writeTask(action, params) {
  if (!APPS_SCRIPT_URL) {
    showToast('⚠ Lim inn Apps Script URL i app.js for å aktivere skriving', 'error');
    return false;
  }

  const qs  = new URLSearchParams({ action, ...params }).toString();
  const res = await fetch(`${APPS_SCRIPT_URL}?${qs}`, { redirect: 'follow' });
  if (!res.ok) return false;

  const json = await res.json();
  return json.success === true;
}

// ── Render: Kanban ──────────────────────────────────────────────────────────
async function moveTask(row, newStatus) {
  const task = tasks.find(t => t._row === row);
  if (!task || task['Status'] === newStatus) return;

  const oldStatus = task['Status'];
  task['Status'] = newStatus;
  renderBoard();

  const ok = await writeTask('update', {
    row,
    oppgave:   task['Oppgave'],
    prioritet: task['Prioritet'] || '',
    eier:      task['Eier'] || '',
    status:    newStatus,
    startdato: task['Startdato'] || '',
    sluttdato: task['Sluttdato'] || '',
    merknader: task['Merknader'] || '',
  });

  if (!ok) {
    task['Status'] = oldStatus;
    renderBoard();
    showToast('Feil ved lagring av statusendring', 'error');
  } else {
    showToast('Status oppdatert ✓', 'success');
  }
}

function renderBoard() {
  STATUSES.forEach((status, i) => {
    const col      = document.getElementById(COL_IDS[i]);
    const countEl  = document.getElementById(`count-${i}`);
    const filtered = tasks.filter(t => t['Status'] === status);

    countEl.textContent = filtered.length;
    col.innerHTML = '';
    filtered.forEach(t => col.appendChild(makeCard(t)));

    col.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      col.classList.add('drag-over');
    });
    col.addEventListener('dragleave', e => {
      if (!col.contains(e.relatedTarget)) col.classList.remove('drag-over');
    });
    col.addEventListener('drop', e => {
      e.preventDefault();
      col.classList.remove('drag-over');
      const row = parseInt(e.dataTransfer.getData('text/plain'), 10);
      if (!isNaN(row)) moveTask(row, status);
    });
  });
  renderStats();
}

function makeCard(task) {
  const card     = document.createElement('div');
  const pri      = task['Prioritet'] || '';
  const owner    = task['Eier'] || '';
  const deadline = task['Sluttdato'] || '';
  const notes    = task['Merknader'] || '';
  const overdue  = isOverdue(deadline);

  card.className   = `card${overdue ? ' overdue' : ''}`;
  card.draggable   = true;
  card.onclick     = () => openModal(task);
  card.addEventListener('dragstart', e => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(task._row));
    card.classList.add('dragging');
  });
  card.addEventListener('dragend', () => {
    card.classList.remove('dragging');
  });

  card.innerHTML = `
    <div class="card-top">
      <span class="card-title">${esc(task['Oppgave'])}</span>
      ${pri ? `<span class="badge badge-${pri.toLowerCase()}">${esc(pri)}</span>` : ''}
    </div>
    <div class="card-meta">
      ${owner ? `
        <div class="card-owner">
          <div class="avatar">${owner.charAt(0).toUpperCase()}</div>
          <span>${esc(owner)}</span>
        </div>` : ''}
      ${deadline ? `<span class="card-date">📅 ${esc(deadline)}</span>` : ''}
      ${overdue  ? `<span class="overdue-tag">Forfalt</span>` : ''}
    </div>
    ${notes ? `<div class="card-notes">${esc(notes)}</div>` : ''}
  `;
  return card;
}

// ── Render: Table ───────────────────────────────────────────────────────────
function renderTable() {
  const tbody = document.getElementById('table-body');
  tbody.innerHTML = '';

  tasks.forEach(task => {
    const tr   = document.createElement('tr');
    tr.onclick = () => openModal(task);

    tr.innerHTML = `
      <td><strong>${esc(task['Oppgave'] || '')}</strong></td>
      <td>${badgePri(task['Prioritet'])}</td>
      <td>${ownerCell(task['Eier'])}</td>
      <td>${badgeStatus(task['Status'])}</td>
      <td>${esc(task['Startdato'] || '–')}</td>
      <td>${esc(task['Sluttdato'] || '–')}</td>
      <td style="color:var(--txt2);max-width:200px">${esc(task['Merknader'] || '–')}</td>
      <td>
        <button class="btn-ghost" style="padding:4px 10px;font-size:11px"
          onclick="event.stopPropagation();openModalByRow(${task._row})">
          Rediger
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// table edit button helper
function openModalByRow(row) {
  const task = tasks.find(t => t._row === row);
  if (task) openModal(task);
}

// ── Stats ───────────────────────────────────────────────────────────────────
function renderStats() {
  document.getElementById('stat-total').textContent   = tasks.length;
  document.getElementById('stat-done').textContent    = tasks.filter(t => t['Status'] === 'Fullført').length;
  document.getElementById('stat-blocked').textContent = tasks.filter(t => t['Status'] === 'Blokkert').length;
}

// ── Owner suggestions (datalist) ────────────────────────────────────────────
function updateOwnerSuggestions() {
  const dl      = document.getElementById('owners-list');
  const owners  = [...new Set(tasks.map(t => t['Eier']).filter(Boolean))];
  dl.innerHTML  = owners.map(o => `<option value="${esc(o)}">`).join('');
}

// ── Modal ───────────────────────────────────────────────────────────────────
function openModal(task, presetStatus = null) {
  document.getElementById('field-row').value       = task ? task._row : '';
  document.getElementById('field-oppgave').value   = task ? (task['Oppgave'] || '') : '';
  document.getElementById('field-prioritet').value = task ? (task['Prioritet'] || '') : '';
  document.getElementById('field-eier').value      = task ? (task['Eier'] || '') : '';
  document.getElementById('field-status').value    = task
    ? (task['Status'] || 'Ikke startet')
    : (presetStatus || 'Ikke startet');
  document.getElementById('field-startdato').value = task ? toIso(task['Startdato']) : '';
  document.getElementById('field-sluttdato').value = task ? toIso(task['Sluttdato']) : '';
  document.getElementById('field-merknader').value = task ? (task['Merknader'] || '') : '';

  document.getElementById('modal-title').textContent = task ? 'Rediger oppgave' : 'Ny oppgave';
  document.getElementById('btn-delete').style.display = task ? 'inline-flex' : 'none';
  document.getElementById('modal-overlay').classList.remove('hidden');
  document.getElementById('field-oppgave').focus();
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

// ── Save ────────────────────────────────────────────────────────────────────
async function saveTask() {
  const rowField = document.getElementById('field-row').value;
  const oppgave  = document.getElementById('field-oppgave').value.trim();

  if (!oppgave) {
    document.getElementById('field-oppgave').focus();
    showToast('Oppgavenavn er påkrevd', 'error');
    return;
  }

  const params = {
    oppgave,
    prioritet:  document.getElementById('field-prioritet').value,
    eier:       document.getElementById('field-eier').value.trim(),
    status:     document.getElementById('field-status').value,
    startdato:  toNO(document.getElementById('field-startdato').value),
    sluttdato:  toNO(document.getElementById('field-sluttdato').value),
    merknader:  document.getElementById('field-merknader').value.trim(),
  };

  const btn = document.getElementById('btn-save');
  btn.textContent = 'Lagrer…';
  btn.disabled    = true;

  const action = rowField ? 'update' : 'add';
  if (rowField) params.row = rowField;

  const ok = await writeTask(action, params);

  btn.textContent = 'Lagre';
  btn.disabled    = false;

  showToast(ok
    ? (rowField ? 'Oppgave oppdatert ✓' : 'Oppgave lagt til ✓')
    : 'Feil ved lagring – sjekk Apps Script URL',
    ok ? 'success' : 'error');

  if (ok) {
    closeModal();
    await loadAndRender();
  }
}

// ── Delete ──────────────────────────────────────────────────────────────────
async function deleteTask() {
  const rowField = document.getElementById('field-row').value;
  if (!rowField) return;
  if (!confirm('Er du sikker på at du vil slette denne oppgaven?')) return;

  const ok = await writeTask('delete', { row: rowField });
  showToast(ok ? 'Oppgave slettet' : 'Feil ved sletting', ok ? 'success' : 'error');

  if (ok) {
    closeModal();
    await loadAndRender();
  }
}

// ── View toggle ─────────────────────────────────────────────────────────────
function setView(view) {
  currentView = view;
  document.querySelectorAll('.view-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.view === view));
  document.getElementById('board').classList.toggle('hidden', view !== 'kanban');
  document.getElementById('table-view').classList.toggle('hidden', view !== 'table');
  if (view === 'table') renderTable();
}

// ── Toast ───────────────────────────────────────────────────────────────────
let _toastTimer;
function showToast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className   = `toast ${type} show`;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function toIso(d) {
  if (!d) return '';
  // "30.06.2026" → "2026-06-30"
  const m = String(d).match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  return m ? `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}` : String(d);
}

function toNO(d) {
  if (!d) return '';
  // "2026-06-30" → "30.06.2026"
  const m = String(d).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : String(d);
}

function isOverdue(dateStr) {
  if (!dateStr) return false;
  const iso = toIso(dateStr);
  if (!iso) return false;
  return new Date(iso) < new Date();
}

function badgePri(p) {
  if (!p) return '–';
  return `<span class="badge badge-${p.toLowerCase()}">${esc(p)}</span>`;
}

function ownerCell(owner) {
  if (!owner) return '–';
  return `<div class="card-owner">
    <div class="avatar">${owner.charAt(0).toUpperCase()}</div>
    <span>${esc(owner)}</span>
  </div>`;
}

function badgeStatus(s) {
  const map = {
    'Ikke startet': 's-ikke',
    'Pågår':        's-pagaar',
    'Blokkert':     's-blokk',
    'Fullført':     's-full',
  };
  if (!s) return '–';
  return `<span class="status-badge ${map[s] || ''}">${esc(s)}</span>`;
}

// ── Main load ────────────────────────────────────────────────────────────────
async function loadAndRender() {
  try {
    tasks = await fetchTasks();
    document.getElementById('loading').classList.add('hidden');

    if (currentView === 'kanban') {
      document.getElementById('board').classList.remove('hidden');
      renderBoard();
    } else {
      document.getElementById('table-view').classList.remove('hidden');
      renderTable();
    }
    updateOwnerSuggestions();
  } catch (err) {
    console.error(err);
    document.getElementById('loading').innerHTML =
      `<p style="color:var(--red)">Feil ved lasting: ${esc(err.message)}</p>
       <p style="color:var(--txt2);font-size:12px;margin-top:8px">
         Sjekk at API-nøkkelen er gyldig og at arket er offentlig delt.
       </p>`;
  }
}

// ── Bootstrap ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadAndRender();

  document.getElementById('btn-add').onclick    = () => openModal(null);
  document.getElementById('modal-close').onclick = closeModal;
  document.getElementById('btn-cancel').onclick  = closeModal;
  document.getElementById('btn-save').onclick    = saveTask;
  document.getElementById('btn-delete').onclick  = deleteTask;

  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
  });

  document.querySelectorAll('.view-btn').forEach(btn =>
    btn.addEventListener('click', () => setView(btn.dataset.view)));

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') saveTask();
  });
});
