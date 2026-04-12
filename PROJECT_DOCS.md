# RaccoonLagoon — Complete Project Documentation
> Generated for AI use. This document fully describes the project so ChatGPT can understand, modify, and extend it without reading the source code.

---

## 1. Project Summary

**RaccoonLagoon** is a Chrome extension (Manifest V3) that opens as a **side panel** inside Chrome.

**Main purpose:** Let the user send images, videos, URLs, and text from Instagram, YouTube, and Facebook directly to a Discord channel via a webhook — plus a suite of extra productivity tools all accessible from the same side panel.

- Platform: Chrome Extension MV3
- UI: Side panel (`sidepanel/sidepanel.html`) — opens via `Ctrl+Shift+Y`
- Sends to: Discord webhooks (one or multiple)
- Sites supported: instagram.com, youtube.com, facebook.com (via content scripts)

---

## 2. Features

### 2.1 Discord Send Button — YouTube
- **What:** Injects a Discord button into the YouTube watch-page action bar and into the Shorts action bar.
- **Files:** `components/youtube/youtube-content.js`
- **Trigger:** Content script auto-runs on `youtube.com/*`. Uses `MutationObserver` to detect when the button bar is rendered (YouTube is a SPA).
- **Settings:** `youtubeEnabled` (watch page), `youtubeShortsEnabled` (Shorts)
- **Right-click send:** `youtubeRightClickEnabled` — sends current YouTube URL via context menu.

### 2.2 Discord Send Button — Instagram
- **What:** Injects a Discord button on Instagram feed posts and Reels.
- **Files:** `components/instagram/instagram-content.js`
- **Trigger:** Content script on `instagram.com/*`, uses `MutationObserver`.
- **Settings:** `instagramEnabled` (feed), `instagramReelsEnabled` (Reels)

### 2.3 Discord Send Button — Facebook
- **What:** Injects a Discord button on Facebook Reels.
- **Files:** `components/facebook/facebook-content.js`
- **Trigger:** Content script on `facebook.com/*`, viewport-aware (uses IntersectionObserver).
- **Settings:** `facebookReelsEnabled`

### 2.4 Drop Zone (Home tab)
- **What:** Drag-and-drop / paste / file browse area in the side panel. Accepts images, audio, URLs, text. Sends to Discord as file upload (FormData) or text message.
- **Files:** `components/dropzone/dropzone.js`
- **Trigger:** Always mounted on Home tab. Visibility controlled by `dropZoneEnabled`.
- **Max file size:** 9.9 MB (Discord limit)
- **Supports:** Single image, multiple images (carousel preview), audio files, audio URLs, plain text/URLs

### 2.5 Video Recorder (Home tab)
- **What:** Records the current browser tab as a video (WebM or MP4). Can capture tab audio, microphone, or both.
- **Files:** `components/record/record.js` (UI card), `components/video-recorder/recorder-home.js` (logic), `components/video-recorder/offscreen.js` (tab capture), `background/background-recorder.js` (service worker relay)
- **Trigger:** Shown on Home tab when `recorderEnabled === true`.
- **Architecture:** Tab capture uses offscreen document (MV3 requirement). See Section 4.

### 2.6 Clock / Timer / Alarm (Home tab)
- **What:** Card with 3 inner tabs — Cooking Timer, Planning (arrival time calculator with countdown), and Alarm (full alarm system with days, repeat, sound picker, URL open on fire).
- **Files:** `components/clock/clock.js`
- **Trigger:** Always mounted on Home tab.
- **Alarm sounds:** `assets/*.mp3` (Dash, Dragon Roost Island, Full Steam, Pedro, Wii, etc.)
- **Alarm fired:** Background service worker fires `chrome.alarms`, sends `RL_ALARM_FIRED` message to side panel.

### 2.7 FastURL (Home tab)
- **What:** 3 quick-launch URL slots at the top of the Home tab. Can be configured with custom URL, label, and image.
- **Files:** `components/fasturl/fasturl.js`
- **Trigger:** Always mounted on Home tab. Configurable in Settings tab.
- **Settings:** `fastUrlSlots` (array), `fastUrlEnabled`

### 2.8 Smart Box / Spell Check / Translate (Home tab)
- **What:** Three text tool cards:
  - **Smart Box:** Auto-corrects spelling then translates to English.
  - **Spell Check:** Corrects text via LanguageTool API.
  - **Translate:** Translates any language to English via Google Translate API.
- **Files:** `components/smartbox/smartbox.js`
- **Trigger:** Mounted on Home tab. Each card hidden/shown per setting.
- **Settings:** `smartBoxEnabled`, `spellCheckEnabled`, `translateEnabled`
- **APIs:** `https://api.languagetool.org/`, `https://translate.googleapis.com/`

