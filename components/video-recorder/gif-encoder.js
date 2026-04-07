// components/video-recorder/gif-encoder.js
// Pure-JS animated GIF encoder. No external dependencies.
// encodeGif(videoBlob, opts) → Promise<Blob>

const DEFAULT_FPS      = 10;
const DEFAULT_MAXWIDTH = 480;

// ── Main export ───────────────────────────────────────────────────────────────
export async function encodeGif(videoBlob, {
  fps         = DEFAULT_FPS,
  maxWidth    = DEFAULT_MAXWIDTH,
  trimStart   = 0,
  trimEnd     = null,
  cropL = 0, cropR = 1,
  cropT = 0, cropB = 1,
  videoWidth  = 0,   // pass from caller to avoid dimension mismatch
  videoHeight = 0,
  onProgress
} = {}) {
  const url   = URL.createObjectURL(videoBlob);
  const video = document.createElement('video');
  video.muted = true;
  video.src   = url;

  await new Promise((res, rej) => {
    video.onloadedmetadata = res;
    video.onerror = () => rej(new Error('Cannot load video for GIF encoding'));
    video.load();
  });

  // WebM from MediaRecorder often reports duration=Infinity until seeked.
  let duration = video.duration;
  if (!isFinite(duration) || duration <= 0) {
    await _seekTo(video, 1e9); // seek to end to populate seekable range
    duration = video.seekable.length > 0 ? video.seekable.end(0) : 0;
    if (!isFinite(duration) || duration <= 0) duration = 30;
  }

  const tStart = Math.max(0, trimStart);
  const tEnd   = Math.min(duration, trimEnd != null ? trimEnd : duration);
  const segLen = Math.max(0.1, tEnd - tStart);

  // Use caller-supplied dimensions (same element crop was drawn on) to avoid mismatch.
  const vw = videoWidth  || video.videoWidth  || 640;
  const vh = videoHeight || video.videoHeight || 480;
  // Compute edges independently to avoid rounding drift, then clamp to video bounds.
  const sx  = Math.round(cropL * vw);
  const sy  = Math.round(cropT * vh);
  const ex  = Math.min(vw, Math.round(cropR * vw));
  const ey  = Math.min(vh, Math.round(cropB * vh));
  const sw  = Math.max(1, ex - sx);
  const sh  = Math.max(1, ey - sy);

  const scale = Math.min(1, maxWidth / sw);
  const outW  = Math.max(2, Math.round(sw * scale));
  const outH  = Math.max(2, Math.round(sh * scale));

  const canvas = document.createElement('canvas');
  canvas.width  = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');

  // Intermediate full-frame canvas: draw entire video frame here first,
  // then crop from canvas→canvas. Avoids GPU-stride mismatch that occurs
  // when cropping directly from a video element with willReadFrequently.
  const tmpCanvas = document.createElement('canvas');
  tmpCanvas.width  = vw;
  tmpCanvas.height = vh;
  const tmpCtx = tmpCanvas.getContext('2d');

  const frameCount  = Math.max(1, Math.round(segLen * fps));
  const delayCenti  = Math.max(2, Math.round(100 / fps));

  // ── Extract + quantize frames ─────────────────────────────────────────────
  const frames = [];
  for (let i = 0; i < frameCount; i++) {
    const t = tStart + (i / frameCount) * segLen;
    await _seekTo(video, t);
    tmpCtx.drawImage(video, 0, 0, vw, vh);
    ctx.drawImage(tmpCanvas, sx, sy, sw, sh, 0, 0, outW, outH);
    frames.push(_quantize(ctx.getImageData(0, 0, outW, outH).data, outW * outH));
    onProgress?.((i + 1) / frameCount * 0.85);
  }

  URL.revokeObjectURL(url);

  // ── Assemble GIF binary ───────────────────────────────────────────────────
  const parts = [];

  // Header + Logical Screen Descriptor (no global CT)
  parts.push(_str('GIF89a'));
  parts.push(_u16(outW), _u16(outH), new Uint8Array([0x70, 0, 0]));

  // Netscape loop extension (loop forever)
  parts.push(new Uint8Array([
    0x21, 0xFF, 0x0B,
    78, 69, 84, 83, 67, 65, 80, 69, 50, 46, 48, // 'NETSCAPE2.0'
    0x03, 0x01, 0x00, 0x00, 0x00
  ]));

  for (let i = 0; i < frames.length; i++) {
    const { palette, indices } = frames[i];

    // Graphic Control Extension
    parts.push(new Uint8Array([
      0x21, 0xF9, 0x04, 0x00,
      delayCenti & 0xFF, (delayCenti >> 8) & 0xFF,
      0x00, 0x00
    ]));

    // Image Descriptor + local CT flag (0x87 = local CT, 256 colors)
    parts.push(new Uint8Array([
      0x2C, 0, 0, 0, 0,
      outW & 0xFF, outW >> 8,
      outH & 0xFF, outH >> 8,
      0x87
    ]));

    // Local Color Table (256 × 3 bytes)
    const lct = new Uint8Array(768);
    for (let p = 0; p < palette.length && p < 256; p++) {
      lct[p * 3] = palette[p][0]; lct[p * 3 + 1] = palette[p][1]; lct[p * 3 + 2] = palette[p][2];
    }
    parts.push(lct);

    // LZW-compressed image data
    parts.push(_lzw(indices));

    onProgress?.(0.85 + (i + 1) / frames.length * 0.15);
  }

  parts.push(new Uint8Array([0x3B])); // GIF Trailer

  return new Blob([_concat(parts)], { type: 'image/gif' });
}

