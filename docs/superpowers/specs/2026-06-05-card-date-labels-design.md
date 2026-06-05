# Design: Labellede datoer på kanban-kort

**Dato:** 2026-06-05

## Mål

Vise både startdato og sluttdato på kanban-kort med tydelige etiketter, slik at brukeren vet hva datoen betyr.

## Løsning

Erstatt gjeldende enkeltdato-visning i `makeCard()` med to labellede linjer:

- `Start: DD.MM.ÅÅÅÅ` — vises kun hvis startdato finnes
- `Frist: DD.MM.ÅÅÅÅ` — vises kun hvis sluttdato finnes; beholder rød «Forfalt»-merking ved overskredet frist

## Endringer

- **`app.js`** — `makeCard()`: erstatt `card-date`-span med to separate spans med prefix-tekst
- Ingen CSS-endringer

## Ikke inkludert

- Startdato vises ikke med overdue-styling (kun fristen er relevant for forfallsmarkering)
