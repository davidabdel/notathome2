#!/usr/bin/env python3
"""Write all new API routes for the Not At Home v2 rebuild."""
import os

BASE = os.path.join(os.path.dirname(__file__), '..', 'src', 'pages', 'api')

files = {}

files['sessions/create.ts'] = """import type { NextApiRequest, NextApiResponse } from 'next';
import sql from '../../../lib/db';

function generateCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { congregation_id, map_number } = req.body as { congregation_id: string; map_number: number };
  if (!congregation_id || !map_number) return res.status(400).json({ error: 'Missing fields' });

  const congs = await sql`SELECT id FROM congregations WHERE id = ${congregation_id} AND status = 'active' LIMIT 1`;
  if (!congs.length) return res.status(404).json({ error: 'Congregation not found' });

  let code = generateCode();
  for (let i = 0; i < 10; i++) {
    const ex = await sql`SELECT id FROM sessions WHERE code = ${code} AND is_active = true LIMIT 1`;
    if (!ex.length) break;
    code = generateCode();
  }

  const rows = await sql`
    INSERT INTO sessions (code, congregation_id, map_number)
    VALUES (${code}, ${congregation_id}, ${map_number})
    RETURNING id, code, map_number, created_at, expires_at
  `;
  return res.status(201).json(rows[0]);
}
"""

files['sessions/[code].ts'] = """import type { NextApiRequest, NextApiResponse } from 'next';
import sql from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code } = req.query as { code: string };

  if (req.method === 'GET') {
    const rows = await sql`
      SELECT s.id, s.code, s.map_number, s.created_at, s.is_active,
             c.name as congregation_name, c.id as congregation_id
      FROM sessions s
      JOIN congregations c ON c.id = s.congregation_id
      WHERE s.code = ${code} AND s.is_active = true AND s.expires_at > NOW()
      LIMIT 1
    `;
    if (!rows.length) return res.status(404).json({ error: 'Session not found or expired' });
    return res.status(200).json(rows[0]);
  }

  if (req.method === 'DELETE') {
    const session = await sql`SELECT id FROM sessions WHERE code = ${code} AND is_active = true LIMIT 1`;
    if (!session.length) return res.status(404).json({ error: 'Session not found' });
    const addresses = await sql`
      SELECT * FROM not_at_home_addresses WHERE session_id = ${session[0].id}
      ORDER BY block_number, CAST(house_number AS INTEGER)
    `;
    await sql`UPDATE sessions SET is_active = false WHERE id = ${session[0].id}`;
    return res.status(200).json({ addresses });
  }

  return res.status(405).end();
}
"""

files['sessions/active.ts'] = """import type { NextApiRequest, NextApiResponse } from 'next';
import sql from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();
  const { congregation_id } = req.query as { congregation_id: string };
  if (!congregation_id) return res.status(400).json({ error: 'congregation_id required' });
  const rows = await sql`
    SELECT id, code, map_number, created_at
    FROM sessions
    WHERE congregation_id = ${congregation_id} AND is_active = true AND expires_at > NOW()
    ORDER BY created_at DESC
  `;
  return res.status(200).json(rows);
}
"""

files['addresses/index.ts'] = """import type { NextApiRequest, NextApiResponse } from 'next';
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
    const { session_id, block_number, unit_number, house_number, street_name, suburb } = req.body;
    if (!session_id || !block_number || !house_number || !street_name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const session = await sql`
      SELECT id FROM sessions WHERE id = ${session_id} AND is_active = true AND expires_at > NOW() LIMIT 1
    `;
    if (!session.length) return res.status(404).json({ error: 'Session not found or expired' });
    const rows = await sql`
      INSERT INTO not_at_home_addresses (session_id, block_number, unit_number, house_number, street_name, suburb)
      VALUES (${session_id}, ${block_number}, ${unit_number || null}, ${house_number}, ${street_name}, ${suburb || null})
      RETURNING *
    `;
    return res.status(201).json(rows[0]);
  }

  return res.status(405).end();
}
"""

files['addresses/[id].ts'] = """import type { NextApiRequest, NextApiResponse } from 'next';
import sql from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') return res.status(405).end();
  const { id } = req.query as { id: string };
  await sql`DELETE FROM not_at_home_addresses WHERE id = ${id}`;
  return res.status(204).end();
}
"""

