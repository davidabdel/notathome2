import type { NextApiRequest, NextApiResponse } from 'next';
import sql from '../../../lib/db';
import { requireAdmin, AdminPayload } from '../../../lib/auth';

// Congregation admins review Do Not Call requests submitted by publishers in
// the field. A request only appears on the map once approved here.
async function handler(req: NextApiRequest, res: NextApiResponse, admin: AdminPayload) {
  const congregation_id = admin.role === 'super_admin'
    ? (req.query.congregation_id as string)
    : admin.congregation_id!;
  if (!congregation_id) return res.status(400).json({ error: 'congregation_id required' });

  if (req.method === 'GET') {
    let rows: Record<string, unknown>[];
    try {
      rows = await sql`
        SELECT d.id, d.block_number, d.address, d.reason, d.submitted_by, d.created_at,
               m.map_number, m.name AS map_name
        FROM do_not_call d
        JOIN territory_maps m ON m.id = d.map_id
        WHERE m.congregation_id = ${congregation_id} AND d.status = 'pending'
        ORDER BY d.created_at DESC
      `;
    } catch {
      // status column not created yet — no pending requests possible
      rows = [];
    }
    return res.status(200).json(rows);
  }

  if (req.method === 'POST') {
    const { dnc_id, action } = req.body as { dnc_id?: string; action?: string };
    if (!dnc_id || (action !== 'approve' && action !== 'reject')) {
      return res.status(400).json({ error: 'dnc_id and a valid action are required' });
    }

    // Ensure the request belongs to this admin's congregation
    const owned = await sql`
      SELECT d.id FROM do_not_call d
      JOIN territory_maps m ON m.id = d.map_id
      WHERE d.id = ${dnc_id} AND m.congregation_id = ${congregation_id} AND d.status = 'pending' LIMIT 1
    `;
    if (!owned.length) return res.status(404).json({ error: 'Pending request not found' });

    if (action === 'reject') {
      await sql`DELETE FROM do_not_call WHERE id = ${dnc_id}`;
      return res.status(200).json({ ok: true, action: 'reject' });
    }

    const lastVisit = new Date().toLocaleDateString('en-AU', {
      day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Australia/Sydney',
    });
    await sql`UPDATE do_not_call SET status = 'approved', last_visit = ${lastVisit} WHERE id = ${dnc_id}`;
    return res.status(200).json({ ok: true, action: 'approve' });
  }

  return res.status(405).end();
}

export default requireAdmin(handler);
