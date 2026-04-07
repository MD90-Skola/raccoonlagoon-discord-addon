import { getGames } from './freegames-storage.js';

export function initFreeGames() {
  const btn          = document.getElementById('freeGamesScanBtn');
  const list         = document.getElementById('freeGamesList');
  const status       = document.getElementById('freeGamesStatus');
  const autoToggle   = document.getElementById('freeGamesAutoScanToggle');
  const lastScanEl   = document.getElementById('freeGamesLastScan');
  const allToggleBtn = document.getElementById('freeGamesAllToggle');

  if (!btn || !list || !status) return;

  loadInitialState();

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    status.textContent = 'Status: Scanning...';
    renderSkeletons('freeGamesList', 'fg');
    list.hidden = false;
    if (allToggleBtn) allToggleBtn.textContent = 'Dölj spel';

    try {
      const res = await chrome.runtime.sendMessage({ type: 'FREE_GAMES_SCAN' });

      if (!res || res.success !== true) {
        throw new Error(res?.error || 'Unknown error');
      }

      const allGames = Array.isArray(res.allGames) ? res.allGames : [];
      renderGames(allGames, allToggleBtn);
      updateLastScan(lastScanEl, res.lastScan);

      const total = (res.sourceResults || []).reduce((s, r) => s + (r.count ?? 0), 0);
      renderFooterStatus(status, total, res.sourceResults || []);
    } catch (error) {
      console.error('[FreeGames] Scan failed:', error);
      status.textContent = 'Status: Error — ' + (error?.message || 'Unknown error');
    } finally {
      btn.disabled = false;
    }
  });

  allToggleBtn?.addEventListener('click', async () => {
    if (!list.hidden) {
      list.hidden = true;
      allToggleBtn.textContent = 'Visa spel';
      return;
    }

    const data = await getGames();
    const games = Array.isArray(data.freeGames) ? data.freeGames : [];

    if (games.length === 0) {
      list.hidden = true;
      allToggleBtn.textContent = 'Visa spel';
      status.textContent = 'Status: Inga spel i storage — kör Scan först';
      return;
    }

    renderGames(games, allToggleBtn);
    list.hidden = false;
  });

  autoToggle?.addEventListener('change', async () => {
    try {
      await chrome.runtime.sendMessage({
        type: 'FREE_GAMES_SET_AUTOSCAN',
        enabled: autoToggle.checked
      });
    } catch (error) {
      console.error('[FreeGames] Auto-scan toggle failed:', error);
    }
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;

    if ('freeGamesAutoScanEnabled' in changes && autoToggle) {
      autoToggle.checked = changes.freeGamesAutoScanEnabled.newValue === true;
    }

    if ('freeGames' in changes) {
      const games = Array.isArray(changes.freeGames.newValue) ? changes.freeGames.newValue : [];
      if (!list.hidden) renderGames(games, allToggleBtn);
    }

    if ('freeGamesLastScan' in changes) {
      updateLastScan(lastScanEl, changes.freeGamesLastScan.newValue);
    }
  });

  async function loadInitialState() {
    try {
      const data = await getGames();

      if (autoToggle) autoToggle.checked = data.freeGamesAutoScanEnabled === true;
      updateLastScan(lastScanEl, data.freeGamesLastScan);

      const games = Array.isArray(data.freeGames) ? data.freeGames : [];

      if (games.length > 0) {
        if (allToggleBtn) allToggleBtn.textContent = `Visa spel (${games.length})`;
        const sources = deriveSourcesFromGames(games);
        renderFooterStatus(status, games.length, sources);
      } else {
        status.textContent = 'Idle';
      }
    } catch (error) {
      console.error('[FreeGames] Failed to load initial state:', error);
      status.textContent = 'Status: Error loading saved games';
    }
  }
}

const SOURCE_URLS = {
  epic:  'https://store.epicgames.com/en-US/free-games',
  steam: 'https://store.steampowered.com/search?maxprice=free&supportedlang=english,swedish&specials=1&ndl=1'
};

