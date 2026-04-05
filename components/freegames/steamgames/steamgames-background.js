import { scrapeSteam } from './steamgames-scanner.js';
import { saveSteamGames } from './steamgames-storage.js';

const ALARM_STEAM = 'STEAM_DAILY_SCAN';
const STEAM_URL = 'https://store.steampowered.com/search?maxprice=free&supportedlang=english,swedish&specials=1&ndl=1';

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'STEAM_SCAN') {
    runSteamScan()
      .then((result) => sendResponse({ success: true, ...result }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (msg.type === 'STEAM_SET_AUTOSCAN') {
    setAutoScan(msg.enabled === true)
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.local.get('steamAutoScanEnabled');
  if (data.steamAutoScanEnabled === true) {
    chrome.alarms.create(ALARM_STEAM, { periodInMinutes: 1440 });
  }
});

chrome.runtime.onStartup.addListener(async () => {
  const data = await chrome.storage.local.get('steamAutoScanEnabled');
  if (data.steamAutoScanEnabled !== true) return;

  const existing = await chrome.alarms.get(ALARM_STEAM);
  if (!existing) {
    chrome.alarms.create(ALARM_STEAM, { periodInMinutes: 1440 });
  }
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== ALARM_STEAM) return;

  try {
    const result = await runSteamScan();

    if (Array.isArray(result.newGames) && result.newGames.length > 0) {
      notifyNewSteamGames(result.newGames);
    }
  } catch (err) {
    console.error('[STEAM] Daily scan failed:', err);
  }
});

async function runSteamScan() {
  const tab = await chrome.tabs.create({
    url: STEAM_URL,
    active: false
  });

  try {
    await waitForTab(tab.id);
    await sleep(3000);

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: scrapeSteam
    });

    const injection = results?.[0];
    if (!injection) {
      throw new Error('Kunde inte läsa Steam-sidan');
    }

    const games = Array.isArray(injection.result) ? injection.result : [];
    return await saveSteamGames(games);
  } finally {
    if (tab?.id) {
      try {
        await chrome.tabs.remove(tab.id);
      } catch (_) {}
    }
  }
}

async function setAutoScan(enabled) {
  await chrome.storage.local.set({ steamAutoScanEnabled: enabled });

  if (enabled) {
    chrome.alarms.create(ALARM_STEAM, { periodInMinutes: 1440 });
  } else {
    await chrome.alarms.clear(ALARM_STEAM);
  }
}

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
  return new Promise(resolve => setTimeout(resolve, ms));
}

function notifyNewSteamGames(newGames) {
  const count = newGames.length;

  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icon.png',
    title: 'Steam 100% Sale',
    message:
      count === 1
        ? `Nytt spel: ${newGames[0].title}`
        : `${count} nya Steam-spel hittades`
  });
}