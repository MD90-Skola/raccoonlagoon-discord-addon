// tabs/settings.js — Settings tab: webhook, feature toggles, update check

import { showStatus } from './utils.js';

const REMOTE_MANIFEST = 'https://raw.githubusercontent.com/MD90-Skola/raccoonlagoon-discord-addon/master/manifest.json';
const REPO_URL        = 'https://github.com/MD90-Skola/raccoonlagoon-discord-addon';

function initSettingsSearch() {
  const input     = document.getElementById('settingsSearch');
  const clearBtn  = document.getElementById('settingsSearchClear');
  const noResults = document.getElementById('settingsNoResults');
  const section   = document.getElementById('tab-settings');

  function applyFilter(raw) {
    const q = raw.trim().toLowerCase();
    clearBtn.hidden = q.length === 0;

    const cards = section.querySelectorAll('.card');
    let anyVisible = false;

    cards.forEach(card => {
      if (!q) {
        card.hidden = false;
        card.querySelectorAll('.toggle-row').forEach(r => r.hidden = false);
        anyVisible = true;
        return;
      }

      // Check card title
      const title = (card.querySelector('.section-label')?.textContent || '').toLowerCase();
      const titleMatch = title.includes(q);

      // Check individual toggle rows
      const rows = card.querySelectorAll('.toggle-row');
      let rowMatch = false;
      rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        const match = text.includes(q);
        row.hidden = !match;
        if (match) rowMatch = true;
      });

      // Show card if title matches (show all rows) or at least one row matches
      if (titleMatch) {
        card.hidden = false;
        rows.forEach(r => r.hidden = false);
        anyVisible = true;
      } else if (rowMatch) {
        card.hidden = false;
        anyVisible = true;
      } else {
        card.hidden = true;
      }
    });

    noResults.classList.toggle('visible', !anyVisible);
  }

  input.addEventListener('input', () => applyFilter(input.value));
  clearBtn.addEventListener('click', () => {
    input.value = '';
    applyFilter('');
    input.focus();
  });
}

