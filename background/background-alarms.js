// background-alarms.js — Schedules chrome.alarms for clock alarms and fires notifications

const ALARM_PREFIX = 'rl-alarm-';

// ─── Calculate next fire time ──────────────────────────────────────────────────
// afterMs: epoch ms to search from (default: now)
function nextFireTime(alarm, afterMs = Date.now()) {
  const [h, m]    = alarm.time.split(':').map(Number);
  const activeDays = alarm.days && alarm.days.length > 0
    ? alarm.days
    : [0, 1, 2, 3, 4, 5, 6]; // empty = every day

  for (let offset = 0; offset < 8; offset++) {
    const d = new Date(afterMs);
    d.setDate(d.getDate() + offset);
    d.setHours(h, m, 0, 0);

    if (d.getTime() <= afterMs) continue;
    if (activeDays.includes(d.getDay())) return d.getTime();
  }
  return null;
}

// ─── Reschedule all enabled alarms ────────────────────────────────────────────
async function rescheduleAlarms() {
  // Clear all existing rl-alarm-* chrome alarms
  const existing = await chrome.alarms.getAll();
  for (const a of existing) {
    if (a.name.startsWith(ALARM_PREFIX)) await chrome.alarms.clear(a.name);
  }

  const { clockAlarms } = await chrome.storage.local.get('clockAlarms');
  if (!Array.isArray(clockAlarms)) return;

  for (const alarm of clockAlarms) {
    if (!alarm.enabled) continue;
    const when = nextFireTime(alarm);
    if (when) {
      chrome.alarms.create(ALARM_PREFIX + alarm.id, { when });
    }
  }
}

// ─── Handle alarm fire ────────────────────────────────────────────────────────
chrome.alarms.onAlarm.addListener(async (chromeAlarm) => {
  if (!chromeAlarm.name.startsWith(ALARM_PREFIX)) return;

  const alarmId = chromeAlarm.name.slice(ALARM_PREFIX.length);
  const { clockAlarms } = await chrome.storage.local.get('clockAlarms');
  const alarm = clockAlarms?.find(a => a.id === alarmId);
  if (!alarm || !alarm.enabled) return;

  // ── Windows / Chrome notification ─────────────────────────────────────────
  const msg = alarm.label
    ? `${alarm.time} — ${alarm.label}`
    : alarm.time;

  chrome.notifications.create(`rl-notif-${alarmId}-${Date.now()}`, {
    type:               'basic',
    iconUrl:            'icon.png',
    title:              'Larm',
    message:            msg,
    priority:           2,
    requireInteraction: true
  });

  // ── Send message to side panel for audio playback ─────────────────────────
  chrome.runtime.sendMessage({ type: 'RL_ALARM_FIRED', alarmId, time: alarm.time, label: alarm.label })
    .catch(() => {}); // side panel may not be open

  // ── Update storage if one-time alarm ─────────────────────────────────────
  if (!alarm.repeat) {
    const updated = clockAlarms.map(a =>
      a.id === alarmId ? { ...a, enabled: false } : a
    );
    await chrome.storage.local.set({ clockAlarms: updated });
    return; // do not reschedule
  }

  // ── Reschedule repeating alarm for next occurrence ────────────────────────
  const next = nextFireTime(alarm, Date.now() + 60000); // +1 min to skip current minute
  if (next) {
    chrome.alarms.create(ALARM_PREFIX + alarmId, { when: next });
  }
});

// ─── Init ─────────────────────────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => rescheduleAlarms());

// Reschedule when alarm data changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && 'clockAlarms' in changes) rescheduleAlarms();
});
