import type { NextApiRequest, NextApiResponse } from 'next';
import sql from '../../../../lib/db';
import { requireAdmin } from '../../../../lib/auth';

export default requireAdmin(async (req, res) => {
  const { id } = req.query as { id: string };

  if (req.method === 'GET') {
    const rows = await sql`SELECT id, address, note FROM do_not_call WHERE map_id = ${id} ORDER BY address`;
    return res.status(200).json(rows);
  }

  if (req.method === 'POST') {
    const { address, note } = req.body;
    if (!address) return res.status(400).json({ error: 'address required' });
    const rows = await sql`
      INSERT INTO do_not_call (map_id, address, note) VALUES (${id}, ${address.trim()}, ${note?.trim() || null})
      RETURNING id, address, note
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
