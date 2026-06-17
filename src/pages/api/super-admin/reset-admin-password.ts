import type { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';
import sql from '../../../lib/db';
import { requireSuperAdmin } from '../../../lib/auth';

export default requireSuperAdmin(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  const { admin_id, password } = req.body as { admin_id: string; password: string };
  if (!admin_id || !password) return res.status(400).json({ error: 'admin_id and password required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

  const hash = await bcrypt.hash(password, 12);
  await sql`UPDATE congregation_admins SET password_hash = ${hash} WHERE id = ${admin_id}`;
  return res.status(200).json({ success: true });
});
