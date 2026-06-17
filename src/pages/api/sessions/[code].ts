import type { NextApiRequest, NextApiResponse } from 'next';
import sql from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code } = req.query as { code: string };

  if (req.method === 'GET') {
    const rows = await sql`
      SELECT s.id, s.code, s.map_number, s.created_at, s.is_active,
             c.name as congregation_name, c.id as congregation_id
      FROM sessions s
      JOIN congregations c ON c.id = s.congregation_id
      WHERE s.code = ${code} AND s.is_active = true AND s.expires_at > NOW()
      LIMIT 1
    `;
    if (!rows.length) return res.status(404).json({ error: 'Session not found or expired' });
    return res.status(200).json(rows[0]);
  }

  if (req.method === 'DELETE') {
    const session = await sql`SELECT id FROM sessions WHERE code = ${code} AND is_active = true LIMIT 1`;
    if (!session.length) return res.status(404).json({ error: 'Session not found' });
    const addresses = await sql`
      SELECT * FROM not_at_home_addresses WHERE session_id = ${session[0].id}
      ORDER BY block_number, recorded_at
    `;
    await sql`UPDATE sessions SET is_active = false WHERE id = ${session[0].id}`;
    return res.status(200).json({ addresses });
  }

  return res.status(405).end();
}
