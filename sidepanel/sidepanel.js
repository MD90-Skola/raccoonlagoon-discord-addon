// sidepanel.js — Entry point

import { initHome }                             from './tabs/home.js';
import { initNotes, loadNotes }                 from './tabs/notes.js';
import { initSettings, loadSettings }           from './tabs/settings.js';
import { setBadge }                             from './tabs/utils.js';
import { initRecorderTab, loadRecorderSettings } from '../video-recorder/recorder-tab.js';
import { initRecorderHome }                     from '../video-recorder/recorder-home.js';

// ─── Tab navigation ───────────────────────────────────────────────────────
const tabBtns  = document.querySelectorAll('.tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');

tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.tab;
    tabBtns.forEach(b => b.classList.remove('active'));
    tabPanes.forEach(p => { p.hidden = true; p.classList.remove('active'); });
    btn.classList.add('active');
    const pane = document.getElementById('tab-' + target);
    pane.hidden = false;
    requestAnimationFrame(() => pane.classList.add('active'));
  });
});

// ─── Init ─────────────────────────────────────────────────────────────────
initHome();
initNotes();
initSettings();
initRecorderTab();
initRecorderHome();

(async function init() {
  setBadge('ready');
  await loadNotes();
  await loadSettings();
  await loadRecorderSettings();
})();
