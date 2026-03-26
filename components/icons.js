// components/icons.js — Delade SVG-ikoner
// Används av: popup.js, instagram-content.js, youtube-content.js
// Inga emojis — endast riktiga SVG-ikoner

var Icons = {
  // Discord-logotyp — tydligare version med synliga "ögon"
  discord: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 127.14 96.36" fill="currentColor" aria-hidden="true">
      <path d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0 105.89 105.89 0 0 0 19.39 8.09C2.79 32.65-1.72 56.6.54 80.21h0A105.73 105.73 0 0 0 32.71 96.36 77.7 77.7 0 0 0 39.6 85.25a68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.67 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1A105.25 105.25 0 0 0 126.6 80.22h0c2.68-27.38-4.6-51.11-18.9-72.15ZM42.45 65.69C36.18 65.69 31 59.93 31 52.84s5-12.85 11.43-12.85S53.89 45.75 53.84 52.84c0 7.09-5 12.85-11.39 12.85Zm42.24 0c-6.27 0-11.43-5.76-11.43-12.85S78.23 40 84.69 40s11.43 5.76 11.43 12.84-4.98 12.85-11.43 12.85Z"/>
    </svg>
  `.trim(),

  // Skicka-ikon
  send: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <line x1="22" y1="2" x2="11" y2="13"></line>
      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
    </svg>
  `.trim(),

  // Bild-ikon
  image: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
      <circle cx="8.5" cy="8.5" r="1.5"></circle>
      <polyline points="21 15 16 10 5 21"></polyline>
    </svg>
  `.trim(),

  // YouTube-logotyp
  youtube: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814ZM9.545 15.568V8.432L15.818 12l-6.273 3.568Z"/>
    </svg>
  `.trim(),

  // Instagram-ikon
  instagram: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
    </svg>
  `.trim()
};