// background-rust-scanner.js — Rust Item Store Scanner
//
// Lyssnar på RUST_SCAN/RUST_SCAN_FULL, hanterar dagligt alarm och
// kör runRustFullScan som öppnar en bakgrundsflik, väntar på JS-rendering,
// injicerar scrapeItemStoreDom och stänger fliken.

import { ALARM_RUST } from './constants.js';
import { scrapeItemStoreDom } from './background-rust-dom.js';

// ─── Meddelanden från sidepanel / scanner-tab ─────────────────────────────────

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type !== 'RUST_SCAN' && msg.type !== 'RUST_SCAN_FULL') return;

  chrome.storage.local.get('rustFinderEnabled', ({ rustFinderEnabled }) => {
    if (rustFinderEnabled === false) {
      sendResponse({ success: false, error: 'Rust Finder är inaktiverat' });
      return;
    }
    runRustFullScan()
      .then(result => sendResponse({ success: true, ...result }))
      .catch(err   => sendResponse({ success: false, error: err.message }));
  });

  return true; // håller sendResponse-kanalen öppen
});

// ─── Dagligt alarm ────────────────────────────────────────────────────────────

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== ALARM_RUST) return;
  const data = await chrome.storage.local.get(['rustAutoScanEnabled', 'rustFinderEnabled']);
  if (data.rustFinderEnabled === false) return;
  if (data.rustAutoScanEnabled === true) {
    await runRustFullScan().catch(console.error);
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;

  if ('rustAutoScanEnabled' in changes) {
    if (changes.rustAutoScanEnabled.newValue === true) {
      chrome.alarms.create(ALARM_RUST, { periodInMinutes: 1440 });
    } else {
      chrome.alarms.clear(ALARM_RUST);
    }
  }

  if ('rustFinderEnabled' in changes && changes.rustFinderEnabled.newValue === false) {
    chrome.alarms.clear(ALARM_RUST);
  }
});

chrome.runtime.onStartup.addListener(async () => {
  const { rustAutoScanEnabled } = await chrome.storage.local.get('rustAutoScanEnabled');
  if (rustAutoScanEnabled !== true) return;

  const existing = await chrome.alarms.get(ALARM_RUST);
  if (!existing) {
    chrome.alarms.create(ALARM_RUST, { periodInMinutes: 1440 });
  }
});

// ─── Scan-logik ───────────────────────────────────────────────────────────────

async function runRustFullScan() {
  const tab = await chrome.tabs.create({
    url: 'https://store.steampowered.com/itemstore/252490/browse/?filter=All&cc=us&l=en',
    active: false
  });

  let freshProducts = {};

  try {
    await _waitForTabComplete(tab.id, 30000);

    // Extra tid så Steams JS hinner rendera allt
    await new Promise((r) => setTimeout(r, 2000));

    const [injection] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: scrapeItemStoreDom
    });

    freshProducts = injection?.result ?? {};
    console.log('[RaccoonLagoon] DOM scrape:', Object.keys(freshProducts).length, 'items');
  } finally {
    if (tab?.id) {
      try { await chrome.tabs.remove(tab.id); } catch (_) {}
    }
  }

  if (Object.keys(freshProducts).length === 0) {
    throw new Error('DOM scrape returned 0 products — page may not have loaded');
  }

  const stored = await chrome.storage.local.get('rustProducts');
  const oldProducts = stored.rustProducts ?? {};
  const alerts = [];
  const now = Date.now();

  for (const [id, fresh] of Object.entries(freshProducts)) {
    const old = oldProducts[id];

    if (!old) {
      fresh.firstSeen = now;
      alerts.push({ type: 'new', id: fresh.id, name: fresh.name, price: fresh.price, url: fresh.url });
    } else {
      fresh.firstSeen = old.firstSeen ?? now;

      if ((fresh.price || '') !== (old.price || '')) {
        alerts.push({
          type: 'price_changed',
          id: fresh.id,
          name: fresh.name,
          oldPrice: old.price || '?',
          newPrice: fresh.price || '?',
          url: fresh.url
        });
      }

      if (!old.isOnSale && fresh.isOnSale) {
        alerts.push({
          type: 'sale_started',
          id: fresh.id,
          name: fresh.name,
          price: fresh.price,
          discount: fresh.discountPercent || 0,
          url: fresh.url
        });
      }

      if (old.isOnSale && !fresh.isOnSale) {
        alerts.push({ type: 'sale_ended', id: fresh.id, name: fresh.name, url: fresh.url });
      }
    }
  }

  await chrome.storage.local.set({
    rustProducts: freshProducts,
    rustAlerts: alerts,
    rustLastScanAt: now
  });

  return {
    count: Object.keys(freshProducts).length,
    alerts: alerts.length
  };
}

async function _waitForTabComplete(tabId, timeoutMs = 30000) {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      const tab = await chrome.tabs.get(tabId);
      if (tab && tab.status === 'complete') return;
    } catch {
      throw new Error('Tab was closed before scan could start');
    }

    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  throw new Error('Tab load timeout after ' + timeoutMs + 'ms');
}
