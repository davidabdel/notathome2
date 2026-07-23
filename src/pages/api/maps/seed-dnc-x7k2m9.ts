import type { NextApiRequest, NextApiResponse } from 'next';
import sql from '../../../lib/db';

// Temporary one-off seed of the congregation's DNC list. Removed after use.
const ENTRIES: Array<{ map_number: number; block_number: number | null; address: string; last_visit: string | null }> = [
  {
    "map_number": 1,
    "block_number": null,
    "address": "9 Oriole Pl",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 4,
    "block_number": 4,
    "address": "37 Falcon Cct",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 4,
    "block_number": 4,
    "address": "8 Osprey Av",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 4,
    "block_number": 4,
    "address": "26 Osprey Av",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 5,
    "block_number": 4,
    "address": "43 Sparrow Lane",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 6,
    "block_number": 1,
    "address": "88 Swan Cct",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 6,
    "block_number": 2,
    "address": "18 Cygnet Av",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 6,
    "block_number": 4,
    "address": "205 Whitford Rd",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 7,
    "block_number": 1,
    "address": "6 Kingfisher Av",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 7,
    "block_number": 1,
    "address": "111A Wilson Rd",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 7,
    "block_number": 1,
    "address": "111B Wilson Rd",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 7,
    "block_number": 2,
    "address": "9 Robin St",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 7,
    "block_number": 2,
    "address": "4 Sandpiper Av",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 7,
    "block_number": 2,
    "address": "4 Sandplover Pl",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 7,
    "block_number": 2,
    "address": "4 Swallow Pl",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 7,
    "block_number": 2,
    "address": "9 Swallow Pl",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 7,
    "block_number": 3,
    "address": "19 Sandplover Pl",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 10,
    "block_number": 1,
    "address": "8 Sanderling St",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 10,
    "block_number": 1,
    "address": "178 South Liverpool Rd",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 10,
    "block_number": 1,
    "address": "4 Warbler Cl",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 10,
    "block_number": 2,
    "address": "3 coucal av",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 10,
    "block_number": 2,
    "address": "19 Shearwater Rd",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 10,
    "block_number": 3,
    "address": "73 Sanderling St",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 10,
    "block_number": 3,
    "address": "3 Silvereye Pl",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 12,
    "block_number": 1,
    "address": "80 Corvus Rd",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 12,
    "block_number": 2,
    "address": "79 Whitford Rd",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 13,
    "block_number": 1,
    "address": "92 Rundle Rd",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 13,
    "block_number": 2,
    "address": "16 Coongra St",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 14,
    "block_number": 3,
    "address": "114 Rundle Rd",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 14,
    "block_number": 5,
    "address": "23 Kingarth St",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 14,
    "block_number": 6,
    "address": "4 Burra St",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 14,
    "block_number": 6,
    "address": "27 Travana",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 14,
    "block_number": 6,
    "address": "31 Trevanna St",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 15,
    "block_number": 1,
    "address": "27 Kaluga St",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 15,
    "block_number": 1,
    "address": "33 Kaluga St",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 16,
    "block_number": 1,
    "address": "6 Lyndley S",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 16,
    "block_number": 2,
    "address": "31 Lyndley S",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 16,
    "block_number": 3,
    "address": "7 Colly Pl",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 16,
    "block_number": 3,
    "address": "6 Colly Pl",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 16,
    "block_number": 3,
    "address": "32 Lyndley St",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 16,
    "block_number": 4,
    "address": "9 Cartwright Av",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 17,
    "block_number": 2,
    "address": "4 Albany St",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 17,
    "block_number": 2,
    "address": "4 Tallara Pl",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 17,
    "block_number": 2,
    "address": "5 Tallara Pl",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 17,
    "block_number": 2,
    "address": "6 Tallara Pl",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 17,
    "block_number": 3,
    "address": "5 Albany St",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 18,
    "block_number": 1,
    "address": "51 Aberdeen Rd",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 18,
    "block_number": 1,
    "address": "9 Angus Pl",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 19,
    "block_number": 1,
    "address": "51/109 Cabramatta Av",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 20,
    "block_number": 1,
    "address": "20 Ryeland st",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 20,
    "block_number": 2,
    "address": "4 Kenilworth St",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 20,
    "block_number": 2,
    "address": "27 Ryeland St",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 20,
    "block_number": 3,
    "address": "47 Ryeland St",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 20,
    "block_number": 4,
    "address": "42 Ryeland St",
    "last_visit": "23 July 2026"
  }
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const congs = await sql`
      SELECT c.id, c.name, COUNT(m.id)::int AS map_count
      FROM congregations c LEFT JOIN territory_maps m ON m.congregation_id = c.id
      GROUP BY c.id, c.name ORDER BY c.name
    `;
    return res.status(200).json(congs);
  }

  if (req.method === 'POST') {
    const congs = await sql`SELECT id, name FROM congregations`;
    let congregationId = req.body?.congregation_id as string | undefined;
    if (!congregationId) {
      if (congs.length !== 1) return res.status(400).json({ error: 'specify congregation_id', congregations: congs });
      congregationId = congs[0].id as string;
    }

    await sql`ALTER TABLE do_not_call ADD COLUMN IF NOT EXISTS block_number INTEGER`;
    await sql`ALTER TABLE do_not_call ADD COLUMN IF NOT EXISTS last_visit TEXT`;

    const maps = await sql`SELECT id, map_number FROM territory_maps WHERE congregation_id = ${congregationId}`;
    const mapByNumber = new Map<number, string>();
    for (const m of maps) mapByNumber.set(Number(m.map_number), m.id as string);

    let imported = 0, updated = 0;
    const unmatched = new Set<number>();
    for (const e of ENTRIES) {
      const mapId = mapByNumber.get(e.map_number);
      if (!mapId) { unmatched.add(e.map_number); continue; }
      const existing = await sql`
        SELECT id FROM do_not_call WHERE map_id = ${mapId} AND LOWER(address) = LOWER(${e.address}) LIMIT 1
      `;
      if (existing.length) {
        await sql`
          UPDATE do_not_call SET block_number = COALESCE(${e.block_number}, block_number), last_visit = COALESCE(${e.last_visit}, last_visit)
          WHERE id = ${existing[0].id}
        `;
        updated++;
      } else {
        await sql`
          INSERT INTO do_not_call (map_id, block_number, address, note, last_visit)
          VALUES (${mapId}, ${e.block_number}, ${e.address}, 'DNC', ${e.last_visit})
        `;
        imported++;
      }
    }
    return res.status(200).json({ imported, updated, unmatched_maps: Array.from(unmatched).sort((a, b) => a - b) });
  }

  return res.status(405).end();
}
