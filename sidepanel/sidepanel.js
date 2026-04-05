// sidepanel.js — Entry point

import { template as headerTpl, init as initHeader }        from '../components/header/header.js';
import { initHome }                                          from './tabs/home.js';
import { initNotes, loadNotes }                              from './tabs/notes.js';
import { initSettings, loadSettings, initColorPicker }       from './tabs/settings.js';
import { setBadge }                                          from './tabs/utils.js';
import { initRecorderTab, loadRecorderSettings }             from '../components/video-recorder/recorder-tab.js';
import { initScanner }                                       from './tabs/scanner.js';
import { initFreeGames }                                     from '../components/freegames/freegames.js';
import { initOptimize }                                      from './tabs/Optimize.js';


document.getElementById('tab-bar').innerHTML = headerTpl;
initHeader();
initHome();
initNotes();
initSettings();
initColorPicker();
initRecorderTab();
initScanner();
initFreeGames();
initOptimize();

(async () => {
  setBadge('ready');
  await loadNotes();
  await loadSettings();
  await loadRecorderSettings();
})();
