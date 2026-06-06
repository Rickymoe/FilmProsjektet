# Team Registry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Legg til en «Team»-fane i FilmProsjekter-portalen der filmteammedlemmer (navn, rolle, e-post, mobil) kan registreres, redigeres og slettes via Google Sheets.

**Architecture:** Data lagres i et nytt ark `Team` i eksisterende Google Spreadsheet. Lesing via Sheets API v4 (eksisterende API-nøkkel). Skriving via eksisterende Apps Script Web App (URL uendret, koden oppdateres og re-deployes). Frontend er én statisk `index.html` med ny tab-navigasjon mellom Oppgaver og Team.

**Tech Stack:** Vanilla JS, HTML/CSS, Google Sheets API v4, Google Apps Script

---

## Filstruktur

| Fil | Endring |
|-----|---------|
| `apps-script/Code.gs` | Legg til `TEAM_SHEET_NAME`, `addMember()`, `updateMember()`, `deleteMember()`, tre nye greiner i `doGet` |
| `index.html` | Legg til `.tab-nav`, `#team-view`, `#member-modal-overlay` |
| `style.css` | Legg til stiler for `.tab-nav`, `.tab-btn`, `.team-view` |
| `app.js` | Legg til `TEAM_SHEET_NAME`, `fetchMembers()`, `renderTeamTable()`, `openMemberModal()`, `saveMember()`, `deleteMemberFromSheet()`, `setMainTab()` |

---

## Task 1: Opprett Team-ark i Google Spreadsheet (manuelt)

**Files:**
- Ingen kodefiler — dette er et manuelt steg i Google Sheets

- [ ] **Steg 1: Åpne spreadsheet**

  Gå til: https://docs.google.com/spreadsheets/d/1GCW6VUrmC-A5EjqgIOtilqbZU4422KnEePjhjKXwkdU

- [ ] **Steg 2: Opprett nytt ark**

  Klikk `+`-ikonet nederst til venstre → gi arket navnet `Team` (nøyaktig denne stavemåten).

- [ ] **Steg 3: Sett inn headers**

  I rad 1, skriv inn følgende verdier i kolonne A–D:
  ```
  A1: Navn
  B1: Rolle
  C1: E-post
  D1: Mobil
  ```

- [ ] **Steg 4: Verifiser**

  Arket heter `Team` og rad 1 inneholder de fire headerne. Alle andre rader er tomme.

---

## Task 2: Oppdater Apps Script

**Files:**
- Modify: `apps-script/Code.gs`

