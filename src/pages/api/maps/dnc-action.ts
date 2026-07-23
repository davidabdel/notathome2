import type { NextApiRequest, NextApiResponse } from 'next';
import sql from '../../../lib/db';

// Session-scoped DNC actions used from the field (no admin login):
//   touch  — stamp last_visit with the current date
//   delete — remove the DNC entry
// The caller must supply an active session whose territory map owns the entry.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { session_id, dnc_id, action } = req.body as { session_id?: string; dnc_id?: string; action?: string };
  if (!session_id || !dnc_id || (action !== 'touch' && action !== 'delete')) {
    return res.status(400).json({ error: 'session_id, dnc_id and a valid action are required' });
  }

  const session = await sql`
    SELECT congregation_id, map_number FROM sessions
    WHERE id = ${session_id} AND is_active = true AND expires_at > NOW() LIMIT 1
  `;
  if (!session.length) return res.status(404).json({ error: 'Session not found or expired' });

  const map = await sql`
    SELECT id FROM territory_maps
    WHERE congregation_id = ${session[0].congregation_id} AND map_number = ${session[0].map_number} LIMIT 1
  `;
  if (!map.length) return res.status(404).json({ error: 'Map not found' });

  // Confirm the DNC belongs to this session's map before mutating it
  const owned = await sql`SELECT id FROM do_not_call WHERE id = ${dnc_id} AND map_id = ${map[0].id} LIMIT 1`;
  if (!owned.length) return res.status(404).json({ error: 'DNC entry not found for this map' });

  if (action === 'delete') {
    await sql`DELETE FROM do_not_call WHERE id = ${dnc_id}`;
    return res.status(200).json({ ok: true, action: 'delete' });
  }

  await sql`ALTER TABLE do_not_call ADD COLUMN IF NOT EXISTS last_visit TEXT`;
  const lastVisit = new Date().toLocaleDateString('en-AU', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Australia/Sydney',
  });
  await sql`UPDATE do_not_call SET last_visit = ${lastVisit} WHERE id = ${dnc_id}`;
  return res.status(200).json({ ok: true, action: 'touch', last_visit: lastVisit });
}
