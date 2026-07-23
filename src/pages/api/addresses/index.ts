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

    // DNC flag: record ONLY on the map's permanent Do Not Call list — a DNC is
    // not a "not at home", so it must not appear in the not-at-home list.
    if (dnc === true) {
      const addrText = `${unit_number ? `${unit_number}/` : ''}${house_number} ${street_name}`.trim();
      const map = await sql`
        SELECT id FROM territory_maps
        WHERE congregation_id = ${session[0].congregation_id} AND map_number = ${session[0].map_number} LIMIT 1
      `;
      if (map.length) {
        await sql`ALTER TABLE do_not_call ADD COLUMN IF NOT EXISTS block_number INTEGER`;
        await sql`ALTER TABLE do_not_call ADD COLUMN IF NOT EXISTS last_visit TEXT`;
        const lastVisit = new Date().toLocaleDateString('en-AU', {
          day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Australia/Sydney',
        });
        const existing = await sql`
          SELECT id FROM do_not_call WHERE map_id = ${map[0].id} AND LOWER(address) = LOWER(${addrText}) LIMIT 1
        `;
        if (existing.length) {
          await sql`
            UPDATE do_not_call SET block_number = ${block_number}, last_visit = ${lastVisit}
            WHERE id = ${existing[0].id}
          `;
        } else {
          await sql`
            INSERT INTO do_not_call (map_id, block_number, address, note, last_visit)
            VALUES (${map[0].id}, ${block_number}, ${addrText}, 'DNC', ${lastVisit})
          `;
        }
      }
      return res.status(201).json({ ok: true, dnc: true });
    }

    const rows = await sql`
      INSERT INTO not_at_home_addresses (session_id, block_number, unit_number, house_number, street_name, suburb)
      VALUES (${session_id}, ${block_number}, ${unit_number || null}, ${house_number}, ${street_name}, ${suburb || null})
      RETURNING *
    `;
    return res.status(201).json(rows[0]);
  }

  return res.status(405).end();
}
