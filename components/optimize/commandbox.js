// components/optimize/commandbox.js

// ======================================================
// COMMAND BOX - REBUILT VERSION
// Presets + grouped commands + info panel + safer combo
// ======================================================

// ======================================================
// COMMAND DATA
// ======================================================
const COMMANDS = [
  // ---------------------------
  // NEW PC / GAMING / STARTUP
  // ---------------------------
  {
    id: 'disable-game-dvr',
    title: 'Disable Game DVR',
    description: 'Disables Xbox background game recording to reduce unnecessary background activity.',
    details: 'Useful on gaming PCs where background recording is not needed. Can reduce small amounts of overhead.',
    group: 'Gaming',
    type: 'cmd',
    command: 'reg add HKCU\\System\\GameConfigStore /v GameDVR_Enabled /t REG_DWORD /d 0 /f',
    risk: 'low',
    requiresAdmin: false,
    runType: 'safe-chain',
    priority: 100,
    conflictsWith: [],
    comboGroup: null
  },
  {
    id: 'disable-game-bar',
    title: 'Disable Xbox Game Bar',
    description: 'Turns off Xbox Game Bar background features.',
    details: 'Useful if the user does not use Game Bar overlays, captures, or shortcuts.',
    group: 'Gaming',
    type: 'cmd',
    command: 'reg add "HKCU\\SOFTWARE\\Microsoft\\GameBar" /v AutoGameModeEnabled /t REG_DWORD /d 0 /f && reg add "HKCU\\SOFTWARE\\Microsoft\\GameBar" /v ShowStartupPanel /t REG_DWORD /d 0 /f',
    risk: 'medium',
    requiresAdmin: false,
    runType: 'safe-chain',
    priority: 110,
    conflictsWith: [],
    comboGroup: null
  },
  {
    id: 'disable-mouse-acc',
    title: 'Disable Mouse Acceleration',
    description: 'Turns off Enhance Pointer Precision for more consistent mouse movement.',
    details: 'Common gaming tweak. Makes mouse movement more raw and predictable.',
    group: 'Gaming',
    type: 'cmd',
    command: 'reg add "HKCU\\Control Panel\\Mouse" /v MouseSpeed /t REG_SZ /d 0 /f && reg add "HKCU\\Control Panel\\Mouse" /v MouseThreshold1 /t REG_SZ /d 0 /f && reg add "HKCU\\Control Panel\\Mouse" /v MouseThreshold2 /t REG_SZ /d 0 /f',
    risk: 'medium',
    requiresAdmin: false,
    runType: 'safe-chain',
    priority: 120,
    conflictsWith: [],
    comboGroup: null
  },
  {
    id: 'disable-startup-delay',
    title: 'Disable Startup Delay',
    description: 'Removes the delay Windows adds before startup apps launch.',
    details: 'Can make startup apps open a bit faster after login.',
    group: 'Performance',
    type: 'cmd',
    command: 'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Serialize" /v StartupDelayInMSec /t REG_DWORD /d 0 /f',
    risk: 'low',
    requiresAdmin: false,
    runType: 'safe-chain',
    priority: 130,
    conflictsWith: [],
    comboGroup: null
  },
  {
    id: 'disable-ad-id',
    title: 'Disable Advertising ID',
    description: 'Turns off app advertising ID tracking.',
    details: 'Privacy tweak that reduces personalized ad tracking across supported apps.',
    group: 'Privacy',
    type: 'cmd',
    command: 'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo" /v Enabled /t REG_DWORD /d 0 /f',
    risk: 'medium',
    requiresAdmin: false,
    runType: 'safe-chain',
    priority: 140,
    conflictsWith: [],
    comboGroup: null
  },
  {
    id: 'disable-feedback',
    title: 'Disable Feedback Prompts',
    description: 'Reduces Windows feedback request popups.',
    details: 'Useful if the user does not want Windows asking for feedback occasionally.',
    group: 'Privacy',
    type: 'cmd',
    command: 'reg add "HKCU\\Software\\Microsoft\\Siuf\\Rules" /v NumberOfSIUFInPeriod /t REG_DWORD /d 0 /f',
    risk: 'medium',
    requiresAdmin: false,
    runType: 'safe-chain',
    priority: 150,
    conflictsWith: [],
    comboGroup: null
  },

  // ---------------------------
  // PERFORMANCE
  // ---------------------------
  {
    id: 'high-performance',
    title: 'High Performance Plan',
    description: 'Switches Windows to the High Performance power plan.',
    details: 'Can reduce power-saving behavior and keep hardware more responsive.',
    group: 'Performance',
    type: 'cmd',
    command: 'powercfg -setactive SCHEME_MIN',
    risk: 'medium',
    requiresAdmin: true,
    runType: 'safe-chain',
    priority: 200,
    conflictsWith: ['ultimate-performance'],
    comboGroup: 'power-plan'
  },
  {
    id: 'ultimate-performance',
    title: 'Ultimate Performance Plan',
    description: 'Creates and enables Ultimate Performance when available.',
    details: 'More aggressive than High Performance. Best suited for desktops and advanced users.',
    group: 'Performance',
    type: 'cmd',
    command: 'powercfg -duplicatescheme e9a42b02-d5df-448d-aa00-03f14749eb61 && for /f "tokens=3" %a in (\'powercfg -list ^| findstr "Ultimate Performance"\') do powercfg -setactive %a',
    risk: 'high',
    requiresAdmin: true,
    runType: 'safe-chain',
    priority: 210,
    conflictsWith: ['high-performance'],
    comboGroup: 'power-plan'
  },
  {
    id: 'disable-hibernation',
    title: 'Disable Hibernation',
    description: 'Turns off hibernation and removes hiberfil.sys.',
    details: 'Can free disk space, but disables hibernation and can affect fast startup behavior.',
    group: 'Performance',
    type: 'cmd',
    command: 'powercfg -h off',
    risk: 'medium',
    requiresAdmin: true,
    runType: 'safe-chain',
    priority: 220,
    conflictsWith: [],
    comboGroup: null
  },
  {
    id: 'enable-hags',
    title: 'Enable HAGS',
    description: 'Enables Hardware Accelerated GPU Scheduling.',
    details: 'May improve performance or smoothness on some systems, but can also cause issues on others.',
    group: 'Gaming',
    type: 'cmd',
    command: 'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers" /v HwSchMode /t REG_DWORD /d 2 /f',
    risk: 'high',
    requiresAdmin: true,
    runType: 'safe-chain',
    priority: 230,
    conflictsWith: [],
    comboGroup: null
  },

  // ---------------------------
  // CLEAN
  // ---------------------------
  {
    id: 'flush-dns',
    title: 'Flush DNS',
    description: 'Clears the DNS cache.',
    details: 'Useful after DNS changes or when troubleshooting website connection issues.',
    group: 'Network',
    type: 'cmd',
    command: 'ipconfig /flushdns',
    risk: 'low',
    requiresAdmin: false,
    runType: 'safe-chain',
    priority: 300,
    conflictsWith: [],
    comboGroup: null
  },
  {
    id: 'clear-temp',
    title: 'Clear Temp Files',
    description: 'Deletes files in the current user temp folder.',
    details: 'Can free space and remove junk files, but some temporary files may be in use and skipped.',
    group: 'Cleanup',
    type: 'cmd',
    command: 'del /q /f /s "%TEMP%\\*"',
    risk: 'medium',
    requiresAdmin: false,
    runType: 'separate',
    priority: 310,
    conflictsWith: [],
    comboGroup: null
  },
  {
    id: 'restart-explorer',
    title: 'Restart Explorer',
    description: 'Restarts Windows Explorer.',
    details: 'Useful after UI tweaks or if the taskbar / desktop becomes unstable.',
    group: 'System',
    type: 'cmd',
    command: 'taskkill /f /im explorer.exe && start explorer.exe',
    risk: 'medium',
    requiresAdmin: false,
    runType: 'separate',
    priority: 320,
    conflictsWith: [],
    comboGroup: null
  },

  // ---------------------------
  // ADVANCED / REPAIR
  // ---------------------------
  {
    id: 'renew-ip',
    title: 'Renew IP',
    description: 'Releases and renews the current IP configuration.',
    details: 'Useful if the PC has network issues or got a bad local IP address.',
    group: 'Network',
    type: 'cmd',
    command: 'ipconfig /release && ipconfig /renew',
    risk: 'medium',
    requiresAdmin: true,
    runType: 'separate',
    priority: 400,
    conflictsWith: [],
    comboGroup: null
  },
  {
    id: 'reset-winsock',
    title: 'Reset Winsock',
    description: 'Repairs Windows socket configuration.',
    details: 'Used for network troubleshooting. Often requires restart afterward.',
    group: 'Network',
    type: 'cmd',
    command: 'netsh winsock reset',
    risk: 'high',
    requiresAdmin: true,
    runType: 'separate',
    priority: 410,
    conflictsWith: [],
    comboGroup: null
  },
  {
    id: 'reset-ip-stack',
    title: 'Reset IP Stack',
    description: 'Resets TCP/IP settings.',
    details: 'Useful for deeper network repair, but it is more aggressive than flushing DNS.',
    group: 'Network',
    type: 'cmd',
    command: 'netsh int ip reset',
    risk: 'high',
    requiresAdmin: true,
    runType: 'separate',
    priority: 420,
    conflictsWith: [],
    comboGroup: null
  },
  {
    id: 'disable-telemetry',
    title: 'Disable Telemetry',
    description: 'Reduces Windows telemetry.',
    details: 'Privacy-focused tweak. Some Windows diagnostics and data collection are limited.',
    group: 'Privacy',
    type: 'cmd',
    command: 'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection" /v AllowTelemetry /t REG_DWORD /d 0 /f',
    risk: 'high',
    requiresAdmin: true,
    runType: 'safe-chain',
    priority: 430,
    conflictsWith: [],
    comboGroup: null
  },
  {
    id: 'disable-location',
    title: 'Disable Location Access',
    description: 'Turns off Windows location services.',
    details: 'Useful for privacy, but apps that rely on location may stop working correctly.',
    group: 'Privacy',
    type: 'cmd',
    command: 'reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\location" /v Value /t REG_SZ /d Deny /f',
    risk: 'high',
    requiresAdmin: true,
    runType: 'safe-chain',
    priority: 440,
    conflictsWith: [],
    comboGroup: null
  },
  {
    id: 'sfc-scan',
    title: 'Run SFC Scan',
    description: 'Checks and repairs protected Windows system files.',
    details: 'Can help if Windows files are damaged or missing. Usually takes time.',
    group: 'Repair',
    type: 'cmd',
    command: 'sfc /scannow',
    risk: 'high',
    requiresAdmin: true,
    runType: 'separate',
    priority: 500,
    conflictsWith: [],
    comboGroup: null
  },
  {
    id: 'dism-restore',
    title: 'DISM RestoreHealth',
    description: 'Repairs the Windows image used for system recovery and file repair.',
    details: 'Often used before or together with SFC when Windows is corrupted.',
    group: 'Repair',
    type: 'cmd',
    command: 'DISM /Online /Cleanup-Image /RestoreHealth',
    risk: 'high',
    requiresAdmin: true,
    runType: 'separate',
    priority: 510,
    conflictsWith: [],
    comboGroup: null
  },
  {
    id: 'check-disk',
    title: 'Check Disk',
    description: 'Runs a file system scan on drive C.',
    details: 'Useful when diagnosing disk or file system issues. Can take time.',
    group: 'Repair',
    type: 'cmd',
    command: 'chkdsk C: /scan',
    risk: 'high',
    requiresAdmin: true,
    runType: 'separate',
    priority: 520,
    conflictsWith: [],
    comboGroup: null
  }
];

