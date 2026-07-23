import type { NextApiRequest, NextApiResponse } from 'next';
import sql from '../../../lib/db';
import { requireAdmin, AdminPayload } from '../../../lib/auth';

interface ImportEntry {
  map_number: number | string;
  block_number?: number | string | null;
  address: string;
  last_visit?: string | null;
}

export default requireAdmin(async (req: NextApiRequest, res: NextApiResponse, admin: AdminPayload) => {
  if (req.method !== 'POST') return res.status(405).end();

  const congregation_id = admin.role === 'super_admin'
    ? (req.body.congregation_id as string)
    : admin.congregation_id!;
  if (!congregation_id) return res.status(400).json({ error: 'congregation_id required' });

  const entries = req.body.entries as ImportEntry[];
  if (!Array.isArray(entries) || !entries.length) {
    return res.status(400).json({ error: 'entries array required' });
  }
  if (entries.length > 1000) return res.status(400).json({ error: 'Too many entries (max 1000)' });

  await sql`ALTER TABLE do_not_call ADD COLUMN IF NOT EXISTS block_number INTEGER`;
  await sql`ALTER TABLE do_not_call ADD COLUMN IF NOT EXISTS last_visit TEXT`;

  const maps = await sql`SELECT id, map_number FROM territory_maps WHERE congregation_id = ${congregation_id}`;
  const mapByNumber = new Map<number, string>();
  for (const m of maps) mapByNumber.set(Number(m.map_number), m.id as string);

  let imported = 0;
  let updated = 0;
  const unmatchedMaps = new Set<number>();

  for (const e of entries) {
    const mapNumber = Number(e.map_number);
    const address = String(e.address || '').trim();
    if (!address || isNaN(mapNumber)) continue;

    const mapId = mapByNumber.get(mapNumber);
    if (!mapId) { unmatchedMaps.add(mapNumber); continue; }

    const block = e.block_number != null && String(e.block_number).trim() !== '' ? Number(e.block_number) : null;
    const lastVisit = e.last_visit ? String(e.last_visit).trim() : null;

    const existing = await sql`
      SELECT id FROM do_not_call WHERE map_id = ${mapId} AND LOWER(address) = LOWER(${address}) LIMIT 1
    `;
    if (existing.length) {
      await sql`
        UPDATE do_not_call SET
          block_number = COALESCE(${block}, block_number),
          last_visit = COALESCE(${lastVisit}, last_visit)
        WHERE id = ${existing[0].id}
      `;
      updated++;
    } else {
      await sql`
        INSERT INTO do_not_call (map_id, block_number, address, note, last_visit)
        VALUES (${mapId}, ${block}, ${address}, 'DNC', ${lastVisit})
      `;
      imported++;
    }
  }

  return res.status(200).json({ imported, updated, unmatched_maps: Array.from(unmatchedMaps).sort((a, b) => a - b) });
});
