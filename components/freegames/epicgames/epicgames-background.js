import { scrapeEpic } from './epicgames-scanner.js';
import { saveGames } from './epicgames-storage.js';

const ALARM_EPIC = 'EPIC_DAILY_SCAN';

// ─── MESSAGE HANDLER ─────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'EPIC_SCAN') {
    runEpicScan()
      .then((result) => sendResponse({ success: true, ...result }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (msg.type === 'EPIC_SET_AUTOSCAN') {
    setAutoScan(msg.enabled === true)
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

// ─── AUTO SCAN SETUP ─────────────────────────────
chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.local.get('epicAutoScanEnabled');
  if (data.epicAutoScanEnabled === true) {
    chrome.alarms.create(ALARM_EPIC, { periodInMinutes: 1440 });
  }
});

chrome.runtime.onStartup.addListener(async () => {
  const data = await chrome.storage.local.get('epicAutoScanEnabled');
  if (data.epicAutoScanEnabled !== true) return;

  const existing = await chrome.alarms.get(ALARM_EPIC);
  if (!existing) {
    chrome.alarms.create(ALARM_EPIC, { periodInMinutes: 1440 });
  }
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== ALARM_EPIC) return;

  console.log('[EPIC] Running daily scan...');

  try {
    const result = await runEpicScan();

    if (Array.isArray(result.newGames) && result.newGames.length > 0) {
      notifyNewGames(result.newGames);
    }
  } catch (err) {
    console.error('[EPIC] Daily scan failed:', err);
  }
});

// ─── MAIN SCAN ─────────────────────────────
async function runEpicScan() {
  const tab = await chrome.tabs.create({
    url: 'https://store.epicgames.com/en-US/free-games',
    active: false
  });

  try {
    await waitForTab(tab.id);

    // Epic behöver lite extra tid (React)
    await sleep(3000);

const results = await chrome.scripting.executeScript({
  target: { tabId: tab.id },
  func: scrapeEpic
});

const injection = results?.[0];
if (!injection) {
  throw new Error('Kunde inte läsa Epic-sidan');
}

const games = Array.isArray(injection.result) ? injection.result : [];

    // 🔍 DEBUG
    console.log('[EPIC DEBUG]', games);

    const stored = await saveGames(games);

    return stored;
  } finally {
    if (tab?.id) {
      try { await chrome.tabs.remove(tab.id); } catch (_) {}
    }
  }
}

// ─── AUTO SCAN TOGGLE ─────────────────────────────
async function setAutoScan(enabled) {
  await chrome.storage.local.set({ epicAutoScanEnabled: enabled });

  if (enabled) {
    chrome.alarms.create(ALARM_EPIC, { periodInMinutes: 1440 });
    console.log('[EPIC] Auto-scan enabled');
  } else {
    await chrome.alarms.clear(ALARM_EPIC);
    console.log('[EPIC] Auto-scan disabled');
  }
}

// ─── HELPERS ─────────────────────────────
function waitForTab(tabId) {
  return new Promise((resolve) => {
    chrome.tabs.onUpdated.addListener(function listener(id, info) {
      if (id === tabId && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    });
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ─── NOTIFICATION ─────────────────────────────
function notifyNewGames(newGames) {
  const count = newGames.length;

  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icon.png',
    title: 'Epic Free Games',
    message:
      count === 1
        ? `Nytt gratis spel: ${newGames[0].title}`
        : `${count} nya gratis spel hittades`
  });
}