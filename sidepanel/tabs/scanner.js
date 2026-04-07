// scanner.js — Scanner-fliken
// UI + resultatvisning.
// Själva fulla Rust-scannen ska göras i background.js via RUST_SCAN_FULL.

export function initScanner() {
  const tabBtn          = document.getElementById('scannerTabBtn');
  const tabPane         = document.getElementById('tab-scanner');

  const startScanBtn    = document.getElementById('startScanBtn');
  const scanStatus      = document.getElementById('scanStatus');
  const autoScanToggle  = document.getElementById('rustAutoScanToggle');
  const lastScanEl      = document.getElementById('rustLastScan');

  const newSection      = document.getElementById('rustNewSection');
  const saleSection     = document.getElementById('rustSaleSection');
  const changedSection  = document.getElementById('rustChangedSection');

  const newList         = document.getElementById('rustNewList');
  const saleList        = document.getElementById('rustSaleList');
  const changedList     = document.getElementById('rustChangedList');

  const allToggleBtn    = document.getElementById('rustAllToggle');
  const allList         = document.getElementById('rustAllList');

  const steamScanBtn    = document.getElementById('steamScanBtn');
  const steamGamesList  = document.getElementById('steamGamesList');
  const steamScanStatus = document.getElementById('steamScanStatus');

  if (!tabBtn || !tabPane) return;

  loadInitialState();

  startScanBtn?.addEventListener('click', async () => {
    startScanBtn.disabled = true;
    scanStatus.textContent = 'Status: Scanning…';

    try {
      const response = await sendRuntimeMessage({ type: 'RUST_SCAN_FULL' });

      if (!response?.success) {
        throw new Error(response?.error || 'Unknown error');
      }

      scanStatus.textContent =
        `Status: Done — ${response.count ?? 0} produkter hittade`;

      const data = await Storage.get(['rustLastScanAt', 'rustAlerts', 'rustProducts']);
      updateLastScanLabel(lastScanEl, data.rustLastScanAt);
      renderRustResults(data);

      if (!allList.hidden) {
        renderAllProducts(data.rustProducts ?? {}, allList, allToggleBtn);
      }
    } catch (error) {
      console.error('[RaccoonLagoon] Rust scan failed:', error);
      scanStatus.textContent =
        'Status: Error — ' + (error?.message || 'Unknown error');
    } finally {
      startScanBtn.disabled = false;
    }
  });

  autoScanToggle?.addEventListener('change', () => {
    Storage.set({ rustAutoScanEnabled: autoScanToggle.checked });
  });

  allToggleBtn?.addEventListener('click', async () => {
    if (!allList.hidden) {
      allList.hidden = true;
      allToggleBtn.textContent = 'Visa produkter';
      return;
    }

    const data = await Storage.get(['rustProducts']);
    const products = data.rustProducts ?? {};

    if (Object.keys(products).length === 0) {
      allList.hidden = true;
      allToggleBtn.textContent = 'Visa produkter';
      scanStatus.textContent = 'Status: Inga produkter i storage — kör Scan först';
      return;
    }

    renderAllProducts(products, allList, allToggleBtn);
    allList.hidden = false;
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
        if (count > 0) {
          scanStatus.textContent = `Status: Done — ${count} produkter hittade`;
        }

        if (!allList.hidden) {
          renderAllProducts(data.rustProducts ?? {}, allList, allToggleBtn);
        }
      });
    }
  });

  steamScanBtn?.addEventListener('click', async () => {
    steamScanBtn.disabled = true;
    steamScanStatus.textContent = 'Status: Fetching…';
    steamGamesList.innerHTML = '';

    try {
      const games = await fetchSteamFreeGames();

      if (games.length === 0) {
        steamScanStatus.textContent = 'Status: No 100% off games found right now';
      } else {
        steamScanStatus.textContent =
          `Status: Found ${games.length} free game${games.length === 1 ? '' : 's'}`;

        for (const game of games) {
          const row = document.createElement('a');
          row.className = 'steam-game-item';
          row.href = `https://store.steampowered.com/app/${game.id}/`;
          row.target = '_blank';
          row.rel = 'noopener';

          const name = document.createElement('span');
          name.className = 'steam-game-name';
          name.textContent = game.name;

          const price = document.createElement('span');
          price.className = 'steam-game-price';
          price.textContent =
            `was ${formatSteamPrice(game.original_price, game.currency)} → FREE`;

          row.appendChild(name);
          row.appendChild(price);
          steamGamesList.appendChild(row);
        }
      }
    } catch (error) {
      console.error('[RaccoonLagoon] Steam free games error:', error);
      steamScanStatus.textContent =
        'Status: Error — ' + (error?.message || 'Unknown error');
    } finally {
      steamScanBtn.disabled = false;
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
  }
}

function setTabVisible(tabBtn, tabPane, visible) {
  tabBtn.hidden = !visible;

  if (!visible && !tabPane.hidden) {
    document.querySelector('[data-tab="home"]')?.click();
  }
}

function updateLastScanLabel(el, timestamp) {
  if (!el) return;

  el.textContent = timestamp
    ? 'Senaste scan: ' + new Date(timestamp).toLocaleString('sv-SE')
    : 'Aldrig skannat';
}

function renderRustResults(data) {
  const alerts = Array.isArray(data.rustAlerts) ? data.rustAlerts : [];

  const newSection     = document.getElementById('rustNewSection');
  const saleSection    = document.getElementById('rustSaleSection');
  const changedSection = document.getElementById('rustChangedSection');

  const newList        = document.getElementById('rustNewList');
  const saleList       = document.getElementById('rustSaleList');
  const changedList    = document.getElementById('rustChangedList');

  renderSection(
    newSection,
    newList,
    alerts.filter((a) => a.type === 'new'),
    (a) => makeRow(a.url, a.name, '', a.price, '')
  );

  renderSection(
    saleSection,
    saleList,
    alerts.filter((a) => a.type === 'sale_started'),
    (a) => makeRow(a.url, a.name, `-${a.discount}%`, a.price, 'discounted')
  );

  renderSection(
    changedSection,
    changedList,
    alerts.filter((a) => a.type === 'price_changed'),
    (a) => makeRow(a.url, a.name, '', `${a.oldPrice} → ${a.newPrice}`, 'discounted')
  );
}

function renderSection(section, list, items, makeRowFn) {
  if (!section || !list) return;

  list.innerHTML = '';
  section.hidden = items.length === 0;

  for (const item of items) {
    list.appendChild(makeRowFn(item));
  }
}

function renderAllProducts(productsMap, allList, allToggleBtn) {
  const entries = Object.values(productsMap)
    .sort((a, b) => String(a.name).localeCompare(String(b.name), 'sv'));

  allList.innerHTML = '';

  for (const p of entries) {
    allList.appendChild(
      makeRow(
        p.url,
        p.name,
        p.isOnSale ? `-${p.discountPercent}%` : '',
        p.price,
        p.isOnSale ? 'discounted' : ''
      )
    );
  }

  allToggleBtn.textContent = `Dölj produkter (${entries.length})`;
}

function makeRow(url, name, badgeText, priceText, priceClass) {
  const row = document.createElement('a');
  row.className = 'dlc-item' + (priceClass ? ' on-sale' : '');
  row.href = url || '#';
  row.target = '_blank';
  row.rel = 'noopener';

  const nameEl = document.createElement('span');
  nameEl.className = 'dlc-name';
  nameEl.textContent = name || 'Unknown';

  const right = document.createElement('div');
  right.className = 'dlc-right';

  if (badgeText) {
    const badge = document.createElement('span');
    badge.className = 'dlc-badge';
    badge.textContent = badgeText;
    right.appendChild(badge);
  }

  const priceEl = document.createElement('span');
  priceEl.className = 'dlc-price' + (priceClass ? ' ' + priceClass : '');
  priceEl.textContent = priceText || '?';
  right.appendChild(priceEl);

  row.appendChild(nameEl);
  row.appendChild(right);

  return row;
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

// ────────────────────────────────────────────────────────────────────────────
// Steam 100% off
// ────────────────────────────────────────────────────────────────────────────

async function fetchSteamFreeGames() {
  const ids = await fetchSteamSpecialIds();
  const games = [];
  const BATCH_SIZE = 20;

  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE);
    const url =
      'https://store.steampowered.com/api/appdetails?cc=us&l=en&appids=' +
      batch.join(',');

    const res = await fetch(url);
    if (!res.ok) continue;

    const data = await res.json();

    for (const id of batch) {
      const entry = data?.[String(id)];
      const app = entry?.data;
      const price = app?.price_overview;

      if (!entry?.success || !app || !price) continue;

      if (price.discount_percent === 100 && price.initial > 0 && price.final === 0) {
        games.push({
          id,
          name: app.name,
          original_price: price.initial,
          currency: price.currency || 'USD'
        });
      }
    }

    if (i + BATCH_SIZE < ids.length) {
      await delay(250);
    }
  }

  return games.sort((a, b) => a.name.localeCompare(b.name, 'sv'));
}

async function fetchSteamSpecialIds() {
  const ids = new Set();
  const PAGE = 100;
  let start = 0;
  let total = Infinity;

  while (start < total) {
    const url =
      `https://store.steampowered.com/search/results/?specials=1&start=${start}&count=${PAGE}&cc=us&l=en&json=1`;

    const res = await fetch(url);
    if (!res.ok) break;

    const data = await res.json();
    total = data?.total ?? 0;

    const html = data?.results_html ?? '';
    for (const match of html.matchAll(/data-ds-appid="([\d,]+)"/g)) {
      for (const rawId of match[1].split(',')) {
        const id = parseInt(rawId, 10);
        if (id) ids.add(id);
      }
    }

    start += PAGE;

    if (start < total) {
      await delay(250);
    }
  }

  return [...ids];
}

function formatSteamPrice(amountInCents, currency) {
  const amount = Number(amountInCents || 0) / 100;

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(amount);
  } catch (_) {
    return `${amount.toFixed(2)} ${currency || 'USD'}`;
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}