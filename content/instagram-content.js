// content/instagram-content.js — Instagram-komponent
// Injicerar Discord-knapp i Instagram-postars vänstra action-grupp (like/comment/share-raden)
// Kräver: storage.js, webhook.js, icons.js (laddas i den ordningen via manifest)

(function () {

  // ─── CSS ──────────────────────────────────────────────────────────────────

  const style = document.createElement('style');
  style.textContent = `
    .ds-discord-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      background: none;
      border: none;
      cursor: pointer;
      padding: 8px;
      margin: 0;
      color: #262626;
      transition: opacity 0.15s;
      /* Matchar Instagrams knappstorlek */
      width: 40px;
      height: 40px;
      box-sizing: border-box;
    }
    .ds-discord-btn:hover {
      opacity: 0.5;
    }
    .ds-discord-btn svg {
      width: 24px;
      height: 24px;
      display: block;
      /* Discord-ikonen är fill-baserad — currentColor ärver från knappens color */
      fill: currentColor;
    }
    .ds-discord-btn.ds-sent {
      color: #5865F2;
    }

    /* Mörkt läge (Instagrams mörka tema) */
    @media (prefers-color-scheme: dark) {
      .ds-discord-btn { color: #f5f5f5; }
    }
  `;
  document.head.appendChild(style);

  // ─── Hämta post-URL ───────────────────────────────────────────────────────

  function getPostUrl(article) {
    // Sök efter permalink-länk inuti artikeln (/p/ = post, /reel/ = reel)
    const link = article.querySelector('a[href*="/p/"], a[href*="/reel/"]');
    if (link) {
      const href = link.getAttribute('href');
      return href.startsWith('http')
        ? href
        : 'https://www.instagram.com' + href;
    }
    // Fallback: aktuell URL om vi är på en enskild post/reel-sida
    const loc = window.location.href;
    if (loc.includes('/p/') || loc.includes('/reel/')) return loc;
    return null;
  }

  // ─── Konvertera till kkinstagram ──────────────────────────────────────────

  function convertUrl(url) {
    return url.replace('https://www.instagram.com', 'https://www.kkinstagram.com');
  }

  // ─── Lägg till knapp i artikel ────────────────────────────────────────────

  function addButton(article) {
    // Hoppa över om knapp redan finns
    if (article.querySelector('.ds-discord-btn')) return;

    const postUrl = getPostUrl(article);
    if (!postUrl) return;

    // Hitta action-sektionen (innehåller like/comment/share/save)
    const section = article.querySelector('section');
    if (!section) return;

    // Vänstra gruppen = section:s första barn-element
    // Struktur: section > div (vänster) + div (höger/save)
    // Vi lägger knappen sist i vänstra gruppen, bredvid share-knappen
    const leftGroup = section.firstElementChild;
    if (!leftGroup) return;

    // Skapa knappen — matchar Instagrams knappstruktur
    const btn = document.createElement('button');
    btn.className = 'ds-discord-btn';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Skicka till Discord');
    btn.title = 'Skicka till Discord';
    btn.innerHTML = Icons.discord; // Riktig Discord-ikon (SVG, fill-baserad)

    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      e.preventDefault();

      const isOn = await Storage.isEnabled('instagram');
      if (!isOn) return;

      const webhook = await Storage.getWebhook();
      if (!webhook) {
        alert('Ingen Discord webhook konfigurerad.\nÖppna tillägget och klistra in din webhook.');
        return;
      }

      const result = await Webhook.send(webhook, convertUrl(postUrl));
      if (result.success) {
        btn.classList.add('ds-sent');
        setTimeout(() => btn.classList.remove('ds-sent'), 2000);
      }
    });

    // Lägg knappen sist i vänstra gruppen (efter share, innan save-gruppen)
    leftGroup.appendChild(btn);
  }

  // ─── Reel-knapp (Reels-fliken, vertikal action-bar) ─────────────────────

  function addReelButton(article) {
    if (article.querySelector('.ds-discord-reel-btn')) return;

    const reelUrl = (function () {
      // Försök hitta reel-länk i artikeln
      const a = article.querySelector('a[href*="/reel/"]');
      if (a) return a.href.startsWith('http') ? a.href : 'https://www.instagram.com' + a.getAttribute('href');
      // Fallback: aktuell URL
      if (window.location.href.includes('/reel/') || window.location.pathname.startsWith('/reels')) {
        return window.location.href;
      }
      return null;
    })();

    if (!reelUrl) return;

    // Hitta den vertikala action-kolumnen (like/comment-knapparna på högersidan)
    const actionGroup =
      article.querySelector('section') ||
      article.querySelector('[role="group"]') ||
      article.querySelector('div[class*="action"]');

    if (!actionGroup) return;

    const btn = document.createElement('button');
    btn.className = 'ds-discord-btn ds-discord-reel-btn';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Skicka Reel till Discord');
    btn.title = 'Skicka Reel till Discord';
    btn.innerHTML = Icons.discord;

    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      e.preventDefault();

      const isOn = await Storage.isEnabled('instagramReels');
      if (!isOn) return;

      const webhook = await Storage.getWebhook();
      if (!webhook) {
        alert('Ingen Discord webhook konfigurerad.\nÖppna tillägget och klistra in din webhook.');
        return;
      }

      const result = await Webhook.send(webhook, convertUrl(reelUrl));
      if (result.success) {
        btn.classList.add('ds-sent');
        setTimeout(() => btn.classList.remove('ds-sent'), 2000);
      }
    });

    // Lägg knappen sist i action-gruppen
    actionGroup.appendChild(btn);
  }

  // ─── Hjälpfunktioner ─────────────────────────────────────────────────────

  function isOnReelsPage() {
    const p = window.location.pathname;
    return p.startsWith('/reels') || p.includes('/reel/');
  }

  function scanPosts() {
    document.querySelectorAll('article').forEach(addButton);
  }

  function scanReels() {
    document.querySelectorAll('article').forEach(addReelButton);
  }

  function removeAllButtons() {
    document.querySelectorAll('.ds-discord-btn').forEach(b => b.remove());
  }

  // ─── Init ─────────────────────────────────────────────────────────────────

  async function init() {
    const feedOn  = await Storage.isEnabled('instagram');
    const reelsOn = await Storage.isEnabled('instagramReels');
    if (feedOn)  scanPosts();
    if (reelsOn) scanReels();
    if (!feedOn && !reelsOn) removeAllButtons();
  }

  init();

  // ─── MutationObserver — hantera Instagrams SPA ───────────────────────────

  let scanTimer = null;
  const observer = new MutationObserver(() => {
    clearTimeout(scanTimer);
    scanTimer = setTimeout(async () => {
      // Disconnect while scanning so our own DOM changes don't re-trigger the observer
      observer.disconnect();
      if (await Storage.isEnabled('instagram'))      scanPosts();
      if (await Storage.isEnabled('instagramReels')) scanReels();
      observer.observe(document.body, { childList: true, subtree: true });
    }, 400);
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // ─── Realtidsuppdatering vid toggle-ändringar från popup ─────────────────

  chrome.storage.onChanged.addListener(async (changes) => {
    if ('instagramEnabled' in changes) {
      changes.instagramEnabled.newValue ? scanPosts() : removeAllButtons();
    }
    if ('instagramReelsEnabled' in changes) {
      if (changes.instagramReelsEnabled.newValue) scanReels();
      else document.querySelectorAll('.ds-discord-reel-btn').forEach(b => b.remove());
    }
  });

})();
