// components/elementkiller/elementkiller.js — Element Killer card

export const template = `
<div class="card" id="elementKillerCard">
  <div class="ek-header">
    <label class="section-label">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="3 6 5 6 21 6"/>
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
        <path d="M10 11v6M14 11v6"/>
        <path d="M9 6V4h6v2"/>
      </svg>
      Element Killer
    </label>
    <span class="ek-status-pill" id="ekStatusPill">Inactive</span>
  </div>

  <div class="ek-btn-row">
    <button class="ek-nuke-btn"  id="ekNukeBtn">Kill</button>
    <button class="ek-paint-btn" id="ekPaintBtn">Paint</button>
    <button class="ek-thief-btn" id="ekThiefBtn">Thief</button>
    <button class="ek-undo-btn"  id="ekUndoBtn" disabled>Undo (0)</button>
  </div>

  <div class="toggle-row ek-save-row">
    <div class="toggle-info">
      <span class="toggle-label">Save deletes</span>
      <span class="toggle-desc">Re-hide removed elements on reload</span>
    </div>
    <label class="toggle-switch">
      <input type="checkbox" id="ekSaveToggle" />
      <span class="slider"></span>
    </label>
  </div>

  <div id="ekKillsSection" class="ek-accordion" hidden>
    <button class="ek-accordion-toggle" id="ekKillsToggle" type="button">
      <span>Kills</span>
      <svg class="ek-accordion-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
    </button>
    <div class="ek-accordion-body" id="ekKillsBody" hidden>
      <div class="ek-accordion-actions">
        <button class="ek-clear-all-btn" id="ekClearAllKillsBtn">Clear all</button>
      </div>
      <div id="ekKillList" class="ek-profile-list"></div>
    </div>
  </div>

  <div id="ekPaintsSection" class="ek-accordion" hidden>
    <button class="ek-accordion-toggle" id="ekPaintsToggle" type="button">
      <span>Paints</span>
      <svg class="ek-accordion-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
    </button>
    <div class="ek-accordion-body" id="ekPaintsBody" hidden>
      <div class="ek-accordion-actions">
        <button class="ek-clear-all-btn" id="ekClearAllPaintsBtn">Clear all</button>
      </div>
      <div id="ekPaintList" class="ek-profile-list"></div>
    </div>
  </div>

  <div id="ekVaultSection" class="ek-accordion">
    <button class="ek-accordion-toggle" id="ekVaultToggle" type="button">
      <span>Thefts</span>
      <svg class="ek-accordion-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
    </button>
    <div class="ek-accordion-body" id="ekVaultBody" hidden>
      <div class="ek-accordion-actions">
        <button class="ek-clear-all-btn" id="ekClearVaultBtn">Clear</button>
      </div>
      <div id="ekColorList" class="ek-color-list"></div>
    </div>
  </div>
</div>
`;

