import { SignJWT, jwtVerify } from 'jose';
import { NextApiRequest, NextApiResponse } from 'next';
import { serialize, parse } from 'cookie';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'change-me-in-production-32chars!!');
const COOKIE = 'nah_admin';

export type AdminPayload = {
  sub: string;           // admin id
  role: 'super_admin' | 'congregation_admin';
  congregation_id?: string;
  congregation_name?: string;
  email: string;
};

export async function signAdminToken(payload: AdminPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('8h')
    .sign(SECRET);
}

export async function verifyAdminToken(token: string): Promise<AdminPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as AdminPayload;
  } catch {
    return null;
  }
}

export function setAdminCookie(res: NextApiResponse, token: string) {
  res.setHeader('Set-Cookie', serialize(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8, // 8 hours
  }));
}

export function clearAdminCookie(res: NextApiResponse) {
  res.setHeader('Set-Cookie', serialize(COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  }));
}

export async function getAdminFromRequest(req: NextApiRequest): Promise<AdminPayload | null> {
  const cookies = parse(req.headers.cookie || '');
  const token = cookies[COOKIE];
  if (!token) return null;
  return verifyAdminToken(token);
}

type Handler = (req: NextApiRequest, res: NextApiResponse, admin: AdminPayload) => Promise<unknown>;

export function requireAdmin(handler: Handler) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const admin = await getAdminFromRequest(req);
    if (!admin) { res.status(401).json({ error: 'Unauthorized' }); return; }
    await handler(req, res, admin);
  };
}

export function requireSuperAdmin(handler: Handler) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const admin = await getAdminFromRequest(req);
    if (!admin || admin.role !== 'super_admin') { res.status(403).json({ error: 'Forbidden' }); return; }
    await handler(req, res, admin);
  };
}
