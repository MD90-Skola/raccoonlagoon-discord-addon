// smartmat-scanner.js — Mat-scanner UI (ICA, Coop, Willys, Lidl)
import { CATEGORIES, getCategory } from './product-categories.js';

export const template = `
<div id="smartmatCard">
  <div class="smat-header">
    <label class="section-label">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
      Mat-scanner
    </label>
    <div class="smat-header-right">
      <button class="smat-opts-btn" id="smatOptsBtn" title="URL-inställningar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
      </button>
      <button class="smat-scan-all-btn" id="smatScanAllBtn">Scan alla</button>
    </div>
  </div>

  <div class="smat-opts-panel" id="smatOptsPanel" hidden>
    <div class="smat-opts-row" data-store="ica">
      <span class="smat-opts-label">ICA</span>
      <input class="smat-opts-input" id="smatUrlIca" type="url" placeholder="https://www.ica.se/erbjudanden/din-butik-id/" />
      <label class="toggle-switch smat-opts-toggle"><input type="checkbox" id="smatScanIca" checked /><span class="slider"></span></label>
      <button class="smat-opts-clear" data-store="ica" title="Rensa ICA-data">×</button>
    </div>
    <div class="smat-opts-row" data-store="coop">
      <span class="smat-opts-label">Coop</span>
      <input class="smat-opts-input" id="smatUrlCoop" type="url" placeholder="https://www.coop.se/erbjudanden/" />
      <label class="toggle-switch smat-opts-toggle"><input type="checkbox" id="smatScanCoop" checked /><span class="slider"></span></label>
      <button class="smat-opts-clear" data-store="coop" title="Rensa Coop-data">×</button>
    </div>
    <div class="smat-opts-row" data-store="willys">
      <span class="smat-opts-label">Willys</span>
      <input class="smat-opts-input" id="smatUrlWillys" type="url" placeholder="https://www.willys.se/erbjudanden" />
      <label class="toggle-switch smat-opts-toggle"><input type="checkbox" id="smatScanWillys" checked /><span class="slider"></span></label>
      <button class="smat-opts-clear" data-store="willys" title="Rensa Willys-data">×</button>
    </div>
    <div class="smat-opts-row smat-opts-subrow">
      <span class="smat-opts-label smat-opts-label--indent">↳ Butik</span>
      <input class="smat-opts-input" id="smatWillysStore" type="text" placeholder="T.ex. Traneredsvägen 39" autocomplete="off" />
    </div>
    <div class="smat-opts-row" data-store="lidl">
      <span class="smat-opts-label">Lidl</span>
      <input class="smat-opts-input" id="smatUrlLidl" type="url" placeholder="https://www.lidl.se/c/lidl-plus-erbjudanden/a10091753" />
      <label class="toggle-switch smat-opts-toggle"><input type="checkbox" id="smatScanLidl" checked /><span class="slider"></span></label>
      <button class="smat-opts-clear" data-store="lidl" title="Rensa Lidl-data">×</button>
    </div>
    <div class="smat-opts-divider"></div>
    <div class="smat-opts-row smat-opts-row--daily">
      <span class="smat-opts-daily-label">Daglig scan</span>
      <span class="smat-opts-daily-next" id="smatDailyNext"></span>
      <label class="toggle-switch smat-opts-toggle"><input type="checkbox" id="smatDailyScan" /><span class="slider"></span></label>
    </div>
  </div>

  <div class="smat-store-pills">
    <button class="smat-pill active" data-store="ica">ICA</button>
    <button class="smat-pill active" data-store="coop">Coop</button>
    <button class="smat-pill active" data-store="willys">Willys</button>
    <button class="smat-pill active" data-store="lidl">Lidl</button>
  </div>

  <div class="smat-progress" id="smatProgress">
    <div class="smat-progress-bar" id="smatProgressBar"></div>
  </div>

  <div class="smat-search-row">
    <svg class="smat-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
    <input type="text" class="smat-search-input" id="smatSearch" placeholder="Sök produkt…" autocomplete="off" />
  </div>

  <div class="smat-toolbar">
    <div class="smat-sort-bar" id="smatSortBar">
      <button class="smat-sort-btn active" data-sort="newest">Nyast</button>
      <button class="smat-sort-btn" data-sort="cheapest">Billigast</button>
      <button class="smat-sort-btn" data-sort="az">A–Ö</button>
    </div>
    <button class="smat-view-toggle" id="smatGridToggle" title="Visa i grid">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>
    </button>
  </div>
  <div class="smat-quick-filters" id="smatQuickFilters"></div>

  <div id="smatList" class="smat-list"></div>

  <div class="smat-shopping-wrap" id="smatShoppingWrap">
    <div class="smat-shopping-header" id="smatShoppingHeader">
      <span>Inköpslista</span>
      <span class="smat-shopping-toggle-icon">▾</span>
    </div>
    <div class="smat-shopping-body" id="smatShoppingBody">
      <div class="smat-recommendation" id="smatRecommendation" hidden></div>
      <div class="smat-shopping-add-row">
        <input type="text" class="smat-shopping-input" id="smatShoppingInput" placeholder="Lägg till vara…" autocomplete="off" />
        <button class="smat-shopping-add-btn" id="smatShoppingAddBtn">+</button>
      </div>
      <div class="smat-shopping-list" id="smatShoppingList"></div>
      <div class="smat-shopping-total" id="smatShoppingTotal" hidden></div>
    </div>
  </div>

  <div class="smat-footer">
    <span id="smatStatus">Idle</span>
    <span id="smatLastScan" class="smat-last-scan"></span>
  </div>
</div>
`;