export function init() {
  const nukeBtn           = document.getElementById('ekNukeBtn');
  const paintBtn          = document.getElementById('ekPaintBtn');
  const thiefBtn          = document.getElementById('ekThiefBtn');
  const undoBtn           = document.getElementById('ekUndoBtn');
  const statusPill        = document.getElementById('ekStatusPill');
  const saveToggle        = document.getElementById('ekSaveToggle');

  // Kills accordion
  const killsSection      = document.getElementById('ekKillsSection');
  const killsToggle       = document.getElementById('ekKillsToggle');
  const killsBody         = document.getElementById('ekKillsBody');
  const killList          = document.getElementById('ekKillList');
  const clearAllKillsBtn  = document.getElementById('ekClearAllKillsBtn');

  // Paints accordion
  const paintsSection     = document.getElementById('ekPaintsSection');
  const paintsToggle      = document.getElementById('ekPaintsToggle');
  const paintsBody        = document.getElementById('ekPaintsBody');
  const paintList         = document.getElementById('ekPaintList');
  const clearAllPaintsBtn = document.getElementById('ekClearAllPaintsBtn');

  // Thefts accordion
  const vaultToggle       = document.getElementById('ekVaultToggle');
  const vaultBody         = document.getElementById('ekVaultBody');
  const colorList         = document.getElementById('ekColorList');
  const clearVaultBtn     = document.getElementById('ekClearVaultBtn');

  if (!nukeBtn) return;

  // ── State ────────────────────────────────────────────────────────────────────
  function applyState(isActive, paintActive, thiefActive, count) {
    statusPill.textContent = isActive ? 'Kill' : paintActive ? 'Paint' : thiefActive ? 'Thief' : 'Inactive';
    statusPill.classList.toggle('ek-status-pill--active', isActive || paintActive);
    statusPill.classList.toggle('ek-status-pill--thief',  thiefActive);
    nukeBtn.textContent  = isActive    ? 'Stop' : 'Nuke';
    nukeBtn.classList.toggle('ek-nuke-btn--active',   isActive);
    paintBtn.textContent = paintActive ? 'Stop' : 'Paint';
    paintBtn.classList.toggle('ek-paint-btn--active', paintActive);
    thiefBtn.textContent = thiefActive ? 'Stop' : 'Thief';
    thiefBtn.classList.toggle('ek-thief-btn--active', thiefActive);
    undoBtn.disabled    = count === 0;
    undoBtn.textContent = `Undo (${count})`;
  }

  async function send(type) {
    try {
      const res = await chrome.runtime.sendMessage({ type });
      if (res && 'isActive' in res) {
        applyState(res.isActive, res.paintActive ?? false, res.thiefActive ?? false, res.deletedCount ?? 0);
      }
    } catch (_) {}
  }

  nukeBtn.addEventListener('click',  () => send('ELEMENT_KILLER_TOGGLE'));
  paintBtn.addEventListener('click', () => send('ELEMENT_KILLER_PAINT'));
  thiefBtn.addEventListener('click', () => send('ELEMENT_KILLER_THIEF'));
  undoBtn.addEventListener('click',  () => send('ELEMENT_KILLER_UNDO'));

  // ── Kills accordion ───────────────────────────────────────────────────────────
  killsToggle.addEventListener('click', () => {
    const open = !killsBody.hidden;
    killsBody.hidden = open;
    killsToggle.classList.toggle('ek-accordion-toggle--open', !open);
    if (!open) loadKills();
  });

  clearAllKillsBtn.addEventListener('click', async () => {
    const all  = await chrome.storage.local.get(null);
    const keys = Object.keys(all).filter(k => k.startsWith('ekHidden_'));
    if (keys.length) await chrome.storage.local.remove(keys);
    loadKills();
  });

  // ── Paints accordion ──────────────────────────────────────────────────────────
  paintsToggle.addEventListener('click', () => {
    const open = !paintsBody.hidden;
    paintsBody.hidden = open;
    paintsToggle.classList.toggle('ek-accordion-toggle--open', !open);
    if (!open) loadPaints();
  });

  clearAllPaintsBtn.addEventListener('click', async () => {
    const all  = await chrome.storage.local.get(null);
    const keys = Object.keys(all).filter(k => k.startsWith('ekPainted_'));
    if (keys.length) await chrome.storage.local.remove(keys);
    loadPaints();
  });

  // ── Thefts accordion ─────────────────────────────────────────────────────────
  vaultToggle.addEventListener('click', () => {
    const open = !vaultBody.hidden;
    vaultBody.hidden = open;
    vaultToggle.classList.toggle('ek-accordion-toggle--open', !open);
    if (!open) loadColors();
  });

  clearVaultBtn.addEventListener('click', async () => {
    await chrome.storage.local.remove('ekColors');
    loadColors();
  });

  // ── Save deletes toggle ──────────────────────────────────────────────────────
  saveToggle.addEventListener('change', async () => {
    await chrome.storage.local.set({ ekSaveDeletes: saveToggle.checked });
    killsSection.hidden  = !saveToggle.checked;
    paintsSection.hidden = !saveToggle.checked;
    if (!saveToggle.checked) {
      killsBody.hidden  = true;
      paintsBody.hidden = true;
    }
  });

  // ── Storage sync ─────────────────────────────────────────────────────────────
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;

    if ('ekActive' in changes || 'ekPaintActive' in changes || 'ekThiefActive' in changes || 'ekDeletedCount' in changes) {
      chrome.storage.local.get(['ekActive', 'ekPaintActive', 'ekThiefActive', 'ekDeletedCount'], data => {
        applyState(data.ekActive === true, data.ekPaintActive === true, data.ekThiefActive === true, data.ekDeletedCount ?? 0);
      });
    }
    if (!killsBody.hidden  && Object.keys(changes).some(k => k.startsWith('ekHidden_')))  loadKills();
    if (!paintsBody.hidden && Object.keys(changes).some(k => k.startsWith('ekPainted_'))) loadPaints();
    if (!vaultBody.hidden  && 'ekColors' in changes) loadColors();
  });

  // ── Initial state ────────────────────────────────────────────────────────────
  chrome.storage.local.get(['ekActive', 'ekPaintActive', 'ekThiefActive', 'ekDeletedCount', 'ekSaveDeletes'], data => {
    applyState(data.ekActive === true, data.ekPaintActive === true, data.ekThiefActive === true, data.ekDeletedCount ?? 0);
    const saveOn = data.ekSaveDeletes !== false;
    saveToggle.checked  = saveOn;
    killsSection.hidden = !saveOn;
    paintsSection.hidden = !saveOn;
  });

  // ── Kills list ────────────────────────────────────────────────────────────────
  async function loadKills() {
    if (!killList) return;
    const all = await chrome.storage.local.get(null);
    const entries = Object.entries(all)
      .filter(([k]) => k.startsWith('ekHidden_'))
      .map(([k, v]) => ({ key: k, hostname: k.replace('ekHidden_', ''), count: Array.isArray(v) ? v.length : 0 }))
      .filter(e => e.count > 0)
      .sort((a, b) => a.hostname.localeCompare(b.hostname));

    _renderProfileList(killList, entries, 'kill', loadKills);
  }

  // ── Paints list ───────────────────────────────────────────────────────────────
  async function loadPaints() {
    if (!paintList) return;
    const all = await chrome.storage.local.get(null);
    const entries = Object.entries(all)
      .filter(([k]) => k.startsWith('ekPainted_'))
      .map(([k, v]) => ({ key: k, hostname: k.replace('ekPainted_', ''), count: Array.isArray(v) ? v.length : 0 }))
      .filter(e => e.count > 0)
      .sort((a, b) => a.hostname.localeCompare(b.hostname));

    _renderProfileList(paintList, entries, 'paint', loadPaints);
  }

  function _renderProfileList(container, entries, type, reloadFn) {
    container.innerHTML = '';
    if (entries.length === 0) {
      container.innerHTML = `<div class="ek-no-profiles">No saved ${type}s</div>`;
      return;
    }
    for (const { key, hostname, count } of entries) {
      const row  = document.createElement('div');
      row.className = 'ek-profile-row';

      const info = document.createElement('div');
      info.className = 'ek-profile-info';
      info.innerHTML = `<span class="ek-profile-host">${hostname}</span><span class="ek-profile-count">${count} ${type === 'kill' ? 'hidden' : 'painted'}</span>`;

      const btn = document.createElement('button');
      btn.className   = 'ek-profile-clear-btn';
      btn.textContent = 'Clear';
      btn.addEventListener('click', async () => {
        await chrome.storage.local.remove(key);
        reloadFn();
      });

      row.appendChild(info);
      row.appendChild(btn);
      container.appendChild(row);
    }
  }

  // ── Colors list (Thefts) ─────────────────────────────────────────────────────
  async function loadColors() {
    if (!colorList) return;
    const { ekColors } = await chrome.storage.local.get('ekColors');
    const colors = Array.isArray(ekColors) ? ekColors : [];

    colorList.innerHTML = '';

    if (colors.length === 0) {
      colorList.innerHTML = '<div class="ek-no-profiles">No colors yet</div>';
      return;
    }

    for (const hex of colors) {
      const chip = document.createElement('button');
      chip.className = 'ek-color-chip';
      chip.title     = `Copy ${hex}`;
      chip.innerHTML = `<span class="ek-color-swatch" style="background:${hex}"></span><span class="ek-color-hex">${hex}</span>`;
      chip.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(hex);
          const label = chip.querySelector('.ek-color-hex');
          const orig  = label.textContent;
          label.textContent = 'Copied!';
          setTimeout(() => { label.textContent = orig; }, 1200);
        } catch (_) {}
      });
      colorList.appendChild(chip);
    }
  }
}
