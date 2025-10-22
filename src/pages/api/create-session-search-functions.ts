import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../supabase/config';

/**
 * API endpoint to create stored procedures for finding sessions by ID prefix
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
    // Create the functions using raw SQL
    const functions = [
      // Function to find sessions by ID prefix using text cast
      `
        CREATE OR REPLACE FUNCTION find_sessions_by_id_prefix_text(id_prefix TEXT)
        RETURNS SETOF sessions AS $$
        BEGIN
          RETURN QUERY SELECT * FROM sessions WHERE id::text LIKE id_prefix || '%';
        END;
        $$ LANGUAGE plpgsql;
      `,
      // Function to find sessions by exact ID
      `
        CREATE OR REPLACE FUNCTION find_session_by_exact_id(session_id TEXT)
        RETURNS SETOF sessions AS $$
        BEGIN
          RETURN QUERY SELECT * FROM sessions WHERE id::text = session_id;
        END;
        $$ LANGUAGE plpgsql;
      `,
      // Function to find sessions by ID with different formats
      `
        CREATE OR REPLACE FUNCTION find_sessions_flexible(search_id TEXT)
        RETURNS TABLE(
          id UUID,
          code TEXT,
          congregation_id UUID,
          created_by UUID,
          created_at TIMESTAMPTZ,
          expires_at TIMESTAMPTZ,
          is_active BOOLEAN,
          map_number INTEGER,
          match_type TEXT
        ) AS $$
        BEGIN
          -- Try exact match
          RETURN QUERY
          SELECT s.*, 'exact'::TEXT as match_type
          FROM sessions s
          WHERE s.id::text = search_id;
          
          -- If no results, try with first 36 chars if longer
          IF NOT FOUND AND length(search_id) > 36 THEN
            RETURN QUERY
            SELECT s.*, 'normalized'::TEXT as match_type
            FROM sessions s
            WHERE s.id::text = substring(search_id, 1, 36);
          END IF;
          
          -- If still no results, try with LIKE
          IF NOT FOUND THEN
            RETURN QUERY
            SELECT s.*, 'prefix'::TEXT as match_type
            FROM sessions s
            WHERE s.id::text LIKE search_id || '%';
          END IF;
        END;
        $$ LANGUAGE plpgsql;
      `
    ];
    
    // Execute each function creation
    const results = [];
    
    for (const sql of functions) {
      try {
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
        
        if (error) {
          results.push({
            success: false,
            error: error.message
          });
        } else {
          results.push({
            success: true
          });
        }
      } catch (err) {
        results.push({
          success: false,
          error: err instanceof Error ? err.message : String(err)
        });
      }
    }

    return res.status(200).json({
      success: true,
      results
    });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create functions',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
