import type { NextApiRequest, NextApiResponse } from 'next';
import sql from '../../../lib/db';
import { requireSuperAdmin, AdminPayload } from '../../../lib/auth';

async function handler(req: NextApiRequest, res: NextApiResponse, _admin: AdminPayload) {
  if (req.method === 'GET') {
    const rows = await sql`
      SELECT c.id, c.name, c.status, c.contact_email, c.notification_email, c.created_at,
        (SELECT COUNT(*)::int FROM territory_maps WHERE congregation_id = c.id) as map_count,
        (SELECT COUNT(*)::int FROM congregation_admins WHERE congregation_id = c.id) as admin_count,
        (SELECT COUNT(*)::int FROM sessions WHERE congregation_id = c.id AND is_active = true) as active_sessions
      FROM congregations c ORDER BY c.name
    `;
    return res.status(200).json(rows);
  }

  if (req.method === 'POST') {
    const { name, pin_code, contact_email } = req.body;
    if (!name || !pin_code) return res.status(400).json({ error: 'name and pin_code required' });
    const rows = await sql`
      INSERT INTO congregations (name, pin_code, contact_email, status)
      VALUES (${name.trim()}, ${pin_code.trim()}, ${contact_email || null}, 'active')
      RETURNING id, name, status
    `;
    return res.status(201).json(rows[0]);
  }

  return res.status(405).end();
}
export default requireSuperAdmin(handler);
