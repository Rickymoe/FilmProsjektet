// ═══════════════════════════════════════════════════════════════════
//  ProsjektA – Apps Script Web App
//
//  OPPSETT:
//  1. Åpne spreadsheet → Utvidelser → Apps Script
//  2. Lim inn hele denne filen som Code.gs
//  3. Klikk "Distribuer" → "Ny distribusjon"
//     - Type: Nettapp
//     - Kjøres som: Meg
//     - Hvem har tilgang: Alle
//  4. Klikk "Distribuer" og godkjenn tillatelser
//  5. Kopier URL-en og lim inn i app.js som APPS_SCRIPT_URL
// ═══════════════════════════════════════════════════════════════════

const SHEET_NAME = 'Prosjektoppgaver';

function doGet(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(15000);

  try {
    const ss     = SpreadsheetApp.getActiveSpreadsheet();
    const sheet  = ss.getSheetByName(SHEET_NAME);
    const action = (e.parameter.action || 'get').toLowerCase();

    let result;
    if      (action === 'get')    result = getData(sheet);
    else if (action === 'add')    result = addRow(sheet, e.parameter);
    else if (action === 'update') result = updateRow(sheet, e.parameter);
    else if (action === 'delete') result = deleteRow(sheet, e.parameter);
    else result = { success: false, error: 'Ukjent action: ' + action };

    return output(result);
  } catch (err) {
    return output({ success: false, error: err.message });
  } finally {
    lock.releaseLock();
  }
}

// ── Read ─────────────────────────────────────────────────────────────────────
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

// ── Add ──────────────────────────────────────────────────────────────────────
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

// ── Update ───────────────────────────────────────────────────────────────────
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

// ── Delete ───────────────────────────────────────────────────────────────────
function deleteRow(sheet, p) {
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
