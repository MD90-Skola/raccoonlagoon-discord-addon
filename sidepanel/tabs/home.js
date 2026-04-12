// tabs/home.js — tunn orchestrator; monterar home-komponenterna

import { template as clockTpl,    init as initClock    } from '../../components/clock/clock.js';
import { template as fasturlTpl,  init as initFastURL  } from '../../components/fasturl/fasturl.js';
import { template as dropzoneTpl, init as initDropzone } from '../../components/dropzone/dropzone.js';
import { template as smartboxTpl, init as initSmartBox } from '../../components/smartbox/smartbox.js';
import { template as recordTpl,        init as initRecord        } from '../../components/record/record.js';
import { template as elementKillerTpl, init as initElementKiller } from '../../components/elementkiller/elementkiller.js';

export function initHome() {
  const pane = document.getElementById('tab-home');
  pane.insertAdjacentHTML('beforeend', fasturlTpl);
  pane.insertAdjacentHTML('beforeend', clockTpl);
  pane.insertAdjacentHTML('beforeend', recordTpl);
  pane.insertAdjacentHTML('beforeend', elementKillerTpl);
  pane.insertAdjacentHTML('beforeend', smartboxTpl);
  pane.insertAdjacentHTML('beforeend', dropzoneTpl);
  initFastURL();
  initClock();
  initRecord();
  initElementKiller();
  initSmartBox();
  initDropzone();
}
