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