### 2.9 Autoscroll — YouTube Shorts
- **What:** Automatically scrolls to next Short when the video ends.
- **Files:** `components/youtube/youtube-autoscroll.js`
- **Settings:** `youtubeShortAutoscrollEnabled`

### 2.10 Autoscroll — Instagram Reels
- **What:** Automatically scrolls to next Reel when the video ends.
- **Files:** `components/instagram/instagram-autoscroll.js`
- **Settings:** `instagramAutoscrollEnabled`

### 2.11 YouTube Stream Mode
- **What:** Hides everything on the YouTube watch page except the video player — clean stream view.
- **Files:** `components/youtube/youtube-stream.js`
- **Settings:** `youtubeStreamEnabled`

### 2.12 YouTube Zoom & Pan
- **What:** Alt+Scroll to zoom the YouTube video, Alt+Drag to pan.
- **Files:** `components/youtube/youtube-zoom.js`
- **Settings:** `youtubeZoomEnabled`

### 2.13 Rust Finder (Scanner tab)
- **What:** Scans for Rust DLC prices and sales. Shows a scanner card in the Scanner tab.
- **Files:** `background/background-rust-scanner.js`, `background/background-rust-dom.js`, `sidepanel/tabs/scanner.js`
- **Settings:** `rustFinderEnabled`, `rustReaEnabled` (also controls Scanner tab visibility)

### 2.14 Free Games Scanner (Scanner tab)
- **What:** Scans Epic Games and Steam for free/giveaway games.
- **Files:** `components/freegames/freegames.js`, `components/freegames/freegames-background.js`, sub-components in `epicgames/` and `steamgames/`
- **Settings:** `freeGamesEnabled`

### 2.15 Lidl Scanner (Scanner tab)
- **What:** Fetches Lidl weekly leaflets with countdown to expiry.
- **Files:** `components/lidl/lidl.js`, `components/lidl/lidl-background.js`
- **Settings:** `lidlEnabled`

### 2.16 Mat-Scanner / ICA Scanner (Scanner tab)
- **What:** Scans grocery store offers (ICA, Coop, Willys).
- **Files:** `components/smartmat-scanner/smartmat-scanner.js`, `components/ica-scanner/ica-scanner.js`
- **Settings:** `icaScannerEnabled`, `smartmatEnabled`

### 2.17 Notes & Checklist (Notes tab)
- **What:** Persistent notes textarea + interactive checklist with add/remove/check items.
- **Files:** `sidepanel/tabs/notes.js`
- **Storage:** `notesText`, `checklistItems`

### 2.18 MegaCloud Fix
- **What:** Fixes video playback issues on MegaCloud/MegaFiles streaming sites. Uses declarativeNetRequest and content script.
- **Files:** `components/megacloudfix/megacloudfix-content.js`, `background/background-megacloudfix.js`, `rules-megacloud.json`
- **Settings:** `megaCloudFixEnabled`

### 2.19 Kill Switch
- **What:** Global ON/OFF toggle. When OFF: disables all feature toggles, hides all tabs except Settings, forces navigation to Settings tab.
- **Files:** `sidepanel/tabs/settings.js`, `sidepanel/sidepanel.js`
- **Settings:** `globalEnabled`

### 2.20 Multiple Webhooks
- **What:** Manage multiple Discord webhook URLs (name, channel, enable/disable per webhook). First enabled webhook is used for sends.
- **Files:** `sidepanel/tabs/settings.js`, `components/storage.js`
- **Settings:** `webhooks` (array of `{id, name, channel, url, enabled}`)

### 2.21 Accent Color Picker
- **What:** User can change the extension's accent color (the purple glow/border). Updates `--purple` CSS variable live.
- **Files:** `sidepanel/tabs/settings.js` (`initColorPicker`)
- **Settings:** `accentColor`

### 2.22 Context Menu — Send Image
- **What:** Right-click any image on any website → "Send to Discord" sends it via webhook.
- **Files:** `background/background-contextmenu.js`
- **Settings:** `imagesEnabled`

### 2.23 Optimize & Monkey Patch Tabs
- **What:** Extra utility tabs for performance optimization tools and monkey-patching scripts.
- **Files:** `sidepanel/tabs/Optimize.js`, `sidepanel/tabs/monkey-patch.js`, `components/optimize/commandbox.js`

---

## 3. File Structure

