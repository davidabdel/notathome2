import type { NextApiRequest, NextApiResponse } from 'next';
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
      const addresses = await sql`SELECT * FROM not_at_home_addresses WHERE session_id = ${session.id}` as Array<{
        block_number: number; house_number: string; unit_number?: string; street_name: string; suburb?: string;
      }>;
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
