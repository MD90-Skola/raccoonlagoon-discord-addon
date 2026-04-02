// tabs/clock.js — Matlagning / Planering / Larm

// ─── Week number (ISO 8601) ────────────────────────────────────────────────────
function getWeekNumber(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
}

// ─── Alarm sound ──────────────────────────────────────────────────────────────
function playAlarmSound() {
  try {
    const ctx = new AudioContext();
    const beep = (freq, start, dur) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
      gain.gain.setValueAtTime(0.15, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur);
    };
    beep(880,  0,    0.18);
    beep(880,  0.22, 0.18);
    beep(1100, 0.44, 0.38);
  } catch (_) {}
}

// ─── Push notification ─────────────────────────────────────────────────────────
async function notify(title, body) {
  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon: '../icon.png' });
  } else if (Notification.permission !== 'denied') {
    const perm = await Notification.requestPermission();
    if (perm === 'granted') new Notification(title, { body, icon: '../icon.png' });
  }
}

// ─── Format seconds → MM:SS or H:MM:SS ────────────────────────────────────────
function fmtTime(totalSecs) {
  totalSecs = Math.max(0, totalSecs);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

// ─── Parse typed time input → seconds ─────────────────────────────────────────
// Accepts: "5:30" → 330 s, "10" → 600 s (treated as minutes), "1:05:00" → 3900 s
function parseTimeInput(val) {
  val = val.trim().replace(/[^0-9:]/g, '');
  if (!val) return 0;
  const parts = val.split(':').map(v => parseInt(v, 10) || 0);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + Math.min(parts[2], 59);
  if (parts.length === 2) return parts[0] * 60 + Math.min(parts[1], 59);
  return parts[0] * 60; // plain number = minutes
}

// ─── Date / week header ────────────────────────────────────────────────────────
function startDateHeader() {
  const dayEl  = document.getElementById('clockDateDay');
  const weekEl = document.getElementById('clockWeek');
  if (!dayEl || !weekEl) return;

  const DAYS   = ['Söndag','Måndag','Tisdag','Onsdag','Torsdag','Fredag','Lördag'];
  const MONTHS = ['Januari','Februari','Mars','April','Maj','Juni','Juli',
                  'Augusti','September','Oktober','November','December'];

  function update() {
    const now = new Date();
    dayEl.textContent  = `${DAYS[now.getDay()]} ${now.getDate()} ${MONTHS[now.getMonth()]}`;
    weekEl.textContent = `Vecka ${getWeekNumber(now)}`;
  }

  update();
  setInterval(update, 60000); // re-check every minute (catches midnight rollover)
}

// ─── Inner tab switching ───────────────────────────────────────────────────────
function initClockTabs() {
  const tabs  = document.querySelectorAll('.clock-tab');
  const panes = document.querySelectorAll('[id^="clockPane-"]');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panes.forEach(p => { p.hidden = true; });
      tab.classList.add('active');
      document.getElementById('clockPane-' + tab.dataset.clockTab).hidden = false;
    });
  });
}

