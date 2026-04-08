// smartmat-scanner-dom.js — DOM-scrapers för Coop, Willys och Lidl
// Körs i butikssidans kontext via chrome.scripting.executeScript.
// Måste vara self-contained — ingen tillgång till extension-scope.

// ─── Hjälpfunktioner (delas av alla scrapers) ──────────────────────────────

function cleanText(v) {
  return String(v || '').replace(/\s+/g, ' ').trim();
}

function looksLikePrice(t) {
  return /\d+\s*(kr|:-)/i.test(t) || /\d+[.,]\d*\s*kr/i.test(t) || /\d+\s+för\s+\d+/i.test(t);
}

function extractPriceFromText(text) {
  const m =
    text.match(/\d+\s+för\s+\d+\s*kr/i) ||
    text.match(/\d+[.,]\d*\s*kr/i)       ||
    text.match(/\d+\s*kr\b/i);
  return m ? m[0].trim() : '?';
}

function climbForCard(img, maxDepth = 7) {
  let card = img.parentElement;
  let depth = 0;
  while (card && depth < maxDepth) {
    const txt = card.innerText || card.textContent || '';
    if (looksLikePrice(txt) && txt.length < 400) break;
    card = card.parentElement;
    depth++;
  }
  if (!card || card === document.body) return null;
  const txt = card.innerText || card.textContent || '';
  if (txt.length > 400) return null;
  return card;
}

function extractDate(card) {
  for (const el of card.querySelectorAll('*')) {
    for (const attr of el.attributes) {
      if (/date|valid|period|gäller/i.test(attr.name) && attr.value.length > 3) return attr.value;
      if (/\d{4}-\d{2}-\d{2}/.test(attr.value)) return attr.value;
    }
  }
  const timeEl = card.querySelector('time');
  if (timeEl) return cleanText(timeEl.dateTime || timeEl.textContent);
  const text = card.innerText || card.textContent || '';
  const dm = text.match(/gäller[^0-9]*(\d+\/\d+[^.0-9]*\d*\/?\d*)/i)
           || text.match(/(\d+\/\d+\s*[-–]\s*\d+\/\d+)/);
  return dm ? dm[0].trim() : '';
}

// ─── Coop ──────────────────────────────────────────────────────────────────

export async function scrapeCoopDom() {
  // ── Allt måste vara self-contained — inga externa funktioner ────────────
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function clean(v) { return String(v || '').replace(/\s+/g, ' ').trim(); }

  function extractPrice(text) {
    const t = text.replace(/\s+/g, ' ').trim();
    const multi = t.match(/(\d+)\s*för\s*(\d{1,3}(?:[.,]\d{1,2})?)\s*kr/i);
    if (multi) return `${multi[1]} för ${multi[2]} kr`;
    const unit  = t.match(/(\d{1,3}(?:[.,]\d{1,2})?)\s*kr\s*\/\s*(st|kg|lit|l\b)/i);
    if (unit)   return `${unit[1]} kr/${unit[2]}`;
    const plain = t.match(/(\d{1,3}(?:[.,]\d{1,2})?)\s*kr/i);
    if (plain)  return `${plain[1]} kr`;
    return null;
  }

  function getDate(card) {
    const t = card.querySelector('time');
    if (t) return clean(t.dateTime || t.textContent);
    const txt = card.innerText || '';
    const m = txt.match(/gäller[^0-9]*(\d+\/\d+[^.0-9]*\d*\/?\d*)/i)
           || txt.match(/(\d+\/\d+\s*[-–]\s*\d+\/\d+)/);
    return m ? m[0].trim() : '';
  }

  // ── Vänta på kort ───────────────────────────────────────────────────────
  for (let i = 0; i < 40; i++) {
    await sleep(500);
    if (document.querySelector('li.Grid-cell.u-size1of1, li[class*="Grid"]')) break;
  }
  await sleep(1500);

  const products = [];
  const debug    = [];
  const seen     = new Set();
  const SKIP     = /^(erbjudanden|alla erbjudanden|veckans|kampanj|se alla|produkter|välkommen)/i;

  // ── Diagnostik ─────────────────────────────────────────────────────────
  debug.push('Title: ' + document.title.slice(0, 80));
  debug.push('Body length: ' + (document.body?.innerText?.length ?? 0));
  const diagSel = ['li.Grid-cell.u-size1of1','li[class*="Grid"]','[class*="OfferCard"]','[class*="ProductCard"]','article','li[class]'];
  for (const s of diagSel) debug.push('  ' + s + ' → ' + document.querySelectorAll(s).length);
  const liCls = new Set();
  document.querySelectorAll('li[class]').forEach(el => {
    if (liCls.size < 8) liCls.add(el.className.split(' ').slice(0,3).join(' '));
  });
  debug.push('li-klasser: ' + [...liCls].join(' | '));

  // ── Kort ────────────────────────────────────────────────────────────────
  let cards = [...document.querySelectorAll('li.Grid-cell.u-size1of1')];
  if (!cards.length) cards = [...document.querySelectorAll('li[class*="Grid"]')];
  if (!cards.length) cards = [...document.querySelectorAll('[class*="OfferCard"],[class*="ProductCard"]')];
  debug.push('Coop kort: ' + cards.length);

  for (const card of cards) {
    // Produktkort har alltid en Cloudinary-bild — navigationselement har det inte
    const img = card.querySelector('img[src*="res.cloudinary.com"]');
    if (!img) continue;

    const src   = img.src;
    const text  = (card.innerText || '').trim();
    const price = extractPrice(text);

    // Kräv ett hittad pris — navigations-items har inga
    if (!price) { debug.push('INGET PRIS: ' + text.slice(0, 60)); continue; }

    let name = '';
    const alt = clean(img.alt || '').replace(/^illustration\s+av\s+/i, '');
    if (alt.length >= 2 && alt.length <= 80 && !SKIP.test(alt)) name = alt;
    if (!name) {
      name = text.split('\n').map(l => l.trim()).filter(Boolean)
        .find(l => l.length >= 2 && l.length <= 80 && !extractPrice(l) && !SKIP.test(l)) || '';
    }
    if (!name || name.length < 2) { debug.push('KASTAS: ' + text.slice(0,60)); continue; }

    const key = name + '|' + (src || '');
    if (seen.has(key)) continue;
    seen.add(key);

    const url  = (card.querySelector('a')?.href) || location.href;
    const date = getDate(card) || 'Veckans erbjudanden';
    const id   = (src || name).replace(/[^a-z0-9]/gi, '').slice(-24) || String(products.length);

    products.push({ id, name, image: src, price: price, dateText: date, url });
    debug.push('OK: "' + name + '" / ' + price);
  }

  return { products, debug };
}

