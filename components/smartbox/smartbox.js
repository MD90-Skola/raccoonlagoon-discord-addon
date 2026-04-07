// components/smartbox/smartbox.js

import { showStatus } from '../../sidepanel/tabs/utils.js';

export const template = `
<!-- Smart Box: Spell Check + Translate -->
<div class="card" id="smartCard">
  <label class="section-label">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
    Smart Box
  </label>
  <textarea class="tool-input" id="smartInput" placeholder="Type in any language — corrects spelling first, then translates to English if needed…" rows="3"></textarea>
  <div class="tool-result" id="smartSpellResult" hidden>
    <span class="tool-result-label">Spell Checked</span>
    <div class="tool-result-body">
      <span class="tool-result-text" id="smartSpellText"></span>
      <button class="btn-copy" id="smartSpellCopy">Copy</button>
    </div>
  </div>
  <div class="tool-result" id="smartTranslateResult" hidden>
    <span class="tool-result-label">Translated to English</span>
    <div class="tool-result-body">
      <span class="tool-result-text" id="smartTranslateText"></span>
      <button class="btn-copy" id="smartTranslateCopy">Copy</button>
    </div>
  </div>
  <div class="tool-status" id="smartStatus"></div>
</div>

<!-- Spell Check -->
<div class="card" id="spellCard">
  <label class="section-label">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
    Spell Check
  </label>
  <textarea class="tool-input" id="spellInput" placeholder="Type or paste text to spell-check…" rows="3"></textarea>
  <div class="tool-result" id="spellResult" hidden>
    <span class="tool-result-label">Corrected</span>
    <div class="tool-result-body">
      <span class="tool-result-text" id="spellResultText"></span>
      <button class="btn-copy" id="spellCopyBtn">Copy</button>
    </div>
  </div>
  <div class="tool-status" id="spellStatus"></div>
</div>

<!-- Translate to English -->
<div class="card" id="translateCard">
  <label class="section-label">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 8l6 6"/><path d="M4 14l6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="M22 22l-5-10-5 10"/><path d="M14 18h6"/></svg>
    Translate to English
  </label>
  <textarea class="tool-input" id="translateInput" placeholder="Type or paste text to translate…" rows="3"></textarea>
  <div class="tool-result" id="translateResult" hidden>
    <span class="tool-result-label">Translation</span>
    <div class="tool-result-body">
      <span class="tool-result-text" id="translateResultText"></span>
      <button class="btn-copy" id="translateCopyBtn">Copy</button>
    </div>
  </div>
  <div class="tool-status" id="translateStatus"></div>
</div>`;