// ======================================================
// PRESETS
// ======================================================
const PRESETS = {
  newpc: [
    'disable-game-dvr',
    'disable-game-bar',
    'disable-mouse-acc',
    'disable-startup-delay',
    'disable-ad-id',
    'disable-feedback',
    'high-performance'
  ],
  clean: [
    'flush-dns',
    'clear-temp',
    'restart-explorer'
  ],
  tweak: [
    'enable-hags',
    'ultimate-performance',
    'disable-hibernation',
    'disable-telemetry',
    'disable-location'
  ]
};

// ======================================================
// STATE
// ======================================================
let selectedIds = new Set();
let openGroups = new Set(['Gaming', 'Performance', 'Cleanup']);
let openInfoIds = new Set();
let currentPreset = null;

// ======================================================
// TEMPLATE
// ======================================================
export const template = `
  <div class="card">
    <label class="section-label">Optimize</label>

    <p class="opt-intro">Build command combos, use presets, and inspect each tweak before running it.</p>

    <div class="opt-preset-row">
      <button class="opt-preset-btn" id="presetNewPcBtn" data-preset="newpc">New PC</button>
      <button class="opt-preset-btn" id="presetCleanBtn" data-preset="clean">Clean</button>
      <button class="opt-preset-btn" id="presetTweakBtn" data-preset="tweak">Tweak</button>
    </div>

    <div class="opt-toolbar">
      <div class="opt-mode-row">
        <button class="opt-mode-btn active" id="modeCmdBtn" data-mode="cmd">CMD</button>
        <button class="opt-mode-btn" id="modePsBtn" data-mode="powershell">PowerShell</button>
      </div>
      <input
        id="optSearchInput"
        class="opt-search-input"
        type="text"
        placeholder="Search commands..."
      />
    </div>

    <div id="optPresetInfo" class="opt-preset-info">No preset selected.</div>

    <div id="optCommandList" class="opt-command-list"></div>

    <textarea
      id="optCommandBox"
      class="opt-output-box"
      placeholder="Selected commands will appear here..."
      readonly
    ></textarea>

    <div class="opt-actions">
      <button class="opt-copy-btn" id="optCopyBtn">Copy combo</button>
      <button class="opt-clear-btn" id="optClearBtn">Clear</button>
    </div>

    <div class="opt-status" id="optStatus">No commands selected.</div>
  </div>
`;

