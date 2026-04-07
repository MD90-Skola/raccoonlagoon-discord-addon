// background-megacloudfix.js — Keeps declarativeNetRequest ruleset in sync with storage toggle

import { Storage } from './storage.js';

const RULESET_ID = 'ruleset_megacloud';

async function syncRuleset() {
  const { megaCloudFixEnabled } = await Storage.get('megaCloudFixEnabled');
  const on = megaCloudFixEnabled !== false;
  try {
    await chrome.declarativeNetRequest.updateEnabledRulesets(
      on
        ? { enableRulesetIds:  [RULESET_ID] }
        : { disableRulesetIds: [RULESET_ID] }
    );
  } catch (e) {
    console.error('[RaccoonLagoon] MegaCloudFix ruleset error:', e);
  }
}

chrome.runtime.onInstalled.addListener(() => syncRuleset());

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && 'megaCloudFixEnabled' in changes) syncRuleset();
});
