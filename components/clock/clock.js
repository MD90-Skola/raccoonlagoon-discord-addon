// components/clock/clock.js

export const template = `
<div class="card clock-card" id="clockCard">

  <!-- Header: date + week + alarm sound -->
  <div class="clock-header">
    <div class="clock-date-wrap">
      <span class="clock-date-day" id="clockDateDay">Måndag 1 Januari</span>
      <span class="clock-week" id="clockWeek">Vecka 1</span>
    </div>
    <div class="alarm-header-right">
      <input type="range" class="alarm-volume-slider" id="alarmVolumeSlider"
        min="0" max="100" value="60" title="Larmvolym" />
      <div class="alarm-sound-wrap">
        <button class="alarm-sound-btn" id="alarmSoundBtn" title="Välj alarmlåt">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        </button>
        <div class="alarm-sound-picker" id="alarmSoundPicker" hidden>
          <div class="alarm-sound-opt" data-src="assets/dash.mp3">
            <button class="sound-play-btn" title="Förhandslyssna">
              <svg class="icon-play" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              <svg class="icon-stop" viewBox="0 0 24 24" fill="currentColor" hidden><rect x="5" y="5" width="14" height="14" rx="2"/></svg>
            </button>
            <span class="sound-name">Dash</span>
          </div>
          <div class="alarm-sound-opt" data-src="assets/dragon-roost-island.mp3">
            <button class="sound-play-btn" title="Förhandslyssna">
              <svg class="icon-play" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              <svg class="icon-stop" viewBox="0 0 24 24" fill="currentColor" hidden><rect x="5" y="5" width="14" height="14" rx="2"/></svg>
            </button>
            <span class="sound-name">Dragon Roost Island</span>
          </div>
          <div class="alarm-sound-opt" data-src="assets/full-steam.mp3">
            <button class="sound-play-btn" title="Förhandslyssna">
              <svg class="icon-play" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              <svg class="icon-stop" viewBox="0 0 24 24" fill="currentColor" hidden><rect x="5" y="5" width="14" height="14" rx="2"/></svg>
            </button>
            <span class="sound-name">Full Steam</span>
          </div>
          <div class="alarm-sound-opt" data-src="assets/pedro.mp3">
            <button class="sound-play-btn" title="Förhandslyssna">
              <svg class="icon-play" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              <svg class="icon-stop" viewBox="0 0 24 24" fill="currentColor" hidden><rect x="5" y="5" width="14" height="14" rx="2"/></svg>
            </button>
            <span class="sound-name">Pedro</span>
          </div>
          <div class="alarm-sound-opt" data-src="assets/ready-to-roll-out.mp3">
            <button class="sound-play-btn" title="Förhandslyssna">
              <svg class="icon-play" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              <svg class="icon-stop" viewBox="0 0 24 24" fill="currentColor" hidden><rect x="5" y="5" width="14" height="14" rx="2"/></svg>
            </button>
            <span class="sound-name">Ready to Roll Out</span>
          </div>
          <div class="alarm-sound-opt" data-src="assets/smash-bros-eurobeat.mp3">
            <button class="sound-play-btn" title="Förhandslyssna">
              <svg class="icon-play" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              <svg class="icon-stop" viewBox="0 0 24 24" fill="currentColor" hidden><rect x="5" y="5" width="14" height="14" rx="2"/></svg>
            </button>
            <span class="sound-name">Smash Bros Eurobeat</span>
          </div>
          <div class="alarm-sound-opt" data-src="assets/wii.mp3">
            <button class="sound-play-btn" title="Förhandslyssna">
              <svg class="icon-play" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              <svg class="icon-stop" viewBox="0 0 24 24" fill="currentColor" hidden><rect x="5" y="5" width="14" height="14" rx="2"/></svg>
            </button>
            <span class="sound-name">Wii</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Inner tab bar -->
  <div class="clock-tab-bar">
    <button class="clock-tab active" data-clock-tab="cooking">Matlagning</button>
    <button class="clock-tab" data-clock-tab="planning">Planering</button>
    <button class="clock-tab" data-clock-tab="alarm">Larm</button>
  </div>

  <!-- Cooking pane -->
  <div class="clock-pane" id="clockPane-cooking">
    <div class="cooking-display-row">
      <button class="cooking-arrow" id="cookingDecBtn" title="-30 sek">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <div class="timer-display editable" id="cookingDisplay">05:00</div>
      <div class="timer-edit-wrap" id="cookingEditWrap" hidden>
        <input class="timer-edit-part" id="cookingEditMin" type="text" inputmode="numeric" maxlength="2" placeholder="00" />
        <span class="timer-edit-colon">:</span>
        <input class="timer-edit-part" id="cookingEditSec" type="text" inputmode="numeric" maxlength="2" placeholder="00" />
      </div>
      <button class="cooking-arrow" id="cookingIncBtn" title="+30 sek">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    </div>
    <div class="cooking-presets">
      <button class="cooking-preset" data-min="5">5 min</button>
      <button class="cooking-preset" data-min="10">10 min</button>
      <button class="cooking-preset" data-min="15">15 min</button>
      <button class="cooking-preset" data-min="20">20 min</button>
    </div>
    <div class="clock-btn-row">
      <button class="btn-primary" id="cookingStartBtn">Start</button>
      <button class="btn-ghost" id="cookingResetBtn">Reset</button>
    </div>
  </div>

  <!-- Planning pane -->
  <div class="clock-pane" id="clockPane-planning" hidden>

    <!-- Sparade planer -->
    <div class="plan-saved-row">
      <select class="text-input" id="planSavedSelect">
        <option value="">— Sparade planer —</option>
      </select>
      <button class="plan-saved-del" id="planSavedDel" title="Ta bort plan" hidden>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>

    <!-- Formulär -->
    <div class="plan-form">
      <div class="plan-field">
        <span class="plan-label">Ankomsttid *</span>
        <input type="time" class="text-input" id="planArrival" />
      </div>
      <div class="plan-field">
        <span class="plan-label">Förberedelse</span>
        <input type="number" class="text-input" id="planPrepMin" placeholder="minuter" min="0" max="999" />

      </div>
      <div class="plan-field">
        <span class="plan-label">Restid</span>
        <input type="number" class="text-input" id="planTravelMin" placeholder="minuter" min="0" max="999" />

      </div>
      <div class="alarm-url-row">
        <input type="text" class="text-input" id="planNote" placeholder="Anteckning" maxlength="80" />
        <input type="url" class="text-input alarm-url-input" id="planUrl" placeholder="URL" />
      </div>
    </div>

    <!-- Knappar -->
    <div class="plan-btn-row">
      <button class="btn-primary" id="planCalcBtn">Räkna ut</button>
      <button class="btn-ghost" id="planSaveBtn">Spara</button>
    </div>

    <!-- Tidslinje -->
    <div class="plan-timeline" id="planTimeline" hidden>
      <div class="plan-timeline-step" id="planStep1" hidden>
        <span class="plan-step-num">1</span>
        <span class="plan-step-label">Gå upp</span>
        <span class="plan-step-time" id="planStepWake"></span>
      </div>
      <div class="plan-timeline-step" id="planStep2" hidden>
        <span class="plan-step-num">2</span>
        <span class="plan-step-label">Gå hemifrån</span>
        <span class="plan-step-time" id="planStepDepart"></span>
      </div>
      <div class="plan-timeline-step" id="planStep3">
        <span class="plan-step-num">3</span>
        <span class="plan-step-label">Vara framme</span>
        <span class="plan-step-time" id="planStepArrive"></span>
      </div>
    </div>

    <div class="timer-display" id="planCountdown" hidden></div>
    <button class="btn-ghost" id="planCancelBtn" hidden>Avbryt nedräkning</button>
  </div>

  <!-- Alarm pane -->
  <div class="clock-pane" id="clockPane-alarm" hidden>
    <div class="alarm-form">
      <div class="alarm-days-row">
        <button class="alarm-day-btn" data-day="1">Mån</button>
        <button class="alarm-day-btn" data-day="2">Tis</button>
        <button class="alarm-day-btn" data-day="3">Ons</button>
        <button class="alarm-day-btn" data-day="4">Tor</button>
        <button class="alarm-day-btn" data-day="5">Fre</button>
        <button class="alarm-day-btn" data-day="6">Lör</button>
        <button class="alarm-day-btn" data-day="0">Sön</button>
      </div>
      <div class="alarm-form-row">
        <input type="time" class="text-input" id="alarmTimeInput" />
        <div class="alarm-repeat-wrap">
          <span class="alarm-repeat-lbl">Upprepa</span>
          <label class="toggle-switch">
            <input type="checkbox" id="alarmRepeatToggle" />
            <span class="slider"></span>
          </label>
        </div>
      </div>
      <input type="text" class="text-input" id="alarmNoteInput" placeholder="Anteckning..." maxlength="80" />
      <div class="alarm-url-row">
        <input type="text" class="text-input" id="alarmLinkName" placeholder="Namn" maxlength="40" />
        <input type="url" class="text-input alarm-url-input" id="alarmLinkUrl" placeholder="URL" />
      </div>
      <div class="alarm-open-url-row">
        <span class="alarm-open-url-lbl">Öppna URL vid larm</span>
        <label class="toggle-switch">
          <input type="checkbox" id="alarmOpenUrl" />
          <span class="slider"></span>
        </label>
      </div>
      <div class="alarm-add-row">
        <button class="btn-primary" id="alarmAddBtn">+ Lägg till larm</button>
        <button class="btn-ghost" id="alarmCancelEdit" hidden>Avbryt</button>
      </div>
    </div>
    <ul class="alarm-list" id="alarmList"></ul>
    <p class="alarm-empty" id="alarmEmpty">Inga larm inställda</p>
  </div>

</div>`;