// ======================================================
// INIT
// ======================================================
export function init() {
  renderCommandList();
  bindModeButtons();
  bindPresetButtons();
  bindActionButtons();
  bindSearch();
  updatePresetInfo();
  updateCommandBox();
}

// ======================================================
// HELPERS
// ======================================================
function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getCurrentMode() {
  const cmdBtn = document.getElementById('modeCmdBtn');
  if (!cmdBtn) return 'cmd';
  return cmdBtn.classList.contains('active') ? 'cmd' : 'powershell';
}

function setMode(mode) {
  const cmdBtn = document.getElementById('modeCmdBtn');
  const psBtn = document.getElementById('modePsBtn');

  if (!cmdBtn || !psBtn) return;

  cmdBtn.classList.toggle('active', mode === 'cmd');
  psBtn.classList.toggle('active', mode === 'powershell');

  updateCommandBox();
}

function getSearchValue() {
  const input = document.getElementById('optSearchInput');
  return input ? input.value.trim().toLowerCase() : '';
}

function getRiskLabel(risk) {
  if (risk === 'high') return 'Sensitive';
  if (risk === 'medium') return 'Careful';
  return 'Safe';
}

function getFilteredCommands() {
  const search = getSearchValue();
  if (!search) return COMMANDS;

  return COMMANDS.filter(item => {
    const haystack = `
      ${item.title}
      ${item.description}
      ${item.details}
      ${item.group}
      ${item.command}
      ${item.risk}
    `.toLowerCase();

    return haystack.includes(search);
  });
}

