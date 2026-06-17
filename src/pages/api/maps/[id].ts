import type { NextApiRequest, NextApiResponse } from 'next';
import sql from '../../../lib/db';
import { requireAdmin, AdminPayload } from '../../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id: string };

  // GET is public — session participants need map image + DNC list
  if (req.method === 'GET') {
    const maps = await sql`SELECT * FROM territory_maps WHERE id = ${id} LIMIT 1`;
    if (!maps.length) return res.status(404).json({ error: 'Map not found' });
    const dnc = await sql`SELECT * FROM do_not_call WHERE map_id = ${id} ORDER BY address`;
    return res.status(200).json({ ...maps[0], dnc });
  }

  // PUT and DELETE require admin
  return requireAdmin(async (req2: NextApiRequest, res2: NextApiResponse, _admin: AdminPayload) => {
    if (req2.method === 'PUT') {
      const { name, block_count, image_url } = req2.body;
      const rows = await sql`
        UPDATE territory_maps SET
          name = COALESCE(${name ?? null}, name),
          block_count = COALESCE(${block_count ?? null}, block_count),
          image_url = COALESCE(${image_url ?? null}, image_url)
        WHERE id = ${id} RETURNING *
      `;
      return res2.status(200).json(rows[0]);
    }

    if (req2.method === 'DELETE') {
      await sql`DELETE FROM territory_maps WHERE id = ${id}`;
      return res2.status(204).end();
    }

    return res2.status(405).end();
  })(req, res);
}
