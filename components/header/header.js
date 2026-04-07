// components/header/header.js

export const template = `
<nav class="tab-bar">
  <button class="tab-btn active" data-tab="home" id="homeTabBtn" title="Home">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
    <span class="tab-label">Home</span>
  </button>

  <button class="tab-btn" data-tab="notes" id="notesTabBtn" title="Notes">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
    <span class="tab-label">Notes</span>
  </button>

  <button class="tab-btn" data-tab="scanner" id="scannerTabBtn" title="Scanner" hidden>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg>
    <span class="tab-label">Scanner</span>
  </button>

  <button class="tab-btn" data-tab="optimize" id="optimizeTabBtn" title="Optimize">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z"/></svg>
    <span class="tab-label">Optimize</span>
  </button>

  <button class="tab-btn" data-tab="monkey-patch" id="monkeyPatchTabBtn" title="Monkey Patch">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
    <span class="tab-label">Monkey</span>
  </button>

  <button class="tab-btn" data-tab="settings" title="Settings">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
    <span class="tab-label">Settings</span>
  </button>
</nav>`;

export function init() {
  const tabBar   = document.querySelector('.tab-bar');
  const tabBtns  = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => { p.hidden = true; p.classList.remove('active'); });
      btn.classList.add('active');
      const pane = document.getElementById('tab-' + target);
      pane.hidden = false;
      requestAnimationFrame(() => pane.classList.add('active'));
    });
  });

  // ── Icon-only mode when tabs are cramped ────────────────────────────────────
  function checkOverflow() {
    requestAnimationFrame(() => {
      const btns = [...tabBar.querySelectorAll('.tab-btn:not([hidden])')];
      if (!btns.length) return;
      const available = tabBar.clientWidth - 16; // subtract left+right padding
      const gaps      = (btns.length - 1) * 2;
      const btnWidth  = (available - gaps) / btns.length;
      tabBar.classList.toggle('icon-only', btnWidth < 64);
    });
  }

  // Trigger on panel resize
  new ResizeObserver(checkOverflow).observe(tabBar);

  // Trigger when tab buttons are hidden/shown
  new MutationObserver(checkOverflow).observe(tabBar, {
    attributes: true,
    subtree: true,
    attributeFilter: ['hidden']
  });

  checkOverflow();
}