// ─── Cooking tab ──────────────────────────────────────────────────────────────
function initCooking() {
  let setSeconds   = 5 * 60;
  let remaining    = setSeconds;
  let running      = false;
  let interval     = null;
  let alarmAudio   = null;
  let alarmPlaying = false;

  const displayEl = document.getElementById('cookingDisplay');
  const editWrap  = document.getElementById('cookingEditWrap');
  const editMin   = document.getElementById('cookingEditMin');
  const editSec   = document.getElementById('cookingEditSec');
  const startBtn  = document.getElementById('cookingStartBtn');
  const resetBtn  = document.getElementById('cookingResetBtn');
  const decBtn    = document.getElementById('cookingDecBtn');
  const incBtn    = document.getElementById('cookingIncBtn');
  const presets   = document.querySelectorAll('.cooking-preset');

  const MIN_SECS = 30;
  const MAX_SECS = 99 * 60 + 59;

  function clamp(s) { return Math.max(MIN_SECS, Math.min(s, MAX_SECS)); }

  function updateDisplay() {
    if (!editWrap.hidden) return;
    displayEl.textContent = fmtTime(remaining);
  }

  function enterEditMode() {
    if (running) return;
    editMin.value = String(Math.floor(remaining / 60)).padStart(2, '0');
    editSec.value = String(remaining % 60).padStart(2, '0');
    displayEl.hidden = true;
    editWrap.hidden  = false;
    editMin.select();
    editMin.focus();
  }

  function commitEdit() {
    const m = Math.min(parseInt(editMin.value, 10) || 0, 99);
    const s = Math.min(parseInt(editSec.value, 10) || 0, 59);
    const total = m * 60 + s;
    if (total > 0) {
      setSeconds = clamp(total);
      remaining  = setSeconds;
    }
    editWrap.hidden  = true;
    displayEl.hidden = false;
    displayEl.classList.remove('done');
    updateDisplay();
  }

  function exitEditMode() {
    editWrap.hidden  = true;
    displayEl.hidden = false;
  }

  displayEl.addEventListener('click', enterEditMode);

  // Block non-numeric keys, allow control keys
  [editMin, editSec].forEach(inp => {
    inp.addEventListener('input', () => { inp.value = inp.value.replace(/\D/g, ''); });
    inp.addEventListener('focus', () => inp.select());
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter')  { e.preventDefault(); commitEdit(); }
      if (e.key === 'Escape') { exitEditMode(); }
    });
  });

  // Auto-advance min → sec after 2 digits
  editMin.addEventListener('input', () => { if (editMin.value.length >= 2) editSec.focus(); });

  // Commit when focus leaves the wrap entirely
  editWrap.addEventListener('focusout', e => {
    if (editWrap.contains(e.relatedTarget)) return;
    commitEdit();
  });

  decBtn.addEventListener('click', () => {
    if (running) {
      remaining = clamp(remaining - 30);
    } else {
      setSeconds = clamp(setSeconds - 30);
      remaining  = setSeconds;
    }
    displayEl.classList.remove('done');
    updateDisplay();
  });

  incBtn.addEventListener('click', () => {
    if (running) {
      remaining = clamp(remaining + 30);
    } else {
      setSeconds = clamp(setSeconds + 30);
      remaining  = setSeconds;
    }
    displayEl.classList.remove('done');
    updateDisplay();
  });

  function stop() {
    clearInterval(interval);
    interval = null;
    running  = false;
    startBtn.textContent = 'Start';
  }

  function stopAlarm() {
    if (alarmAudio) { alarmAudio.pause(); alarmAudio.currentTime = 0; alarmAudio = null; }
    alarmPlaying = false;
    startBtn.textContent = 'Start';
  }

  function reset() {
    stopAlarm();
    stop();
    remaining = setSeconds;
    displayEl.classList.remove('done');
    updateDisplay();
  }

  startBtn.addEventListener('click', () => {
    if (alarmPlaying) { stopAlarm(); return; }
    if (running) { stop(); return; }
    if (remaining <= 0) remaining = setSeconds;
    if (remaining <= 0) return;
    running = true;
    startBtn.textContent = 'Pausa';
    displayEl.classList.remove('done');
    interval = setInterval(() => {
      remaining--;
      updateDisplay();
      if (remaining <= 0) {
        remaining = 0;
        stop();
        displayEl.classList.add('done');
        alarmAudio   = playAlarmAudio();
        alarmPlaying = true;
        startBtn.textContent = 'Stop';
        notify('Matlagning klar!', 'Timern är klar.');
      }
    }, 1000);
  });

  resetBtn.addEventListener('click', reset);

  presets.forEach(btn => {
    btn.addEventListener('click', () => {
      presets.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      setSeconds = parseInt(btn.dataset.min, 10) * 60;
      stop();
      remaining = setSeconds;
      displayEl.classList.remove('done');
      updateDisplay();
    });
  });

  presets[0]?.classList.add('selected');
  updateDisplay();
}