```
raccoonlagoon-discord-addon/
│
├── manifest.json                    # Extension config: permissions, content scripts, side panel
├── background.js                    # Service worker entry — imports all background modules
├── icon.png
├── rules-megacloud.json             # declarativeNetRequest rules for MegaCloud fix
│
├── background/                      # Service worker modules (ES modules)
│   ├── constants.js                 # Shared constants (PORT_RECORDER, TARGET_OFFSCREEN, etc.)
│   ├── storage.js                   # ES module version of Storage for background
│   ├── webhook.js                   # ES module version of Webhook for background
│   ├── background-sidepanel.js      # Opens side panel on extension icon click
│   ├── background-contextmenu.js    # Right-click context menu → send image to Discord
│   ├── background-recorder.js       # Tab capture orchestration + port relay
│   ├── background-rust-scanner.js   # Rust DLC price scanning (fetch + storage)
│   ├── background-rust-dom.js       # Rust scanner DOM helpers
│   ├── background-megacloudfix.js   # Toggle declarativeNetRequest ruleset
│   └── background-alarms.js        # chrome.alarms management for clock alarms
│
├── components/                      # Shared modules (content scripts + side panel components)
│   ├── storage.js                   # Classic script: var Storage = {...} (no import needed)
│   ├── webhook.js                   # Classic script: var Webhook = {...} (no import needed)
│   ├── icons.js                     # SVG icon helpers used by content scripts
│   │
│   ├── header/
│   │   └── header.js                # Tab bar HTML template + tab-switching logic
│   │
│   ├── clock/
│   │   ├── clock.js                 # Clock/timer/alarm card (template + init)
│   │   └── clock.css
│   │
│   ├── dropzone/
│   │   └── dropzone.js              # Drop zone card (template + init)
│   │
│   ├── fasturl/
│   │   ├── fasturl.js               # FastURL card (template + init)
│   │   └── fasturl.css
│   │
│   ├── record/
│   │   └── record.js                # Recorder card wrapper (template + init)
│   │
│   ├── smartbox/
│   │   └── smartbox.js              # Smart Box + Spell + Translate cards (template + init)
│   │
│   ├── video-recorder/
│   │   ├── recorder-home.js         # Recorder UI logic (Start/Stop/Download)
│   │   ├── recorder-tab.js          # Recorder settings tab (format/audio/size)
│   │   ├── recorder.js              # MediaRecorder logic for 'pick screen' source
│   │   ├── offscreen.js             # Tab capture MediaRecorder (runs in offscreen context)
│   │   ├── offscreen.html           # Offscreen document shell
│   │   ├── gif-encoder.js           # GIF encoding (WIP)
│   │   └── recorder.css
│   │
│   ├── youtube/
│   │   ├── youtube-content.js       # Discord button on YouTube watch + Shorts
│   │   ├── youtube-stream.js        # Stream mode (hide everything but video)
│   │   ├── youtube-zoom.js          # Alt+scroll zoom, Alt+drag pan
│   │   └── youtube-autoscroll.js    # Auto-scroll to next Short on end
│   │
│   ├── instagram/
│   │   ├── instagram-content.js     # Discord button on Instagram feed + Reels
│   │   └── instagram-autoscroll.js  # Auto-scroll to next Reel on end
│   │
│   ├── facebook/
│   │   └── facebook-content.js      # Discord button on Facebook Reels
│   │
│   ├── freegames/
│   │   ├── freegames.js             # Free Games scanner card (template + init)
│   │   ├── freegames-background.js  # Background fetcher for Epic + Steam
│   │   ├── freegames-storage.js     # Storage keys for free games
│   │   ├── epic.js / steam.js       # Platform card UI
│   │   ├── epicgames/               # Epic Games sub-scanner
│   │   └── steamgames/              # Steam sub-scanner
│   │
│   ├── lidl/
│   │   ├── lidl.js                  # Lidl leaflet scanner card (template + init)
│   │   ├── lidl-background.js       # Background fetcher
│   │   └── lidl.css
│   │
│   ├── ica-scanner/
│   │   ├── ica-scanner.js           # ICA scanner card
│   │   ├── ica-scanner-background.js
│   │   └── ica-scanner-dom.js
│   │
│   ├── smartmat-scanner/
│   │   ├── smartmat-scanner.js      # Mat-scanner card (template + init)
│   │   ├── smartmat-scanner-background.js
│   │   ├── smartmat-scanner-dom.js
│   │   └── product-categories.js
│   │
│   ├── megacloudfix/
│   │   ├── megacloudfix-content.js  # Content script (runs on all pages)
│   │   └── megacloudfix.js
│   │
│   └── optimize/
│       └── commandbox.js            # Command box UI for Optimize tab
│
├── sidepanel/                       # Side panel UI
│   ├── sidepanel.html               # Main HTML: tab sections + CSS links + 2 scripts
│   ├── sidepanel.js                 # Entry point: imports + mounts all components
│   │
│   ├── css/
│   │   ├── base.css                 # Design tokens, reset, layout, shared components
│   │   ├── home.css                 # Home tab styles
│   │   ├── notes.css                # Notes + Checklist styles
│   │   ├── settings.css             # Settings tab styles
│   │   └── scanner.css              # Scanner tab styles
│   │
│   └── tabs/
│       ├── home.js                  # Home tab orchestrator: mounts 5 components
│       ├── notes.js                 # Notes tab logic
│       ├── settings.js              # Settings tab: webhooks, all toggles, update check
│       ├── utils.js                 # Shared helpers: showStatus, setBadge, formatBytes
│       ├── scanner.js               # Scanner tab: Rust + inner tabs
│       ├── Optimize.js              # Optimize tab
│       └── monkey-patch.js          # Monkey Patch tab
│
└── assets/                          # Alarm sounds
    ├── dash.mp3
    ├── dragon-roost-island.mp3
    ├── full-steam.mp3
    ├── pedro.mp3
    ├── ready-to-roll-out.mp3
    ├── smash-bros-eurobeat.mp3
    └── wii.mp3
```

