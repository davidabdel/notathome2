import type { NextApiRequest, NextApiResponse } from 'next';
import sql from '../../../../lib/db';
import { requireAdmin } from '../../../../lib/auth';

export default requireAdmin(async (req, res) => {
  const { id } = req.query as { id: string };

  if (req.method === 'GET') {
    let rows;
    try {
      rows = await sql`SELECT id, block_number, address, note, last_visit FROM do_not_call WHERE map_id = ${id} ORDER BY block_number NULLS LAST, address`;
    } catch {
      // block_number/last_visit columns not added yet (created on first DNC write)
      rows = await sql`SELECT id, address, note FROM do_not_call WHERE map_id = ${id} ORDER BY address`;
    }
    return res.status(200).json(rows);
  }

  if (req.method === 'POST') {
    const { address, note, block_number, last_visit } = req.body;
    if (!address) return res.status(400).json({ error: 'address required' });
    await sql`ALTER TABLE do_not_call ADD COLUMN IF NOT EXISTS block_number INTEGER`;
    await sql`ALTER TABLE do_not_call ADD COLUMN IF NOT EXISTS last_visit TEXT`;
    const rows = await sql`
      INSERT INTO do_not_call (map_id, block_number, address, note, last_visit)
      VALUES (${id}, ${block_number || null}, ${address.trim()}, ${note?.trim() || null}, ${last_visit?.trim() || null})
      RETURNING id, block_number, address, note, last_visit
    `;
    return res.status(201).json(rows[0]);
  }

  if (req.method === 'DELETE') {
    const { dnc_id } = req.body;
    await sql`DELETE FROM do_not_call WHERE id = ${dnc_id} AND map_id = ${id}`;
    return res.status(204).end();
  }

  return res.status(405).end();
});
