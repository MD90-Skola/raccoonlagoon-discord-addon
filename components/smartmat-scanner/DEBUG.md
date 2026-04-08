# Smartmat-scanner — Debug guide

## Problem
`Coop imgs: 0` — img-selektorerna matchar inte de faktiska CDN-domänerna.

## Filer

| Fil | Roll |
|-----|------|
| `smartmat-scanner-dom.js` | DOM-scrapers (körs i butikssidans kontext) |
| `smartmat-scanner-background.js` | Öppnar tab, kör scraper, sparar till storage |
| `smartmat-scanner.js` | UI — pills, progressbar, lista, inköpslista |
| `smartmat-scanner.css` | Stilar |

## Hur scrapern fungerar

1. Background öppnar en ny tab med butikens URL
2. Väntar på `tab.status === 'complete'` + 2s extra
3. Kör `chrome.scripting.executeScript({ func: scrapeXxxDom })`
4. Scrapern väntar på CDN-bilder (max 15s), sedan klättrar DOM för pris/namn
5. Returnerar `{ products, debug }`

## Nuvarande selektorer (felaktiga)

```js
// Coop
'img[src*="coop.se"], img[src*="axfood"], img[src*="coop-cdn"]'

// Willys
'img[src*="willys.se"], img[src*="axfood"]'

// Lidl
'img[src*="lidl.se"], img[src*="lidl.com"], img[src*="neckermann"], img[src*="schwarz-media"]'
```

## Diagnostiksnippet — kör i webbläsarkonsolen på respektive sida

Öppna butikens erbjudandesida, vänta tills produkterna laddats, klistra sedan in detta i DevTools-konsolen:

```js
// ─── STEG 1: Hitta alla unika CDN-domäner för bilder ──────────────────────
const domains = new Set();
document.querySelectorAll('img').forEach(img => {
  try { domains.add(new URL(img.src || img.dataset?.src || '').hostname); } catch(_) {}
});
console.log('=== Unika img-domäner ===');
domains.forEach(d => console.log(' ', d));

// ─── STEG 2: Visa de 10 första img src:erna ────────────────────────────────
console.log('\n=== Första 10 img src ===');
Array.from(document.querySelectorAll('img')).slice(0, 10).forEach(img => {
  console.log(img.src || img.dataset?.src || '(tom)');
});

// ─── STEG 3: Sök efter produktkort via vanliga CSS-mönster ────────────────
const cardSelectors = [
  '[class*="offer"]', '[class*="product"]', '[class*="card"]',
  '[class*="deal"]',  '[class*="campaign"]', '[class*="erbjudande"]',
  'article', 'li[class]'
];
console.log('\n=== Produktkorts-kandidater ===');
for (const sel of cardSelectors) {
  const hits = document.querySelectorAll(sel);
  if (hits.length > 0 && hits.length < 200) {
    console.log(sel + ' → ' + hits.length + 'st');
    const first = hits[0];
    console.log('  Första kortets text:', first.innerText?.slice(0, 120).replace(/\n/g,' '));
    const firstImg = first.querySelector('img');
    if (firstImg) console.log('  Bild-src:', firstImg.src || firstImg.dataset?.src || '(tom)');
  }
}

// ─── STEG 4: Visa priser ───────────────────────────────────────────────────
const priceEls = document.querySelectorAll('[class*="price"], [class*="pris"], [class*="Price"]');
console.log('\n=== Pris-element (första 5) ===');
Array.from(priceEls).slice(0, 5).forEach(el => {
  console.log(' ', el.tagName, el.className.slice(0,60), '→', el.innerText?.trim().slice(0,40));
});
```

## Vad du ska kopiera och skicka tillbaka

Kör snippeten på dessa tre sidor och klistra in all konsol-output:

- **Coop:** https://www.coop.se/erbjudanden/
- **Willys:** https://www.willys.se/erbjudanden
- **Lidl:** https://www.lidl.se/c/lidl-plus-erbjudanden/a10091753

Utskriften visar:
1. Vilka CDN-domäner bilderna faktiskt kommer ifrån → fixar img-selektorn
2. Vilka CSS-klasser produktkorten har → kan användas som alternativ selector
3. Hur priserna är markerade i DOM

## Vad som behöver ändras i koden

I `smartmat-scanner-dom.js`, funktionerna `scrapeCoopDom`, `scrapeWillysDom`, `scrapeLidlDom`:

```js
// Rad att ändra i scrapeCoopDom (ca rad 60 och 70):
if (document.querySelector('img[src*="RÄTT_CDN"]')) break;
const imgs = document.querySelectorAll('img[src*="RÄTT_CDN"]');
```

Ersätt `RÄTT_CDN` med vad diagnostiken visar.
