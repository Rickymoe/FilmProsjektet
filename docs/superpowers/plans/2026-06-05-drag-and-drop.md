# Drag & Drop – Kanban Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Brukere skal kunne dra et kanban-kort til en annen statuskolonne og få statusen lagret automatisk til Google Sheets.

**Architecture:** HTML5 Drag and Drop API med optimistisk UI-oppdatering. Kortet flyttes visuelt med én gang. Lagring skjer i bakgrunnen via eksisterende `writeTask()`. Feiler lagringen, rulles endringen tilbake og bruker får feil-toast.

**Tech Stack:** Vanilla JS, HTML5 DnD API, CSS transitions — ingen nye avhengigheter.

---

## Filer

- Modify: `style.css` — legg til `.card.dragging` og `.column-body.drag-over`
- Modify: `app.js` — endre `makeCard()`, endre `renderBoard()`, legg til `moveTask()`

---

### Task 1: CSS – dragtilstander

**Files:**
- Modify: `style.css` (etter linje 244: `.card.overdue { ... }`)

- [ ] **Steg 1: Legg til CSS på slutten av kortseksjonen**

Finn linjen `.card.overdue { border-color: rgba(255,82,82,.35); }` (linje 244) og legg til rett etter:

```css
.card.dragging        { opacity: .4; cursor: grabbing; }
.column-body.drag-over {
  background: rgba(74,158,255,.07);
  outline: 2px dashed var(--blue);
  outline-offset: -4px;
  border-radius: var(--rs);
}
```

- [ ] **Steg 2: Verifiser visuelt**

Åpne `https://rickymoe.github.io/FilmProsjektet/` (eller lokalt) og bekreft at ingen eksisterende stiler er ødelagt (ingen kompileringsfeil siden dette er ren CSS).

---

### Task 2: `makeCard()` — gjør kort draggable

**Files:**
- Modify: `app.js` — funksjonen `makeCard()` (linje 71–99)

- [ ] **Steg 1: Legg til `draggable` og `dragstart`-handler**

Finn denne linjen i `makeCard()`:
```js
card.className = `card${overdue ? ' overdue' : ''}`;
card.onclick   = () => openModal(task);
```

Erstatt med:
```js
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
```

- [ ] **Steg 2: Manuell test**

Last inn siden i nettleseren. Prøv å dra et kort — det skal bli gjennomsiktig (opacity .4) mens det dras. Slipp det tilbake i samme kolonne (ingen endring skal skje ennå).

---

### Task 3: `renderBoard()` og `moveTask()` — slipp og lagre

**Files:**
- Modify: `app.js` — funksjonen `renderBoard()` (linje 58–68) og ny funksjon `moveTask()`

- [ ] **Steg 1: Legg til `moveTask()`**

Legg til denne funksjonen rett før `renderBoard()` (før linje 58):

```js
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
```

- [ ] **Steg 2: Legg til drop-handlers i `renderBoard()`**

Finn denne blokken i `renderBoard()`:
```js
function renderBoard() {
  STATUSES.forEach((status, i) => {
    const col      = document.getElementById(COL_IDS[i]);
    const countEl  = document.getElementById(`count-${i}`);
    const filtered = tasks.filter(t => t['Status'] === status);

    countEl.textContent = filtered.length;
    col.innerHTML = '';
    filtered.forEach(t => col.appendChild(makeCard(t)));
  });
  renderStats();
}
```

Erstatt med:
```js
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
```

- [ ] **Steg 3: Manuell test — gullsti**

1. Last inn siden
2. Dra et kort fra «Ikke startet» til «Pågår»
3. Kortet skal flytte seg umiddelbart
4. Toast «Status oppdatert ✓» skal vises
5. Åpne Google Sheets og bekreft at statuskolonnen er oppdatert

- [ ] **Steg 4: Manuell test — feilhåndtering**

For å simulere feil: sett `APPS_SCRIPT_URL = ''` midlertidig i `app.js`, dra et kort, bekreft at kortet flyttes tilbake og at feil-toast vises. Sett `APPS_SCRIPT_URL` tilbake etterpå.

- [ ] **Steg 5: Commit**

```bash
cd /home/ricky/Dokumenter/Koding/FilmProsjekter
git add app.js style.css
git commit -m "feat: drag and drop cards between kanban columns"
git push
```

---

### Task 4: Verifiser live på GitHub Pages

- [ ] **Steg 1: Åpne live side**

Gå til `https://rickymoe.github.io/FilmProsjektet/` etter at GitHub Pages har bygget (~1 min).

- [ ] **Steg 2: Test drag & drop end-to-end**

Dra et kort til en annen kolonne. Bekreft at Google Sheets-arket oppdateres.