// ─── Willys ────────────────────────────────────────────────────────────────

export async function scrapeWillysDom(storeName) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function clean(v) { return String(v || '').replace(/\s+/g, ' ').trim(); }

  // Pris-parser för Willys radstruktur:
  //   29 / 67 / /st  →  "29,67 kr/st"
  //   2 FÖR / 18 / 00  →  "2 för 18,00 kr"
  function parseWillysPrice(lines) {
    // Mönster: "X FÖR" följt av heltal + decimal
    const forIdx = lines.findIndex(l => /^\d+\s+FÖR$/i.test(l));
    if (forIdx >= 0) {
      const count = lines[forIdx].match(/^(\d+)/)[1];
      const int   = lines[forIdx + 1] || '';
      const dec   = lines[forIdx + 2] || '';
      if (/^\d+$/.test(int)) {
        const decStr = /^\d+$/.test(dec) ? ',' + dec.padStart(2, '0') : '';
        return `${count} för ${int}${decStr} kr`;
      }
    }
    // Mönster: enhet (/st /kg /l) föregånget av int + dec
    const unitIdx = lines.findIndex(l => /^\/(st|kg|l|lit)$/i.test(l));
    if (unitIdx >= 2 && /^\d+$/.test(lines[unitIdx - 2]) && /^\d{2}$/.test(lines[unitIdx - 1])) {
      return `${lines[unitIdx - 2]},${lines[unitIdx - 1]} kr/${lines[unitIdx].slice(1)}`;
    }
    if (unitIdx >= 1 && /^\d+$/.test(lines[unitIdx - 1])) {
      return `${lines[unitIdx - 1]} kr/${lines[unitIdx].slice(1)}`;
    }
    // Mönster: int (1-3 siffror) + 2-siffrig decimal
    for (let i = 0; i + 1 < lines.length; i++) {
      if (/^\d{1,3}$/.test(lines[i]) && /^\d{2}$/.test(lines[i + 1])) {
        return `${lines[i]},${lines[i + 1]} kr`;
      }
    }
    // Ensam siffra
    const num = lines.find(l => /^\d{1,4}$/.test(l));
    return num ? `${num} kr` : null;
  }

  const products = [];
  const debug    = [];
  const seen     = new Set();
  const SKIP     = /^(erbjudanden|alla erbjudanden|veckans|kampanj|se alla|produkter|välkommen)/i;
  // Rader som aldrig är produktnamn
  const SKIP_NAME = /^(\d+|FÖR|Spara|Max|Lägsta|\/st|\/kg|\+pant|kr|st|kg|%|Ord\.|Jämförpris)/i;

  // ── Fas 1: Butiksval (om butiksnamn anges) ─────────────────────────────────
  if (storeName) {
    debug.push('Butiksval: ' + storeName);

    // Vänta på att sidan laddas
    for (let i = 0; i < 20; i++) {
      await sleep(500);
      if ((document.body?.innerText?.length ?? 0) > 200) break;
    }

    // Hitta butiksväljar-knapp i header
    const storeBtnSelectors = [
      '[data-testid="store-selector-button"]',
      '[data-testid="store-selector"]',
      'button[aria-label*="butik" i]',
      'button[aria-label*="välj" i]',
      '[class*="StoreSelector"] button',
      '[class*="store-selector"] button',
      '[class*="storeSelector"] button',
      '[class*="StorePicker"] button',
    ];

    let storeBtn = null;
    for (const sel of storeBtnSelectors) {
      storeBtn = document.querySelector(sel);
      if (storeBtn) { debug.push('Butik-knapp: ' + sel); break; }
    }

    // Fallback: header-knapp med text som antyder butiksval
    if (!storeBtn) {
      for (const btn of document.querySelectorAll('header button, [role="banner"] button')) {
        const txt = (btn.innerText || '').trim().toLowerCase();
        if (txt.includes('välj') || txt.includes('butik') || txt.includes('ändra')) {
          storeBtn = btn;
          debug.push('Butik-knapp (text): ' + txt);
          break;
        }
      }
    }

    if (storeBtn) {
      storeBtn.click();
      await sleep(1200);

      // Hitta sökfält i modal/drawer
      const searchSelectors = [
        'input[placeholder*="sök" i]',
        'input[placeholder*="butik" i]',
        'input[placeholder*="stad" i]',
        'input[placeholder*="ort" i]',
        '[role="dialog"] input[type="text"]',
        '[role="dialog"] input[type="search"]',
        'input[type="search"]',
      ];

      let searchInput = null;
      for (const sel of searchSelectors) {
        searchInput = document.querySelector(sel);
        if (searchInput) { debug.push('Sök-input: ' + sel); break; }
      }

      if (searchInput) {
        // React-kompatibel inmatning
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        setter.call(searchInput, storeName);
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        searchInput.dispatchEvent(new Event('change', { bubbles: true }));
        await sleep(1800);

        // Hitta och klicka första träffen
        const resultSelectors = [
          '[role="option"]',
          '[role="listitem"] button',
          '[class*="StoreResult"]',
          '[class*="store-result"]',
          '[class*="StoreItem"]',
          '[class*="store-item"]',
          '[class*="suggestion"]',
          'ul[class*="store"] li button',
          '[class*="SearchResult"] li',
        ];

        let firstResult = null;
        for (const sel of resultSelectors) {
          firstResult = document.querySelector(sel);
          if (firstResult) { debug.push('Butiksresultat: ' + sel); break; }
        }

        if (firstResult) {
          firstResult.click();
          debug.push('Valde: ' + (firstResult.innerText || '').trim().slice(0, 60));
          await sleep(3000); // Vänta på omdirigering/uppdatering
        } else {
          debug.push('VARNING: Inga butiksresultat — fortsätter utan val');
        }
      } else {
        debug.push('VARNING: Ingen sök-input i butiksselector');
      }
    } else {
      debug.push('VARNING: Ingen butik-knapp hittad');
    }
  }

  // ── Fas 2: Vänta på produktkort ────────────────────────────────────────────
  for (let i = 0; i < 40; i++) {
    await sleep(500);
    if (document.querySelectorAll('div[data-testid="product"]').length >= 3) break;
  }
  await sleep(1500);

  debug.push('Title: ' + document.title.slice(0, 80));
  debug.push('Body length: ' + (document.body?.innerText?.length ?? 0));
  const cards = [...document.querySelectorAll('div[data-testid="product"]')];
  debug.push('Kort (data-testid=product): ' + cards.length);

  for (const card of cards) {
    const lines = (card.innerText || '').split('\n').map(l => l.trim()).filter(Boolean);

    // Namn: första rad som inte är siffror/nyckelord
    const name = lines.find(l =>
      l.length >= 2 && l.length <= 80 &&
      !SKIP_NAME.test(l) && !SKIP.test(l)
    ) || '';
    if (!name || name.length < 2) { debug.push('KASTAS: ' + lines.slice(0, 3).join(' | ')); continue; }

    // Pris: rad-baserad parser
    const price = parseWillysPrice(lines) || '?';

    // Bild: första img i kortet
    const img = card.querySelector('img');
    const src = img ? (img.src || '').split('?')[0] : '';
    if (seen.has(src) && src) continue;
    if (src) seen.add(src);

    const url = (card.closest('a') || card.querySelector('a'))?.href || location.href;
    const id  = (src || name).replace(/[^a-z0-9]/gi, '').slice(-24) || String(products.length);
    products.push({ id, name, image: src, price, dateText: 'Veckans erbjudanden', url });
    debug.push('OK: "' + name + '" / ' + price);
  }

  return { products, debug };
}

