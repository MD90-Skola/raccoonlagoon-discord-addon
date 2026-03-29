// tabs/utils.js — Shared helpers

export function setBadge(state) {
  const dot   = document.querySelector('.badge-dot');
  const label = document.querySelector('.badge-label');
  dot.className = 'badge-dot ' + (state || '');
  const labels = { ready: 'Ready', sending: 'Sending...', sent: 'Sent!', error: 'Error', '': 'Ready' };
  label.textContent = labels[state] ?? 'Ready';
}

export function showStatus(el, message, type) {
  el.textContent = message;
  el.className   = 'status-bar ' + type;
  setTimeout(() => clearStatus(el), 3200);
}

export function clearStatus(el) {
  el.textContent = '';
  el.className   = 'status-bar';
}

export function formatBytes(bytes) {
  if (bytes < 1024)        return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}
