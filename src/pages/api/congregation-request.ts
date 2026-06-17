import type { NextApiRequest, NextApiResponse } from 'next';
import sql from '../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { name, contact_email } = req.body;
  if (!name || !contact_email) return res.status(400).json({ error: 'Name and email required' });
  const existing = await sql`SELECT id FROM congregations WHERE LOWER(name) = LOWER(${name.trim()}) LIMIT 1`;
  if (existing.length) return res.status(409).json({ error: 'Congregation name already registered' });
  await sql`INSERT INTO congregation_requests (name, contact_email, pin_code) VALUES (${name.trim()}, ${contact_email.trim()}, '0000')`;
  return res.status(201).json({ success: true });
}
