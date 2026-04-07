// tabs/settings.js — Settings tab: webhook, feature toggles, update check

import { showStatus } from './utils.js';

const REMOTE_MANIFEST = 'https://raw.githubusercontent.com/MD90-Skola/raccoonlagoon-discord-addon/master/manifest.json';
const REPO_URL        = 'https://github.com/MD90-Skola/raccoonlagoon-discord-addon';

// ─── Webhook state ────────────────────────────────────────────────────────────
let webhooks = [];

function isValidWebhookUrl(url) {
  return url.startsWith('https://discord.com/api/webhooks/') ||
         url.startsWith('https://discordapp.com/api/webhooks/') ||
         url.startsWith('https://ptb.discord.com/api/webhooks/') ||
         url.startsWith('https://canary.discord.com/api/webhooks/');
}

async function saveWebhooks() {
  await Storage.set({ webhooks });
}

function buildWebhookEntry(wh) {
  const el = document.createElement('div');
  el.className = 'webhook-entry';
  el.dataset.id = wh.id;

  el.innerHTML = `
    <div class="wh-top-row">
      <label class="toggle-switch">
        <input type="checkbox" class="wh-toggle" ${wh.enabled !== false ? 'checked' : ''} />
        <span class="slider"></span>
      </label>
      <button class="btn-remove wh-remove" title="Ta bort">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div class="wh-field-row">
      <span class="wh-field-label">Namn</span>
      <input type="text" class="text-input wh-name" placeholder="Server namn" />
    </div>
    <div class="wh-field-row">
      <span class="wh-field-label">Channel</span>
      <input type="text" class="text-input wh-channel" placeholder="#kanal" />
    </div>
    <div class="wh-field-row">
      <span class="wh-field-label">Key</span>
      <div class="wh-key-wrap">
        <input type="password" class="text-input wh-url" placeholder="https://discord.com/api/webhooks/..." autocomplete="off" />
        <button class="wh-eye-btn" type="button" title="Visa / dölj">
          <svg class="eye-show" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          <svg class="eye-hide" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" hidden><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
        </button>
      </div>
    </div>
    <div class="wh-actions-row">
      <button class="btn-primary wh-save-btn">Spara</button>
    </div>
  `;

  // Sätt värden säkert (undviker HTML-injection via value-property)
  el.querySelector('.wh-name').value    = wh.name    || '';
  el.querySelector('.wh-channel').value = wh.channel || '';
  el.querySelector('.wh-url').value     = wh.url     || '';

  // Toggle enabled/disabled
  el.querySelector('.wh-toggle').addEventListener('change', async e => {
    wh.enabled = e.target.checked;
    await saveWebhooks();
  });

  // Ta bort
  el.querySelector('.wh-remove').addEventListener('click', async () => {
    webhooks = webhooks.filter(w => w.id !== wh.id);
    await saveWebhooks();
    el.remove();
  });

  // Visa/dölj key
  const urlInput = el.querySelector('.wh-url');
  el.querySelector('.wh-eye-btn').addEventListener('click', () => {
    const show = urlInput.type === 'password';
    urlInput.type = show ? 'text' : 'password';
    el.querySelector('.eye-show').hidden = show;
    el.querySelector('.eye-hide').hidden = !show;
  });

  // Spara
  el.querySelector('.wh-save-btn').addEventListener('click', async () => {
    const url      = urlInput.value.trim();
    const statusEl = document.getElementById('settingsStatus');
    if (!url)                    { showStatus(statusEl, 'Ange en webhook URL.', 'error'); return; }
    if (!isValidWebhookUrl(url)) { showStatus(statusEl, 'Ogiltig Discord webhook URL.', 'error'); return; }
    wh.name    = el.querySelector('.wh-name').value.trim();
    wh.channel = el.querySelector('.wh-channel').value.trim();
    wh.url     = url;
    await saveWebhooks();
    showStatus(statusEl, 'Webhook sparad.', 'success');
  });

  return el;
}

function renderWebhooks() {
  const list = document.getElementById('webhookList');
  list.innerHTML = '';
  webhooks.forEach(wh => list.appendChild(buildWebhookEntry(wh)));
}

async function loadWebhooks() {
  const data = await Storage.get(['webhooks', 'webhookUrl']);
  if (Array.isArray(data.webhooks)) {
    webhooks = data.webhooks;
  } else if (data.webhookUrl) {
    // Migration från gammal enskild webhook
    webhooks = [{ id: Date.now().toString(36), name: '', channel: '', url: data.webhookUrl, enabled: true }];
    await Storage.set({ webhooks });
  } else {
    webhooks = [];
  }
  renderWebhooks();
}

