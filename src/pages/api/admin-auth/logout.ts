import type { NextApiRequest, NextApiResponse } from 'next';
import { clearAdminCookie } from '../../../lib/auth';

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  clearAdminCookie(res);
  return res.status(200).json({ success: true });
}
