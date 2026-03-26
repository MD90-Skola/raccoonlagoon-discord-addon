// components/webhook.js — Delad webhook-modul
// Används av: background.js, instagram-content.js, youtube-content.js
// Alla Discord-anrop hanteras här

var Webhook = {

  // Skicka ett meddelande/länk till Discord webhook
  // webhookUrl: Discord webhook URL (string)
  // content:    Text att skicka, t.ex. en bild-URL eller video-URL (string)
  async send(webhookUrl, content) {
    if (!webhookUrl) {
      console.error('[Discord Sender] Ingen webhook URL angiven.');
      return { success: false, error: 'no_webhook' };
    }

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });

      if (!response.ok) {
        console.error('[Discord Sender] Webhook-fel:', response.status, response.statusText);
        return { success: false, error: response.status };
      }

      console.log('[Discord Sender] Skickat:', content);
      return { success: true };

    } catch (err) {
      console.error('[Discord Sender] Nätverksfel:', err.message);
      return { success: false, error: err.message };
    }
  }

};