---

## 4. Architecture

### 4.1 Extension Contexts
The extension runs in 3 simultaneous contexts:

| Context | File | Purpose |
|---|---|---|
| Service Worker | `background.js` | Coordinates everything: context menus, tab capture, alarms, offscreen doc |
| Side Panel | `sidepanel/sidepanel.html` | Main UI. Loads as ES module |
| Content Scripts | `components/youtube/*, instagram/*, facebook/*, megacloudfix/*` | Injected into pages. Classic scripts (no ES module) |

### 4.2 Side Panel Startup Flow
```
sidepanel.html loads
  ├── Classic script: components/storage.js  → window.Storage available
  └── ES module:      sidepanel.js
        ├── import all components
        ├── inject tab bar HTML  → initHeader()
        ├── initHome()           → inject 5 component templates + init each
        ├── initNotes()
        ├── initSettings()
        ├── initColorPicker()
        ├── initRecorderTab()
        ├── inject scanner HTML  → initScanner()
        ├── inject freeGames     → initFreeGames()
        ├── inject lidl          → initLidl()
        ├── inject smartmat      → initSmartmat()
        ├── initOptimize()
        ├── initMonkeyPatch()
        └── loadSettings() + loadNotes() + loadRecorderSettings()
```

### 4.3 Tab Capture / Recorder Flow (MV3 Constraint)
```
Sidepanel UI
  │  port = chrome.runtime.connect({ name: 'recorder' })
  │  port.postMessage({ type: 'START_TAB', audioMode, sizeLimitMb })
  ▼
background-recorder.js (Service Worker)
  │  chrome.tabCapture.getMediaStreamId({ targetTabId })
  │  chrome.offscreen.createDocument('offscreen.html')
  │  chrome.runtime.sendMessage({ target: 'offscreen', type: 'START', streamId })
  ▼
offscreen.js (Offscreen Document)
  │  navigator.mediaDevices.getUserMedia({ chromeMediaSource: 'tab', streamId })
  │  MediaRecorder → on dataavailable → buffer chunks
  │  on stop → assemble Blob → convert to ArrayBuffer
  │  chrome.runtime.sendMessage({ target: 'background', type: 'DONE', buffer })
  ▼
background-recorder.js (Service Worker)
  │  Receives DONE/TICK/ERROR → relays to sidepanel via port
  ▼
Sidepanel UI
    Reconstructs Blob from ArrayBuffer → triggers download
```

### 4.4 Content Script → Discord Flow
```
User visits youtube.com/watch?v=...
  ↓
youtube-content.js runs
  ↓
MutationObserver detects button bar rendered
  ↓
Injects Discord button into DOM
  ↓
User clicks button
  ↓
Storage.getWebhook() → gets first enabled webhook URL
  ↓
Webhook.send(url, videoUrl) → POST to Discord
  ↓
Visual feedback on the button (spinner → checkmark)
```

### 4.5 Settings → Component Visibility Flow
```
User toggles a setting in Settings tab
  ↓
Storage.set({ featureEnabled: true/false })
  ↓
chrome.storage.onChanged fires in dropzone.js
  ↓
applyToolVisibility() hides/shows cards
```

---

## 5. Key Functions

### `Storage.getAll()` — `components/storage.js`
Returns all relevant settings at once from `chrome.storage.local`. Use this to read multiple settings in one call.
```js
const s = await Storage.getAll();
if (s.youtubeEnabled) { ... }
```

### `Storage.isEnabled(feature)` — `components/storage.js`
Checks if a feature is enabled. Also checks `globalEnabled` kill switch.
```js
const ok = await Storage.isEnabled('youtube'); // reads 'youtubeEnabled'
```

### `Storage.getWebhook()` — `components/storage.js`
Returns the URL of the first enabled webhook, or `null`.

### `Webhook.send(url, content)` — `components/webhook.js`
POSTs text content to a Discord webhook. Returns `{ success: true }` or `{ success: false, error }`.

