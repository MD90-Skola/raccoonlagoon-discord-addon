// background-contextmenu.js — Context menu: skapa + klickhantering

import { Storage } from './storage.js';
import { Webhook } from './webhook.js';
import { MENU_ID, YT_MENU_ID, YT_MENU_ID_TIME } from './constants.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function catchErr() {
  if (chrome.runtime.lastError) {
    console.error('[RaccoonLagoon] Context menu error:', chrome.runtime.lastError.message);
  }
}

function getActiveWebhooks(settings) {
  if (Array.isArray(settings.webhooks) && settings.webhooks.length) {
    return settings.webhooks.filter(w => w.enabled !== false && w.url);
  }
  if (settings.webhookUrl) return [{ url: settings.webhookUrl, channel: 'Discord' }];
  return [];
}

function webhookLabel(wh) {
  return wh.channel || wh.name || wh.url;
}

// ─── Rebuild all menus from current storage state ─────────────────────────────

async function rebuildMenus() {
  const settings = await Storage.getAll();
  const globalOn = settings.globalEnabled !== false;

  chrome.contextMenus.removeAll(() => {
    // Image menu — alltid synlig om addon är på
    if (globalOn) {
      chrome.contextMenus.create(
        { id: MENU_ID, title: 'Skicka till Discord', contexts: ['image'] },
        catchErr
      );
    }

    // YouTube högerklick-meny
    if (globalOn && settings.youtubeRightClickEnabled) {
      const hooks = getActiveWebhooks(settings);
      if (!hooks.length) return;

      const multi = hooks.length > 1;
      const ytContexts = ['page', 'frame', 'selection', 'link'];
      const ytPatterns  = ['*://www.youtube.com/watch*'];

      if (multi) {
        // ── Parent items (submeny) ───────────────────────────────────────────
        chrome.contextMenus.create({
          id: YT_MENU_ID,
          title: 'Skicka till Discord',
          contexts: ytContexts,
          documentUrlPatterns: ytPatterns
        }, catchErr);

        chrome.contextMenus.create({
          id: YT_MENU_ID_TIME,
          title: 'Skicka vid aktuell tid',
          contexts: ytContexts,
          documentUrlPatterns: ytPatterns
        }, catchErr);

        // ── Barnmenyer för YT_MENU_ID ────────────────────────────────────────
        chrome.contextMenus.create({
          id: YT_MENU_ID + '-default',
          parentId: YT_MENU_ID,
          title: 'Standard',
          contexts: ytContexts,
          documentUrlPatterns: ytPatterns
        }, catchErr);

        hooks.forEach((wh, i) => {
          chrome.contextMenus.create({
            id: `${YT_MENU_ID}-wh-${i}`,
            parentId: YT_MENU_ID,
            title: webhookLabel(wh),
            contexts: ytContexts,
            documentUrlPatterns: ytPatterns
          }, catchErr);
        });

        // ── Barnmenyer för YT_MENU_ID_TIME ───────────────────────────────────
        chrome.contextMenus.create({
          id: YT_MENU_ID_TIME + '-default',
          parentId: YT_MENU_ID_TIME,
          title: 'Standard',
          contexts: ytContexts,
          documentUrlPatterns: ytPatterns
        }, catchErr);

        hooks.forEach((wh, i) => {
          chrome.contextMenus.create({
            id: `${YT_MENU_ID_TIME}-wh-${i}`,
            parentId: YT_MENU_ID_TIME,
            title: webhookLabel(wh),
            contexts: ytContexts,
            documentUrlPatterns: ytPatterns
          }, catchErr);
        });

      } else {
        // ── En webhook: platt meny utan submeny ──────────────────────────────
        const suffix = ` · ${webhookLabel(hooks[0])}`;

        chrome.contextMenus.create({
          id: YT_MENU_ID,
          title: `Skicka till Discord${suffix}`,
          contexts: ytContexts,
          documentUrlPatterns: ytPatterns
        }, catchErr);

        chrome.contextMenus.create({
          id: YT_MENU_ID_TIME,
          title: `Skicka vid aktuell tid${suffix}`,
          contexts: ytContexts,
          documentUrlPatterns: ytPatterns
        }, catchErr);
      }
    }
  });
}

// ─── Init ─────────────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => rebuildMenus());
rebuildMenus();

// Rebuild when relevant settings change
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  const triggers = ['globalEnabled', 'youtubeRightClickEnabled', 'webhooks', 'webhookUrl'];
  if (triggers.some(k => k in changes)) rebuildMenus();
});

// ─── Click handler ────────────────────────────────────────────────────────────

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const settings = await Storage.getAll();

  if (settings.globalEnabled === false) return;

  // ── Image: högerklick på bild ──────────────────────────────────────────────
  if (info.menuItemId === MENU_ID) {
    if (!info.srcUrl) return;
    if (!settings.imagesEnabled) return;

    const webhook = await Storage.getWebhook();
    if (!webhook) return;

    const imageUrl = info.srcUrl.trim();
    if (imageUrl.startsWith('data:') || imageUrl.length > 1900) return;

    const result = await Webhook.send(webhook, imageUrl);
    if (!result.success) console.error('[RaccoonLagoon] Kunde inte skicka bild:', result);
    return;
  }

  // ── YouTube: högerklick-meny ────────────────────────────────────────────────
  const id = String(info.menuItemId);

  // Kontrollera time-varianten först (dess prefix är längre och specifik)
  const isYtTime = id === YT_MENU_ID_TIME || id.startsWith(YT_MENU_ID_TIME + '-');
  const isYtSend = !isYtTime && (id === YT_MENU_ID || id.startsWith(YT_MENU_ID + '-'));

  if (!isYtSend && !isYtTime) return;
  if (!settings.youtubeRightClickEnabled) return;

  const hooks = getActiveWebhooks(settings);
  if (!hooks.length) return;

  // ── Hitta rätt webhook ───────────────────────────────────────────────────────
  let webhookUrl = null;

  if (id === YT_MENU_ID || id === YT_MENU_ID_TIME) {
    // Platt klick (en webhook)
    webhookUrl = hooks[0].url;
  } else if (id.endsWith('-default')) {
    // "Standard" — första aktiva webhook
    webhookUrl = hooks[0].url;
  } else {
    // Specifik webhook: parsa index från suffix "wh-N"
    const baseId = isYtTime ? YT_MENU_ID_TIME : YT_MENU_ID;
    const suffix  = id.slice(baseId.length + 1); // t.ex. "wh-2"
    const match   = suffix.match(/^wh-(\d+)$/);
    if (!match) return;
    const idx = parseInt(match[1], 10);
    if (!hooks[idx]) return;
    webhookUrl = hooks[idx].url;
  }

  if (!webhookUrl) return;

  const baseUrl = info.pageUrl || tab?.url;
  if (!baseUrl) return;

  let sendUrl = baseUrl;

  // ── Lägg till tidsstämpel för time-varianter ────────────────────────────────
  if (isYtTime && tab?.id) {
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const video = document.querySelector('video');
          return video ? Math.floor(video.currentTime) : 0;
        }
      });
      const time = results?.[0]?.result ?? 0;
      if (time > 0) {
        sendUrl = baseUrl.includes('?')
          ? `${baseUrl}&t=${time}`
          : `${baseUrl}?t=${time}`;
      }
    } catch (_) {
      // scripting misslyckades — skicka utan tid
    }
  }

  const result = await Webhook.send(webhookUrl, sendUrl);
  if (!result.success) console.error('[RaccoonLagoon] Kunde inte skicka YouTube-länk:', result);
});
