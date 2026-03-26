// popup.js — Popup-logik
// Hanterar inläsning och sparning av webhook + toggle-tillstånd

document.addEventListener('DOMContentLoaded', async () => {

  // ─── Rendera SVG-ikoner ──────────────────────────────────────────────────

  document.getElementById('headerIcon').innerHTML   = Icons.discord;
  document.getElementById('iconImages').innerHTML   = Icons.image;
  document.getElementById('iconYoutube').innerHTML  = Icons.youtube;
  document.getElementById('iconInstagram').innerHTML = Icons.instagram;

  // ─── Hämta sparade inställningar ────────────────────────────────────────

  const settings = await Storage.getAll();

  // Fyll i webhook-fältet om en URL är sparad
  if (settings.webhookUrl) {
    document.getElementById('webhookUrl').value = settings.webhookUrl;
  }

  // Sätt toggle-tillstånd baserat på sparade värden
  document.getElementById('imagesEnabled').checked    = settings.imagesEnabled    === true;
  document.getElementById('youtubeEnabled').checked   = settings.youtubeEnabled   === true;
  document.getElementById('instagramEnabled').checked = settings.instagramEnabled === true;

  // ─── Spara webhook ───────────────────────────────────────────────────────

  document.getElementById('saveBtn').addEventListener('click', async () => {
    const url    = document.getElementById('webhookUrl').value.trim();
    const status = document.getElementById('saveStatus');

    // Validera att fältet inte är tomt
    if (!url) {
      showStatus(status, 'Ange en webhook URL.', 'error');
      return;
    }

    // Enkel validering: Discord webhooks har ett känt URL-mönster
    const isDiscordWebhook =
      url.startsWith('https://discord.com/api/webhooks/') ||
      url.startsWith('https://discordapp.com/api/webhooks/') ||
      url.startsWith('https://ptb.discord.com/api/webhooks/');

    if (!isDiscordWebhook) {
      showStatus(status, 'Ogiltig Discord webhook URL.', 'error');
      return;
    }

    await Storage.set({ webhookUrl: url });
    showStatus(status, 'Webhook sparad!', 'success');
  });

  // ─── Toggles — sparas direkt vid ändring ─────────────────────────────────

  document.getElementById('imagesEnabled').addEventListener('change', (e) => {
    Storage.set({ imagesEnabled: e.target.checked });
  });

  document.getElementById('youtubeEnabled').addEventListener('change', (e) => {
    Storage.set({ youtubeEnabled: e.target.checked });
  });

  document.getElementById('instagramEnabled').addEventListener('change', (e) => {
    Storage.set({ instagramEnabled: e.target.checked });
  });

});

// ─── Hjälpfunktion: visa statusmeddelande med auto-rensning ─────────────────

function showStatus(el, message, type) {
  el.textContent = message;
  el.className   = 'status ' + type;

  // Rensa meddelandet efter 3 sekunder
  setTimeout(() => {
    el.textContent = '';
    el.className   = 'status';
  }, 3000);
}