### `showStatus(el, msg, type)` — `sidepanel/tabs/utils.js`
Shows a status message in a `.status-bar` element. `type` is `'success'`, `'error'`, or `'info'`.

### `setBadge(state)` — `sidepanel/tabs/utils.js`
Updates the badge dot in the topbar. States: `'ready'`, `'sending'`, `'sent'`, `'error'`, `''`.

### `enforceKillSwitch(enabled)` — `sidepanel/sidepanel.js`
Hides/shows all tabs based on `globalEnabled`. If disabled: forces Settings tab active.

### `applyToolVisibility()` — `components/dropzone/dropzone.js`
Hides/shows each tool card on the Home tab based on its individual `Enabled` setting.

### `initHome()` — `sidepanel/tabs/home.js`
Mounts all Home tab components. Insert HTML templates, then call init functions.

---

## 6. UI Injection System

### 6.1 Side Panel Components
Every component follows this exact pattern:

**File exports:**
```js
// components/myfeature/myfeature.js

export const template = `
<div class="card" id="myFeatureCard">
  <label class="section-label">My Feature</label>
  <button id="myFeatureBtn">Do something</button>
</div>`;

export function init() {
  const btn = document.getElementById('myFeatureBtn');
  btn.addEventListener('click', () => { /* logic */ });
}
```

**Mount in home.js:**
```js
import { template as myTpl, init as initMyFeature } from '../../components/myfeature/myfeature.js';

export function initHome() {
  const pane = document.getElementById('tab-home');
  pane.insertAdjacentHTML('beforeend', myTpl);  // inject HTML
  initMyFeature();                               // wire up logic
}
```

**Rules:**
- `template` = raw HTML string (the card markup)
- `init()` = called once after template is in DOM
- Use `getElementById` inside `init()` — safe because template is already injected
- `Storage` is available globally (loaded as classic script) — no need to import it in side panel components

### 6.2 Content Script Injection (Page Buttons)
Used for injecting buttons into YouTube, Instagram, Facebook pages.

**Pattern:**
```js
// 1. Check if feature is enabled
const s = await Storage.getAll();
if (!s.youtubeEnabled) return;

// 2. Check URL / page type
if (!window.location.pathname.startsWith('/watch')) return;

// 3. Wait for target DOM element (SPA — YouTube rebuilds DOM on navigation)
const observer = new MutationObserver(() => {
  const toolbar = document.querySelector('#actions-inner');
  if (toolbar && !document.getElementById('my-btn')) {
    injectButton(toolbar);
  }
});
observer.observe(document.body, { childList: true, subtree: true });

// 4. Inject button
function injectButton(toolbar) {
  const btn = document.createElement('button');
  btn.id = 'my-btn';
  btn.textContent = 'Send';
  btn.addEventListener('click', async () => {
    const webhook = await Storage.getWebhook();
    await Webhook.send(webhook, window.location.href);
  });
  toolbar.appendChild(btn);
}
```

### 6.3 Scanner Tab Components
Scanner tab components use a mount-point pattern:

**In `sidepanel.html`:**
```html
<div id="rustMount"></div>
```

**In `sidepanel.js`:**
```js
import { template as rustTpl, init as initScanner } from './tabs/scanner.js';
document.getElementById('rustMount').outerHTML = rustTpl;  // replaces mount point
initScanner();
```

---

## 7. State Management

### Storage: `chrome.storage.local`
All state is in `chrome.storage.local`. There is no localStorage, no sessionStorage.

**Access via `Storage` helper:**
```js
// Read
const data = await Storage.get(['youtubeEnabled', 'webhookUrl']);
const all  = await Storage.getAll();

// Write
await Storage.set({ youtubeEnabled: true });

// Check feature
const ok = await Storage.isEnabled('youtube');
```

### All Storage Keys

