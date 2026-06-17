import type { NextApiRequest, NextApiResponse } from 'next';
import sql from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') return res.status(405).end();
  const { id } = req.query as { id: string };
  await sql`DELETE FROM not_at_home_addresses WHERE id = ${id}`;
  return res.status(204).end();
}
