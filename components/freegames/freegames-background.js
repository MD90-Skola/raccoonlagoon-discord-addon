import * as epic  from './epic.js';
import * as steam from './steam.js';
import { saveGames } from './freegames-storage.js';

// ─── SCANNER REGISTRY ────────────────────────────────────────────────────────
// To add a new source: create gog.js with the same exports, then add it here.
const SCANNERS = [epic, steam];

const ALARM = 'FREE_GAMES_DAILY_SCAN';

// ─── MESSAGE HANDLER ──────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'FREE_GAMES_SCAN') {
    chrome.storage.local.get('freeGamesEnabled', ({ freeGamesEnabled }) => {
      if (freeGamesEnabled === false) {
        sendResponse({ success: false, error: 'Free Games är inaktiverat' });
        return;
      }
      runAllScanners()
        .then(result => sendResponse({ success: true, ...result }))
        .catch(err   => sendResponse({ success: false, error: err.message }));
    });
    return true;
  }

  if (msg.type === 'FREE_GAMES_SET_AUTOSCAN') {
    setAutoScan(msg.enabled === true)
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

// ─── AUTO SCAN SETUP ──────────────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.local.get('freeGamesAutoScanEnabled');
  if (data.freeGamesAutoScanEnabled === true) {
    chrome.alarms.create(ALARM, { periodInMinutes: 1440 });
  }
});

chrome.runtime.onStartup.addListener(async () => {
  const data = await chrome.storage.local.get('freeGamesAutoScanEnabled');
  if (data.freeGamesAutoScanEnabled !== true) return;

  const existing = await chrome.alarms.get(ALARM);
  if (!existing) {
    chrome.alarms.create(ALARM, { periodInMinutes: 1440 });
  }
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== ALARM) return;
  const { freeGamesEnabled } = await chrome.storage.local.get('freeGamesEnabled');
  if (freeGamesEnabled === false) return;

  try {
    const result = await runAllScanners();
    if (result.newGames.length > 0) {
      notifyNewGames(result.newGames);
    }
  } catch (err) {
    console.error('[FreeGames] Daily scan failed:', err);
  }
});

// ─── SCAN ─────────────────────────────────────────────────────────────────────
async function runAllScanners() {
  const allGames     = [];
  const sourceResults = [];

  for (const scanner of SCANNERS) {
    try {
      const games = await runScanner(scanner);
      allGames.push(...games);
      sourceResults.push({ label: scanner.label, url: scanner.url, count: games.length });
    } catch (err) {
      console.error(`[FreeGames] Scanner "${scanner.id}" failed:`, err);
      sourceResults.push({ label: scanner.label, url: scanner.url, count: null });
    }
  }

  const saved = await saveGames(allGames);
  return { ...saved, sourceResults };
}

async function runScanner(scanner) {
  const tab = await chrome.tabs.create({ url: scanner.url, active: false });

  try {
    await waitForTab(tab.id);

    const tabInfo = await chrome.tabs.get(tab.id);
    if (tabInfo.url?.startsWith('chrome-error://')) {
      throw new Error(`Page failed to load: ${scanner.url}`);
    }

    await sleep(scanner.delay);

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: scanner.scrape
    });

    const injection = results?.[0];
    if (!injection) throw new Error(`No injection result from ${scanner.id}`);

    const games = Array.isArray(injection.result) ? injection.result : [];
    return games.map(g => ({ ...g, source: scanner.id }));
  } finally {
    if (tab?.id) {
      try { await chrome.tabs.remove(tab.id); } catch (_) {}
    }
  }
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if ('freeGamesEnabled' in changes && changes.freeGamesEnabled.newValue === false) {
    chrome.alarms.clear(ALARM);
  }
});

// ─── AUTO SCAN TOGGLE ─────────────────────────────────────────────────────────
async function setAutoScan(enabled) {
  await chrome.storage.local.set({ freeGamesAutoScanEnabled: enabled });

  if (enabled) {
    chrome.alarms.create(ALARM, { periodInMinutes: 1440 });
  } else {
    await chrome.alarms.clear(ALARM);
  }
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function waitForTab(tabId) {
  return new Promise((resolve, reject) => {
    const listener = (id, info) => {
      if (id !== tabId) return;
      if (info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
    setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new Error('Tab load timeout'));
    }, 30000);
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ─── NOTIFICATION ─────────────────────────────────────────────────────────────
function notifyNewGames(newGames) {
  const count = newGames.length;
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icon.png',
    title: 'Free Games',
    message: count === 1
      ? `Nytt gratis spel: ${newGames[0].title}`
      : `${count} nya gratis spel hittades`
  });
}
