// content/instagram-content.js — Instagram-komponent
(function () {

  // ─── CSS ──────────────────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    .ds-discord-btn {
      display: flex; align-items: center; justify-content: center;
      background: none; border: none; cursor: pointer;
      padding: 8px; margin: 0; color: #262626;
      transition: opacity 0.15s; width: 40px; height: 40px; box-sizing: border-box;
    }
    .ds-discord-btn:hover { opacity: 0.5; }
    .ds-discord-btn svg   { width: 24px; height: 24px; display: block; fill: currentColor; }
    .ds-discord-btn.ds-sent { color: #5865F2; }
    @media (prefers-color-scheme: dark) { .ds-discord-btn { color: #f5f5f5; } }
  `;
  document.head.appendChild(style);

  // ─── Helpers ──────────────────────────────────────────────────────────────
  function isContextValid() {
    try { return !!chrome.runtime?.id; } catch (_) { return false; }
  }

  function getPostUrl(article) {
    const link = article.querySelector('a[href*="/p/"], a[href*="/reel/"]');
    if (link) {
      const href = link.getAttribute('href');
      return href.startsWith('http') ? href : 'https://www.instagram.com' + href;
    }
    const loc = window.location.href;
    if (loc.includes('/p/') || loc.includes('/reel/')) return loc;
    return null;
  }

  function convertUrl(url) {
    return url.replace('https://www.instagram.com', 'https://www.kkinstagram.com');
  }

  function removeAllButtons() {
    document.querySelectorAll('.ds-discord-btn').forEach(b => b.remove());
  }

  // ─── Button injection ─────────────────────────────────────────────────────
  function addButton(article) {
    if (article.querySelector('.ds-discord-btn')) return;
    const postUrl = getPostUrl(article);
    if (!postUrl) return;
    const section = article.querySelector('section');
    if (!section) return;
    const leftGroup = section.firstElementChild;
    if (!leftGroup) return;

    const btn = document.createElement('button');
    btn.className = 'ds-discord-btn';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Skicka till Discord');
    btn.innerHTML = Icons.discord;
    btn.addEventListener('click', async (e) => {
      e.stopPropagation(); e.preventDefault();
      if (!await Storage.isEnabled('instagram')) return;
      const webhook = await Storage.getWebhook();
      if (!webhook) { alert('Ingen Discord webhook konfigurerad.'); return; }
      const result = await Webhook.send(webhook, convertUrl(postUrl));
      if (result.success) {
        btn.classList.add('ds-sent');
        setTimeout(() => btn.classList.remove('ds-sent'), 2000);
      }
    });
    leftGroup.appendChild(btn);
  }

  function addReelButton(article) {
    if (article.querySelector('.ds-discord-reel-btn')) return;
    const reelUrl = (() => {
      const a = article.querySelector('a[href*="/reel/"]');
      if (a) return a.href.startsWith('http') ? a.href : 'https://www.instagram.com' + a.getAttribute('href');
      if (window.location.href.includes('/reel/') || window.location.pathname.startsWith('/reels')) return window.location.href;
      return null;
    })();
    if (!reelUrl) return;
    const actionGroup = article.querySelector('section') || article.querySelector('[role="group"]') || article.querySelector('div[class*="action"]');
    if (!actionGroup) return;

    const btn = document.createElement('button');
    btn.className = 'ds-discord-btn ds-discord-reel-btn';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Skicka Reel till Discord');
    btn.innerHTML = Icons.discord;
    btn.addEventListener('click', async (e) => {
      e.stopPropagation(); e.preventDefault();
      if (!await Storage.isEnabled('instagramReels')) return;
      const webhook = await Storage.getWebhook();
      if (!webhook) { alert('Ingen Discord webhook konfigurerad.'); return; }
      const result = await Webhook.send(webhook, convertUrl(reelUrl));
      if (result.success) {
        btn.classList.add('ds-sent');
        setTimeout(() => btn.classList.remove('ds-sent'), 2000);
      }
    });
    actionGroup.appendChild(btn);
  }

  function scanPosts() { document.querySelectorAll('article').forEach(addButton); }
  function scanReels() { document.querySelectorAll('article').forEach(addReelButton); }

  // ─── Observer ─────────────────────────────────────────────────────────────
  let observer  = null;
  let scanTimer = null;

  function startObserver() {
    if (observer) return; // already running
    observer = new MutationObserver(() => {
      if (!isContextValid()) { teardown(); return; }
      clearTimeout(scanTimer);
      scanTimer = setTimeout(async () => {
        const feedOn  = await Storage.isEnabled('instagram');
        const reelsOn = await Storage.isEnabled('instagramReels');
        if (!feedOn && !reelsOn) { teardown(); return; }
        observer?.disconnect();
        if (feedOn)  scanPosts();
        if (reelsOn) scanReels();
        observer?.observe(document.body, { childList: true, subtree: true });
      }, 400);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // ─── Teardown — kills EVERYTHING ─────────────────────────────────────────
  function teardown() {
    observer?.disconnect();
    observer = null;
    clearTimeout(scanTimer);
    scanTimer = null;
    removeAllButtons();
  }

  // ─── Init ─────────────────────────────────────────────────────────────────
  async function init() {
    if (!isContextValid()) return;
    const feedOn  = await Storage.isEnabled('instagram');
    const reelsOn = await Storage.isEnabled('instagramReels');
    if (!feedOn && !reelsOn) { teardown(); return; }
    if (feedOn)  scanPosts();
    if (reelsOn) scanReels();
    startObserver();
  }

  init();

  // ─── React to settings changes ────────────────────────────────────────────
  chrome.storage.onChanged.addListener(async (changes) => {
    if (!isContextValid()) return;

    // Global kill switch
    if ('globalEnabled' in changes) {
      changes.globalEnabled.newValue === false ? teardown() : init();
      return;
    }

    const feedOn  = await Storage.isEnabled('instagram');
    const reelsOn = await Storage.isEnabled('instagramReels');

    if ('instagramEnabled' in changes || 'instagramReelsEnabled' in changes) {
      if (!feedOn && !reelsOn) {
        teardown();
      } else {
        removeAllButtons(); // clean slate, re-inject only what's enabled
        if (feedOn)  scanPosts();
        if (reelsOn) scanReels();
        startObserver();
      }
    }
  });

})();
