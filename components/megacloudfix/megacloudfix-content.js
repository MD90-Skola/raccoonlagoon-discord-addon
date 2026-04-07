// megacloudfix-content.js — Patches fetch, XHR and iframes: megacloud.blog → megacloud.tv
// Injected at document_start on all pages.

(function () {
  const TARGET  = 'megacloud.blog';
  const REPLACE = 'megacloud.tv';

  // Default ON — updated from storage async. Tiny race window is acceptable
  // since the declarativeNetRequest layer handles network-level redirects.
  let enabled = true;

  chrome.storage.local.get('megaCloudFixEnabled', ({ megaCloudFixEnabled }) => {
    enabled = megaCloudFixEnabled !== false;
  });

  function fixUrl(url) {
    if (!enabled || typeof url !== 'string' || !url.includes(TARGET)) return url;
    return url.split(TARGET).join(REPLACE);
  }

  // ── Patch fetch ─────────────────────────────────────────────────────────────
  const originalFetch = window.fetch;
  window.fetch = function (input, init) {
    if (typeof input === 'string') {
      input = fixUrl(input);
    } else if (input instanceof Request && input.url.includes(TARGET)) {
      input = new Request(fixUrl(input.url), input);
    }
    return originalFetch.call(this, input, init);
  };

  // ── Patch XHR ───────────────────────────────────────────────────────────────
  const originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    return originalOpen.call(this, method, fixUrl(url), ...rest);
  };

  // ── Fix iframes ─────────────────────────────────────────────────────────────
  function fixIframe(el) {
    if (el.tagName !== 'IFRAME') return;
    const src = el.getAttribute('src');
    if (src && src.includes(TARGET)) {
      el.setAttribute('src', src.split(TARGET).join(REPLACE));
    }
  }

  document.querySelectorAll('iframe').forEach(fixIframe);

  new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType !== 1) continue;
        fixIframe(node);
        node.querySelectorAll && node.querySelectorAll('iframe').forEach(fixIframe);
      }
      if (m.type === 'attributes' && m.target.tagName === 'IFRAME') {
        fixIframe(m.target);
      }
    }
  }).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['src']
  });
})();
