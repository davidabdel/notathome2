import type { NextApiRequest, NextApiResponse } from 'next';
import sql from '../../../../lib/db';
import { requireAdmin } from '../../../../lib/auth';

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };

export default requireAdmin(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  const { id } = req.query as { id: string };
  const { imageBase64, contentType } = req.body as { imageBase64: string; contentType: string };
  if (!imageBase64 || !contentType) return res.status(400).json({ error: 'imageBase64 and contentType required' });

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const buffer = Buffer.from(imageBase64, 'base64');
  const ext = contentType.includes('png') ? 'png' : 'jpg';
  const filename = `${id}-${Date.now()}.${ext}`;

  const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/maps/${filename}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': contentType,
      'x-upsert': 'true',
    },
    body: buffer,
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    return res.status(500).json({ error: 'Upload failed: ' + err });
  }

  const image_url = `${SUPABASE_URL}/storage/v1/object/public/maps/${filename}`;
  await sql`UPDATE territory_maps SET image_url = ${image_url} WHERE id = ${id}`;
  return res.status(200).json({ image_url });
});