// ─── Planning tab ─────────────────────────────────────────────────────────────
function initPlanning() {
  const calcBtn     = document.getElementById('planCalcBtn');
  const resultEl    = document.getElementById('planResult');
  const resultText  = document.getElementById('planResultText');
  const countdownEl = document.getElementById('planCountdown');
  const cancelBtn   = document.getElementById('planCancelBtn');

  let planInterval = null;
  let departH = 0;
  let departM = 0;
  let fired   = false;

  function stopCountdown() {
    clearInterval(planInterval);
    planInterval = null;
    countdownEl.hidden = true;
    cancelBtn.hidden   = true;
    countdownEl.classList.remove('done');
    fired = false;
  }

  function startPlanCountdown() {
    stopCountdown();
    cancelBtn.hidden = false;

    function tick() {
      const now     = new Date();
      const nowSecs = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
      const depSecs = departH * 3600 + departM * 60;
      let diff      = depSecs - nowSecs;
      if (diff < -3600) diff += 86400; // wrap past midnight

      if (diff <= 0 && !fired) {
        fired = true;
        clearInterval(planInterval);
        countdownEl.textContent = 'Dags att åka!';
        countdownEl.classList.add('done');
        countdownEl.hidden = false;
        cancelBtn.hidden   = false;
        playAlarmAudio();
        notify('Dags att åka!',
          `Avgångstid ${String(departH).padStart(2,'0')}:${String(departM).padStart(2,'0')}`);
        return;
      }

      if (diff > 0) {
        countdownEl.textContent = fmtTime(diff);
        countdownEl.hidden = false;
      }
    }

    tick();
    planInterval = setInterval(tick, 1000);
  }

  cancelBtn.addEventListener('click', () => {
    stopCountdown();
    resultEl.hidden = true;
  });

  calcBtn.addEventListener('click', () => {
    const arrivalVal = document.getElementById('planArrival').value;
    const travelMin  = parseInt(document.getElementById('planTravelMin').value, 10) || 0;

    if (!arrivalVal) { stopCountdown(); resultEl.hidden = true; return; }

    const [ah, am]    = arrivalVal.split(':').map(Number);
    const arrivalMins = ah * 60 + am;
    const departMins  = ((arrivalMins - travelMin) % 1440 + 1440) % 1440;

    departH = Math.floor(departMins / 60);
    departM = departMins % 60;

    resultText.textContent = `Avgå ${String(departH).padStart(2,'0')}:${String(departM).padStart(2,'0')}`;
    resultEl.hidden = false;

    startPlanCountdown();
  });
}

// ─── Alarms ───────────────────────────────────────────────────────────────────
let alarms = [];
const firedToday = new Set();
let currentAlarmSrc = 'assets/ready-to-roll-out.mp3';

function playAlarmAudio() {
  try {
    const audio = new Audio(chrome.runtime.getURL(currentAlarmSrc));
    audio.play().catch(() => playAlarmSound());
    return audio;
  } catch (_) {
    playAlarmSound();
    return null;
  }
}

async function saveAlarms() {
  await Storage.set({ clockAlarms: alarms });
}

async function loadAlarms() {
  const data = await Storage.get(['clockAlarms']);
  alarms = Array.isArray(data.clockAlarms) ? data.clockAlarms : [];
  renderAlarms();
}

function checkAlarms(now) {
  const current = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  const dateKey = now.toDateString();

  alarms.forEach(alarm => {
    if (!alarm.enabled || alarm.time !== current) return;
    const key = `${alarm.id}-${dateKey}`;
    if (firedToday.has(key)) return;
    firedToday.add(key);
    playAlarmAudio();
    notify('Larm!', alarm.label ? `${alarm.time} — ${alarm.label}` : alarm.time);
    const el = document.querySelector(`.alarm-item[data-id="${alarm.id}"]`);
    if (el) {
      el.classList.add('firing');
      setTimeout(() => el.classList.remove('firing'), 60000);
    }
  });
}

function renderAlarms() {
  const list    = document.getElementById('alarmList');
  const emptyEl = document.getElementById('alarmEmpty');
  list.innerHTML = '';

  alarms.forEach(alarm => {
    const li = document.createElement('li');
    li.className  = 'alarm-item';
    li.dataset.id = alarm.id;

    li.innerHTML = `
      <label class="toggle-switch">
        <input type="checkbox" class="alarm-toggle" ${alarm.enabled ? 'checked' : ''} />
        <span class="slider"></span>
      </label>
      <span class="alarm-item-time">${alarm.time}</span>
      <span class="alarm-item-label">${alarm.label || ''}</span>
      <button class="alarm-item-del" title="Ta bort">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    `;

    li.querySelector('.alarm-toggle').addEventListener('change', async e => {
      alarm.enabled = e.target.checked;
      await saveAlarms();
    });

    li.querySelector('.alarm-item-del').addEventListener('click', async () => {
      alarms = alarms.filter(a => a.id !== alarm.id);
      await saveAlarms();
      li.remove();
      emptyEl.hidden = alarms.length > 0;
    });

    list.appendChild(li);
  });

  emptyEl.hidden = alarms.length > 0;
}

