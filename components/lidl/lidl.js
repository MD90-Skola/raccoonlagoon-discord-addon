// components/lidl/lidl.js — Lidl reklamblad UI

export const template = `
<div class="card" id="lidlCard">
  <div class="lidl-header">
    <label class="section-label">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
      Lidl Reklamblad
    </label>
    <div class="lidl-row-right">
      <button class="lidl-view-btn" id="lidlAllToggle">Visa</button>
      <button class="lidl-scan-btn" id="lidlFetchBtn">Scan</button>
      <label class="toggle-switch">
        <input type="checkbox" id="lidlAutoScanToggle" />
        <span class="slider"></span>
      </label>
    </div>
  </div>
  <div class="lidl-all-wrap">
    <div id="lidlList" class="lidl-list" hidden></div>
  </div>
  <div class="lidl-footer">
    <span class="scan-status" id="lidlStatus">Idle</span>
    <span class="lidl-last-scan" id="lidlLastScan"></span>
  </div>
</div>
`;

export function init() {
  const btn        = document.getElementById('lidlFetchBtn');
  const list       = document.getElementById('lidlList');
  const status     = document.getElementById('lidlStatus');
  const autoToggle = document.getElementById('lidlAutoScanToggle');
  const lastScanEl = document.getElementById('lidlLastScan');
  const viewBtn    = document.getElementById('lidlAllToggle');

  if (!btn || !list || !status) return;

  loadInitialState();

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    renderSkeletons();
    list.hidden = false;
    viewBtn?.classList.add('active');

    try {
      const res = await chrome.runtime.sendMessage({ type: 'LIDL_FETCH' });
      if (!res || res.success !== true) throw new Error(res?.error || 'Okänt fel');

      const leaflets = Array.isArray(res.leaflets) ? res.leaflets : [];
      await chrome.storage.local.set({ lidlLeaflets: leaflets, lidlLastFetch: Date.now() });
      renderLeaflets(leaflets);
      updateLastScan(lastScanEl, Date.now());
      renderFooterStatus(status, leaflets.length);
    } catch (err) {
      console.error('[Lidl] Fetch failed:', err);
      status.textContent = 'Fel — ' + (err?.message || 'Okänt fel');
    } finally {
      btn.disabled = false;
    }
  });

  viewBtn?.addEventListener('click', async () => {
    if (!list.hidden) {
      list.hidden = true;
      viewBtn.classList.remove('active');
      return;
    }

    const data = await Storage.get(['lidlLeaflets']);
    const leaflets = Array.isArray(data.lidlLeaflets) ? data.lidlLeaflets : [];

    if (leaflets.length === 0) {
      list.hidden = true;
      viewBtn.classList.remove('active');
      status.textContent = 'Inga reklamblad — kör Scan först';
      return;
    }

    renderLeaflets(leaflets);
    list.hidden = false;
    viewBtn.classList.add('active');
  });

  autoToggle?.addEventListener('change', async () => {
    try {
      await chrome.runtime.sendMessage({ type: 'LIDL_SET_AUTO', enabled: autoToggle.checked });
    } catch (err) {
      console.error('[Lidl] Auto-scan toggle failed:', err);
    }
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if ('lidlLeaflets' in changes) {
      const leaflets = Array.isArray(changes.lidlLeaflets.newValue) ? changes.lidlLeaflets.newValue : [];
      if (!list.hidden) renderLeaflets(leaflets);
    }
    if ('lidlLastFetch' in changes) {
      updateLastScan(lastScanEl, changes.lidlLastFetch.newValue);
    }
    if ('lidlAutoScan' in changes && autoToggle) {
      autoToggle.checked = changes.lidlAutoScan.newValue === true;
    }
  });

  async function loadInitialState() {
    const data = await Storage.get(['lidlLeaflets', 'lidlLastFetch', 'lidlAutoScan']);
    if (autoToggle) autoToggle.checked = data.lidlAutoScan === true;
    updateLastScan(lastScanEl, data.lidlLastFetch);
    const leaflets = Array.isArray(data.lidlLeaflets) ? data.lidlLeaflets : [];
    if (leaflets.length > 0) renderFooterStatus(status, leaflets.length);
  }
}

