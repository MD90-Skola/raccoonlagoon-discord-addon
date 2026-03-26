// components/webhook.js
// Delad modul för Discord webhook-anrop
// Används av: background.js, instagram-content.js, youtube-content.js

var Webhook = {
  async send(webhookUrl, content) {
    if (!webhookUrl || typeof webhookUrl !== 'string') {
      console.error('[Discord Sender] Ogiltig webhook URL');
      return {
        success: false,
        error: 'invalid_webhook'
      };
    }

    if (!content || typeof content !== 'string') {
      console.error('[Discord Sender] Inget giltigt content att skicka');
      return {
        success: false,
        error: 'no_content'
      };
    }

    const cleanWebhookUrl = webhookUrl.trim();
    const cleanContent = content.trim();

    if (!cleanWebhookUrl) {
      console.error('[Discord Sender] Webhook URL är tom');
      return {
        success: false,
        error: 'empty_webhook'
      };
    }

    if (!cleanContent) {
      console.error('[Discord Sender] Content är tomt');
      return {
        success: false,
        error: 'empty_content'
      };
    }

    console.log('[Discord Sender] Skickar:', cleanContent);

    try {
      const response = await fetch(cleanWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: cleanContent
        })
      });

      if (!response.ok) {
        let errorText = '';

        try {
          errorText = await response.text();
        } catch (readError) {
          errorText = 'Kunde inte läsa response body';
        }

        const message = `[Discord Sender] Webhook-fel ${response.status} ${response.statusText}: ${errorText}`;
        console.error(message);

        return {
          success: false,
          error: response.status,
          status: response.status,
          statusText: response.statusText,
          details: errorText
        };
      }

      console.log('[Discord Sender] SUCCESS');

      return {
        success: true
      };
    } catch (err) {
      const errorMessage = err && err.message ? err.message : 'Okänt nätverksfel';

      console.error('[Discord Sender] Nätverksfel:', errorMessage);

      return {
        success: false,
        error: 'network_error',
        details: errorMessage
      };
    }
  }
};