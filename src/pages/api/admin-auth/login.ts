import type { NextApiRequest, NextApiResponse } from 'next';
import sql from '../../../lib/db';
import bcrypt from 'bcryptjs';
import { signAdminToken, setAdminCookie, AdminPayload } from '../../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { email, password } = req.body as { email: string; password: string };
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  if (
    email.toLowerCase().trim() === (process.env.SUPER_ADMIN_EMAIL || '').toLowerCase() &&
    password === process.env.SUPER_ADMIN_PASSWORD
  ) {
    const token = await signAdminToken({ sub: 'super', role: 'super_admin', email });
    setAdminCookie(res, token);
    return res.status(200).json({ role: 'super_admin' });
  }

  const rows = await sql`
    SELECT ca.id, ca.password_hash, ca.congregation_id, c.name as congregation_name
    FROM congregation_admins ca
    JOIN congregations c ON c.id = ca.congregation_id
    WHERE ca.email = ${email.toLowerCase().trim()} LIMIT 1
  `;
  if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, rows[0].password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const payload: AdminPayload = {
    sub: rows[0].id,
    role: 'congregation_admin',
    congregation_id: rows[0].congregation_id,
    congregation_name: rows[0].congregation_name,
    email: email.toLowerCase().trim(),
  };
  const token = await signAdminToken(payload);
  setAdminCookie(res, token);
  return res.status(200).json({ role: 'congregation_admin', congregation_name: rows[0].congregation_name });
}
