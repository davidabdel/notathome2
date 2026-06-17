import type { NextApiRequest, NextApiResponse } from 'next';
import sql from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();
  const { congregation_id } = req.query as { congregation_id: string };
  if (!congregation_id) return res.status(400).json({ error: 'congregation_id required' });
  const rows = await sql`
    SELECT id, code, map_number, created_at
    FROM sessions
    WHERE congregation_id = ${congregation_id} AND is_active = true AND expires_at > NOW()
    ORDER BY created_at DESC
  `;
  return res.status(200).json(rows);
}
