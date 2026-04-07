// components/dropzone/dropzone.js

import { setBadge, showStatus, clearStatus, formatBytes } from '../../sidepanel/tabs/utils.js';

export const template = `
<div class="drop-zone" id="dropZone">
  <div class="drop-glow"></div>
  <button class="btn-drop-send" id="sendBtn" title="Send to Discord">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <line x1="22" y1="2" x2="11" y2="13"/>
      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  </button>
  <div class="drop-zone-inner">
    <div class="drop-icon">
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="4" y="12" width="56" height="40" rx="6" stroke="currentColor" stroke-width="2" stroke-dasharray="6 4"/>
        <circle cx="22" cy="28" r="5" stroke="currentColor" stroke-width="2"/>
        <path d="M4 44 L18 30 L30 42 L42 28 L60 44" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M32 20 L32 8 M28 12 L32 8 L36 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
    <p class="drop-title">Drop anything here</p>
    <p class="drop-hint">Image, audio, URL or text &nbsp;&middot;&nbsp; <kbd>Ctrl+V</kbd> to paste</p>
    <p class="drop-limit">Files max 9.9 MB &mdash; Discord limit</p>
    <input type="file" id="fileInput" accept="image/*,audio/*" multiple hidden />
    <button class="btn-ghost" id="browseBtn">Browse image</button>
  </div>
</div>

<!-- Items queue (dynamically populated) -->
<div class="items-queue" id="itemsQueue" hidden></div>

<!-- Status feedback -->
<div class="status-bar" id="homeStatus"></div>`;

const MAX_FILE_BYTES = 9.9 * 1024 * 1024;

