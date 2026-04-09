# Scanner Window — Design Recipe

Standard layout för alla scanner-komponenter i RaccoonLagoon.
Följ detta mönster exakt när du skapar en ny scanner.

---

## Layout

```
┌─────────────────────────────────────────┐
│ Label               [Visa] [Scan] [●]   │  ← Header
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │  [img] Titel                        │ │
│ │ [img] Titel                         │ │  ← Lista (accordion, hidden default)
│ │ [img] Titel                         │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│ 4st Source | Source         04-07 15:30 │  ← Footer
└─────────────────────────────────────────┘
```

---

## HTML-struktur

```html
<div class="card" id="[prefix]Card">

  <!-- Header: label vänster, knappar höger -->
  <div class="[prefix]-header">
    <label class="section-label">Scanner Name</label>
    <div class="[prefix]-row-right">
      <button class="[prefix]-view-btn" id="[prefix]AllToggle">Visa</button>
      <button class="[prefix]-scan-btn" id="[prefix]ScanBtn">Scan</button>
      <label class="toggle-switch">
        <input type="checkbox" id="[prefix]AutoScanToggle" />
        <span class="slider"></span>
      </label>
    </div>
  </div>

  <!-- Lista: accordion, hidden som default -->
  <div class="[prefix]-all-wrap">
    <div id="[prefix]List" class="[prefix]-list" hidden></div>
  </div>

  <!-- Footer: status vänster, tid höger -->
  <div class="[prefix]-footer">
    <span class="scan-status" id="[prefix]Status">Status: Idle</span>
    <span class="[prefix]-last-scan" id="[prefix]LastScan"></span>
  </div>

</div>
```

Byt ut `[prefix]` mot komponentens korta namn, t.ex. `fg` (freegames), `rust`, `lidl`.

---

## CSS-regler

```css
/* Header */
.[prefix]-header {
  display:         flex;
  justify-content: space-between;
  align-items:     center;
  margin-bottom:   6px;
}

.[prefix]-row-right {
  display:     flex;
  align-items: center;
  gap:         6px;
}

/* Knappar — Visa och Scan, samma storlek */
.[prefix]-scan-btn,
.[prefix]-view-btn {
  padding:       3px 10px;
  font-size:     11px;
  font-weight:   600;
  border-radius: var(--radius-xs);
  cursor:        pointer;
  transition:    opacity var(--t-fast), border-color var(--t-fast), color var(--t-fast);
}

.[prefix]-scan-btn {
  background: var(--purple);
  color:      #fff;
  border:     none;
}

.[prefix]-view-btn {
  background: transparent;
  color:      var(--text-muted);
  border:     1px solid var(--border);
}

.[prefix]-view-btn:hover  { color: var(--text-secondary); border-color: var(--border); }
.[prefix]-view-btn.active { border-color: var(--purple-border); color: var(--purple-light); background: color-mix(in srgb, var(--purple) 10%, transparent); }
.[prefix]-scan-btn:hover  { opacity: 0.85; }
.[prefix]-scan-btn:disabled,
.[prefix]-view-btn:disabled { opacity: 0.45; cursor: not-allowed; }

/* Lista */
.[prefix]-list {
  display:        flex;
  flex-direction: column;
  gap:            6px;
  margin-top:     4px;
  max-height:     320px;
  overflow-y:     auto;
  padding:        4px;
  background:     var(--bg-raised);
  border:         1px dashed var(--border);
  border-radius:  var(--radius-md);
}

/* Footer */
.[prefix]-footer {
  display:         flex;
  justify-content: space-between;
  align-items:     center;
  margin-top:      4px;
  font-size:       11px;
  color:           var(--text-muted);
}

.[prefix]-last-scan {
  text-align: right;
}
```

---

## Listrad med bild

Varje item i listan är en klickbar `<a>` med thumbnail + innehåll:

```
┌──────────────────────────────────────────┐
│ [44×44] Titel                  Badge $pr │
└──────────────────────────────────────────┘
```

```css
.[prefix]-item {
  display:         flex;
  align-items:     center;
  gap:             10px;
  padding:         8px 10px;
  background:      var(--bg-card);
  border:          1px solid var(--border-subtle);
  border-radius:   var(--radius-sm);
  text-decoration: none;
  color:           var(--text-primary);
  transition:      border-color var(--t-fast), background var(--t-fast);
}

.[prefix]-thumb {
  width:          44px;
  height:         44px;
  object-fit:     cover;
  border-radius:  var(--radius-xs);
  flex-shrink:    0;
  background:     var(--bg-card);
  pointer-events: none;
}
```

---

## Footer-status format

```
4st Steam | Epic
```

- Antal items som plain text (`4st `)
- Källnamn som klickbara `<a>`-länkar separerade med ` | `
- Ingen "Status:"-prefix

Tid visas som: `04-07 | 15:30` (ingen label, höger sida)

---

## JS-mönster

```js
// Exportera template + init — samma mönster som alla komponenter
export const template = `...`;
export function init() { ... }

// Accordion: Visa-knappen togglar .active + list.hidden
viewBtn.addEventListener('click', () => {
  const open = !list.hidden;
  list.hidden = open;
  viewBtn.classList.toggle('active', !open);
});

// Scan: visa skeleton → kör scan → rendera resultat
scanBtn.addEventListener('click', async () => {
  scanBtn.disabled = true;
  renderSkeletons();
  list.hidden = false;
  viewBtn.classList.add('active');
  // ... fetch ...
  renderItems(results);
  scanBtn.disabled = false;
});

// Tid-format
function formatTime(timestamp) {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  const mm  = String(d.getMonth() + 1).padStart(2, '0');
  const dd  = String(d.getDate()).padStart(2, '0');
  const hh  = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${mm}-${dd} | ${hh}:${min}`;
}
```

---

## Skeleton loader

Visas i listan under scan, samma dimensioner som riktiga items:

```css
@keyframes [prefix]-shimmer {
  0%   { background-position:  200% 0; }
  100% { background-position: -200% 0; }
}

.[prefix]-skeleton-thumb,
.[prefix]-skeleton-line {
  background: linear-gradient(90deg, var(--bg-card) 25%, var(--bg-hover) 50%, var(--bg-card) 75%);
  background-size: 200% 100%;
  animation: [prefix]-shimmer 1.4s infinite linear;
}

.[prefix]-skeleton-thumb { width: 44px; height: 44px; border-radius: var(--radius-xs); }
.[prefix]-skeleton-line  { height: 11px; border-radius: 4px; }
```

---

## Komponent-filer

```
components/[name]/
  [name].js       — export { template, init }
  [name].css      — alla stilar för komponenten
  [name]-background.js  — chrome.runtime.onMessage + scan-logik
  [name]-storage.js     — chrome.storage helpers
```

Injiceras i sidepanel.js:
```js
import { template as [name]Tpl, init as init[Name] } from '../components/[name]/[name].js';
document.getElementById('[name]Mount').outerHTML = [name]Tpl;
init[Name]();
```

Placeholder i sidepanel.html:
```html
<div id="[name]Mount"></div>
```
