// background.js — Service worker
// Hanterar context menu för högerklick på bilder

importScripts('components/storage.js', 'components/webhook.js');

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
          console.error('[Discord Sender] Kunde inte skapa context menu:', chrome.runtime.lastError.message);
        } else {
          console.log('[Discord Sender] Context menu skapad.');
        }
      }
    );
  });
}

chrome.runtime.onInstalled.addListener(() => {
  createMenu();
});

createMenu();

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId !== MENU_ID) return;

  if (!info.srcUrl) {
    console.warn('[Discord Sender] Ingen bild-URL hittades.');
    return;
  }

  const settings = await Storage.getAll();

  if (!settings.imagesEnabled) {
    console.log('[Discord Sender] Images är inaktiverat.');
    return;
  }

  if (!settings.webhookUrl) {
    console.warn('[Discord Sender] Ingen webhook konfigurerad.');
    return;
  }

  const imageUrl = info.srcUrl.trim();

  // Stoppa base64/data-urls
  if (imageUrl.startsWith('data:')) {
    console.warn('[Discord Sender] Den här bilden använder data-URL och kan inte skickas direkt till Discord.');
    alert('Den här bilden har ingen vanlig bildlänk. Testa en annan bild.');
    return;
  }

  // Stoppa för långa länkar
  if (imageUrl.length > 1900) {
    console.warn('[Discord Sender] Bildlänken är för lång för Discord:', imageUrl.length);
    alert('Bildlänken är för lång för Discord.');
    return;
  }

  const result = await Webhook.send(settings.webhookUrl, imageUrl);

  if (!result.success) {
    console.error('[Discord Sender] Kunde inte skicka bild:', result);
  } else {
    console.log('[Discord Sender] Bild skickad.');
  }
});