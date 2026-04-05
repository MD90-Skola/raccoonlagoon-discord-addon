// content/instagram-autoscroll.js — Auto-scroll to next Reel when video ends

window.addEventListener('unhandledrejection', (e) => {
  if (e.reason?.message?.includes('Extension context invalidated')) e.preventDefault();
});

function isContextValid() {
  try { return !!chrome.runtime?.id; } catch (_) { return false; }
}

let enabled      = false;
let igObserver   = null;
let attachTimer  = null;

async function init() {
  if (!isContextValid()) return;
  enabled = await Storage.isEnabled('instagramAutoscroll');
  if (!enabled) return; // don't even start if disabled

  try {
    chrome.storage.onChanged.addListener(async (changes) => {
      if (!isContextValid()) return;
      if ('instagramAutoscrollEnabled' in changes || 'globalEnabled' in changes) {
        enabled = await Storage.isEnabled('instagramAutoscroll');
        if (!enabled) teardown();
      }
    });
  } catch (_) {}

  watchForVideos();
}

// ─── Teardown — kills EVERYTHING ─────────────────────────────────────────────
function teardown() {
  igObserver?.disconnect();
  igObserver = null;
  clearTimeout(attachTimer);
  attachTimer = null;
}

// ─── Debounced attach ─────────────────────────────────────────────────────────
function scheduleAttach() {
  clearTimeout(attachTimer);
  attachTimer = setTimeout(tryAttach, 500);
}

function watchForVideos() {
  tryAttach();
  if (igObserver) return;
  igObserver = new MutationObserver(() => {
    if (!isContextValid()) { teardown(); return; }
    scheduleAttach();
  });
  igObserver.observe(document.body, { subtree: true, childList: true });
}

function tryAttach() {
  for (const video of document.querySelectorAll('video')) {
    if (video._raccoonAttached) continue;
    video._raccoonAttached = true;

    // Cache the scroll parent once so we don't recompute getComputedStyle every timeupdate
    let scroller = null;
    let lastAdvance = 0;

    video.addEventListener('timeupdate', () => {
      if (!enabled) return;
      const now = Date.now();
      if (now - lastAdvance < 3000) return;
      if (video.duration > 0 && video.currentTime / video.duration >= 0.93) {
        lastAdvance = now;
        if (!scroller) scroller = findScrollParent(video);
        advanceReel(scroller);
      }
    }, { passive: true });
  }
}

function advanceReel(scroller) {
  if (!isContextValid()) return;

  // 1. Try clicking a visible next/chevron button
  const btn =
    document.querySelector('button[aria-label="Next"]') ||
    document.querySelector('button[aria-label*="next" i]') ||
    document.querySelector('svg[aria-label="Next"]')?.closest('button');

  if (btn) { btn.click(); return; }

  // 2. Scroll the cached scroll container
  if (scroller && scroller !== document.body && scroller !== document.documentElement) {
    scroller.scrollBy({ top: scroller.clientHeight, behavior: 'smooth' });
    return;
  }

  // 3. Fallback: window scroll
  window.scrollBy({ top: window.innerHeight, behavior: 'smooth' });
}

// Walk up the DOM once to find the scrollable ancestor
function findScrollParent(el) {
  let node = el.parentElement;
  while (node && node !== document.body) {
    const { overflowY } = window.getComputedStyle(node);
    if (/(auto|scroll)/.test(overflowY) && node.scrollHeight > node.clientHeight) {
      return node;
    }
    node = node.parentElement;
  }
  return document.body;
}

init().catch(() => {});
