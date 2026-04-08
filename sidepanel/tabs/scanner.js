// scanner.js — Scanner-fliken (Rust Finder + inner tabs)

export const template = `
<div class="scanner-inner-tabs">
  <button class="scanner-inner-tab active" data-inner-tab="object">Object</button>
  <button class="scanner-inner-tab" data-inner-tab="mat">Mat</button>
</div>
<div id="scannerInnerObject">
<div class="card" id="rustFinderCard">
  <div class="rust-header">
    <label class="section-label">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
      Rust Finder
    </label>
    <div class="rust-row-right">
      <button class="rust-view-btn" id="rustAllToggle">Visa</button>
      <button class="rust-scan-btn" id="startScanBtn">Scan</button>
      <label class="toggle-switch">
        <input type="checkbox" id="rustAutoScanToggle" />
        <span class="slider"></span>
      </label>
    </div>
  </div>

  <div id="rustNewSection" hidden>
    <div class="rust-section-header rust-section-header--new">Nya produkter</div>
    <div class="dlc-list" id="rustNewList"></div>
  </div>

  <div id="rustSaleSection" hidden>
    <div class="rust-section-header rust-section-header--sale">Aktiva reor</div>
    <div class="dlc-list" id="rustSaleList"></div>
  </div>

  <div id="rustChangedSection" hidden>
    <div class="rust-section-header rust-section-header--changed">Prisändringar</div>
    <div class="dlc-list" id="rustChangedList"></div>
  </div>

  <div class="rust-all-wrap">
    <div class="rust-sort-bar" id="rustSortBar" hidden>
      <button class="rust-sort-btn active" data-sort="newest">Nyast</button>
      <button class="rust-sort-btn" data-sort="cheapest">Billigast</button>
      <button class="rust-sort-btn" data-sort="discount">Högst rea</button>
    </div>
    <div class="dlc-list" id="rustAllList" hidden></div>
  </div>

  <div class="rust-footer">
    <span id="scanStatus">Idle</span>
    <span id="rustLastScan" class="rust-last-scan"></span>
  </div>
</div>
  <div id="freeGamesMount"></div>
</div>
<div id="scannerInnerMat" hidden>
  <div id="lidlMount"></div>
  <div id="smartmatMount"></div>
</div>
`;