- [ ] **Steg 1: Oppdater `Code.gs`**

  Erstatt hele innholdet i `apps-script/Code.gs` med:

  ```javascript
  const SHEET_NAME      = 'Prosjektoppgaver';
  const TEAM_SHEET_NAME = 'Team';

  function doGet(e) {
    const lock = LockService.getScriptLock();
    lock.tryLock(15000);

    try {
      const ss     = SpreadsheetApp.getActiveSpreadsheet();
      const action = (e.parameter.action || 'get').toLowerCase();

      let result;
      if      (action === 'get')          result = getData(ss.getSheetByName(SHEET_NAME));
      else if (action === 'add')          result = addRow(ss.getSheetByName(SHEET_NAME), e.parameter);
      else if (action === 'update')       result = updateRow(ss.getSheetByName(SHEET_NAME), e.parameter);
      else if (action === 'delete')       result = deleteRow(ss.getSheetByName(SHEET_NAME), e.parameter);
      else if (action === 'getmembers')   result = getData(ss.getSheetByName(TEAM_SHEET_NAME));
      else if (action === 'addmember')    result = addMember(ss.getSheetByName(TEAM_SHEET_NAME), e.parameter);
      else if (action === 'updatemember') result = updateMember(ss.getSheetByName(TEAM_SHEET_NAME), e.parameter);
      else if (action === 'deletemember') result = deleteMember(ss.getSheetByName(TEAM_SHEET_NAME), e.parameter);
      else result = { success: false, error: 'Ukjent action: ' + action };

      return output(result);
    } catch (err) {
      return output({ success: false, error: err.message });
    } finally {
      lock.releaseLock();
    }
  }

  // ── Tasks ────────────────────────────────────────────────────────────────────
  function getData(sheet) {
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return { success: true, data: [] };

    const headers = data[0];
    const rows    = [];
    const tz      = Session.getScriptTimeZone();

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row.every(c => c === '' || c === null)) continue;

      const obj = { _row: i + 1 };
      headers.forEach((h, j) => {
        const v = row[j];
        obj[h] = (v instanceof Date)
          ? Utilities.formatDate(v, tz, 'dd.MM.yyyy')
          : (v ?? '');
      });
      rows.push(obj);
    }

    return { success: true, data: rows };
  }

  function addRow(sheet, p) {
    sheet.appendRow([
      p.oppgave   || '',
      p.prioritet || '',
      p.eier      || '',
      p.status    || '',
      p.startdato || '',
      p.sluttdato || '',
      p.merknader || '',
    ]);
    return { success: true };
  }

  function updateRow(sheet, p) {
    const row = parseInt(p.row);
    if (!row || isNaN(row)) return { success: false, error: 'Ugyldig radnummer' };

    sheet.getRange(row, 1, 1, 7).setValues([[
      p.oppgave   || '',
      p.prioritet || '',
      p.eier      || '',
      p.status    || '',
      p.startdato || '',
      p.sluttdato || '',
      p.merknader || '',
    ]]);
    return { success: true };
  }

  function deleteRow(sheet, p) {
    const row = parseInt(p.row);
    if (!row || isNaN(row)) return { success: false, error: 'Ugyldig radnummer' };
    sheet.deleteRow(row);
    return { success: true };
  }

  // ── Team members ─────────────────────────────────────────────────────────────
  function addMember(sheet, p) {
    sheet.appendRow([
      p.navn  || '',
      p.rolle || '',
      p.epost || '',
      p.mobil || '',
    ]);
    return { success: true };
  }

  function updateMember(sheet, p) {
    const row = parseInt(p.row);
    if (!row || isNaN(row)) return { success: false, error: 'Ugyldig radnummer' };

    sheet.getRange(row, 1, 1, 4).setValues([[
      p.navn  || '',
      p.rolle || '',
      p.epost || '',
      p.mobil || '',
    ]]);
    return { success: true };
  }

  function deleteMember(sheet, p) {
    const row = parseInt(p.row);
    if (!row || isNaN(row)) return { success: false, error: 'Ugyldig radnummer' };
    sheet.deleteRow(row);
    return { success: true };
  }

  // ── Helper ───────────────────────────────────────────────────────────────────
  function output(obj) {
    return ContentService
      .createTextOutput(JSON.stringify(obj))
      .setMimeType(ContentService.MimeType.JSON);
  }
  ```

- [ ] **Steg 2: Re-deploy i Apps Script-editoren**

  1. Gå til spreadsheetets Apps Script: Utvidelser → Apps Script
  2. Erstatt `Code.gs` med koden over og lagre (Ctrl+S)
  3. Klikk **Distribuer** → **Administrer distribusjoner**
  4. Klikk blyantikonet (Rediger) ved den aktive distribusjonen
  5. Under «Versjon», velg **Ny versjon**
  6. Klikk **Distribuer**
  7. URL-en forblir den samme — `APPS_SCRIPT_URL` i `app.js` trenger ikke endres

- [ ] **Steg 3: Verifiser med curl**

  Kjør (erstatt `<URL>` med din `APPS_SCRIPT_URL`):
  ```bash
  curl -L "<URL>?action=getmembers"
  ```
  Forventet svar: `{"success":true,"data":[]}`

- [ ] **Steg 4: Commit**

  ```bash
  git add apps-script/Code.gs
  git commit -m "feat: legg til team CRUD i Apps Script"
  ```

---

## Task 3: HTML — tab-navigasjon, team-visning og person-modal

**Files:**
- Modify: `index.html`

- [ ] **Steg 1: Legg til tab-navigasjon etter `</header>` (linje 48)**

  Sett inn følgende rett etter `</header>`:
  ```html
  <!-- Tab navigation -->
  <nav class="tab-nav">
    <button class="tab-btn active" data-tab="tasks">📋 Oppgaver</button>
    <button class="tab-btn" data-tab="team">👥 Team</button>
  </nav>
  ```

