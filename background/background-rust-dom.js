// background-rust-dom.js — Injicerat sidskript för Rust Item Store
// Körs i item store-flikens kontext via chrome.scripting.executeScript.
// Måste vara self-contained — ingen tillgång till extension-scope.
//
// DOM-struktur (bekräftad):
//   Varje item har två <a href="/itemstore/252490/detail/ID/">:
//     1. Bildlänk  — innehåller <img>, tom text
//     2. Textlänk  — style="color:...", innerText = namn ("Abyss Pack")
//   Pris och bild hittas i föräldraelementet till textlänken.

export async function scrapeItemStoreDom() {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const products = {};

  function clean(v) {
    return String(v || '').replace(/\s+/g, ' ').trim();
  }

  function looksLikePrice(v) {
    return /[€$£]\s*[\d.,]+|[\d.,]+\s*[€$£]/.test(v || '');
  }

  function looksLikeName(v) {
    if (!v || v.length < 2 || v.length > 100) return false;
    if (/^\d+$/.test(v)) return false;
    if (/^item\s*#?\d+$/i.test(v)) return false;
    if (looksLikePrice(v)) return false;
    if (/^-?\d+%$/.test(v)) return false;
    if (/^(view|details|buy|add to cart|free|gratis|owned|in cart)$/i.test(v)) return false;
    if (!/[a-zA-ZÀ-ÖØ-öø-ÿ]/.test(v)) return false;
    return true;
  }

  function collectVisible() {
    const links = document.querySelectorAll('a[href*="/itemstore/252490/detail/"]');

    for (const link of links) {
      const href  = link.href || '';
      const match = href.match(/\/detail\/(\d+)/);
      if (!match) continue;

      const id = match[1];
      if (products[id]) continue;

      // Hoppa över bildlänkar (tom text) — ta bara textlänkarna
      const name = clean(link.innerText || link.textContent || '');
      if (!looksLikeName(name)) continue;

      // Klättra upp från textlänken och sök pris + bild i föräldrar
      let price = '?';
      let image = '';
      let el    = link.parentElement;
      while (el && el !== document.body) {
        if (price === '?') {
          const text       = el.innerText || el.textContent || '';
          const priceMatch = text.match(/[\d.,]+\s*[€$£]|[€$£]\s*[\d.,]+/);
          if (priceMatch) price = priceMatch[0].trim();
        }
        if (!image) {
          const img = el.querySelector('img[src*="steamstatic"], img[src*="steam"], img.item_def_icon');
          if (img) image = img.src || '';
        }
        if (price !== '?' && image) break;
        el = el.parentElement;
      }

      products[id] = {
        id:              Number(id),
        name,
        url:             `https://store.steampowered.com/itemstore/252490/detail/${id}/`,
        price,
        originalPrice:   price,
        discountPercent: 0,
        isOnSale:        false,
        image,
        lastSeen:        Date.now()
      };
    }
  }

  // Vänta på textlänkarna (style="color:...") — de laddas efter bildlänkarna
  for (let i = 0; i < 40; i++) {
    await sleep(400);
    if (document.querySelector('a[href*="/itemstore/252490/detail/"][style]')) break;
  }

  collectVisible();

  // Paginera (max 20 sidor)
  for (let p = 2; p <= 20; p++) {
    const before = Object.keys(products).length;

    const pageBtn = document.querySelector(
      `[data-page="${p}"], a[href="#p${p}"], a[href*="p${p}"]`
    );
    if (pageBtn) {
      pageBtn.click();
      await sleep(1000);
    }

    window.location.hash = 'p' + p;
    await sleep(1200);
    collectVisible();

    if (Object.keys(products).length <= before) break;
  }

  return products;
}
