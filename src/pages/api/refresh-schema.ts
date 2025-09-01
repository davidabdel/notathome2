import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with admin privileges
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    console.log('Refreshing schema cache...');
    
    // First, check if the execute_sql function exists
    try {
      await supabaseAdmin.rpc('execute_sql', { sql_query: 'SELECT 1' });
      console.log('execute_sql function exists');
    } catch (fnError) {
      console.error('execute_sql function does not exist:', fnError);
      return res.status(500).json({ 
        error: 'execute_sql function does not exist',
        details: 'The execute_sql function is required to refresh the schema'
      });
    }
    
    // Force a schema refresh by running a query that touches the sessions table
    const { error: refreshError } = await supabaseAdmin.rpc('execute_sql', {
      sql_query: `
        -- This comment forces the query to be different each time
        -- Timestamp: ${new Date().toISOString()}
        
        -- Analyze the sessions table to update statistics
        ANALYZE sessions;
        
        -- Touch the map_number column to ensure it's in the schema cache
        SELECT map_number FROM sessions LIMIT 0;
        
        -- Refresh the materialized view if it exists (this is a no-op if it doesn't)
        DO $$
        BEGIN
          IF EXISTS (
            SELECT FROM pg_matviews WHERE schemaname = 'public' AND matviewname = 'sessions_view'
          ) THEN
            REFRESH MATERIALIZED VIEW sessions_view;
          END IF;
        END $$;
      `
    });
    
    if (refreshError) {
      console.error('Error refreshing schema:', refreshError);
      return res.status(500).json({ 
        error: 'Failed to refresh schema',
        details: refreshError.message
      });
    }
    
    // Clear the client-side cache by running a direct SQL query
    const { error: cacheError } = await supabaseAdmin.rpc('execute_sql', {
      sql_query: `
        -- Invalidate client-side cache for the sessions table
        COMMENT ON TABLE sessions IS 'Cache refreshed at ${new Date().toISOString()}';
        
        -- Ensure the map_number column exists
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'sessions' 
            AND column_name = 'map_number'
          ) THEN
            ALTER TABLE sessions ADD COLUMN map_number INTEGER;
          END IF;
        END $$;
      `
    });
    
    if (cacheError) {
      console.error('Error clearing cache:', cacheError);
      return res.status(500).json({ 
        error: 'Failed to clear cache',
        details: cacheError.message
      });
    }
    
    return res.status(200).json({ 
      success: true,
      message: 'Schema cache refreshed successfully'
    });
  } catch (err: any) {
    console.error('Exception refreshing schema cache:', err);
    return res.status(500).json({ 
      error: 'Exception refreshing schema cache',
      details: err.message
    });
  }
} 