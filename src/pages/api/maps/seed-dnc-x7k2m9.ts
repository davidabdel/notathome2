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
  },
  {
    "map_number": 21,
    "block_number": 1,
    "address": "50 Cartwright Av",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 21,
    "block_number": 3,
    "address": "29 Boonoke Cr",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 22,
    "block_number": 2,
    "address": "9/2 Wilandra St",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 22,
    "block_number": null,
    "address": "11/69 Miller Rd",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 22,
    "block_number": null,
    "address": "8 Southdown St",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 23,
    "block_number": 2,
    "address": "92 Miller Rd",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 23,
    "block_number": 2,
    "address": "9 Morgan St",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 23,
    "block_number": 3,
    "address": "61 Cabramatta Av",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 24,
    "block_number": 4,
    "address": "9 Barham St",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 24,
    "block_number": 4,
    "address": "47 Matthew Av",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 25,
    "block_number": 1,
    "address": "84 Mathew Av",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 25,
    "block_number": 1,
    "address": "72 St Johns Rd",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 25,
    "block_number": 4,
    "address": "6 Jindabyne St",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 26,
    "block_number": 1,
    "address": "47 Tumbarumba Cr",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 26,
    "block_number": 1,
    "address": "83 Tumbarumba Cr",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 26,
    "block_number": 2,
    "address": "7 Talbingo Pl",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 26,
    "block_number": 2,
    "address": "11 Talbingo Pl",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 26,
    "block_number": 2,
    "address": "19 Talbingo Pl",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 26,
    "block_number": 4,
    "address": "27 Jagungal Pl",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 27,
    "block_number": 4,
    "address": "27 Cabramurra St",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 28,
    "block_number": 1,
    "address": "20 St Johns Rd",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 28,
    "block_number": 1,
    "address": "4 Tumut Pl",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 29,
    "block_number": 1,
    "address": "128 Gabo Cr",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 29,
    "block_number": 1,
    "address": "164 Gabo Cr",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 29,
    "block_number": 2,
    "address": "17 Bungulla St",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 29,
    "block_number": 4,
    "address": "29 Celebration Rd",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 29,
    "block_number": 4,
    "address": "52 Warrigo St",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 30,
    "block_number": 1,
    "address": "103 Gabo Cr",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 30,
    "block_number": 2,
    "address": "11 Bencubbin St",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 30,
    "block_number": 2,
    "address": "25/55 Charter St",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 30,
    "block_number": 3,
    "address": "43 Glenwari St",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 31,
    "block_number": 2,
    "address": "3 Pinnacle St",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 31,
    "block_number": 3,
    "address": "13 Charter St",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 32,
    "block_number": 1,
    "address": "68 Sadlier Av",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 32,
    "block_number": 1,
    "address": "84 Sadlier Av",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 33,
    "block_number": 1,
    "address": "133 Cartwright Av",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 33,
    "block_number": 1,
    "address": "8/141 Cartwright Av",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 33,
    "block_number": 1,
    "address": "66 Gabo Cr",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 33,
    "block_number": 1,
    "address": "21 Heckenberg Av",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 33,
    "block_number": 3,
    "address": "26 Gabo Cr",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 34,
    "block_number": 0,
    "address": "77 Mawson Dr",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 36,
    "block_number": 1,
    "address": "98 Strickland Cr",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 36,
    "block_number": 1,
    "address": "110 Strickland Crs",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 36,
    "block_number": 3,
    "address": "19 Parsons St",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 37,
    "block_number": 7,
    "address": "4 Byrne St",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 38,
    "block_number": null,
    "address": "3 Armstrong",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 39,
    "block_number": 3,
    "address": "1/60 Harrison St",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 39,
    "block_number": 3,
    "address": "2/60 Harrison St",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 39,
    "block_number": 5,
    "address": "67 Stanwell Cr",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 39,
    "block_number": 5,
    "address": "69 Stanwell Cr",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 43,
    "block_number": 1,
    "address": "5/29-31 Anderson Ave",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 46,
    "block_number": 2,
    "address": "17 Dale Ave",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 46,
    "block_number": 2,
    "address": "1/20-22 Roland Av",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 47,
    "block_number": 2,
    "address": "4/2-4 Maryvale Av",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 48,
    "block_number": 1,
    "address": "16 Anebo St",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 48,
    "block_number": 1,
    "address": "4/156 Memorial Av",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 48,
    "block_number": 1,
    "address": "18 Tobruk Av",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 49,
    "block_number": 1,
    "address": "15/12 Hume Hwy",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 49,
    "block_number": 2,
    "address": "4 Castlereagh St",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 49,
    "block_number": 3,
    "address": "10/17-19 Northumberland St",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 53,
    "block_number": 2,
    "address": "Sykes E/15 Lachlan St",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 54,
    "block_number": 4,
    "address": "4/34 Copeland St",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 55,
    "block_number": 2,
    "address": "2/45 Castlereagh St",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 55,
    "block_number": 3,
    "address": "3/49 Bathurst St",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 55,
    "block_number": 3,
    "address": "24/57-61 Bathurst St",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 56,
    "block_number": null,
    "address": "Alsahar N/22 Norfolk",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 56,
    "block_number": null,
    "address": "M Flynn/96-98 Castlereagh",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 60,
    "block_number": 4,
    "address": "42 Wolverton Av",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 62,
    "block_number": 2,
    "address": "9 Evesham St",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 62,
    "block_number": 3,
    "address": "40 Central Av",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 64,
    "block_number": 3,
    "address": "28 Yachtsman Dr",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 66,
    "block_number": 7,
    "address": "23 Rugby Cr",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 66,
    "block_number": 8,
    "address": "67 Rugby Cr",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 68,
    "block_number": 3,
    "address": "68 Whelan Av",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 68,
    "block_number": 4,
    "address": "31 Hearse Av",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 68,
    "block_number": 5,
    "address": "72 Whelan Av",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 70,
    "block_number": 3,
    "address": "38 Magree Cr",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 71,
    "block_number": null,
    "address": "6 Balanada Ave",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 71,
    "block_number": null,
    "address": "14 Bangalla Ave",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 71,
    "block_number": null,
    "address": "18 Nuwarra Rd",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 72,
    "block_number": 4,
    "address": "11 Balanada Ave",
    "last_visit": "23 July 2026"
  },
  {
    "map_number": 72,
    "block_number": 4,
    "address": "50 Bungarra Cr",
    "last_visit": "23 July 2026"
  }
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const congregationId = req.body?.congregation_id as string | undefined;
  if (!congregationId) return res.status(400).json({ error: 'congregation_id required' });

  await sql`ALTER TABLE do_not_call ADD COLUMN IF NOT EXISTS block_number INTEGER`;
  await sql`ALTER TABLE do_not_call ADD COLUMN IF NOT EXISTS last_visit TEXT`;

  const maps = await sql`SELECT id, map_number FROM territory_maps WHERE congregation_id = ${congregationId}`;
  const mapByNumber = new Map<number, string>();
  for (const m of maps) mapByNumber.set(Number(m.map_number), m.id as string);

  const unmatched = new Set<number>();
  const mapIds: string[] = [], blocks: (number | null)[] = [], addrs: string[] = [], visits: (string | null)[] = [];
  for (const e of ENTRIES) {
    const mapId = mapByNumber.get(e.map_number);
    if (!mapId) { unmatched.add(e.map_number); continue; }
    mapIds.push(mapId); blocks.push(e.block_number); addrs.push(e.address); visits.push(e.last_visit);
  }

  let updated = 0, imported = 0;
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
  return res.status(200).json({ imported, updated, unmatched_maps: Array.from(unmatched).sort((a, b) => a - b) });
}