export function init() {
  let items   = [];
  let _nextId = 1;

  // ── Element refs ────────────────────────────────────────────────────────────
  const dropZone   = document.getElementById('dropZone');
  const fileInput  = document.getElementById('fileInput');
  const browseBtn  = document.getElementById('browseBtn');
  const itemsQueue = document.getElementById('itemsQueue');
  const sendBtn    = document.getElementById('sendBtn');
  const homeStatus = document.getElementById('homeStatus');

  // ── Compact mode ────────────────────────────────────────────────────────────
  function _setCompact(on) {
    dropZone.classList.toggle('drop-zone--compact', on);
  }

  // ── Item management ─────────────────────────────────────────────────────────
  function addItem(item) {
    item.id = _nextId++;
    items.push(item);
    itemsQueue.appendChild(_buildItemEl(item));
    itemsQueue.hidden = false;
    _setCompact(true);
    setBadge('ready');
    clearStatus(homeStatus);
  }

  function removeItem(id) {
    const idx = items.findIndex(x => x.id === id);
    if (idx === -1) return;
    const item = items[idx];
    if (item._blobUrl)  URL.revokeObjectURL(item._blobUrl);
    if (item._blobUrls) item._blobUrls.forEach(u => URL.revokeObjectURL(u));
    if (item._audioEl)  { item._audioEl.pause(); item._audioEl.src = ''; }
    items.splice(idx, 1);
    document.getElementById('qi-' + id)?.remove();
    if (items.length === 0) {
      itemsQueue.hidden = true;
      _setCompact(false);
      clearStatus(homeStatus);
      setBadge('');
    }
  }

  function clearQueue() {
    items.forEach(item => {
      if (item._blobUrl)  URL.revokeObjectURL(item._blobUrl);
      if (item._blobUrls) item._blobUrls.forEach(u => URL.revokeObjectURL(u));
      if (item._audioEl)  { item._audioEl.pause(); item._audioEl.src = ''; }
    });
    items = [];
    itemsQueue.innerHTML = '';
    itemsQueue.hidden = true;
    _setCompact(false);
    fileInput.value = '';
    clearStatus(homeStatus);
    setBadge('');
  }

  // ── Build item DOM ──────────────────────────────────────────────────────────
  function _buildItemEl(item) {
    const el = document.createElement('div');
    el.id = 'qi-' + item.id;
    el.className = 'preview-card queue-item';

    if (item.type === 'image') {
      const blobUrl = URL.createObjectURL(item.file);
      item._blobUrl = blobUrl;
      const img = document.createElement('img');
      img.src = blobUrl;
      el.appendChild(img);
      el.appendChild(_makeMeta(item.file.name, formatBytes(item.file.size)));
      el.appendChild(_makeRemoveBtn(item.id));

    } else if (item.type === 'images') {
      el.classList.add('preview-card--carousel');
      const blobUrls = item.files.map(f => URL.createObjectURL(f));
      item._blobUrls = blobUrls;
      let idx = 0;

      const wrap = document.createElement('div');
      wrap.className = 'preview-carousel';
      const img = document.createElement('img');
      img.src = blobUrls[0];
      wrap.appendChild(img);

      const prevBtn = _makeCarouselArrow('left');
      const nextBtn = _makeCarouselArrow('right');
      const dotsEl  = document.createElement('div');
      dotsEl.className = 'carousel-dots';

      const nameSp = document.createElement('span');
      nameSp.className = 'preview-name';
      const sizeSp = document.createElement('span');
      sizeSp.className = 'preview-size';

      function renderCarousel() {
        img.src = blobUrls[idx];
        const f = item.files[idx];
        nameSp.textContent = `${idx + 1} / ${item.files.length} — ${f.name}`;
        sizeSp.textContent = formatBytes(f.size);
        dotsEl.innerHTML = '';
        blobUrls.forEach((_, i) => {
          const dot = document.createElement('span');
          dot.className = 'carousel-dot' + (i === idx ? ' active' : '');
          dot.addEventListener('click', () => { idx = i; renderCarousel(); });
          dotsEl.appendChild(dot);
        });
      }

      if (blobUrls.length > 1) {
        prevBtn.addEventListener('click', () => { idx = (idx - 1 + blobUrls.length) % blobUrls.length; renderCarousel(); });
        nextBtn.addEventListener('click', () => { idx = (idx + 1) % blobUrls.length; renderCarousel(); });
        wrap.appendChild(prevBtn);
        wrap.appendChild(nextBtn);
        wrap.appendChild(dotsEl);
      }
      renderCarousel();
      el.appendChild(wrap);

      const footer = document.createElement('div');
      footer.className = 'preview-carousel-footer';
      const meta = document.createElement('div');
      meta.className = 'preview-meta';
      meta.appendChild(nameSp);
      meta.appendChild(sizeSp);
      footer.appendChild(meta);
      footer.appendChild(_makeRemoveBtn(item.id));
      el.appendChild(footer);

    } else if (item.type === 'audio-file' || item.type === 'audio-url') {
      el.classList.add('preview-card--audio');

      const iconEl = document.createElement('div');
      iconEl.className = 'preview-audio-icon';
      iconEl.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`;

      let name, size;
      if (item.type === 'audio-file') {
        name = item.file.name;
        size = formatBytes(item.file.size);
      } else {
        try { name = new URL(item.content).pathname.split('/').pop() || item.content; }
        catch { name = item.content.length > 50 ? item.content.slice(0, 47) + '…' : item.content; }
        size = 'URL';
      }

      el.appendChild(iconEl);
      el.appendChild(_makeMeta(name, size));
      el.appendChild(_makeRemoveBtn(item.id));

      const audio = document.createElement('audio');
      audio.preload = 'metadata';
      if (item.type === 'audio-file') {
        const blobUrl = URL.createObjectURL(item.file);
        item._blobUrl = blobUrl;
        audio.src = blobUrl;
      } else {
        audio.src = item.content;
      }
      item._audioEl = audio;

      const controls = document.createElement('div');
      controls.className = 'preview-audio-controls';

      const playBtn = document.createElement('button');
      playBtn.className = 'preview-play-btn';
      playBtn.title = 'Play / Pause';
      playBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;

      const seekWrap = document.createElement('div');
      seekWrap.className = 'preview-seek-wrap';
      const seek = document.createElement('input');
      seek.type = 'range'; seek.className = 'preview-seek';
      seek.min = 0; seek.max = 1000; seek.step = 1; seek.value = 0;
      seekWrap.appendChild(seek);

      const timeEl = document.createElement('span');
      timeEl.className = 'preview-time';
      timeEl.textContent = '0:00';

      controls.appendChild(playBtn);
      controls.appendChild(seekWrap);
      controls.appendChild(timeEl);
      el.appendChild(audio);
      el.appendChild(controls);

      _wireAudio(audio, playBtn, seek, timeEl);

    } else if (item.type === 'text') {
      el.classList.add('preview-card--text');

      const iconEl = document.createElement('div');
      iconEl.className = 'preview-text-icon';
      iconEl.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`;

      const meta = document.createElement('div');
      meta.className = 'preview-meta';
      const label = document.createElement('span');
      label.className = 'preview-text-label';
      label.textContent = 'Text / URL';
      const content = document.createElement('span');
      content.className = 'preview-text-content';
      content.textContent = item.content.length > 80 ? item.content.slice(0, 77) + '…' : item.content;
      meta.appendChild(label);
      meta.appendChild(content);

      el.appendChild(iconEl);
      el.appendChild(meta);
      el.appendChild(_makeRemoveBtn(item.id));
    }

    return el;
  }

  // ── DOM helpers ─────────────────────────────────────────────────────────────
  function _makeRemoveBtn(id) {
    const btn = document.createElement('button');
    btn.className = 'btn-remove';
    btn.title = 'Remove';
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    btn.addEventListener('click', () => removeItem(id));
    return btn;
  }

  function _makeMeta(name, size) {
    const meta = document.createElement('div');
    meta.className = 'preview-meta';
    const nameSp = document.createElement('span');
    nameSp.className = 'preview-name';
    nameSp.textContent = name;
    const sizeSp = document.createElement('span');
    sizeSp.className = 'preview-size';
    sizeSp.textContent = size;
    meta.appendChild(nameSp);
    meta.appendChild(sizeSp);
    return meta;
  }

  function _makeCarouselArrow(dir) {
    const btn = document.createElement('button');
    btn.className = `carousel-arrow carousel-arrow--${dir}`;
    btn.innerHTML = dir === 'left'
      ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>`
      : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 6 15 12 9 18"/></svg>`;
    return btn;
  }

  function _wireAudio(audio, playBtn, seek, timeEl) {
    function setPlayIcon(play) {
      playBtn.innerHTML = play
        ? `<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`
        : `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>`;
    }
    playBtn.addEventListener('click', async () => {
      if (audio.paused || audio.ended) await audio.play().catch(() => {});
      else audio.pause();
    });
    audio.addEventListener('play',  () => setPlayIcon(false));
    audio.addEventListener('pause', () => setPlayIcon(true));
    audio.addEventListener('ended', () => { setPlayIcon(true); seek.value = 0; timeEl.textContent = '0:00'; });
    audio.addEventListener('timeupdate', () => {
      const d = audio.duration;
      if (!d || !isFinite(d)) return;
      seek.value = Math.round((audio.currentTime / d) * 1000);
      timeEl.textContent = _fmtTime(audio.currentTime);
    });
    seek.addEventListener('input', () => {
      const d = audio.duration;
      if (!d || !isFinite(d)) return;
      audio.currentTime = (seek.value / 1000) * d;
    });
  }

  function _fmtTime(s) {
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
  }

  // ── File picker ─────────────────────────────────────────────────────────────
  browseBtn.addEventListener('click', (e) => { e.stopPropagation(); fileInput.click(); });
  dropZone.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', (e) => {
    const files = [...(e.target.files || [])];
    fileInput.value = '';
    if (files.length) _handleFiles(files);
  });

  // ── Drag & Drop ─────────────────────────────────────────────────────────────
  dropZone.addEventListener('dragenter', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragover',  (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', (e) => {
    if (!dropZone.contains(e.relatedTarget)) dropZone.classList.remove('drag-over');
  });
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const files = [...(e.dataTransfer.files || [])];
    if (files.length) { _handleFiles(files); return; }
    const url = (e.dataTransfer.getData('text/uri-list') || '').trim();
    if (url) { _handleText(url); return; }
    const text = (e.dataTransfer.getData('text/plain') || '').trim();
    if (text) _handleText(text);
  });

  // ── Paste ───────────────────────────────────────────────────────────────────
  document.addEventListener('paste', (e) => {
    const clipItems = e.clipboardData?.items;
    if (!clipItems) return;
    for (const ci of clipItems) {
      if (ci.type.startsWith('image/')) { const f = ci.getAsFile(); if (f) { _handleFiles([f]); return; } }
      if (ci.type.startsWith('audio/')) { const f = ci.getAsFile(); if (f) { _handleFiles([f]); return; } }
    }
    const text = (e.clipboardData.getData('text/plain') || '').trim();
    if (text) _handleText(text);
  });

  // ── Input handlers ──────────────────────────────────────────────────────────
  function _handleFiles(files) {
    const audioFiles = files.filter(_isAudioFile);
    const imgFiles   = files.filter(f => f.type.startsWith('image/'));

    audioFiles.forEach(f => {
      if (f.size > MAX_FILE_BYTES) { showStatus(homeStatus, `${f.name} too large — skipped.`, 'error'); return; }
      addItem({ type: 'audio-file', file: f });
    });

    if (imgFiles.length > 1) {
      const valid = imgFiles.filter(f => {
        if (f.size > MAX_FILE_BYTES) { showStatus(homeStatus, `${f.name} too large — skipped.`, 'error'); return false; }
        return true;
      });
      if (valid.length > 0) addItem({ type: 'images', files: valid });
    } else if (imgFiles.length === 1) {
      const f = imgFiles[0];
      if (f.size > MAX_FILE_BYTES) { showStatus(homeStatus, `${f.name} too large — max 9.9 MB.`, 'error'); return; }
      addItem({ type: 'image', file: f });
    }
  }

  function _handleText(text) {
    if (_isAudioUrl(text)) { addItem({ type: 'audio-url', content: text }); return; }
    addItem({ type: 'text', content: text });
  }

  // ── Type detection ──────────────────────────────────────────────────────────
  function _isAudioFile(file) {
    return file.type.startsWith('audio/') ||
      /\.(mp3|wav|ogg|flac|m4a|aac|opus|weba)$/i.test(file.name);
  }

  function _isAudioUrl(url) {
    try   { return /\.(mp3|wav|ogg|flac|m4a|aac|opus)$/i.test(new URL(url).pathname); }
    catch { return /\.(mp3|wav|ogg|flac|m4a|aac|opus)$/i.test(url); }
  }

  // ── Send to Discord ─────────────────────────────────────────────────────────
  sendBtn.addEventListener('click', async () => {
    if (!items.length) {
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
      const files = [];
      const texts = [];

      for (const item of items) {
        if (item.type === 'image' || item.type === 'audio-file') {
          files.push(item.file);
        } else if (item.type === 'images') {
          item.files.forEach(f => files.push(f));
        } else if (item.type === 'audio-url') {
          const fname = item.content.split('/').pop().split('?')[0] || 'audio.mp3';
          showStatus(homeStatus, `Fetching ${fname}…`, 'info');
          const r = await fetch(item.content);
          if (!r.ok) throw new Error(`HTTP ${r.status} fetching audio URL`);
          const blob = await r.blob();
          if (blob.size > MAX_FILE_BYTES)
            throw new Error(`Audio too large: ${(blob.size / 1024 / 1024).toFixed(1)} MB — max 9.9 MB`);
          files.push(new File([blob], fname, { type: blob.type || 'audio/mpeg' }));
        } else if (item.type === 'text') {
          texts.push(item.content);
        }
      }

      const content = texts.join('\n');
      let fetchOptions;
      if (files.length > 0) {
        const fd = new FormData();
        files.forEach((f, i) => fd.append(`files[${i}]`, f, f.name));
        if (content) fd.append('payload_json', JSON.stringify({ content }));
        fetchOptions = { method: 'POST', body: fd };
      } else {
        fetchOptions = {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ content })
        };
      }

      showStatus(homeStatus, 'Sending to Discord...', 'info');
      const response = await fetch(settings.webhookUrl, fetchOptions);
      if (!response.ok) {
        let detail = '';
        try { detail = await response.text(); } catch (_) {}
        throw new Error(`HTTP ${response.status} — ${detail.slice(0, 120)}`);
      }
      setBadge('sent');
      showStatus(homeStatus, 'Sent to Discord!', 'success');
      setTimeout(() => clearQueue(), 2200);
    } catch (err) {
      console.error('[RaccoonLagoon] Send failed:', err);
      setBadge('error');
      showStatus(homeStatus, 'Send failed: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      sendBtn.disabled = false;
    }
  });

  // ── Toggle visibility based on settings ────────────────────────────────────
  async function applyToolVisibility() {
    const s = await Storage.getAll();
    const dzOff = s.dropZoneEnabled === false;
    dropZone.hidden   = dzOff;
    sendBtn.hidden    = dzOff;
    homeStatus.hidden = dzOff;
    if (dzOff) { clearQueue(); }
    const spellCard     = document.getElementById('spellCard');
    const translateCard = document.getElementById('translateCard');
    const smartCard     = document.getElementById('smartCard');
    const recorderCard  = document.getElementById('recorderCard');
    if (spellCard)     spellCard.hidden     = s.spellCheckEnabled === false;
    if (translateCard) translateCard.hidden = s.translateEnabled  === false;
    if (smartCard)     smartCard.hidden     = s.smartBoxEnabled   === false;
    if (recorderCard)  recorderCard.hidden  = s.recorderEnabled   === false;
  }

  applyToolVisibility();

  chrome.storage.onChanged.addListener((changes) => {
    const watched = ['dropZoneEnabled', 'spellCheckEnabled', 'translateEnabled', 'smartBoxEnabled', 'recorderEnabled'];
    if (watched.some(k => k in changes)) applyToolVisibility();
  });
}