// ─── Footer status ─────────────────────────────────────────────────────────────
function renderFooterStatus(el, count) {
  el.textContent = '';
  el.appendChild(document.createTextNode(count + 'st '));
  const a = document.createElement('a');
  a.href        = 'https://www.lidl.se/c/reklamblad/s10018018';
  a.target      = '_blank';
  a.rel         = 'noopener';
  a.className   = 'lidl-status-link';
  a.textContent = 'Lidl';
  el.appendChild(a);
}

// ─── Skeleton loader ───────────────────────────────────────────────────────────
function renderSkeletons(count = 3) {
  const list = document.getElementById('lidlList');
  if (!list) return;
  list.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const item = document.createElement('div');
    item.className = 'lidl-item lidl-skeleton';

    const thumb = document.createElement('div');
    thumb.className = 'lidl-skeleton-thumb';
    item.appendChild(thumb);

    const body = document.createElement('div');
    body.className = 'lidl-item-body';
    body.appendChild(Object.assign(document.createElement('div'), { className: 'lidl-skeleton-line lidl-skeleton-line--title' }));
    body.appendChild(Object.assign(document.createElement('div'), { className: 'lidl-skeleton-line lidl-skeleton-line--dates' }));
    item.appendChild(body);

    item.appendChild(Object.assign(document.createElement('div'), { className: 'lidl-skeleton-badge' }));
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

function renderLeaflets(leaflets) {
  const list = document.getElementById('lidlList');
  if (!list) return;
  list.innerHTML = '';
  if (!Array.isArray(leaflets) || leaflets.length === 0) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();

  const sorted = [...leaflets].sort((a, b) => {
    const rank = l => {
      const s = new Date(l.startDate); s.setHours(0, 0, 0, 0);
      const e = new Date(l.endDate);   e.setHours(0, 0, 0, 0);
      if (todayMs >= s.getTime() && todayMs <= e.getTime()) return 0;
      if (todayMs < s.getTime()) return 1;
      return 2;
    };
    const ra = rank(a), rb = rank(b);
    if (ra !== rb) return ra - rb;
    if (ra === 0) return a.endDate - b.endDate;
    if (ra === 1) return a.startDate - b.startDate;
    return b.endDate - a.endDate;
  });

  for (const leaf of sorted) {
    const startDay = new Date(leaf.startDate); startDay.setHours(0, 0, 0, 0);
    const endDay   = new Date(leaf.endDate);   endDay.setHours(0, 0, 0, 0);

    let state, badgeText, badgeMod;
    if (todayMs < startDay.getTime()) {
      const daysUntil = Math.round((startDay - today) / 86400000);
      state = 'upcoming'; badgeMod = 'lidl-badge--upcoming';
      badgeText = daysUntil === 1 ? 'Startar imorgon' : `Startar om ${daysUntil} dagar`;
    } else if (todayMs <= endDay.getTime()) {
      const daysLeft = Math.round((endDay - today) / 86400000);
      state = 'active'; badgeMod = 'lidl-badge--active';
      badgeText = daysLeft === 0 ? 'Sista dagen' : `${daysLeft} dag${daysLeft === 1 ? '' : 'ar'} kvar`;
    } else {
      state = 'expired'; badgeMod = 'lidl-badge--expired'; badgeText = 'Utgått';
    }

    const item = document.createElement('a');
    item.className = `lidl-item lidl-item--${state}`;
    item.href      = leaf.url || 'https://www.lidl.se/c/reklamblad/s10018018';
    item.target    = '_blank';
    item.rel       = 'noopener';

    if (leaf.image) {
      const img = document.createElement('img');
      img.className = 'lidl-thumb';
      img.src = leaf.image; img.alt = ''; img.loading = 'lazy';
      item.appendChild(img);
    }

    const body = document.createElement('div');
    body.className = 'lidl-item-body';
    body.appendChild(Object.assign(document.createElement('div'), { className: 'lidl-title', textContent: leaf.title || 'Reklamblad' }));

    const startStr = new Date(leaf.startDate).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
    const endStr   = new Date(leaf.endDate  ).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
    body.appendChild(Object.assign(document.createElement('div'), { className: 'lidl-dates', textContent: `${startStr} – ${endStr}` }));
    item.appendChild(body);

    item.appendChild(Object.assign(document.createElement('span'), { className: `lidl-badge ${badgeMod}`, textContent: badgeText }));
    list.appendChild(item);
  }
}
