// content/youtube-content.js
// Lägger Discord-knappen i YouTubes vanliga knapp-rad på watch-sidan
// Inte i video-spelaren
// Kräver: Storage, Webhook, Icons

(function () {
  const BUTTON_ID = 'ds-youtube-page-btn';
  const STYLE_ID = 'ds-youtube-page-style';

  function isWatchPage() {
    return window.location.pathname === '/watch';
  }

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${BUTTON_ID} {
        margin-left: 8px;
      }

      #${BUTTON_ID} button {
        border: 0;
        background: transparent;
        cursor: pointer;
      }

      #${BUTTON_ID} .ds-btn-core {
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

      #${BUTTON_ID} .ds-btn-core:hover {
        opacity: 0.85;
      }

      #${BUTTON_ID} .ds-btn-core:active {
        transform: scale(0.98);
      }

      #${BUTTON_ID} .ds-btn-icon {
        width: 20px;
        height: 20px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: currentColor;
      }

      #${BUTTON_ID} .ds-btn-icon svg {
        width: 20px;
        height: 20px;
        display: block;
        fill: currentColor;
      }

      #${BUTTON_ID}.ds-sent .ds-btn-core {
        color: #5865F2;
      }
    `;
    document.head.appendChild(style);
  }

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

    const keywords = [
      'watch later',
      'later',
      'kolla senare',
      'se senare',
      'senare',
      'save',
      'spara',
      'playlist'
    ];

    for (const el of candidates) {
      const text = (
        el.getAttribute('aria-label') ||
        el.getAttribute('title') ||
        el.textContent ||
        ''
      ).toLowerCase();

      if (keywords.some(word => text.includes(word))) {
        return el.closest('ytd-button-renderer, yt-button-shape, button, div') || el;
      }
    }

    return null;
  }

  function createButton() {
    const wrapper = document.createElement('div');
    wrapper.id = BUTTON_ID;

    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', 'Skicka till Discord');
    button.title = 'Skicka till Discord';

    button.innerHTML = `
      <span class="ds-btn-core">
        <span class="ds-btn-icon">${Icons.discord}</span>
      </span>
    `;

    button.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();

      const enabled = await Storage.isEnabled('youtube');
      if (!enabled) return;

      const webhook = await Storage.getWebhook();
      if (!webhook) {
        alert('Ingen Discord webhook konfigurerad.');
        return;
      }

      const result = await Webhook.send(webhook, window.location.href);

      if (result && result.success) {
        wrapper.classList.add('ds-sent');
        setTimeout(() => wrapper.classList.remove('ds-sent'), 1500);
      }
    });

    wrapper.appendChild(button);
    return wrapper;
  }

  function removeButton() {
    const existing = document.getElementById(BUTTON_ID);
    if (existing) existing.remove();
  }

  async function injectButton() {
    if (!isWatchPage()) {
      removeButton();
      return;
    }

    const enabled = await Storage.isEnabled('youtube');
    if (!enabled) {
      removeButton();
      return;
    }

    if (document.getElementById(BUTTON_ID)) return;

    const row = getButtonRow();
    if (!row) return;

    const button = createButton();
    const anchor = getClockAnchor(row);

    if (anchor && anchor.parentNode) {
      anchor.insertAdjacentElement('afterend', button);
    } else {
      row.appendChild(button);
    }
  }

  let retryTimer = null;
  let observer = null;

  function scheduleInject(delay = 250) {
    clearTimeout(retryTimer);
    retryTimer = setTimeout(() => {
      injectButton();
    }, delay);
  }

  function startObserver() {
    if (observer) observer.disconnect();

    observer = new MutationObserver(() => {
      if (!isWatchPage()) {
        removeButton();
        return;
      }

      if (!document.getElementById(BUTTON_ID)) {
        scheduleInject(200);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  function init() {
    addStyles();
    scheduleInject(300);
    startObserver();
  }

  document.addEventListener('yt-navigate-finish', () => {
    removeButton();
    scheduleInject(500);
  });

  chrome.storage.onChanged.addListener((changes) => {
    if ('youtubeEnabled' in changes) {
      if (changes.youtubeEnabled.newValue === true) {
        scheduleInject(100);
      } else {
        removeButton();
      }
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();