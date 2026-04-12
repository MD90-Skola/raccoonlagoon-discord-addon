// background/background-elementkiller.js — Element Killer message relay

// ── Keyboard shortcuts → active tab ──────────────────────────────────────────
chrome.commands?.onCommand?.addListener(async command => {
  if (command === 'toggle-element-killer') await _forwardToActiveTab('TOGGLE').catch(() => {});
  if (command === 'toggle-element-paint')  await _forwardToActiveTab('PAINT_TOGGLE').catch(() => {});
  if (command === 'toggle-element-thief')  await _forwardToActiveTab('THIEF_TOGGLE').catch(() => {});
});

// ── Relay sidepanel messages → active tab content script ─────────────────────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg) return false;

  // State update from content script → write to storage so sidepanel can sync
  if (msg.type === 'EK_STATE_UPDATE') {
    chrome.storage.local.set({
      ekActive:       msg.isActive     ?? false,
      ekPaintActive:  msg.paintActive  ?? false,
      ekThiefActive:  msg.thiefActive  ?? false,
      ekDeletedCount: msg.deletedCount ?? 0,
    });
    return false;
  }

  if (!msg.type?.startsWith('ELEMENT_KILLER_')) return false;

  const innerType = {
    ELEMENT_KILLER_TOGGLE:     'TOGGLE',
    ELEMENT_KILLER_PAINT:      'PAINT_TOGGLE',
    ELEMENT_KILLER_THIEF:      'THIEF_TOGGLE',
    ELEMENT_KILLER_UNDO:       'UNDO',
    ELEMENT_KILLER_CLEAR:      'CLEAR_HIDDEN',
    ELEMENT_KILLER_DEACTIVATE: 'DEACTIVATE',
    ELEMENT_KILLER_GET_STATE:  'GET_STATE',
  }[msg.type];

  if (!innerType) return false;

  (async () => {
    try {
      const res = await _forwardToActiveTab(innerType);
      sendResponse(res ?? {});
    } catch (err) {
      sendResponse({ error: err.message });
    }
  })();
  return true;
});

// ── Helper: send to active tab, inject content script on demand ───────────────
async function _forwardToActiveTab(type) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error('no active tab');

  // Skip chrome:// and extension pages — scripting not allowed there
  const url = tab.url ?? '';
  if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('about:')) {
    throw new Error('unsupported page');
  }

  try {
    return await chrome.tabs.sendMessage(tab.id, { target: 'elementkiller', type });
  } catch (_) {
    // Content script not yet injected on this tab — inject now and retry
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files:  ['content/elementkiller-content.js'],
    });
    await new Promise(r => setTimeout(r, 60));
    return await chrome.tabs.sendMessage(tab.id, { target: 'elementkiller', type });
  }
}
