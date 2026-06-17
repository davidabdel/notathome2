import type { NextApiRequest, NextApiResponse } from 'next';
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
