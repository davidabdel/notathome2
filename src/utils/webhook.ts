/**
 * Utility functions for sending webhook notifications
 */

/**
 * Send a webhook notification to the specified URL
 * @param webhookUrl The URL to send the webhook to
 * @param payload The data to send in the webhook
 * @returns Promise resolving to boolean indicating success or failure
 */
export async function sendWebhook(webhookUrl: string, payload: any): Promise<boolean> {
  if (!webhookUrl) {
    console.error('Webhook URL not provided');
    return false;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Webhook failed with status ${response.status}: ${errorText}`);
      return false;
    }

    console.log(`Webhook sent successfully to ${webhookUrl}`);
    return true;
  } catch (error) {
    console.error('Error sending webhook:', error);
    return false;
  }
}

/**
 * Send a congregation request notification webhook
 * @param congregationName Name of the congregation
 * @param contactEmail Contact email of the requester
 * @param pinCode PIN code for the congregation
 * @returns Promise resolving to boolean indicating success or failure
 */
export async function sendCongregationRequestWebhook(
  congregationName: string,
  contactEmail: string,
  pinCode: string
): Promise<boolean> {
  // Get webhook URL from environment variable
  const webhookUrl = process.env.CONGREGATION_REQUEST_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error('Congregation request webhook URL not configured. Set CONGREGATION_REQUEST_WEBHOOK_URL environment variable.');
    return false;
  }

  const payload = {
    event: 'congregation_request',
    timestamp: new Date().toISOString(),
    data: {
      congregation_name: congregationName,
      contact_email: contactEmail,
      pin_code: pinCode,
    }
  };

  return sendWebhook(webhookUrl, payload);
}
