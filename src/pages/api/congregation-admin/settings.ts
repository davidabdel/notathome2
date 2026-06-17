import type { NextApiRequest, NextApiResponse } from 'next';
import sql from '../../../lib/db';
import { requireAdmin, AdminPayload } from '../../../lib/auth';

async function handler(req: NextApiRequest, res: NextApiResponse, admin: AdminPayload) {
  if (admin.role !== 'congregation_admin') return res.status(403).json({ error: 'Forbidden' });
  const cid = admin.congregation_id!;

  if (req.method === 'GET') {
    const rows = await sql`SELECT name, pin_code, notification_email, contact_email FROM congregations WHERE id = ${cid} LIMIT 1`;
    return res.status(200).json(rows[0]);
  }

  if (req.method === 'PUT') {
    const { pin_code, notification_email } = req.body;
    const rows = await sql`
      UPDATE congregations SET
        pin_code = COALESCE(${pin_code || null}, pin_code),
        notification_email = COALESCE(${notification_email || null}, notification_email)
      WHERE id = ${cid} RETURNING name, pin_code, notification_email
    `;
    return res.status(200).json(rows[0]);
  }

  return res.status(405).end();
}
export default requireAdmin(handler);
