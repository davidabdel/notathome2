import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import sql from '../../../lib/db';
import type { NextApiRequest, NextApiResponse } from 'next';

// Temporary one-off endpoint to bulk-replace territory map images. Removed after use.
export const config = { api: { bodyParser: { sizeLimit: '15mb' } } };

const TOKEN = 'seed-img-9f3k2m7q';

const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { token, congregation_id, map_number, imageBase64, contentType } = req.body as {
    token?: string; congregation_id?: string; map_number?: number; imageBase64?: string; contentType?: string;
  };
  if (token !== TOKEN) return res.status(401).json({ error: 'bad token' });
  if (!congregation_id || map_number == null || !imageBase64) return res.status(400).json({ error: 'missing fields' });

  const maps = await sql`
    SELECT id FROM territory_maps WHERE congregation_id = ${congregation_id} AND map_number = ${map_number} LIMIT 1
  `;
  if (!maps.length) return res.status(404).json({ error: 'map not found', map_number });
  const id = maps[0].id as string;

  const buffer = Buffer.from(imageBase64, 'base64');
  const type = contentType || 'image/png';
  const ext = type.includes('png') ? 'png' : 'jpg';
  const filename = `maps/${id}-${Date.now()}.${ext}`;

  await r2.send(new PutObjectCommand({
    Bucket: 'notathome-maps',
    Key: filename,
    Body: buffer,
    ContentType: type,
  }));

  const image_url = `${process.env.R2_PUBLIC_URL}/${filename}`;
  await sql`UPDATE territory_maps SET image_url = ${image_url} WHERE id = ${id}`;
  return res.status(200).json({ map_number, image_url });
}
