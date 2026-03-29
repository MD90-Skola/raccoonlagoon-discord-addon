// tabs/home.js — Home tab: drop zone, file handling, send to Discord

import { setBadge, showStatus, clearStatus, formatBytes } from './utils.js';

const MAX_FILE_BYTES = 9.9 * 1024 * 1024;
let currentPayload  = null;

export function initHome() {
  const dropZone           = document.getElementById('dropZone');
  const fileInput          = document.getElementById('fileInput');
  const browseBtn          = document.getElementById('browseBtn');
  const previewArea        = document.getElementById('previewArea');
  const previewCardImage   = document.getElementById('previewCardImage');
  const previewImg         = document.getElementById('previewImg');
  const previewName        = document.getElementById('previewName');
  const previewSize        = document.getElementById('previewSize');
  const removeBtn          = document.getElementById('removeFileBtn');
  const previewCardText    = document.getElementById('previewCardText');
  const previewTextContent = document.getElementById('previewTextContent');
  const removeTextBtn      = document.getElementById('removeTextBtn');
  const sendBtn            = document.getElementById('sendBtn');
  const homeStatus         = document.getElementById('homeStatus');

  // ─── Filväljaren ────────────────────────────────────────────────────────
  browseBtn.addEventListener('click', (e) => { e.stopPropagation(); fileInput.click(); });
  dropZone.addEventListener('click',  ()  => fileInput.click());

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) loadImageFile(file);
    fileInput.value = '';
  });

  // ─── Drag & Drop ─────────────────────────────────────────────────────────
  dropZone.addEventListener('dragenter', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragover',  (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });

  dropZone.addEventListener('dragleave', (e) => {
    if (!dropZone.contains(e.relatedTarget)) dropZone.classList.remove('drag-over');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) { loadImageFile(file); return; }
    const url = e.dataTransfer.getData('text/uri-list');
    if (url?.trim()) { loadText(url.trim()); return; }
    const text = e.dataTransfer.getData('text/plain');
    if (text?.trim()) loadText(text.trim());
  });

  // ─── Ctrl+V ──────────────────────────────────────────────────────────────
  document.addEventListener('paste', (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) { loadImageFile(file); return; }
      }
    }
    const text = e.clipboardData.getData('text/plain');
    if (text?.trim()) loadText(text.trim());
  });

  // ─── Remove buttons ───────────────────────────────────────────────────────
  removeBtn.addEventListener('click',     () => clearPayload());
  removeTextBtn.addEventListener('click', () => clearPayload());

  // ─── Send to Discord ──────────────────────────────────────────────────────
  sendBtn.addEventListener('click', async () => {
    if (!currentPayload) {
      showStatus(homeStatus, 'Nothing to send — drop, paste or type something first.', 'error');
      return;
    }
    const settings = await Storage.getAll();
    if (!settings.webhookUrl) {
      showStatus(homeStatus, 'No webhook saved — go to Settings first.', 'error');
      return;
    }
    sendBtn.disabled = true;
    setBadge('sending');
    showStatus(homeStatus, 'Sending to Discord...', 'info');
    try {
      let fetchOptions;
      if (currentPayload.type === 'image') {
        const formData = new FormData();
        formData.append('files[0]', currentPayload.file, currentPayload.file.name);
        fetchOptions = { method: 'POST', body: formData };
      } else {
        fetchOptions = {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ content: currentPayload.content })
        };
      }
      const response = await fetch(settings.webhookUrl, fetchOptions);
      if (!response.ok) {
        let detail = '';
        try { detail = await response.text(); } catch (_) {}
        throw new Error(`HTTP ${response.status} — ${detail.slice(0, 120)}`);
      }
      setBadge('sent');
      showStatus(homeStatus, 'Sent to Discord!', 'success');
      setTimeout(() => clearPayload(), 2200);
    } catch (err) {
      console.error('[RaccoonLagoon] Send failed:', err);
      setBadge('error');
      showStatus(homeStatus, 'Send failed: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      sendBtn.disabled = false;
    }
  });

  // ─── Helpers ──────────────────────────────────────────────────────────────
  function loadImageFile(file) {
    if (!file.type.startsWith('image/')) {
      showStatus(homeStatus, 'Only image files are supported.', 'error');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      const mb = (file.size / (1024 * 1024)).toFixed(1);
      showStatus(homeStatus, `Too large: ${mb} MB — Discord allows max 9.9 MB.`, 'error');
      return;
    }
    currentPayload = { type: 'image', file };
    const reader = new FileReader();
    reader.onload = (ev) => {
      previewImg.src          = ev.target.result;
      previewName.textContent = file.name;
      previewSize.textContent = formatBytes(file.size);
      showPreview('image');
    };
    reader.readAsDataURL(file);
    setBadge('ready');
    clearStatus(homeStatus);
  }

  function loadText(content) {
    currentPayload = { type: 'text', content };
    previewTextContent.textContent = content.length > 80 ? content.slice(0, 77) + '…' : content;
    showPreview('text');
    setBadge('ready');
    clearStatus(homeStatus);
  }

  function showPreview(type) {
    previewArea.hidden        = false;
    dropZone.style.display    = 'none';
    previewCardImage.hidden   = (type !== 'image');
    previewCardText.hidden    = (type !== 'text');
  }

  function clearPayload() {
    currentPayload                 = null;
    previewImg.src                 = '';
    previewName.textContent        = '';
    previewSize.textContent        = '';
    previewTextContent.textContent = '';
    previewArea.hidden             = true;
    previewCardImage.hidden        = true;
    previewCardText.hidden         = true;
    dropZone.style.display         = '';
    fileInput.value                = '';
    clearStatus(homeStatus);
    setBadge('');
  }

  // ─── Spell Check ────────────────────────────────────────────────────────────
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

  // ─── Translate to English ────────────────────────────────────────────────────
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

  // ─── Tool status helper ───────────────────────────────────────────────────
  function setToolStatus(el, msg, type) {
    el.textContent = msg;
    el.className   = 'tool-status' + (type ? ' ' + type : '');
  }

  // ─── Smart Box (spell + translate combined) ──────────────────────────────
  const smartInput          = document.getElementById('smartInput');
  const smartSpellResult    = document.getElementById('smartSpellResult');
  const smartSpellText      = document.getElementById('smartSpellText');
  const smartSpellCopy      = document.getElementById('smartSpellCopy');
  const smartTranslateResult = document.getElementById('smartTranslateResult');
  const smartTranslateText  = document.getElementById('smartTranslateText');
  const smartTranslateCopy  = document.getElementById('smartTranslateCopy');
  const smartStatus         = document.getElementById('smartStatus');

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
    const [spellRes, transRes] = await Promise.allSettled([
      fetchSpellCorrection(text),
      fetchTranslation(text)
    ]);

    if (spellRes.status === 'fulfilled') {
      smartSpellText.textContent  = spellRes.value;
      smartSpellResult.hidden     = false;
    }
    if (transRes.status === 'fulfilled') {
      smartTranslateText.textContent = transRes.value;
      smartTranslateResult.hidden    = false;
    }
    setToolStatus(smartStatus, '', '');
  }

  // Shared fetch helpers (used by both standalone cards and smart box)
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

  async function fetchTranslation(text) {
    const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=' + encodeURIComponent(text);
    const res  = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const translated = data?.[0]?.map(s => s?.[0]).filter(Boolean).join('');
    if (!translated) throw new Error('No translation returned');
    return translated;
  }

  setupCopyBtn(smartSpellCopy,      () => smartSpellText.textContent);
  setupCopyBtn(smartTranslateCopy,  () => smartTranslateText.textContent);

  function setupCopyBtn(btn, getText) {
    btn.addEventListener('click', () => {
      navigator.clipboard.writeText(getText()).then(() => {
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
      }).catch(() => {});
    });
  }

  // ─── Toggle visibility based on settings ─────────────────────────────────
  const spellCard     = document.getElementById('spellCard');
  const translateCard = document.getElementById('translateCard');
  const smartCard     = document.getElementById('smartCard');
  const recorderCard  = document.getElementById('recorderCard');

  async function applyToolVisibility() {
    const s = await Storage.getAll();
    const dzOff = s.dropZoneEnabled === false;
    dropZone.hidden   = dzOff;
    sendBtn.hidden    = dzOff;
    homeStatus.hidden = dzOff;
    if (dzOff) { previewArea.hidden = true; currentPayload = null; }
    spellCard.hidden     = s.spellCheckEnabled === false;
    translateCard.hidden = s.translateEnabled  === false;
    smartCard.hidden     = s.smartBoxEnabled   === false;
    recorderCard.hidden  = s.recorderEnabled   === false;
  }

  applyToolVisibility();

  chrome.storage.onChanged.addListener((changes) => {
    const watched = ['dropZoneEnabled', 'spellCheckEnabled', 'translateEnabled', 'smartBoxEnabled', 'recorderEnabled'];
    if (watched.some(k => k in changes)) applyToolVisibility();
  });
}
