import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf8');
for (const line of env.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const idx = trimmed.indexOf('=');
  if (idx === -1) continue;
  const k = trimmed.slice(0, idx).trim();
  let v = trimmed.slice(idx + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  process.env[k] = v;
}

const r2 = new S3Client({
  region: 'auto',
  endpoint: 'https://d4d08355f5a6cdca4ac2128790daeb28.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: '6a7bfd218a7644ab60c548e099d299d6',
    secretAccessKey: 'd33485b56ef9f4b648fed99021178072811e8e0332c5e83dbf4bac4a5ffb2a66',
  },
});

const VIDEO_URL = 'https://d8j0ntlcm91z4.cloudfront.net/user_30KegDyarovNqeZxwUgXzcBMvKt/hf_20260618_083304_84ae53a2-5310-407f-b03c-6bfc45eddaf6.mp4';

console.log('Downloading animation from Higgsfield...');
const res = await fetch(VIDEO_URL);
if (!res.ok) throw new Error(`Download failed: ${res.status}`);
const buffer = Buffer.from(await res.arrayBuffer());
console.log(`Downloaded ${(buffer.length / 1024 / 1024).toFixed(1)} MB`);

console.log('Uploading to R2...');
await r2.send(new PutObjectCommand({
  Bucket: 'notathome-maps',
  Key: 'splash/winter-update.mp4',
  Body: buffer,
  ContentType: 'video/mp4',
}));

console.log('✅ Uploaded: https://pub-daf8c14077c6451eb1877ef9bf624ab7.r2.dev/splash/winter-update.mp4');