function addNewWebhook() {
  const wh = { id: Date.now().toString(36), name: '', channel: '', url: '', enabled: true };
  webhooks.push(wh);
  const el = buildWebhookEntry(wh);
  document.getElementById('webhookList').appendChild(el);
  el.querySelector('.wh-name').focus();
}

// ─── Search ───────────────────────────────────────────────────────────────────
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

// ─── Card visibility ──────────────────────────────────────────────────────────
function applyCardVisibility(cardId, visible) {
  const card = document.getElementById(cardId);
  if (card) card.hidden = !visible;
}

// ─── Tab visibility ───────────────────────────────────────────────────────────
function applyTabVisibility(btnId, tabName, visible) {
  const btn  = document.getElementById(btnId);
  if (!btn) return;
  btn.hidden = !visible;
  const pane = document.getElementById('tab-' + tabName);
  if (!visible && pane && !pane.hidden) {
    document.querySelector('.tab-btn:not([hidden])')?.click();
  }
}

export function initSettings() {
  const imgToggle         = document.getElementById('imagesEnabled');
  const ytToggle          = document.getElementById('youtubeEnabled');
  const ytShortsToggle    = document.getElementById('youtubeShortsEnabled');
  const ytStreamToggle    = document.getElementById('youtubeStreamEnabled');
  const ytZoomToggle           = document.getElementById('youtubeZoomEnabled');
  const ytRightClickToggle     = document.getElementById('youtubeRightClickEnabled');
  const igToggle          = document.getElementById('instagramEnabled');
  const igReelsToggle     = document.getElementById('instagramReelsEnabled');
  const fbReelsToggle     = document.getElementById('facebookReelsEnabled');
  const dropZoneToggle    = document.getElementById('dropZoneEnabled');
  const spellCheckToggle  = document.getElementById('spellCheckEnabled');
  const translateToggle   = document.getElementById('translateEnabled');
  const smartBoxToggle          = document.getElementById('smartBoxEnabled');
  const ytShortAutoscrollToggle = document.getElementById('youtubeShortAutoscrollEnabled');
  const igAutoscrollToggle      = document.getElementById('instagramAutoscrollEnabled');
  const globalToggle      = document.getElementById('globalEnabled');
  const recorderToggle    = document.getElementById('recorderEnabled');
  const rustReaToggle     = document.getElementById('rustReaEnabled');
  const rustFinderToggle  = document.getElementById('rustFinderEnabled');
  const freeGamesToggle   = document.getElementById('freeGamesEnabled');
  const lidlToggle        = document.getElementById('lidlEnabled');
  const checkUpdateBtn    = document.getElementById('checkUpdateBtn');
  const updateStatus    = document.getElementById('updateStatus');
  const currentVersionEl = document.getElementById('currentVersion');

  // ─── Search ───────────────────────────────────────────────────────────────
  initSettingsSearch();

  // ─── Visa nuvarande version ──────────────────────────────────────────────
  currentVersionEl.textContent = `v${chrome.runtime.getManifest().version}`;

  // ─── Webhooks ─────────────────────────────────────────────────────────────
  loadWebhooks();
  document.getElementById('addWebhookBtn').addEventListener('click', addNewWebhook);

  // ─── Kill switch helpers ──────────────────────────────────────────────────
  function featureCheckboxes() {
    return document.querySelectorAll('#tab-settings input[type="checkbox"]:not(#globalEnabled):not(.wh-toggle):not(.fu-toggle)');
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
  ytZoomToggle.addEventListener('change',       () => Storage.set({ youtubeZoomEnabled:         ytZoomToggle.checked       }));
  ytRightClickToggle.addEventListener('change', () => Storage.set({ youtubeRightClickEnabled: ytRightClickToggle.checked }));
  igToggle.addEventListener('change',         () => Storage.set({ instagramEnabled:      igToggle.checked      }));
  igReelsToggle.addEventListener('change',    () => Storage.set({ instagramReelsEnabled: igReelsToggle.checked }));
  fbReelsToggle.addEventListener('change',    () => Storage.set({ facebookReelsEnabled:  fbReelsToggle.checked }));
  dropZoneToggle.addEventListener('change',   () => Storage.set({ dropZoneEnabled:      dropZoneToggle.checked   }));
  spellCheckToggle.addEventListener('change', () => Storage.set({ spellCheckEnabled:    spellCheckToggle.checked }));
  translateToggle.addEventListener('change',  () => Storage.set({ translateEnabled:     translateToggle.checked  }));
  smartBoxToggle.addEventListener('change',          () => Storage.set({ smartBoxEnabled:               smartBoxToggle.checked          }));
  ytShortAutoscrollToggle.addEventListener('change', () => Storage.set({ youtubeShortAutoscrollEnabled: ytShortAutoscrollToggle.checked }));
  igAutoscrollToggle.addEventListener('change',      () => Storage.set({ instagramAutoscrollEnabled:    igAutoscrollToggle.checked      }));
  rustReaToggle.addEventListener('change',     () => Storage.set({ rustReaEnabled: rustReaToggle.checked }));
  rustFinderToggle.addEventListener('change', () => {
    Storage.set({ rustFinderEnabled: rustFinderToggle.checked });
    applyCardVisibility('rustFinderCard', rustFinderToggle.checked);
  });
  freeGamesToggle.addEventListener('change', () => {
    Storage.set({ freeGamesEnabled: freeGamesToggle.checked });
    applyCardVisibility('freeGamesCard', freeGamesToggle.checked);
  });
  lidlToggle.addEventListener('change', () => {
    Storage.set({ lidlEnabled: lidlToggle.checked });
    applyCardVisibility('lidlCard', lidlToggle.checked);
  });

  // ─── Tab visibility toggles ───────────────────────────────────────────────
  const tabHomeToggle       = document.getElementById('tabHomeVisible');
  const tabNotesToggle      = document.getElementById('tabNotesVisible');
  const tabScannerToggle    = document.getElementById('tabScannerVisible');
  const tabOptimizeToggle   = document.getElementById('tabOptimizeVisible');
  const tabMonkeyPatchToggle = document.getElementById('tabMonkeyPatchVisible');

  tabHomeToggle.addEventListener('change', () => {
    Storage.set({ tabHomeVisible: tabHomeToggle.checked });
    applyTabVisibility('homeTabBtn', 'home', tabHomeToggle.checked);
  });
  tabNotesToggle.addEventListener('change', () => {
    Storage.set({ tabNotesVisible: tabNotesToggle.checked });
    applyTabVisibility('notesTabBtn', 'notes', tabNotesToggle.checked);
  });
  tabScannerToggle.addEventListener('change', () => {
    Storage.set({ rustReaEnabled: tabScannerToggle.checked });
    applyTabVisibility('scannerTabBtn', 'scanner', tabScannerToggle.checked);
  });
  tabOptimizeToggle.addEventListener('change', () => {
    Storage.set({ tabOptimizeVisible: tabOptimizeToggle.checked });
    applyTabVisibility('optimizeTabBtn', 'optimize', tabOptimizeToggle.checked);
  });
  tabMonkeyPatchToggle.addEventListener('change', () => {
    Storage.set({ monkeyPatchTabVisible: tabMonkeyPatchToggle.checked });
    applyTabVisibility('monkeyPatchTabBtn', 'monkey-patch', tabMonkeyPatchToggle.checked);
  });

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

// ─── Accent color picker ───────────────────────────────────────────────────────

function applyAccentColor(hex) {
  // All derived colors (--purple-light, --purple-glow, etc.) use color-mix(in srgb, var(--purple) X%, ...)
  // in CSS, so they auto-recompute when only --purple changes.
  document.documentElement.style.setProperty('--purple', hex);
}

const DEFAULT_ACCENT = '#6D54CF';

export function initColorPicker() {
  const picker    = document.getElementById('accentColorPicker');
  const resetBtn  = document.getElementById('accentColorReset');
  if (!picker) return;

  chrome.storage.local.get('accentColor', ({ accentColor }) => {
    if (accentColor) {
      picker.value = accentColor;
      applyAccentColor(accentColor);
    }
  });

  picker.addEventListener('input',  () => applyAccentColor(picker.value));
  picker.addEventListener('change', () => chrome.storage.local.set({ accentColor: picker.value }));

  resetBtn?.addEventListener('click', () => {
    picker.value = DEFAULT_ACCENT;
    applyAccentColor(DEFAULT_ACCENT);
    chrome.storage.local.remove('accentColor');
  });
}

export async function loadSettings() {
  const s = await Storage.getAll();

  const globalOn = s.globalEnabled !== false; // default ON
  document.getElementById('globalEnabled').checked = globalOn;

  // Om kill switch är AV: visa alla feature-toggles som disabled+unchecked
  if (!globalOn) {
    document.querySelectorAll('#tab-settings input[type="checkbox"]:not(#globalEnabled):not(.wh-toggle):not(.fu-toggle)')
      .forEach(t => { t.checked = false; t.disabled = true; });
    return;
  }

  // Kill switch är PÅ — återställ faktiska värden
  document.querySelectorAll('#tab-settings input[type="checkbox"]:not(#globalEnabled):not(.wh-toggle):not(.fu-toggle)')
    .forEach(t => { t.disabled = false; });

  document.getElementById('recorderEnabled').checked = s.recorderEnabled !== false; // default ON
  document.getElementById('imagesEnabled').checked        = s.imagesEnabled        === true;
  document.getElementById('youtubeEnabled').checked       = s.youtubeEnabled       === true;
  document.getElementById('youtubeShortsEnabled').checked = s.youtubeShortsEnabled === true;
  document.getElementById('youtubeStreamEnabled').checked = s.youtubeStreamEnabled === true;
  document.getElementById('youtubeZoomEnabled').checked        = s.youtubeZoomEnabled        === true;
  document.getElementById('youtubeRightClickEnabled').checked  = s.youtubeRightClickEnabled  === true;
  document.getElementById('instagramEnabled').checked      = s.instagramEnabled      === true;
  document.getElementById('instagramReelsEnabled').checked = s.instagramReelsEnabled === true;
  document.getElementById('facebookReelsEnabled').checked  = s.facebookReelsEnabled  === true;
  document.getElementById('dropZoneEnabled').checked      = s.dropZoneEnabled      !== false;
  document.getElementById('spellCheckEnabled').checked    = s.spellCheckEnabled    !== false;
  document.getElementById('translateEnabled').checked     = s.translateEnabled     !== false;
  document.getElementById('smartBoxEnabled').checked                  = s.smartBoxEnabled                  !== false;
  document.getElementById('youtubeShortAutoscrollEnabled').checked   = s.youtubeShortAutoscrollEnabled   === true;
  document.getElementById('instagramAutoscrollEnabled').checked      = s.instagramAutoscrollEnabled      === true;
  document.getElementById('rustReaEnabled').checked = s.rustReaEnabled === true;

  // ─── Scanner card visibility ──────────────────────────────────────────────
  const rustFinderV = s.rustFinderEnabled !== false;
  const freeGamesV  = s.freeGamesEnabled  !== false;
  const lidlV       = s.lidlEnabled       !== false;

  document.getElementById('rustFinderEnabled').checked = rustFinderV;
  document.getElementById('freeGamesEnabled').checked  = freeGamesV;
  document.getElementById('lidlEnabled').checked       = lidlV;

  applyCardVisibility('rustFinderCard', rustFinderV);
  applyCardVisibility('freeGamesCard',  freeGamesV);
  applyCardVisibility('lidlCard',       lidlV);

  // ─── Tab visibility ───────────────────────────────────────────────────────
  const tabHomeV       = s.tabHomeVisible       !== false;
  const tabNotesV      = s.tabNotesVisible      !== false;
  const tabScannerV    = s.rustReaEnabled        === true;
  const tabOptimizeV   = s.tabOptimizeVisible   !== false;
  const tabMonkeyV     = s.monkeyPatchTabVisible !== false;

  document.getElementById('tabHomeVisible').checked       = tabHomeV;
  document.getElementById('tabNotesVisible').checked      = tabNotesV;
  document.getElementById('tabScannerVisible').checked    = tabScannerV;
  document.getElementById('tabOptimizeVisible').checked   = tabOptimizeV;
  document.getElementById('tabMonkeyPatchVisible').checked = tabMonkeyV;

  applyTabVisibility('homeTabBtn',       'home',         tabHomeV);
  applyTabVisibility('notesTabBtn',      'notes',        tabNotesV);
  applyTabVisibility('scannerTabBtn',    'scanner',      tabScannerV);
  applyTabVisibility('optimizeTabBtn',   'optimize',     tabOptimizeV);
  applyTabVisibility('monkeyPatchTabBtn', 'monkey-patch', tabMonkeyV);
}
