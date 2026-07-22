import type { NextApiRequest, NextApiResponse } from 'next';
import sql from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { session_id } = req.query as { session_id: string };
    if (!session_id) return res.status(400).json({ error: 'session_id required' });
    const rows = await sql`
      SELECT * FROM not_at_home_addresses WHERE session_id = ${session_id}
      ORDER BY block_number, recorded_at
    `;
    return res.status(200).json(rows);
  }

  if (req.method === 'POST') {
    const { session_id, block_number, unit_number, house_number, street_name, suburb, dnc } = req.body;
    if (!session_id || !block_number || !house_number || !street_name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const session = await sql`
      SELECT id, congregation_id, map_number FROM sessions
      WHERE id = ${session_id} AND is_active = true AND expires_at > NOW() LIMIT 1
    `;
    if (!session.length) return res.status(404).json({ error: 'Session not found or expired' });
    const rows = await sql`
      INSERT INTO not_at_home_addresses (session_id, block_number, unit_number, house_number, street_name, suburb)
      VALUES (${session_id}, ${block_number}, ${unit_number || null}, ${house_number}, ${street_name}, ${suburb || null})
      RETURNING *
    `;

    // DNC flag: permanently record this address on the map's Do Not Call list
    if (dnc === true) {
      const addrText = `${unit_number ? `${unit_number}/` : ''}${house_number} ${street_name}`.trim();
      const map = await sql`
        SELECT id FROM territory_maps
        WHERE congregation_id = ${session[0].congregation_id} AND map_number = ${session[0].map_number} LIMIT 1
      `;
      if (map.length) {
        const existing = await sql`
          SELECT id FROM do_not_call WHERE map_id = ${map[0].id} AND LOWER(address) = LOWER(${addrText}) LIMIT 1
        `;
        if (!existing.length) {
          await sql`INSERT INTO do_not_call (map_id, address, note) VALUES (${map[0].id}, ${addrText}, 'DNC')`;
        }
      }
    }

    return res.status(201).json(rows[0]);
  }

  return res.status(405).end();
}