// ─── Day constants ─────────────────────────────────────────────────────────────
const DAY_DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mån first, Sön last
const DAY_NAMES = ['Sön', 'Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör'];

// ─── Week number (ISO 8601) ────────────────────────────────────────────────────
function getWeekNumber(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
}

// ─── Alarm sound (fallback beep) ───────────────────────────────────────────────
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

// ─── Chrome notification ───────────────────────────────────────────────────────
function notify(title, body, id) {
  if (!chrome.notifications) return;
  chrome.notifications.create(`rl-notif-${id || Date.now()}`, {
    type:               'basic',
    iconUrl:            chrome.runtime.getURL('icon.png'),
    title,
    message:            body,
    priority:           2,
    requireInteraction: true
  });
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
  setInterval(update, 60000);
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
  let startedAt    = null;

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

  function saveCooking() {
    Storage.set({
      clockTimerSet:       setSeconds,
      clockTimerRemaining: remaining,
      clockTimerRunning:   running,
      clockTimerStartedAt: startedAt
    });
  }

  async function loadCookingState() {
    const data = await Storage.get(['clockTimerSet', 'clockTimerRemaining', 'clockTimerRunning', 'clockTimerStartedAt']);

    if (data.clockTimerSet) setSeconds = data.clockTimerSet;

    const wasRunning = !!data.clockTimerRunning;
    const savedRem   = data.clockTimerRemaining ?? setSeconds;

    if (wasRunning && data.clockTimerStartedAt) {
      const elapsed = Math.floor((Date.now() - data.clockTimerStartedAt) / 1000);
      remaining = Math.max(0, savedRem - elapsed);
    } else {
      remaining = savedRem;
    }

    presets.forEach(b => b.classList.toggle('selected', parseInt(b.dataset.min, 10) * 60 === setSeconds));

    if (wasRunning && remaining > 0) {
      startedAt            = data.clockTimerStartedAt;
      running              = true;
      startBtn.textContent = 'Pausa';
      interval             = setInterval(tick, 1000);
    } else if (wasRunning && remaining <= 0) {
      remaining = 0;
      displayEl.classList.add('done');
      saveCooking();
    }

    updateDisplay();
  }

  function tick() {
    remaining--;
    updateDisplay();
    if (remaining <= 0) {
      remaining = 0;
      stop();
      displayEl.classList.add('done');
      alarmAudio   = playAlarmAudio();
      alarmPlaying = true;
      startBtn.textContent = 'Stop';
      notify('Matlagning klar!', 'Timern är klar.', 'cooking');
    }
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
    saveCooking();
  }

  function exitEditMode() {
    editWrap.hidden  = true;
    displayEl.hidden = false;
  }

  displayEl.addEventListener('click', enterEditMode);

  [editMin, editSec].forEach(inp => {
    inp.addEventListener('input', () => { inp.value = inp.value.replace(/\D/g, ''); });
    inp.addEventListener('focus', () => inp.select());
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter')  { e.preventDefault(); commitEdit(); }
      if (e.key === 'Escape') { exitEditMode(); }
    });
  });

  editMin.addEventListener('input', () => { if (editMin.value.length >= 2) editSec.focus(); });

  editWrap.addEventListener('focusout', e => {
    if (editWrap.contains(e.relatedTarget)) return;
    commitEdit();
  });

  decBtn.addEventListener('click', () => {
    if (running) { remaining = clamp(remaining - 30); }
    else { setSeconds = clamp(setSeconds - 30); remaining = setSeconds; }
    displayEl.classList.remove('done');
    updateDisplay();
    saveCooking();
  });

  incBtn.addEventListener('click', () => {
    if (running) { remaining = clamp(remaining + 30); }
    else { setSeconds = clamp(setSeconds + 30); remaining = setSeconds; }
    displayEl.classList.remove('done');
    updateDisplay();
    saveCooking();
  });

  function stop() {
    clearInterval(interval);
    interval  = null;
    running   = false;
    startedAt = null;
    startBtn.textContent = 'Start';
    saveCooking();
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
    saveCooking();
  }

  startBtn.addEventListener('click', () => {
    if (alarmPlaying) { stopAlarm(); return; }
    if (running) { stop(); return; }
    if (remaining <= 0) remaining = setSeconds;
    if (remaining <= 0) return;
    startedAt            = Date.now();
    running              = true;
    startBtn.textContent = 'Pausa';
    displayEl.classList.remove('done');
    saveCooking();
    interval = setInterval(tick, 1000);
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
      saveCooking();
    });
  });

  loadCookingState();
}

