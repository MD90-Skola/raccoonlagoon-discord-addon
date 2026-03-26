// components/storage.js — Delad storage-modul
// Används av: background.js, instagram-content.js, youtube-content.js, popup.js
// Alla läs/skriv-operationer mot chrome.storage.local samlas här

var Storage = {

  // Hämta ett eller flera värden
  async get(keys) {
    return chrome.storage.local.get(keys);
  },

  // Spara ett eller flera värden
  async set(data) {
    return chrome.storage.local.set(data);
  },

  // Hämta alla relevanta inställningar på en gång
  async getAll() {
    return chrome.storage.local.get([
      'webhookUrl',
      'imagesEnabled',
      'youtubeEnabled',
      'instagramEnabled'
    ]);
  },

  // Hämta webhook URL (returnerar null om ej satt)
  async getWebhook() {
    const data = await chrome.storage.local.get('webhookUrl');
    return data.webhookUrl || null;
  },

  // Kolla om en specifik feature är aktiverad
  // Exempel: Storage.isEnabled('youtube') => läser 'youtubeEnabled'
  async isEnabled(feature) {
    const key = feature + 'Enabled';
    const data = await chrome.storage.local.get(key);
    return data[key] === true;
  }

};
