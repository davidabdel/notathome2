import type { NextApiRequest, NextApiResponse } from 'next';
import { randomBytes } from 'crypto';
import sql from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { email } = req.body as { email: string };
  if (!email) return res.status(400).json({ error: 'Email required' });

  const rows = await sql`
    SELECT ca.id, ca.email, c.name as congregation_name
    FROM congregation_admins ca
    JOIN congregations c ON c.id = ca.congregation_id
    WHERE ca.email = ${email.toLowerCase().trim()} LIMIT 1
  `;

  // Always return success to avoid email enumeration
  if (!rows.length) return res.status(200).json({ success: true });

  const token = randomBytes(32).toString('hex');
  await sql`
    INSERT INTO password_reset_tokens (admin_id, token)
    VALUES (${rows[0].id}, ${token})
  `;

  const appUrl = process.env.NEXT_PUBLIC_URL || 'https://nothome.app';
  const resetUrl = `${appUrl}/reset-password?token=${token}`;

  const { createTransport } = await import('nodemailer');
  const transporter = createTransport({
    host: 'smtp.improvmx.com',
    port: 587,
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  await transporter.sendMail({
    from: `Not At Home <${process.env.SMTP_USER}>`,
    to: rows[0].email,
    subject: 'Not At Home — Password Reset',
    html: `
      <p>Hi,</p>
      <p>A password reset was requested for the <strong>${rows[0].congregation_name}</strong> admin account.</p>
      <p><a href="${resetUrl}" style="background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;">Reset Password</a></p>
      <p>This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>
    `,
  });

  return res.status(200).json({ success: true });
}