export function initSettings() {
  const webhookInput    = document.getElementById('webhookUrl');
  const saveWebhookBtn  = document.getElementById('saveWebhookBtn');
  const settingsStatus  = document.getElementById('settingsStatus');
  const imgToggle         = document.getElementById('imagesEnabled');
  const ytToggle          = document.getElementById('youtubeEnabled');
  const ytShortsToggle    = document.getElementById('youtubeShortsEnabled');
  const ytStreamToggle    = document.getElementById('youtubeStreamEnabled');
  const ytZoomToggle      = document.getElementById('youtubeZoomEnabled');
  const igToggle          = document.getElementById('instagramEnabled');
  const igReelsToggle     = document.getElementById('instagramReelsEnabled');
  const dropZoneToggle    = document.getElementById('dropZoneEnabled');
  const spellCheckToggle  = document.getElementById('spellCheckEnabled');
  const translateToggle   = document.getElementById('translateEnabled');
  const smartBoxToggle          = document.getElementById('smartBoxEnabled');
  const ytShortAutoscrollToggle = document.getElementById('youtubeShortAutoscrollEnabled');
  const igAutoscrollToggle      = document.getElementById('instagramAutoscrollEnabled');
  const globalToggle    = document.getElementById('globalEnabled');
  const recorderToggle  = document.getElementById('recorderEnabled');
  const checkUpdateBtn  = document.getElementById('checkUpdateBtn');
  const updateStatus    = document.getElementById('updateStatus');
  const currentVersionEl = document.getElementById('currentVersion');

  // ─── Search ───────────────────────────────────────────────────────────────
  initSettingsSearch();

  // ─── Visa nuvarande version ──────────────────────────────────────────────
  currentVersionEl.textContent = `v${chrome.runtime.getManifest().version}`;

  // ─── Spara webhook ────────────────────────────────────────────────────────
  saveWebhookBtn.addEventListener('click', async () => {
    const url = webhookInput.value.trim();
    if (!url) { showStatus(settingsStatus, 'Enter a webhook URL.', 'error'); return; }
    const valid =
      url.startsWith('https://discord.com/api/webhooks/') ||
      url.startsWith('https://discordapp.com/api/webhooks/') ||
      url.startsWith('https://ptb.discord.com/api/webhooks/') ||
      url.startsWith('https://canary.discord.com/api/webhooks/');
    if (!valid) { showStatus(settingsStatus, 'Invalid Discord webhook URL.', 'error'); return; }
    await Storage.set({ webhookUrl: url });
    showStatus(settingsStatus, 'Webhook saved!', 'success');
  });

  // ─── Kill switch helpers ──────────────────────────────────────────────────
  function featureCheckboxes() {
    return document.querySelectorAll('#tab-settings input[type="checkbox"]:not(#globalEnabled)');
  }

  function applyKillSwitch(globalOn) {
    if (!globalOn) {
      featureCheckboxes().forEach(t => { t.checked = false; t.disabled = true; });
    } else {
      featureCheckboxes().forEach(t => { t.disabled = false; });
      loadSettings(); // restore stored values
    }
  }

  // ─── Feature toggles ─────────────────────────────────────────────────────
  globalToggle.addEventListener('change', async () => {
    await Storage.set({ globalEnabled: globalToggle.checked });
    applyKillSwitch(globalToggle.checked);
  });
  recorderToggle.addEventListener('change', () => Storage.set({ recorderEnabled: recorderToggle.checked }));
  imgToggle.addEventListener('change',        () => Storage.set({ imagesEnabled:        imgToggle.checked        }));
  ytToggle.addEventListener('change',         () => Storage.set({ youtubeEnabled:       ytToggle.checked         }));
  ytShortsToggle.addEventListener('change',   () => Storage.set({ youtubeShortsEnabled: ytShortsToggle.checked   }));
  ytStreamToggle.addEventListener('change',   () => Storage.set({ youtubeStreamEnabled: ytStreamToggle.checked   }));
  ytZoomToggle.addEventListener('change',      () => Storage.set({ youtubeZoomEnabled:    ytZoomToggle.checked      }));
  igToggle.addEventListener('change',         () => Storage.set({ instagramEnabled:      igToggle.checked      }));
  igReelsToggle.addEventListener('change',    () => Storage.set({ instagramReelsEnabled: igReelsToggle.checked }));
  dropZoneToggle.addEventListener('change',   () => Storage.set({ dropZoneEnabled:      dropZoneToggle.checked   }));
  spellCheckToggle.addEventListener('change', () => Storage.set({ spellCheckEnabled:    spellCheckToggle.checked }));
  translateToggle.addEventListener('change',  () => Storage.set({ translateEnabled:     translateToggle.checked  }));
  smartBoxToggle.addEventListener('change',          () => Storage.set({ smartBoxEnabled:               smartBoxToggle.checked          }));
  ytShortAutoscrollToggle.addEventListener('change', () => Storage.set({ youtubeShortAutoscrollEnabled: ytShortAutoscrollToggle.checked }));
  igAutoscrollToggle.addEventListener('change',      () => Storage.set({ instagramAutoscrollEnabled:    igAutoscrollToggle.checked      }));

  // ─── Update check ─────────────────────────────────────────────────────────
  const currentVersion = chrome.runtime.getManifest().version;

  checkUpdateBtn.addEventListener('click', async () => {
    checkUpdateBtn.disabled = true;
    showStatus(updateStatus, 'Checking...', 'info');
    try {
      const res = await fetch(REMOTE_MANIFEST, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const remote = await res.json();
      const latest = remote.version;
      if (latest === currentVersion) {
        showStatus(updateStatus, `Already up to date (v${currentVersion})`, 'success');
      } else {
        updateStatus.innerHTML = '';
        const msg  = document.createElement('span');
        msg.textContent = `v${latest} available — `;
        const link = document.createElement('a');
        link.href        = REPO_URL;
        link.textContent = 'View on GitHub';
        link.target      = '_blank';
        link.rel         = 'noopener';
        updateStatus.appendChild(msg);
        updateStatus.appendChild(link);
        updateStatus.className = 'status-bar info';
      }
    } catch (_) {
      showStatus(updateStatus, 'Could not reach GitHub.', 'error');
    } finally {
      checkUpdateBtn.disabled = false;
    }
  });
}

export async function loadSettings() {
  const s = await Storage.getAll();
  const webhookInput = document.getElementById('webhookUrl');
  if (s.webhookUrl) webhookInput.value = s.webhookUrl;

  const globalOn = s.globalEnabled !== false; // default ON
  document.getElementById('globalEnabled').checked = globalOn;

  // If kill switch is OFF: show all feature toggles as disabled+unchecked
  if (!globalOn) {
    document.querySelectorAll('#tab-settings input[type="checkbox"]:not(#globalEnabled)')
      .forEach(t => { t.checked = false; t.disabled = true; });
    return;
  }

  // Kill switch is ON — restore actual values and ensure toggles are interactive
  document.querySelectorAll('#tab-settings input[type="checkbox"]:not(#globalEnabled)')
    .forEach(t => { t.disabled = false; });

  document.getElementById('recorderEnabled').checked = s.recorderEnabled !== false; // default ON
  document.getElementById('imagesEnabled').checked        = s.imagesEnabled        === true;
  document.getElementById('youtubeEnabled').checked       = s.youtubeEnabled       === true;
  document.getElementById('youtubeShortsEnabled').checked = s.youtubeShortsEnabled === true;
  document.getElementById('youtubeStreamEnabled').checked = s.youtubeStreamEnabled === true;
  document.getElementById('youtubeZoomEnabled').checked        = s.youtubeZoomEnabled        === true;
  document.getElementById('instagramEnabled').checked      = s.instagramEnabled      === true;
  document.getElementById('instagramReelsEnabled').checked = s.instagramReelsEnabled === true;
  document.getElementById('dropZoneEnabled').checked      = s.dropZoneEnabled      !== false;
  document.getElementById('spellCheckEnabled').checked    = s.spellCheckEnabled    !== false;
  document.getElementById('translateEnabled').checked     = s.translateEnabled     !== false;
  document.getElementById('smartBoxEnabled').checked                  = s.smartBoxEnabled                  !== false;
  document.getElementById('youtubeShortAutoscrollEnabled').checked   = s.youtubeShortAutoscrollEnabled   === true;
  document.getElementById('instagramAutoscrollEnabled').checked      = s.instagramAutoscrollEnabled      === true;
}
