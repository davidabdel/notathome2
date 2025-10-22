import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../supabase/config';

/**
 * API endpoint to create a simple function for finding sessions by prefix
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Create a simple function directly
    const { data, error } = await supabase
      .from('sessions')
      .select('id')
      .limit(1);
      
    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Error accessing sessions table',
        details: error.message
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Session table is accessible'
    });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create function',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