export function init() {
  const tabBtn          = document.getElementById('scannerTabBtn');
  const tabPane         = document.getElementById('tab-scanner');

  const startScanBtn    = document.getElementById('startScanBtn');
  const scanStatus      = document.getElementById('scanStatus');
  const autoScanToggle  = document.getElementById('rustAutoScanToggle');
  const lastScanEl      = document.getElementById('rustLastScan');

  const allToggleBtn    = document.getElementById('rustAllToggle');
  const allList         = document.getElementById('rustAllList');
  const sortBar         = document.getElementById('rustSortBar');
  let   currentSort     = 'newest';

  if (!tabBtn || !tabPane) return;

  // ─── Inner tabs (Object / Mat) ──────────────────────────────────────────
  const innerObject = document.getElementById('scannerInnerObject');
  const innerMat    = document.getElementById('scannerInnerMat');

  document.querySelectorAll('.scanner-inner-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.scanner-inner-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const target = btn.dataset.innerTab;
      if (innerObject) innerObject.hidden = target !== 'object';
      if (innerMat)    innerMat.hidden    = target !== 'mat';
    });
  });

  loadInitialState();

  startScanBtn?.addEventListener('click', async () => {
    startScanBtn.disabled = true;
    scanStatus.textContent = 'Scanning…';
    renderRustSkeletons();

    try {
      const response = await sendRuntimeMessage({ type: 'RUST_SCAN_FULL' });

      if (!response?.success) {
        throw new Error(response?.error || 'Unknown error');
      }

      setRustCount(scanStatus, response.count ?? 0);

      const data = await Storage.get(['rustLastScanAt', 'rustAlerts', 'rustProducts']);
      updateLastScanLabel(lastScanEl, data.rustLastScanAt);
      renderRustResults(data);

      if (!allList.hidden) {
        renderAllProducts(data.rustProducts ?? {}, allList, currentSort);
      }
    } catch (error) {
      console.error('[RaccoonLagoon] Rust scan failed:', error);
      scanStatus.textContent = 'Error — ' + (error?.message || 'Unknown error');
    } finally {
      startScanBtn.disabled = false;
    }
  });

  autoScanToggle?.addEventListener('change', () => {
    Storage.set({ rustAutoScanEnabled: autoScanToggle.checked });
  });

  allToggleBtn?.addEventListener('click', async () => {
    if (!allList.hidden) {
      allList.hidden  = true;
      sortBar.hidden  = true;
      allToggleBtn.classList.remove('active');
      return;
    }

    const data     = await Storage.get(['rustProducts']);
    const products = data.rustProducts ?? {};

    if (Object.keys(products).length === 0) {
      allList.hidden = true;
      sortBar.hidden = true;
      allToggleBtn.classList.remove('active');
      scanStatus.textContent = 'Inga produkter — kör Scan först';
      return;
    }

    renderAllProducts(products, allList, currentSort);
    allList.hidden = false;
    sortBar.hidden = false;
    allToggleBtn.classList.add('active');
  });

  sortBar?.addEventListener('click', async (e) => {
    const btn = e.target.closest('.rust-sort-btn');
    if (!btn) return;

    sortBar.querySelectorAll('.rust-sort-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentSort = btn.dataset.sort;

    const data     = await Storage.get(['rustProducts']);
    const products = data.rustProducts ?? {};
    renderAllProducts(products, allList, currentSort);
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;

    if ('rustReaEnabled' in changes) {
      setTabVisible(tabBtn, tabPane, changes.rustReaEnabled.newValue === true);
    }

    if ('rustAutoScanEnabled' in changes && autoScanToggle) {
      autoScanToggle.checked = changes.rustAutoScanEnabled.newValue === true;
    }

    if ('rustLastScanAt' in changes || 'rustAlerts' in changes || 'rustProducts' in changes) {
      Storage.get(['rustLastScanAt', 'rustAlerts', 'rustProducts']).then((data) => {
        updateLastScanLabel(lastScanEl, data.rustLastScanAt);
        renderRustResults(data);

        const count = Object.keys(data.rustProducts ?? {}).length;
        if (count > 0) setRustCount(scanStatus, count);

        if (!allList.hidden) {
          renderAllProducts(data.rustProducts ?? {}, allList, currentSort);
        }
      });
    }
  });

  async function loadInitialState() {
    const data = await Storage.get([
      'rustReaEnabled',
      'rustAutoScanEnabled',
      'rustLastScanAt',
      'rustAlerts',
      'rustProducts'
    ]);

    setTabVisible(tabBtn, tabPane, data.rustReaEnabled === true);

    if (autoScanToggle) {
      autoScanToggle.checked = data.rustAutoScanEnabled === true;
    }

    updateLastScanLabel(lastScanEl, data.rustLastScanAt);
    renderRustResults(data);
    const count = Object.keys(data.rustProducts ?? {}).length;
    if (count > 0) setRustCount(scanStatus, count);
  }
}

// ─── Footer status ─────────────────────────────────────────────────────────────
function setRustCount(el, count) {
  if (!el) return;
  el.textContent = '';
  el.appendChild(document.createTextNode(count + 'st '));
  const a = document.createElement('a');
  a.href        = 'https://store.steampowered.com/itemstore/252490/browse/?filter=All&cc=us&l=en';
  a.target      = '_blank';
  a.rel         = 'noopener';
  a.className   = 'rust-status-link';
  a.textContent = 'Rust';
  el.appendChild(a);
}

