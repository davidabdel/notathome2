import type { NextApiRequest, NextApiResponse } from 'next';
import sql from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();
  const { congregation_id } = req.query;
  if (!congregation_id) return res.status(400).json({ error: 'congregation_id required' });
  const rows = await sql`
    SELECT id, map_number, name, block_count, image_url
    FROM territory_maps WHERE congregation_id = ${congregation_id as string} ORDER BY map_number
  `;
  return res.status(200).json(rows);
}
