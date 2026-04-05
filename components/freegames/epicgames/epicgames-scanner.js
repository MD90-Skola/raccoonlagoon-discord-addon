export function scrapeEpic() {

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

  function findCard(link) {
    return (
      link.closest('article') ||
      link.closest('[data-testid]') ||
      link.closest('li') ||
      link.parentElement?.parentElement ||
      link.parentElement
    );
  }

  function extractImage(link, card) {
    const img = link.querySelector('img') || card.querySelector('img');
    if (!img) return '';

    return (
      img.getAttribute('data-image') ||
      img.getAttribute('data-src') ||
      firstSrcFromSrcset(img.srcset) ||
      img.currentSrc ||
      img.src ||
      ''
    );
  }

  function extractTitle(link, card) {
    const candidates = [
      link.querySelector('img')?.alt,
      card.querySelector('img')?.alt,
      link.getAttribute('aria-label'),
      card.querySelector('h1, h2, h3, h4, h5, h6')?.textContent
    ];

    for (const raw of candidates) {
      const text = normalize(raw);
      if (!text) continue;

      const lower = text.toLowerCase();

      if (
        lower.includes('free') ||
        lower.includes('coming')
      ) continue;

      return text;
    }

    const lines = (card.innerText || '')
      .split('\n')
      .map(normalize)
      .filter(Boolean);

    for (const line of lines) {
      const lower = line.toLowerCase();

      if (
        lower.includes('free') ||
        lower.includes('coming')
      ) continue;

      return line;
    }

    return '';
  }

  function extractDateText(text) {
    const lines = text
      .split('\n')
      .map(normalize)
      .filter(Boolean);

    for (const line of lines) {
      const lower = line.toLowerCase();

      if (
        lower.includes('free now') ||
        lower.includes('coming soon') ||
        /^free\s+[a-z]{3,9}\s+\d{1,2}/i.test(line)
      ) {
        return line;
      }
    }

    return '';
  }

  function monthToIndex(month) {
    const map = {
      jan: 0, january: 0,
      feb: 1, february: 1,
      mar: 2, march: 2,
      apr: 3, april: 3,
      may: 4,
      jun: 5, june: 5,
      jul: 6, july: 6,
      aug: 7, august: 7,
      sep: 8, september: 8,
      oct: 9, october: 9,
      nov: 10, november: 10,
      dec: 11, december: 11
    };

    return map[String(month || '').toLowerCase()] ?? null;
  }

  function parseDaysLeft(dateText) {
    if (!dateText) return { days: null, status: 'unknown' };

    const now = new Date();

    // 1. Free Now - Apr 16
    let match = dateText.match(/free now\s*-\s*([a-z]{3,9})\s+(\d{1,2})/i);
    if (match) {
      const month = monthToIndex(match[1]);
      const day = Number(match[2]);

      if (month != null && day) {
        let year = now.getFullYear();
        let end = new Date(year, month, day, 23, 59, 59);

        if (end < now) {
          year += 1;
          end = new Date(year, month, day, 23, 59, 59);
        }

        return {
          days: Math.max(0, Math.ceil((end - now) / 86400000)),
          status: 'active'
        };
      }
    }

    // 2. Free Apr 09 - Apr 16
    match = dateText.match(/free\s+([a-z]{3,9})\s+(\d{1,2})\s*-\s*([a-z]{3,9})\s+(\d{1,2})/i);
    if (match) {
      const startMonth = monthToIndex(match[1]);
      const startDay = Number(match[2]);
      const endMonth = monthToIndex(match[3]);
      const endDay = Number(match[4]);

      if (startMonth != null && endMonth != null) {
        const year = now.getFullYear();

        const start = new Date(year, startMonth, startDay);
        const end = new Date(year, endMonth, endDay, 23, 59, 59);

        if (start > now) {
          return {
            days: Math.ceil((start - now) / 86400000),
            status: 'coming'
          };
        }

        return {
          days: Math.ceil((end - now) / 86400000),
          status: 'active'
        };
      }
    }

    // 3. Free Apr 09 - 16
    match = dateText.match(/free\s+([a-z]{3,9})\s+(\d{1,2})\s*-\s*(\d{1,2})/i);
    if (match) {
      const month = monthToIndex(match[1]);
      const startDay = Number(match[2]);
      const endDay = Number(match[3]);

      if (month != null) {
        const year = now.getFullYear();

        const start = new Date(year, month, startDay);
        const end = new Date(year, month, endDay, 23, 59, 59);

        if (start > now) {
          return {
            days: Math.ceil((start - now) / 86400000),
            status: 'coming'
          };
        }

        return {
          days: Math.ceil((end - now) / 86400000),
          status: 'active'
        };
      }
    }

    return { days: null, status: 'unknown' };
  }

  const games = [];
  const seen = new Set();
  const links = Array.from(document.querySelectorAll('a[href*="/p/"]'));

  for (const link of links) {
    const href = cleanUrl(link.href);
    if (!href || seen.has(href)) continue;

    const card = findCard(link);
    if (!card) continue;

    const text = normalize(card.innerText || '');
    if (!text) continue;

    const dateText = extractDateText(text);
    if (!dateText) continue;

    const { days, status } = parseDaysLeft(dateText);

    const title = extractTitle(link, card);
    if (!title) continue;

    const image = extractImage(link, card);

    seen.add(href);

    games.push({
      title,
      url: href,
      image,
      dateText,
      daysLeft: days,
      status
    });
  }

  return games;
}