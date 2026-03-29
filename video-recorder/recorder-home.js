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
  const recSourceGroup    = document.getElementById('recSourceGroup');

  // ── Video player ───────────────────────────────────────────────────────────
  const recVideo      = document.getElementById('recVideo');
  const recPlayBtn    = document.getElementById('recPlayBtn');
  const recPlayIcon   = document.getElementById('recPlayIcon');
  const recPauseIcon  = document.getElementById('recPauseIcon');
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
  const recCropXTrack = document.getElementById('recCropXTrack');
  const recCropYTrack = document.getElementById('recCropYTrack');
  const recCropLSlider = document.getElementById('recCropLSlider');
  const recCropRSlider = document.getElementById('recCropRSlider');
  const recCropTSlider = document.getElementById('recCropTSlider');
  const recCropBSlider = document.getElementById('recCropBSlider');

  // ── State ──────────────────────────────────────────────────────────────────
  let currentBlob    = null;
  let currentFormat  = 'webm';
  let selectedSource = 'tab';
  let countdownTimer = null;
  let videoBlobUrl   = null;
  let isScrubbing    = false;
  let isProcessing   = false;
  let knownDuration  = 0;   // elapsed seconds from recorder (reliable fallback)
  let trimA = 0;  let trimB = 1;   // 0–1 fractions
  let cropL = 0;  let cropR = 1;   // horizontal: left / right
  let cropT = 0;  let cropB = 1;   // vertical:   top  / bottom

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

  // ── Source picker ──────────────────────────────────────────────────────────
  recSourceGroup.querySelectorAll('.seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      recSourceGroup.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedSource = btn.dataset.value;
    });
  });

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
      recVideo.pause();
      recVideo.currentTime = trimA * dur;
    }
  });

  recVideo.addEventListener('play',  () => { recPlayIcon.hidden = true;  recPauseIcon.hidden = false; });
  recVideo.addEventListener('pause', () => { recPlayIcon.hidden = false; recPauseIcon.hidden = true;  });
  recVideo.addEventListener('ended', () => { recPlayIcon.hidden = false; recPauseIcon.hidden = true;  });

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
    if (dur > 0) recTrimBLabel.textContent = _vidTime(trimB * dur);
  });

  // ── Click on trim track to seek ────────────────────────────────────────────
  recTrimTrack.addEventListener('click', (e) => {
    const dur = _getVideoDuration();
    if (dur <= 0) return;
    const rect = recTrimTrack.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    recVideo.currentTime = Math.max(trimA, Math.min(trimB, frac)) * dur;
  });

  // ── Mute ──────────────────────────────────────────────────────────────────
  recMuteBtn.addEventListener('click', () => {
    recVideo.muted = !recVideo.muted;
    recSoundIcon.hidden = recVideo.muted;
    recMuteIcon.hidden  = !recVideo.muted;
  });

  // ── Crop W (left / right) ─────────────────────────────────────────────────
  recCropLSlider.addEventListener('mousedown',  () => { isScrubbing = true; });
  recCropRSlider.addEventListener('mousedown',  () => { isScrubbing = true; });
  recCropLSlider.addEventListener('touchstart', () => { isScrubbing = true; }, { passive: true });
  recCropRSlider.addEventListener('touchstart', () => { isScrubbing = true; }, { passive: true });

  recCropLSlider.addEventListener('input', () => {
    cropL = Math.min(recCropLSlider.value / 1000, cropR - 0.01);
    recCropLSlider.value = Math.round(cropL * 1000);
    recCropLSlider.style.zIndex = cropL > 0.5 ? 5 : 4;
    recCropRSlider.style.zIndex = cropL > 0.5 ? 4 : 5;
    _updateCropBar();
    _updateCropOverlay();
  });

  recCropRSlider.addEventListener('input', () => {
    cropR = Math.max(recCropRSlider.value / 1000, cropL + 0.01);
    recCropRSlider.value = Math.round(cropR * 1000);
    _updateCropBar();
    _updateCropOverlay();
  });

  // ── Crop H (top / bottom) ─────────────────────────────────────────────────
  recCropTSlider.addEventListener('mousedown',  () => { isScrubbing = true; });
  recCropBSlider.addEventListener('mousedown',  () => { isScrubbing = true; });
  recCropTSlider.addEventListener('touchstart', () => { isScrubbing = true; }, { passive: true });
  recCropBSlider.addEventListener('touchstart', () => { isScrubbing = true; }, { passive: true });

  recCropTSlider.addEventListener('input', () => {
    cropT = Math.min(recCropTSlider.value / 1000, cropB - 0.01);
    recCropTSlider.value = Math.round(cropT * 1000);
    recCropTSlider.style.zIndex = cropT > 0.5 ? 5 : 4;
    recCropBSlider.style.zIndex = cropT > 0.5 ? 4 : 5;
    _updateCropBar();
    _updateCropOverlay();
  });

  recCropBSlider.addEventListener('input', () => {
    cropB = Math.max(recCropBSlider.value / 1000, cropT + 0.01);
    recCropBSlider.value = Math.round(cropB * 1000);
    _updateCropBar();
    _updateCropOverlay();
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

    _resetTrim();
    _resetCrop();

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
    if (!needsTrim && !needsCrop) return currentBlob;

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
        audioStream.getAudioTracks().forEach(t => stream.addTrack(t));

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
    recCropLSlider.value = 0;    recCropRSlider.value = 1000;
    recCropTSlider.value = 0;    recCropBSlider.value = 1000;
    recCropLSlider.style.zIndex = 4; recCropRSlider.style.zIndex = 5;
    recCropTSlider.style.zIndex = 4; recCropBSlider.style.zIndex = 5;
    _updateCropBar();
    _updateCropOverlay();
  }

  function _updateTrimBar() {
    const a = (trimA * 100).toFixed(1);
    const b = (trimB * 100).toFixed(1);
    recTrimTrack.style.background =
      `linear-gradient(to right, rgba(255,255,255,0.08) ${a}%, var(--purple) ${a}%, var(--purple) ${b}%, rgba(255,255,255,0.08) ${b}%)`;
  }

  function _updateCropBar() {
    const l = (cropL * 100).toFixed(1), r = (cropR * 100).toFixed(1);
    const t = (cropT * 100).toFixed(1), b = (cropB * 100).toFixed(1);
    recCropXTrack.style.background =
      `linear-gradient(to right, rgba(255,255,255,0.08) ${l}%, var(--purple) ${l}%, var(--purple) ${r}%, rgba(255,255,255,0.08) ${r}%)`;
    recCropYTrack.style.background =
      `linear-gradient(to right, rgba(255,255,255,0.08) ${t}%, var(--purple) ${t}%, var(--purple) ${b}%, rgba(255,255,255,0.08) ${b}%)`;
  }

  function _updateCropOverlay() {
    const ew = recVideo.clientWidth;
    const eh = recVideo.clientHeight;
    if (!ew || !eh) return;

    // Compute actual video content rect (accounts for object-fit: contain letterboxing)
    const vw    = recVideo.videoWidth  || ew;
    const vh    = recVideo.videoHeight || eh;
    const scale = Math.min(ew / vw, eh / vh);
    const cw    = vw * scale;
    const ch    = vh * scale;
    const ox    = (ew - cw) / 2;  // horizontal offset
    const oy    = (eh - ch) / 2;  // vertical offset

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
