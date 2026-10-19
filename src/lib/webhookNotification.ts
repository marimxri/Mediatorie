// Webhook notification service for Google Apps Script Web App / Power Automate / Outlook
export interface WebhookPayload {
  event: 'withdrawal' | 'stock_alert' | 'test';
  timestamp: string;
  giftName: string;
  qty: number;
  person: string;
  reason: string;
  reserved?: string;
  currentStock: number;
  minStock: number;
  recipientEmail?: string;
  recipientName?: string;
  itemTitle?: string;
  requesterName?: string;
  quantity?: number;
  remainingStock?: number;
}

const DEFAULT_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbxC6ws9ywt5ZiaUkyC6i2APlCNXM8MvomBK7mUe5pDhy0qmceNwtCzEm--XhUgU1pib/exec';
const STORAGE_KEY = 'cristal_email_webhook_url';
const ENABLED_KEY = 'cristal_email_webhook_enabled';

export const getWebhookUrl = (): string => {
  return localStorage.getItem(STORAGE_KEY) || DEFAULT_WEBHOOK_URL;
};

export const setWebhookUrl = (url: string) => {
  localStorage.setItem(STORAGE_KEY, url.trim());
};

export const isWebhookEnabled = (): boolean => {
  const val = localStorage.getItem(ENABLED_KEY);
  return val === null ? true : val === 'true';
};

export const setWebhookEnabled = (enabled: boolean) => {
  localStorage.setItem(ENABLED_KEY, enabled ? 'true' : 'false');
};

export const sendWithdrawalNotification = async (payload: WebhookPayload): Promise<boolean> => {
  if (!isWebhookEnabled()) {
    return false;
  }

  const url = getWebhookUrl();
  if (!url) return false;

  // Complete standardized payload with aliases so both format versions of Apps Script accept it
  const enrichedPayload = {
    ...payload,
    recipientEmail: payload.recipientEmail || 'marina.nascimento@mediatorie.com.br',
    recipientName: payload.recipientName || 'Marina Nascimento',
    itemTitle: payload.giftName,
    requesterName: payload.person,
    quantity: payload.qty,
    remainingStock: payload.currentStock,
  };

  try {
    // Send as text/plain via no-cors (Google Apps Script web apps perform 302 redirects which fail standard CORS headers in browsers, but no-cors works 100% smoothly)
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      cache: 'no-cache',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(enrichedPayload),
    });
    console.log('Notificação enviada com sucesso para:', url, enrichedPayload);
    return true;
  } catch (err) {
    console.error('Falha ao enviar webhook de notificação:', err);
    return false;
  }
};
