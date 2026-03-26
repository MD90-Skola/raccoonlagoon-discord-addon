// content/youtube-content.js — YouTube-komponent
// Injicerar Discord-knapp i YouTube-spelaren, direkt till höger om klockan
// Kräver: storage.js, webhook.js, icons.js (laddas i den ordningen via manifest)

(function () {

  const BUTTON_ID = 'ds-youtube-btn';

  // ─── CSS ──────────────────────────────────────────────────────────────────
  // Använder ID-selektor (hög specificitet) för att inte krocka med YouTubes egna stilar
  // Discord-ikonen är fill-baserad → fill: white, INTE stroke

  const style = document.createElement('style');
  style.textContent = `
    #${BUTTON_ID} {
      background: none !important;
      border: none !important;
      cursor: pointer;
      width: 36px;
      height: 36px;
      padding: 0;
      display: inline-flex !important;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      opacity: 0.9;
      transition: opacity 0.1s;
      vertical-align: middle;
    }
    #${BUTTON_ID}:hover {
      opacity: 1;
    }
    #${BUTTON_ID} svg {
      width: 20px;
      height: 20px;
      display: block;
      /* Discord-ikonen är fill-baserad — fill: white för spelarens mörka bakgrund */
      fill: white;
      stroke: none;
    }
    #${BUTTON_ID}.ds-sent svg {
      fill: #5865F2;
    }
  `;
  document.head.appendChild(style);

  // ─── Skapa knapp ──────────────────────────────────────────────────────────

  function createButton() {
    const btn = document.createElement('button');
    btn.id = BUTTON_ID;
    btn.className = 'ytp-button'; // YouTubes egna knappklass för grundstil
    btn.setAttribute('aria-label', 'Skicka till Discord');
    btn.title = 'Skicka till Discord';
    btn.innerHTML = Icons.discord; // Riktig Discord-ikon (SVG, fill-baserad)

    btn.addEventListener('click', async () => {
      const isOn = await Storage.isEnabled('youtube');
      if (!isOn) return;

      const webhook = await Storage.getWebhook();
      if (!webhook) {
        alert('Ingen Discord webhook konfigurerad.\nÖppna tillägget och klistra in din webhook.');
        return;
      }

      const result = await Webhook.send(webhook, window.location.href);
      if (result.success) {
        btn.classList.add('ds-sent');
        setTimeout(() => btn.classList.remove('ds-sent'), 2000);
      }
    });

    return btn;
  }

  // ─── Injicera knapp ───────────────────────────────────────────────────────

  function injectButton() {
    // Undvik dubbletter
    if (document.getElementById(BUTTON_ID)) return;

    // Hitta tidsdisplayen (klockan) i spelaren
    const timeDisplay = document.querySelector('.ytp-time-display');
    if (!timeDisplay) return;

    // Placera knappen direkt till höger om klockan
    timeDisplay.insertAdjacentElement('afterend', createButton());
  }

  function removeButton() {
    const existing = document.getElementById(BUTTON_ID);
    if (existing) existing.remove();
  }

  // ─── Polling — väntar tills spelaren finns i DOM ──────────────────────────
  // YouTube renderar spelaren asynkront (kan ta 1–5 sekunder).
  // Intervall-polling är mer tillförlitlig än rekursiv setTimeout.

  let pollInterval = null;

  function startPolling() {
    stopPolling();

    // Bara relevant på videosidor
    if (!window.location.pathname.startsWith('/watch')) return;

    let attempts = 0;

    pollInterval = setInterval(async () => {
      attempts++;

      // Klart — knapp finns redan
      if (document.getElementById(BUTTON_ID)) {
        stopPolling();
        return;
      }

      const enabled = await Storage.isEnabled('youtube');

      // Toggle är av — avsluta polling
      if (!enabled) {
        stopPolling();
        return;
      }

      // Spelaren finns — injicera knapp
      if (document.querySelector('.ytp-time-display')) {
        injectButton();
        stopPolling();
        return;
      }

      // Ge upp efter 20 försök (10 sekunder)
      if (attempts >= 20) {
        stopPolling();
      }
    }, 500);
  }

  function stopPolling() {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  }

  // ─── YouTube SPA-navigering ───────────────────────────────────────────────
  // yt-navigate-finish fyrar vid varje sidnavigering (inkl. initial sidladdning)

  document.addEventListener('yt-navigate-finish', () => {
    removeButton();  // Rensa knapp från föregående sida
    startPolling();  // Starta ny polling för nya sidan
  });

  // Fallback för initial laddning om yt-navigate-finish inte hinner
  startPolling();

  // ─── Realtidsuppdatering vid toggle-ändringar från popup ─────────────────

  chrome.storage.onChanged.addListener((changes) => {
    if ('youtubeEnabled' in changes) {
      if (changes.youtubeEnabled.newValue === true) {
        startPolling();
      } else {
        stopPolling();
        removeButton();
      }
    }
  });

})();
