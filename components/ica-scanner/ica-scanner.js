// components/ica-scanner/ica-scanner.js — ICA Erbjudanden UI

export const template = `
<div class="card" id="icaScannerCard">
  <div class="ica-header">
    <label class="section-label">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
      ICA Erbjudanden
    </label>
    <div class="ica-row-right">
      <button class="ica-view-btn" id="icaAllToggle">Visa</button>
      <button class="ica-scan-btn" id="icaScanBtn">Scan</button>
      <label class="toggle-switch">
        <input type="checkbox" id="icaAutoScanToggle" />
        <span class="slider"></span>
      </label>
    </div>
  </div>
  <div class="ica-url-row">
    <input type="url" class="ica-url-input" id="icaStoreUrl"
      placeholder="https://www.ica.se/erbjudanden/din-butik-id/" />
  </div>
  <div class="ica-all-wrap">
    <div id="icaList" class="ica-list" hidden></div>
  </div>
  <div class="ica-footer">
    <span id="icaStatus">Idle</span>
    <span id="icaLastScan" class="ica-last-scan"></span>
  </div>
</div>
`;

export function init() {
  const scanBtn    = document.getElementById('icaScanBtn');
  const list       = document.getElementById('icaList');
  const status     = document.getElementById('icaStatus');
  const autoToggle = document.getElementById('icaAutoScanToggle');
  const lastScanEl = document.getElementById('icaLastScan');
  const viewBtn    = document.getElementById('icaAllToggle');
  const urlInput   = document.getElementById('icaStoreUrl');

  if (!scanBtn || !list || !status) return;

  loadInitialState();

  scanBtn.addEventListener('click', async () => {
    scanBtn.disabled = true;
    renderSkeletons();
    list.hidden = false;
    viewBtn?.classList.add('active');

    try {
      const res = await chrome.runtime.sendMessage({ type: 'ICA_SCAN' });
      if (!res || res.success !== true) throw new Error(res?.error || 'Okänt fel');

      const data     = await Storage.get(['icaProducts', 'icaLastScanAt']);
      const products = Array.isArray(data.icaProducts) ? data.icaProducts : [];
      renderProducts(products);
      updateLastScan(lastScanEl, data.icaLastScanAt);
      renderFooterStatus(status, products.length);
    } catch (err) {
      console.error('[ICA] Scan failed:', err);
      status.textContent = 'Fel — ' + (err?.message || 'Okänt fel');
    } finally {
      scanBtn.disabled = false;
    }
  });

  viewBtn?.addEventListener('click', async () => {
    if (!list.hidden) {
      list.hidden = true;
      viewBtn.classList.remove('active');
      return;
    }

    const data     = await Storage.get(['icaProducts']);
    const products = Array.isArray(data.icaProducts) ? data.icaProducts : [];

    if (products.length === 0) {
      list.hidden = true;
      viewBtn.classList.remove('active');
      status.textContent = 'Inga erbjudanden — kör Scan först';
      return;
    }

    renderProducts(products);
    list.hidden = false;
    viewBtn.classList.add('active');
  });

  urlInput?.addEventListener('change', () => {
    const url = urlInput.value.trim();
    Storage.set({ icaStoreUrl: url || null });
  });

  autoToggle?.addEventListener('change', async () => {
    try {
      await chrome.runtime.sendMessage({ type: 'ICA_SET_AUTO', enabled: autoToggle.checked });
    } catch (err) {
      console.error('[ICA] Auto-scan toggle failed:', err);
    }
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if ('icaProducts' in changes) {
      const products = Array.isArray(changes.icaProducts.newValue) ? changes.icaProducts.newValue : [];
      if (!list.hidden) renderProducts(products);
      if (products.length > 0) renderFooterStatus(status, products.length);
    }
    if ('icaLastScanAt' in changes) {
      updateLastScan(lastScanEl, changes.icaLastScanAt.newValue);
    }
    if ('icaAutoScanEnabled' in changes && autoToggle) {
      autoToggle.checked = changes.icaAutoScanEnabled.newValue === true;
    }
  });

  async function loadInitialState() {
    const data = await Storage.get(['icaProducts', 'icaLastScanAt', 'icaAutoScanEnabled', 'icaStoreUrl']);
    if (autoToggle) autoToggle.checked = data.icaAutoScanEnabled === true;
    if (urlInput && data.icaStoreUrl) urlInput.value = data.icaStoreUrl;
    updateLastScan(lastScanEl, data.icaLastScanAt);
    const products = Array.isArray(data.icaProducts) ? data.icaProducts : [];
    if (products.length > 0) renderFooterStatus(status, products.length);
  }
}

// ─── Footer status ─────────────────────────────────────────────────────────────
function renderFooterStatus(el, count) {
  el.textContent = '';
  el.appendChild(document.createTextNode(count + 'st '));
  const a = document.createElement('a');
  a.href        = 'https://www.ica.se/erbjudanden/';
  a.target      = '_blank';
  a.rel         = 'noopener';
  a.className   = 'ica-status-link';
  a.textContent = 'ICA';
  el.appendChild(a);
}

// ─── Skeleton loader ───────────────────────────────────────────────────────────
function renderSkeletons(count = 4) {
  const list = document.getElementById('icaList');
  if (!list) return;
  list.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const item = document.createElement('div');
    item.className = 'ica-item ica-skeleton';

    const thumb = document.createElement('div');
    thumb.className = 'ica-skeleton-thumb';
    item.appendChild(thumb);

    const content = document.createElement('div');
    content.className = 'ica-content';
    content.appendChild(Object.assign(document.createElement('div'), { className: 'ica-skeleton-line ica-skeleton-line--title' }));
    content.appendChild(Object.assign(document.createElement('div'), { className: 'ica-skeleton-line ica-skeleton-line--meta' }));
    item.appendChild(content);

    list.appendChild(item);
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function updateLastScan(el, timestamp) {
  if (!el) return;
  if (!timestamp) { el.textContent = ''; return; }
  const d   = new Date(timestamp);
  const mm  = String(d.getMonth() + 1).padStart(2, '0');
  const dd  = String(d.getDate()).padStart(2, '0');
  const hh  = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  el.textContent = `${mm}-${dd} | ${hh}:${min}`;
}

function renderProducts(products) {
  const list = document.getElementById('icaList');
  if (!list) return;
  list.innerHTML = '';
  if (!products.length) return;

  for (const p of products) {
    const item = document.createElement('a');
    item.className = 'ica-item';
    item.href      = p.url || '#';
    item.target    = '_blank';
    item.rel       = 'noopener';

    if (p.image) {
      const img = document.createElement('img');
      img.className = 'ica-thumb';
      img.src = p.image; img.alt = ''; img.loading = 'lazy';
      item.appendChild(img);
    }

    const content = document.createElement('div');
    content.className = 'ica-content';
    content.appendChild(Object.assign(document.createElement('div'), { className: 'ica-name', textContent: p.name || 'Produkt' }));

    const meta = document.createElement('div');
    meta.className = 'ica-meta';
    meta.appendChild(Object.assign(document.createElement('span'), { className: 'ica-price', textContent: p.price || '?' }));
    if (p.dateText) {
      meta.appendChild(Object.assign(document.createElement('span'), { className: 'ica-date', textContent: p.dateText }));
    }
    content.appendChild(meta);

    item.appendChild(content);
    list.appendChild(item);
  }
}