// ── Seek helper ───────────────────────────────────────────────────────────────
// double-rAF after 'seeked' gives the decoder time to produce the frame.
// requestVideoFrameCallback is NOT used — it requires the element to be in the
// DOM (composited), which our detached video element never is.
// Special case: if currentTime is already at t and readyState has frame data,
// 'seeked' won't fire — skip straight to double-rAF.
function _seekTo(video, t) {
  return new Promise(res => {
    const ready = () => requestAnimationFrame(() => requestAnimationFrame(res));
    if (Math.abs(video.currentTime - t) < 0.001 && video.readyState >= 2) {
      ready();
      return;
    }
    video.addEventListener('seeked', ready, { once: true });
    video.currentTime = t;
  });
}

// ── Color quantization (median cut on 5-bit histogram) ────────────────────────
function _quantize(rgba, n) {
  // Build histogram with 5-bit quantization (32 levels/channel → 32 768 buckets max)
  const hist = new Map();
  for (let i = 0; i < n; i++) {
    if (rgba[i * 4 + 3] < 128) continue;
    const key = ((rgba[i * 4] >> 3) << 10) | ((rgba[i * 4 + 1] >> 3) << 5) | (rgba[i * 4 + 2] >> 3);
    hist.set(key, (hist.get(key) || 0) + 1);
  }

  // Convert to weighted pixel list [[r, g, b, count], ...]
  const pixels = [];
  for (const [key, cnt] of hist) {
    const r5 = (key >> 10) & 31, g5 = (key >> 5) & 31, b5 = key & 31;
    pixels.push([(r5 << 3) | (r5 >> 2), (g5 << 3) | (g5 >> 2), (b5 << 3) | (b5 >> 2), cnt]);
  }
  if (!pixels.length) pixels.push([0, 0, 0, 1]);

  // Median cut to 256 buckets
  let buckets = [pixels];
  while (buckets.length < 256) {
    let best = -1, bestVol = -1;
    for (let i = 0; i < buckets.length; i++) {
      const v = _range(buckets[i]);
      if (v > bestVol) { bestVol = v; best = i; }
    }
    if (bestVol === 0) break;
    const bk = buckets.splice(best, 1)[0];
    if (bk.length < 2) { buckets.push(bk); break; }
    buckets.push(..._split(bk));
  }

  const palette = buckets.map(_avg);
  while (palette.length < 256) palette.push([0, 0, 0]);

  // Build 32³ LUT for fast nearest-color lookup
  const lut = new Uint8Array(32768);
  for (let r5 = 0; r5 < 32; r5++) {
    for (let g5 = 0; g5 < 32; g5++) {
      for (let b5 = 0; b5 < 32; b5++) {
        const r = (r5 << 3) | (r5 >> 2);
        const g = (g5 << 3) | (g5 >> 2);
        const b = (b5 << 3) | (b5 >> 2);
        let best = 0, bestD = Infinity;
        for (let p = 0; p < 256; p++) {
          const dr = r - palette[p][0], dg = g - palette[p][1], db = b - palette[p][2];
          const d  = dr * dr + dg * dg + db * db;
          if (d < bestD) { bestD = d; best = p; }
        }
        lut[(r5 << 10) | (g5 << 5) | b5] = best;
      }
    }
  }

  // Map pixels to indices
  const indices = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    if (rgba[i * 4 + 3] < 128) continue;
    indices[i] = lut[((rgba[i * 4] >> 3) << 10) | ((rgba[i * 4 + 1] >> 3) << 5) | (rgba[i * 4 + 2] >> 3)];
  }

  return { palette, indices };
}

