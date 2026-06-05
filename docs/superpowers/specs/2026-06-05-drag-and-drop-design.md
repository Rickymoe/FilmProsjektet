# Design: Drag & Drop på kanban-kort

**Dato:** 2026-06-05  
**Prosjekt:** FilmProsjektet — kanban-frontend

## Mål

Brukere skal kunne dra et kanban-kort fra én statuskolonne til en annen. Statusendringen lagres automatisk til Google Sheets uten bekreftelsesdialog.

## Tilnærming

HTML5 Drag and Drop API med optimistisk UI-oppdatering. Ingen eksterne biblioteker.

## Dataflyt

1. Brukeren begynner å dra et kort → `dragstart` lagrer kortets `_row` og nåværende status i minnet
2. Kortet dras over en kolonne → `dragover` fremhever målkolonnen visuelt
3. Kortet slippes → `drop` gjør tre ting:
   - Oppdaterer `tasks[]`-arrayen umiddelbart (optimistisk)
   - Re-rendrer bare de to berørte kolonnene
   - Kaller `writeTask('update', { row, status })` i bakgrunnen
4. Hvis `writeTask` feiler → rull tilbake `tasks[]`, re-render, vis feil-toast

## Endringer

### `app.js`
- `makeCard()`: legg til `draggable="true"`, `dragstart`-handler (lagre `_row` og `status`)
- `renderBoard()`: legg til `dragover`, `dragleave`, `drop`-handlers på hver `.column-body`
- Ny hjelpefunksjon `moveTask(row, newStatus)`: optimistisk oppdatering + bakgrunnslagring

### `style.css`
- `.card.dragging` — `opacity: 0.5` mens kortet dras
- `.column-body.drag-over` — synlig highlight (border/bakgrunn) på målkolonne

## Avgrensninger

- Kun statusendring via dra — rekkefølge innad i kolonne endres ikke
- Ingen touch-støtte (kan legges til senere med Pointer Events)