const ALL_STORES = ['ica', 'coop', 'willys', 'lidl'];

// Snabb-chips i inköpslistan
const QUICK_ITEMS = [
  'Ägg', 'Mjölk', 'Fil', 'Yoghurt', 'Grädde', 'Smör', 'Ost',
  'Bröd', 'Knäckebröd',
  'Kyckling', 'Köttfärs', 'Fläsk', 'Bacon',
  'Fisk', 'Lax', 'Räkor',
  'Tomat', 'Gurka', 'Lök', 'Potatis', 'Morötter', 'Banan', 'Äpple',
  'Pasta', 'Ris', 'Havregryn',
  'Glass', 'Juice', 'Kaffe', 'Te'
];

// Autocorrect: engelska ord + vanliga stavfel → rätt svensk form
const SPELL_ALIASES = {
  // Engelska → Svenska
  'egg': 'Ägg',   'eggs': 'Ägg',
  'milk': 'Mjölk',
  'bread': 'Bröd',
  'butter': 'Smör',
  'cheese': 'Ost',
  'yogurt': 'Yoghurt',
  'cream': 'Grädde',
  'chicken': 'Kyckling',
  'fish': 'Fisk',
  'salmon': 'Lax',
  'shrimp': 'Räkor', 'prawns': 'Räkor',
  'onion': 'Lök',   'onions': 'Lök',
  'potato': 'Potatis', 'potatoes': 'Potatis',
  'carrot': 'Morötter', 'carrots': 'Morötter',
  'banana': 'Banan', 'bananas': 'Banan',
  'apple': 'Äpple', 'apples': 'Äpple',
  'rice': 'Ris',
  'oats': 'Havregryn',
  'coffee': 'Kaffe',
  'tea': 'Te',
  'icecream': 'Glass', 'ice cream': 'Glass',
  'meat': 'Kött',
  'pork': 'Fläsk',
  'bacon': 'Bacon',
  // Svenska stavfel
  'kafe': 'Kaffe',   'kafee': 'Kaffe',  'coffe': 'Kaffe',
  'mjolk': 'Mjölk',  'miolk': 'Mjölk',  'mjölck': 'Mjölk',
  'agg': 'Ägg',      'äg': 'Ägg',
  'brod': 'Bröd',    'brord': 'Bröd',   'bröd': 'Bröd',
  'smar': 'Smör',    'smor': 'Smör',
  'aplen': 'Äpple',  'äplen': 'Äpple',
  'morotter': 'Morötter', 'moroter': 'Morötter',
  'lax': 'Lax',
  'raka': 'Räkor',   'rakor': 'Räkor',
  'kottfars': 'Köttfärs', 'kotfars': 'Köttfärs',
};


