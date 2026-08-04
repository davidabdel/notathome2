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
    const { session_id, block_number, unit_number, house_number, street_name, suburb, dnc, dnc_reason, dnc_submitted_by } = req.body;
    if (!session_id || !block_number || !house_number || !street_name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const session = await sql`
      SELECT id, congregation_id, map_number FROM sessions
      WHERE id = ${session_id} AND is_active = true AND expires_at > NOW() LIMIT 1
    `;
    if (!session.length) return res.status(404).json({ error: 'Session not found or expired' });

    // DNC flag: submit a REQUEST for the congregation admins to approve. It is
    // NOT placed on the map until approved, and is not a "not at home" record.
    if (dnc === true) {
      if (!dnc_reason || !String(dnc_reason).trim() || !dnc_submitted_by || !String(dnc_submitted_by).trim()) {
        return res.status(400).json({ error: 'A reason and your name are required for a Do Not Call request' });
      }
      const addrText = `${unit_number ? `${unit_number}/` : ''}${house_number} ${street_name}`.trim();
      const map = await sql`
        SELECT id FROM territory_maps
        WHERE congregation_id = ${session[0].congregation_id} AND map_number = ${session[0].map_number} LIMIT 1
      `;
      if (!map.length) return res.status(404).json({ error: 'Map not found' });

      await sql`ALTER TABLE do_not_call ADD COLUMN IF NOT EXISTS block_number INTEGER`;
      await sql`ALTER TABLE do_not_call ADD COLUMN IF NOT EXISTS last_visit TEXT`;
      await sql`ALTER TABLE do_not_call ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'approved'`;
      await sql`ALTER TABLE do_not_call ADD COLUMN IF NOT EXISTS reason TEXT`;
      await sql`ALTER TABLE do_not_call ADD COLUMN IF NOT EXISTS submitted_by TEXT`;

      const existing = await sql`
        SELECT id, status FROM do_not_call WHERE map_id = ${map[0].id} AND LOWER(address) = LOWER(${addrText}) LIMIT 1
      `;
      if (existing.length && existing[0].status === 'approved') {
        return res.status(200).json({ ok: true, dnc: 'already_approved' });
      }
      if (existing.length) {
        await sql`
          UPDATE do_not_call
          SET block_number = ${block_number}, reason = ${String(dnc_reason).trim()}, submitted_by = ${String(dnc_submitted_by).trim()}
          WHERE id = ${existing[0].id}
        `;
        return res.status(200).json({ ok: true, dnc: 'pending' });
      }
      await sql`
        INSERT INTO do_not_call (map_id, block_number, address, note, status, reason, submitted_by)
        VALUES (${map[0].id}, ${block_number}, ${addrText}, 'DNC', 'pending', ${String(dnc_reason).trim()}, ${String(dnc_submitted_by).trim()})
      `;
      return res.status(201).json({ ok: true, dnc: 'pending' });
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
