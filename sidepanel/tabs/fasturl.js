// fasturl.js — FastURL snabblänkar

const SLOT_COUNT = 3;

let slots = defaultSlots();

function defaultSlots() {
  return Array.from({ length: SLOT_COUNT }, () => ({ url: '', label: '', image: null }));
}

async function saveSlots() {
  await Storage.set({ fastUrlSlots: slots });
}

// ─── Home card rendering ─────────────────────────────────────────────────────
function renderHomeSlots() {
  for (let i = 0; i < SLOT_COUNT; i++) {
    const el = document.getElementById(`fuSlot${i}`);
    if (!el) continue;
    const slot = slots[i];

    el.onclick   = null;
    el.innerHTML = '';

    if (!slot.url) {
      el.className = 'fasturl-slot empty';
      el.title = 'Konfigurera i Inställningar';
      const plus = document.createElement('span');
      plus.className   = 'fasturl-plus';
      plus.textContent = '+';
      const lbl = document.createElement('span');
      lbl.className   = 'fasturl-label';
      lbl.textContent = `Slot ${i + 1}`;
      el.append(plus, lbl);
      continue;
    }

    el.className = 'fasturl-slot filled';
    el.title     = slot.url;

    // Icon
    if (slot.image) {
      const img = document.createElement('img');
      img.className = 'fasturl-icon';
      img.alt = '';
      img.src = slot.image;
      el.appendChild(img);
    } else {
      try {
        const hostname = new URL(slot.url).hostname;
        const img = document.createElement('img');
        img.className = 'fasturl-icon';
        img.alt = '';
        img.src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=64`;
        img.onerror = () => img.replaceWith(makeFallbackIcon());
        el.appendChild(img);
      } catch {
        el.appendChild(makeFallbackIcon());
      }
    }

    // Label
    let labelText = slot.label;
    if (!labelText) {
      try { labelText = new URL(slot.url).hostname.replace(/^www\./, ''); }
      catch { labelText = slot.url; }
    }
    const lbl = document.createElement('span');
    lbl.className   = 'fasturl-label';
    lbl.textContent = labelText;
    el.appendChild(lbl);

    const url = slot.url;
    el.onclick = () => chrome.tabs.create({ url });
  }
}

function makeFallbackIcon() {
  const div = document.createElement('div');
  div.className = 'fasturl-icon-fallback';
  div.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`;
  return div;
}

// ─── Settings slot editors ───────────────────────────────────────────────────
function initSettingsSlots() {
  const list = document.getElementById('fuSlotList');
  if (!list) return;

  list.innerHTML = '';

  for (let i = 0; i < SLOT_COUNT; i++) {
    const slot = slots[i];
    const el   = document.createElement('div');
    el.className = 'fu-slot-editor';

    el.innerHTML = `
      <span class="fu-slot-num">Slot ${i + 1}</span>
      <div class="fu-editor-field">
        <span class="fu-editor-label">URL</span>
        <input type="url" class="text-input fu-url-input" placeholder="https://…" />
      </div>
      <div class="fu-editor-field">
        <span class="fu-editor-label">Namn</span>
        <input type="text" class="text-input fu-label-input" placeholder="Auto" />
      </div>
      <div class="fu-editor-field fu-image-field">
        <span class="fu-editor-label">Bild</span>
        <div class="fu-image-wrap">
          <img class="fu-preview-img" alt="" hidden />
          <div class="fu-image-actions">
            <label class="btn-ghost fu-upload-label">
              Välj bild
              <input type="file" class="fu-file-input" accept=".jpeg,.jpg,.png,.ico,image/jpeg,image/png,image/x-icon" hidden />
            </label>
            <button class="btn-ghost fu-clear-img-btn" hidden>Ta bort bild</button>
          </div>
        </div>
      </div>
      <div class="fu-editor-actions">
        <button class="btn-primary fu-save-btn">Spara</button>
        <button class="btn-ghost fu-clear-btn">Rensa slot</button>
      </div>
    `;

    const urlInput    = el.querySelector('.fu-url-input');
    const labelInput  = el.querySelector('.fu-label-input');
    const previewImg  = el.querySelector('.fu-preview-img');
    const fileInput   = el.querySelector('.fu-file-input');
    const clearImgBtn = el.querySelector('.fu-clear-img-btn');
    const saveBtn     = el.querySelector('.fu-save-btn');
    const clearBtn    = el.querySelector('.fu-clear-btn');

    // Set values via DOM property (avoids XSS)
    urlInput.value   = slot.url   || '';
    labelInput.value = slot.label || '';

    function updatePreview() {
      if (slot.image) {
        previewImg.src     = slot.image;
        previewImg.hidden  = false;
        clearImgBtn.hidden = false;
        return;
      }
      const url = urlInput.value.trim();
      if (!url) { previewImg.hidden = true; return; }
      try {
        const hostname    = new URL(url).hostname;
        previewImg.src    = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=64`;
        previewImg.hidden = false;
      } catch { previewImg.hidden = true; }
    }

    updatePreview();

    urlInput.addEventListener('blur', () => {
      if (!slot.image) updatePreview();
    });

    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = e => {
        slot.image = e.target.result;
        clearImgBtn.hidden = false;
        updatePreview();
      };
      reader.readAsDataURL(file);
    });

    clearImgBtn.addEventListener('click', () => {
      slot.image = null;
      clearImgBtn.hidden = true;
      fileInput.value    = '';
      updatePreview();
    });

    saveBtn.addEventListener('click', async () => {
      slot.url   = urlInput.value.trim();
      slot.label = labelInput.value.trim();
      await saveSlots();
      renderHomeSlots();
    });

    clearBtn.addEventListener('click', async () => {
      slot.url   = '';
      slot.label = '';
      slot.image = null;
      urlInput.value     = '';
      labelInput.value   = '';
      fileInput.value    = '';
      clearImgBtn.hidden = true;
      previewImg.hidden  = true;
      await saveSlots();
      renderHomeSlots();
    });

    list.appendChild(el);
  }
}

// ─── Init ────────────────────────────────────────────────────────────────────
export async function initFastURL() {
  const card          = document.getElementById('fastUrlCard');
  const enabledToggle = document.getElementById('fastUrlEnabled');

  const data = await Storage.get(['fastUrlSlots', 'fastUrlEnabled']);

  slots = (Array.isArray(data.fastUrlSlots) && data.fastUrlSlots.length === SLOT_COUNT)
    ? data.fastUrlSlots
    : defaultSlots();

  const enabled = data.fastUrlEnabled !== false;
  if (card)          card.hidden           = !enabled;
  if (enabledToggle) enabledToggle.checked  = enabled;

  enabledToggle?.addEventListener('change', async () => {
    if (card) card.hidden = !enabledToggle.checked;
    await Storage.set({ fastUrlEnabled: enabledToggle.checked });
  });

  renderHomeSlots();
  initSettingsSlots();
}