files['maps/index.ts'] = """import type { NextApiRequest, NextApiResponse } from 'next';
import sql from '../../../lib/db';
import { requireAdmin, AdminPayload } from '../../../lib/auth';

async function handler(req: NextApiRequest, res: NextApiResponse, admin: AdminPayload) {
  const congregation_id = admin.role === 'super_admin'
    ? req.query.congregation_id as string
    : admin.congregation_id!;

  if (req.method === 'GET') {
    const rows = await sql`
      SELECT id, map_number, name, block_count, image_url
      FROM territory_maps WHERE congregation_id = ${congregation_id} ORDER BY map_number
    `;
    return res.status(200).json(rows);
  }

  if (req.method === 'POST') {
    const { map_number, name, block_count } = req.body;
    if (!map_number || !block_count) return res.status(400).json({ error: 'map_number and block_count required' });
    const rows = await sql`
      INSERT INTO territory_maps (congregation_id, map_number, name, block_count)
      VALUES (${congregation_id}, ${map_number}, ${name || null}, ${block_count})
      ON CONFLICT (congregation_id, map_number)
      DO UPDATE SET name = EXCLUDED.name, block_count = EXCLUDED.block_count
      RETURNING *
    `;
    return res.status(201).json(rows[0]);
  }

  return res.status(405).end();
}
export default requireAdmin(handler);
"""

files['maps/[id].ts'] = """import type { NextApiRequest, NextApiResponse } from 'next';
import sql from '../../../lib/db';
import { requireAdmin, AdminPayload } from '../../../lib/auth';

async function handler(req: NextApiRequest, res: NextApiResponse, _admin: AdminPayload) {
  const { id } = req.query as { id: string };

  if (req.method === 'GET') {
    const maps = await sql`SELECT * FROM territory_maps WHERE id = ${id} LIMIT 1`;
    if (!maps.length) return res.status(404).json({ error: 'Map not found' });
    const dnc = await sql`SELECT * FROM do_not_call WHERE map_id = ${id} ORDER BY address`;
    return res.status(200).json({ ...maps[0], dnc });
  }

  if (req.method === 'PUT') {
    const { name, block_count, image_url } = req.body;
    const rows = await sql`
      UPDATE territory_maps SET
        name = COALESCE(${name ?? null}, name),
        block_count = COALESCE(${block_count ?? null}, block_count),
        image_url = COALESCE(${image_url ?? null}, image_url)
      WHERE id = ${id} RETURNING *
    `;
    return res.status(200).json(rows[0]);
  }

  if (req.method === 'DELETE') {
    await sql`DELETE FROM territory_maps WHERE id = ${id}`;
    return res.status(204).end();
  }

  return res.status(405).end();
}
export default requireAdmin(handler);
"""

files['maps/[id]/dnc.ts'] = """import type { NextApiRequest, NextApiResponse } from 'next';
import sql from '../../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id: string };

  if (req.method === 'GET') {
    const rows = await sql`SELECT * FROM do_not_call WHERE map_id = ${id} ORDER BY address`;
    return res.status(200).json(rows);
  }

  if (req.method === 'POST') {
    const { address, note } = req.body;
    if (!address) return res.status(400).json({ error: 'address required' });
    const rows = await sql`
      INSERT INTO do_not_call (map_id, address, note) VALUES (${id}, ${address}, ${note || null}) RETURNING *
    `;
    return res.status(201).json(rows[0]);
  }

  if (req.method === 'DELETE') {
    const { dnc_id } = req.body;
    await sql`DELETE FROM do_not_call WHERE id = ${dnc_id} AND map_id = ${id}`;
    return res.status(204).end();
  }

  return res.status(405).end();
}
"""

files['congregation-request.ts'] = """import type { NextApiRequest, NextApiResponse } from 'next';
import sql from '../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { name, contact_email } = req.body;
  if (!name || !contact_email) return res.status(400).json({ error: 'Name and email required' });
  const existing = await sql`SELECT id FROM congregations WHERE LOWER(name) = LOWER(${name.trim()}) LIMIT 1`;
  if (existing.length) return res.status(409).json({ error: 'Congregation name already registered' });
  await sql`
    INSERT INTO congregation_requests (name, contact_email, pin_code)
    VALUES (${name.trim()}, ${contact_email.trim()}, '0000')
  `;
  return res.status(201).json({ success: true });
}
"""

