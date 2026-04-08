// sidepanel.js — Entry point

import { template as headerTpl, init as initHeader }        from '../components/header/header.js';
import { initHome }                                          from './tabs/home.js';
import { initNotes, loadNotes }                              from './tabs/notes.js';
import { initSettings, loadSettings, initColorPicker }       from './tabs/settings.js';
import { setBadge }                                          from './tabs/utils.js';
import { initRecorderTab, loadRecorderSettings }             from '../components/video-recorder/recorder-tab.js';
import { template as rustTpl, init as initScanner }          from './tabs/scanner.js';
import { template as freeGamesTpl, init as initFreeGames }   from '../components/freegames/freegames.js';
import { template as lidlTpl, init as initLidl }             from '../components/lidl/lidl.js';
import { template as smartmatTpl, init as initSmartmat }      from '../components/smartmat-scanner/smartmat-scanner.js';
import { initOptimize }                                      from './tabs/Optimize.js';
import { initMonkeyPatch }                                   from './tabs/monkey-patch.js';


document.getElementById('tab-bar').innerHTML = headerTpl;
initHeader();
initHome();
initNotes();
initSettings();
initColorPicker();
initRecorderTab();
document.getElementById('rustMount').outerHTML = rustTpl;
initScanner();
document.getElementById('freeGamesMount').outerHTML = freeGamesTpl;
initFreeGames();
document.getElementById('lidlMount').outerHTML = lidlTpl;
initLidl();
document.getElementById('smartmatMount').outerHTML = smartmatTpl;
initSmartmat();
initOptimize();
initMonkeyPatch();

// ─── Kill switch — root enforcement ───────────────────────────────────────────
// When globalEnabled is false: hide every tab except Settings and force navigate there.
// When re-enabled: loadSettings() restores individual tab visibility.
function enforceKillSwitch(enabled) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    if (btn.dataset.tab === 'settings') return;
    btn.hidden = !enabled;
    if (!enabled) btn.classList.remove('active');
  });

  document.querySelectorAll('.tab-pane').forEach(pane => {
    if (pane.id === 'tab-settings') return;
    if (!enabled) {
      pane.hidden = true;
      pane.classList.remove('active');
    }
  });

  if (!enabled) {
    // Force Settings tab active
    document.querySelector('[data-tab="settings"]')?.classList.add('active');
    const settingsPane = document.getElementById('tab-settings');
    if (settingsPane) {
      settingsPane.hidden = false;
      settingsPane.classList.add('active');
    }
  }
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !('globalEnabled' in changes)) return;
  const enabled = changes.globalEnabled.newValue !== false;
  enforceKillSwitch(enabled);
  // Re-enable: restore individual tab visibility via loadSettings
  if (enabled) loadSettings();
});

(async () => {
  setBadge('ready');
  await loadNotes();
  await loadSettings();
  await loadRecorderSettings();
  // Apply kill switch state on initial load
  enforceKillSwitch(document.getElementById('globalEnabled').checked);
})();