function getGroupedCommands(commands) {
  const groups = {};

  commands.forEach(item => {
    if (!groups[item.group]) groups[item.group] = [];
    groups[item.group].push(item);
  });

  return groups;
}

function getSelectedCommandObjects() {
  return COMMANDS.filter(item => selectedIds.has(item.id));
}

function resolveSelectedCommands(selectedCommands) {
  let working = [...selectedCommands];

  const comboGroupMap = new Map();

  working.forEach(item => {
    if (!item.comboGroup) return;
    const existing = comboGroupMap.get(item.comboGroup);

    if (!existing || item.priority > existing.priority) {
      comboGroupMap.set(item.comboGroup, item);
    }
  });

  working = working.filter(item => {
    if (!item.comboGroup) return true;
    return comboGroupMap.get(item.comboGroup)?.id === item.id;
  });

  const keptIds = new Set(working.map(item => item.id));

  working = working.filter(item => {
    return !item.conflictsWith.some(conflictId => keptIds.has(conflictId));
  });

  working.sort((a, b) => a.priority - b.priority);

  return working;
}

function getSafeComboData() {
  const selected = getSelectedCommandObjects();
  const resolved = resolveSelectedCommands(selected);

  return {
    selected,
    resolved,
    safeChain: resolved.filter(item => item.runType === 'safe-chain'),
    separate: resolved.filter(item => item.runType !== 'safe-chain'),
    adminCount: resolved.filter(item => item.requiresAdmin).length,
    sensitiveCount: resolved.filter(item => item.risk === 'high').length,
    carefulCount: resolved.filter(item => item.risk === 'medium').length
  };
}

function getPresetDescription(name) {
  if (name === 'newpc') return 'Preset for fresh Windows setup, basic performance, and small privacy tweaks.';
  if (name === 'clean') return 'Preset for lightweight cleanup and refresh actions.';
  if (name === 'tweak') return 'Preset for stronger system tweaks intended for advanced users.';
  return 'No preset selected.';
}

function updatePresetInfo() {
  const box = document.getElementById('optPresetInfo');
  if (!box) return;

  if (!currentPreset) {
    box.textContent = 'No preset selected.';
    return;
  }

  const presetCount = PRESETS[currentPreset]?.length || 0;
  box.textContent = `${currentPreset.toUpperCase()} • ${presetCount} command(s) • ${getPresetDescription(currentPreset)}`;
}

