// video-recorder/recorder-tab.js — Recorder settings tab UI

// ─── Init settings tab ────────────────────────────────────────────────────────
export function initRecorderTab() {
  setupSegGroup('recSizeLimit', 'recorderSizeLimit');
  setupSegGroup('recFormat',    'recorderFormat');
  setupSegGroup('recAudio',     'recorderAudio');
}

// ─── Load saved settings into UI ─────────────────────────────────────────────
export async function loadRecorderSettings() {
  const s = await Storage.getAll();
  setSegValue('recSizeLimit', String(s.recorderSizeLimit ?? '10'));
  setSegValue('recFormat',    s.recorderFormat ?? 'webm');
  setSegValue('recAudio',     s.recorderAudio  ?? 'tab');
}

// ─── Read current settings (used by recorder-home.js) ────────────────────────
export async function getRecorderSettings() {
  const s = await Storage.getAll();
  return {
    sizeLimitMb: Number(s.recorderSizeLimit ?? 10),
    format:      s.recorderFormat ?? 'webm',
    audioMode:   s.recorderAudio  ?? 'tab',
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function setupSegGroup(groupId, storageKey) {
  const group = document.getElementById(groupId);
  if (!group) return;
  group.querySelectorAll('.seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('seg-disabled')) return;
      group.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      Storage.set({ [storageKey]: btn.dataset.value });
    });
  });
}

function setSegValue(groupId, value) {
  const group = document.getElementById(groupId);
  if (!group) return;
  group.querySelectorAll('.seg-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.value === value);
  });
}