- [ ] **Steg 2: Legg til `#team-view` etter `</div>` som avslutter `#table-view` (etter linje 113)**

  Sett inn følgende rett etter `</div>` som lukker `.table-view`:
  ```html
  <!-- Team View -->
  <div class="team-view hidden" id="team-view">
    <div class="team-toolbar">
      <span class="team-count" id="team-count">0 teammedlemmer</span>
      <button class="btn-primary" id="btn-add-member">+ Legg til person</button>
    </div>
    <table class="task-table">
      <thead>
        <tr>
          <th>Navn</th>
          <th>Rolle</th>
          <th>E-post</th>
          <th>Mobil</th>
          <th></th>
        </tr>
      </thead>
      <tbody id="team-body"></tbody>
    </table>
  </div>
  ```

- [ ] **Steg 3: Legg til person-modal etter den eksisterende `<!-- Modal -->`-blokken (etter linje 183)**

  Sett inn følgende rett etter `</div>` som lukker det eksisterende modal-overlay:
  ```html
  <!-- Member Modal -->
  <div class="modal-overlay hidden" id="member-modal-overlay">
    <div class="modal">
      <div class="modal-header">
        <h2 id="member-modal-title">Nytt teammedlem</h2>
        <button class="modal-close" id="member-modal-close">✕</button>
      </div>
      <div class="modal-body">
        <input type="hidden" id="member-field-row">
        <div class="form-row">
          <div class="form-group full">
            <label>Navn *</label>
            <input type="text" id="member-field-navn" placeholder="Fullt navn…">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Rolle</label>
            <input type="text" id="member-field-rolle" placeholder="F.eks. Regissør…">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>E-post</label>
            <input type="email" id="member-field-epost" placeholder="navn@eksempel.no">
          </div>
          <div class="form-group">
            <label>Mobil</label>
            <input type="tel" id="member-field-mobil" placeholder="+47 000 00 000">
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-danger" id="member-btn-delete" style="display:none">🗑 Slett</button>
        <div class="footer-right">
          <button class="btn-ghost" id="member-btn-cancel">Avbryt</button>
          <button class="btn-primary" id="member-btn-save">Lagre</button>
        </div>
      </div>
    </div>
  </div>
  ```

- [ ] **Steg 4: Manuell visuell sjekk**

  Åpne `index.html` lokalt (eller kjør `python3 -m http.server 8080` i prosjektmappen).
  Verifiser at:
  - Tab-nav vises under headeren med «📋 Oppgaver» aktiv
  - «👥 Team»-fanen er klikkbar (men uten funksjon ennå)
  - Ingen nye elementer bryter eksisterende layout

- [ ] **Steg 5: Commit**

  ```bash
  git add index.html
  git commit -m "feat: legg til tab-nav, team-view og person-modal i HTML"
  ```

---

## Task 4: CSS — tab-navigasjon og team-visning

**Files:**
- Modify: `style.css`

- [ ] **Steg 1: Legg til stiler på slutten av `style.css`**

  Legg til følgende blokk rett før `/* ── Responsive ──` (før linje 375):

  ```css
  /* ── Tab Navigation ─────────────────────────── */
  .tab-nav {
    display: flex;
    gap: 0;
    padding: 0 22px;
    background: var(--bg2);
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .tab-btn {
    background: none; border: none;
    color: var(--txt2); font-size: 13px; font-weight: 500;
    padding: 10px 16px; cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: all .15s; font-family: inherit;
  }
  .tab-btn:hover { color: var(--txt); }
  .tab-btn.active {
    color: var(--txt);
    border-bottom-color: var(--blue);
    font-weight: 600;
  }

  /* ── Team View ───────────────────────────────── */
  .team-view { flex: 1; overflow: auto; padding: 20px 22px; }

  .team-toolbar {
    display: flex; align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
  }
  .team-count { font-size: 12px; color: var(--txt2); }
  ```

