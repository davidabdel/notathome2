import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with admin privileges
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  // Log environment variables (without revealing full keys)
  console.log('Supabase URL:', supabaseUrl);
  console.log('Service Role Key exists:', !!supabaseServiceRoleKey);

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return res.status(500).json({
      success: false,
      message: 'Missing Supabase credentials',
      details: 'NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set'
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    console.log('Updating territory map descriptions...');
    
    // Update all territory maps with "Placeholder description" to "Do Not Call addresses"
    const { data, error, count } = await supabase
      .from('territory_maps')
      .update({ description: 'Do Not Call addresses' })
      .eq('description', 'Placeholder description');
    
    if (error) {
      console.error('Error updating descriptions:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update descriptions',
        details: error.message
      });
    }
    
    console.log('Descriptions updated successfully');
    return res.status(200).json({
      success: true,
      message: 'Descriptions updated successfully',
      count: count || 0
    });
  } catch (error: any) {
    console.error('Error in update-descriptions:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update descriptions',
      details: error.message || 'Unknown error'
    });
  }
} 