files['admin-auth/login.ts'] = """import type { NextApiRequest, NextApiResponse } from 'next';
import sql from '../../../lib/db';
import bcrypt from 'bcryptjs';
import { signAdminToken, setAdminCookie, AdminPayload } from '../../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { email, password } = req.body as { email: string; password: string };
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  // Super admin
  if (
    email.toLowerCase().trim() === (process.env.SUPER_ADMIN_EMAIL || '').toLowerCase() &&
    password === process.env.SUPER_ADMIN_PASSWORD
  ) {
    const token = await signAdminToken({ sub: 'super', role: 'super_admin', email });
    setAdminCookie(res, token);
    return res.status(200).json({ role: 'super_admin' });
  }

  // Congregation admin
  const rows = await sql`
    SELECT ca.id, ca.password_hash, ca.congregation_id, c.name as congregation_name
    FROM congregation_admins ca
    JOIN congregations c ON c.id = ca.congregation_id
    WHERE ca.email = ${email.toLowerCase().trim()} LIMIT 1
  `;
  if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, rows[0].password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const payload: AdminPayload = {
    sub: rows[0].id,
    role: 'congregation_admin',
    congregation_id: rows[0].congregation_id,
    congregation_name: rows[0].congregation_name,
    email: email.toLowerCase().trim(),
  };
  const token = await signAdminToken(payload);
  setAdminCookie(res, token);
  return res.status(200).json({ role: 'congregation_admin', congregation_name: rows[0].congregation_name });
}
"""

files['admin-auth/logout.ts'] = """import type { NextApiRequest, NextApiResponse } from 'next';
import { clearAdminCookie } from '../../../lib/auth';

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  clearAdminCookie(res);
  return res.status(200).json({ success: true });
}
"""

files['admin-auth/me.ts'] = """import type { NextApiRequest, NextApiResponse } from 'next';
import { getAdminFromRequest } from '../../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return res.status(401).json({ error: 'Not authenticated' });
  return res.status(200).json(admin);
}
"""

files['super-admin/congregations.ts'] = """import type { NextApiRequest, NextApiResponse } from 'next';
import sql from '../../../lib/db';
import { requireSuperAdmin, AdminPayload } from '../../../lib/auth';

async function handler(req: NextApiRequest, res: NextApiResponse, _admin: AdminPayload) {
  if (req.method === 'GET') {
    const rows = await sql`
      SELECT c.id, c.name, c.status, c.contact_email, c.notification_email, c.created_at,
        (SELECT COUNT(*)::int FROM territory_maps WHERE congregation_id = c.id) as map_count,
        (SELECT COUNT(*)::int FROM congregation_admins WHERE congregation_id = c.id) as admin_count,
        (SELECT COUNT(*)::int FROM sessions WHERE congregation_id = c.id AND is_active = true) as active_sessions
      FROM congregations c ORDER BY c.name
    `;
    return res.status(200).json(rows);
  }

  if (req.method === 'POST') {
    const { name, pin_code, contact_email } = req.body;
    if (!name || !pin_code) return res.status(400).json({ error: 'name and pin_code required' });
    const rows = await sql`
      INSERT INTO congregations (name, pin_code, contact_email, status)
      VALUES (${name.trim()}, ${pin_code.trim()}, ${contact_email || null}, 'active')
      RETURNING id, name, status
    `;
    return res.status(201).json(rows[0]);
  }

  return res.status(405).end();
}
export default requireSuperAdmin(handler);
"""

files['super-admin/congregations/[id].ts'] = """import type { NextApiRequest, NextApiResponse } from 'next';
import sql from '../../../../lib/db';
import { requireSuperAdmin, AdminPayload } from '../../../../lib/auth';

async function handler(req: NextApiRequest, res: NextApiResponse, _admin: AdminPayload) {
  const { id } = req.query as { id: string };

  if (req.method === 'PUT') {
    const { name, pin_code, status, contact_email, notification_email } = req.body;
    const rows = await sql`
      UPDATE congregations SET
        name = COALESCE(${name ?? null}, name),
        pin_code = COALESCE(${pin_code ?? null}, pin_code),
        status = COALESCE(${status ?? null}, status),
        contact_email = COALESCE(${contact_email ?? null}, contact_email),
        notification_email = COALESCE(${notification_email ?? null}, notification_email)
      WHERE id = ${id} RETURNING *
    `;
    return res.status(200).json(rows[0]);
  }

  if (req.method === 'DELETE') {
    await sql`DELETE FROM congregations WHERE id = ${id}`;
    return res.status(204).end();
  }

  return res.status(405).end();
}
export default requireSuperAdmin(handler);
"""

files['super-admin/requests.ts'] = """import type { NextApiRequest, NextApiResponse } from 'next';
import sql from '../../../lib/db';
import { requireSuperAdmin, AdminPayload } from '../../../lib/auth';

async function handler(req: NextApiRequest, res: NextApiResponse, _admin: AdminPayload) {
  if (req.method === 'GET') {
    const rows = await sql`SELECT * FROM congregation_requests WHERE status = 'pending' ORDER BY created_at DESC`;
    return res.status(200).json(rows);
  }

  if (req.method === 'POST') {
    const { id, action, pin_code } = req.body as { id: string; action: 'approve' | 'reject'; pin_code?: string };
    if (action === 'approve') {
      const reqs = await sql`SELECT * FROM congregation_requests WHERE id = ${id} LIMIT 1`;
      if (!reqs.length) return res.status(404).json({ error: 'Request not found' });
      const r = reqs[0];
      await sql`
        INSERT INTO congregations (name, pin_code, contact_email, status)
        VALUES (${r.name}, ${pin_code || r.pin_code || '0000'}, ${r.contact_email}, 'active')
        ON CONFLICT (name) DO NOTHING
      `;
    }
    await sql`UPDATE congregation_requests SET status = ${action === 'approve' ? 'approved' : 'rejected'} WHERE id = ${id}`;
    return res.status(200).json({ success: true });
  }

  return res.status(405).end();
}
export default requireSuperAdmin(handler);
"""

