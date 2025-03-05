import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with admin privileges
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    console.log('Checking RLS policies...');
    
    // Check if the execute_sql function exists
    try {
      await supabaseAdmin.rpc('execute_sql', { sql_query: 'SELECT 1' });
      console.log('execute_sql function exists');
    } catch (fnError) {
      console.error('execute_sql function does not exist:', fnError);
      return res.status(500).json({ 
        error: 'execute_sql function does not exist',
        details: 'The execute_sql function is required to check RLS policies'
      });
    }
    
    // Fix RLS policies
    const { error: fixError } = await supabaseAdmin.rpc('execute_sql', {
      sql_query: `
        -- Enable RLS on sessions table
        ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
        
        -- Policy for congregation members to view their sessions
        DROP POLICY IF EXISTS view_congregation_sessions ON sessions;
        CREATE POLICY view_congregation_sessions ON sessions
          FOR SELECT USING (
            congregation_id IN (
              SELECT congregation_id FROM user_roles 
              WHERE user_id = auth.uid()
            )
          );
          
        -- Policy for creating sessions
        DROP POLICY IF EXISTS create_sessions ON sessions;
        CREATE POLICY create_sessions ON sessions
          FOR INSERT WITH CHECK (
            auth.uid() = created_by OR
            auth.uid() IN (
              SELECT user_id FROM user_roles 
              WHERE congregation_id = sessions.congregation_id
            )
          );
          
        -- Policy for updating sessions
        DROP POLICY IF EXISTS update_sessions ON sessions;
        CREATE POLICY update_sessions ON sessions
          FOR UPDATE USING (
            created_by = auth.uid() OR
            auth.uid() IN (
              SELECT user_id FROM user_roles 
              WHERE congregation_id = sessions.congregation_id 
              AND role IN ('congregation_admin', 'admin')
            )
          );
      `
    });
    
    if (fixError) {
      console.error('Error fixing RLS policies:', fixError);
      return res.status(500).json({ 
        error: 'Failed to fix RLS policies',
        details: fixError.message
      });
    }
    
    console.log('RLS policies fixed successfully');
    
    return res.status(200).json({ 
      success: true,
      message: 'RLS policies checked and fixed successfully'
    });
  } catch (err: any) {
    console.error('Exception checking RLS policies:', err);
    return res.status(500).json({ 
      error: 'Exception checking RLS policies',
      details: err.message
    });
  }
} 