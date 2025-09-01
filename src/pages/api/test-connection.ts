import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../supabase/config';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Test the connection by fetching the current user
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to connect to Supabase', 
        error: error.message 
      });
    }

    // Try to query the congregations table
    const { data: congregations, error: tableError } = await supabase
      .from('congregations')
      .select('count')
      .limit(1);

    if (tableError) {
      return res.status(500).json({ 
        success: false, 
        message: 'Connected to Supabase, but failed to query the congregations table', 
        error: tableError.message 
      });
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Successfully connected to Supabase and queried the congregations table',
      data: {
        auth: data,
        tableAccess: true
      }
    });
  } catch (err) {
    console.error('Error testing Supabase connection:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'An unexpected error occurred', 
      error: err instanceof Error ? err.message : String(err)
    });
  }
} 