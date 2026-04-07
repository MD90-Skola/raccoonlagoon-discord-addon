// components/lidl/lidl-background.js — Fetches Lidl.se weekly leaflets

const ALARM_NAME = 'LIDL_DAILY_FETCH';
const LIDL_URL   = 'https://www.lidl.se/c/reklamblad/s10018018';

// ─── Message handler ───────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'LIDL_FETCH') {
    chrome.storage.local.get('lidlEnabled', ({ lidlEnabled }) => {
      if (lidlEnabled === false) {
        sendResponse({ success: false, error: 'Lidl Scanner är inaktiverat' });
        return;
      }
      fetchLidlLeaflets()
        .then(leaflets => sendResponse({ success: true, leaflets }))
        .catch(err     => sendResponse({ success: false, error: err.message }));
    });
    return true;
  }
  if (msg.type === 'LIDL_SET_AUTO') {
    setAutoFetch(msg.enabled === true)
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

// ─── Auto-fetch scheduling ─────────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(async () => {
  const { lidlAutoScan } = await chrome.storage.local.get('lidlAutoScan');
  if (lidlAutoScan === true) chrome.alarms.create(ALARM_NAME, { periodInMinutes: 1440 });
});

chrome.runtime.onStartup.addListener(async () => {
  const { lidlAutoScan } = await chrome.storage.local.get('lidlAutoScan');
  if (lidlAutoScan !== true) return;
  const existing = await chrome.alarms.get(ALARM_NAME);
  if (!existing) chrome.alarms.create(ALARM_NAME, { periodInMinutes: 1440 });
});

