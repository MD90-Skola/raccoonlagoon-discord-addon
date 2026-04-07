
// background-rust-dom.js — Injicerat sidskript för Rust Item Store
// Körs i item store-flikens kontext via chrome.scripting.executeScript.
// Måste vara self-contained — ingen tillgång till extension-scope.

export async function scrapeItemStoreDom() {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const products = {};

  function clean(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function looksLikePrice(value) {
    return /[€$£]\s*\d|\d[\d.,]*\s*[€$£]/.test(value || '');
  }

  function looksLikeName(value) {
    if (!value) return false;
    if (value.length < 2) return false;
    if (/^item\s*#?\d+$/i.test(value)) return false;
    if (looksLikePrice(value)) return false;
    if (/^-?\d+%$/.test(value)) return false;
    if (/view|details|buy|add to cart/i.test(value)) return false;
    return true;
  }

  function getCard(link) {
    return (
      link.closest('.item_store_item') ||
      link.closest('[class*="item_store"]') ||
      link.closest('[class*="store_item"]') ||
      link.closest('[class*="sale_item"]') ||
      link.closest('[class*="sale_page"]') ||
      link.closest('a[href*="/itemstore/252490/detail/"]') ||
      link.parentElement ||
      link
    );
  }

  function findName(card, link, id) {
    const selectors = [
      '.item_store_item_name',
      '.item_name',
      '.store_item_title',
      '.sale_card_name',
      '[class*="item_name"]',
      '[class*="ItemName"]',
      '[class*="store_item_name"]',
      '[class*="title"]',
      '[class*="Title"]'
    ];

    for (const selector of selectors) {
      const el = card.querySelector(selector);
      const value = clean(el?.textContent);
      if (looksLikeName(value)) return value;
    }

    const nodes = card.querySelectorAll('div, span, a');
    for (const el of nodes) {
      const value = clean(el.textContent);
      if (looksLikeName(value)) return value;
    }

    const linkText = clean(link.textContent);
    if (looksLikeName(linkText)) return linkText;

    return `Item #${id}`;
  }

  function findPriceData(card) {
    const finalSelectors = [
      '.discount_final_price',
      '.game_purchase_price',
      '[class*="final_price"]',
      '[class*="FinalPrice"]',
      '[class*="sale_price"]',
      '[class*="price"]'
    ];

    const originalSelectors = [
      '.discount_original_price',
      '[class*="original_price"]',
      '[class*="OriginalPrice"]'
    ];

    const discountSelectors = [
      '.discount_pct',
      '[class*="discount_pct"]',
      '[class*="DiscountPct"]'
    ];

    let price = '?';
    let originalPrice = '?';
    let discountPercent = 0;

    for (const selector of finalSelectors) {
      const el = card.querySelector(selector);
      const value = clean(el?.textContent);
      if (looksLikePrice(value)) { price = value; break; }
    }

    for (const selector of originalSelectors) {
      const el = card.querySelector(selector);
      const value = clean(el?.textContent);
      if (looksLikePrice(value)) { originalPrice = value; break; }
    }

    for (const selector of discountSelectors) {
      const el = card.querySelector(selector);
      const value = clean(el?.textContent);
      const m = value.match(/(\d+)/);
      if (m) { discountPercent = parseInt(m[1], 10) || 0; break; }
    }

    if (originalPrice === '?' && price !== '?') originalPrice = price;

    return { price, originalPrice, discountPercent, isOnSale: discountPercent > 0 };
  }

  function findImage(card) {
    const img =
      card.querySelector('img') ||
      card.querySelector('[style*="background-image"]');

    if (!img) return '';

    if (img.tagName === 'IMG') return img.src || img.getAttribute('src') || '';

    const style = img.getAttribute('style') || '';
    const match = style.match(/url\(["']?([^"')]+)["']?\)/i);
    return match?.[1] || '';
  }

  function collectVisible() {
    const links = document.querySelectorAll('a[href*="/itemstore/252490/detail/"]');

    for (const link of links) {
      const href = link.href || '';
      const match = href.match(/\/detail\/(\d+)/);
      if (!match) continue;

      const id = match[1];
      if (products[id]) continue;

      const card = getCard(link);
      const name = findName(card, link, id);
      const priceData = findPriceData(card);
      const image = findImage(card);

      products[id] = {
        id: Number(id),
        name,
        url: `https://store.steampowered.com/itemstore/252490/detail/${id}/`,
        price: priceData.price,
        originalPrice: priceData.originalPrice,
        discountPercent: priceData.discountPercent,
        isOnSale: priceData.isOnSale,
        image,
        lastSeen: Date.now()
      };
    }
  }

  // Vänta tills item-kort dyker upp i DOM (max 12 s)
  for (let i = 0; i < 30; i++) {
    await sleep(400);
    if (document.querySelector('a[href*="/itemstore/252490/detail/"]')) break;
  }

  collectVisible();

  // Paginera (max 20 sidor)
  for (let p = 2; p <= 20; p++) {
    const before = Object.keys(products).length;

    window.location.hash = 'p' + p;
    await sleep(1200);

    const pageBtn = document.querySelector(
      `[data-page="${p}"], a[href="#p${p}"], a[href*="p${p}"]`
    );

    if (pageBtn) {
      pageBtn.click();
      await sleep(1000);
    }

    collectVisible();

    if (Object.keys(products).length <= before) break;
  }

  return products;
}
