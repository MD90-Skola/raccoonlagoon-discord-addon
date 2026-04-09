// product-categories.js — Kategorisering av matprodukter
// Logikfilen håller all data om kategorier separerat från UI-koden.
// Huvudfilen (smartmat-scanner.js) anropar bara getCategory() och groupByCategory().

// ─── Kategorier ───────────────────────────────────────────────────────────────
// Varje kategori har:
//   label    — visningsnamn på svenska
//   color    — accent-färg (CSS hex)
//   keywords — ord som måste finnas i produktnamnet för att matcha
//   exclude  — ord som diskvalificerar produkten (t.ex. "kattmat" ska inte vara Kött)

export const CATEGORIES = {
  kott: {
    label: 'Kött',
    color: '#ef4444',
    keywords: [
      'kyckling', 'kycklingbröst', 'kycklingfilé', 'kycklingfile', 'kycklingklunga',
      'köttfärs', 'nötfärs', 'blandfärs', 'fläskfärs', 'lammfärs',
      'nötkött', 'fläskkött', 'fläskfilé', 'fläskfile', 'fläskkotlett',
      'kotlett', 'benfri', 'entrecôte', 'entrecote',
      'bacon', 'skinka', 'prosciutto', 'salami', 'korv', 'falukorv', 'chorizo',
      'lamm', 'lammkotlett',
      'vilt', 'älg', 'hjort', 'rådjur',
      'biff', 'oxfilé', 'oxfile', 'rostbiff',
      'kött',
    ],
    exclude: [
      // Djurmat
      'hund', 'katt', 'hundmat', 'kattmat', 'djurmat', 'husdjur',
      // Smaksatt halvfabrikat / nudlar / snacks
      'nudel', 'nudlar', 'buljong', 'fond',
      'krydda', 'kryddmix', 'kryddpeppar',
      'chips', 'snacks', 'popcorn', 'dip',
      // Pulver / soppor / sås utan kött
      'pulver', 'mix', 'smaksatt', 'biffsmak', 'biff-smak',
    ],
  },

  godis: {
    label: 'Godis',
    color: '#a855f7',
    keywords: [
      'godis', 'choklad', 'marabou', 'aladdin', 'fazer', 'dumle', 'kexchoklad',
      'daim', 'snickers', 'twix', 'kit kat', 'kitkat', 'bounty', 'mars',
      'polly', 'skipper', 'skum', 'skumgodis', 'lakrits', 'lakritsskalle',
      'gelé', 'geléhallon', 'salta', 'salmiak',
      'kola', 'toffee', 'fudge', 'nougat',
      'lollipop', 'klubba', 'tuggummi', 'chewing',
      'glass', 'sorbet', 'magnum', 'cornetto', 'gb glace',
      'kex', 'kärnhuset', 'bilar', 'skipper\'s',
    ],
    exclude: [
      'chokladpulver', 'chokladdryck', 'kakao',
    ],
  },

  gronsaker: {
    label: 'Grönsaker',
    color: '#22c55e',
    keywords: [
      // Rotfrukter
      'potatis', 'sötpotatis', 'morot', 'morötter', 'rova', 'palsternacka',
      'rödbeta', 'rädisa',
      // Lövgrönsaker / sallad
      'sallad', 'isbergssallad', 'spenat', 'rucola', 'kål',
      'broccoli', 'blomkål', 'grönkål', 'vitkål', 'rödkål', 'kinakål',
      // Fruktgrönsaker
      'tomat', 'gurka', 'paprika', 'zucchini', 'aubergine', 'squash',
      'majs', 'ärtor', 'edamame', 'haricots', 'böna', 'bönor', 'linser',
      // Lök
      'lök', 'rödlök', 'gräslök', 'purjolök', 'schalottenlök', 'vitlök',
      // Svamp
      'champinjon', 'svamp',
      // Frukt (om man vill inkludera)
      'äpple', 'päron', 'banan', 'apelsin', 'mandarin', 'citron', 'lime',
      'jordgubbe', 'jordgubbar', 'hallon', 'blåbär', 'körsbär', 'vindruvor',
      'mango', 'ananas', 'melon', 'vattenmelon', 'kiwi', 'persika', 'plommon',
      // Ekologisk / förpackad
      'grönsaker', 'grönsaksmix', 'woksås', 'wokgrönsaker',
    ],
    exclude: [
      'juice', 'smoothie', 'konserv',  // hålls i Dricka
      'potatischips', 'chips',
    ],
  },

  dricka: {
    label: 'Dricka',
    color: '#3b82f6',
    keywords: [
      // Läskedrycker
      'coca-cola', 'cola', 'fanta', 'sprite', 'pepsi', 'lemonad',
      'festis', 'somersby', 'cider',
      // Vatten
      'vatten', 'mineralvatten', 'kolsyrat',
      // Juice / smoothie
      'juice', 'apelsinjuice', 'äppeljuice', 'smoothie',
      // Mejeri-drycker
      'mjölk', 'oatly', 'havreryck', 'havredryck', 'sojamjölk', 'sojadryck',
      'mandelmjölk', 'mandeldryck', 'fil', 'filmjölk',
      // Varm dryck
      'kaffe', 'espresso', 'te', 'kakao', 'chokladdryck',
      // Alkohol
      'öl', 'lager', 'ipa', 'ale', 'vin', 'rosé', 'prosecco', 'champagne',
      'cava', 'whisky', 'vodka', 'gin', 'rom',
      // Energi / sport
      'energidryck', 'monster', 'red bull', 'redbull', 'nocco',
      'sportdryck', 'elektrolyt',
    ],
    exclude: [],
  },

  brod: {
    label: 'Bröd',
    color: '#f59e0b',
    keywords: [
      'bröd', 'levain', 'surdeg', 'limpa', 'formfranska', 'franska',
      'baguette', 'ciabatta', 'focaccia', 'pitabröd', 'pita',
      'knäckebröd', 'crispbröd', 'finn crisp',
      'wienerbröd', 'croissant', 'bulle', 'kanelbulle', 'frukostbulle',
      'muffin', 'scone', 'brioche',
      // Mjöl / bakning
      'mjöl', 'vetemjöl', 'rågmjöl', 'grahamsmjöl', 'havremjöl',
      'jäst', 'bakpulver', 'bikarbonat',
      // Pasta / ris (kolhydrater)
      'pasta', 'spaghetti', 'penne', 'tagliatelle', 'lasagne', 'makaroner',
      'ris', 'jasminris', 'basmatiris',
      'havregryn', 'musli', 'granola', 'müsli', 'cornflakes', 'flingor',
    ],
    exclude: [
      'riskakor',  // mer snacks
    ],
  },
};