| Key | Type | Default | Description |
|---|---|---|---|
| `globalEnabled` | bool | true | Kill switch — disables all features |
| `webhooks` | array | [] | Array of `{id, name, channel, url, enabled}` |
| `webhookUrl` | string | null | Legacy single webhook (migrated to `webhooks`) |
| `imagesEnabled` | bool | false | Right-click image send |
| `youtubeEnabled` | bool | false | YouTube watch page button |
| `youtubeShortsEnabled` | bool | false | YouTube Shorts button |
| `youtubeStreamEnabled` | bool | false | YouTube stream mode |
| `youtubeZoomEnabled` | bool | false | YouTube zoom/pan |
| `youtubeRightClickEnabled` | bool | false | YouTube right-click send |
| `youtubeShortAutoscrollEnabled` | bool | false | Auto-scroll Shorts |
| `instagramEnabled` | bool | false | Instagram feed button |
| `instagramReelsEnabled` | bool | false | Instagram Reels button |
| `instagramAutoscrollEnabled` | bool | false | Auto-scroll Reels |
| `facebookReelsEnabled` | bool | false | Facebook Reels button |
| `dropZoneEnabled` | bool | true | Drop zone on Home tab |
| `spellCheckEnabled` | bool | true | Spell check card |
| `translateEnabled` | bool | true | Translate card |
| `smartBoxEnabled` | bool | true | Smart Box card |
| `recorderEnabled` | bool | true | Recorder card |
| `rustReaEnabled` | bool | false | Rust scanner + Scanner tab visibility |
| `rustFinderEnabled` | bool | true | Rust Finder card |
| `freeGamesEnabled` | bool | true | Free Games card |
| `lidlEnabled` | bool | true | Lidl scanner card |
| `icaScannerEnabled` | bool | false | ICA scanner |
| `smartmatEnabled` | bool | false | Mat-scanner card |
| `megaCloudFixEnabled` | bool | false | MegaCloud fix |
| `fastUrlSlots` | array | [] | FastURL slot configs |
| `fastUrlEnabled` | bool | true | FastURL card |
| `tabHomeVisible` | bool | true | Show Home tab |
| `tabNotesVisible` | bool | true | Show Notes tab |
| `tabOptimizeVisible` | bool | true | Show Optimize tab |
| `monkeyPatchTabVisible` | bool | true | Show Monkey Patch tab |
| `accentColor` | string | '#6D54CF' | Accent color hex |
| `clockAlarms` | array | [] | Alarm definitions |
| `clockTimerSet` | number | 300 | Cooking timer set seconds |
| `clockTimerRemaining` | number | — | Cooking timer remaining |
| `clockTimerRunning` | bool | false | Timer running state |
| `clockTimerStartedAt` | number | null | Timer start timestamp |
| `clockSavedPlans` | array | [] | Planning tab saved plans |
| `alarmSound` | string | 'assets/ready-to-roll-out.mp3' | Selected alarm sound |
| `alarmVolume` | number | 0.6 | Alarm volume (0-1) |
| `notesText` | string | '' | Notes textarea content |
| `checklistItems` | array | [] | Checklist items |

### Reacting to Storage Changes
```js
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if ('dropZoneEnabled' in changes) {
    applyToolVisibility();
  }
});
```

---

## 8. How to Add New Features — Plug-and-Play Guide

### Case A: New card on the Home tab (side panel component)

**Step 1: Create the component file**
```
components/myfeature/myfeature.js
components/myfeature/myfeature.css  (optional)
```

**Step 2: Write the component**
```js
// components/myfeature/myfeature.js

export const template = `
<div class="card" id="myFeatureCard">
  <label class="section-label">
    <!-- SVG icon here -->
    My Feature
  </label>
  <button class="btn-primary" id="myFeatureBtn">Click me</button>
  <div class="status-bar" id="myFeatureStatus"></div>
</div>`;

export function init() {
  const btn    = document.getElementById('myFeatureBtn');
  const status = document.getElementById('myFeatureStatus');

  btn.addEventListener('click', async () => {
    const webhook = await Storage.getWebhook();
    if (!webhook) { status.textContent = 'No webhook!'; return; }
    // do something...
  });
}
```

**Step 3: Import and mount in `sidepanel/tabs/home.js`**
```js
import { template as myTpl, init as initMyFeature } from '../../components/myfeature/myfeature.js';

export function initHome() {
  const pane = document.getElementById('tab-home');
  // existing mounts...
  pane.insertAdjacentHTML('beforeend', myTpl);   // ADD THIS
  // existing inits...
  initMyFeature();                               // ADD THIS
}
```

**Step 4: Add CSS link in `sidepanel/sidepanel.html`** (if you have a CSS file)
```html
<link rel="stylesheet" href="../components/myfeature/myfeature.css" />
```

**Step 5: (Optional) Add a toggle in settings**
- Add `<input type="checkbox" id="myFeatureEnabled" />` row to Settings tab in `sidepanel.html`
- Add listener in `sidepanel/tabs/settings.js` inside `initSettings()`
- Add key to `Storage.getAll()` in `components/storage.js`
- Add visibility logic in `components/dropzone/dropzone.js` → `applyToolVisibility()`

### Case B: New button injected into a website (content script)

**Step 1: Create the content script**
```
components/mysite/mysite-content.js
```

