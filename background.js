// background.js — Service Worker
// Hanterar context menu för högerklick på bilder + öppnar side panel vid ikonklick

importScripts('components/storage.js', 'components/webhook.js');

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
