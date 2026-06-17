import type { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';
import sql from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { token, password } = req.body as { token: string; password: string };
  if (!token || !password) return res.status(400).json({ error: 'Token and password required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

  const rows = await sql`
    SELECT id, admin_id FROM password_reset_tokens
    WHERE token = ${token} AND used = FALSE AND expires_at > NOW()
    LIMIT 1
  `;
  if (!rows.length) return res.status(400).json({ error: 'Invalid or expired reset link' });

  const hash = await bcrypt.hash(password, 12);
  await sql`UPDATE congregation_admins SET password_hash = ${hash} WHERE id = ${rows[0].admin_id}`;
  await sql`UPDATE password_reset_tokens SET used = TRUE WHERE id = ${rows[0].id}`;

  return res.status(200).json({ success: true });
}
