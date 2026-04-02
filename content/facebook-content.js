// content/facebook-content.js — Facebook Reels Discord-knapp
(function () {

  // ─── CSS ──────────────────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    .ds-fb-discord-btn {
      display: flex; align-items: center; justify-content: center;
      background: none; border: none; cursor: pointer;
      padding: 8px; margin: 0; color: #ffffff;
      transition: opacity 0.15s, background 0.15s;
      width: 48px; height: 48px; box-sizing: border-box;
      border-radius: 50%; flex-shrink: 0;
    }
    .ds-fb-discord-btn:hover { opacity: 0.8; background: rgba(255,255,255,0.12); }
    .ds-fb-discord-btn svg   { width: 26px; height: 26px; display: block; fill: currentColor; }
    .ds-fb-discord-btn.ds-sent { color: #5865F2; }
  `;
  document.head.appendChild(style);

  // ─── Helpers ──────────────────────────────────────────────────────────────
  function isContextValid() {
    try { return !!chrome.runtime?.id; } catch (_) { return false; }
  }

  function isReelPage() {
    return /facebook\.com\/reel(s)?\//.test(window.location.href);
  }

  function getReelUrl() {
    if (!isReelPage()) return null;
    // strip query params & trailing slash for a clean URL
    return window.location.origin + window.location.pathname.replace(/\/$/, '');
  }

  function removeAllButtons() {
    document.querySelectorAll('.ds-fb-discord-btn').forEach(b => b.remove());
  }

  // Returns true if the currently-visible action container already has our button.
  // Using the container (not a global button search) avoids false-positives when
  // an off-screen reel still has a button from a previous injection.
  function visibleContainerHasButton() {
    const container = findActionContainer();
    return !!container?.querySelector('.ds-fb-discord-btn');
  }

  // ─── Find where to inject ─────────────────────────────────────────────────
  // Facebook keeps multiple reels in the DOM. We only inject into the container
  // that is currently visible in the viewport.
  function findActionContainer() {
    const candidates = [
      '[aria-label="Share"]',
      '[aria-label="Dela"]',
      '[aria-label="Like"]',
      '[aria-label="Gilla"]',
      '[aria-label="Comment"]',
      '[aria-label="Kommentera"]',
      '[aria-label="Send in Messenger"]',
      '[aria-label="Skicka i Messenger"]',
    ];

    for (const sel of candidates) {
      for (const el of document.querySelectorAll(sel)) {
        // Skip elements outside the viewport
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.top > window.innerHeight || r.bottom < 0) continue;

        // Walk up until we find a container holding 2–12 interactive elements
        let node = el.parentElement;
        for (let d = 0; d < 10 && node && node !== document.body; d++, node = node.parentElement) {
          const btns = node.querySelectorAll('[role="button"], button');
          if (btns.length >= 2 && btns.length <= 12) return node;
        }
      }
    }
    return null;
  }

  // ─── Inject button ────────────────────────────────────────────────────────
  function injectButton() {
    const reelUrl = getReelUrl();
    if (!reelUrl) return;
    const container = findActionContainer();
    if (!container) return;
    // Per-container check — each reel container gets at most one button
    if (container.querySelector('.ds-fb-discord-btn')) return;

    const btn = document.createElement('button');
    btn.className = 'ds-fb-discord-btn';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Skicka till Discord');
    btn.innerHTML = Icons.discord;

    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (!await Storage.isEnabled('facebookReels')) return;
      const webhook = await Storage.getWebhook();
      if (!webhook) { alert('Ingen Discord webhook konfigurerad.'); return; }
      const result = await Webhook.send(webhook, getReelUrl());
      if (result.success) {
        btn.classList.add('ds-sent');
        setTimeout(() => btn.classList.remove('ds-sent'), 2000);
      }
    });

    container.appendChild(btn);
  }

  // ─── Retry injection ──────────────────────────────────────────────────────
  // Uses a debounce so rapid DOM mutations settle before attempting,
  // then retries until a button is visible in the viewport (up to ~4 s).
  let debounceTimer = null;
  let retryTimer    = null;
  let retrying      = false;
  const MAX_RETRIES = 20; // 20 × 200 ms = 4 s

  function scheduleInject() {
    // Debounce: wait for DOM activity to settle before starting
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(_startRetry, 150);
  }

  function _startRetry() {
    if (retrying) return;
    retrying = true;
    let count = 0;

    async function attempt() {
      if (!isContextValid() || !isReelPage()) { _stopRetry(); return; }
      if (!await Storage.isEnabled('facebookReels')) { _stopRetry(); return; }
      if (visibleContainerHasButton()) { _stopRetry(); return; } // already visible — done

      injectButton();

      if (visibleContainerHasButton()) { _stopRetry(); return; }

      count++;
      if (count < MAX_RETRIES) retryTimer = setTimeout(attempt, 200);
      else _stopRetry();
    }

    attempt();
  }

  function _stopRetry() {
    retrying = false;
    clearTimeout(retryTimer);
    retryTimer = null;
  }

  // ─── Observer ─────────────────────────────────────────────────────────────
  let observer = null;
  let lastUrl  = location.href;

  function startObserver() {
    if (observer) return;
    observer = new MutationObserver(() => {
      if (!isContextValid()) { teardown(); return; }

      // SPA navigation — URL changed
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        _stopRetry();          // cancel any in-flight retry for the old reel
        if (isReelPage()) scheduleInject();
        return;
      }

      // No visible button — trigger (debounced) re-inject
      if (isReelPage() && !visibleContainerHasButton()) {
        scheduleInject();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function teardown() {
    observer?.disconnect(); observer = null;
    clearTimeout(debounceTimer); debounceTimer = null;
    _stopRetry();
    removeAllButtons();
  }

  // ─── Init ─────────────────────────────────────────────────────────────────
  async function init() {
    if (!isContextValid()) return;
    if (!await Storage.isEnabled('facebookReels')) { teardown(); return; }
    if (isReelPage()) scheduleInject();
    startObserver();
  }

  init();

  // ─── React to settings changes ────────────────────────────────────────────
  chrome.storage.onChanged.addListener(async (changes) => {
    if (!isContextValid()) return;
    if ('globalEnabled' in changes) {
      changes.globalEnabled.newValue === false ? teardown() : init();
      return;
    }
    if ('facebookReelsEnabled' in changes) {
      if (await Storage.isEnabled('facebookReels')) init();
      else teardown();
    }
  });

})();
