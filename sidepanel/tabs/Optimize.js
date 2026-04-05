// sidepanel/tabs/Optimize.js

import { template as commandboxTpl, init as initCommandBox } from '../../components/optimize/commandbox.js';

export function initOptimize() {
  const pane = document.getElementById('tab-optimize');
  if (!pane) return;

  pane.innerHTML = commandboxTpl;
  initCommandBox();
}