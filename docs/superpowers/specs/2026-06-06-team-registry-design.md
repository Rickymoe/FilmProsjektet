# Team Registry — Design Spec
**Dato:** 2026-06-06
**Prosjekt:** FilmProsjekter (https://rickymoe.github.io/FilmProsjektet/)

---

## Oversikt

Legg til en «Team»-fane i portalen der 10–20 filmteammedlemmer kan registreres med navn, rolle, e-post og mobilnummer. Data lagres i et nytt ark i eksisterende Google Spreadsheet. Ingen autentisering — samme åpne modell som oppgavedelen.

---

## Datamodell

Nytt ark i ProsjektA-regnearket (ID: `1GCW6VUrmC-A5EjqgIOtilqbZU4422KnEePjhjKXwkdU`):

**Arknavn:** `Team`

| Kolonne | Type | Påkrevd |
|---------|------|---------|
| Navn | Tekst | Ja |
| Rolle | Tekst | Nei |
| E-post | Tekst | Nei |
| Mobil | Tekst | Nei |

Rad 1 er header. Tomme rader filtreres bort (samme logikk som `Prosjektoppgaver`).

---

## Arkitektur

### Lesing
Sheets API v4 med eksisterende `API_KEY` og `SPREADSHEET_ID`. Ny konstant `TEAM_SHEET_NAME = 'Team'`. Samme `FORMATTED_VALUE`-modus som oppgaver.

### Skriving
Apps Script (`Code.gs`) utvides med:
- `addMember(sheet, p)` — `sheet.appendRow([navn, rolle, epost, mobil])`
- `updateMember(sheet, p)` — `sheet.getRange(row, 1, 1, 4).setValues([...])`
- `deleteMember(sheet, p)` — `sheet.deleteRow(row)`

`doGet` får tre nye handlinger: `addmember`, `updatemember`, `deletemember`. Bruker samme `APPS_SCRIPT_URL` — ingen ny deployment nødvendig, kun oppdatering av eksisterende.

---

## UI

### Navigasjon
Fanerad under eksisterende header med to faner:
- `📋 Oppgaver` (aktiv som standard)
- `👥 Team`

`setMainTab(tab)` skjuler/viser oppgave-visningen (`#board`, `#table-view`) vs. team-visningen (`#team-view`). Header-knappene «+ Ny oppgave», visningsveksler og stats skjules når Team-fanen er aktiv.

### Teamvisning (`#team-view`)
- Antall-label øverst til venstre: «N teammedlemmer»
- «+ Legg til person»-knapp øverst til høyre
- Tabell med kolonner: Navn (med avatar-initial), Rolle, E-post, Mobil, Rediger-knapp
- Klikk på rad eller «Rediger» åpner person-modalen

### Person-modal
Felt: Navn (påkrevd), Rolle, E-post, Mobil.
Footer: «Slett»-knapp (kun ved redigering) + «Avbryt» + «Lagre».
Validering: tomt Navn gir feiltoast og fokus på feltet.

---

## Endringer per fil

| Fil | Endring |
|-----|---------|
| `index.html` | Legg til fanenavigasjon, `#team-view` seksjon og person-modal |
| `app.js` | `TEAM_SHEET_NAME`, `fetchMembers()`, `renderTeamTable()`, `openMemberModal()`, `saveMember()`, `deleteMember()`, `setMainTab()` |
| `apps-script/Code.gs` | `TEAM_SHEET_NAME`, `addMember()`, `updateMember()`, `deleteMember()`, tre nye `action`-greiner i `doGet` |
| `style.css` | Stiler for fanenavigasjon og team-tabell (gjenbruk av eksisterende `.task-table`-stiler) |

---

## Ikke i scope

- Kobling mellom «Eier»-felt på oppgaver og teamregisteret (Eier forblir fritekst)
- Autentisering eller tilgangskontroll
- Profilbilder
- Søk/filtrering i teamlisten
