import type { NextApiRequest, NextApiResponse } from 'next';
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