chrome.alarms.onAlarm.addListener(async alarm => {
  if (alarm.name !== ALARM_NAME) return;
  const { lidlEnabled } = await chrome.storage.local.get('lidlEnabled');
  if (lidlEnabled === false) return;

  try {
    const leaflets = await fetchLidlLeaflets();
    await chrome.storage.local.set({ lidlLeaflets: leaflets, lidlLastFetch: Date.now() });
  } catch (err) {
    console.error('[Lidl] Auto-fetch failed:', err);
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if ('lidlEnabled' in changes && changes.lidlEnabled.newValue === false) {
    chrome.alarms.clear(ALARM_NAME);
  }
});

// ─── Fetch: opens a real tab, injects scraper, closes tab ─────────────────────
async function fetchLidlLeaflets() {
  const tab = await chrome.tabs.create({ url: LIDL_URL, active: false });

  try {
    await waitForTab(tab.id);
    await sleep(1800); // let React/Next.js finish rendering

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: scrapeLidlPage
    });

    const raw = Array.isArray(results?.[0]?.result) ? results[0].result : [];
    console.log('[Lidl] scraped (raw):', raw.length);

    const today        = Date.now();
    const thirtyDaysAgo = today - 30 * 86400000;
    const sevenDaysAgo  = today - 7  * 86400000;

    // Filter: keep active, upcoming, and recently expired (≤7 days ago).
    // Drop entries with no real title or with "Gäller..." subtitle labels.
    // Drop entries whose startDate is far in the past (DOM scraper noise).
    const filtered = raw.filter(l =>
      l.endDate   >= sevenDaysAgo  &&
      l.startDate >= thirtyDaysAgo &&
      l.title.length > 2 &&
      !/^gäller\b/i.test(l.title)
    );

    // Deduplicate by (normalised title + endDate day).
    // Same leaflet appears multiple times in the DOM — keep first occurrence.
    const seen   = new Set();
    const deduped = filtered.filter(l => {
      const key = l.title.trim().toLowerCase() + '|' + Math.floor(l.endDate / 86400000);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    console.log('[Lidl] after dedup:', deduped.length);
    return deduped.sort((a, b) => a.startDate - b.startDate);
  } finally {
    if (tab?.id) {
      try { await chrome.tabs.remove(tab.id); } catch (_) {}
    }
  }
}

// ─── Scraper — runs inside the Lidl tab ───────────────────────────────────────
// Must be self-contained (no closures over service worker scope).
function scrapeLidlPage() {
  // ── Helpers ────────────────────────────────────────────────────────────────
  function parseDate(val) {
    if (!val) return null;
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      // ISO: "2024-04-15" or "2024-04-15T..."
      if (/^\d{4}-\d{2}-\d{2}/.test(val)) {
        const d = new Date(val.slice(0, 10));
        return isNaN(d.getTime()) ? null : d.getTime();
      }
      // Swedish: "15/4" or "15/4-2024" or "15.4.2024"
      const sw = val.match(/^(\d{1,2})[./](\d{1,2})(?:[./-](\d{4}))?/);
      if (sw) {
        const year = sw[3] ? parseInt(sw[3], 10) : new Date().getFullYear();
        const d = new Date(year, parseInt(sw[2], 10) - 1, parseInt(sw[1], 10));
        return isNaN(d.getTime()) ? null : d.getTime();
      }
    }
    return null;
  }

  function hasDateFields(obj) {
    return (
      ('validFrom' in obj && 'validTo' in obj) ||
      ('startDate' in obj && 'endDate' in obj) ||
      ('fromDate'  in obj && 'toDate'  in obj) ||
      ('start'     in obj && 'end'     in obj)
    );
  }

  function normalizeLeaflet(raw) {
    const startDate = parseDate(raw.validFrom || raw.startDate || raw.fromDate || raw.start);
    const endDate   = parseDate(raw.validTo   || raw.endDate   || raw.toDate   || raw.end);
    if (!endDate) return null;
    return {
      id:        String(raw.id || raw.publicationId || raw.uid || Math.random()),
      title:     String(raw.name || raw.title || raw.headline || raw.label || ''),
      startDate: startDate ?? endDate,
      endDate,
      url:       raw.url   || raw.link  || raw.href       || null,
      image:     raw.thumbnail || raw.cover || raw.imageUrl || raw.coverImage || null,
    };
  }

  function searchJson(data, depth) {
    if (depth > 12 || !data || typeof data !== 'object') return [];

    if (Array.isArray(data)) {
      if (data.length > 0 && data[0] && typeof data[0] === 'object' && hasDateFields(data[0])) {
        const mapped = data.map(normalizeLeaflet).filter(Boolean);
        if (mapped.length > 0) return mapped;
      }
      for (const item of data) {
        const found = searchJson(item, depth + 1);
        if (found.length > 0) return found;
      }
      return [];
    }

    const priority = ['leaflets', 'flyers', 'publications', 'pageProps', 'props', 'data', 'items'];
    for (const key of priority) {
      if (key in data) {
        const found = searchJson(data[key], depth + 1);
        if (found.length > 0) return found;
      }
    }
    for (const key of Object.keys(data)) {
      if (priority.includes(key)) continue;
      const val = data[key];
      if (!val || typeof val !== 'object') continue;
      const found = searchJson(val, depth + 1);
      if (found.length > 0) return found;
    }
    return [];
  }

  // ── Try __NEXT_DATA__ ──────────────────────────────────────────────────────
  const nextEl = document.getElementById('__NEXT_DATA__');
  if (nextEl) {
    try {
      const nd = JSON.parse(nextEl.textContent);
      const found = searchJson(nd, 0);
      if (found.length > 0) return found;
    } catch (_) {}
  }

  // ── Try window.__NEXT_DATA__ ───────────────────────────────────────────────
  if (typeof window.__NEXT_DATA__ !== 'undefined') {
    try {
      const found = searchJson(window.__NEXT_DATA__, 0);
      if (found.length > 0) return found;
    } catch (_) {}
  }

  // ── DOM fallback: look for leaflet card links ──────────────────────────────
  const results = [];
  const dateRx  = /(\d{1,2})[./](\d{1,2})(?:[./-](\d{4}))?/g;

  const candidates = document.querySelectorAll(
    'a[href*="reklamblad"], a[href*="flyer"], a[href*="leaflet"], ' +
    '[class*="leaflet"], [class*="flyer"], [class*="Leaflet"], [class*="Flyer"]'
  );

  for (const el of candidates) {
    const title = (el.querySelector('h2,h3,h4,[class*="title"],[class*="Title"]')?.textContent ||
                   el.getAttribute('title') || el.textContent || '').trim();
    const img   = el.querySelector('img')?.src || null;
    const href  = el.href || null;

    // Try to find date text anywhere in the element
    const text  = el.textContent || '';
    const dates = [];
    let m;
    while ((m = dateRx.exec(text)) !== null) {
      const year = m[3] ? parseInt(m[3], 10) : new Date().getFullYear();
      const d = new Date(year, parseInt(m[2], 10) - 1, parseInt(m[1], 10));
      if (!isNaN(d.getTime())) dates.push(d.getTime());
    }
    dateRx.lastIndex = 0;

    if (dates.length >= 2) {
      results.push({
        id:        href || String(Math.random()),
        title:     title || 'Reklamblad',
        startDate: Math.min(...dates),
        endDate:   Math.max(...dates),
        url:       href,
        image:     img,
      });
    }
  }

  return results;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function waitForTab(tabId) {
  return new Promise((resolve, reject) => {
    const listener = (id, info) => {
      if (id !== tabId) return;
      if (info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
    // Safety timeout
    setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new Error('Tab load timeout'));
    }, 30000);
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ─── Auto-fetch toggle ─────────────────────────────────────────────────────────
async function setAutoFetch(enabled) {
  await chrome.storage.local.set({ lidlAutoScan: enabled });
  if (enabled) {
    chrome.alarms.create(ALARM_NAME, { periodInMinutes: 1440 });
  } else {
    await chrome.alarms.clear(ALARM_NAME);
  }
}
