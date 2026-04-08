// background/storage.js — ES module version av Storage för service worker
// components/storage.js är kvar som classic script för content scripts

export const Storage = {

  _ok() {
    try { return !!chrome.runtime?.id; } catch (_) { return false; }
  },

  async get(keys) {
    if (!this._ok()) return {};
    try { return await chrome.storage.local.get(keys); } catch (_) { return {}; }
  },

  async set(data) {
    if (!this._ok()) return;
    try { await chrome.storage.local.set(data); } catch (_) {}
  },

  async getAll() {
    if (!this._ok()) return {};
    try {
      return await chrome.storage.local.get([
        'webhooks',
        'webhookUrl',
        'imagesEnabled',
        'youtubeEnabled',
        'youtubeShortsEnabled',
        'youtubeStreamEnabled',
        'youtubeZoomEnabled',
        'youtubeRightClickEnabled',
        'instagramEnabled',
        'instagramReelsEnabled',
        'dropZoneEnabled',
        'spellCheckEnabled',
        'translateEnabled',
        'smartBoxEnabled',
        'youtubeShortAutoscrollEnabled',
        'instagramAutoscrollEnabled',
        'facebookReelsEnabled',
        'globalEnabled',
        'recorderEnabled',
        'rustReaEnabled',
        'rustAutoScanEnabled',
        'rustProducts',
        'rustAlerts',
        'rustLastScanAt',
        'megaCloudFixEnabled',
        'monkeyPatchTabVisible',
        'lidlLeaflets',
        'lidlLastFetch',
        'lidlAutoScan',
        'rustFinderEnabled',
        'freeGamesEnabled',
        'lidlEnabled',
        'icaScannerEnabled'
      ]);
    } catch (_) { return {}; }
  },

  async getWebhook() {
    if (!this._ok()) return null;
    try {
      const data = await chrome.storage.local.get(['webhooks', 'webhookUrl']);
      if (Array.isArray(data.webhooks) && data.webhooks.length) {
        const found = data.webhooks.find(w => w.enabled !== false && w.url);
        if (found) return found.url;
      }
      return data.webhookUrl || null;
    } catch (_) { return null; }
  },

  async isEnabled(feature) {
    if (!this._ok()) return false;
    const key = feature + 'Enabled';
    try {
      const data = await chrome.storage.local.get([key, 'globalEnabled']);
      if (data.globalEnabled === false) return false;
      return data[key] === true;
    } catch (_) { return false; }
  }

};
