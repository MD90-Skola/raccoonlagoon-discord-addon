// sidepanel/tabs/monkey-patch.js

import { template as megaCloudFixTpl, init as initMegaCloudFix } from '../../components/megacloudfix/megacloudfix.js';

export function initMonkeyPatch() {
  const pane = document.getElementById('tab-monkey-patch');
  if (!pane) return;

  pane.innerHTML = megaCloudFixTpl;
  initMegaCloudFix();
}
