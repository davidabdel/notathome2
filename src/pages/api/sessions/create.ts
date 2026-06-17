import type { NextApiRequest, NextApiResponse } from 'next';
import sql from '../../../lib/db';

function generateCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { congregation_id, map_number } = req.body as { congregation_id: string; map_number: number };
  if (!congregation_id || !map_number) return res.status(400).json({ error: 'Missing fields' });

  const congs = await sql`SELECT id FROM congregations WHERE id = ${congregation_id} AND status = 'active' LIMIT 1`;
  if (!congs.length) return res.status(404).json({ error: 'Congregation not found' });

  let code = generateCode();
  for (let i = 0; i < 10; i++) {
    const ex = await sql`SELECT id FROM sessions WHERE code = ${code} AND is_active = true LIMIT 1`;
    if (!ex.length) break;
    code = generateCode();
  }

  const rows = await sql`
    INSERT INTO sessions (code, congregation_id, map_number)
    VALUES (${code}, ${congregation_id}, ${map_number})
    RETURNING id, code, map_number, created_at, expires_at
  `;
  return res.status(201).json(rows[0]);
}
