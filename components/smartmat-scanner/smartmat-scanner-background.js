// smartmat-scanner-background.js — Bakgrundslogik för smartmat-scanner

import { scrapeIcaDom   } from '../ica-scanner/ica-scanner-dom.js';
import { scrapeCoopDom  } from './smartmat-scanner-dom.js';
import { scrapeWillysDom } from './smartmat-scanner-dom.js';
import { scrapeLidlDom  } from './smartmat-scanner-dom.js';

const STORE_URLS = {
  ica:    'https://www.ica.se/erbjudanden/ica-supermarket-frolunda-1003449/',
  coop:   'https://www.coop.se/erbjudanden/',
  willys: 'https://www.willys.se/erbjudanden',
  lidl:   'https://www.lidl.se/c/lidl-plus-erbjudanden/a10091753'
};

const SCRAPERS = {
  ica:    scrapeIcaDom,
  coop:   scrapeCoopDom,
  willys: scrapeWillysDom,
  lidl:   scrapeLidlDom
};

const DAILY_ALARM   = 'smartmat-daily';
const ALL_STORES    = ['ica', 'coop', 'willys', 'lidl'];

// ─── Daglig scan — alarm ──────────────────────────────────────────────────────
async function updateDailyAlarm() {
  const { smartmatDailyScan } = await chrome.storage.local.get('smartmatDailyScan');
  if (smartmatDailyScan) {
    const existing = await chrome.alarms.get(DAILY_ALARM);
    if (!existing) chrome.alarms.create(DAILY_ALARM, { periodInMinutes: 1440 });
  } else {
    chrome.alarms.clear(DAILY_ALARM);
  }
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== DAILY_ALARM) return;
  const data = await chrome.storage.local.get(['smartmatScanEnabled', 'smartmatAlertEnabled']);
  const enabled = data.smartmatScanEnabled ?? {};
  let anySucceeded = false;
  for (const store of ALL_STORES) {
    if (enabled[store] !== false) {
      try {
        await runStoreScan(store);
        anySucceeded = true;
      } catch (e) {
        console.error('[Smartmat] Daglig scan fel:', store, e.message);
      }
    }
  }
  if (data.smartmatAlertEnabled === true && anySucceeded) {
    await chrome.storage.local.set({ smartmatHasNew: true });
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && 'smartmatDailyScan' in changes) updateDailyAlarm();
});

chrome.runtime.onInstalled.addListener(() => updateDailyAlarm());

// ─── Meddelanden ──────────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== 'SMARTMAT_SCAN') return;

  const store = msg.store;
  if (!store || !SCRAPERS[store]) {
    sendResponse({ success: false, error: 'Okänd butik: ' + store });
    return true;
  }

  runStoreScan(store)
    .then(result => sendResponse({ success: true, ...result }))
    .catch(err   => sendResponse({ success: false, error: err.message }));
  return true;
});

// ─── Scan-logik ───────────────────────────────────────────────────────────────
async function runStoreScan(store) {
  const stored  = await chrome.storage.local.get(['smartmatStoreUrls', 'smartmatWillysStore']);
  const urlMap  = stored.smartmatStoreUrls ?? {};
  const url     = urlMap[store] || STORE_URLS[store];
  const scraperFn = SCRAPERS[store];
  const scraperArgs = store === 'willys' ? [stored.smartmatWillysStore || ''] : [];

  const tab = await createTabWithRetry(url);
  let newProducts = [];

  try {
    await waitForTab(tab.id, 30000);
    await new Promise((r) => setTimeout(r, 2000));

    const [injection] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func:   scraperFn,
      args:   scraperArgs
    });

    const result = injection?.result ?? {};
    newProducts  = result.products ?? [];
    for (const line of (result.debug ?? [])) console.log('[SMARTMAT-DBG]', line);
    console.log('[RaccoonLagoon] Smartmat scrape', store + ':', newProducts.length, 'produkter');
  } finally {
    try { await chrome.tabs.remove(tab.id); } catch (_) {}
  }

  if (newProducts.length === 0) {
    throw new Error('Hittade 0 produkter för ' + store + ' — sidan kanske inte laddades');
  }

  // Slå ihop: bevara produkter från andra butiker, ersätt butikens egna
  const existing = await chrome.storage.local.get('smartmatProducts');
  const filtered = (existing.smartmatProducts ?? []).filter(p => p.store !== store);
  const scannedAt = Date.now();
  const merged    = [
    ...filtered,
    ...newProducts.map(p => ({ ...p, store, scannedAt }))
  ];

  await chrome.storage.local.set({
    smartmatProducts:   merged,
    smartmatLastScanAt: scannedAt
  });

  return { count: newProducts.length, store };
}

// ─── Skapa tab med retry (Chrome kastar vid drag) ─────────────────────────────
async function createTabWithRetry(url, attempts = 5, delayMs = 600) {
  for (let i = 0; i < attempts; i++) {
    try {
      return await chrome.tabs.create({ url, active: false });
    } catch (e) {
      if (i === attempts - 1) throw e;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

// ─── Vänta på tab-laddning ────────────────────────────────────────────────────
async function waitForTab(tabId, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const tab = await chrome.tabs.get(tabId);
      if (tab.status === 'complete') {
        if (tab.url?.startsWith('chrome-error://')) {
          throw new Error('Sidan kunde inte laddas (chrome-error)');
        }
        return;
      }
    } catch (e) {
      if (e.message.includes('chrome-error') || e.message.includes('No tab')) throw e;
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error('Tab-timeout efter ' + timeoutMs + 'ms');
}
