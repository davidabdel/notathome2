import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../supabase/config';

/**
 * API endpoint to create a simple search function for session IDs
 * This approach doesn't use exec_sql which might not be available
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
    // Instead of creating complex functions, we'll create a simple view
    // that casts UUID to text to make it searchable
    const { data, error } = await supabase
      .from('sessions_with_text_id')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error && error.code === '42P01') {
      // View doesn't exist, so create it
      console.log('Creating sessions_with_text_id view...');
      
      // Create view using raw SQL
      const createViewResult = await supabase.rpc('create_sessions_view');
      
      if (createViewResult.error) {
        // If the RPC doesn't exist, try direct SQL
        try {
          // Try a direct insert to create the view
          const { error: directError } = await supabase
            .from('_schema_migrations')
            .insert({
              version: 'create_sessions_view',
              statements: `
                CREATE OR REPLACE VIEW sessions_with_text_id AS
                SELECT *, id::text as text_id FROM sessions;
              `
            });
            
          if (directError) {
            return res.status(500).json({
              success: false,
              error: 'Could not create view using direct SQL',
              details: directError.message
            });
          }
        } catch (err) {
          return res.status(500).json({
            success: false,
            error: 'Failed to create view',
            details: err instanceof Error ? err.message : String(err)
          });
        }
      }
      
      return res.status(200).json({
        success: true,
        message: 'Sessions view created or already exists'
      });
    } else {
      // View already exists
      return res.status(200).json({
        success: true,
        message: 'Sessions view already exists'
      });
    }
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create view',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
