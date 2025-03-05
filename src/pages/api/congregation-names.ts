import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if we have the service role key
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ 
        error: 'SUPABASE_SERVICE_ROLE_KEY is not set in environment variables',
        message: 'Server configuration error'
      });
    }
    
    // Create a Supabase client with the service role key to bypass RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Get search query from request
    const { query } = req.query;
    const searchQuery = typeof query === 'string' ? query.trim() : '';
    
    // Fetch congregation names based on search query
    let congregationQuery = supabaseAdmin
      .from('congregations')
      .select('name')
      .eq('status', 'active') // Only return active congregations
      .order('name');
    
    // If search query is provided, filter by it
    if (searchQuery) {
      congregationQuery = congregationQuery.ilike('name', `%${searchQuery}%`);
    }
    
    // Limit results to prevent overwhelming the client
    congregationQuery = congregationQuery.limit(10);
    
    const { data: congregations, error } = await congregationQuery;
    
    if (error) {
      console.error('Error fetching congregation names:', error);
      return res.status(500).json({ error: 'Failed to fetch congregation names' });
    }
    
    // Extract just the names from the results
    const congregationNames = congregations.map(cong => cong.name);
    
    return res.status(200).json({ congregationNames });
  } catch (err: any) {
    console.error('Unexpected error in congregation-names API:', err);
    return res.status(500).json({ error: 'An unexpected error occurred' });
  }
} 