// components/record/record.js

import { initRecorderHome } from '../video-recorder/recorder-home.js';

export const template = `
<div class="card" id="recorderCard">
  <label class="section-label">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4" fill="currentColor" stroke="none"/></svg>
    Record Clip
  </label>

  <!-- IDLE -->
  <div id="recIdle">
    <div class="rec-split-wrap">
      <div class="rec-split-btn">
        <button class="rec-split-main" id="recStartBtn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4" fill="currentColor" stroke="none"/></svg>
          Start Recording
        </button>
        <div class="rec-split-divider"></div>
        <button class="rec-split-arrow" id="recFormatBtn" title="Format">
          <span class="rec-split-fmt-label" id="recFormatLabel"></span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
      </div>
      <div class="rec-format-dropdown" id="recFormatDropdown">
        <button class="rec-fmt-opt active" data-fmt="webm">WebM</button>
        <button class="rec-fmt-opt" data-fmt="mp4">MP4</button>
        <button class="rec-fmt-opt" data-fmt="gif">GIF</button>
        <div class="rec-fmt-divider"></div>
        <div class="rec-delay-row" id="recDelayBtn">
          <span class="rec-delay-label">+5 sec delay</span>
          <div class="rec-toggle-wrap">
            <div class="rec-toggle-thumb"></div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- COUNTDOWN -->
  <div id="recCountdown" hidden>
    <div class="rec-countdown-display">
      <span class="rec-countdown-num" id="recCountdownNum">5</span>
      <span class="rec-countdown-label">Starting in…</span>
    </div>
    <button class="btn-ghost rec-cancel-delay-btn" id="recCancelDelayBtn">Cancel</button>
  </div>

  <!-- LIVE -->
  <div id="recLive" hidden>
    <div class="rec-live-bar">
      <span class="rec-dot"></span>
      <span class="rec-timer" id="recTimer">00:00</span>
      <span class="rec-live-size" id="recLiveSize">0 KB</span>
      <span class="rec-live-fmt" id="recLiveFmt"></span>
    </div>
    <button class="btn-primary btn-rec-stop" id="recStopBtn" style="margin-top:6px">
      <svg viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
      Stop Recording
    </button>
  </div>

  <!-- PREVIEW -->
  <div id="recPreview" hidden>
    <!-- Inline video player -->
    <div class="rec-player">
      <!-- Video + crop overlay -->
      <div class="rec-video-area">
        <video id="recVideo" class="rec-video" preload="metadata"></video>
        <div class="rec-crop-overlay" id="recCropOverlay">
          <div class="rec-crop-mask" id="recCropMaskT"></div>
          <div class="rec-crop-mask" id="recCropMaskB"></div>
          <div class="rec-crop-mask" id="recCropMaskL"></div>
          <div class="rec-crop-mask" id="recCropMaskR"></div>
          <div class="rec-crop-border" id="recCropBorder">
            <div class="rec-crop-handle" data-handle="nw"></div>
            <div class="rec-crop-handle" data-handle="n"></div>
            <div class="rec-crop-handle" data-handle="ne"></div>
            <div class="rec-crop-handle" data-handle="e"></div>
            <div class="rec-crop-handle" data-handle="se"></div>
            <div class="rec-crop-handle" data-handle="s"></div>
            <div class="rec-crop-handle" data-handle="sw"></div>
            <div class="rec-crop-handle" data-handle="w"></div>
          </div>
        </div>
      </div>
      <div class="rec-player-controls">
        <!-- A/B trim bar -->
        <div class="rec-trim-wrap" id="recTrimWrap">
          <div class="rec-trim-track" id="recTrimTrack"></div>
          <div class="rec-playhead"   id="recPlayhead"></div>
          <input type="range" class="rec-trim-handle" id="recTrimA" min="0" max="1000" step="1" value="0"    />
          <input type="range" class="rec-trim-handle" id="recTrimB" min="0" max="1000" step="1" value="1000" />
        </div>
        <!-- A / B time labels -->
        <div class="rec-trim-labels">
          <span id="recTrimALabel">0:00</span>
          <span id="recTrimBLabel">—</span>
        </div>
        <!-- Controls row -->
        <div class="rec-player-row">
          <button class="rec-ctrl-btn" id="recPlayBtn" title="Play / Pause">
            <svg id="recPlayIcon" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            <svg id="recPauseIcon" viewBox="0 0 24 24" fill="currentColor" hidden><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
          </button>
          <button class="rec-ctrl-btn" id="recLoopBtn" title="Loop">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
          </button>
          <span class="rec-player-time" id="recVideoTime">0:00 / 0:00</span>
          <div class="rec-vol-wrap" id="recVolWrap">
            <div class="rec-vol-popup">
              <input type="range" class="rec-vol-slider" id="recVolSlider" min="0" max="100" step="1" value="100" />
            </div>
            <button class="rec-ctrl-btn" id="recMuteBtn" title="Mute / Unmute">
              <svg id="recSoundIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
              <svg id="recMuteIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- File info + discard -->
    <div class="rec-preview-card">
      <div class="rec-preview-info">
        <span class="rec-preview-name" id="recFileName">clip.webm</span>
        <span class="rec-preview-size" id="recFileSize">—</span>
      </div>
      <button class="btn-remove" id="recDiscardBtn" title="Discard">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div class="rec-preview-actions" style="margin-top:8px">
      <button class="btn-ghost" id="recDownloadBtn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Download
      </button>
      <button class="btn-primary" id="recSendBtn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        Discord
      </button>
    </div>
    <!-- Processing progress bar -->
    <div class="rec-process-wrap" id="recProcessWrap" hidden>
      <div class="rec-process-bar" id="recProcessBar"></div>
    </div>
  </div>

  <div class="status-bar" id="recStatus"></div>
</div>`;

export function init() {
  initRecorderHome();
}
