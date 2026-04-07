// components/lidl/lidl.js — Lidl reklamblad UI

export function initLidl() {
  const btn        = document.getElementById('lidlFetchBtn');
  const list       = document.getElementById('lidlList');
  const status     = document.getElementById('lidlStatus');
  const autoToggle = document.getElementById('lidlAutoScanToggle');
  const lastScanEl = document.getElementById('lidlLastScan');

  if (!btn || !list || !status) return;

  loadInitialState();

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    status.textContent = 'Status: Hämtar...';
    list.innerHTML = '';

    try {
      const res = await chrome.runtime.sendMessage({ type: 'LIDL_FETCH' });
      if (!res || res.success !== true) throw new Error(res?.error || 'Okänt fel');

      const leaflets = Array.isArray(res.leaflets) ? res.leaflets : [];
      await chrome.storage.local.set({ lidlLeaflets: leaflets, lidlLastFetch: Date.now() });
      renderLeaflets(leaflets);
      updateLastScan(lastScanEl, Date.now());
      status.textContent = leaflets.length > 0
        ? `Status: ${leaflets.length} reklamblad hittade`
        : 'Status: Inga reklamblad hittade';
    } catch (err) {
      console.error('[Lidl] Fetch failed:', err);
      status.textContent = 'Status: Fel — ' + (err?.message || 'Okänt fel');
    } finally {
      btn.disabled = false;
    }
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
      renderLeaflets(Array.isArray(changes.lidlLeaflets.newValue) ? changes.lidlLeaflets.newValue : []);
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
    renderLeaflets(leaflets);
    status.textContent = leaflets.length > 0
      ? `Status: ${leaflets.length} reklamblad`
      : 'Status: Idle';
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function updateLastScan(el, timestamp) {
  if (!el) return;
  el.textContent = timestamp
    ? 'Senaste hämtning: ' + new Date(timestamp).toLocaleString('sv-SE')
    : 'Aldrig hämtat';
}

function renderLeaflets(leaflets) {
  const list = document.getElementById('lidlList');
  if (!list) return;
  list.innerHTML = '';
  if (!Array.isArray(leaflets) || leaflets.length === 0) return;

  // Midnight today as reference for all calculations
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();

  // Sort: active (soonest expiry first) → upcoming (soonest start first) → expired
  const sorted = [...leaflets].sort((a, b) => {
    const rank = l => {
      const s = new Date(l.startDate); s.setHours(0, 0, 0, 0);
      const e = new Date(l.endDate);   e.setHours(0, 0, 0, 0);
      if (todayMs >= s.getTime() && todayMs <= e.getTime()) return 0; // active
      if (todayMs < s.getTime()) return 1;                            // upcoming
      return 2;                                                        // expired
    };
    const ra = rank(a), rb = rank(b);
    if (ra !== rb) return ra - rb;
    if (ra === 0) return a.endDate - b.endDate;   // active: least time left first
    if (ra === 1) return a.startDate - b.startDate; // upcoming: starting soonest first
    return b.endDate - a.endDate;                 // expired: most recent first
  });

  for (const leaf of sorted) {
    // Normalise to midnight for clean day diffs
    const startDay = new Date(leaf.startDate); startDay.setHours(0, 0, 0, 0);
    const endDay   = new Date(leaf.endDate);   endDay.setHours(0, 0, 0, 0);

    // ── State: determine from today ─────────────────────────────────────────
    let state, badgeText, badgeMod;

    if (todayMs < startDay.getTime()) {
      // Not started yet
      const daysUntil = Math.round((startDay - today) / 86400000);
      state     = 'upcoming';
      badgeMod  = 'lidl-badge--upcoming';
      badgeText = daysUntil === 1
        ? 'Startar imorgon'
        : `Startar om ${daysUntil} dag${daysUntil === 1 ? '' : 'ar'}`;

    } else if (todayMs <= endDay.getTime()) {
      // Active
      const daysLeft = Math.round((endDay - today) / 86400000);
      state     = 'active';
      badgeMod  = 'lidl-badge--active';
      badgeText = daysLeft === 0
        ? 'Sista dagen'
        : `${daysLeft} dag${daysLeft === 1 ? '' : 'ar'} kvar`;

    } else {
      // Expired
      state     = 'expired';
      badgeMod  = 'lidl-badge--expired';
      badgeText = 'Utgått';
    }

    // ── Build item — always <a> so every row is clickable ───────────────────
    const item = document.createElement('a');
    item.className = `lidl-item lidl-item--${state}`;
    item.href      = leaf.url || 'https://www.lidl.se/c/reklamblad/s10018018';
    item.target    = '_blank';
    item.rel       = 'noopener';

    // Thumbnail
    if (leaf.image) {
      const img    = document.createElement('img');
      img.className = 'lidl-thumb';
      img.src      = leaf.image;
      img.alt      = '';
      img.loading  = 'lazy';
      item.appendChild(img);
    }

    // Body
    const body = document.createElement('div');
    body.className = 'lidl-item-body';

    const titleEl = document.createElement('div');
    titleEl.className   = 'lidl-title';
    titleEl.textContent = leaf.title || 'Reklamblad';
    body.appendChild(titleEl);

    const startStr = new Date(leaf.startDate).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
    const endStr   = new Date(leaf.endDate  ).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
    const datesEl  = document.createElement('div');
    datesEl.className   = 'lidl-dates';
    datesEl.textContent = `${startStr} – ${endStr}`;
    body.appendChild(datesEl);

    item.appendChild(body);

    // Badge
    const badge = document.createElement('span');
    badge.className   = `lidl-badge ${badgeMod}`;
    badge.textContent = badgeText;
    item.appendChild(badge);

    list.appendChild(item);
  }
}
