import { getGames } from './freegames-storage.js';

export function initFreeGames() {
  const btn        = document.getElementById('freeGamesScanBtn');
  const list       = document.getElementById('freeGamesList');
  const status     = document.getElementById('freeGamesStatus');
  const autoToggle = document.getElementById('freeGamesAutoScanToggle');
  const lastScanEl = document.getElementById('freeGamesLastScan');

  if (!btn || !list || !status) return;

  loadInitialState();

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    status.textContent = 'Status: Scanning...';
    list.innerHTML = '';

    try {
      const res = await chrome.runtime.sendMessage({ type: 'FREE_GAMES_SCAN' });

      if (!res || res.success !== true) {
        throw new Error(res?.error || 'Unknown error');
      }

      const allGames = Array.isArray(res.allGames) ? res.allGames : [];
      renderGames(allGames);
      updateLastScan(lastScanEl, res.lastScan);

      status.textContent = `Status: Found ${allGames.length} game${allGames.length === 1 ? '' : 's'}`;
    } catch (error) {
      console.error('[FreeGames] Scan failed:', error);
      status.textContent = 'Status: Error — ' + (error?.message || 'Unknown error');
    } finally {
      btn.disabled = false;
    }
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
      renderGames(Array.isArray(changes.freeGames.newValue) ? changes.freeGames.newValue : []);
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
      renderGames(games);

      status.textContent = games.length > 0
        ? `Status: Loaded ${games.length} saved game${games.length === 1 ? '' : 's'}`
        : 'Status: Idle';
    } catch (error) {
      console.error('[FreeGames] Failed to load initial state:', error);
      status.textContent = 'Status: Error loading saved games';
    }
  }
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function updateLastScan(el, timestamp) {
  if (!el) return;
  el.textContent = timestamp
    ? 'Senaste scan: ' + new Date(timestamp).toLocaleString('sv-SE')
    : 'Aldrig skannat';
}

function renderGames(games) {
  const list = document.getElementById('freeGamesList');
  if (!list) return;

  list.innerHTML = '';

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