function _range(bk) {
  let [mnR, mnG, mnB] = [255, 255, 255], [mxR, mxG, mxB] = [0, 0, 0];
  for (const [r, g, b] of bk) {
    if (r < mnR) mnR = r; if (r > mxR) mxR = r;
    if (g < mnG) mnG = g; if (g > mxG) mxG = g;
    if (b < mnB) mnB = b; if (b > mxB) mxB = b;
  }
  return Math.max(mxR - mnR, mxG - mnG, mxB - mnB);
}

function _split(bk) {
  let [mnR, mnG, mnB] = [255, 255, 255], [mxR, mxG, mxB] = [0, 0, 0];
  for (const [r, g, b] of bk) {
    if (r < mnR) mnR = r; if (r > mxR) mxR = r;
    if (g < mnG) mnG = g; if (g > mxG) mxG = g;
    if (b < mnB) mnB = b; if (b > mxB) mxB = b;
  }
  const axis = (mxR - mnR >= mxG - mnG && mxR - mnR >= mxB - mnB) ? 0
             : (mxG - mnG >= mxB - mnB) ? 1 : 2;
  bk.sort((a, b) => a[axis] - b[axis]);
  const mid = bk.length >> 1;
  return [bk.slice(0, mid), bk.slice(mid)];
}

function _avg(bk) {
  let r = 0, g = 0, b = 0, w = 0;
  for (const [pr, pg, pb, cnt] of bk) { r += pr * cnt; g += pg * cnt; b += pb * cnt; w += cnt; }
  return w ? [Math.round(r / w), Math.round(g / w), Math.round(b / w)] : [0, 0, 0];
}

// ── Binary helpers ────────────────────────────────────────────────────────────
function _str(s) { return new Uint8Array([...s].map(c => c.charCodeAt(0))); }
function _u16(n) { return new Uint8Array([n & 0xFF, (n >> 8) & 0xFF]); }

function _concat(parts) {
  const total = parts.reduce((s, p) => s + p.length, 0);
  const out   = new Uint8Array(total);
  let   off   = 0;
  for (const p of parts) { out.set(p, off); off += p.length; }
  return out;
}

// ── LZW compression (GIF variant) ────────────────────────────────────────────
function _lzw(indices) {
  const CLEAR = 256, EOI = 257;
  let codeSize = 9, nextCode = 258;
  let table    = new Map();
  let buf = 0, nBits = 0;
  const bytes = [];

  function emit(code) {
    buf   |= code << nBits;
    nBits += codeSize;
    while (nBits >= 8) { bytes.push(buf & 0xFF); buf >>>= 8; nBits -= 8; }
  }

  function reset() { table.clear(); codeSize = 9; nextCode = 258; }

  emit(CLEAR);
  let prev = indices[0];

  for (let i = 1; i < indices.length; i++) {
    const px  = indices[i];
    const key = (prev << 8) | px;
    if (table.has(key)) {
      prev = table.get(key);
    } else {
      emit(prev);
      if (nextCode < 4096) {
        table.set(key, nextCode++);
        if (nextCode > (1 << codeSize) && codeSize < 12) codeSize++;
      } else {
        emit(CLEAR);
        reset();
      }
      prev = px;
    }
  }

  emit(prev);
  emit(EOI);
  if (nBits > 0) bytes.push(buf & 0xFF);

  // Pack into sub-blocks (max 255 bytes each)
  const out = [8]; // minimum code size
  for (let i = 0; i < bytes.length; i += 255) {
    const chunk = bytes.slice(i, i + 255);
    out.push(chunk.length, ...chunk);
  }
  out.push(0); // block terminator
  return new Uint8Array(out);
}
