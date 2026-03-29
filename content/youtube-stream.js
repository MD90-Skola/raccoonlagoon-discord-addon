// content/youtube-stream.js — YouTube Stream Mode
window.addEventListener('unhandledrejection', (e) => {
  if (e.reason?.message?.includes('Extension context invalidated')) e.preventDefault();
});
// Layout: Header → Video → horisontell thumbnails-rad längst ner.
// Extras: mushjul-scroll på thumbnails, toggle-knapp i headern.
// Kräver: Storage

(function () {
  const STREAM_BTN_ID   = 'ds-yt-stream-btn';
  const THUMBS_DIV_ID   = 'ds-stream-thumbs';
  const MASTHEAD_BTN_ID = 'ds-masthead-toggle';
  const STREAM_CLASS    = 'ds-stream-mode';
  const THUMBS_HIDDEN   = 'ds-thumbs-hidden';
  const STYLE_ID        = 'ds-stream-style';

  const HEADER_H  = 56;
  const THUMBS_H  = 148;
  const THUMB_W   = 188;
  const THUMB_IMG = Math.round(THUMB_W * 9 / 16); // ≈ 106px

  let streamActive  = false;
  let thumbsVisible = true;

  function isWatchPage() {
    return window.location.pathname === '/watch';
  }

  // ─── CSS ──────────────────────────────────────────────────────────────────
  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      body.${STREAM_CLASS} { overflow: hidden !important; }

      /* Video: fyller utrymmet mellan header och thumbnail-raden */
      body.${STREAM_CLASS} #movie_player {
        position: fixed !important;
        top: ${HEADER_H}px !important;
        left: 0 !important;
        width: 100vw !important;
        height: calc(100vh - ${HEADER_H}px - ${THUMBS_H}px) !important;
        z-index: 2000 !important;
        background: #000 !important;
        border-radius: 0 !important;
      }

      /* När thumbnails är gömda expanderar videon */
      body.${STREAM_CLASS}.${THUMBS_HIDDEN} #movie_player {
        height: calc(100vh - ${HEADER_H}px) !important;
      }

      /* Dölj allt utom spelaren */
      body.${STREAM_CLASS} #secondary,
      body.${STREAM_CLASS} ytd-watch-metadata,
      body.${STREAM_CLASS} #below,
      body.${STREAM_CLASS} #info,
      body.${STREAM_CLASS} #meta,
      body.${STREAM_CLASS} #top-row,
      body.${STREAM_CLASS} ytd-watch-flexy #actions,
      body.${STREAM_CLASS} #description-inner,
      body.${STREAM_CLASS} ytd-merch-shelf-renderer,
      body.${STREAM_CLASS} ytd-item-section-renderer,
      body.${STREAM_CLASS} #chat-container,
      body.${STREAM_CLASS} ytd-live-chat-frame {
        display: none !important;
      }

      /* ─── Stream-knapp (i spelaren) ──────────────────────────────── */
      /* Matcha YouTubes egna ytp-button exakt så kontroll-raden inte rubbas */
      #${STREAM_BTN_ID} {
        opacity: 0.9;
        width: 48px !important;
        height: 48px !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        padding: 0 !important;
        vertical-align: middle !important;
        box-sizing: border-box !important;
      }
      #${STREAM_BTN_ID} svg {
        width: 22px !important;
        height: 22px !important;
        display: block !important;
        flex-shrink: 0 !important;
      }
      #${STREAM_BTN_ID}:hover { opacity: 1 !important; }
      #${STREAM_BTN_ID}.ds-stream-on svg path { fill: #a78bfa !important; }

      /* ─── Masthead toggle-knapp ───────────────────────────────────── */
      #${MASTHEAD_BTN_ID} {
        display: none;          /* dold som standard */
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        border: none;
        background: transparent;
        border-radius: 50%;
        cursor: pointer;
        color: var(--yt-spec-text-primary, #fff);
        opacity: 0.85;
        transition: background .15s, opacity .15s;
        flex-shrink: 0;
      }
      body.${STREAM_CLASS} #${MASTHEAD_BTN_ID} {
        display: flex;          /* visas bara i stream mode */
      }
      #${MASTHEAD_BTN_ID}:hover {
        background: rgba(255,255,255,0.1);
        opacity: 1;
      }
      #${MASTHEAD_BTN_ID} svg {
        width: 22px;
        height: 22px;
        pointer-events: none;
      }
      /* Aktiv (thumbnails dolda): ikonen tonas ned */
      #${MASTHEAD_BTN_ID}.${THUMBS_HIDDEN} {
        opacity: 0.4;
      }

      /* ─── Thumbnails-overlay ──────────────────────────────────────── */
      #${THUMBS_DIV_ID} {
        position: fixed;
        bottom: 0; left: 0;
        width: 100vw;
        height: ${THUMBS_H}px;
        background: #0f0f0f;
        border-top: 1px solid #272727;
        z-index: 2001;
        display: flex;
        flex-direction: row;
        align-items: flex-start;
        overflow-x: auto;
        overflow-y: hidden;
        gap: 8px;
        padding: 10px 16px;
        box-sizing: border-box;
        scrollbar-width: thin;
        scrollbar-color: #444 transparent;
      }

      #${THUMBS_DIV_ID} a {
        flex-shrink: 0;
        width: ${THUMB_W}px;
        display: flex;
        flex-direction: column;
        gap: 5px;
        text-decoration: none;
        color: #eee;
        cursor: pointer;
        transition: opacity .15s;
      }
      #${THUMBS_DIV_ID} a:hover { opacity: .8; }

      #${THUMBS_DIV_ID} img {
        width: ${THUMB_W}px;
        height: ${THUMB_IMG}px;
        object-fit: cover;
        border-radius: 6px;
        background: #222;
        display: block;
      }

      #${THUMBS_DIV_ID} span {
        font-size: 11px;
        line-height: 1.35;
        max-height: 2.7em;
        overflow: hidden;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        font-family: 'Roboto', sans-serif;
      }
    `;
    document.head.appendChild(style);
  }

  // ─── Bygg thumbnails-overlay ──────────────────────────────────────────────
  function buildThumbs() {
    document.getElementById(THUMBS_DIV_ID)?.remove();

    const secondary = document.querySelector('#secondary');
    if (!secondary) { setTimeout(buildThumbs, 600); return; }

    const seen  = new Set();
    const items = [];

    secondary.querySelectorAll('a[href*="/watch?v="]').forEach(anchor => {
      let videoId;
      try { videoId = new URL(anchor.href).searchParams.get('v'); }
      catch (_) { return; }
      if (!videoId || seen.has(videoId)) return;
      seen.add(videoId);

      const card    = anchor.closest('ytd-compact-video-renderer, ytd-video-renderer');
      const titleEl = card?.querySelector('[title], #video-title, h3 span');
      const title   = titleEl?.getAttribute('title') || titleEl?.textContent?.trim() || '';
      items.push({ href: anchor.href, videoId, title });
    });

    if (!items.length) { setTimeout(buildThumbs, 700); return; }

    const overlay = document.createElement('div');
    overlay.id = THUMBS_DIV_ID;

    // ── Mushjul → horisontell scroll ──────────────────────────────────────
    overlay.addEventListener('wheel', (e) => {
      if (e.deltaY === 0) return;
      e.preventDefault();
      overlay.scrollLeft += e.deltaY * 2.5;
    }, { passive: false });

    items.forEach(({ href, videoId, title }) => {
      const a   = document.createElement('a');
      a.href    = href;

      const img    = document.createElement('img');
      img.src      = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
      img.alt      = title;
      img.loading  = 'lazy';

      const label       = document.createElement('span');
      label.textContent = title;

      a.appendChild(img);
      a.appendChild(label);
      overlay.appendChild(a);
    });

    // Dölj direkt om toggle redan är av
    if (!thumbsVisible) overlay.style.display = 'none';

    document.body.appendChild(overlay);
  }

  function removeThumbs() {
    document.getElementById(THUMBS_DIV_ID)?.remove();
  }

  // ─── Toggle thumbnails (masthead-knappen) ─────────────────────────────────
  function toggleThumbs() {
    thumbsVisible = !thumbsVisible;

    const overlay = document.getElementById(THUMBS_DIV_ID);
    if (overlay) overlay.style.display = thumbsVisible ? '' : 'none';

    document.body.classList.toggle(THUMBS_HIDDEN, !thumbsVisible);

    const btn = document.getElementById(MASTHEAD_BTN_ID);
    if (btn) btn.classList.toggle(THUMBS_HIDDEN, !thumbsVisible);
  }

  // ─── Masthead toggle-knapp ────────────────────────────────────────────────
  // SVG: skärm med en nedre bar = "thumbnails-raden"
  const MASTHEAD_ICON = `
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="3" width="20" height="18" rx="2"
            stroke="currentColor" stroke-width="1.8"/>
      <line x1="2" y1="16.5" x2="22" y2="16.5"
            stroke="currentColor" stroke-width="1.8"/>
      <circle cx="7"  cy="19.5" r="1" fill="currentColor"/>
      <circle cx="12" cy="19.5" r="1" fill="currentColor"/>
      <circle cx="17" cy="19.5" r="1" fill="currentColor"/>
    </svg>`.trim();

  function getMastheadInsertPoint() {
    // Hitta mikrofon-knappen i headern och sätt in vår knapp brevid
    return (
      document.querySelector('#voice-search-button') ||
      document.querySelector('ytd-masthead #end yt-icon-button:first-child') ||
      document.querySelector('#masthead-container #buttons') ||
      document.querySelector('ytd-masthead #buttons')
    );
  }

  function injectMastheadButton() {
    if (document.getElementById(MASTHEAD_BTN_ID)) return;
    const anchor = getMastheadInsertPoint();
    if (!anchor) return;

    const btn       = document.createElement('button');
    btn.id          = MASTHEAD_BTN_ID;
    btn.title       = 'Toggle recommendations';
    btn.innerHTML   = MASTHEAD_ICON;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleThumbs();
    });

    // Sätt in direkt före mikrofon-knappen
    anchor.parentNode?.insertBefore(btn, anchor);
  }

  function removeMastheadButton() {
    document.getElementById(MASTHEAD_BTN_ID)?.remove();
  }

  // ─── Stream mode toggle ───────────────────────────────────────────────────
  function toggleStream() {
    streamActive = !streamActive;
    document.body.classList.toggle(STREAM_CLASS, streamActive);

    const btn = document.getElementById(STREAM_BTN_ID);
    if (btn) btn.classList.toggle('ds-stream-on', streamActive);

    if (streamActive) {
      thumbsVisible = true;                    // återställ synlighet
      document.body.classList.remove(THUMBS_HIDDEN);
      buildThumbs();
      injectMastheadButton();
    } else {
      exitStream();
    }
  }

  function exitStream() {
    streamActive  = false;
    thumbsVisible = true;
    document.body.classList.remove(STREAM_CLASS, THUMBS_HIDDEN);
    removeThumbs();
    removeMastheadButton();

    const btn = document.getElementById(STREAM_BTN_ID);
    if (btn) btn.classList.remove('ds-stream-on');

    // Tvinga YouTube att räkna om spelardimensioner.
    // Ett enda resize-event fångas inte alltid av den debounced listener —
    // skicka flera på staggerade intervall och försök anropa setSize direkt.
    requestAnimationFrame(() => {
      const player = document.getElementById('movie_player');

      // Om spelaren exponerar setSize (YouTubes inbyggda API) — använd det
      if (player && typeof player.setSize === 'function') {
        const par = player.parentElement;
        if (par) {
          const r = par.getBoundingClientRect();
          player.setSize(Math.floor(r.width), Math.floor(r.height));
        }
      }

      // Skicka resize-events — rAF för första (undviker main-thread block), sedan en gång till efter 400ms
      requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
      setTimeout(() => window.dispatchEvent(new Event('resize')), 400);
    });
  }

  // ─── Stream SVG-ikon (i player-kontrollen) ────────────────────────────────
  const ICON_SVG = `
    <svg viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
      <path fill="white" d="
        M30,8 H6 C4.9,8 4,8.9 4,10 V24 C4,25.1 4.9,26 6,26 H15 V27
        H13 V28 H23 V27 H21 V26 H30 C31.1,26 32,25.1 32,24 V10
        C32,8.9 31.1,8 30,8 Z M30,23 H6 V11 H30 V23 Z
        M18,14 L14,17 L18,20 L22,17 Z
      "/>
    </svg>`.trim();

  // ─── Inject stream-knapp i player-kontrollerna ────────────────────────────
  async function injectButton() {
    if (!isWatchPage())                              { removeButton(); return; }
    if (!(await Storage.isEnabled('youtubeStream'))) { removeButton(); return; }
    if (document.getElementById(STREAM_BTN_ID)) return;

    const fsBtn = document.querySelector('.ytp-fullscreen-button');
    if (!fsBtn) return;

    const btn       = document.createElement('button');
    btn.id          = STREAM_BTN_ID;
    btn.className   = 'ytp-button';
    btn.setAttribute('aria-label', 'Stream mode');
    btn.title       = 'Stream mode';
    btn.innerHTML   = ICON_SVG;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleStream();
    });

    fsBtn.parentNode.insertBefore(btn, fsBtn);
  }

  function removeButton() {
    document.getElementById(STREAM_BTN_ID)?.remove();
    exitStream();
  }

  // ─── Escape stänger stream mode ───────────────────────────────────────────
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && streamActive) exitStream();
  });

  // ─── Observer + navigering ────────────────────────────────────────────────
  let retryTimer = null;
  let observer   = null;

  function isContextValid() {
    try { return !!chrome.runtime?.id; } catch (_) { return false; }
  }

  function scheduleInject(delay = 300) {
    if (!isContextValid()) return;
    clearTimeout(retryTimer);
    retryTimer = setTimeout(() => {
      if (!isContextValid()) return;
      injectButton().catch(() => {});
    }, delay);
  }

  function startObserver() {
    if (observer) observer.disconnect();
    observer = new MutationObserver(() => {
      if (!isContextValid()) { teardown(); return; }
      if (!isWatchPage()) { removeButton(); return; }
      if (!document.getElementById(STREAM_BTN_ID)) scheduleInject(200);
      if (streamActive && !document.getElementById(MASTHEAD_BTN_ID)) injectMastheadButton();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // ─── Teardown — kills EVERYTHING ─────────────────────────────────────────
  function teardown() {
    observer?.disconnect();
    observer = null;
    clearTimeout(retryTimer);
    retryTimer = null;
    if (streamActive) exitStream();
    removeButton();
  }

  document.addEventListener('yt-navigate-finish', () => {
    exitStream();
    removeButton();
    scheduleInject(700);
  });

  chrome.storage.onChanged.addListener(async (changes) => {
    if (!isContextValid()) return;

    // Global kill switch
    if ('globalEnabled' in changes) {
      changes.globalEnabled.newValue === false ? teardown() : init();
      return;
    }

    if ('youtubeStreamEnabled' in changes) {
      changes.youtubeStreamEnabled.newValue === true ? scheduleInject(100) : teardown();
    }
  });

  async function init() {
    if (!isContextValid()) return;
    if (!(await Storage.isEnabled('youtubeStream'))) return;
    addStyles();
    scheduleInject(500);
    startObserver();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init().catch(() => {}));
  } else {
    init().catch(() => {});
  }

})();