// ─── Lidl ──────────────────────────────────────────────────────────────────

export async function scrapeLidlDom() {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function clean(v) { return String(v || '').replace(/\s+/g, ' ').trim(); }

  // Pris-parser för Lidl:
  //   Rader med * i slutet = kampanj/Lidl Plus-pris
  //   X FÖR: + kampanjpris → "X för PRIS"
  //   27.90* → "27,90 kr"   /   20:-* → "20:-"
  function parseLidlPrice(lines) {
    const campIdx = lines.findIndex(l => /\*\s*$/.test(l));
    if (campIdx < 0) {
      // Inget *-pris — ta första prisindikerande raden
      const pl = lines.find(l => /\d[\d.,]*\s*(:-|kr)/i.test(l));
      return pl ? clean(pl.replace(/\*/g, '')) : null;
    }

    // Formatera kampanjpriset: 27.90 → 27,90 kr   /   20:- behåller :-
    const raw = lines[campIdx].replace(/\*\s*$/, '').trim();
    const formatted = /:-$/.test(raw)
      ? raw
      : raw.replace(/(\d)\.(\d)/, '$1,$2') + ' kr';

    // Kolla om det finns en "X FÖR:"-rad före priset
    const forLine = lines.slice(0, campIdx).find(l => /^\d+\s*(FÖR|FOR)\s*:?/i.test(l));
    if (forLine) {
      const count = forLine.match(/^(\d+)/)[1];
      return `${count} för ${formatted}`;
    }
    return formatted;
  }

  // Validerar en rad som möjligt produktnamn
  function isValidName(line) {
    if (line.length < 2 || line.length > 80) return false;
    if (/^\d/.test(line))           return false; // startar med siffra → pris/antal/FÖR-rad
    if (/^-\d/.test(line))          return false; // -22%
    if (/med\s+lidl/i.test(line))   return false;
    if (/^i\s+butik/i.test(line))   return false;
    if (/jämförpris/i.test(line))   return false;
    if (/\/(st|kg|lit|l)\b/i.test(line)) return false;
    if (/\+pant/i.test(line))       return false;
    if (/^(erbjudanden|kampanj|se alla|produkter|välkommen|lidl plus|visa mer)/i.test(line)) return false;
    return true;
  }

  // Vänta på produktkort
  for (let i = 0; i < 40; i++) {
    await sleep(500);
    if (document.querySelectorAll('div.product-grid-box').length >= 3) break;
  }
  await sleep(1500);

  const products = [];
  const debug    = [];
  const seen     = new Set();

  debug.push('Title: ' + document.title.slice(0, 80));
  debug.push('Body length: ' + (document.body?.innerText?.length ?? 0));
  const cards = [...document.querySelectorAll('div.product-grid-box')];
  debug.push('Kort (div.product-grid-box): ' + cards.length);

  for (const card of cards) {
    const lines = (card.innerText || '').split('\n').map(l => l.trim()).filter(Boolean);

    // Deduplicera om de två första raderna är identiska
    if (lines.length >= 2 && lines[0] === lines[1]) lines.splice(0, 1);

    // Namn: första giltiga rad
    const name = lines.find(isValidName) || '';
    if (!name) { debug.push('KASTAS (namn): ' + lines.slice(0, 3).join(' | ')); continue; }

    // Pris
    const price = parseLidlPrice(lines) || '?';

    // Datum: "I butik DD/MM - DD/MM"
    const text = lines.join('\n');
    const dm = text.match(/I butik\s+\d{2}\/\d{2}\s*-\s*\d{2}\/\d{2}/i);
    const dateText = dm ? dm[0].trim() : 'Veckans erbjudanden';

    // Huvudbild (ej badge)
    const mainImg = card.querySelector('img.odsc-image-gallery__image');
    const src = mainImg ? (mainImg.src || '').split('?')[0] : '';
    if (src && seen.has(src)) continue;
    if (src) seen.add(src);

    const url = (card.closest('a') || card.querySelector('a'))?.href || location.href;
    const id  = (src || name).replace(/[^a-z0-9]/gi, '').slice(-24) || String(products.length);

    products.push({ id, name, image: src, price, dateText, url });
    debug.push('OK: "' + name + '" / ' + price + ' / ' + dateText);
  }

  return { products, debug };
}