// ─── getCategory ──────────────────────────────────────────────────────────────
// Returnerar kategori-nyckeln (t.ex. "kott", "godis") för ett produktnamn,
// eller null om ingen kategori matchar.
// Viktigt: om ett exclude-ord hittas → hoppar vi över den kategorin.
//
// Exempel: "Marabou Choklad 200g" → "godis"
//          "Nötfärs 800g ICA"    → "kott"
//          "Apelsinjuice 1L"     → "dricka"
//          "Tomater ekologiska"  → "gronsaker"

export function getCategory(productName) {
  const name = (productName || '').toLowerCase();

  for (const [key, cat] of Object.entries(CATEGORIES)) {
    // Kolla om något exclude-ord finns i namnet
    const isExcluded = cat.exclude.some(ex => name.includes(ex));
    if (isExcluded) continue;

    // Kolla om något keyword matchar
    const isMatch = cat.keywords.some(kw => name.includes(kw));
    if (isMatch) return key;
  }

  return null; // Ingen kategori hittades
}

// ─── groupByCategory ─────────────────────────────────────────────────────────
// Tar en array av produktobjekt och grupperar dem i ett objekt:
// { kott: [...], godis: [...], gronsaker: [...], dricka: [...], brod: [...], other: [...] }
// "other" innehåller produkter som inte matchade någon kategori.
//
// Användning:
//   const grouped = groupByCategory(allProducts);
//   console.log(grouped.kott); // alla köttprodukter

export function groupByCategory(products) {
  const result = {};
  for (const key of Object.keys(CATEGORIES)) result[key] = [];
  result.other = [];

  for (const product of products) {
    const cat = getCategory(product.name);
    if (cat) {
      result[cat].push(product);
    } else {
      result.other.push(product);
    }
  }

  return result;
}
