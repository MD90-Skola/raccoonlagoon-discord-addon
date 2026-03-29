// content/youtube-content.js
// Lägger Discord-knappen i:
//   1. YouTubes vanliga knapp-rad på /watch-sidan
//   2. YouTubes action-bar på /shorts/-sidan
// Kräver: Storage, Webhook, Icons

// Tysta "Extension context invalidated"-fel som kan läcka ur Chrome MV3
window.addEventListener('unhandledrejection', (e) => {
  if (e.reason?.message?.includes('Extension context invalidated')) e.preventDefault();
});

(function () {
  const WATCH_BTN_ID       = 'ds-youtube-page-btn';
  const SHORTS_BTN_ID      = 'ds-youtube-shorts-btn';
  const SHORTS_PLAY_BTN_ID = 'ds-youtube-shorts-play-btn';
  const STYLE_ID           = 'ds-youtube-page-style';

  // ─── URL-helpers ────────────────────────────────────────────────────────
  function isWatchPage()  { return window.location.pathname === '/watch'; }
  function isShortsPage() { return window.location.pathname.startsWith('/shorts/'); }

  // ─── CSS ────────────────────────────────────────────────────────────────
  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `

      /* ════ Watch-page button ════════════════════════════════════════ */
      #${WATCH_BTN_ID} { margin-left: 8px; }

      #${WATCH_BTN_ID} button {
        border: 0;
        background: transparent;
        cursor: pointer;
      }

      #${WATCH_BTN_ID} .ds-btn-core {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 40px;
        height: 36px;
        padding: 0 10px;
        border-radius: 18px;
        background: rgba(255,255,255,0.1);
        color: var(--yt-spec-text-primary, #fff);
        transition: opacity 0.15s ease, transform 0.15s ease;
      }
      #${WATCH_BTN_ID} .ds-btn-core:hover  { opacity: 0.85; }
      #${WATCH_BTN_ID} .ds-btn-core:active { transform: scale(0.98); }

      #${WATCH_BTN_ID} .ds-btn-icon {
        width: 20px; height: 20px;
        display: inline-flex; align-items: center; justify-content: center;
      }
      #${WATCH_BTN_ID} .ds-btn-icon svg {
        width: 20px; height: 20px;
        display: block; fill: currentColor;
      }
      #${WATCH_BTN_ID}.ds-sent .ds-btn-core { color: #5865F2; }


      /* ════ Shorts action-bar button ═════════════════════════════════ */
      #${SHORTS_BTN_ID} {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        margin: 4px 0;
      }

      #${SHORTS_BTN_ID} button {
        border: 0;
        cursor: pointer;
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: rgba(255,255,255,0.12);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.15s ease, transform 0.15s ease;
      }
      #${SHORTS_BTN_ID} button:hover  { background: rgba(255,255,255,0.20); }
      #${SHORTS_BTN_ID} button:active { transform: scale(0.93); }

      #${SHORTS_BTN_ID} .ds-shorts-icon svg {
        width: 24px; height: 24px;
        display: block; fill: #fff;
      }

      #${SHORTS_BTN_ID} .ds-shorts-label {
        font-size: 12px;
        color: rgba(255,255,255,0.9);
        font-family: 'Roboto', sans-serif;
        font-weight: 500;
        user-select: none;
      }

      #${SHORTS_BTN_ID}.ds-sent button        { background: rgba(88,101,242,0.35); }
      #${SHORTS_BTN_ID}.ds-sent .ds-shorts-icon svg { fill: #5865F2; }
      #${SHORTS_BTN_ID}.ds-sent .ds-shorts-label   { color: #5865F2; }

      /* ════ Shorts play button ════════════════════════════════════════ */
      #${SHORTS_PLAY_BTN_ID} {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        margin: 4px 0;
      }

      #${SHORTS_PLAY_BTN_ID} button {
        border: 0;
        cursor: pointer;
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: rgba(255,255,255,0.12);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.15s ease, transform 0.15s ease;
      }
      #${SHORTS_PLAY_BTN_ID} button:hover  { background: rgba(255,255,255,0.22); }
      #${SHORTS_PLAY_BTN_ID} button:active { transform: scale(0.93); }

      #${SHORTS_PLAY_BTN_ID} .ds-shorts-icon svg {
        width: 22px; height: 22px;
        display: block; fill: #fff;
      }

      #${SHORTS_PLAY_BTN_ID} .ds-shorts-label {
        font-size: 12px;
        color: rgba(255,255,255,0.9);
        font-family: 'Roboto', sans-serif;
        font-weight: 500;
        user-select: none;
      }

      /* Active = autoscroll on */
      #${SHORTS_PLAY_BTN_ID}.ds-play-active button              { background: rgba(139,92,246,0.40); }
      #${SHORTS_PLAY_BTN_ID}.ds-play-active .ds-shorts-icon svg { fill: #a78bfa; }
      #${SHORTS_PLAY_BTN_ID}.ds-play-active .ds-shorts-label    { color: #a78bfa; }
    `;
    document.head.appendChild(style);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // WATCH PAGE
  // ═══════════════════════════════════════════════════════════════════════

  function getButtonRow() {
    return (
      document.querySelector('ytd-watch-metadata #top-level-buttons-computed') ||
      document.querySelector('ytd-menu-renderer #top-level-buttons-computed') ||
      document.querySelector('#above-the-fold #top-level-buttons-computed')
    );
  }

  function getClockAnchor(row) {
    if (!row) return null;
    const candidates = Array.from(
      row.querySelectorAll('button, yt-button-shape button, tp-yt-paper-button, ytd-button-renderer')
    );
    const keywords = ['watch later', 'later', 'kolla senare', 'se senare', 'senare', 'save', 'spara', 'playlist'];
    for (const el of candidates) {
      const text = (
        el.getAttribute('aria-label') ||
        el.getAttribute('title') ||
        el.textContent || ''
      ).toLowerCase();
      if (keywords.some(w => text.includes(w))) {
        return el.closest('ytd-button-renderer, yt-button-shape, button, div') || el;
      }
    }
    return null;
  }

  function createWatchButton() {
    const wrapper = document.createElement('div');
    wrapper.id = WATCH_BTN_ID;

    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', 'Skicka till Discord');
    button.title = 'Skicka till Discord';
    button.innerHTML = `
      <span class="ds-btn-core">
        <span class="ds-btn-icon">${Icons.discord}</span>
      </span>
    `;

    button.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const enabled = await Storage.isEnabled('youtube');
      if (!enabled) return;
      const webhook = await Storage.getWebhook();
      if (!webhook) { alert('Ingen Discord webhook konfigurerad.'); return; }
      const result = await Webhook.send(webhook, window.location.href);
      if (result && result.success) {
        wrapper.classList.add('ds-sent');
        setTimeout(() => wrapper.classList.remove('ds-sent'), 1500);
      }
    });

    wrapper.appendChild(button);
    return wrapper;
  }

  async function injectWatchButton() {
    if (!isWatchPage()) { removeBtn(WATCH_BTN_ID); return; }
    const enabled = await Storage.isEnabled('youtube');
    if (!enabled)       { removeBtn(WATCH_BTN_ID); return; }
    if (document.getElementById(WATCH_BTN_ID)) return;

    const row = getButtonRow();
    if (!row) return;

    const btn    = createWatchButton();
    const anchor = getClockAnchor(row);
    if (anchor && anchor.parentNode) {
      anchor.insertAdjacentElement('afterend', btn);
    } else {
      row.appendChild(btn);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SHORTS PAGE
  // ═══════════════════════════════════════════════════════════════════════

  function getShortsActionBar() {
    // Prova flera selektorer för olika YouTube-versioner
    return (
      // Aktiv reel-renderer (när man scrollar i Shorts)
      document.querySelector('ytd-reel-video-renderer[is-active] #actions') ||
      // Fallback: första reel-renderer
      document.querySelector('ytd-reel-video-renderer #actions') ||
      // Alternativ struktur
      document.querySelector('ytd-shorts #actions') ||
      document.querySelector('#shorts-inner-container #actions')
    );
  }

  function createShortsButton() {
    const wrapper = document.createElement('div');
    wrapper.id = SHORTS_BTN_ID;

    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', 'Skicka till Discord');
    button.title = 'Skicka till Discord';
    button.innerHTML = `<span class="ds-shorts-icon">${Icons.discord}</span>`;

    button.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const enabled = await Storage.isEnabled('youtubeShorts');
      if (!enabled) return;
      const webhook = await Storage.getWebhook();
      if (!webhook) { alert('Ingen Discord webhook konfigurerad.'); return; }
      const result = await Webhook.send(webhook, window.location.href);
      if (result && result.success) {
        wrapper.classList.add('ds-sent');
        setTimeout(() => wrapper.classList.remove('ds-sent'), 1500);
      }
    });

    const label = document.createElement('span');
    label.className   = 'ds-shorts-label';
    label.textContent = 'Discord';

    wrapper.appendChild(button);
    wrapper.appendChild(label);
    return wrapper;
  }

  async function injectShortsButton() {
    if (!isShortsPage()) { removeBtn(SHORTS_BTN_ID); return; }
    const enabled = await Storage.isEnabled('youtubeShorts');
    if (!enabled)        { removeBtn(SHORTS_BTN_ID); return; }
    if (document.getElementById(SHORTS_BTN_ID)) return;

    const bar = getShortsActionBar();
    if (!bar) return;

    bar.appendChild(createShortsButton());
  }

  function getShortsVideoId() {
    const m = window.location.pathname.match(/\/shorts\/([^/?#]+)/);
    return m ? m[1] : null;
  }

  function setPlayBtnState(wrapper, isActive) {
    wrapper.classList.toggle('ds-play-active', isActive);
    wrapper.querySelector('.ds-shorts-label').textContent = isActive ? 'Auto ✓' : 'Auto';
  }

  function createShortsPlayButton() {
    const wrapper = document.createElement('div');
    wrapper.id = SHORTS_PLAY_BTN_ID;

    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', 'Toggle autoscroll');
    button.title = 'Toggle autoscroll';
    button.innerHTML = `
      <span class="ds-shorts-icon">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
      </span>`;

    button.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const current = await Storage.isEnabled('youtubeShortAutoscroll');
      const next = !current;
      await Storage.set({ youtubeShortAutoscrollEnabled: next });
      setPlayBtnState(wrapper, next);
    });

    const label = document.createElement('span');
    label.className   = 'ds-shorts-label';
    label.textContent = 'Auto';

    wrapper.appendChild(button);
    wrapper.appendChild(label);
    return wrapper;
  }

  async function injectShortsPlayButton() {
    if (!isShortsPage()) { removeBtn(SHORTS_PLAY_BTN_ID); return; }
    const enabled = await Storage.isEnabled('youtubeShorts');  // same toggle as Discord btn
    if (!enabled)        { removeBtn(SHORTS_PLAY_BTN_ID); return; }
    if (document.getElementById(SHORTS_PLAY_BTN_ID)) return;

    const bar = getShortsActionBar();
    if (!bar) return;

    const wrapper = createShortsPlayButton();
    bar.appendChild(wrapper);

    // Set initial visual state from storage
    const autoOn = await Storage.isEnabled('youtubeShortAutoscroll');
    setPlayBtnState(wrapper, autoOn);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SHARED HELPERS
  // ═══════════════════════════════════════════════════════════════════════

  function removeBtn(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
  }

  let retryTimer = null;
  let observer   = null;

  function isContextValid() {
    try { return !!chrome.runtime?.id; } catch (_) { return false; }
  }

  function scheduleInject(delay = 250) {
    if (!isContextValid()) return;
    clearTimeout(retryTimer);
    retryTimer = setTimeout(() => {
      if (!isContextValid()) return;
      injectWatchButton().catch(() => {});
      injectShortsButton().catch(() => {});
      injectShortsPlayButton().catch(() => {});
    }, delay);
  }

  function startObserver() {
    if (observer) observer.disconnect();
    observer = new MutationObserver(() => {
      if (!isContextValid()) { teardown(); return; }
      if (!isWatchPage())  removeBtn(WATCH_BTN_ID);
      if (!isShortsPage()) { removeBtn(SHORTS_BTN_ID); removeBtn(SHORTS_PLAY_BTN_ID); }
      if (isWatchPage()  && !document.getElementById(WATCH_BTN_ID))       scheduleInject(200);
      if (isShortsPage() && !document.getElementById(SHORTS_BTN_ID))      scheduleInject(200);
      if (isShortsPage() && !document.getElementById(SHORTS_PLAY_BTN_ID)) scheduleInject(200);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // ─── Teardown — kills EVERYTHING ─────────────────────────────────────────
  function teardown() {
    observer?.disconnect();
    observer = null;
    clearTimeout(retryTimer);
    retryTimer = null;
    removeBtn(WATCH_BTN_ID);
    removeBtn(SHORTS_BTN_ID);
    removeBtn(SHORTS_PLAY_BTN_ID);
  }

  // ─── Navigation (YouTube är en SPA) ──────────────────────────────────────
  document.addEventListener('yt-navigate-finish', () => {
    removeBtn(WATCH_BTN_ID);
    removeBtn(SHORTS_BTN_ID);
    removeBtn(SHORTS_PLAY_BTN_ID);
    scheduleInject(500);
  });

  // ─── Reagera på toggle-ändringar i inställningar ─────────────────────────
  chrome.storage.onChanged.addListener(async (changes) => {
    if (!isContextValid()) return;

    // Global kill switch
    if ('globalEnabled' in changes) {
      if (changes.globalEnabled.newValue === false) {
        teardown();
      } else {
        init();
      }
      return;
    }

    const ytOn     = await Storage.isEnabled('youtube');
    const shortsOn = await Storage.isEnabled('youtubeShorts');

    if ('youtubeEnabled' in changes || 'youtubeShortsEnabled' in changes) {
      if (!ytOn && !shortsOn) {
        teardown(); // both off — full stop
      } else {
        // Re-inject only what's enabled, observer keeps running
        if (!ytOn)     removeBtn(WATCH_BTN_ID);
        if (!shortsOn) { removeBtn(SHORTS_BTN_ID); removeBtn(SHORTS_PLAY_BTN_ID); }
        scheduleInject(100);
        if (!observer) startObserver();
      }
    }
  });

  // ─── Init ────────────────────────────────────────────────────────────────
  async function init() {
    if (!isContextValid()) return;
    const ytOn     = await Storage.isEnabled('youtube');
    const shortsOn = await Storage.isEnabled('youtubeShorts');
    if (!ytOn && !shortsOn) return;
    addStyles();
    scheduleInject(300);
    startObserver();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init().catch(() => {}));
  } else {
    init().catch(() => {});
  }

})();