function initAlarms() {
  loadAlarms();
  setInterval(() => checkAlarms(new Date()), 1000);

  // ─── Sound picker ──────────────────────────────────────────────────────
  const soundBtn    = document.getElementById('alarmSoundBtn');
  const soundPicker = document.getElementById('alarmSoundPicker');
  const soundOpts   = document.querySelectorAll('.alarm-sound-opt');

  let previewAudio = null;
  let previewSrc   = null;

  function stopPreview() {
    if (previewAudio) { previewAudio.pause(); previewAudio.currentTime = 0; previewAudio = null; }
    previewSrc = null;
    soundOpts.forEach(opt => {
      opt.querySelector('.icon-play').hidden = false;
      opt.querySelector('.icon-stop').hidden = true;
    });
  }

  Storage.get(['alarmSound']).then(data => {
    if (data.alarmSound) currentAlarmSrc = data.alarmSound;
    updateSoundUI();
  });

  function updateSoundUI() {
    soundOpts.forEach(opt =>
      opt.classList.toggle('selected', opt.dataset.src === currentAlarmSrc)
    );
  }

  soundBtn.addEventListener('click', e => {
    e.stopPropagation();
    const wasHidden = soundPicker.hidden;
    soundPicker.hidden = !wasHidden;
    soundBtn.classList.toggle('active', wasHidden);
    if (!wasHidden) stopPreview(); // closing picker — stop any preview
  });

  soundOpts.forEach(opt => {
    const playBtn  = opt.querySelector('.sound-play-btn');
    const iconPlay = opt.querySelector('.icon-play');
    const iconStop = opt.querySelector('.icon-stop');
    const src      = opt.dataset.src;

    // Play / stop preview
    playBtn.addEventListener('click', e => {
      e.stopPropagation();
      if (previewSrc === src && previewAudio && !previewAudio.paused) {
        stopPreview();
      } else {
        stopPreview();
        previewAudio = new Audio(chrome.runtime.getURL(src));
        previewSrc   = src;
        iconPlay.hidden = true;
        iconStop.hidden = false;
        previewAudio.play().catch(() => {});
        previewAudio.addEventListener('ended', () => {
          iconPlay.hidden = false;
          iconStop.hidden = true;
          previewAudio = null;
          previewSrc   = null;
        });
      }
    });

    // Select sound (click anywhere on row except play btn)
    opt.addEventListener('click', async e => {
      if (e.target.closest('.sound-play-btn')) return;
      currentAlarmSrc = src;
      await Storage.set({ alarmSound: currentAlarmSrc });
      updateSoundUI();
      stopPreview();
      soundPicker.hidden = true;
      soundBtn.classList.remove('active');
    });
  });

  document.addEventListener('click', e => {
    if (!soundPicker.hidden &&
        !soundBtn.contains(e.target) &&
        !soundPicker.contains(e.target)) {
      stopPreview();
      soundPicker.hidden = true;
      soundBtn.classList.remove('active');
    }
  });

  // ─── Add alarm ─────────────────────────────────────────────────────────
  document.getElementById('alarmAddBtn').addEventListener('click', async () => {
    const timeInput = document.getElementById('alarmTimeInput');
    const t = timeInput.value;
    if (!t) return;
    alarms.push({ id: Date.now().toString(36), time: t, label: '', enabled: true });
    await saveAlarms();
    renderAlarms();
    timeInput.value = '';
  });
}

// ─── Public init ──────────────────────────────────────────────────────────────
export function initClock() {
  startDateHeader();
  initClockTabs();
  initCooking();
  initPlanning();
  initAlarms();
}
