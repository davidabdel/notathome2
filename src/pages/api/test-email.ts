import type { NextApiRequest, NextApiResponse } from 'next';
import { sendMail } from '../../utils/mailer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const to = (req.method === 'POST' ? (req.body?.to as string | undefined) : undefined) || process.env.SMTP_USER || '';
    if (!to) {
      return res.status(400).json({ error: 'Missing recipient email. Provide body { to } or set SMTP_USER.' });
    }

    const result = await sendMail({
      to,
      subject: 'Not At Home - SMTP test',
      text: 'This is a SMTP test from Not At Home app.',
      html: '<p>This is a <strong>SMTP test</strong> from Not At Home app.</p>',
    });

    return res.status(200).json({ ok: true, messageId: result.messageId });
  } catch (err: any) {
    // Do not leak secrets; return sanitized error
    return res.status(500).json({ ok: false, error: err?.message || 'Failed to send email' });
  }
}
