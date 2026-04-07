import { getSteamGames } from './steamgames-storage.js';

export function initSteamGames() {
  const btn = document.getElementById('steamScanBtn');
  const list = document.getElementById('steamGamesList');
  const status = document.getElementById('steamScanStatus');
  const autoToggle = document.getElementById('steamAutoScanToggle');
  const lastScanEl = document.getElementById('steamLastScan');

  if (!btn || !list || !status) return;

  loadInitialState();

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    status.textContent = 'Status: Scanning...';
    renderSkeletons();

    try {
      const res = await chrome.runtime.sendMessage({ type: 'STEAM_SCAN' });

      if (!res || res.success !== true) {
        throw new Error(res?.error || 'Unknown error');
      }

      const allGames = Array.isArray(res.allGames) ? res.allGames : [];

      renderGames(allGames);
      updateLastScan(lastScanEl, res.lastScan);

      status.textContent = `Status: Found ${allGames.length} game${allGames.length === 1 ? '' : 's'}`;
    } catch (error) {
      console.error('[SteamGames] Scan failed:', error);
      status.textContent = 'Status: Error — ' + (error?.message || 'Unknown error');
    } finally {
      btn.disabled = false;
    }
  });

  autoToggle?.addEventListener('change', async () => {
    try {
      await chrome.runtime.sendMessage({
        type: 'STEAM_SET_AUTOSCAN',
        enabled: autoToggle.checked
      });
    } catch (error) {
      console.error('[SteamGames] Auto-scan toggle failed:', error);
    }
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;

    if ('steamAutoScanEnabled' in changes && autoToggle) {
      autoToggle.checked = changes.steamAutoScanEnabled.newValue === true;
    }

    if ('steamGames' in changes) {
      const games = Array.isArray(changes.steamGames.newValue)
        ? changes.steamGames.newValue
        : [];
      renderGames(games);
    }

    if ('steamLastScan' in changes) {
      updateLastScan(lastScanEl, changes.steamLastScan.newValue);
    }
  });

  async function loadInitialState() {
    try {
      const data = await getSteamGames();

      if (autoToggle) {
        autoToggle.checked = data.steamAutoScanEnabled === true;
      }

      updateLastScan(lastScanEl, data.steamLastScan);

      const games = Array.isArray(data.steamGames) ? data.steamGames : [];
      renderGames(games);

      status.textContent = games.length > 0
        ? `Status: Loaded ${games.length} saved game${games.length === 1 ? '' : 's'}`
        : 'Status: Idle';
    } catch (error) {
      console.error('[SteamGames] Failed to load initial state:', error);
      status.textContent = 'Status: Error loading saved games';
    }
  }
}

// ─── Skeleton loader ───────────────────────────────────────────────────────────
function renderSkeletons(count = 3) {
  const list = document.getElementById('steamGamesList');
  if (!list) return;
  list.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const item = document.createElement('div');
    item.className = 'steam-game steam-skeleton';

    const thumb = document.createElement('div');
    thumb.className = 'steam-skeleton-thumb';
    item.appendChild(thumb);

    const content = document.createElement('div');
    content.className = 'steam-game-content';

    const titleLine = document.createElement('div');
    titleLine.className = 'steam-skeleton-line steam-skeleton-line--title';
    content.appendChild(titleLine);

    const metaLine = document.createElement('div');
    metaLine.className = 'steam-skeleton-line steam-skeleton-line--meta';
    content.appendChild(metaLine);

    item.appendChild(content);
    list.appendChild(item);
  }
}

function updateLastScan(el, timestamp) {
  if (!el) return;

  el.textContent = timestamp
    ? 'Senaste scan: ' + new Date(timestamp).toLocaleString('sv-SE')
    : 'Aldrig skannat';
}

function renderGames(games) {
  const list = document.getElementById('steamGamesList');
  if (!list) return;

  list.innerHTML = '';

  if (!Array.isArray(games) || games.length === 0) {
    return;
  }

  games.forEach((game) => {
    const row = document.createElement('a');
    row.className = 'steam-game';
    row.href = game.url || '#';
    row.target = '_blank';
    row.rel = 'noopener';

    if (game.image) {
      const img = document.createElement('img');
      img.className = 'steam-game-thumb';
      img.src = game.image;
      img.alt = game.title || 'Steam game image';
      img.loading = 'lazy';
      row.appendChild(img);
    }

    const content = document.createElement('div');
    content.className = 'steam-game-content';

    const title = document.createElement('div');
    title.className = 'steam-game-title';
    title.textContent = game.title || 'Unknown game';
    content.appendChild(title);

    const date = document.createElement('div');
    date.className = 'steam-game-date';
    date.textContent = game.dateText || '100% sale';
    content.appendChild(date);

    row.appendChild(content);
    list.appendChild(row);
  });
}