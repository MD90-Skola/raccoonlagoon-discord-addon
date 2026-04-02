// video-recorder/offscreen.js — Tab capture MediaRecorder (offscreen document)

const MIME_PREFERRED = 'video/webm;codecs=vp9,opus';
const MIME_FALLBACK  = 'video/webm';

let mediaRecorder  = null;
let recordedChunks = [];
let totalBytes     = 0;
let elapsedSeconds = 0;
let timerInterval  = null;
let tabStream      = null;
let sizeLimitBytes = 0;

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.target !== 'offscreen') return;

  if (msg.type === 'START') {
    _start(msg)
      .then(() => sendResponse({ ok: true }))
      .catch(e => {
        chrome.runtime.sendMessage({ target: 'background', type: 'ERROR', message: e.message });
        sendResponse({ ok: false, error: e.message });
      });
    return true; // async response
  }

  if (msg.type === 'STOP') {
    _stop();
    sendResponse({ ok: true });
  }
});

async function _start({ streamId, audioMode, sizeLimitMb }) {
  sizeLimitBytes = sizeLimitMb > 0 ? sizeLimitMb * 1024 * 1024 : 0;
  recordedChunks = [];
  totalBytes     = 0;
  elapsedSeconds = 0;

  // ── Get tab stream ──────────────────────────────────────────────────────────
  const captureAudio = audioMode !== 'mic';
  tabStream = await navigator.mediaDevices.getUserMedia({
    video: { mandatory: { chromeMediaSource: 'tab', chromeMediaSourceId: streamId } },
    audio: captureAudio
      ? { mandatory: { chromeMediaSource: 'tab', chromeMediaSourceId: streamId } }
      : false
  });

  // ── Mic mixing ──────────────────────────────────────────────────────────────
  if (audioMode === 'mic' || audioMode === 'both') {
    const micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    if (audioMode === 'both' && tabStream.getAudioTracks().length > 0) {
      const audioCtx = new AudioContext();
      const dest   = audioCtx.createMediaStreamDestination();
      const tabSrc = audioCtx.createMediaStreamSource(tabStream);
      const micSrc = audioCtx.createMediaStreamSource(micStream);
      tabSrc.connect(dest);
      micSrc.connect(dest);
      tabStream.getAudioTracks().forEach(t => tabStream.removeTrack(t));
      tabStream.addTrack(dest.stream.getAudioTracks()[0]);
    } else {
      tabStream.getAudioTracks().forEach(t => tabStream.removeTrack(t));
      micStream.getAudioTracks().forEach(t => tabStream.addTrack(t));
    }
  }

  // ── MediaRecorder ───────────────────────────────────────────────────────────
  const mimeType = MediaRecorder.isTypeSupported(MIME_PREFERRED) ? MIME_PREFERRED : MIME_FALLBACK;
  mediaRecorder  = new MediaRecorder(tabStream, { mimeType });

  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size === 0) return;
    recordedChunks.push(e.data);
    totalBytes += e.data.size;
    chrome.runtime.sendMessage({
      target: 'background', type: 'TICK',
      elapsed: elapsedSeconds, bytes: totalBytes
    });
    if (sizeLimitBytes > 0 && totalBytes >= sizeLimitBytes) _stop();
  };

  mediaRecorder.onstop = async () => {
    clearInterval(timerInterval);
    timerInterval = null;
    const blob   = new Blob(recordedChunks, { type: mimeType });
    const buffer = await blob.arrayBuffer();
    chrome.runtime.sendMessage({
      target: 'background', type: 'DONE',
      buffer, mimeType, bytes: totalBytes, elapsed: elapsedSeconds
    });
    _cleanup();
  };

  // User clicked browser's native "Stop sharing"
  tabStream.getVideoTracks()[0].addEventListener('ended', () => {
    if (mediaRecorder?.state === 'recording' || mediaRecorder?.state === 'paused') _stop();
  });

  mediaRecorder.start(500);

  timerInterval = setInterval(() => {
    elapsedSeconds++;
    chrome.runtime.sendMessage({
      target: 'background', type: 'TICK',
      elapsed: elapsedSeconds, bytes: totalBytes
    });
  }, 1000);
}

function _stop() {
  clearInterval(timerInterval);
  timerInterval = null;
  if (mediaRecorder?.state === 'recording' || mediaRecorder?.state === 'paused') {
    mediaRecorder.stop();
  }
}

function _cleanup() {
  tabStream?.getTracks().forEach(t => t.stop());
  tabStream      = null;
  mediaRecorder  = null;
  recordedChunks = [];
}
