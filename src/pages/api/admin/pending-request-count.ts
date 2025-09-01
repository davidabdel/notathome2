import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // Log for debugging
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('Service Role Key Length:', process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0);

    // Fetch the count of pending congregation requests
    const { count, error } = await supabaseAdmin
      .from('congregation_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    if (error) {
      console.error('Error fetching pending request count:', error);
      return res.status(500).json({ 
        error: error.message,
        details: error.details,
        hint: error.hint
      });
    }

    return res.status(200).json({ count: count || 0 });
  } catch (error) {
    console.error('Error in pending request count API:', error);
    return res.status(500).json({ error: 'Failed to fetch pending request count' });
  }
} 