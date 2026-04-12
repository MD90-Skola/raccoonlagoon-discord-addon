// content/elementkiller-content.js — Element Killer content script

(function () {
  'use strict';

  if (window.__ekInitialized) return;
  window.__ekInitialized = true;

  const HIDDEN_KEY  = `ekHidden_${location.hostname}`;
  const PAINTED_KEY = `ekPainted_${location.hostname}`;
  const COLORS_KEY  = 'ekColors';

  // ── Persistence: re-apply hidden + painted elements on load ──────────────────
  let _hiddenSelectors  = [];
  let _paintedSelectors = [];

  function _reapplyHidden() {
    for (const sel of _hiddenSelectors) {
      try {
        document.querySelectorAll(sel).forEach(el => {
          if (el.hasAttribute('data-ek-hidden')) return;
          el.style.setProperty('display', 'none', 'important');
          el.setAttribute('data-ek-hidden', '1');
        });
      } catch (_) {}
    }
  }

  function _reapplyPainted() {
    for (const sel of _paintedSelectors) {
      try {
        document.querySelectorAll(sel).forEach(el => {
          if (el.hasAttribute('data-ek-painted')) return;
          el.style.setProperty('background-color', '#000', 'important');
          el.style.setProperty('color',            '#000', 'important');
          el.style.setProperty('filter',           'brightness(0)', 'important');
          el.setAttribute('data-ek-painted', '1');
        });
      } catch (_) {}
    }
  }

  chrome.storage.local.get([HIDDEN_KEY, PAINTED_KEY], result => {
    _hiddenSelectors  = Array.isArray(result[HIDDEN_KEY])  ? result[HIDDEN_KEY]  : [];
    _paintedSelectors = Array.isArray(result[PAINTED_KEY]) ? result[PAINTED_KEY] : [];

    if (_hiddenSelectors.length === 0 && _paintedSelectors.length === 0) return;

    _reapplyHidden();
    _reapplyPainted();

    // Debounced MutationObserver for late-rendering frameworks (SPAs, React, etc.)
    let _timer = null;
    const obs = new MutationObserver(() => {
      if (_timer) return;
      _timer = setTimeout(() => { _timer = null; _reapplyHidden(); _reapplyPainted(); }, 200);
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
    window.addEventListener('load', () => setTimeout(() => obs.disconnect(), 8000), { once: true });
  });

  // Keep selectors in sync with storage changes during the session
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (HIDDEN_KEY  in changes) _hiddenSelectors  = Array.isArray(changes[HIDDEN_KEY].newValue)  ? changes[HIDDEN_KEY].newValue  : [];
    if (PAINTED_KEY in changes) _paintedSelectors = Array.isArray(changes[PAINTED_KEY].newValue) ? changes[PAINTED_KEY].newValue : [];
  });

  // ── ToolController / ElementKiller class ──────────────────────────────────────
  class ElementKiller {
    constructor() {
      this.isActive    = false; // kill mode
      this.paintActive = false; // paint mode
      this.thiefActive = false; // thief mode
      // Unified undo stack — entries have a `type` field: 'kill' | 'paint' | 'thief'
      this.actionStack   = [];
      this.currentTarget = null;
      this.tooltip       = null;
      this.undoBtn       = null;

      this._onMouseover  = this._onMouseover.bind(this);
      this._onMouseout   = this._onMouseout.bind(this);
      this._onMousemove  = this._onMousemove.bind(this);
      this._onClick      = this._onClick.bind(this);
      this._onPaintClick = this._onPaintClick.bind(this);
      this._onThiefClick = this._onThiefClick.bind(this);
      this._onKeydown    = this._onKeydown.bind(this);
    }

    // ── Public API ──────────────────────────────────────────────────────────────

    activate() {
      if (this.isActive) { this.deactivate(); return; }
      if (this.paintActive) this._stopPaintListeners();
      if (this.thiefActive) this._stopThiefListeners();
      this.isActive = true;
      this._startListeners(this._onClick);
      this._notifyState();
    }

    deactivate() {
      if (!this.isActive) return;
      this.isActive = false;
      this._stopListeners(this._onClick);
      if (this.actionStack.length === 0) this._removeUndoBtn();
      this._notifyState();
    }

    activatePaint() {
      if (this.paintActive) { this.deactivatePaint(); return; }
      if (this.isActive)    this._stopListeners(this._onClick);
      if (this.thiefActive) this._stopThiefListeners();
      this.paintActive = true;
      this._startListeners(this._onPaintClick);
      this._notifyState();
    }

    deactivatePaint() {
      if (!this.paintActive) return;
      this.paintActive = false;
      this._stopListeners(this._onPaintClick);
      if (this.actionStack.length === 0) this._removeUndoBtn();
      this._notifyState();
    }

    activateThief() {
      if (this.thiefActive) { this.deactivateThief(); return; }
      if (this.isActive)    this._stopListeners(this._onClick);
      if (this.paintActive) this._stopPaintListeners();
      this.thiefActive = true;
      this._startListeners(this._onThiefClick);
      this._notifyState();
    }

    deactivateThief() {
      if (!this.thiefActive) return;
      this.thiefActive = false;
      this._stopListeners(this._onThiefClick);
      if (this.actionStack.length === 0) this._removeUndoBtn();
      this._notifyState();
    }

    undo() {
      if (this.actionStack.length === 0) return;
      const action = this.actionStack.pop();

      if (action.type === 'kill') {
        try { action.parent.insertBefore(action.node, action.nextSibling || null); } catch (_) {}
      } else if (action.type === 'paint') {
        action.node.style.removeProperty('background-color');
        action.node.style.removeProperty('color');
        action.node.style.removeProperty('filter');
        if (action.origFilter) action.node.style.filter = action.origFilter;
        action.node.removeAttribute('data-ek-painted');
      } else if (action.type === 'thief') {
        // Remove the stolen color from storage
        chrome.storage.local.get(COLORS_KEY, result => {
          const list = Array.isArray(result[COLORS_KEY]) ? result[COLORS_KEY] : [];
          const idx  = list.indexOf(action.color);
          if (idx !== -1) {
            chrome.storage.local.set({ [COLORS_KEY]: [...list.slice(0, idx), ...list.slice(idx + 1)] });
          }
        });
      }

      this._updateUndoBtn();
      this._notifyState();
    }

    clearAll() {
      document.querySelectorAll('[data-ek-hidden]').forEach(el => {
        el.style.removeProperty('display');
        el.removeAttribute('data-ek-hidden');
      });
      document.querySelectorAll('[data-ek-painted]').forEach(el => {
        el.style.removeProperty('background-color');
        el.style.removeProperty('color');
        el.style.removeProperty('filter');
        el.removeAttribute('data-ek-painted');
      });
      chrome.storage.local.remove([HIDDEN_KEY, PAINTED_KEY]);
      this._notifyState();
    }

    // ── Shared listener management ───────────────────────────────────────────────

    _startListeners(clickHandler) {
      this._createTooltip();
      this._createUndoBtn();
      document.addEventListener('mouseover', this._onMouseover,  true);
      document.addEventListener('mouseout',  this._onMouseout,   true);
      document.addEventListener('mousemove', this._onMousemove,  true);
      document.addEventListener('click',     clickHandler,       true);
      document.addEventListener('keydown',   this._onKeydown,    true);
      document.body.style.cursor = 'crosshair';
    }

    _stopListeners(clickHandler) {
      this._clearHighlight();
      this._removeTooltip();
      document.removeEventListener('mouseover', this._onMouseover,  true);
      document.removeEventListener('mouseout',  this._onMouseout,   true);
      document.removeEventListener('mousemove', this._onMousemove,  true);
      document.removeEventListener('click',     clickHandler,       true);
      document.removeEventListener('keydown',   this._onKeydown,    true);
      document.body.style.cursor = '';
    }

    _stopPaintListeners() {
      this.paintActive = false;
      this._stopListeners(this._onPaintClick);
    }

    _stopThiefListeners() {
      this.thiefActive = false;
      this._stopListeners(this._onThiefClick);
    }

    // ── Event handlers ──────────────────────────────────────────────────────────

    _onMouseover(e) {
      const el = e.target;
      if (this._isOwnElement(el)) return;
      if (el === document.body || el === document.documentElement) return;
      this._clearHighlight();
      this.currentTarget = el;
      el.style.outline       = '2px solid #ff9800';
      el.style.outlineOffset = '-2px';
      this._showTooltip(el);
    }

    _onMouseout(e) {
      if (this.currentTarget && !this.currentTarget.contains(e.relatedTarget)) {
        this._clearHighlight();
      }
      if (this.tooltip) this.tooltip.style.display = 'none';
    }

    _onMousemove(e) {
      if (!this.tooltip || this.tooltip.style.display === 'none') return;
      const x = Math.min(e.clientX + 14, window.innerWidth  - 260);
      const y = Math.max(e.clientY - 36, 4);
      this.tooltip.style.left = `${x}px`;
      this.tooltip.style.top  = `${y}px`;
    }

    _onClick(e) {
      const el = e.target;
      if (!el || this._isOwnElement(el)) return;
      if (el === document.body || el === document.documentElement) return;
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();

      const parent      = el.parentNode;
      if (!parent) return;
      const nextSibling = el.nextSibling;

      el.style.outline = ''; el.style.outlineOffset = '';
      const selector = this._generateSelector(el);

      this.actionStack.push({ type: 'kill', node: el, parent, nextSibling, selector });
      el.remove();
      this.currentTarget = null;

      if (selector) this._persist(HIDDEN_KEY, selector);
      this._updateUndoBtn();
      this._notifyState();
    }

    _onPaintClick(e) {
      const el = e.target;
      if (!el || this._isOwnElement(el)) return;
      if (el === document.body || el === document.documentElement) return;
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();

      el.style.outline = ''; el.style.outlineOffset = '';
      const selector   = this._generateSelector(el);
      const origFilter = el.style.filter || '';

      this.actionStack.push({ type: 'paint', node: el, origFilter });
      el.style.setProperty('background-color', '#000',           'important');
      el.style.setProperty('color',            '#000',           'important');
      el.style.setProperty('filter',           'brightness(0)', 'important');
      el.setAttribute('data-ek-painted', '1');
      this.currentTarget = null;

      if (selector) this._persist(PAINTED_KEY, selector);
      this._updateUndoBtn();
      this._notifyState();
    }

    _onThiefClick(e) {
      const el = e.target;
      if (!el || this._isOwnElement(el)) return;
      if (el === document.body || el === document.documentElement) return;
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();

      el.style.outline = ''; el.style.outlineOffset = '';
      const hex = this._extractColor(el);
      this.currentTarget = null;
      if (!hex) return;

      this.actionStack.push({ type: 'thief', color: hex });
      this._persistColor(hex);
      this._updateUndoBtn();
      this._notifyState();
    }

    _onKeydown(e) {
      if (e.key === 'Escape') {
        if (this.isActive)    this.deactivate();
        if (this.paintActive) this.deactivatePaint();
        if (this.thiefActive) this.deactivateThief();
        return;
      }
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault(); e.stopPropagation();
        this.undo();
      }
    }

    // ── Tooltip ──────────────────────────────────────────────────────────────────

    _createTooltip() {
      if (this.tooltip) return;
      const tip = document.createElement('div');
      tip.id = '__ek_tooltip__';
      Object.assign(tip.style, {
        position: 'fixed', zIndex: '2147483647', pointerEvents: 'none',
        background: 'rgba(12,12,18,0.94)', border: '1px solid rgba(255,152,0,0.65)',
        color: '#fff', font: '600 11px/1.4 monospace', padding: '4px 8px',
        borderRadius: '5px', whiteSpace: 'nowrap', display: 'none',
        boxShadow: '0 2px 10px rgba(0,0,0,0.55)', maxWidth: '260px',
        overflow: 'hidden', textOverflow: 'ellipsis',
      });
      document.documentElement.appendChild(tip);
      this.tooltip = tip;
    }

    _removeTooltip() {
      if (this.tooltip) { this.tooltip.remove(); this.tooltip = null; }
    }

    _showTooltip(el) {
      if (!this.tooltip) return;
      const tag = el.tagName.toLowerCase();
      const id  = el.id ? `#${el.id}` : '';
      const cls = typeof el.className === 'string' && el.className.trim()
        ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.')
        : '';
      this.tooltip.textContent   = `<${tag}${id}${cls}>`;
      this.tooltip.style.display = 'block';
    }

    // ── Undo button on page ───────────────────────────────────────────────────────

    _createUndoBtn() {
      if (this.undoBtn) return;
      const btn = document.createElement('button');
      btn.id = '__ek_undo_btn__';
      Object.assign(btn.style, {
        position: 'fixed', bottom: '20px', right: '20px', zIndex: '2147483647',
        background: 'rgba(12,12,18,0.94)', border: '1px solid rgba(255,152,0,0.65)',
        color: '#fff', font: '600 12px/1 -apple-system,sans-serif',
        padding: '8px 14px', borderRadius: '8px', cursor: 'pointer',
        boxShadow: '0 4px 16px rgba(0,0,0,0.5)', display: 'none',
        whiteSpace: 'nowrap', transition: 'background 0.15s, border-color 0.15s',
      });
      btn.addEventListener('mouseenter', () => { btn.style.background = 'rgba(255,152,0,0.18)'; btn.style.borderColor = '#ff9800'; });
      btn.addEventListener('mouseleave', () => { btn.style.background = 'rgba(12,12,18,0.94)'; btn.style.borderColor = 'rgba(255,152,0,0.65)'; });
      btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); this.undo(); });
      document.documentElement.appendChild(btn);
      this.undoBtn = btn;
    }

    _removeUndoBtn() {
      if (this.undoBtn) { this.undoBtn.remove(); this.undoBtn = null; }
    }

    _updateUndoBtn() {
      if (!this.undoBtn) return;
      const n = this.actionStack.length;
      this.undoBtn.textContent   = `Undo (${n})`;
      this.undoBtn.style.display = n > 0 ? 'block' : 'none';
    }

    // ── Helpers ──────────────────────────────────────────────────────────────────

    _isOwnElement(el) {
      if (!el) return false;
      if (el.id === '__ek_tooltip__' || el.id === '__ek_undo_btn__') return true;
      if (this.undoBtn && this.undoBtn.contains(el)) return true;
      return false;
    }

    _clearHighlight() {
      if (this.currentTarget) {
        this.currentTarget.style.outline       = '';
        this.currentTarget.style.outlineOffset = '';
        this.currentTarget = null;
      }
    }

    _generateSelector(el) {
      try {
        if (el.id) return `#${CSS.escape(el.id)}`;
        const parts = [];
        let node = el;
        for (let d = 0; node && node !== document.body && d < 6; d++) {
          let seg = node.tagName.toLowerCase();
          if (node.id) { parts.unshift(`#${CSS.escape(node.id)}`); break; }
          seg += `:nth-child(${[...node.parentNode.children].indexOf(node) + 1})`;
          parts.unshift(seg);
          node = node.parentNode;
        }
        return parts.join(' > ') || null;
      } catch (_) { return null; }
    }

    _persist(storageKey, selector) {
      chrome.storage.local.get(['ekSaveDeletes', storageKey], result => {
        if (result.ekSaveDeletes === false) return;
        const list = Array.isArray(result[storageKey]) ? result[storageKey] : [];
        if (!list.includes(selector)) chrome.storage.local.set({ [storageKey]: [...list, selector] });
      });
    }

    _extractColor(el) {
      const style = window.getComputedStyle(el);
      const bg    = style.backgroundColor;
      if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
        const hex = this._rgbToHex(bg);
        if (hex) return hex;
      }
      return this._rgbToHex(style.color);
    }

    _rgbToHex(rgb) {
      const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (!m) return null;
      return '#' + [m[1], m[2], m[3]].map(n => parseInt(n).toString(16).padStart(2, '0')).join('');
    }

    _persistColor(hex) {
      chrome.storage.local.get(COLORS_KEY, result => {
        const list    = Array.isArray(result[COLORS_KEY]) ? result[COLORS_KEY] : [];
        const deduped = list.filter(c => c !== hex);
        chrome.storage.local.set({ [COLORS_KEY]: [hex, ...deduped].slice(0, 10) });
      });
    }

    _notifyState() {
      try {
        chrome.runtime.sendMessage({
          type:         'EK_STATE_UPDATE',
          isActive:     this.isActive,
          paintActive:  this.paintActive,
          thiefActive:  this.thiefActive,
          deletedCount: this.actionStack.length,
        });
      } catch (_) {}
    }
  }

  // ── Singleton ─────────────────────────────────────────────────────────────────
  const killer = new ElementKiller();

  // ── Message listener ──────────────────────────────────────────────────────────
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (!msg || msg.target !== 'elementkiller') return false;

    if (msg.type !== 'GET_STATE') {
      chrome.storage.local.get('ekEnabled', ({ ekEnabled }) => {
        if (ekEnabled === false) { sendResponse({ error: 'disabled' }); return; }
        handleMsg(msg, sendResponse);
      });
      return true;
    }

    handleMsg(msg, sendResponse);
    return false;
  });

  function handleMsg(msg, sendResponse) {
    switch (msg.type) {
      case 'TOGGLE':       killer.activate();       break;
      case 'PAINT_TOGGLE': killer.activatePaint();  break;
      case 'THIEF_TOGGLE': killer.activateThief();  break;
      case 'UNDO':         killer.undo();           break;
      case 'CLEAR_HIDDEN': killer.clearAll();       break;
      case 'DEACTIVATE':   killer.deactivate(); killer.deactivatePaint(); killer.deactivateThief(); break;
    }
    sendResponse({
      isActive:     killer.isActive,
      paintActive:  killer.paintActive,
      thiefActive:  killer.thiefActive,
      deletedCount: killer.actionStack.length,
    });
  }
})();