function setTabVisible(tabBtn, tabPane, visible) {
  tabBtn.hidden = !visible;
  if (!visible && !tabPane.hidden) {
    document.querySelector('[data-tab="home"]')?.click();
  }
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

// ─── Rust results ──────────────────────────────────────────────────────────────
function renderRustResults(data) {
  const alerts   = Array.isArray(data.rustAlerts) ? data.rustAlerts : [];
  const products = data.rustProducts ?? {};

  const newSection     = document.getElementById('rustNewSection');
  const saleSection    = document.getElementById('rustSaleSection');
  const changedSection = document.getElementById('rustChangedSection');
  const newList        = document.getElementById('rustNewList');
  const saleList       = document.getElementById('rustSaleList');
  const changedList    = document.getElementById('rustChangedList');

  renderSection(newSection, newList,
    alerts.filter((a) => a.type === 'new'),
    (a) => makeRow(a.url, a.name, '', a.price, '', products[String(a.id)]?.image)
  );
  renderSection(saleSection, saleList,
    alerts.filter((a) => a.type === 'sale_started'),
    (a) => makeRow(a.url, a.name, `-${a.discount}%`, a.price, 'discounted', products[String(a.id)]?.image)
  );
  renderSection(changedSection, changedList,
    alerts.filter((a) => a.type === 'price_changed'),
    (a) => makeRow(a.url, a.name, '', a.newPrice, 'discounted', products[String(a.id)]?.image,
      a.oldPrice !== '?' ? a.oldPrice : null)
  );
}

function renderSection(section, list, items, makeRowFn) {
  if (!section || !list) return;
  list.innerHTML = '';
  section.hidden = items.length === 0;
  for (const item of items) list.appendChild(makeRowFn(item));
}

function parsePrice(priceStr) {
  const n = parseFloat(String(priceStr || '').replace(/[^\d.,]/g, '').replace(',', '.'));
  return isNaN(n) ? Infinity : n;
}

function renderAllProducts(productsMap, allList, sort = 'newest') {
  const entries = Object.values(productsMap).sort((a, b) => {
    if (sort === 'cheapest') return parsePrice(a.price) - parsePrice(b.price);
    if (sort === 'discount') return (b.discountPercent || 0) - (a.discountPercent || 0);
    return (b.lastSeen || 0) - (a.lastSeen || 0);
  });

  allList.innerHTML = '';
  for (const p of entries) {
    allList.appendChild(makeRow(
      p.url, p.name,
      p.isOnSale ? `-${p.discountPercent}%` : '',
      p.price,
      p.isOnSale ? 'discounted' : '',
      p.image
    ));
  }
}

function makeRow(url, name, badgeText, priceText, priceClass, image, oldPrice = null) {
  const row = document.createElement('a');
  row.className = 'dlc-item' + (priceClass ? ' on-sale' : '');
  row.href = url || '#';
  row.target = '_blank';
  row.rel = 'noopener';

  if (image) {
    const img = document.createElement('img');
    img.className = 'dlc-thumb';
    img.src = image; img.alt = ''; img.loading = 'lazy';
    row.appendChild(img);
  }

  const content = document.createElement('div');
  content.className = 'dlc-content';

  content.appendChild(Object.assign(document.createElement('div'), { className: 'dlc-name', textContent: name || 'Unknown' }));

  const right = document.createElement('div');
  right.className = 'dlc-right';

  if (badgeText) right.appendChild(Object.assign(document.createElement('span'), { className: 'dlc-badge', textContent: badgeText }));
  if (oldPrice)  right.appendChild(Object.assign(document.createElement('span'), { className: 'dlc-price dlc-price--old', textContent: oldPrice }));
  right.appendChild(Object.assign(document.createElement('span'), { className: 'dlc-price' + (priceClass ? ' ' + priceClass : ''), textContent: priceText || '?' }));

  content.appendChild(right);
  row.appendChild(content);
  return row;
}

// ─── Skeleton loader ───────────────────────────────────────────────────────────
function renderRustSkeletons(count = 4) {
  const allList      = document.getElementById('rustAllList');
  const allToggleBtn = document.getElementById('rustAllToggle');
  if (!allList) return;

  allList.innerHTML = '';
  allList.hidden    = false;
  sortBar: {
    const sortBar = document.getElementById('rustSortBar');
    if (sortBar) sortBar.hidden = false;
  }
  allToggleBtn?.classList.add('active');

  for (let i = 0; i < count; i++) {
    const item = document.createElement('div');
    item.className = 'dlc-item dlc-skeleton';

    const thumb = document.createElement('div');
    thumb.className = 'dlc-skeleton-thumb';
    item.appendChild(thumb);

    const content = document.createElement('div');
    content.className = 'dlc-content';
    content.appendChild(Object.assign(document.createElement('div'), { className: 'dlc-skeleton-line dlc-skeleton-line--title' }));
    content.appendChild(Object.assign(document.createElement('div'), { className: 'dlc-skeleton-line dlc-skeleton-line--price' }));
    item.appendChild(content);
    allList.appendChild(item);
  }
}

function sendRuntimeMessage(message) {
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
