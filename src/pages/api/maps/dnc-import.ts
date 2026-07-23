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

  const unmatchedMaps = new Set<number>();
  const mapIds: string[] = [];
  const blocks: (number | null)[] = [];
  const addrs: string[] = [];
  const visits: (string | null)[] = [];

  for (const e of entries) {
    const mapNumber = Number(e.map_number);
    const address = String(e.address || '').trim();
    if (!address || isNaN(mapNumber)) continue;

    const mapId = mapByNumber.get(mapNumber);
    if (!mapId) { unmatchedMaps.add(mapNumber); continue; }

    mapIds.push(mapId);
    blocks.push(e.block_number != null && String(e.block_number).trim() !== '' ? Number(e.block_number) : null);
    addrs.push(address);
    visits.push(e.last_visit ? String(e.last_visit).trim() : null);
  }

  // Batched update-then-insert keeps this to a few queries so large
  // imports fit inside the serverless function time limit.
  let updated = 0;
  let imported = 0;
  if (mapIds.length) {
    const upd = await sql`
      UPDATE do_not_call x SET
        block_number = COALESCE(d.block_number, x.block_number),
        last_visit = COALESCE(d.last_visit, x.last_visit)
      FROM (SELECT * FROM unnest(${mapIds}::uuid[], ${blocks}::int[], ${addrs}::text[], ${visits}::text[])
            AS t(map_id, block_number, address, last_visit)) d
      WHERE x.map_id = d.map_id AND LOWER(x.address) = LOWER(d.address)
      RETURNING x.id
    `;
    updated = upd.length;

    const ins = await sql`
      INSERT INTO do_not_call (map_id, block_number, address, note, last_visit)
      SELECT d.map_id, d.block_number, d.address, 'DNC', d.last_visit
      FROM (SELECT * FROM unnest(${mapIds}::uuid[], ${blocks}::int[], ${addrs}::text[], ${visits}::text[])
            AS t(map_id, block_number, address, last_visit)) d
      WHERE NOT EXISTS (
        SELECT 1 FROM do_not_call x WHERE x.map_id = d.map_id AND LOWER(x.address) = LOWER(d.address)
      )
      RETURNING id
    `;
    imported = ins.length;
  }

  return res.status(200).json({ imported, updated, unmatched_maps: Array.from(unmatchedMaps).sort((a, b) => a - b) });
});
