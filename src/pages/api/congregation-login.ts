import type { NextApiRequest, NextApiResponse } from 'next';
import sql from '../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { name, pin_code } = req.body as { name: string; pin_code: string };
  if (!name || !pin_code) return res.status(400).json({ error: 'Name and PIN required' });

  const rows = await sql`
    SELECT id, name FROM congregations
    WHERE LOWER(name) = LOWER(${name.trim()}) AND pin_code = ${pin_code.trim()} AND status = 'active'
    LIMIT 1
  `;
  if (!rows.length) return res.status(401).json({ error: 'Invalid congregation name or PIN' });
  return res.status(200).json({ id: rows[0].id, name: rows[0].name });
}
