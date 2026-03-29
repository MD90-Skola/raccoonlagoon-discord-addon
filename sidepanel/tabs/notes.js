// tabs/notes.js — Notes tab: textarea + checklist

import { showStatus } from './utils.js';

let checklistData = [];

export function initNotes() {
  const checklistInput  = document.getElementById('checklistInput');
  const addChecklistBtn = document.getElementById('addChecklistBtn');
  const saveNotesBtn    = document.getElementById('saveNotesBtn');
  const notesStatus     = document.getElementById('notesStatus');

  saveNotesBtn.addEventListener('click', async () => {
    const notesTextarea = document.getElementById('notesText');
    await chrome.storage.local.set({ notes: notesTextarea.value });
    showStatus(notesStatus, 'Notes saved!', 'success');
  });

  addChecklistBtn.addEventListener('click', () => addItem());
  checklistInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addItem(); });

  function addItem() {
    const text = checklistInput.value.trim();
    if (!text) return;
    checklistData.push({ text, checked: false });
    checklistInput.value = '';
    renderChecklist(checklistData);
    persistChecklist();
  }
}

export async function loadNotes() {
  const data = await chrome.storage.local.get(['notes', 'checklist']);
  const notesTextarea = document.getElementById('notesText');
  if (data.notes) notesTextarea.value = data.notes;
  if (Array.isArray(data.checklist)) renderChecklist(data.checklist);
}

function renderChecklist(items) {
  checklistData = items;
  const checklistEl = document.getElementById('checklistItems');
  checklistEl.innerHTML = '';

  items.forEach((item, index) => {
    const li = document.createElement('li');
    li.className = 'checklist-item' + (item.checked ? ' checked' : '');

    const cb   = document.createElement('input');
    cb.type    = 'checkbox';
    cb.checked = item.checked;
    cb.addEventListener('change', () => {
      checklistData[index].checked = cb.checked;
      li.classList.toggle('checked', cb.checked);
      persistChecklist();
    });

    const span         = document.createElement('span');
    span.className     = 'checklist-item-text';
    span.textContent   = item.text;

    const del         = document.createElement('button');
    del.className     = 'checklist-item-del';
    del.title         = 'Remove';
    del.innerHTML     = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>`;
    del.addEventListener('click', () => {
      checklistData.splice(index, 1);
      renderChecklist(checklistData);
      persistChecklist();
    });

    li.appendChild(cb);
    li.appendChild(span);
    li.appendChild(del);
    checklistEl.appendChild(li);
  });
}

function persistChecklist() {
  chrome.storage.local.set({ checklist: checklistData });
}
