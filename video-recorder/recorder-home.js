// video-recorder/recorder-home.js — Home tab record card UI

import { startRecording, prepareRecording, beginRecording, cancelPrepared, stopRecording, resetRecorder } from './recorder.js';
import { getRecorderSettings }                                        from './recorder-tab.js';
import { showStatus, clearStatus, formatBytes }                       from '../sidepanel/tabs/utils.js';

const DISCORD_MAX_BYTES = 10 * 1024 * 1024;

export function initRecorderHome() {
  const recIdle           = document.getElementById('recIdle');
  const recCountdown      = document.getElementById('recCountdown');
  const recLive           = document.getElementById('recLive');
  const recPreview        = document.getElementById('recPreview');
  const recStartBtn       = document.getElementById('recStartBtn');
  const recDelayBtn       = document.getElementById('recDelayBtn');
  const recCancelDelayBtn = document.getElementById('recCancelDelayBtn');
  const recCountdownNum   = document.getElementById('recCountdownNum');
  const recStopBtn        = document.getElementById('recStopBtn');
  const recDownloadBtn    = document.getElementById('recDownloadBtn');
  const recSendBtn        = document.getElementById('recSendBtn');
  const recDiscardBtn     = document.getElementById('recDiscardBtn');
  const recTimer          = document.getElementById('recTimer');
  const recLiveSize       = document.getElementById('recLiveSize');
  const recFileName       = document.getElementById('recFileName');
  const recFileSize       = document.getElementById('recFileSize');
  const recStatus         = document.getElementById('recStatus');
  const recFormatBtn      = document.getElementById('recFormatBtn');
  const recFormatDropdown = document.getElementById('recFormatDropdown');

  // ── Video player ───────────────────────────────────────────────────────────
  const recVideo      = document.getElementById('recVideo');
  const recPlayBtn    = document.getElementById('recPlayBtn');
  const recPlayIcon   = document.getElementById('recPlayIcon');
  const recPauseIcon  = document.getElementById('recPauseIcon');
  const recLoopBtn    = document.getElementById('recLoopBtn');
  const recVolWrap    = document.getElementById('recVolWrap');
  const recVolSlider  = document.getElementById('recVolSlider');
  const recMuteBtn    = document.getElementById('recMuteBtn');
  const recSoundIcon  = document.getElementById('recSoundIcon');
  const recMuteIcon   = document.getElementById('recMuteIcon');
  const recTrimTrack  = document.getElementById('recTrimTrack');
  const recPlayhead   = document.getElementById('recPlayhead');
  const recTrimA      = document.getElementById('recTrimA');
  const recTrimB      = document.getElementById('recTrimB');
  const recTrimALabel = document.getElementById('recTrimALabel');
  const recTrimBLabel = document.getElementById('recTrimBLabel');
  const recVideoTime  = document.getElementById('recVideoTime');

  // ── Processing progress bar ────────────────────────────────────────────────
  const recProcessWrap = document.getElementById('recProcessWrap');
  const recProcessBar  = document.getElementById('recProcessBar');

  // ── Crop elements ──────────────────────────────────────────────────────────
  const recCropMaskT  = document.getElementById('recCropMaskT');
  const recCropMaskB  = document.getElementById('recCropMaskB');
  const recCropMaskL  = document.getElementById('recCropMaskL');
  const recCropMaskR  = document.getElementById('recCropMaskR');
  const recCropBorder = document.getElementById('recCropBorder');

  // ── Video area (zoom target) ───────────────────────────────────────────────
  const recVideoArea = recVideo.parentElement;

  // ── State ──────────────────────────────────────────────────────────────────
  let currentBlob    = null;
  let currentFormat  = 'webm';
  const selectedSource = 'pick';
  let countdownTimer = null;
  let videoBlobUrl   = null;
  let isScrubbing    = false;
  let isProcessing   = false;
  let knownDuration  = 0;   // elapsed seconds from recorder (reliable fallback)
  let loopEnabled = false;
  let trimA = 0;  let trimB = 1;   // 0–1 fractions
  let cropL = 0;  let cropR = 1;   // horizontal: left / right
  let cropT = 0;  let cropB = 1;   // vertical:   top  / bottom
  let previewZoom    = 1;          // scroll-zoom på preview-videon
  let panX = 0; let panY = 0;      // panning offset i px (mouse3)
  let isPanning      = false;
  let panStart       = null;       // { ox, oy } – clientX/Y minus pan vid drag-start
  let cropDragState  = null;       // 'draw' | 'move' | 'resize'
  let cropDragHandle = null;       // 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'
  let cropDragStart  = null;       // { x, y } fractions vid drag-start

  // WebM files from MediaRecorder often have duration = Infinity.
  // Use seekable range or elapsed time as fallback.
  function _getVideoDuration() {
    const d = recVideo.duration;
    if (isFinite(d) && d > 0) return d;
    // Seekable range is populated by Chrome even when duration = Infinity
    if (recVideo.seekable && recVideo.seekable.length > 0) {
      const se = recVideo.seekable.end(0);
      if (isFinite(se) && se > 0) return se;
    }
    return knownDuration;
  }

  function _hasDuration() {
    return _getVideoDuration() > 0;
  }

  // ── Format dropdown ────────────────────────────────────────────────────────
  // Ladda sparat format och markera rätt knapp
  Storage.getAll().then(s => {
    const saved = s.recorderFormat ?? 'webm';
    _setActiveFormat(saved);
  });

  recFormatBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = recFormatDropdown.classList.toggle('open');
    recFormatBtn.classList.toggle('open', open);
  });

  recFormatDropdown.querySelectorAll('.rec-fmt-opt').forEach(btn => {
    btn.addEventListener('click', async () => {
      const fmt = btn.dataset.fmt;
      _setActiveFormat(fmt);
      await Storage.set({ recorderFormat: fmt });
      recFormatDropdown.classList.remove('open');
      recFormatBtn.classList.remove('open');
    });
  });

  document.addEventListener('click', () => {
    recFormatDropdown.classList.remove('open');
    recFormatBtn.classList.remove('open');
  });

  function _setActiveFormat(fmt) {
    recFormatDropdown.querySelectorAll('.rec-fmt-opt').forEach(b => {
      b.classList.toggle('active', b.dataset.fmt === fmt);
    });
  }

  // ── Start (immediate) ──────────────────────────────────────────────────────
  recStartBtn.addEventListener('click', () => _launch());

  // ── Start with 5-second delay ──────────────────────────────────────────────
  recDelayBtn.addEventListener('click', async () => {
    clearStatus(recStatus);
    const settings = await getRecorderSettings();
    currentFormat = settings.format;

    if (currentFormat === 'gif') {
      showStatus(recStatus, 'GIF is coming soon — switch to WebM or MP4 in Settings.', 'error');
      return;
    }

    recStartBtn.disabled = true;
    recDelayBtn.disabled = true;
    try {
      await prepareRecording({
        source: selectedSource, format: settings.format,
        audioMode: settings.audioMode, sizeLimitMb: settings.sizeLimitMb,
        onTick: ({ elapsed, bytes }) => {
          recTimer.textContent    = _formatTime(elapsed);
          recLiveSize.textContent = formatBytes(bytes);
        },
        onStop: _onStop
      });
    } catch (err) {
      recStartBtn.disabled = false;
      recDelayBtn.disabled = false;
      if (err.name !== 'NotAllowedError')
        showStatus(recStatus, 'Could not start: ' + err.message, 'error');
      return;
    }

    _showState('countdown');
    let count = 5;
    recCountdownNum.textContent = count;
    countdownTimer = setInterval(() => {
      count--;
      recCountdownNum.textContent = count;
      if (count <= 0) {
        clearInterval(countdownTimer);
        countdownTimer = null;
        beginRecording();
        _showState('live');
      }
    }, 1000);
  });

  // ── Cancel countdown ───────────────────────────────────────────────────────
  recCancelDelayBtn.addEventListener('click', () => {
    clearInterval(countdownTimer);
    countdownTimer = null;
    cancelPrepared();
    recStartBtn.disabled = false;
    recDelayBtn.disabled = false;
    _showState('idle');
  });

  // ── Stop ───────────────────────────────────────────────────────────────────
  recStopBtn.addEventListener('click', () => stopRecording());

  // ── Download ───────────────────────────────────────────────────────────────
  recDownloadBtn.addEventListener('click', async () => {
    if (!currentBlob || isProcessing) return;
    const blob = await _getActiveBlob();
    if (!blob) return;
    const ext = currentFormat === 'mp4' ? 'mp4' : 'webm';
    const url = URL.createObjectURL(blob);
    Object.assign(document.createElement('a'), {
      href: url, download: `raccoon-clip-${Date.now()}.${ext}`
    }).click();
    URL.revokeObjectURL(url);
  });

  // ── Send to Discord ────────────────────────────────────────────────────────
  recSendBtn.addEventListener('click', async () => {
    if (!currentBlob || isProcessing) return;
    const blob = await _getActiveBlob();
    if (!blob) return;
    const settings = await Storage.getAll();
    if (!settings.webhookUrl) {
      showStatus(recStatus, 'No webhook saved — go to Settings first.', 'error');
      return;
    }
    recSendBtn.disabled     = true;
    recDownloadBtn.disabled = true;
    showStatus(recStatus, 'Sending to Discord...', 'info');
    try {
      const ext = currentFormat === 'mp4' ? 'mp4' : 'webm';
      const fd  = new FormData();
      fd.append('files[0]', blob, `raccoon-clip-${Date.now()}.${ext}`);
      const res = await fetch(settings.webhookUrl, { method: 'POST', body: fd });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showStatus(recStatus, 'Sent to Discord!', 'success');
      setTimeout(() => _discard(), 2500);
    } catch (err) {
      showStatus(recStatus, 'Failed: ' + err.message, 'error');
      recSendBtn.disabled     = false;
      recDownloadBtn.disabled = false;
    }
  });

  // ── Discard ────────────────────────────────────────────────────────────────
  recDiscardBtn.addEventListener('click', _discard);

  // ── Video events ───────────────────────────────────────────────────────────
  recVideo.addEventListener('loadedmetadata', () => {
    const dur = _getVideoDuration();
    recTrimBLabel.textContent = _vidTime(dur);
    recVideoTime.textContent  = `0:00 / ${_vidTime(dur)}`;
    _updateCropOverlay(); // re-compute now element has real dimensions
  });

  recVideo.addEventListener('timeupdate', () => {
    if (isScrubbing || isProcessing) return;
    const dur = _getVideoDuration();
    if (dur <= 0) return;
    const frac = recVideo.currentTime / dur;
    _updatePlayhead(frac);
    recVideoTime.textContent = `${_vidTime(recVideo.currentTime)} / ${_vidTime(dur)}`;
    if (frac >= trimB && !recVideo.paused) {
      recVideo.currentTime = trimA * dur;
      if (!loopEnabled) recVideo.pause();
    }
  });

  recVideo.addEventListener('play',  () => {
    recPlayIcon.style.display = 'none'; recPauseIcon.style.display = '';
    recTrimTrack.parentElement.classList.add('playing');
  });
  recVideo.addEventListener('pause', () => {
    recPlayIcon.style.display = ''; recPauseIcon.style.display = 'none';
    recTrimTrack.parentElement.classList.remove('playing');
  });
  recVideo.addEventListener('ended', () => {
    recPlayIcon.style.display = ''; recPauseIcon.style.display = 'none';
    recTrimTrack.parentElement.classList.remove('playing');
    if (loopEnabled) {
      const dur = _getVideoDuration();
      recVideo.currentTime = trimA * dur;
      recVideo.play().catch(() => {});
    }
  });

  // ── Play / Pause ───────────────────────────────────────────────────────────
  recPlayBtn.addEventListener('click', () => {
    if (recVideo.paused || recVideo.ended) {
      const dur = _getVideoDuration();
      if (dur > 0 && recVideo.currentTime / dur >= trimB)
        recVideo.currentTime = trimA * dur;
      recVideo.play();
    } else {
      recVideo.pause();
    }
  });

  // ── Loop ───────────────────────────────────────────────────────────────────
  recLoopBtn.addEventListener('click', () => {
    loopEnabled = !loopEnabled;
    recLoopBtn.classList.toggle('loop-active', loopEnabled);
  });

  // ── Trim handle A ──────────────────────────────────────────────────────────
  recTrimA.addEventListener('mousedown',  () => { isScrubbing = true; });
  recTrimA.addEventListener('touchstart', () => { isScrubbing = true; }, { passive: true });
  recTrimA.addEventListener('input', () => {
    trimA = Math.min(recTrimA.value / 1000, trimB - 0.005);
    recTrimA.value = Math.round(trimA * 1000);
    _updateTrimBar();
    const dur = _getVideoDuration();
    if (dur > 0) {
      recVideo.currentTime      = trimA * dur;
      recTrimALabel.textContent = _vidTime(trimA * dur);
    }
    recTrimA.style.zIndex = trimA > 0.5 ? 5 : 4;
    recTrimB.style.zIndex = trimA > 0.5 ? 4 : 5;
  });

  // ── Trim handle B ──────────────────────────────────────────────────────────
  recTrimB.addEventListener('mousedown',  () => { isScrubbing = true; });
  recTrimB.addEventListener('touchstart', () => { isScrubbing = true; }, { passive: true });
  recTrimB.addEventListener('input', () => {
    trimB = Math.max(recTrimB.value / 1000, trimA + 0.005);
    recTrimB.value = Math.round(trimB * 1000);
    _updateTrimBar();
    const dur = _getVideoDuration();
    if (dur > 0) {
      recVideo.currentTime      = trimB * dur;
      recTrimBLabel.textContent = _vidTime(trimB * dur);
    }
  });

  // ── Click on trim track to seek ────────────────────────────────────────────
  recTrimTrack.addEventListener('click', (e) => {
    const dur = _getVideoDuration();
    if (dur <= 0) return;
    const rect = recTrimTrack.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    recVideo.currentTime = Math.max(trimA, Math.min(trimB, frac)) * dur;
  });

  // ── Volume popup hover (JS-styrd för att undvika gap-problem) ────────────
  let volHideTimer = null;
  recVolWrap.addEventListener('mouseenter', () => {
    clearTimeout(volHideTimer);
    recVolWrap.classList.add('vol-open');
  });
  recVolWrap.addEventListener('mouseleave', () => {
    volHideTimer = setTimeout(() => recVolWrap.classList.remove('vol-open'), 120);
  });

  // ── Volume slider ──────────────────────────────────────────────────────────
  recVolSlider.addEventListener('input', () => {
    const vol = recVolSlider.value / 100;
    recVideo.volume = vol;
    recVideo.muted  = vol === 0;
    _syncVolIcons();
  });

  // ── Mute ──────────────────────────────────────────────────────────────────
  recMuteBtn.addEventListener('click', () => {
    recVideo.muted = !recVideo.muted;
    if (!recVideo.muted && recVideo.volume === 0) recVideo.volume = 0.5;
    _syncVolIcons();
  });

  function _syncVolIcons() {
    const muted = recVideo.muted || recVideo.volume === 0;
    recMuteBtn.classList.toggle('is-muted', muted);
    if (!recVideo.muted) recVolSlider.value = Math.round(recVideo.volume * 100);
  }

  // ── Zoom / pan helpers ─────────────────────────────────────────────────────
  function _applyTransform() {
    if (previewZoom <= 1 && panX === 0 && panY === 0) {
      recVideoArea.style.transform = '';
    } else {
      recVideoArea.style.transform =
        `translate(${panX.toFixed(1)}px,${panY.toFixed(1)}px) scale(${previewZoom.toFixed(2)})`;
    }
  }

  function _clampPan() {
    const maxX = recVideoArea.clientWidth  * (previewZoom - 1) / 2;
    const maxY = recVideoArea.clientHeight * (previewZoom - 1) / 2;
    panX = Math.max(-maxX, Math.min(maxX, panX));
    panY = Math.max(-maxY, Math.min(maxY, panY));
  }

  // ── Preview scroll-zoom ────────────────────────────────────────────────────
  recVideoArea.addEventListener('wheel', (e) => {
    if (recPreview.hidden) return;
    e.preventDefault();
    const dir = e.deltaY < 0 ? 1 : -1;
    previewZoom = Math.max(1, Math.min(4, previewZoom + dir * 0.15));
    if (previewZoom <= 1) { panX = 0; panY = 0; }
    _clampPan();
    _applyTransform();
  }, { passive: false });

  // Dubbelklick återställer zoom + pan
  recVideoArea.addEventListener('dblclick', () => {
    previewZoom = 1; panX = 0; panY = 0;
    recVideoArea.style.transform = '';
  });

  // ── Interaktiv drag-crop på video-arean ───────────────────────────────────

  // Beräkna video-innehållets rect inuti elementet (object-fit: contain kan ha letterbox)
  function _getVideoContentRect() {
    const ew = recVideo.clientWidth;
    const eh = recVideo.clientHeight;
    const vw = recVideo.videoWidth  || ew;
    const vh = recVideo.videoHeight || eh;
    const scale = Math.min(ew / vw, eh / vh);
    const cw = vw * scale;
    const ch = vh * scale;
    return { ox: (ew - cw) / 2, oy: (eh - ch) / 2, cw, ch, ew, eh };
  }

  // Konvertera mouse-event till fractions (0–1) i video-innehållets koordinatrymnd.
  // Kompenserar för zoom — getBoundingClientRect() returnerar den skalade ramen,
  // så vi räknar bakåt till element-space via (mousePos - center) / zoom.
  function _eventToFrac(e) {
    const areaRect = recVideoArea.getBoundingClientRect();
    const ew = recVideoArea.clientWidth;
    const eh = recVideoArea.clientHeight;
    const centerX = areaRect.left + areaRect.width  / 2;
    const centerY = areaRect.top  + areaRect.height / 2;
    const mx = ew / 2 + (e.clientX - centerX) / previewZoom;
    const my = eh / 2 + (e.clientY - centerY) / previewZoom;
    const { ox, oy, cw, ch } = _getVideoContentRect();
    return {
      x: Math.max(0, Math.min(1, (mx - ox) / cw)),
      y: Math.max(0, Math.min(1, (my - oy) / ch))
    };
  }

  // Förhindra webbläsarens auto-scroll-cursor vid middle-click
  recVideoArea.addEventListener('mousedown', (e) => {
    if (e.button === 1 && !recPreview.hidden) {
      e.preventDefault();
      isPanning = true;
      panStart  = { ox: e.clientX - panX, oy: e.clientY - panY };
      return;
    }
    if (e.button !== 0 || recPreview.hidden) return;

    const handleEl = e.target.closest('[data-handle]');
    if (handleEl) {
      // Resize via handtag
      e.stopPropagation();
      cropDragHandle = handleEl.dataset.handle;
      cropDragState  = 'resize';
      cropDragStart  = _eventToFrac(e);
      return;
    }

    if (e.target === recCropBorder) {
      // Flytta hela rektangeln
      cropDragState = 'move';
      cropDragStart = _eventToFrac(e);
      return;
    }

    // Rita ny selection
    const f = _eventToFrac(e);
    cropL = f.x; cropR = f.x;
    cropT = f.y; cropB = f.y;
    cropDragState = 'draw';
    cropDragStart = f;
    _updateCropOverlay();
  });

  document.addEventListener('mousemove', (e) => {
    if (isPanning) {
      panX = e.clientX - panStart.ox;
      panY = e.clientY - panStart.oy;
      _clampPan();
      _applyTransform();
      return;
    }
    if (!cropDragState) return;
    const f = _eventToFrac(e);

    if (cropDragState === 'draw') {
      cropL = Math.min(cropDragStart.x, f.x);
      cropR = Math.max(cropDragStart.x, f.x);
      cropT = Math.min(cropDragStart.y, f.y);
      cropB = Math.max(cropDragStart.y, f.y);

    } else if (cropDragState === 'move') {
      const dx = f.x - cropDragStart.x;
      const dy = f.y - cropDragStart.y;
      const w  = cropR - cropL;
      const h  = cropB - cropT;
      cropL = Math.max(0, Math.min(1 - w, cropL + dx));
      cropR = cropL + w;
      cropT = Math.max(0, Math.min(1 - h, cropT + dy));
      cropB = cropT + h;
      cropDragStart = f;

    } else if (cropDragState === 'resize') {
      const h = cropDragHandle;
      if (h.includes('w')) cropL = Math.max(0,        Math.min(cropR - 0.02, f.x));
      if (h.includes('e')) cropR = Math.min(1,        Math.max(cropL + 0.02, f.x));
      if (h.includes('n')) cropT = Math.max(0,        Math.min(cropB - 0.02, f.y));
      if (h.includes('s')) cropB = Math.min(1,        Math.max(cropT + 0.02, f.y));
    }

    _updateCropOverlay();
  });

  document.addEventListener('mouseup', (e) => {
    if (e.button === 1) { isPanning = false; panStart = null; return; }
    if (!cropDragState) return;
    // Om ritad rektangel är för liten: återställ
    if (cropDragState === 'draw' && (cropR - cropL < 0.02 || cropB - cropT < 0.02)) {
      _resetCrop();
    }
    cropDragState  = null;
    cropDragHandle = null;
    cropDragStart  = null;
  });

  // Dubbelklick på video-arean återställer crop
  recVideoArea.addEventListener('dblclick', (e) => {
    if (e.target === recCropBorder || recCropBorder.contains(e.target)) return;
    _resetCrop();
  });

  document.addEventListener('mouseup',  () => { isScrubbing = false; });
  document.addEventListener('touchend', () => { isScrubbing = false; });

  // ── Shared launch ──────────────────────────────────────────────────────────
  async function _launch() {
    clearStatus(recStatus);
    const settings = await getRecorderSettings();
    currentFormat = settings.format;

    if (currentFormat === 'gif') {
      showStatus(recStatus, 'GIF is coming soon — switch to WebM or MP4 in Settings.', 'error');
      _showState('idle');
      return;
    }

    try {
      recStartBtn.disabled = true;
      recDelayBtn.disabled = true;
      await startRecording({
        source: selectedSource, format: settings.format,
        audioMode: settings.audioMode, sizeLimitMb: settings.sizeLimitMb,
        onTick: ({ elapsed, bytes }) => {
          recTimer.textContent    = _formatTime(elapsed);
          recLiveSize.textContent = formatBytes(bytes);
        },
        onStop: _onStop
      });
      _showState('live');
    } catch (err) {
      recStartBtn.disabled = false;
      recDelayBtn.disabled = false;
      if (err.name !== 'NotAllowedError')
        showStatus(recStatus, 'Could not start: ' + err.message, 'error');
      _showState('idle');
    }
  }

  // ── Recording stopped ──────────────────────────────────────────────────────
  function _onStop({ blob, format, bytes, elapsed }) {
    currentBlob   = blob;
    currentFormat = format;
    knownDuration = elapsed || 0;

    if (videoBlobUrl) URL.revokeObjectURL(videoBlobUrl);
    videoBlobUrl = URL.createObjectURL(blob);
    recVideo.src         = videoBlobUrl;
    recVideo.currentTime = 0;
    recVideo.muted       = false;
    recVolSlider.value   = 100;
    _syncVolIcons();

    _resetTrim();
    _resetCrop();
    previewZoom = 1; panX = 0; panY = 0;
    recVideoArea.style.transform = '';

    recPlayIcon.hidden  = false;
    recPauseIcon.hidden = true;
    recSoundIcon.hidden = false;
    recMuteIcon.hidden  = true;
    recVideoTime.textContent = '0:00 / 0:00';

    const ext = format === 'mp4' ? 'mp4' : 'webm';
    recFileName.textContent = `raccoon-clip-${Date.now()}.${ext}`;
    recFileSize.textContent = formatBytes(bytes);

    recSendBtn.disabled = bytes > DISCORD_MAX_BYTES;
    if (bytes > DISCORD_MAX_BYTES)
      showStatus(recStatus, `${formatBytes(bytes)} — too large for Discord free. Download only.`, 'error');
    else
      clearStatus(recStatus);

    _showState('preview');
  }

  // ── Get active blob (original or processed) ────────────────────────────────
  async function _getActiveBlob() {
    const needsTrim = trimA > 0 || trimB < 1;
    const needsCrop = cropL > 0.001 || cropR < 0.999 || cropT > 0.001 || cropB < 0.999;
    const needsMute = recVideo.muted;
    if (!needsTrim && !needsCrop && !needsMute) return currentBlob;

    // Ensure duration is available — for WebM blobs, seekable range may need
    // a brief moment to populate even after loadedmetadata fires.
    if (!_hasDuration()) {
      await new Promise(r => setTimeout(r, 200));
      if (!_hasDuration()) {
        showStatus(recStatus, 'Video not ready — try again.', 'error');
        return null;
      }
    }

    isProcessing = true;
    recDownloadBtn.disabled = true;
    recSendBtn.disabled     = true;
    recPlayBtn.disabled     = true;
    recProcessWrap.hidden   = false;
    recProcessBar.style.width = '0%';

    const dur = (trimB - trimA) * _getVideoDuration();
    showStatus(recStatus, `Processing ${_vidTime(dur)}…`, 'info');

    try {
      return await _processBlob(needsCrop, (frac) => {
        recProcessBar.style.width = (frac * 100).toFixed(1) + '%';
        showStatus(recStatus, `Processing… ${Math.round(frac * 100)}%`, 'info');
      });
    } catch (err) {
      showStatus(recStatus, 'Processing failed: ' + err.message, 'error');
      return null;
    } finally {
      isProcessing = false;
      recPlayBtn.disabled       = false;
      recDownloadBtn.disabled   = false;
      recProcessWrap.hidden     = true;
      recProcessBar.style.width = '0%';
    }
  }

  // ── Process blob: trim + optional crop via captureStream / canvas ──────────
  function _processBlob(needsCrop, onProgress) {
    return new Promise((resolve, reject) => {
      const vidDur    = _getVideoDuration();
      const startTime = trimA * vidDur;
      const endTime   = trimB * vidDur;
      const wasMuted  = recVideo.muted;
      recVideo.muted  = false;

      let stream, rafId, canvas;

      // Track progress via timeupdate
      function _onTimeUpdate() {
        const frac = (recVideo.currentTime - startTime) / (endTime - startTime);
        onProgress?.(Math.max(0, Math.min(1, frac)));
      }
      recVideo.addEventListener('timeupdate', _onTimeUpdate);

      if (needsCrop) {
        // Canvas captures cropped frames; audio comes from captureStream
        const vw = recVideo.videoWidth  || recVideo.clientWidth;
        const vh = recVideo.videoHeight || recVideo.clientHeight;
        const sx = Math.round(cropL * vw);
        const sy = Math.round(cropT * vh);
        const sw = Math.max(1, Math.round((cropR - cropL) * vw));
        const sh = Math.max(1, Math.round((cropB - cropT) * vh));

        canvas = document.createElement('canvas');
        canvas.width  = sw;
        canvas.height = sh;
        const ctx = canvas.getContext('2d');

        const audioStream = recVideo.captureStream();
        stream = canvas.captureStream(30);
        if (!wasMuted) audioStream.getAudioTracks().forEach(t => stream.addTrack(t));

        function drawLoop() {
          if (!recVideo.paused && !recVideo.ended) {
            ctx.drawImage(recVideo, sx, sy, sw, sh, 0, 0, sw, sh);
            rafId = requestAnimationFrame(drawLoop);
          }
        }
        // Start drawing once play begins
        recVideo.addEventListener('play', () => {
          drawLoop();
        }, { once: true });

      } else {
        // No crop — captureStream captures video + audio as-is
        stream = recVideo.captureStream();
        if (wasMuted) stream.getAudioTracks().forEach(t => stream.removeTrack(t));
      }

      const chunks   = [];
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus' : 'video/webm';
      const mr = new MediaRecorder(stream, { mimeType });

      mr.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      mr.onstop = () => {
        recVideo.removeEventListener('timeupdate', _onTimeUpdate);
        cancelAnimationFrame(rafId);
        recVideo.muted = wasMuted;
        const blob = new Blob(chunks, { type: mimeType });
        recFileSize.textContent = formatBytes(blob.size);
        if (blob.size > DISCORD_MAX_BYTES) {
          showStatus(recStatus, `${formatBytes(blob.size)} — too large for Discord free. Download only.`, 'error');
          recSendBtn.disabled = true;
        } else {
          clearStatus(recStatus);
          recSendBtn.disabled = false;
        }
        resolve(blob);
      };

      recVideo.currentTime = startTime;

      recVideo.addEventListener('seeked', () => {
        mr.start(200);
        recVideo.play().catch(reject);

        const check = setInterval(() => {
          if (recVideo.currentTime >= endTime - 0.08) {
            clearInterval(check);
            cancelAnimationFrame(rafId);
            recVideo.pause();
            mr.stop();
          }
        }, 80);
      }, { once: true });

      recVideo.addEventListener('error', reject, { once: true });
    });
  }

  // ── Discard ────────────────────────────────────────────────────────────────
  function _discard() {
    previewZoom = 1; panX = 0; panY = 0;
    recVideoArea.style.transform = '';
    recVideo.pause();
    recVideo.src = '';
    if (videoBlobUrl) { URL.revokeObjectURL(videoBlobUrl); videoBlobUrl = null; }
    currentBlob = null;
    resetRecorder();
    recStartBtn.disabled    = false;
    recDelayBtn.disabled    = false;
    recDownloadBtn.disabled = false;
    recTimer.textContent    = '00:00';
    recLiveSize.textContent = '0 KB';
    clearStatus(recStatus);
    _showState('idle');
  }

  // ── UI helpers ─────────────────────────────────────────────────────────────
  function _resetTrim() {
    trimA = 0; trimB = 1;
    recTrimA.value = 0; recTrimB.value = 1000;
    recTrimA.style.zIndex = 4; recTrimB.style.zIndex = 5;
    _updateTrimBar();
    _updatePlayhead(0);
    recTrimALabel.textContent = '0:00';
    recTrimBLabel.textContent = '—';
  }

  function _resetCrop() {
    cropL = 0; cropR = 1; cropT = 0; cropB = 1;
    cropDragState = null;
    _updateCropOverlay();
  }

  function _updateTrimBar() {
    const a = (trimA * 100).toFixed(1);
    const b = (trimB * 100).toFixed(1);
    recTrimTrack.style.background =
      `linear-gradient(to right, rgba(255,255,255,0.08) ${a}%, var(--purple) ${a}%, var(--purple) ${b}%, rgba(255,255,255,0.08) ${b}%)`;
  }

  function _updateCropOverlay() {
    const { ox, oy, cw, ch, ew, eh } = _getVideoContentRect();
    if (!ew || !eh) return;

    // Crop edges in element-pixel space
    const left   = ox + cropL * cw;
    const right  = ox + cropR * cw;
    const top    = oy + cropT * ch;
    const bottom = oy + cropB * ch;

    // Top mask
    recCropMaskT.style.cssText = `top:0;left:0;right:0;height:${top}px`;
    // Bottom mask
    recCropMaskB.style.cssText = `bottom:0;left:0;right:0;height:${eh - bottom}px`;
    // Left mask (between top and bottom crop edges)
    recCropMaskL.style.cssText = `top:${top}px;bottom:${eh - bottom}px;left:0;width:${left}px`;
    // Right mask
    recCropMaskR.style.cssText = `top:${top}px;bottom:${eh - bottom}px;right:0;width:${ew - right}px`;

    // Purple border around selected region
    const hasCrop = cropL > 0.001 || cropR < 0.999 || cropT > 0.001 || cropB < 0.999;
    if (hasCrop) {
      recCropBorder.style.cssText =
        `display:block;left:${left}px;top:${top}px;width:${right - left}px;height:${bottom - top}px`;
    } else {
      recCropBorder.style.display = 'none';
    }
  }

  function _updatePlayhead(frac) {
    recPlayhead.style.left = (Math.max(0, Math.min(1, frac)) * 100).toFixed(2) + '%';
  }

  function _showState(state) {
    recIdle.hidden      = state !== 'idle';
    recCountdown.hidden = state !== 'countdown';
    recLive.hidden      = state !== 'live';
    recPreview.hidden   = state !== 'preview';
  }
}

function _formatTime(s) {
  const m  = Math.floor(s / 60).toString().padStart(2, '0');
  const ss = (s % 60).toString().padStart(2, '0');
  return `${m}:${ss}`;
}

function _vidTime(sec) {
  if (!isFinite(sec) || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