- [ ] **Steg 2: Manuell visuell sjekk**

  Åpne i nettleser. Verifiser:
  - Tab-nav har riktig bakgrunn og kantlinje
  - Aktiv fane har blå understrek
  - Hover-effekt fungerer

- [ ] **Steg 3: Commit**

  ```bash
  git add style.css
  git commit -m "feat: legg til CSS for tab-nav og team-view"
  ```

---

## Task 5: JS — hent og vis teammedlemmer

**Files:**
- Modify: `app.js`

- [ ] **Steg 1: Legg til `TEAM_SHEET_NAME`-konstant etter linje 7 i `app.js`**

  Etter linjen `const SHEET_NAME = 'Prosjektoppgaver';`, legg til:
  ```javascript
  const TEAM_SHEET_NAME = 'Team';
  ```

- [ ] **Steg 2: Legg til `members`-state etter `let tasks = [];` (ca. linje 16)**

  Etter `let tasks = [];`, legg til:
  ```javascript
  let members = [];
  ```

- [ ] **Steg 3: Legg til `fetchMembers()` etter `fetchTasks()`-funksjonen (ca. linje 40)**

  ```javascript
  async function fetchMembers() {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}`
              + `/values/${encodeURIComponent(TEAM_SHEET_NAME)}`
              + `?key=${API_KEY}&valueRenderOption=FORMATTED_VALUE`;

    const res  = await fetch(url);
    if (!res.ok) throw new Error(`Sheets API feil (team): ${res.status}`);
    const data = await res.json();

    const rows = data.values || [];
    if (rows.length < 2) return [];

    const headers = rows[0];
    return rows.slice(1)
      .map((row, i) => {
        const m = { _row: i + 2 };
        headers.forEach((h, j) => { m[h] = (row[j] ?? ''); });
        return m;
      })
      .filter(m => m['Navn'] && m['Navn'].trim() !== '' && m['Navn'] !== 'Navn');
  }
  ```

- [ ] **Steg 4: Legg til `renderTeamTable()` etter `fetchMembers()`**

  ```javascript
  function renderTeamTable() {
    const tbody   = document.getElementById('team-body');
    const countEl = document.getElementById('team-count');

    countEl.textContent = `${members.length} teammedlem${members.length === 1 ? '' : 'mer'}`;
    tbody.innerHTML = '';

    members.forEach(m => {
      const tr   = document.createElement('tr');
      tr.onclick = () => openMemberModal(m);

      const initial = (m['Navn'] || '?').charAt(0).toUpperCase();
      tr.innerHTML = `
        <td>
          <div class="card-owner">
            <div class="avatar">${esc(initial)}</div>
            <span>${esc(m['Navn'] || '')}</span>
          </div>
        </td>
        <td style="color:var(--blue)">${esc(m['Rolle'] || '–')}</td>
        <td style="color:var(--txt2)">${esc(m['E-post'] || '–')}</td>
        <td style="color:var(--txt2)">${esc(m['Mobil'] || '–')}</td>
        <td>
          <button class="btn-ghost" style="padding:4px 10px;font-size:11px"
            onclick="event.stopPropagation();openMemberModal(members.find(x=>x._row===${m._row}))">
            Rediger
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }
  ```

- [ ] **Steg 5: Legg til `loadAndRenderTeam()` etter `renderTeamTable()`**

  ```javascript
  async function loadAndRenderTeam() {
    try {
      members = await fetchMembers();
      renderTeamTable();
    } catch (err) {
      console.error(err);
      document.getElementById('team-body').innerHTML =
        `<tr><td colspan="5" style="color:var(--red);padding:20px">
          Feil ved lasting av team: ${esc(err.message)}
        </td></tr>`;
    }
  }
  ```

- [ ] **Steg 6: Manuell test**

  Legg til en testrad i Team-arket i Sheets: `Testperson | Testrolle | test@test.no | +47 123`.
  Kjør lokalt (`python3 -m http.server 8080`), åpne i nettleser.
  Klikk «👥 Team»-fanen (fungerer ennå ikke, se neste task) — men verifiser konsollen for feil.

- [ ] **Steg 7: Commit**

  ```bash
  git add app.js
  git commit -m "feat: legg til fetchMembers og renderTeamTable"
  ```

---

## Task 6: JS — person-modal og CRUD

**Files:**
- Modify: `app.js`

- [ ] **Steg 1: Legg til `openMemberModal()` etter `renderTeamTable()`-blokken**

  ```javascript
  function openMemberModal(member) {
    document.getElementById('member-field-row').value   = member ? member._row : '';
    document.getElementById('member-field-navn').value  = member ? (member['Navn']   || '') : '';
    document.getElementById('member-field-rolle').value = member ? (member['Rolle']  || '') : '';
    document.getElementById('member-field-epost').value = member ? (member['E-post'] || '') : '';
    document.getElementById('member-field-mobil').value = member ? (member['Mobil']  || '') : '';

    document.getElementById('member-modal-title').textContent      = member ? 'Rediger person' : 'Nytt teammedlem';
    document.getElementById('member-btn-delete').style.display     = member ? 'inline-flex' : 'none';
    document.getElementById('member-modal-overlay').classList.remove('hidden');
    document.getElementById('member-field-navn').focus();
  }

  function closeMemberModal() {
    document.getElementById('member-modal-overlay').classList.add('hidden');
  }
  ```

- [ ] **Steg 2: Legg til `saveMember()` etter `closeMemberModal()`**

  ```javascript
  async function saveMember() {
    const rowField = document.getElementById('member-field-row').value;
    const navn     = document.getElementById('member-field-navn').value.trim();

    if (!navn) {
      document.getElementById('member-field-navn').focus();
      showToast('Navn er påkrevd', 'error');
      return;
    }

    const params = {
      navn,
      rolle: document.getElementById('member-field-rolle').value.trim(),
      epost: document.getElementById('member-field-epost').value.trim(),
      mobil: document.getElementById('member-field-mobil').value.trim(),
    };

    const btn = document.getElementById('member-btn-save');
    btn.textContent = 'Lagrer…';
    btn.disabled    = true;

    const action = rowField ? 'updatemember' : 'addmember';
    if (rowField) params.row = rowField;

    const ok = await writeTask(action, params);

    btn.textContent = 'Lagre';
    btn.disabled    = false;

    showToast(ok
      ? (rowField ? 'Person oppdatert ✓' : 'Person lagt til ✓')
      : 'Feil ved lagring – sjekk Apps Script URL',
      ok ? 'success' : 'error');

    if (ok) {
      closeMemberModal();
      await loadAndRenderTeam();
    }
  }
  ```

- [ ] **Steg 3: Legg til `deleteMemberFromSheet()` etter `saveMember()`**

  ```javascript
  async function deleteMemberFromSheet() {
    const rowField = document.getElementById('member-field-row').value;
    if (!rowField) return;
    if (!confirm('Er du sikker på at du vil slette dette teammedlemmet?')) return;

    const ok = await writeTask('deletemember', { row: rowField });
    showToast(ok ? 'Person slettet' : 'Feil ved sletting', ok ? 'success' : 'error');

    if (ok) {
      closeMemberModal();
      await loadAndRenderTeam();
    }
  }
  ```

- [ ] **Steg 4: Commit**

  ```bash
  git add app.js
  git commit -m "feat: legg til person-modal og CRUD for teammedlemmer"
  ```

---

## Task 7: JS — tab-switching og bootstrap

**Files:**
- Modify: `app.js`

- [ ] **Steg 1: Legg til `setMainTab()` etter `setView()`-funksjonen (ca. linje 278)**

  ```javascript
  function setMainTab(tab) {
    const isTeam = tab === 'team';

    document.querySelectorAll('.tab-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.tab === tab));

    // Oppgave-spesifikke elementer
    document.querySelector('.stats').classList.toggle('hidden', isTeam);
    document.querySelector('.view-toggle').classList.toggle('hidden', isTeam);
    document.getElementById('btn-add').classList.toggle('hidden', isTeam);
    document.getElementById('loading').classList.toggle('hidden', true);

    if (isTeam) {
      document.getElementById('board').classList.add('hidden');
      document.getElementById('table-view').classList.add('hidden');
      document.getElementById('team-view').classList.remove('hidden');
      loadAndRenderTeam();
    } else {
      document.getElementById('team-view').classList.add('hidden');
      if (currentView === 'kanban') {
        document.getElementById('board').classList.remove('hidden');
      } else {
        document.getElementById('table-view').classList.remove('hidden');
      }
    }
  }
  ```

- [ ] **Steg 2: Koble til event listeners i `DOMContentLoaded`-blokken**

  I `DOMContentLoaded`-blokken (ca. linje 367), legg til følgende rett etter den siste `document.querySelectorAll('.view-btn')...`-blokken:

  ```javascript
  // Tab navigation
  document.querySelectorAll('.tab-btn').forEach(btn =>
    btn.addEventListener('click', () => setMainTab(btn.dataset.tab)));

  // Member modal
  document.getElementById('btn-add-member').onclick    = () => openMemberModal(null);
  document.getElementById('member-modal-close').onclick = closeMemberModal;
  document.getElementById('member-btn-cancel').onclick  = closeMemberModal;
  document.getElementById('member-btn-save').onclick    = saveMember;
  document.getElementById('member-btn-delete').onclick  = deleteMemberFromSheet;

  document.getElementById('member-modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('member-modal-overlay')) closeMemberModal();
  });
  ```

  Legg også til Escape-støtte for person-modalen i den eksisterende `keydown`-handleren. Finn:
  ```javascript
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') saveTask();
  });
  ```
  Erstatt med:
  ```javascript
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeModal();
      closeMemberModal();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      if (!document.getElementById('member-modal-overlay').classList.contains('hidden')) {
        saveMember();
      } else {
        saveTask();
      }
    }
  });
  ```

- [ ] **Steg 3: Legg til `.superpowers/` i `.gitignore`**

  Sjekk om `.gitignore` finnes:
  ```bash
  cat /home/ricky/Dokumenter/Koding/FilmProsjekter/.gitignore 2>/dev/null || echo "mangler"
  ```

  Legg til linjen `.superpowers/` i `.gitignore` (opprett filen om den ikke finnes):
  ```bash
  echo ".superpowers/" >> /home/ricky/Dokumenter/Koding/FilmProsjekter/.gitignore
  ```

- [ ] **Steg 4: Manuell end-to-end test**

  Kjør lokalt (`python3 -m http.server 8080`), åpne http://localhost:8080 i nettleser.

  Test følgende:
  1. Klikk «👥 Team» — tabellen lastes, stats/view-toggle/«+ Ny oppgave» forsvinner
  2. Klikk «+ Legg til person» — modalen åpnes
  3. Lagre uten navn — feilmelding vises, fokus på navnfeltet
  4. Fyll inn navn + rolle + e-post + mobil → Lagre — personen dukker opp i tabellen
  5. Klikk på raden → Rediger-modalen åpner med riktige data
  6. Oppdater rolle → Lagre — endringen vises i tabellen
  7. Åpne en rad → Slett → bekreft → raden forsvinner
  8. Klikk «📋 Oppgaver» — kanban-tavlen vises igjen, stats og knapper er tilbake
  9. Escape lukker person-modalen
  10. Ctrl+Enter i person-modalen lagrer

- [ ] **Steg 5: Commit**

  ```bash
  git add app.js .gitignore
  git commit -m "feat: koble til tab-switching og person-modal event listeners"
  ```

---

## Task 8: Push og verifiser på GitHub Pages

**Files:**
- Ingen kodeendringer

- [ ] **Steg 1: Push til GitHub**

  ```bash
  git push origin main
  ```

- [ ] **Steg 2: Vent på GitHub Pages-bygg (~1 min)**

  Sjekk status: https://github.com/Rickymoe/FilmProsjektet/actions

- [ ] **Steg 3: Verifiser live-siden**

  Åpne https://rickymoe.github.io/FilmProsjektet/ og hard-refresh (Ctrl+Shift+R).

  Test:
  - Tab-nav vises og fungerer
  - Team-fanen laster teammedlemmer fra Sheets
  - Legg til, rediger og slett fungerer end-to-end mot Google Sheets