export function init() {
  // ── Tool status helper ──────────────────────────────────────────────────────
  function setToolStatus(el, msg, type) {
    el.textContent = msg;
    el.className   = 'tool-status' + (type ? ' ' + type : '');
  }

  // ── Spell Check ─────────────────────────────────────────────────────────────
  const spellInput      = document.getElementById('spellInput');
  const spellResult     = document.getElementById('spellResult');
  const spellResultText = document.getElementById('spellResultText');
  const spellCopyBtn    = document.getElementById('spellCopyBtn');
  const spellStatus     = document.getElementById('spellStatus');

  let spellTimer = null;
  spellInput.addEventListener('input', () => {
    clearTimeout(spellTimer);
    const text = spellInput.value.trim();
    if (!text) { spellResult.hidden = true; setToolStatus(spellStatus, '', ''); return; }
    setToolStatus(spellStatus, 'Checking…', 'info');
    spellTimer = setTimeout(() => runSpellCheck(text), 700);
  });

  async function runSpellCheck(text) {
    try {
      const res = await fetch('https://api.languagetool.org/v2/check', {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    new URLSearchParams({ text, language: 'auto' }).toString()
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { matches = [] } = await res.json();
      let corrected = text;
      for (const m of [...matches].reverse()) {
        const rep = m.replacements?.[0]?.value;
        if (rep == null) continue;
        corrected = corrected.slice(0, m.offset) + rep + corrected.slice(m.offset + m.length);
      }
      spellResultText.textContent = corrected;
      spellResult.hidden = false;
      setToolStatus(spellStatus, matches.length === 0 ? 'No issues found.' : '', matches.length === 0 ? 'success' : '');
    } catch (err) {
      setToolStatus(spellStatus, 'Spell check failed: ' + err.message, 'error');
    }
  }

  spellCopyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(spellResultText.textContent).then(() => {
      spellCopyBtn.textContent = 'Copied!';
      setTimeout(() => { spellCopyBtn.textContent = 'Copy'; }, 1500);
    }).catch(() => {});
  });

  // ── Translate to English ────────────────────────────────────────────────────
  const translateInput      = document.getElementById('translateInput');
  const translateResult     = document.getElementById('translateResult');
  const translateResultText = document.getElementById('translateResultText');
  const translateCopyBtn    = document.getElementById('translateCopyBtn');
  const translateStatus     = document.getElementById('translateStatus');

  let translateTimer = null;
  translateInput.addEventListener('input', () => {
    clearTimeout(translateTimer);
    const text = translateInput.value.trim();
    if (!text) { translateResult.hidden = true; setToolStatus(translateStatus, '', ''); return; }
    setToolStatus(translateStatus, 'Translating…', 'info');
    translateTimer = setTimeout(() => runTranslate(text), 700);
  });

  async function runTranslate(text) {
    try {
      const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=' + encodeURIComponent(text);
      const res  = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const translated = data?.[0]?.map(s => s?.[0]).filter(Boolean).join('');
      if (!translated) throw new Error('No translation returned');
      translateResultText.textContent = translated;
      translateResult.hidden = false;
      setToolStatus(translateStatus, '', '');
    } catch (err) {
      setToolStatus(translateStatus, 'Translation failed: ' + err.message, 'error');
    }
  }

  translateCopyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(translateResultText.textContent).then(() => {
      translateCopyBtn.textContent = 'Copied!';
      setTimeout(() => { translateCopyBtn.textContent = 'Copy'; }, 1500);
    }).catch(() => {});
  });

  // ── Smart Box (spell + translate combined) ──────────────────────────────────
  const smartInput           = document.getElementById('smartInput');
  const smartSpellResult     = document.getElementById('smartSpellResult');
  const smartSpellText       = document.getElementById('smartSpellText');
  const smartSpellCopy       = document.getElementById('smartSpellCopy');
  const smartTranslateResult = document.getElementById('smartTranslateResult');
  const smartTranslateText   = document.getElementById('smartTranslateText');
  const smartTranslateCopy   = document.getElementById('smartTranslateCopy');
  const smartStatus          = document.getElementById('smartStatus');

  let smartTimer = null;
  smartInput.addEventListener('input', () => {
    clearTimeout(smartTimer);
    const text = smartInput.value.trim();
    if (!text) {
      smartSpellResult.hidden     = true;
      smartTranslateResult.hidden = true;
      setToolStatus(smartStatus, '', '');
      return;
    }
    setToolStatus(smartStatus, 'Working…', 'info');
    smartTimer = setTimeout(() => runSmartBox(text), 700);
  });

  async function runSmartBox(text) {
    smartSpellResult.hidden     = true;
    smartTranslateResult.hidden = true;

    // Steg 1: rätta stavning i originalspråket
    let corrected;
    try {
      corrected = await fetchSpellCorrection(text);
    } catch (err) {
      setToolStatus(smartStatus, 'Spell check failed: ' + err.message, 'error');
      return;
    }

    smartSpellText.textContent = corrected;
    smartSpellResult.hidden    = false;

    // Steg 2: detektera språk; översätt om ej engelska
    try {
      const { english, isEnglish } = await fetchSmartEnglish(corrected);
      const labelEl = smartTranslateResult.querySelector('.tool-result-label');
      if (labelEl) labelEl.textContent = isEnglish ? 'English' : 'Translated to English';
      smartTranslateText.textContent = english;
      smartTranslateResult.hidden    = false;
    } catch (err) {
      setToolStatus(smartStatus, 'Translation failed: ' + err.message, 'error');
      return;
    }

    setToolStatus(smartStatus, '', '');
  }

  // Shared fetch helpers
  async function fetchSpellCorrection(text) {
    const res = await fetch('https://api.languagetool.org/v2/check', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    new URLSearchParams({ text, language: 'auto' }).toString()
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { matches = [] } = await res.json();
    let corrected = text;
    for (const m of [...matches].reverse()) {
      const rep = m.replacements?.[0]?.value;
      if (rep == null) continue;
      corrected = corrected.slice(0, m.offset) + rep + corrected.slice(m.offset + m.length);
    }
    return corrected;
  }

  // Detekterar språk via Google Translate och returnerar engelska versionen.
  // Om texten redan är engelska returneras den oförändrad (ingen onödig översättning).
  async function fetchSmartEnglish(text) {
    const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q='
      + encodeURIComponent(text);
    const res  = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const detectedLang = data[2];
    const translated   = data?.[0]?.map(s => s?.[0]).filter(Boolean).join('');
    if (!translated) throw new Error('No result returned');
    const isEnglish = detectedLang === 'en';
    return { english: isEnglish ? text : translated, isEnglish };
  }

  setupCopyBtn(smartSpellCopy,     () => smartSpellText.textContent);
  setupCopyBtn(smartTranslateCopy, () => smartTranslateText.textContent);

  function setupCopyBtn(btn, getText) {
    btn.addEventListener('click', () => {
      navigator.clipboard.writeText(getText()).then(() => {
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
      }).catch(() => {});
    });
  }
}
