import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with the service role key to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Check if we have the service role key
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ 
        error: 'SUPABASE_SERVICE_ROLE_KEY is not set in environment variables' 
      });
    }
    
    // Get all congregations directly using the admin client to bypass RLS
    const { data: congregations, error } = await supabaseAdmin
      .from('congregations')
      .select('*');
    
    if (error) {
      console.error('Error fetching congregations:', error);
      return res.status(500).json({ error: error.message });
    }
    
    return res.status(200).json({ 
      message: 'Congregations retrieved successfully',
      congregations 
    });
  } catch (error) {
    console.error('Error checking congregations:', error);
    return res.status(500).json({ error: 'Failed to check congregations' });
  }
} 