function applyPreset(name) {
  const presetIds = PRESETS[name];
  if (!presetIds) return;

  selectedIds.clear();
  presetIds.forEach(id => selectedIds.add(id));
  currentPreset = name;

  updatePresetInfo();
  updateCommandBox();
  renderCommandList();
}

// ======================================================
// RENDER
// ======================================================
function renderCommandList() {
  const list = document.getElementById('optCommandList');
  if (!list) return;

  const filtered = getFilteredCommands();
  const search = getSearchValue();

  if (filtered.length === 0) {
    list.innerHTML = `
      <div class="opt-empty" style="opacity:0.7; padding:10px 0;">
        No commands matched your search.
      </div>
    `;
    return;
  }

  if (search) {
    list.innerHTML = filtered.map(item => renderCard(item, true)).join('');
    bindRenderedEvents();
    return;
  }

  const grouped = getGroupedCommands(filtered);
  const groupNames = Object.keys(grouped);

  list.innerHTML = groupNames.map(groupName => {
    const items = grouped[groupName];
    const isOpen = openGroups.has(groupName);
    const selectedCount = items.filter(item => selectedIds.has(item.id)).length;

    return `
      <div class="opt-group">
        <button
          class="opt-group-toggle"
          type="button"
          data-group="${escapeHtml(groupName)}"
          aria-expanded="${isOpen ? 'true' : 'false'}"
        >
          <div class="opt-group-toggle-left">
            <div class="opt-group-title">${escapeHtml(groupName)}</div>
            <div class="opt-group-meta">${selectedCount}/${items.length} selected</div>
          </div>
          <div class="opt-group-icon">${isOpen ? '−' : '+'}</div>
        </button>

        <div class="opt-group-body" style="display:${isOpen ? 'block' : 'none'};">
          ${items.map(item => renderCard(item, false)).join('')}
        </div>
      </div>
    `;
  }).join('');

  bindRenderedEvents();
}

function renderCard(item, standalone = false) {
  const isChecked = selectedIds.has(item.id);
  const isInfoOpen = openInfoIds.has(item.id);
  const riskClass = `opt-risk-${item.risk || 'low'}`;
  const adminBadge = item.requiresAdmin
    ? `<span class="opt-admin-badge">Admin</span>`
    : '';

  return `
    <div class="opt-item ${standalone ? 'opt-item-standalone' : ''} ${isInfoOpen ? 'expanded' : ''} ${riskClass}">
      <div class="opt-item-main">
        <div class="opt-item-left">
          <div class="opt-item-title-row">
            <div class="opt-item-title ${riskClass}">${escapeHtml(item.title)}</div>
            <span class="opt-risk-badge ${riskClass}">${escapeHtml(getRiskLabel(item.risk))}</span>
            ${adminBadge}
          </div>

          <div class="opt-item-desc">${escapeHtml(item.description)}</div>

          ${standalone ? `<div class="opt-item-group-badge">${escapeHtml(item.group)}</div>` : ''}

          ${
            isInfoOpen
              ? `
                <div class="opt-inline-command">
                  <div class="opt-inline-row">
                    <span class="opt-inline-command-label">Details</span>
                    <span class="opt-inline-value">${escapeHtml(item.details || item.description)}</span>
                  </div>
                  <div class="opt-inline-row">
                    <span class="opt-inline-command-label">Group</span>
                    <span class="opt-inline-value">${escapeHtml(item.group)}</span>
                  </div>
                  <div class="opt-inline-row">
                    <span class="opt-inline-command-label">Risk</span>
                    <span class="opt-inline-value">${escapeHtml(getRiskLabel(item.risk))}</span>
                  </div>
                  <div class="opt-inline-row">
                    <span class="opt-inline-command-label">Admin</span>
                    <span class="opt-inline-value">${item.requiresAdmin ? 'Yes' : 'No'}</span>
                  </div>
                  <div class="opt-inline-row opt-inline-row--block">
                    <span class="opt-inline-command-label">Command</span>
                    <code class="opt-inline-code">${escapeHtml(item.command)}</code>
                  </div>
                </div>
              `
              : ''
          }
        </div>

        <div class="opt-item-right">
          <button
            type="button"
            class="opt-info-btn"
            data-info-id="${escapeHtml(item.id)}"
            aria-expanded="${isInfoOpen ? 'true' : 'false'}"
            title="Show info"
          >
            i
          </button>

          <label class="toggle-switch">
            <input type="checkbox" class="opt-toggle" data-id="${escapeHtml(item.id)}" ${isChecked ? 'checked' : ''} />
            <span class="slider"></span>
          </label>
        </div>
      </div>
    </div>
  `;
}

