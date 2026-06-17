import type { NextApiRequest, NextApiResponse } from 'next';
import sql from '../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();
  const { q } = req.query as { q?: string };
  if (!q || q.length < 2) return res.status(200).json([]);
  const rows = await sql`
    SELECT name FROM congregations
    WHERE LOWER(name) LIKE LOWER(${'%' + q.trim() + '%'}) AND status = 'active'
    ORDER BY name LIMIT 8
  `;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return res.status(200).json(rows.map((r: any) => r.name as string));
}