export function init() {
  const scanAllBtn     = document.getElementById('smatScanAllBtn');
  const optsBtn        = document.getElementById('smatOptsBtn');
  const optsPanel      = document.getElementById('smatOptsPanel');
  const progressEl     = document.getElementById('smatProgress');
  const progressBar    = document.getElementById('smatProgressBar');
  const searchInput    = document.getElementById('smatSearch');
  const sortBar        = document.getElementById('smatSortBar');
  const list           = document.getElementById('smatList');
  const status         = document.getElementById('smatStatus');
  const lastScanEl     = document.getElementById('smatLastScan');
  const shoppingWrap   = document.getElementById('smatShoppingWrap');
  const shoppingHeader = document.getElementById('smatShoppingHeader');
  const shoppingInput  = document.getElementById('smatShoppingInput');
  const shoppingAddBtn = document.getElementById('smatShoppingAddBtn');
  const shoppingList   = document.getElementById('smatShoppingList');

  const urlInputs = {
    ica:    document.getElementById('smatUrlIca'),
    coop:   document.getElementById('smatUrlCoop'),
    willys: document.getElementById('smatUrlWillys'),
    lidl:   document.getElementById('smatUrlLidl')
  };

  const willysStoreInput = document.getElementById('smatWillysStore');

  const scanToggles = {
    ica:    document.getElementById('smatScanIca'),
    coop:   document.getElementById('smatScanCoop'),
    willys: document.getElementById('smatScanWillys'),
    lidl:   document.getElementById('smatScanLidl')
  };

  if (!list || !status) return;

  let allProducts   = [];
  let shoppingItems = [];
  let currentSort   = 'newest';
  let searchTerm    = '';
  let scanning      = false;
  let isGridView     = false;
  let activeCategory = null; // nyckel ur CATEGORIES, t.ex. "kott", eller null = alla
  let activeStores   = new Set(ALL_STORES);
  let scanEnabled    = { ica: true, coop: true, willys: true, lidl: true };

  const gridToggle      = document.getElementById('smatGridToggle');
  const quickFiltersEl  = document.getElementById('smatQuickFilters');

  // ─── Bygg kategori-knappar dynamiskt ───────────────────────────────────────
  if (quickFiltersEl) {
    for (const [key, cat] of Object.entries(CATEGORIES)) {
      const btn = document.createElement('button');
      btn.className = 'smat-qfilter';
      btn.dataset.category = key;
      btn.textContent = cat.label;
      btn.style.setProperty('--cat-color', cat.color);
      btn.addEventListener('click', () => {
        activeCategory = activeCategory === key ? null : key;
        quickFiltersEl.querySelectorAll('.smat-qfilter').forEach(b => {
          b.classList.toggle('active', b.dataset.category === activeCategory);
        });
        filterAndRender();
      });
      quickFiltersEl.appendChild(btn);
    }
  }

  // Skapa dropdown som direkt barn till body — undviker stacking context-problem
  const suggestionsEl = document.createElement('div');
  suggestionsEl.className = 'smat-suggestions';
  suggestionsEl.hidden = true;
  document.body.appendChild(suggestionsEl);

  loadInitialState();

  // ─── Options panel toggle ──────────────────────────────────────────────────
  optsBtn?.addEventListener('click', () => {
    optsPanel.hidden = !optsPanel.hidden;
    optsBtn.classList.toggle('active', !optsPanel.hidden);
  });

  // ─── URL inputs ────────────────────────────────────────────────────────────
  for (const [store, input] of Object.entries(urlInputs)) {
    input?.addEventListener('change', async () => {
      const stored = await Storage.get('smartmatStoreUrls');
      const urls   = stored.smartmatStoreUrls ?? {};
      const val    = input.value.trim();
      if (val) {
        urls[store] = val;
      } else {
        delete urls[store];
      }
      await chrome.storage.local.set({ smartmatStoreUrls: urls });
    });
  }

  const dailyToggle  = document.getElementById('smatDailyScan');
  const dailyNextEl  = document.getElementById('smatDailyNext');

  // ─── Daglig scan ───────────────────────────────────────────────────────────
  dailyToggle?.addEventListener('change', async () => {
    await chrome.storage.local.set({ smartmatDailyScan: dailyToggle.checked });
    updateDailyNextLabel();
  });

  async function updateDailyNextLabel() {
    if (!dailyNextEl) return;
    const alarm = await chrome.alarms.get('smartmat-daily');
    if (alarm) {
      const d   = new Date(alarm.scheduledTime);
      const hh  = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      const dd  = String(d.getDate()).padStart(2, '0');
      const mm  = String(d.getMonth() + 1).padStart(2, '0');
      dailyNextEl.textContent = `nästa ${dd}/${mm} ${hh}:${min}`;
    } else {
      dailyNextEl.textContent = '';
    }
  }

  // ─── Rensa butiksdata ──────────────────────────────────────────────────────
  document.querySelectorAll('.smat-opts-clear').forEach(btn => {
    btn.addEventListener('click', async () => {
      const store = btn.dataset.store;
      allProducts = allProducts.filter(p => p.store !== store);
      const existing = await chrome.storage.local.get('smartmatProducts');
      const filtered = (existing.smartmatProducts ?? []).filter(p => p.store !== store);
      await chrome.storage.local.set({ smartmatProducts: filtered });
      filterAndRender();
      renderFooterCount();
      status.textContent = store.toUpperCase() + '-data rensad';
    });
  });

  // ─── Willys butiksnamn ─────────────────────────────────────────────────────
  willysStoreInput?.addEventListener('change', async () => {
    const val = willysStoreInput.value.trim();
    if (val) {
      await chrome.storage.local.set({ smartmatWillysStore: val });
    } else {
      await chrome.storage.local.remove('smartmatWillysStore');
    }
  });

  // ─── Scan toggles ─────────────────────────────────────────────────────────
  for (const [store, toggle] of Object.entries(scanToggles)) {
    toggle?.addEventListener('change', async () => {
      scanEnabled[store] = toggle.checked;
      await chrome.storage.local.set({ smartmatScanEnabled: { ...scanEnabled } });
    });
  }

  // ─── Store pills — visibility toggles ─────────────────────────────────────
  document.querySelectorAll('.smat-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const store = pill.dataset.store;
      if (activeStores.has(store)) {
        activeStores.delete(store);
        pill.classList.remove('active');
      } else {
        activeStores.add(store);
        pill.classList.add('active');
      }
      filterAndRender();
    });
  });

  // ─── Scan alla ─────────────────────────────────────────────────────────────
  scanAllBtn?.addEventListener('click', async () => {
    if (scanning) return;
    const toScan = ALL_STORES.filter(s => scanEnabled[s]);
    if (toScan.length === 0) {
      status.textContent = 'Inga butiker aktiverade — slå på minst en i inställningar';
      return;
    }
    scanning = true;
    scanAllBtn.disabled = true;
    setProgress(0, false);

    let done = 0;
    for (const store of toScan) {
      await runScan(store);
      done++;
      setProgress(done / toScan.length, done === toScan.length);
    }

    scanning = false;
    scanAllBtn.disabled = false;
  });

  // ─── Sök ───────────────────────────────────────────────────────────────────
  searchInput?.addEventListener('input', () => {
    searchTerm = searchInput.value.trim().toLowerCase();
    filterAndRender();
  });

  // ─── Sort ──────────────────────────────────────────────────────────────────
  sortBar?.addEventListener('click', (e) => {
    const btn = e.target.closest('.smat-sort-btn');
    if (!btn) return;
    sortBar.querySelectorAll('.smat-sort-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentSort = btn.dataset.sort;
    filterAndRender();
  });

  // ─── Inköpslista toggle ────────────────────────────────────────────────────
  shoppingHeader?.addEventListener('click', () => {
    shoppingWrap.classList.toggle('open');
  });

  // ─── Lägg till fritext ─────────────────────────────────────────────────────
  shoppingAddBtn?.addEventListener('click', () => addCustomItem());
  shoppingInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { addCustomItem(); if (suggestionsEl) suggestionsEl.hidden = true; }
    if (e.key === 'Escape') { if (suggestionsEl) suggestionsEl.hidden = true; }
  });

  // ─── Autocomplete förslag ──────────────────────────────────────────────────
  shoppingInput?.addEventListener('input', () => {
    const q = shoppingInput.value.trim().toLowerCase();
    if (!q || !suggestionsEl) { if (suggestionsEl) suggestionsEl.hidden = true; return; }

    // Alias-match (egg → Ägg) läggs överst
    const alias    = SPELL_ALIASES[q];
    const starts   = QUICK_ITEMS.filter(w => w.toLowerCase().startsWith(q));
    const contains = QUICK_ITEMS.filter(w => !w.toLowerCase().startsWith(q) && w.toLowerCase().includes(q));
    const pool     = [...starts, ...contains];
    if (alias && !pool.some(w => w.toLowerCase() === alias.toLowerCase())) pool.unshift(alias);
    const matches  = pool.slice(0, 5);

    if (matches.length === 0) { suggestionsEl.hidden = true; return; }

    suggestionsEl.innerHTML = '';
    for (const word of matches) {
      const item = document.createElement('div');
      item.className   = 'smat-suggestion-item';
      item.textContent = word;
      item.addEventListener('mousedown', (e) => {
        e.preventDefault(); // hindra blur-event från att stänga listan först
        shoppingInput.value = word;
        suggestionsEl.hidden = true;
        addCustomItem();
      });
      suggestionsEl.appendChild(item);
    }

    // Positionera fixed dropdown under inputen
    const rect = shoppingInput.getBoundingClientRect();
    suggestionsEl.style.left  = rect.left  + 'px';
    suggestionsEl.style.top   = rect.bottom + 'px';
    suggestionsEl.style.width = rect.width  + 'px';
    suggestionsEl.hidden = false;
  });

  shoppingInput?.addEventListener('blur', () => {
    setTimeout(() => { if (suggestionsEl) suggestionsEl.hidden = true; }, 150);
  });

  // ─── Grid toggle ───────────────────────────────────────────────────────────
  gridToggle?.addEventListener('click', () => {
    isGridView = !isGridView;
    list.classList.toggle('grid', isGridView);
    gridToggle.classList.toggle('active', isGridView);
    gridToggle.title = isGridView ? 'Visa som lista' : 'Visa i grid';
    gridToggle.innerHTML = isGridView
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>';
  });

  // ─── Storage changes ───────────────────────────────────────────────────────
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if ('smartmatProducts' in changes) {
      allProducts = Array.isArray(changes.smartmatProducts.newValue)
        ? changes.smartmatProducts.newValue
        : [];
      filterAndRender();
      renderFooterCount();
    }
    if ('smartmatLastScanAt' in changes) {
      updateLastScanLabel(lastScanEl, changes.smartmatLastScanAt.newValue);
    }
  });

  // ─── Progress bar ──────────────────────────────────────────────────────────
  // Gradient pinned to the track's pixel width — bar clips it as it grows.
  const SCAN_GRADIENT = 'linear-gradient(to right, #f05272 0% 25%, #22c55e 25% 50%, #ef4444 50% 75%, #f0b429 75% 100%)';

  function setProgress(fraction, isDone = false) {
    if (!progressBar) return;
    progressBar.style.width = Math.round(fraction * 100) + '%';

    if (isDone) {
      progressBar.style.backgroundImage    = 'none';
      progressBar.style.backgroundColor    = 'var(--green)';
      progressBar.style.backgroundSize     = '';
    } else if (fraction > 0) {
      const trackW = progressEl?.offsetWidth || 200;
      progressBar.style.backgroundImage    = SCAN_GRADIENT;
      progressBar.style.backgroundSize     = trackW + 'px 100%';
      progressBar.style.backgroundPosition = '0 0';
      progressBar.style.backgroundRepeat   = 'no-repeat';
      progressBar.style.backgroundColor    = 'transparent';
    }
  }

  // ─── Scan-funktion ─────────────────────────────────────────────────────────
  async function runScan(store) {
    status.textContent = 'Scannar ' + store.toUpperCase() + '…';
    renderSkeletons();

    try {
      const prev = await chrome.storage.local.get('smartmatProducts');
      const hadStoreData = (prev.smartmatProducts ?? []).some(p => p.store === store);

      const res = await sendMsg({ type: 'SMARTMAT_SCAN', store });
      if (!res || res.success !== true) throw new Error(res?.error || 'Okänt fel');
      status.textContent = (res.count ?? 0) + 'st från ' + store.toUpperCase();

      if (!hadStoreData && (res.count ?? 0) > 0) {
        chrome.storage.local.set({ smartmatHasNew: true });
      }
    } catch (err) {
      console.error('[Smartmat] Scan failed:', store, err);
      status.textContent = 'Fel ' + store + ' — ' + (err?.message || 'okänt');
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  function filterAndRender() {
    let items = allProducts.filter(p => activeStores.has(p.store));

    if (searchTerm) {
      items = items.filter(p => (p.name || '').toLowerCase().includes(searchTerm));
    }

    if (activeCategory) {
      items = items.filter(p => getCategory(p.name) === activeCategory);
    }

    if (currentSort === 'cheapest') {
      items.sort((a, b) => parsePrice(a.price) - parsePrice(b.price));
    } else if (currentSort === 'az') {
      items.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'sv'));
    } else {
      items.sort((a, b) => (b.scannedAt || 0) - (a.scannedAt || 0));
    }

    renderItems(items);
  }

  function renderItems(items) {
    list.innerHTML = '';

    const listIds     = new Set(shoppingItems.filter(i => i.type === 'product').map(i => i.id));
    const customTexts = shoppingItems.filter(i => i.type === 'custom').map(i => i.text.toLowerCase());

    for (const p of items) {
      const el = document.createElement('div');
      el.className = 'smat-item';
      el.dataset.store = p.store || '';
      el.dataset.id    = p.id;

      const inList  = listIds.has(p.id);
      const matched = customTexts.some(t => t && (p.name || '').toLowerCase().includes(t));

      if (inList)  el.classList.add('in-list');
      if (matched) el.classList.add('list-match');

      if (p.image) {
        const img = document.createElement('img');
        img.className = 'smat-item-thumb';
        img.src = p.image; img.alt = ''; img.loading = 'lazy';
        el.appendChild(img);
      }

      const content = document.createElement('div');
      content.className = 'smat-item-content';

      const nameEl = document.createElement('div');
      nameEl.className = 'smat-item-name';
      nameEl.textContent = p.name || 'Produkt';
      content.appendChild(nameEl);

      const meta = document.createElement('div');
      meta.className = 'smat-item-meta';

      const priceEl = document.createElement('span');
      priceEl.className = 'smat-item-price';
      priceEl.textContent = p.price || '?';
      meta.appendChild(priceEl);

      if (p.dateText && p.dateText !== 'Veckans erbjudanden') {
        const dateEl = document.createElement('span');
        dateEl.className = 'smat-item-date';
        dateEl.textContent = p.dateText;
        meta.appendChild(dateEl);
      }

      content.appendChild(meta);
      el.appendChild(content);

      const badge = document.createElement('span');
      badge.className = 'smat-item-store-badge';
      badge.textContent = p.store || '';
      el.appendChild(badge);

      const check = document.createElement('div');
      check.className = 'smat-item-check';
      check.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';
      el.appendChild(check);

      el.addEventListener('click', () => toggleProductInList(p, el));
      list.appendChild(el);
    }
  }

  function renderSkeletons(count = 4) {
    list.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const item = document.createElement('div');
      item.className = 'smat-item smat-skeleton';

      const thumb = document.createElement('div');
      thumb.className = 'smat-skeleton-thumb';
      item.appendChild(thumb);

      const content = document.createElement('div');
      content.className = 'smat-item-content';
      content.appendChild(Object.assign(document.createElement('div'), { className: 'smat-skeleton-line smat-skeleton-line--title' }));
      content.appendChild(Object.assign(document.createElement('div'), { className: 'smat-skeleton-line smat-skeleton-line--meta' }));
      item.appendChild(content);

      list.appendChild(item);
    }
  }

  function renderFooterCount() {
    const visible = allProducts.filter(p => activeStores.has(p.store)).length;
    if (allProducts.length > 0) {
      status.textContent = visible + ' / ' + allProducts.length + 'st produkter';
    }
  }

  // ─── Inköpslista ───────────────────────────────────────────────────────────
  function toggleProductInList(product, el) {
    const idx = shoppingItems.findIndex(i => i.type === 'product' && i.id === product.id);
    if (idx >= 0) {
      shoppingItems.splice(idx, 1);
      el.classList.remove('in-list');
    } else {
      shoppingItems.push({ type: 'product', id: product.id, name: product.name });
      el.classList.add('in-list');
    }
    saveShoppingList();
    renderShoppingList();
    filterAndRender();
  }

  function addCustomItem() {
    const raw = shoppingInput?.value.trim();
    if (!raw) return;
    const text = SPELL_ALIASES[raw.toLowerCase()] ?? raw;
    const id   = 'custom-' + Date.now();
    shoppingItems.push({ type: 'custom', id, text });
    shoppingInput.value = '';
    if (suggestionsEl) suggestionsEl.hidden = true;
    saveShoppingList();
    renderShoppingList();
    filterAndRender();
  }

  function removeShoppingItem(id) {
    shoppingItems = shoppingItems.filter(i => i.id !== id);
    saveShoppingList();
    renderShoppingList();
    filterAndRender();
  }

  function renderShoppingList() {
    renderRecommendation();
    shoppingList.innerHTML = '';

    let totalPrice = 0;
    let totalFound = 0;

    for (const item of shoppingItems) {
      const label   = item.type === 'custom' ? item.text : item.name;
      const term    = label.toLowerCase();
      const matches = allProducts.filter(p => (p.name || '').toLowerCase().includes(term));

      const row = document.createElement('div');
      row.className = 'smat-list-item';

      // × ta bort
      const removeBtn = document.createElement('button');
      removeBtn.className = 'smat-list-item-remove';
      removeBtn.textContent = '×';
      removeBtn.addEventListener('click', (e) => { e.stopPropagation(); removeShoppingItem(item.id); });
      row.appendChild(removeBtn);

      // Namn
      const nameEl = document.createElement('span');
      nameEl.className = 'smat-list-item-text';
      nameEl.textContent = label;
      row.appendChild(nameEl);

      if (matches.length === 1) {
        // Exakt ett resultat — visa pris direkt
        const priceEl = document.createElement('span');
        priceEl.className = 'smat-list-item-price';
        priceEl.textContent = matches[0].price || '?';
        row.appendChild(priceEl);
        const pr = parsePrice(matches[0].price);
        if (isFinite(pr)) { totalPrice += pr; totalFound++; }

      } else if (matches.length > 1) {
        // Flera resultat — klickbar badge som filtrerar listan
        const cheapest = matches.reduce((a, b) => parsePrice(a.price) <= parsePrice(b.price) ? a : b);
        const badge = document.createElement('button');
        badge.className = 'smat-list-item-count';
        badge.textContent = matches.length + 'st';
        badge.addEventListener('click', () => {
          if (searchInput) { searchInput.value = label; searchTerm = term; filterAndRender(); }
        });
        row.appendChild(badge);
        const pr = parsePrice(cheapest.price);
        if (isFinite(pr)) { totalPrice += pr; totalFound++; }
      }
      // 0 resultat — ingen badge

      shoppingList.appendChild(row);
    }

    // Total
    const totalEl = document.getElementById('smatShoppingTotal');
    if (totalEl) {
      if (totalFound > 0) {
        totalEl.hidden = false;
        totalEl.textContent = `Totalt ~${Math.round(totalPrice)} kr`;
      } else {
        totalEl.hidden = true;
      }
    }
  }

  function saveShoppingList() {
    chrome.storage.local.set({ smartmatList: shoppingItems }).catch(() => {});
  }

  // ─── Butiks-rekommendation ──────────────────────────────────────────────────
  function getStoreRec() {
    if (shoppingItems.length === 0 || allProducts.length === 0) return null;

    const scores = {};
    for (const s of ALL_STORES) scores[s] = { count: 0, price: 0, found: [] };

    for (const item of shoppingItems) {
      const term = (item.type === 'product' ? item.name : item.text).toLowerCase().trim();
      if (!term) continue;
      for (const s of ALL_STORES) {
        const matches = allProducts.filter(p => p.store === s && (p.name || '').toLowerCase().includes(term));
        if (matches.length > 0) {
          scores[s].count++;
          scores[s].found.push(item.type === 'product' ? item.name : item.text);
          const cheapest = matches.reduce((a, b) => parsePrice(a.price) <= parsePrice(b.price) ? a : b);
          const pr = parsePrice(cheapest.price);
          if (isFinite(pr)) scores[s].price += pr;
        }
      }
    }

    const ranked = ALL_STORES
      .filter(s => scores[s].count > 0)
      .sort((a, b) => scores[b].count - scores[a].count || scores[a].price - scores[b].price);

    if (ranked.length === 0) return null;
    return { best: ranked[0], total: shoppingItems.length, scores, ranked };
  }

  function renderRecommendation() {
    const el = document.getElementById('smatRecommendation');
    if (!el) return;
    const rec = getStoreRec();
    if (!rec) { el.hidden = true; el.innerHTML = ''; return; }

    const NAMES = { ica: 'ICA', coop: 'Coop', willys: 'Willys', lidl: 'Lidl' };
    const { best, total, scores, ranked } = rec;
    const { count, price } = scores[best];
    const priceStr = price > 0 ? ` · ~${Math.round(price)} kr` : '';
    const allCovered = count === total;

    el.hidden = false;
    el.innerHTML = `
      <div class="smat-rec-row">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="smat-rec-icon"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
        <span class="smat-rec-label">${allCovered ? 'Allt finns hos' : 'Bäst val:'}</span>
        <span class="smat-rec-store" data-store="${best}">${NAMES[best]}</span>
        <span class="smat-rec-count">${count}/${total}${priceStr}</span>
      </div>
      ${ranked.length > 1 ? `<div class="smat-rec-alts">${ranked.slice(1, 3).map(s =>
        `<span class="smat-rec-alt" data-store="${s}">${NAMES[s]} ${scores[s].count}/${total}</span>`
      ).join('')}</div>` : ''}
    `;
  }

  // ─── Initial state ─────────────────────────────────────────────────────────
  async function loadInitialState() {
    const data = await Storage.get([
      'smartmatProducts', 'smartmatLastScanAt', 'smartmatList',
      'smartmatStoreUrls', 'smartmatScanEnabled', 'smartmatWillysStore',
      'smartmatDailyScan'
    ]);
    allProducts   = Array.isArray(data.smartmatProducts) ? data.smartmatProducts : [];
    shoppingItems = Array.isArray(data.smartmatList)     ? data.smartmatList     : [];

    const urls = data.smartmatStoreUrls ?? {};
    for (const [store, input] of Object.entries(urlInputs)) {
      if (input && urls[store]) input.value = urls[store];
    }
    if (willysStoreInput && data.smartmatWillysStore) willysStoreInput.value = data.smartmatWillysStore;
    if (dailyToggle) dailyToggle.checked = data.smartmatDailyScan === true;
    updateDailyNextLabel();

    const saved = data.smartmatScanEnabled ?? {};
    for (const store of ALL_STORES) {
      // default true if key not present
      scanEnabled[store] = saved[store] !== false;
      if (scanToggles[store]) scanToggles[store].checked = scanEnabled[store];
    }

    updateLastScanLabel(lastScanEl, data.smartmatLastScanAt);
    filterAndRender();
    renderShoppingList();
    if (allProducts.length > 0) renderFooterCount();
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parsePrice(priceStr) {
  const s = String(priceStr || '');
  // "2 för 20 kr", "3 FÖR 30:-" → kampanjpris = Y (det du betalar)
  const forMatch = s.match(/\d+\s+f[öo]r\s+([\d,.]+)/i);
  if (forMatch) {
    const n = parseFloat(forMatch[1].replace(',', '.'));
    return isNaN(n) ? Infinity : n;
  }
  // Vanligt pris: plocka första talet ur strängen
  const numMatch = s.match(/([\d]+[,.][\d]+|[\d]+)/);
  if (!numMatch) return Infinity;
  return parseFloat(numMatch[1].replace(',', '.'));
}

function updateLastScanLabel(el, timestamp) {
  if (!el) return;
  if (!timestamp) { el.textContent = ''; return; }
  const d   = new Date(timestamp);
  const mm  = String(d.getMonth() + 1).padStart(2, '0');
  const dd  = String(d.getDate()).padStart(2, '0');
  const hh  = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  el.textContent = `${mm}-${dd} | ${hh}:${min}`;
}

function sendMsg(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(response);
    });
  });
}