**Step 2: Write the content script**
```js
// components/mysite/mysite-content.js
// Storage and Webhook are available as globals (loaded before this script)

(async function() {
  const s = await Storage.getAll();
  if (!s.globalEnabled) return;
  if (!s.mySiteEnabled) return;

  const observer = new MutationObserver(() => {
    const target = document.querySelector('.some-toolbar');
    if (target && !document.getElementById('rl-mysite-btn')) {
      injectButton(target);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  function injectButton(toolbar) {
    const btn = document.createElement('button');
    btn.id = 'rl-mysite-btn';
    btn.textContent = 'Send to Discord';
    btn.addEventListener('click', async () => {
      const webhook = await Storage.getWebhook();
      if (!webhook) return;
      await Webhook.send(webhook, window.location.href);
    });
    toolbar.appendChild(btn);
  }
})();
```

**Step 3: Register in `manifest.json`**
```json
{
  "matches": ["https://www.mysite.com/*"],
  "js": [
    "components/storage.js",
    "components/webhook.js",
    "components/icons.js",
    "components/mysite/mysite-content.js"
  ],
  "run_at": "document_idle"
}
```

**Step 4: Add storage key and setting toggle** (same as Case A Step 5)

### Case C: New Scanner tab component

**Step 1: Create component**
```
components/myscanner/myscanner.js
components/myscanner/myscanner-background.js
components/myscanner/myscanner.css
```

**Step 2: Export template + init from `myscanner.js`**

**Step 3: Add mount point to `sidepanel.html`** inside `#tab-scanner`:
```html
<div id="myScannerMount"></div>
```

**Step 4: Import and mount in `sidepanel/sidepanel.js`**:
```js
import { template as myScannerTpl, init as initMyScanner } from '../components/myscanner/myscanner.js';
document.getElementById('myScannerMount').outerHTML = myScannerTpl;
initMyScanner();
```

**Step 5: Import background logic in `background.js`**:
```js
import './components/myscanner/myscanner-background.js';
```

---

## 9. Design System

### Color Tokens (`sidepanel/css/base.css`)

```css
:root {
  --bg-base:             #202020;   /* Page background */
  --bg-surface:          #1f1f1f;   /* Surface (topbar) */
  --bg-raised:           #2a2a2a;   /* Raised elements */
  --bg-hover:            #333333;   /* Hover state */
  --bg-card:             #252525;   /* Card background */

  --border:              rgba(255,255,255, 0.08);
  --border-subtle:       rgba(255,255,255, 0.05);

  /* Accent — change only --purple; all derived colors auto-follow */
  --purple:              #6D54CF;
  --purple-light:        color-mix(in srgb, var(--purple) 65%, white);
  --purple-dim:          color-mix(in srgb, var(--purple) 75%, black);
  --purple-glow:         color-mix(in srgb, var(--purple) 15%, transparent);
  --purple-glow-md:      color-mix(in srgb, var(--purple) 25%, transparent);
  --purple-glow-strong:  color-mix(in srgb, var(--purple) 45%, transparent);
  --purple-border:       color-mix(in srgb, var(--purple) 45%, transparent);

  --text-primary:        #ffffff;
  --text-secondary:      rgba(255,255,255, 0.5);
  --text-muted:          rgba(255,255,255, 0.25);

  --green:               #22c55e;
  --red:                 #ef4444;
  --orange:              #f97316;

  --radius-xs:           4px;
  --radius-sm:           6px;
  --radius-md:           8px;
  --radius-lg:           12px;
  --radius-xl:           16px;

  --ease:                cubic-bezier(0.4, 0, 0.2, 1);
  --t-fast:              0.15s;
  --t-normal:            0.22s;
}
```

### Accent Color System
- **Only `--purple` needs to be changed** — all other derived colors (`--purple-light`, `--purple-glow`, etc.) use `color-mix()` and auto-update.
- User can override via the color picker in Settings. Saved as `accentColor` in storage.
- Applied via `document.documentElement.style.setProperty('--purple', hex)`.

### Typography
- Font: `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', system-ui, sans-serif`
- Base size: 13px
- Line height: 1.55

### Shared CSS Classes

| Class | Use |
|---|---|
| `.card` | Main container for any section |
| `.section-label` | Header row with icon + label inside a card |
| `.toggle-row` | Row with label + toggle switch |
| `.toggle-label` | Feature name in a toggle row |
| `.toggle-desc` | Description under toggle label |
| `.toggle-switch` | Toggle switch wrapper |
| `.slider` | Toggle switch slider element |
| `.btn-primary` | Primary action button (accent color) |
| `.btn-ghost` | Secondary/cancel button |
| `.btn-remove` | X remove button (red on hover) |
| `.text-input` | Text input / textarea |
| `.status-bar` | Feedback message area (add class `success`, `error`, `info`) |
| `.platform-label` | Platform header with icon + name |
| `.platform-icon` | Icon wrapper, variants: `--yt`, `--ig`, `--fb`, `--power`, `--tools` |