// ======================================================
// EVENTS
// ======================================================
function bindRenderedEvents() {
  const list = document.getElementById('optCommandList');
  if (!list) return;

  list.querySelectorAll('.opt-group-toggle').forEach(button => {
    button.addEventListener('click', () => {
      const groupName = button.dataset.group;
      if (!groupName) return;

      if (openGroups.has(groupName)) openGroups.delete(groupName);
      else openGroups.add(groupName);

      renderCommandList();
    });
  });

  list.querySelectorAll('.opt-toggle').forEach(toggle => {
    toggle.addEventListener('change', event => {
      const id = event.target.dataset.id;
      if (!id) return;

      if (event.target.checked) selectedIds.add(id);
      else selectedIds.delete(id);

      currentPreset = null;
      updatePresetInfo();
      updateCommandBox();
      renderCommandList();
    });
  });

  list.querySelectorAll('.opt-info-btn').forEach(button => {
    button.addEventListener('click', () => {
      const id = button.dataset.infoId;
      if (!id) return;

      if (openInfoIds.has(id)) openInfoIds.delete(id);
      else openInfoIds.add(id);

      renderCommandList();
    });
  });
}

function bindSearch() {
  const input = document.getElementById('optSearchInput');
  if (!input) return;

  input.addEventListener('input', () => {
    renderCommandList();
  });
}

function bindModeButtons() {
  const cmdBtn = document.getElementById('modeCmdBtn');
  const psBtn = document.getElementById('modePsBtn');

  if (!cmdBtn || !psBtn) return;

  cmdBtn.addEventListener('click', () => setMode('cmd'));
  psBtn.addEventListener('click', () => setMode('powershell'));
}

function bindPresetButtons() {
  const presetButtons = document.querySelectorAll('.opt-preset-btn');

  presetButtons.forEach(button => {
    button.addEventListener('click', () => {
      const preset = button.dataset.preset;
      if (!preset) return;

      applyPreset(preset);

      presetButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
    });
  });
}

function bindActionButtons() {
  const copyBtn = document.getElementById('optCopyBtn');
  const clearBtn = document.getElementById('optClearBtn');

  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      const box = document.getElementById('optCommandBox');
      const status = document.getElementById('optStatus');

      if (!box || !box.value.trim()) {
        if (status) status.textContent = 'Nothing to copy.';
        return;
      }

      try {
        await navigator.clipboard.writeText(box.value);
        if (status) status.textContent = 'Combo copied.';
      } catch (error) {
        if (status) status.textContent = 'Copy failed.';
        console.error('Clipboard copy failed:', error);
      }
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      selectedIds.clear();
      openInfoIds.clear();
      currentPreset = null;

      document.querySelectorAll('.opt-preset-btn').forEach(btn => btn.classList.remove('active'));

      updatePresetInfo();
      updateCommandBox();
      renderCommandList();

      const status = document.getElementById('optStatus');
      if (status) status.textContent = 'Cleared.';
    });
  }
}

// ======================================================
// COMMAND BOX
// ======================================================
function updateCommandBox() {
  const box = document.getElementById('optCommandBox');
  const status = document.getElementById('optStatus');

  if (!box) return;

  const mode = getCurrentMode();
  const data = getSafeComboData();

  if (data.selected.length === 0) {
    box.value = '';
    if (status) status.textContent = 'No commands selected.';
    return;
  }

  const separator = mode === 'powershell' ? '; ' : ' && ';
  box.value = data.safeChain.map(item => item.command).join(separator);

  const parts = [];

  if (data.safeChain.length > 0) {
    parts.push(`${data.safeChain.length} in combo`);
  } else {
    parts.push('No safe combo commands');
  }

  if (data.separate.length > 0) {
    parts.push(`${data.separate.length} separate`);
  }

  if (data.adminCount > 0) {
    parts.push(`${data.adminCount} admin`);
  }

  if (data.sensitiveCount > 0) {
    parts.push(`${data.sensitiveCount} sensitive`);
  } else if (data.carefulCount > 0) {
    parts.push(`${data.carefulCount} careful`);
  }

  if (status) {
    status.textContent = parts.join(' • ');
  }
}