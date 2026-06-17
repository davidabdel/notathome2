import type { NextApiRequest, NextApiResponse } from 'next';
import sql from '../../../lib/db';
import bcrypt from 'bcryptjs';
import { requireAdmin, AdminPayload } from '../../../lib/auth';

async function handler(req: NextApiRequest, res: NextApiResponse, admin: AdminPayload) {
  const cid = admin.role === 'super_admin'
    ? req.query.congregation_id as string
    : admin.congregation_id!;

  if (req.method === 'GET') {
    const rows = await sql`SELECT id, email, created_at FROM congregation_admins WHERE congregation_id = ${cid}`;
    return res.status(200).json(rows);
  }

  if (req.method === 'POST') {
    const count = await sql`SELECT COUNT(*)::int as n FROM congregation_admins WHERE congregation_id = ${cid}`;
    if (count[0].n >= 3) return res.status(400).json({ error: 'Maximum 3 admins per congregation' });
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });
    const hash = await bcrypt.hash(password, 10);
    const rows = await sql`
      INSERT INTO congregation_admins (congregation_id, email, password_hash)
      VALUES (${cid}, ${email.toLowerCase().trim()}, ${hash})
      RETURNING id, email, created_at
    `;
    return res.status(201).json(rows[0]);
  }

  if (req.method === 'DELETE') {
    const { admin_id } = req.body;
    await sql`DELETE FROM congregation_admins WHERE id = ${admin_id} AND congregation_id = ${cid}`;
    return res.status(204).end();
  }

  return res.status(405).end();
}
export default requireAdmin(handler);