files['congregation-admin/settings.ts'] = """import type { NextApiRequest, NextApiResponse } from 'next';
import sql from '../../../lib/db';
import { requireAdmin, AdminPayload } from '../../../lib/auth';

async function handler(req: NextApiRequest, res: NextApiResponse, admin: AdminPayload) {
  if (admin.role !== 'congregation_admin') return res.status(403).json({ error: 'Forbidden' });
  const cid = admin.congregation_id!;

  if (req.method === 'GET') {
    const rows = await sql`SELECT name, pin_code, notification_email, contact_email FROM congregations WHERE id = ${cid} LIMIT 1`;
    return res.status(200).json(rows[0]);
  }

  if (req.method === 'PUT') {
    const { pin_code, notification_email } = req.body;
    const rows = await sql`
      UPDATE congregations SET
        pin_code = COALESCE(${pin_code || null}, pin_code),
        notification_email = COALESCE(${notification_email || null}, notification_email)
      WHERE id = ${cid} RETURNING name, pin_code, notification_email
    `;
    return res.status(200).json(rows[0]);
  }

  return res.status(405).end();
}
export default requireAdmin(handler);
"""

files['congregation-admin/admins.ts'] = """import type { NextApiRequest, NextApiResponse } from 'next';
import sql from '../../../lib/db';
import bcrypt from 'bcryptjs';
import { requireAdmin, AdminPayload } from '../../../lib/auth';

async function handler(req: NextApiRequest, res: NextApiResponse, admin: AdminPayload) {
  const cid = admin.role === 'super_admin'
    ? req.query.congregation_id as string
    : admin.congregation_id!;

  if (req.method === 'GET') {
    const rows = await sql`SELECT id, email, created_at FROM congregation_admins WHERE congregation_id = ${cid}`;
    return res.status(200).json(rows);
  }

  if (req.method === 'POST') {
    const count = await sql`SELECT COUNT(*)::int as n FROM congregation_admins WHERE congregation_id = ${cid}`;
    if (count[0].n >= 3) return res.status(400).json({ error: 'Maximum 3 admins per congregation' });
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });
    const hash = await bcrypt.hash(password, 10);
    const rows = await sql`
      INSERT INTO congregation_admins (congregation_id, email, password_hash)
      VALUES (${cid}, ${email.toLowerCase().trim()}, ${hash})
      RETURNING id, email, created_at
    `;
    return res.status(201).json(rows[0]);
  }

  if (req.method === 'DELETE') {
    const { admin_id } = req.body;
    await sql`DELETE FROM congregation_admins WHERE id = ${admin_id} AND congregation_id = ${cid}`;
    return res.status(204).end();
  }

  return res.status(405).end();
}
export default requireAdmin(handler);
"""

files['cron/expire-sessions.ts'] = """import type { NextApiRequest, NextApiResponse } from 'next';
import sql from '../../../lib/db';
import { sendSessionExpiredEmail } from '../../../lib/email';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.headers['x-cron-secret'] !== process.env.CRON_SECRET) return res.status(401).end();

  const expired = await sql`
    SELECT s.id, s.code, s.map_number, c.name as congregation_name, c.notification_email
    FROM sessions s
    JOIN congregations c ON c.id = s.congregation_id
    WHERE s.is_active = true AND s.expires_at < NOW()
  `;

  for (const session of expired) {
    if (session.notification_email) {
      const addresses = await sql`SELECT * FROM not_at_home_addresses WHERE session_id = ${session.id}`;
      await sendSessionExpiredEmail({
        to: session.notification_email,
        congregationName: session.congregation_name,
        sessionCode: session.code,
        mapNumber: session.map_number,
        addresses,
      }).catch(console.error);
    }
    await sql`UPDATE sessions SET is_active = false WHERE id = ${session.id}`;
  }

  return res.status(200).json({ expired: expired.length });
}
"""

for rel_path, content in files.items():
    full_path = os.path.normpath(os.path.join(BASE, rel_path))
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"  wrote {rel_path}")

print(f"\nDone — {len(files)} files written")
