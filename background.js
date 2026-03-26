// background.js — Service worker
// Hanterar context menu för högerklick på bilder

// Importera delade moduler (storage + webhook)
importScripts('components/storage.js', 'components/webhook.js');

// ─── Skapa context menu vid installation ────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'send-image-to-discord',
    title: 'Skicka till Discord',
    contexts: ['image']
  });
});

// ─── Hantera klick på context menu ──────────────────────────────────────────

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId !== 'send-image-to-discord') return;

  const settings = await Storage.getAll();

  // Avbryt om Images-toggle är av
  if (!settings.imagesEnabled) {
    console.log('[Discord Sender] Images är inaktiverat.');
    return;
  }

  // Avbryt om ingen webhook är konfigurerad
  if (!settings.webhookUrl) {
    console.warn('[Discord Sender] Ingen webhook konfigurerad. Öppna tillägget.');
    return;
  }

  // Skicka bildens URL till Discord
  await Webhook.send(settings.webhookUrl, info.srcUrl);
});
