// content/youtube-zoom.js — YouTube Zoom & Pan
window.addEventListener('unhandledrejection', (e) => {
  if (e.reason?.message?.includes('Extension context invalidated')) e.preventDefault();
});
//
// Alt + scroll        → zooma in/ut
// Alt + håll LMB      → panorera videon
// Alt + dubbelklick   → återställ zoom och pan
//
// Kräver: Storage

(function () {
  const STYLE_ID     = 'ds-yt-zoom-style';
  const INDICATOR_ID = 'ds-zoom-hud';

  const MIN_ZOOM  = 0.3;
  const MAX_ZOOM  = 8;
  const ZOOM_STEP = 0.12; // per scroll-tick

  let zoom      = 1;
  let panX      = 0;
  let panY      = 0;
  let dragging  = false;
  let lastX     = 0;
  let lastY     = 0;
  let attached  = false;
  let hudTimer  = null;

  function isVideoPage() {
    const p = window.location.pathname;
    return p === '/watch' || p.startsWith('/shorts/');
  }

  function getVideo()  { return document.querySelector('video.html5-main-video, video.video-stream'); }
  function getPlayer() { return document.getElementById('movie_player'); }

  // ─── Transform ─────────────────────────────────────────────────────────
  // transform-origin: center → skala sker från mitten.
  // translate() efter scale() → panorering sker i ursprunglig pixelrymd,
  // dvs. 1px musrörelse = 1px panorering oavsett zoom-nivå.
  function applyTransform() {
    const v = getVideo();
    if (!v) return;
    v.style.transformOrigin = 'center center';
    v.style.transform       = `translate(${panX}px, ${panY}px) scale(${zoom})`;
    v.style.willChange      = 'transform';
  }

  function resetTransform() {
    zoom = 1; panX = 0; panY = 0; dragging = false;
    const v = getVideo();
    if (v) {
      v.style.transform       = '';
      v.style.transformOrigin = '';
      v.style.willChange      = '';
    }
    const p = getPlayer();
    if (p) p.className = p.className
      .replace(/\s*ds-zoom-\S+/g, '');
    hideHUD();
  }

  // ─── HUD (zoom-nivå-indikator) ─────────────────────────────────────────
  function showHUD() {
    let el = document.getElementById(INDICATOR_ID);
    if (!el) {
      el    = document.createElement('div');
      el.id = INDICATOR_ID;
      getPlayer()?.appendChild(el);
    }
    el.textContent   = `${Math.round(zoom * 100)} %`;
    el.style.opacity = '1';
    clearTimeout(hudTimer);
    hudTimer = setTimeout(hideHUD, 1400);
  }

  function hideHUD() {
    const el = document.getElementById(INDICATOR_ID);
    if (el) el.style.opacity = '0';
  }

  // ─── Event handlers ────────────────────────────────────────────────────

  // Alt + scroll → zoom
  function onWheel(e) {
    if (!e.altKey) return;
    e.preventDefault();
    e.stopPropagation();
    const dir = e.deltaY < 0 ? 1 : -1;
    zoom      = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom + dir * ZOOM_STEP));
    applyTransform();
    getPlayer()?.classList.add('ds-zoom-active');
    showHUD();
  }

  // Alt + LMB-tryck → börja panorera
  function onMouseDown(e) {
    if (!e.altKey || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    dragging = true;
    lastX    = e.clientX;
    lastY    = e.clientY;
    getPlayer()?.classList.add('ds-zoom-active', 'ds-zoom-dragging');
  }

  // Panorera
  function onMouseMove(e) {
    if (!dragging) return;
    panX  += e.clientX - lastX;
    panY  += e.clientY - lastY;
    lastX  = e.clientX;
    lastY  = e.clientY;
    applyTransform();
  }

  // Släpp musen → sluta panorera
  function onMouseUp() {
    if (!dragging) return;
    dragging = false;
    getPlayer()?.classList.remove('ds-zoom-dragging');
  }

  // Alt + dubbelklick → återställ
  function onDblClick(e) {
    if (!e.altKey) return;
    e.preventDefault();
    resetTransform();
  }

  // Alt nedtryckt → grab-cursor
  function onKeyDown(e) {
    if (e.key !== 'Alt') return;
    getPlayer()?.classList.add('ds-zoom-grab');
  }

  // Alt släppt → normal cursor, avsluta drag om det pågick
  function onKeyUp(e) {
    if (e.key !== 'Alt') return;
    dragging = false;
    const p  = getPlayer();
    if (p) {
      p.classList.remove('ds-zoom-grab', 'ds-zoom-dragging');
    }
  }

  // ─── CSS ────────────────────────────────────────────────────────────────
  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const s    = document.createElement('style');
    s.id       = STYLE_ID;
    s.textContent = `
      /* Klipp bort video som sticker utanför spelaren */
      #movie_player.ds-zoom-active {
        overflow: hidden !important;
      }

      /* Cursor-tillstånd */
      #movie_player.ds-zoom-grab,
      #movie_player.ds-zoom-grab * {
        cursor: grab !important;
      }
      #movie_player.ds-zoom-dragging,
      #movie_player.ds-zoom-dragging * {
        cursor: grabbing !important;
        user-select: none !important;
      }

      /* Zoom-HUD */
      #${INDICATOR_ID} {
        position: absolute;
        top: 14px;
        left: 14px;
        background: rgba(0, 0, 0, 0.70);
        color: #fff;
        font-size: 13px;
        font-family: 'Roboto', sans-serif;
        font-weight: 600;
        padding: 4px 10px;
        border-radius: 6px;
        z-index: 9999;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.2s ease;
        letter-spacing: 0.3px;
        user-select: none;
      }
    `;
    document.head.appendChild(s);
  }

  // ─── Koppla / koppla bort lyssnare ────────────────────────────────────
  function attach() {
    if (attached) return;
    const player = getPlayer();
    if (!player) return;

    player.addEventListener('wheel',    onWheel,    { passive: false });
    player.addEventListener('mousedown', onMouseDown);
    player.addEventListener('dblclick',  onDblClick);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup',   onMouseUp);
    document.addEventListener('keydown',   onKeyDown);
    document.addEventListener('keyup',     onKeyUp);

    attached = true;
  }

  function detach() {
    const player = getPlayer();
    if (player) {
      player.removeEventListener('wheel',    onWheel);
      player.removeEventListener('mousedown', onMouseDown);
      player.removeEventListener('dblclick',  onDblClick);
    }
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup',   onMouseUp);
    document.removeEventListener('keydown',   onKeyDown);
    document.removeEventListener('keyup',     onKeyUp);

    attached = false;
    resetTransform();
  }

  function isContextValid() {
    try { return !!chrome.runtime?.id; } catch (_) { return false; }
  }

  // ─── Setup ────────────────────────────────────────────────────────────
  async function setup() {
    if (!isContextValid()) { detach(); return; }
    if (!isVideoPage()) { detach(); return; }
    const ok = await Storage.isEnabled('youtubeZoom');
    if (!ok) { detach(); return; }
    addStyles();
    attach();
  }

  // ─── YouTube SPA-navigering ──────────────────────────────────────────
  document.addEventListener('yt-navigate-finish', () => {
    detach();
    if (isContextValid()) setTimeout(() => setup().catch(() => {}), 600);
  });

  // ─── Reagera på toggle i settings ────────────────────────────────────
  chrome.storage.onChanged.addListener(async (changes) => {
    if (!isContextValid()) return;

    // Global kill switch
    if ('globalEnabled' in changes) {
      changes.globalEnabled.newValue === false ? detach() : setup().catch(() => {});
      return;
    }

    if ('youtubeZoomEnabled' in changes) {
      if (changes.youtubeZoomEnabled.newValue === true) {
        addStyles();
        if (isVideoPage()) attach();
      } else {
        detach();
      }
    }
  });

  // ─── Init ─────────────────────────────────────────────────────────────
  setTimeout(() => setup().catch(() => {}), 700);

})();
