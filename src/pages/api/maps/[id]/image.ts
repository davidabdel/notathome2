import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import sql from '../../../../lib/db';
import { requireAdmin } from '../../../../lib/auth';

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };

const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export default requireAdmin(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  const { id } = req.query as { id: string };
  const { imageBase64, contentType } = req.body as { imageBase64: string; contentType: string };
  if (!imageBase64 || !contentType) return res.status(400).json({ error: 'imageBase64 and contentType required' });

  const buffer = Buffer.from(imageBase64, 'base64');
  const ext = contentType.includes('png') ? 'png' : 'jpg';
  const filename = `maps/${id}-${Date.now()}.${ext}`;

  await r2.send(new PutObjectCommand({
    Bucket: 'notathome-maps',
    Key: filename,
    Body: buffer,
    ContentType: contentType,
  }));

  const image_url = `${process.env.R2_PUBLIC_URL}/${filename}`;
  await sql`UPDATE territory_maps SET image_url = ${image_url} WHERE id = ${id}`;
  return res.status(200).json({ image_url });
});
