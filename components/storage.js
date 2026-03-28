// components/storage.js — Delad storage-modul
// Används av: background.js, instagram-content.js, youtube-content.js, popup.js
// Alla läs/skriv-operationer mot chrome.storage.local samlas här

var Storage = {

  // Returnerar false om extension context är ogiltig (t.ex. efter reload)
  _ok() {
    try { return !!chrome.runtime?.id; } catch (_) { return false; }
  },

  // Hämta ett eller flera värden
  async get(keys) {
    if (!this._ok()) return {};
    try { return await chrome.storage.local.get(keys); } catch (_) { return {}; }
  },

  // Spara ett eller flera värden
  async set(data) {
    if (!this._ok()) return;
    try { await chrome.storage.local.set(data); } catch (_) {}
  },

  // Hämta alla relevanta inställningar på en gång
  async getAll() {
    if (!this._ok()) return {};
    try {
      return await chrome.storage.local.get([
        'webhookUrl',
        'imagesEnabled',
        'youtubeEnabled',
        'youtubeShortsEnabled',
        'youtubeStreamEnabled',
        'youtubeZoomEnabled',
        'instagramEnabled'
      ]);
    } catch (_) { return {}; }
  },

  // Hämta webhook URL (returnerar null om ej satt)
  async getWebhook() {
    if (!this._ok()) return null;
    try {
      const data = await chrome.storage.local.get('webhookUrl');
      return data.webhookUrl || null;
    } catch (_) { return null; }
  },

  // Kolla om en specifik feature är aktiverad
  // Exempel: Storage.isEnabled('youtube') => läser 'youtubeEnabled'
  async isEnabled(feature) {
    if (!this._ok()) return false;
    const key = feature + 'Enabled';
    try {
      const data = await chrome.storage.local.get(key);
      return data[key] === true;
    } catch (_) { return false; }
  }

};
