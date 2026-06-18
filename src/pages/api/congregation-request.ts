import type { NextApiRequest, NextApiResponse } from 'next';
import sql from '../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { name, contact_email } = req.body;
  if (!name || !contact_email) return res.status(400).json({ error: 'Name and email required' });

  const existing = await sql`SELECT id FROM congregations WHERE LOWER(name) = LOWER(${name.trim()}) LIMIT 1`;
  if (existing.length) return res.status(409).json({ error: 'Congregation name already registered' });

  await sql`INSERT INTO congregation_requests (name, contact_email, pin_code) VALUES (${name.trim()}, ${contact_email.trim()}, '0000')`;

  // Send email notification to super admin
  try {
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.createTransport({
      host: 'smtp.improvmx.com',
      port: 587,
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transporter.sendMail({
      from: `Not At Home <${process.env.SMTP_USER}>`,
      to: process.env.SUPER_ADMIN_EMAIL,
      subject: `New Congregation Request — ${name.trim()}`,
      html: `
        <h2>New Congregation Access Request</h2>
        <p><strong>Congregation:</strong> ${name.trim()}</p>
        <p><strong>Contact Email:</strong> ${contact_email.trim()}</p>
        <p>Log in to the super admin panel to approve or reject this request.</p>
        <p><a href="${process.env.NEXT_PUBLIC_URL}/super-admin">Open Super Admin Panel</a></p>
      `,
    });
  } catch (e) {
    // Don't fail the request if email fails — just log it
    console.error('Failed to send congregation request email:', e);
  }

  return res.status(201).json({ success: true });
}