// ─── Planning tab ─────────────────────────────────────────────────────────────
function initPlanning() {
  const calcBtn      = document.getElementById('planCalcBtn');
  const saveBtn      = document.getElementById('planSaveBtn');
  const savedSelect  = document.getElementById('planSavedSelect');
  const savedDelBtn  = document.getElementById('planSavedDel');
  const countdownEl  = document.getElementById('planCountdown');
  const cancelBtn    = document.getElementById('planCancelBtn');
  const timelineEl   = document.getElementById('planTimeline');
  const stepWakeEl   = document.getElementById('planStepWake');
  const stepDepartEl = document.getElementById('planStepDepart');
  const stepArriveEl = document.getElementById('planStepArrive');
  const noteInput    = document.getElementById('planNote');
  const urlInput     = document.getElementById('planUrl');
  const step1        = document.getElementById('planStep1');
  const step2        = document.getElementById('planStep2');
  const step3        = document.getElementById('planStep3');

  let savedPlans   = [];
  let wakeH        = 0;
  let wakeM        = 0;
  let planInterval = null;
  let fired        = false;

  // ── Sparade planer ──────────────────────────────────────────────────────────
  async function loadSavedPlans() {
    const data = await Storage.get('clockSavedPlans');
    savedPlans = Array.isArray(data.clockSavedPlans) ? data.clockSavedPlans : [];
    renderSavedSelect();
  }

  function renderSavedSelect() {
    const cur = savedSelect.value;
    savedSelect.innerHTML = '<option value="">— Sparade planer —</option>';
    for (const p of savedPlans) {
      const opt       = document.createElement('option');
      opt.value       = p.id;
      opt.textContent = p.label;
      savedSelect.appendChild(opt);
    }
    if (cur && savedPlans.some(p => p.id === cur)) {
      savedSelect.value  = cur;
      savedDelBtn.hidden = false;
    } else {
      savedSelect.value  = '';
      savedDelBtn.hidden = true;
    }
  }

  savedSelect?.addEventListener('change', () => {
    const id = savedSelect.value;
    savedDelBtn.hidden = !id;
    if (!id) return;
    const plan = savedPlans.find(p => p.id === id);
    if (!plan) return;
    document.getElementById('planArrival').value   = plan.arrival   ?? '';
    document.getElementById('planPrepMin').value    = plan.prepMin   != null ? plan.prepMin   : '';
    document.getElementById('planTravelMin').value  = plan.travelMin != null ? plan.travelMin : '';
    noteInput.value = plan.note ?? '';
    urlInput.value  = plan.url  ?? '';
  });

  savedDelBtn?.addEventListener('click', async () => {
    const id = savedSelect.value;
    if (!id) return;
    savedPlans = savedPlans.filter(p => p.id !== id);
    await Storage.set({ clockSavedPlans: savedPlans });
    renderSavedSelect();
  });

  saveBtn?.addEventListener('click', async () => {
    const arrival   = document.getElementById('planArrival').value;
    const prepMin   = parseInt(document.getElementById('planPrepMin').value,   10);
    const travelMin = parseInt(document.getElementById('planTravelMin').value, 10);
    const note      = noteInput?.value.trim() ?? '';
    const url       = urlInput?.value.trim()  ?? '';
    const label     = note || (arrival ? `Ankomst ${arrival}` : `Plan ${savedPlans.length + 1}`);

    const existingId = savedSelect.value;
    if (existingId) {
      const idx = savedPlans.findIndex(p => p.id === existingId);
      if (idx >= 0) savedPlans[idx] = {
        ...savedPlans[idx], label, arrival,
        prepMin:   isNaN(prepMin)   ? 0 : prepMin,
        travelMin: isNaN(travelMin) ? 0 : travelMin,
        note, url
      };
    } else {
      savedPlans.push({
        id: Date.now().toString(36), label, arrival,
        prepMin:   isNaN(prepMin)   ? 0 : prepMin,
        travelMin: isNaN(travelMin) ? 0 : travelMin,
        note, url
      });
    }

    await Storage.set({ clockSavedPlans: savedPlans });
    renderSavedSelect();

    if (!existingId) {
      savedSelect.value  = savedPlans[savedPlans.length - 1].id;
      savedDelBtn.hidden = false;
    }

    const orig = saveBtn.textContent;
    saveBtn.textContent = 'Sparad!';
    setTimeout(() => { saveBtn.textContent = orig; }, 1500);
  });

  // ── Nedräkning ──────────────────────────────────────────────────────────────
  function stopCountdown() {
    clearInterval(planInterval);
    planInterval = null;
    countdownEl.hidden = true;
    cancelBtn.hidden   = true;
    countdownEl.classList.remove('done');
    fired = false;
    [step1, step2, step3].forEach(s => s?.classList.remove('active'));
  }

  function startPlanCountdown(planUrl) {
    stopCountdown();
    cancelBtn.hidden = false;

    // Markera första synliga steget som aktivt (nästa sak att göra)
    const firstVisible = [step1, step2, step3].find(s => s && !s.hidden);
    firstVisible?.classList.add('active');

    function tick() {
      const now      = new Date();
      const nowSecs  = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
      const wakeSecs = wakeH * 3600 + wakeM * 60;
      let diff       = wakeSecs - nowSecs;
      if (diff < -3600) diff += 86400;

      if (diff <= 0 && !fired) {
        fired = true;
        clearInterval(planInterval);
        countdownEl.textContent = 'Dags att stiga upp!';
        countdownEl.classList.add('done');
        countdownEl.hidden = false;
        playAlarmAudio();
        if (planUrl) chrome.tabs.create({ url: planUrl }).catch(() => {});
        notify('Dags att stiga upp!',
          `Uppstigningstid ${String(wakeH).padStart(2,'0')}:${String(wakeM).padStart(2,'0')}`,
          'planning');
        return;
      }

      if (diff > 0) {
        countdownEl.textContent = fmtTime(diff);
        countdownEl.hidden      = false;
      }
    }

    tick();
    planInterval = setInterval(tick, 1000);
  }

  cancelBtn?.addEventListener('click', () => {
    stopCountdown();
    timelineEl.hidden = true;
  });

  // ── Räkna ut ────────────────────────────────────────────────────────────────
  calcBtn?.addEventListener('click', () => {
    const arrivalVal = document.getElementById('planArrival').value;
    const prepMin    = parseInt(document.getElementById('planPrepMin').value,   10) || 0;
    const travelMin  = parseInt(document.getElementById('planTravelMin').value, 10) || 0;
    const planUrl    = urlInput?.value.trim() ?? '';

    if (!arrivalVal) { stopCountdown(); timelineEl.hidden = true; return; }

    const [ah, am] = arrivalVal.split(':').map(Number);
    const arrMins  = ah * 60 + am;
    const depMins  = ((arrMins - travelMin)           % 1440 + 1440) % 1440;
    const wakeMins = ((arrMins - travelMin - prepMin)  % 1440 + 1440) % 1440;

    wakeH = Math.floor(wakeMins / 60);
    wakeM = wakeMins % 60;

    const fmt = (h, m) => `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;

    stepWakeEl.textContent   = fmt(wakeH, wakeM);
    stepDepartEl.textContent = fmt(Math.floor(depMins / 60), depMins % 60);
    stepArriveEl.textContent = arrivalVal;

    // Visa/dölj steg + numrera om dynamiskt
    step1.hidden = prepMin   === 0;
    step2.hidden = travelMin === 0;

    let num = 1;
    if (!step1.hidden) step1.querySelector('.plan-step-num').textContent = num++;
    if (!step2.hidden) step2.querySelector('.plan-step-num').textContent = num++;
    step3.querySelector('.plan-step-num').textContent = num;

    timelineEl.hidden = false;
    startPlanCountdown(planUrl);
  });

  loadSavedPlans();
}

// ─── Alarm audio helpers ───────────────────────────────────────────────────────
let alarms           = [];
let currentAlarmSrc  = 'assets/ready-to-roll-out.mp3';
// Sätts av initAlarms() — används av renderAlarms() för edit-knapp
let _enterAlarmEdit  = null;
let alarmVolume      = 0.6;

function fadeInAudio(audio, targetVol, durationMs) {
  const steps  = 40;
  const stepMs = durationMs / steps;
  const stepVol = targetVol / steps;
  let current = 0;
  const id = setInterval(() => {
    current++;
    audio.volume = Math.min(targetVol, stepVol * current);
    if (current >= steps) clearInterval(id);
  }, stepMs);
}

function playAlarmAudio() {
  try {
    const audio = new Audio(chrome.runtime.getURL(currentAlarmSrc));
    audio.volume = 0;
    audio.play()
      .then(() => fadeInAudio(audio, alarmVolume, 2000))
      .catch(() => playAlarmSound());
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

// ─── Render alarm list ─────────────────────────────────────────────────────────
function renderAlarms() {
  const list    = document.getElementById('alarmList');
  const emptyEl = document.getElementById('alarmEmpty');
  if (!list) return;
  list.innerHTML = '';

  alarms.forEach(alarm => {
    const li = document.createElement('li');
    li.className  = 'alarm-item';
    li.dataset.id = alarm.id;

    const activeDays = alarm.days && alarm.days.length > 0
      ? DAY_DISPLAY_ORDER.filter(d => alarm.days.includes(d))
      : [];

    const daysHtml = activeDays.length > 0
      ? activeDays.map(d => `<span class="alarm-day-tag">${DAY_NAMES[d]}</span>`).join('')
      : '<span class="alarm-day-tag alarm-day-tag--all">Varje dag</span>';

    const badgeHtml = alarm.repeat
      ? '<span class="alarm-badge alarm-badge--repeat">Upprepar</span>'
      : '<span class="alarm-badge">En gång</span>';

    li.innerHTML = `
      <div class="alarm-item-top">
        <div class="alarm-item-tags">
          ${daysHtml}
          ${badgeHtml}
        </div>
        <div class="alarm-item-actions">
          <label class="toggle-switch">
            <input type="checkbox" class="alarm-toggle" ${alarm.enabled ? 'checked' : ''} />
            <span class="slider"></span>
          </label>
          <button class="alarm-item-edit" title="Redigera">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="alarm-item-del" title="Ta bort">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>
      <div class="alarm-item-time">${alarm.time}</div>
      ${(alarm.label || alarm.linkUrl) ? `<div class="alarm-item-bottom">
        ${alarm.label ? `<span class="alarm-item-note">${alarm.label}</span>` : ''}
        ${alarm.label && alarm.linkUrl ? `<span class="alarm-item-sep">·</span>` : ''}
        ${alarm.linkUrl ? `<button class="alarm-item-link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          ${alarm.linkName || 'Öppna länk'}
        </button>` : ''}
      </div>` : ''}
    `;

    li.querySelector('.alarm-toggle').addEventListener('change', async e => {
      alarm.enabled = e.target.checked;
      await saveAlarms();
    });

    // Ta bort med bekräftelse
    const delBtn     = li.querySelector('.alarm-item-del');
    const delOrigHTML = delBtn.innerHTML;
    let delTimeout   = null;

    delBtn.addEventListener('click', async () => {
      if (delBtn.dataset.confirming) {
        clearTimeout(delTimeout);
        alarms = alarms.filter(a => a.id !== alarm.id);
        await saveAlarms();
        li.remove();
        emptyEl.hidden = alarms.length > 0;
      } else {
        delBtn.dataset.confirming = '1';
        delBtn.classList.add('confirming');
        delBtn.textContent = 'Säker?';
        delTimeout = setTimeout(() => {
          delete delBtn.dataset.confirming;
          delBtn.classList.remove('confirming');
          delBtn.innerHTML = delOrigHTML;
        }, 3000);
      }
    });

    li.querySelector('.alarm-item-link')?.addEventListener('click', () => {
      chrome.tabs.create({ url: alarm.linkUrl }).catch(() => {});
    });

    li.querySelector('.alarm-item-edit').addEventListener('click', () => {
      _enterAlarmEdit?.(alarm);
    });

    list.appendChild(li);
  });

  emptyEl.hidden = alarms.length > 0;
}

// ─── Alarms tab ────────────────────────────────────────────────────────────────
function initAlarms() {
  loadAlarms();

  // ── Receive alarm fired from background service worker ──────────────────────
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type !== 'RL_ALARM_FIRED') return;
    playAlarmAudio();

    // Öppna URL om inställt
    const fired = alarms.find(a => a.id === msg.alarmId);
    if (fired?.openUrlOnFire && fired?.linkUrl) {
      chrome.tabs.create({ url: fired.linkUrl }).catch(() => {});
    }

    const el = document.querySelector(`.alarm-item[data-id="${msg.alarmId}"]`);
    if (el) {
      el.classList.add('firing');
      setTimeout(() => el.classList.remove('firing'), 60000);
    }
    loadAlarms();
  });

  // ── Sound picker ────────────────────────────────────────────────────────────
  const soundBtn    = document.getElementById('alarmSoundBtn');
  const soundPicker = document.getElementById('alarmSoundPicker');
  const soundOpts   = document.querySelectorAll('.alarm-sound-opt');
  const volSlider   = document.getElementById('alarmVolumeSlider');

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

  Storage.get(['alarmSound', 'alarmVolume']).then(data => {
    if (data.alarmSound)      currentAlarmSrc = data.alarmSound;
    if (data.alarmVolume != null) {
      alarmVolume     = data.alarmVolume;
      volSlider.value = Math.round(alarmVolume * 100);
    }
    updateSoundUI();
  });

  volSlider.addEventListener('input', () => {
    alarmVolume = volSlider.value / 100;
    Storage.set({ alarmVolume });
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
    if (!wasHidden) stopPreview();
  });

  soundOpts.forEach(opt => {
    const playBtn  = opt.querySelector('.sound-play-btn');
    const iconPlay = opt.querySelector('.icon-play');
    const iconStop = opt.querySelector('.icon-stop');
    const src      = opt.dataset.src;

    playBtn.addEventListener('click', e => {
      e.stopPropagation();
      if (previewSrc === src && previewAudio && !previewAudio.paused) {
        stopPreview();
      } else {
        stopPreview();
        previewAudio        = new Audio(chrome.runtime.getURL(src));
        previewAudio.volume = alarmVolume;
        previewSrc          = src;
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

  // ── Day picker ──────────────────────────────────────────────────────────────
  let selectedDays = [];
  const dayBtns    = document.querySelectorAll('.alarm-day-btn');

  dayBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const day = parseInt(btn.dataset.day, 10);
      if (selectedDays.includes(day)) {
        selectedDays = selectedDays.filter(d => d !== day);
        btn.classList.remove('active');
      } else {
        selectedDays.push(day);
        btn.classList.add('active');
      }
    });
  });

  // ── Edit mode ────────────────────────────────────────────────────────────────
  let editingAlarmId = null;

  const addBtn        = document.getElementById('alarmAddBtn');
  const cancelEditBtn = document.getElementById('alarmCancelEdit');
  const openUrlToggle = document.getElementById('alarmOpenUrl');

  function resetAlarmForm() {
    document.getElementById('alarmTimeInput').value      = '';
    document.getElementById('alarmNoteInput').value      = '';
    document.getElementById('alarmRepeatToggle').checked = false;
    document.getElementById('alarmLinkName').value       = '';
    document.getElementById('alarmLinkUrl').value        = '';
    openUrlToggle.checked = false;
    selectedDays          = [];
    dayBtns.forEach(b => b.classList.remove('active'));
    editingAlarmId       = null;
    addBtn.textContent   = '+ Lägg till larm';
    cancelEditBtn.hidden = true;
  }

  function enterEditMode(alarm) {
    document.getElementById('alarmTimeInput').value      = alarm.time;
    document.getElementById('alarmNoteInput').value      = alarm.label        || '';
    document.getElementById('alarmRepeatToggle').checked = alarm.repeat       || false;
    document.getElementById('alarmLinkName').value       = alarm.linkName     || '';
    document.getElementById('alarmLinkUrl').value        = alarm.linkUrl      || '';
    openUrlToggle.checked = alarm.openUrlOnFire || false;
    selectedDays = [...(alarm.days || [])];
    dayBtns.forEach(b => b.classList.toggle('active', selectedDays.includes(parseInt(b.dataset.day, 10))));
    editingAlarmId       = alarm.id;
    addBtn.textContent   = 'Spara ändringar';
    cancelEditBtn.hidden = false;
    addBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // Exponera till renderAlarms()
  _enterAlarmEdit = enterEditMode;

  cancelEditBtn?.addEventListener('click', resetAlarmForm);

  // ── Add / save alarm ─────────────────────────────────────────────────────────
  addBtn.addEventListener('click', async () => {
    const t = document.getElementById('alarmTimeInput').value;
    if (!t) return;

    const alarmData = {
      time:         t,
      days:         DAY_DISPLAY_ORDER.filter(d => selectedDays.includes(d)),
      repeat:       document.getElementById('alarmRepeatToggle').checked,
      label:        document.getElementById('alarmNoteInput').value.trim(),
      linkName:     document.getElementById('alarmLinkName').value.trim(),
      linkUrl:      document.getElementById('alarmLinkUrl').value.trim(),
      openUrlOnFire: openUrlToggle.checked,
      enabled:      true
    };

    if (editingAlarmId) {
      const idx = alarms.findIndex(a => a.id === editingAlarmId);
      if (idx >= 0) alarms[idx] = { ...alarms[idx], ...alarmData };
    } else {
      alarms.push({ id: Date.now().toString(36), ...alarmData });
    }

    await saveAlarms();
    renderAlarms();
    resetAlarmForm();
  });
}

// ─── Public init ──────────────────────────────────────────────────────────────
export function init() {
  startDateHeader();
  initClockTabs();
  initCooking();
  initPlanning();
  initAlarms();
}
