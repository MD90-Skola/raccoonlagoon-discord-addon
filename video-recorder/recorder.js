// video-recorder/recorder.js — Core MediaRecorder logic

const MIME_PREFERRED = 'video/webm;codecs=vp9,opus';
const MIME_FALLBACK  = 'video/webm';

let mediaRecorder  = null;
let recordedChunks = [];
let totalBytes     = 0;
let elapsedSeconds = 0;
let timerInterval  = null;
let displayStream  = null;
let micStream      = null;
let audioCtx       = null;
let onTickCb       = null;
let onStopCb       = null;
let sizeLimitBytes = 0;
let savedFormat    = 'webm';
let _prepared      = false; // true between prepareRecording and beginRecording

// ─── Prepare (opens picker, sets up streams, creates MediaRecorder) ───────────
// Does NOT start recording yet — call beginRecording() when ready.
export async function prepareRecording({ source, format, audioMode, sizeLimitMb, onTick, onStop }) {
  onTickCb       = onTick;
  onStopCb       = onStop;
  sizeLimitBytes = sizeLimitMb > 0 ? sizeLimitMb * 1024 * 1024 : 0;
  savedFormat    = format;
  recordedChunks = [];
  totalBytes     = 0;
  elapsedSeconds = 0;

  // ── Get display stream ─────────────────────────────────────────────────────
  const captureAudio = audioMode !== 'mic';
  const displayConstraints = {
    video: { cursor: 'always' },
    audio: captureAudio,
    ...(source === 'tab' && { preferCurrentTab: true })
  };

  displayStream = await navigator.mediaDevices.getDisplayMedia(displayConstraints);

  // ── Mic mixing ─────────────────────────────────────────────────────────────
  if (audioMode === 'mic' || audioMode === 'both') {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });

    if (audioMode === 'both' && displayStream.getAudioTracks().length > 0) {
      audioCtx = new AudioContext();
      const dest   = audioCtx.createMediaStreamDestination();
      const tabSrc = audioCtx.createMediaStreamSource(displayStream);
      const micSrc = audioCtx.createMediaStreamSource(micStream);
      tabSrc.connect(dest);
      micSrc.connect(dest);
      displayStream.getAudioTracks().forEach(t => displayStream.removeTrack(t));
      displayStream.addTrack(dest.stream.getAudioTracks()[0]);
    } else {
      displayStream.getAudioTracks().forEach(t => displayStream.removeTrack(t));
      micStream.getAudioTracks().forEach(t => displayStream.addTrack(t));
    }
  }

  // ── MediaRecorder setup ────────────────────────────────────────────────────
  const mimeType = MediaRecorder.isTypeSupported(MIME_PREFERRED) ? MIME_PREFERRED : MIME_FALLBACK;
  mediaRecorder  = new MediaRecorder(displayStream, { mimeType });

  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size === 0) return;
    recordedChunks.push(e.data);
    totalBytes += e.data.size;
    onTickCb?.({ elapsed: elapsedSeconds, bytes: totalBytes });
    if (sizeLimitBytes > 0 && totalBytes >= sizeLimitBytes) stopRecording();
  };

  mediaRecorder.onstop = () => {
    const blob = new Blob(recordedChunks, { type: mimeType });
    _cleanup();
    onStopCb?.({ blob, format: savedFormat, bytes: totalBytes, elapsed: elapsedSeconds });
  };

  // If user clicks browser's native "Stop sharing" button
  displayStream.getVideoTracks()[0].addEventListener('ended', () => {
    if (isRecording()) stopRecording();
    // If still in prepared state (countdown), caller handles it via onStop
  });

  _prepared = true;
}

// ─── Begin (starts MediaRecorder + timer — call after prepareRecording) ───────
export function beginRecording() {
  if (!_prepared || !mediaRecorder) return;
  _prepared = false;

  mediaRecorder.start(500); // chunk every 500 ms → live size updates

  timerInterval = setInterval(() => {
    elapsedSeconds++;
    onTickCb?.({ elapsed: elapsedSeconds, bytes: totalBytes });
  }, 1000);
}

// ─── Cancel prepared (call if countdown is cancelled before beginRecording) ───
export function cancelPrepared() {
  if (!_prepared) return;
  _prepared = false;
  _cleanup();
  mediaRecorder  = null;
  recordedChunks = [];
  totalBytes     = 0;
  elapsedSeconds = 0;
}

// ─── Start (convenience: prepare + begin immediately) ─────────────────────────
export async function startRecording(opts) {
  await prepareRecording(opts);
  beginRecording();
}

// ─── Stop ─────────────────────────────────────────────────────────────────────
export function stopRecording() {
  clearInterval(timerInterval);
  timerInterval = null;
  const state = mediaRecorder?.state;
  if (state === 'recording' || state === 'paused') mediaRecorder.stop();
}

// ─── State ────────────────────────────────────────────────────────────────────
export function isRecording() {
  return mediaRecorder?.state === 'recording' || mediaRecorder?.state === 'paused';
}

export function resetRecorder() {
  _cleanup();
  _prepared      = false;
  mediaRecorder  = null;
  recordedChunks = [];
  totalBytes     = 0;
  elapsedSeconds = 0;
}

// ─── Internal ─────────────────────────────────────────────────────────────────
function _cleanup() {
  clearInterval(timerInterval);
  timerInterval = null;
  displayStream?.getTracks().forEach(t => t.stop());
  micStream?.getTracks().forEach(t => t.stop());
  audioCtx?.close();
  displayStream = null;
  micStream     = null;
  audioCtx      = null;
}
