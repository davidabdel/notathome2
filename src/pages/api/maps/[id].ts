import type { NextApiRequest, NextApiResponse } from 'next';
import sql from '../../../lib/db';
import { requireAdmin, AdminPayload } from '../../../lib/auth';

async function handler(req: NextApiRequest, res: NextApiResponse, _admin: AdminPayload) {
  const { id } = req.query as { id: string };

  if (req.method === 'GET') {
    const maps = await sql`SELECT * FROM territory_maps WHERE id = ${id} LIMIT 1`;
    if (!maps.length) return res.status(404).json({ error: 'Map not found' });
    const dnc = await sql`SELECT * FROM do_not_call WHERE map_id = ${id} ORDER BY address`;
    return res.status(200).json({ ...maps[0], dnc });
  }

  if (req.method === 'PUT') {
    const { name, block_count, image_url } = req.body;
    const rows = await sql`
      UPDATE territory_maps SET
        name = COALESCE(${name ?? null}, name),
        block_count = COALESCE(${block_count ?? null}, block_count),
        image_url = COALESCE(${image_url ?? null}, image_url)
      WHERE id = ${id} RETURNING *
    `;
    return res.status(200).json(rows[0]);
  }

  if (req.method === 'DELETE') {
    await sql`DELETE FROM territory_maps WHERE id = ${id}`;
    return res.status(204).end();
  }

  return res.status(405).end();
}
export default requireAdmin(handler);
