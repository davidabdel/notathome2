import type { NextApiRequest, NextApiResponse } from 'next';
import sql from '../../../lib/db';
import { requireAdmin, AdminPayload } from '../../../lib/auth';

async function handler(req: NextApiRequest, res: NextApiResponse, admin: AdminPayload) {
  const congregation_id = admin.role === 'super_admin'
    ? req.query.congregation_id as string
    : admin.congregation_id!;

  if (req.method === 'GET') {
    const rows = await sql`
      SELECT id, map_number, name, block_count, image_url
      FROM territory_maps WHERE congregation_id = ${congregation_id} ORDER BY map_number
    `;
    return res.status(200).json(rows);
  }

  if (req.method === 'POST') {
    const { map_number, name, block_count } = req.body;
    if (!map_number || !block_count) return res.status(400).json({ error: 'map_number and block_count required' });
    const rows = await sql`
      INSERT INTO territory_maps (congregation_id, map_number, name, block_count)
      VALUES (${congregation_id}, ${map_number}, ${name || null}, ${block_count})
      ON CONFLICT (congregation_id, map_number)
      DO UPDATE SET name = EXCLUDED.name, block_count = EXCLUDED.block_count
      RETURNING *
    `;
    return res.status(201).json(rows[0]);
  }

  return res.status(405).end();
}
export default requireAdmin(handler);
