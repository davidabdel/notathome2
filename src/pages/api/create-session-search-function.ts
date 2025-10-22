import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../supabase/config';

/**
 * API endpoint to create a stored procedure for finding sessions by ID prefix
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
    // Create the function using raw SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: `
        CREATE OR REPLACE FUNCTION find_sessions_by_id_prefix(id_prefix TEXT)
        RETURNS SETOF sessions AS $$
        BEGIN
          RETURN QUERY SELECT * FROM sessions WHERE id::text LIKE id_prefix || '%';
        END;
        $$ LANGUAGE plpgsql;
      `
    });

    if (error) {
      console.error('Error creating function:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Failed to create function',
        details: error.message
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Function created successfully'
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
