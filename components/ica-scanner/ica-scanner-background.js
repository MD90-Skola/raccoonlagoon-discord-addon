// ica-scanner-background.js — ICA Scanner bakgrundslogik

import { scrapeIcaDom } from './ica-scanner-dom.js';

const ALARM          = 'ICA_DAILY_SCAN';
const DEFAULT_URL    = 'https://www.ica.se/erbjudanden/ica-supermarket-frolunda-1003449/';

// ─── Meddelanden ──────────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'ICA_SCAN') {
    runIcaScan()
      .then(result => sendResponse({ success: true, ...result }))
      .catch(err   => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (msg.type === 'ICA_SET_AUTO') {
    setAutoScan(msg.enabled === true)
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

// ─── Auto-scan alarm ──────────────────────────────────────────────────────────
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== ALARM) return;
  const { icaAutoScanEnabled } = await chrome.storage.local.get('icaAutoScanEnabled');
  if (icaAutoScanEnabled !== true) return;
  await runIcaScan().catch(console.error);
});

chrome.runtime.onStartup.addListener(async () => {
  const { icaAutoScanEnabled } = await chrome.storage.local.get('icaAutoScanEnabled');
  if (icaAutoScanEnabled !== true) return;
  const existing = await chrome.alarms.get(ALARM);
  if (!existing) chrome.alarms.create(ALARM, { periodInMinutes: 1440 });
});

async function setAutoScan(enabled) {
  await chrome.storage.local.set({ icaAutoScanEnabled: enabled });
  if (enabled) {
    chrome.alarms.create(ALARM, { periodInMinutes: 1440 });
  } else {
    chrome.alarms.clear(ALARM);
  }
}

// ─── Scan-logik ───────────────────────────────────────────────────────────────
async function runIcaScan() {
  const { icaStoreUrl } = await chrome.storage.local.get('icaStoreUrl');
  const url = icaStoreUrl || DEFAULT_URL;

  const tab = await chrome.tabs.create({ url, active: false });

  let products = [];

  try {
    await waitForTab(tab.id, 30000);
    await new Promise((r) => setTimeout(r, 2000));

    const [injection] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func:   scrapeIcaDom
    });

    const result = injection?.result ?? {};
    products = result.products ?? [];
    for (const line of (result.debug ?? [])) console.log('[ICA-DBG]', line);
    console.log('[RaccoonLagoon] ICA scrape:', products.length, 'erbjudanden');
  } finally {
    try { await chrome.tabs.remove(tab.id); } catch (_) {}
  }

  if (products.length === 0) {
    throw new Error('Hittade 0 erbjudanden — sidan kanske inte laddades');
  }

  await chrome.storage.local.set({
    icaProducts:   products,
    icaLastScanAt: Date.now()
  });

  return { count: products.length };
}

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
