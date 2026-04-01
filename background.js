// background.js — Service Worker
// Hanterar context menu för högerklick på bilder + öppnar side panel vid ikonklick

importScripts('components/storage.js', 'components/webhook.js');

// ─── Offscreen document (tab capture) ─────────────────────────────────────────

let _offscreenReadyPromise = null;

async function _ensureOffscreen() {
  const contexts = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] });
  if (contexts.length > 0) return;
  if (!_offscreenReadyPromise) {
    _offscreenReadyPromise = chrome.offscreen.createDocument({
      url: 'video-recorder/offscreen.html',
      reasons: ['TAB_CAPTURE'],
      justification: 'Record the active Chrome tab'
    }).finally(() => { _offscreenReadyPromise = null; });
  }
  return _offscreenReadyPromise;
}

// ─── Recorder port (sidepanel ↔ background) ───────────────────────────────────

let _recorderPort = null;

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'recorder') return;
  _recorderPort = port;

  port.onMessage.addListener(async (msg) => {
    if (msg.type === 'START_TAB') {
      try {
        // Use the window ID sent from the side panel for reliable tab lookup
        let tab;
        if (msg.windowId) {
          const tabs = await chrome.tabs.query({ active: true, windowId: msg.windowId });
          tab = tabs[0];
        }
        if (!tab) {
          const win = await chrome.windows.getLastFocused({ windowTypes: ['normal'] });
          const tabs = await chrome.tabs.query({ active: true, windowId: win?.id });
          tab = tabs[0];
        }
        if (!tab) throw new Error('No active tab found.');

        const url = tab.url || '';
        if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://') ||
            url.startsWith('about:') || url.startsWith('edge://') || url.startsWith('brave://')) {
          throw new Error('Cannot record this page — please switch to a regular website first.');
        }

        const streamId = await new Promise((resolve, reject) => {
          chrome.tabCapture.getMediaStreamId({ targetTabId: tab.id }, (id) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message + ' (tab: ' + url + ')'));
            } else {
              resolve(id);
            }
          });
        });

        await _ensureOffscreen();

        chrome.runtime.sendMessage({
          target: 'offscreen', type: 'START',
          streamId, audioMode: msg.audioMode, sizeLimitMb: msg.sizeLimitMb
        });
      } catch (e) {
        port.postMessage({ type: 'ERROR', message: e.message });
      }
      return;
    }

    if (msg.type === 'STOP') {
      chrome.runtime.sendMessage({ target: 'offscreen', type: 'STOP' }).catch(() => {});
    }
  });

  port.onDisconnect.addListener(() => {
    if (_recorderPort === port) _recorderPort = null;
    // Stop any in-progress offscreen recording
    chrome.runtime.sendMessage({ target: 'offscreen', type: 'STOP' }).catch(() => {});
  });
});

// ─── Relay messages from offscreen → sidepanel port ──────────────────────────

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.target !== 'background') return;
  if (!_recorderPort) return;
  if (msg.type === 'TICK' || msg.type === 'DONE' || msg.type === 'ERROR') {
    _recorderPort.postMessage(msg);
  }
});

// ─── Side Panel: öppnas direkt när användaren klickar på extension-ikonen ─────
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((err) => console.error('[RaccoonLagoon] setPanelBehavior error:', err));

// ─── F10 kortkommando öppnar side panel på aktiv tab ──────────────────────────
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'open-side-panel') return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;
  chrome.sidePanel.open({ windowId: tab.windowId });
});

// ─── Context Menu ─────────────────────────────────────────────────────────────

const MENU_ID = 'send-image-to-discord';

function createMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create(
      {
        id: MENU_ID,
        title: 'Skicka till Discord',
        contexts: ['image']
      },
      () => {
        if (chrome.runtime.lastError) {
          console.error('[RaccoonLagoon] Kunde inte skapa context menu:', chrome.runtime.lastError.message);
        }
      }
    );
  });
}

chrome.runtime.onInstalled.addListener(() => {
  createMenu();
});

createMenu();

// ─── Context Menu — skicka bildens URL till Discord ───────────────────────────

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId !== MENU_ID) return;

  if (!info.srcUrl) {
    console.warn('[RaccoonLagoon] Ingen bild-URL hittades.');
    return;
  }

  const settings = await Storage.getAll();

  if (!settings.imagesEnabled) {
    console.log('[RaccoonLagoon] Images är inaktiverat i inställningarna.');
    return;
  }

  if (!settings.webhookUrl) {
    console.warn('[RaccoonLagoon] Ingen webhook konfigurerad. Öppna side panel > Settings.');
    return;
  }

  const imageUrl = info.srcUrl.trim();

  // Stoppa base64/data-urls — Discord accepterar inte dessa
  if (imageUrl.startsWith('data:')) {
    console.warn('[RaccoonLagoon] Data-URL kan inte skickas direkt till Discord.');
    return;
  }

  // Stoppa för långa URL:er (Discord max ~2000 tecken)
  if (imageUrl.length > 1900) {
    console.warn('[RaccoonLagoon] Bildlänken är för lång för Discord:', imageUrl.length);
    return;
  }

  const result = await Webhook.send(settings.webhookUrl, imageUrl);

  if (!result.success) {
    console.error('[RaccoonLagoon] Kunde inte skicka bild:', result);
  } else {
    console.log('[RaccoonLagoon] Bild skickad via context menu.');
  }
});
