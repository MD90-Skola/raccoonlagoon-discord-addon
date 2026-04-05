import { getGames } from './epicgames-storage.js';

export function initEpicGames() {
  const btn = document.getElementById('epicScanBtn');
  const list = document.getElementById('epicGamesList');
  const status = document.getElementById('epicScanStatus');
  const autoToggle = document.getElementById('epicAutoScanToggle');
  const lastScanEl = document.getElementById('epicLastScan');

  if (!btn || !list || !status) return;

  loadInitialState();

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    status.textContent = 'Status: Scanning...';
    list.innerHTML = '';

    try {
      const res = await chrome.runtime.sendMessage({ type: 'EPIC_SCAN' });

      if (!res || res.success !== true) {
        throw new Error(res?.error || 'Unknown error');
      }

      const allGames = Array.isArray(res.allGames) ? res.allGames : [];

      renderGames(allGames);
      updateLastScan(lastScanEl, res.lastScan);

      status.textContent = `Status: Found ${allGames.length} game${allGames.length === 1 ? '' : 's'}`;
    } catch (error) {
      console.error('[EpicGames] Scan failed:', error);
      status.textContent = 'Status: Error — ' + (error?.message || 'Unknown error');
    } finally {
      btn.disabled = false;
    }
  });

  autoToggle?.addEventListener('change', async () => {
    try {
      await chrome.runtime.sendMessage({
        type: 'EPIC_SET_AUTOSCAN',
        enabled: autoToggle.checked
      });
    } catch (error) {
      console.error('[EpicGames] Auto-scan toggle failed:', error);
    }
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;

    if ('epicAutoScanEnabled' in changes && autoToggle) {
      autoToggle.checked = changes.epicAutoScanEnabled.newValue === true;
    }

    if ('epicGames' in changes) {
      const games = Array.isArray(changes.epicGames.newValue)
        ? changes.epicGames.newValue
        : [];
      renderGames(games);
    }

    if ('epicLastScan' in changes) {
      updateLastScan(lastScanEl, changes.epicLastScan.newValue);
    }
  });

  async function loadInitialState() {
    try {
      const data = await getGames();

      if (autoToggle) {
        autoToggle.checked = data.epicAutoScanEnabled === true;
      }

      updateLastScan(lastScanEl, data.epicLastScan);

      const games = Array.isArray(data.epicGames) ? data.epicGames : [];
      renderGames(games);

      status.textContent = games.length > 0
        ? `Status: Loaded ${games.length} saved game${games.length === 1 ? '' : 's'}`
        : 'Status: Idle';
    } catch (error) {
      console.error('[EpicGames] Failed to load initial state:', error);
      status.textContent = 'Status: Error loading saved games';
    }
  }
}

function updateLastScan(el, timestamp) {
  if (!el) return;

  el.textContent = timestamp
    ? 'Senaste scan: ' + new Date(timestamp).toLocaleString('sv-SE')
    : 'Aldrig skannat';
}

function renderGames(games) {
  const list = document.getElementById('epicGamesList');
  if (!list) return;

  list.innerHTML = '';

  if (!Array.isArray(games) || games.length === 0) {
    return;
  }

  games.forEach((game) => {
    const row = document.createElement('a');
    row.className = 'epic-game';
    row.href = game.url || '#';
    row.target = '_blank';
    row.rel = 'noopener';

    if (game.image) {
      const img = document.createElement('img');
      img.className = 'epic-game-thumb';
      img.src = game.image;
      img.alt = game.title || 'Epic game image';
      img.loading = 'lazy';
      row.appendChild(img);
    }

    const content = document.createElement('div');
    content.className = 'epic-game-content';

    const title = document.createElement('div');
    title.className = 'epic-game-title';
    title.textContent = game.title || 'Unknown game';
    content.appendChild(title);

    const date = document.createElement('div');
    date.className = 'epic-game-date';
    date.textContent = getDateLabel(game);
    content.appendChild(date);

    row.appendChild(content);
    list.appendChild(row);
  });
}

function getDateLabel(game) {
  if (typeof game.daysLeft === 'number') {
    if (game.status === 'coming') {
      return `Startar om: ${formatDaysLeft(game.daysLeft)}`;
    }
    return formatDaysLeft(game.daysLeft);
  }

  return game.dateText || 'Okänt datum';
}

function formatDaysLeft(daysLeft) {
  if (daysLeft <= 0) return 'Idag';
  if (daysLeft === 1) return '1 dag kvar';
  return `${daysLeft} dagar kvar`;
}