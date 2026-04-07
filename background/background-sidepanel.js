// background-sidepanel.js — Side panel-beteende + kortkommando

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((err) => console.error('[RaccoonLagoon] setPanelBehavior error:', err));

// F10 / Ctrl+Shift+Y öppnar side panel på aktiv tab
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'open-side-panel') return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;
  chrome.sidePanel.open({ windowId: tab.windowId });
});
