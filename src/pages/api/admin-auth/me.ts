import type { NextApiRequest, NextApiResponse } from 'next';
import { getAdminFromRequest } from '../../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return res.status(401).json({ error: 'Not authenticated' });
  return res.status(200).json(admin);
}
