// smartmat-scanner.js — Mat-scanner UI (ICA, Coop, Willys, Lidl)

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
    <button class="smat-pill active" data-store="willys">Wi<span class="smat-pill-wll">LL</span>Y:S</button>
    <button class="smat-pill active" data-store="lidl">Lidl</button>
  </div>

  <div class="smat-progress" id="smatProgress">
    <div class="smat-progress-bar" id="smatProgressBar"></div>
  </div>

  <div class="smat-search-row">
    <input type="text" class="smat-search-input" id="smatSearch" placeholder="Sök produkt…" autocomplete="off" />
  </div>

  <div class="smat-sort-bar" id="smatSortBar">
    <button class="smat-sort-btn active" data-sort="newest">Nyast</button>
    <button class="smat-sort-btn" data-sort="cheapest">Billigast</button>
    <button class="smat-sort-btn" data-sort="az">A–Ö</button>
  </div>

  <div id="smatList" class="smat-list"></div>

  <div class="smat-shopping-wrap" id="smatShoppingWrap">
    <div class="smat-shopping-header" id="smatShoppingHeader">
      <span>Inköpslista</span>
      <span class="smat-shopping-toggle-icon">▾</span>
    </div>
    <div class="smat-shopping-body" id="smatShoppingBody">
      <div class="smat-shopping-add-row">
        <input type="text" class="smat-shopping-input" id="smatShoppingInput" placeholder="Lägg till fritext…" autocomplete="off" />
        <button class="smat-shopping-add-btn" id="smatShoppingAddBtn">+</button>
      </div>
      <div class="smat-shopping-list" id="smatShoppingList"></div>
    </div>
  </div>

  <div class="smat-footer">
    <span id="smatStatus">Idle</span>
    <span id="smatLastScan" class="smat-last-scan"></span>
  </div>
</div>
`;

const ALL_STORES = ['ica', 'coop', 'willys', 'lidl'];

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
  let activeStores  = new Set(ALL_STORES);
  let scanEnabled   = { ica: true, coop: true, willys: true, lidl: true };

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
    if (e.key === 'Enter') addCustomItem();
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
  const SCAN_GRADIENT = 'linear-gradient(to right, #E8475F 0% 25%, #00943A 25% 50%, #111111 50% 75%, #e6c000 75% 100%)';

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
      const res = await sendMsg({ type: 'SMARTMAT_SCAN', store });
      if (!res || res.success !== true) throw new Error(res?.error || 'Okänt fel');
      status.textContent = (res.count ?? 0) + 'st från ' + store.toUpperCase();
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
    const text = shoppingInput?.value.trim();
    if (!text) return;
    const id = 'custom-' + Date.now();
    shoppingItems.push({ type: 'custom', id, text });
    shoppingInput.value = '';
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
    shoppingList.innerHTML = '';
    for (const item of shoppingItems) {
      const row = document.createElement('div');
      row.className = 'smat-list-item';

      const text = document.createElement('span');
      text.className = 'smat-list-item-text';
      text.textContent = item.type === 'custom' ? item.text : item.name;
      row.appendChild(text);

      const btn = document.createElement('button');
      btn.className = 'smat-list-item-remove';
      btn.textContent = '×';
      btn.title = 'Ta bort';
      btn.addEventListener('click', () => removeShoppingItem(item.id));
      row.appendChild(btn);

      shoppingList.appendChild(row);
    }
  }

  function saveShoppingList() {
    chrome.storage.local.set({ smartmatList: shoppingItems }).catch(() => {});
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
  const n = parseFloat(String(priceStr || '').replace(/[^\d.,]/g, '').replace(',', '.'));
  return isNaN(n) ? Infinity : n;
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