function renderFooterStatus(el, total, sources) {
  el.textContent = '';

  el.appendChild(document.createTextNode(total + 'st '));

  sources.forEach((src, i) => {
    if (i > 0) el.appendChild(document.createTextNode(' | '));
    const a = document.createElement('a');
    a.href        = src.url;
    a.target      = '_blank';
    a.rel         = 'noopener';
    a.className   = 'fg-status-link';
    a.textContent = src.label;
    el.appendChild(a);
  });
}

function deriveSourcesFromGames(games) {
  const seen = new Map();
  for (const g of games) {
    const id = (g.source || '').toLowerCase();
    if (id && !seen.has(id)) {
      seen.set(id, {
        label: g.source.charAt(0).toUpperCase() + g.source.slice(1),
        url:   SOURCE_URLS[id] || '#'
      });
    }
  }
  return [...seen.values()];
}

// ─── Skeleton loader ───────────────────────────────────────────────────────────
function renderSkeletons(listId, prefix, count = 3) {
  const list = document.getElementById(listId);
  if (!list) return;
  list.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const item = document.createElement('div');
    item.className = `${prefix}-game ${prefix}-skeleton`;

    const thumb = document.createElement('div');
    thumb.className = `${prefix}-skeleton-thumb`;
    item.appendChild(thumb);

    const content = document.createElement('div');
    content.className = `${prefix}-game-content`;

    const titleLine = document.createElement('div');
    titleLine.className = `${prefix}-skeleton-line ${prefix}-skeleton-line--title`;
    content.appendChild(titleLine);

    const metaLine = document.createElement('div');
    metaLine.className = `${prefix}-skeleton-line ${prefix}-skeleton-line--meta`;
    content.appendChild(metaLine);

    item.appendChild(content);
    list.appendChild(item);
  }
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
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

function renderGames(games, allToggleBtn) {
  const list = document.getElementById('freeGamesList');
  if (!list) return;

  list.innerHTML = '';

  if (allToggleBtn) {
    allToggleBtn.textContent = games.length > 0
      ? `Dölj spel (${games.length})`
      : 'Visa spel';
  }

  if (!Array.isArray(games) || games.length === 0) return;

  games.forEach(game => {
    const row = document.createElement('a');
    row.className = 'fg-game';
    row.href = game.url || '#';
    row.target = '_blank';
    row.rel = 'noopener';

    if (game.image) {
      const img = document.createElement('img');
      img.className = 'fg-game-thumb';
      img.src = game.image;
      img.alt = game.title || '';
      img.loading = 'lazy';
      row.appendChild(img);
    }

    const content = document.createElement('div');
    content.className = 'fg-game-content';

    const title = document.createElement('div');
    title.className = 'fg-game-title';
    title.textContent = game.title || 'Unknown';
    content.appendChild(title);

    const meta = document.createElement('div');
    meta.className = 'fg-game-meta';

    const badge = document.createElement('span');
    badge.className = `fg-badge fg-badge--${game.source || 'unknown'}`;
    badge.textContent = (game.source || '').toUpperCase();
    meta.appendChild(badge);

    const dateEl = document.createElement('span');
    dateEl.className = 'fg-game-date';
    dateEl.textContent = getDateLabel(game);
    meta.appendChild(dateEl);

    content.appendChild(meta);
    row.appendChild(content);
    list.appendChild(row);
  });
}

function getDateLabel(game) {
  if (typeof game.daysLeft === 'number') {
    if (game.status === 'coming') return `Startar om: ${formatDaysLeft(game.daysLeft)}`;
    return formatDaysLeft(game.daysLeft);
  }
  return game.dateText || '';
}

function formatDaysLeft(days) {
  if (days <= 0) return 'Idag';
  if (days === 1) return '1 dag kvar';
  return `${days} dagar kvar`;
}
