// ica-scanner-dom.js — Injicerat sidskript för ICA erbjudanden
// Körs i ICA-sidans kontext via chrome.scripting.executeScript.
// Måste vara self-contained — ingen tillgång till extension-scope.

export async function scrapeIcaDom() {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // ── Vänta tills produktbilder från ICA:s CDN är synliga ──────────────────
  for (let i = 0; i < 30; i++) {
    await sleep(500);
    const hasImages = document.querySelector(
      'img[src*="icanet"], img[src*="ica.se"], img[src*="cloudinary"]'
    );
    if (hasImages) break;
  }

  await sleep(1200); // Extra tid för full SPA-render

  // ── Extrahera datum ur inbäddad JSON/script-taggar ───────────────────────
  const dateMap = {};
  for (const script of document.querySelectorAll('script')) {
    const txt = script.textContent || '';
    // Matcha mönster: "validTo":"2025-04-20" eller "endDate":"..."
    const matches = txt.matchAll(/"(?:validTo|endDate|OfferEndDate|offerEnd)"\s*:\s*"([^"]+)"/gi);
    for (const m of matches) {
      dateMap[m[1]] = m[1]; // registrera funna datum
    }
  }

  // ── Hjälpfunktioner ───────────────────────────────────────────────────────
  function clean(v) {
    return String(v || '').replace(/\s+/g, ' ').trim();
  }

  function looksLikePrice(t) {
    return /\d+\s*(kr|:-)/i.test(t) || /\d+\s+för\s+\d+/i.test(t);
  }

  function extractDate(el) {
    // 1. Sök i data-attribut
    for (const attr of el.querySelectorAll('*')) {
      for (const a of attr.attributes) {
        if (/date|valid|period|gäller/i.test(a.name) && a.value.length > 3) {
          return a.value;
        }
        if (/\d{4}-\d{2}-\d{2}/.test(a.value)) return a.value;
      }
    }

    // 2. Sök <time>-element
    const timeEl = el.querySelector('time');
    if (timeEl) return clean(timeEl.dateTime || timeEl.textContent);

    // 3. Sök textuellt datummönster
    const text = el.innerText || el.textContent || '';
    const dm = text.match(/gäller[^0-9]*(\d+\/\d+[^.0-9]*\d*\/?\d*)/i)
            || text.match(/(\d+\/\d+\s*[-–]\s*\d+\/\d+)/);
    if (dm) return dm[0].trim();

    return '';
  }

  // ── Samla produktkort ─────────────────────────────────────────────────────
  const products = [];
  const debug    = [];
  const seenImgs = new Set();

  // ── URL-filter: uteslut bilder som inte är produkterbjudanden ────────────────
  function isOfferImage(src) {
    // Hoppa över inbäddade externa bilder via Cloudinary fetch (t.ex. e-magin.se veckoblad)
    if (src.includes('/image/fetch/')) return false;
    // Hoppa över kända icke-produkt-URL-mönster
    if (/\/(logo[s]?|icon[s]?|badge[s]?|banner[s]?|social|favicon)\//i.test(src)) return false;
    if (/[_-](logo|icon|badge|banner)[_.-]/i.test(src)) return false;
    return true;
  }

  // ── Filtrera namn som är sektionsrubriker snarare än produktnamn ─────────────
  const SECTION_HEADING = /^(erbjudanden|alla erbjudanden|veckans|kampanj|se alla|produkter|butikens|välkommen|hos oss)/i;

  const imgs = document.querySelectorAll(
    'img[src*="icanet.se"], img[src*="assets.icanet"], img[src*="ica.se/butiker"], img[src*="cloudinary"]'
  );

  debug.push('Totalt imgs funna: ' + imgs.length);

  for (const img of imgs) {
    const src = (img.src || img.dataset.src || '').split('?')[0];
    if (!src || seenImgs.has(src)) continue;
    if (!isOfferImage(src)) {
      debug.push('FILTRERAD: ' + src.slice(0, 80));
      continue;
    }
    seenImgs.add(src);

    // Klättra upp för att hitta kortbehållaren med pris
    // Begränsa till max 7 nivåer och acceptera inte för stora behållare
    let card = img.parentElement;
    let depth = 0;
    while (card && depth < 7) {
      const txt = card.innerText || card.textContent || '';
      if (looksLikePrice(txt) && txt.length < 350) break;
      card = card.parentElement;
      depth++;
    }
    if (!card || card === document.body) {
      debug.push('INGET KORT: ' + src.slice(0, 80));
      continue;
    }

    const cardText = card.innerText || card.textContent || '';
    if (cardText.length > 350) {
      debug.push('KORT FÖR STORT (' + cardText.length + 'tkn) djup=' + depth + ': ' + cardText.slice(0, 100));
      continue;
    }

    // Pris — matcha svenska prismönster
    const priceMatch =
      cardText.match(/\d+\s+för\s+\d+\s*kr/i) ||
      cardText.match(/\d+[.,]\d*\s*kr/i)       ||
      cardText.match(/\d+\s*kr\b/i);
    const price = priceMatch ? priceMatch[0].trim() : '?';

    // ── Produktnamn ─────────────────────────────────────────────────────────
    // Strategi 1: img.alt (ICA sätter oftast produktnamnet här)
    let name = '';
    const altRaw = clean(img.alt || img.title || '').replace(/^illustration\s+av\s+/i, '');
    if (altRaw.length >= 2 && altRaw.length <= 80 && !looksLikePrice(altRaw) && !SECTION_HEADING.test(altRaw)) {
      name = altRaw;
      debug.push('Namn från alt: "' + name + '"');
    }

    // Strategi 2: heading/strong i hela erbjudandekortet (ett steg ovan pris-noden)
    if (!name) {
      const offerCard = card.parentElement;
      if (offerCard && offerCard !== document.body) {
        const nameEl =
          offerCard.querySelector('h2, h3, h4') ||
          offerCard.querySelector('[class*="name" i], [class*="title" i], [class*="product" i]') ||
          offerCard.querySelector('strong, b');
        if (nameEl) {
          name = clean(nameEl.innerText || nameEl.textContent);
          debug.push('Namn från syskon-nameEl <' + nameEl.tagName + '>: "' + name + '"');
        }
      }
    }

    // Strategi 3: första icke-pris-textrad i pris-noden (fallback)
    if (!name) {
      const lines = cardText.split('\n').map(l => l.trim()).filter(Boolean);
      name = clean(lines.find(l => !looksLikePrice(l) && l.length >= 2) || '');
      debug.push('Namn fallback från korttext. Rader: ' + JSON.stringify(lines.slice(0, 5)) + ' => "' + name + '"');
    }

    if (!name || name.length < 2 || name.length > 80) {
      debug.push('NAMN KASTAS (längd ' + name.length + '): "' + name + '"');
      continue;
    }
    if (SECTION_HEADING.test(name)) {
      debug.push('NAMN KASTAS (rubrik): "' + name + '"');
      continue;
    }

    debug.push('OK: "' + name + '" / ' + price);

    // Datum
    const dateText = extractDate(card) || 'Veckans erbjudanden';

    // URL — kortets länk om den finns
    const link = card.closest('a') || card.querySelector('a');
    const url  = link?.href || location.href;

    // Unikt ID baserat på bild-URL
    const id = src.replace(/[^a-z0-9]/gi, '').slice(-24) || String(products.length);

    products.push({ id, name, image: src, price, dateText, url });
  }

  return { products, debug };
}
