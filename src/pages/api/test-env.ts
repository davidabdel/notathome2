import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only show if environment variables exist, not their values
  const envStatus = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'defined' : 'undefined',
    NEXT_PUBLIC_SUPABASE_KEY: process.env.NEXT_PUBLIC_SUPABASE_KEY ? 'defined' : 'undefined',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'defined' : 'undefined',
    NODE_ENV: process.env.NODE_ENV || 'not set'
  };

  res.status(200).json(envStatus);
} 