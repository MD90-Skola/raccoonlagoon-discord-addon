export function scrapeSteam() {
  function normalize(text) {
    return String(text || '').replace(/\s+/g, ' ').trim();
  }

  function cleanUrl(url) {
    return String(url || '').split('?')[0];
  }

  function firstSrcFromSrcset(srcset) {
    if (!srcset) return '';
    return srcset.split(',')[0]?.trim().split(' ')[0] || '';
  }

  function extractImage(row) {
    const img =
      row.querySelector('img') ||
      row.querySelector('.search_capsule img');

    if (!img) return '';

    return (
      img.getAttribute('data-src') ||
      firstSrcFromSrcset(img.srcset) ||
      img.currentSrc ||
      img.src ||
      ''
    );
  }

  function extractTitle(row) {
    const candidates = [
      row.querySelector('.title')?.textContent,
      row.querySelector('span.title')?.textContent
    ];

    for (const raw of candidates) {
      const text = normalize(raw);
      if (text) return text;
    }

    return '';
  }

  function extractDiscountText(row) {
    const text = normalize(row.innerText || '');

    const percentEl =
      row.querySelector('.discount_pct') ||
      row.querySelector('.search_discount span');

    const finalPriceEl =
      row.querySelector('.discount_final_price') ||
      row.querySelector('.search_price_discount_combined .discount_final_price') ||
      row.querySelector('.search_price');

    const percentText = normalize(percentEl?.textContent || '');
    const finalPriceText = normalize(finalPriceEl?.textContent || '');

    return {
      fullText: text,
      percentText,
      finalPriceText
    };
  }

  function isFreeSale(discount) {
    const full = discount.fullText.toLowerCase();
    const percent = discount.percentText.toLowerCase();
    const finalPrice = discount.finalPriceText.toLowerCase();

    const hasHundredPercent =
      percent.includes('-100%') ||
      full.includes('-100%');

    const hasZeroPrice =
      finalPrice.includes('0,00€') ||
      finalPrice.includes('0.00€') ||
      finalPrice === 'free' ||
      full.includes('0,00€') ||
      full.includes('0.00€');

    return hasHundredPercent || hasZeroPrice;
  }

  const games = [];
  const seen = new Set();

  const rows = Array.from(document.querySelectorAll('a.search_result_row'));

  for (const row of rows) {
    const url = cleanUrl(row.href);
    if (!url || seen.has(url)) continue;

    const title = extractTitle(row);
    if (!title) continue;

    const image = extractImage(row);
    const discount = extractDiscountText(row);

    if (!isFreeSale(discount)) continue;

    seen.add(url);

    games.push({
      title,
      url,
      image,
      dateText: '100% sale'
    });
  }

  return games;
}