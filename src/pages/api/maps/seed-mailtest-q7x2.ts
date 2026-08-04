import type { NextApiRequest, NextApiResponse } from 'next';

// Temporary one-off endpoint to test outbound email in production. Removed after use.
const TOKEN = 'mailtest-q7x2';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { token, to } = req.body as { token?: string; to?: string };
  if (token !== TOKEN) return res.status(401).json({ error: 'bad token' });
  if (!to) return res.status(400).json({ error: 'to required' });

  const env = {
    SMTP_USER: process.env.SMTP_USER || null,
    hasPass: !!process.env.SMTP_PASS,
  };

  try {
    const { sendDncRequestEmail } = await import('../../../lib/email');
    await sendDncRequestEmail({
      to: [to],
      congregationName: 'Liverpool (TEST)',
      address: '123 Test Street',
      blockNumber: 1,
      mapNumber: 16,
      reason: 'This is a test email to confirm Do Not Call notifications are working.',
      submittedBy: 'System Test',
    });
    return res.status(200).json({ ok: true, sentTo: to, env });
  } catch (e) {
    return res.status(200).json({ ok: false, error: e instanceof Error ? e.message : String(e), env });
  }
}
