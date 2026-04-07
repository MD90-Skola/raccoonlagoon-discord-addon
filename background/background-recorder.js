// background-recorder.js — Offscreen document (tab capture) + recorder port

import { PORT_RECORDER, TARGET_OFFSCREEN, TARGET_BACKGROUND } from './constants.js';

// ─── Offscreen document ───────────────────────────────────────────────────────

let _offscreenReadyPromise = null;

async function _ensureOffscreen() {
  const contexts = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] });
  if (contexts.length > 0) return;
  if (!_offscreenReadyPromise) {
    _offscreenReadyPromise = chrome.offscreen.createDocument({
      url: 'components/video-recorder/offscreen.html',
      reasons: ['TAB_CAPTURE'],
      justification: 'Record the active Chrome tab'
    }).finally(() => { _offscreenReadyPromise = null; });
  }
  return _offscreenReadyPromise;
}

// ─── Recorder port (sidepanel ↔ background) ───────────────────────────────────

let _recorderPort = null;

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== PORT_RECORDER) return;
  _recorderPort = port;

  port.onMessage.addListener(async (msg) => {
    if (msg.type === 'START_TAB') {
      try {
        let tab;
        if (msg.windowId) {
          const tabs = await chrome.tabs.query({ active: true, windowId: msg.windowId });
          tab = tabs[0];
        }
        if (!tab) {
          const win = await chrome.windows.getLastFocused({ windowTypes: ['normal'] });
          const tabs = await chrome.tabs.query({ active: true, windowId: win?.id });
          tab = tabs[0];
        }
        if (!tab) throw new Error('No active tab found.');

        const url = tab.url || '';
        if (
          !url ||
          url.startsWith('chrome://') ||
          url.startsWith('chrome-extension://') ||
          url.startsWith('about:') ||
          url.startsWith('edge://') ||
          url.startsWith('brave://')
        ) {
          throw new Error('Cannot record this page — please switch to a regular website first.');
        }

        const streamId = await new Promise((resolve, reject) => {
          chrome.tabCapture.getMediaStreamId({ targetTabId: tab.id }, (id) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message + ' (tab: ' + url + ')'));
            } else {
              resolve(id);
            }
          });
        });

        await _ensureOffscreen();

        chrome.runtime.sendMessage({
          target: TARGET_OFFSCREEN,
          type: 'START',
          streamId,
          audioMode: msg.audioMode,
          sizeLimitMb: msg.sizeLimitMb
        });
      } catch (e) {
        port.postMessage({ type: 'ERROR', message: e.message });
      }
      return;
    }

    if (msg.type === 'STOP') {
      chrome.runtime.sendMessage({ target: TARGET_OFFSCREEN, type: 'STOP' }).catch(() => {});
    }
  });

  port.onDisconnect.addListener(() => {
    if (_recorderPort === port) _recorderPort = null;
    chrome.runtime.sendMessage({ target: TARGET_OFFSCREEN, type: 'STOP' }).catch(() => {});
  });
});

// ─── Relay: offscreen → sidepanel port ───────────────────────────────────────

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.target !== TARGET_BACKGROUND) return;
  if (!_recorderPort) return;
  if (msg.type === 'TICK' || msg.type === 'DONE' || msg.type === 'ERROR') {
    _recorderPort.postMessage(msg);
  }
});