### Dark Theme Rules
- All backgrounds are dark: `#1f1f1f` to `#2a2a2a`
- Text is white with opacity variants for hierarchy
- Borders are white at 5-8% opacity
- Accent (purple) is used for: active states, glows, borders, buttons, gradients
- Status colors: green = success, red = error, orange = warning

### Animations
- Use `transition: var(--t-fast) var(--ease)` or `var(--t-normal) var(--ease)`
- Tab pane fade: `opacity` + `translateY(4px)` on `.tab-pane.active`
- No complex animations — keep transitions subtle and fast

---

## 10. Rules for Future Development

### Naming Conventions
- Component files: `featurename.js` (lowercase, no hyphens in JS identifiers)
- Content script files: `platform-content.js` (e.g., `youtube-content.js`)
- Background modules: `background-featurename.js`
- Storage keys: `camelCase` + `Enabled` suffix for toggles (e.g., `youtubeEnabled`)
- DOM IDs: `camelCase` for side panel (e.g., `myFeatureCard`), `ds-platform-name` prefix for injected content script elements
- CSS classes: `kebab-case` (e.g., `.toggle-row`, `.preview-card`)

### Structure Rules
- Every side panel component = one `template` export + one `init` export
- `init()` must be called AFTER `template` is injected into the DOM
- `Storage` (classic script) is always available in sidepanel — never import it inside side panel components
- `Webhook` (classic script) is always available in content scripts — never import it
- Background modules are ES modules — use `import` for Storage/Webhook in background context
- Content scripts load scripts in order: `storage.js` → `webhook.js` → `icons.js` → `feature-content.js`

### What NOT to Break
- The `Storage._ok()` guard — always present; protects against extension reload errors
- `globalEnabled` kill switch — every feature that injects content must check this
- The `target` field on cross-context messages (`target: 'offscreen'` or `target: 'background'`) — this is how message routing works in MV3
- `PORT_RECORDER` constant — the port name for sidepanel ↔ background recorder communication
- `applyToolVisibility()` in `dropzone.js` — this is the single place that controls card visibility on Home tab; keep it updated when adding new cards
- `Storage.getAll()` in `components/storage.js` — add new keys here when adding new features
- The offscreen document is destroyed and recreated for each recording session — do not cache it
- `declarative_net_request` ruleset for MegaCloud — must keep `enabled: false` in manifest; toggled at runtime

---

## 11. Instructions for ChatGPT

### How to modify existing code
1. Always check which component file owns the feature (see Section 2 for file mapping)
2. Read the `template` string and the `init()` function together — they are paired
3. If adding a new toggle, add it in 4 places: settings HTML, settings.js listener, storage.js getAll(), and the component's `applyToolVisibility()` or equivalent
4. When modifying content scripts: they run in page context, can only use globals (`Storage`, `Webhook`, `Icons`) — no ES module imports

### How to add features
- Follow Section 8 exactly — it is the plug-and-play recipe
- Always use the existing `.card` wrapper and CSS classes for new UI
- Use `--purple` and derived color variables — never hardcode colors
- Check if feature needs a setting toggle → if yes, follow the 4-place pattern above

### How to keep consistency
- Match the dark theme: bg `#252525`, text `#fff`, accent `var(--purple)`
- Use `showStatus(el, msg, type)` for all user feedback — do not use `alert()`
- Use `Storage.getWebhook()` to get the active webhook — never hardcode URLs
- Use `Storage.isEnabled(feature)` when checking a single feature toggle in content scripts
- Prefer `insertAdjacentHTML('beforeend', template)` over `innerHTML +=` to avoid resetting existing DOM
- All SVG icons are inline (no external icon library) — match the style: `viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"`
- Side panel components are mounted once on load — they do NOT re-render on settings change; instead use `element.hidden = true/false` to show/hide

### Common patterns to copy

**Read settings and act:**
```js
const s = await Storage.getAll();
if (s.globalEnabled === false) return;
if (s.myFeatureEnabled !== true) return;
```

**Send to Discord (text):**
```js
const webhook = await Storage.getWebhook();
if (!webhook) { showStatus(statusEl, 'No webhook configured.', 'error'); return; }
const result = await Webhook.send(webhook, textContent);
if (result.success) showStatus(statusEl, 'Sent!', 'success');
else showStatus(statusEl, 'Failed: ' + result.error, 'error');
```

**Listen for storage change:**
```js
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if ('myFeatureEnabled' in changes) {
    const el = document.getElementById('myFeatureCard');
    if (el) el.hidden = !changes.myFeatureEnabled.newValue;
  }
});
```

**MutationObserver for SPA injection:**
```js
const obs = new MutationObserver(() => {
  if (!document.getElementById('rl-my-btn')) tryInject();
});
obs.observe(document.body, { childList: true, subtree: true });
tryInject(); // also try immediately
```
