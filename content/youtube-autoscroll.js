// content/youtube-autoscroll.js — Auto-scroll to next Short when video ends

window.addEventListener('unhandledrejection', (e) => {
  if (e.reason?.message?.includes('Extension context invalidated')) e.preventDefault();
});

function isContextValid() {
  try { return !!chrome.runtime?.id; } catch (_) { return false; }
}

let enabled     = false;
let lastAdvance = 0;
const attached  = new WeakSet(); // tracks which video elements already have listeners

async function init() {
  if (!isContextValid()) return;
  enabled = await Storage.isEnabled('youtubeShortAutoscroll');

  try {
    chrome.storage.onChanged.addListener(async (changes) => {
      if (!isContextValid()) return;
      if ('youtubeShortAutoscrollEnabled' in changes || 'globalEnabled' in changes) {
        enabled = await Storage.isEnabled('youtubeShortAutoscroll');
      }
    });
  } catch (_) {}

  document.addEventListener('yt-navigate-finish', () => {
    if (!isContextValid()) return;
    scheduleAttach();
  });

  scheduleAttach();
}

let attachTimer = null;
function scheduleAttach() {
  clearTimeout(attachTimer);
  // 800 ms — enough for the Shorts player to settle and preloaded videos to appear
  attachTimer = setTimeout(tryAttach, 800);
}

function tryAttach() {
  if (!window.location.pathname.startsWith('/shorts/')) return;

  for (const video of document.querySelectorAll('video')) {
    if (attached.has(video)) continue;
    if (video.readyState === 0) continue; // skip unloaded elements

    attached.add(video);

    // ── Primary: 'ended' fires när Shortet är klart ──────────────────────────
    video.addEventListener('ended', onVideoEnded, { passive: true });

    // ── Backup: timeupdate vid 97% ────────────────────────────────────────────
    // Fångar fall där YouTube loopar utan att skicka 'ended'
    let lastCheck = 0;

    // Nollställ throttle vid seek — annars missar vi om användaren spolar nära slutet
    video.addEventListener('seeked', () => { lastCheck = 0; }, { passive: true });

    video.addEventListener('timeupdate', () => {
      if (!enabled) return;
      // Kontrollera bara aktiv video — inte preloaddade Shorts bredvid
      const renderer = video.closest('ytd-reel-video-renderer');
      if (renderer && !renderer.hasAttribute('is-active')) return;

      const now = Date.now();
      if (now - lastCheck < 2000) return;
      lastCheck = now;
      if (video.duration > 0 && video.currentTime / video.duration >= 0.97) {
        onVideoEnded();
      }
    }, { passive: true });
  }
}

function onVideoEnded() {
  if (!enabled) return;
  if (!window.location.pathname.startsWith('/shorts/')) return;
  const now = Date.now();
  if (now - lastAdvance < 2000) return; // prevent double-fires
  lastAdvance = now;
  advanceShort();
}

function advanceShort() {
  if (!isContextValid()) return;
  const btn =
    document.querySelector('#navigation-button-down button') ||
    document.querySelector('button[aria-label="Next video"]')  ||
    document.querySelector('ytd-shorts button[aria-label*="Next"]');

  if (btn) { btn.click(); return; }

  document.body.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'ArrowDown', keyCode: 40, bubbles: true, cancelable: true })
  );
}

init().catch(() => {});
