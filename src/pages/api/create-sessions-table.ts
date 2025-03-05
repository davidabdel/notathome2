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
    // First, try to create the execute_sql function if it doesn't exist
    try {
      // Check if the function exists by trying to call it
      await supabaseAdmin.rpc('execute_sql', { sql_query: 'SELECT 1' });
      console.log('execute_sql function exists');
    } catch (fnError: any) {
      console.log('Creating execute_sql function...');
      
      // Create the function directly using the REST API
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`
          },
          body: JSON.stringify({
            query: `
              CREATE OR REPLACE FUNCTION execute_sql(sql_query TEXT)
              RETURNS VOID AS $$
              BEGIN
                EXECUTE sql_query;
              END;
              $$ LANGUAGE plpgsql SECURITY DEFINER;
            `
          })
        });
        
        if (!response.ok) {
          throw new Error('Failed to create execute_sql function via REST API');
        }
      } catch (directError) {
        console.error('Error creating execute_sql function directly:', directError);
        
        // If direct REST API call fails, we need to create the function using our admin endpoint
        const createFnResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/api/admin/create-exec-sql-function`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (!createFnResponse.ok) {
          const errorData = await createFnResponse.json();
          throw new Error(errorData.error || 'Failed to create execute_sql function');
        }
      }
    }
    
    // Check if the sessions table already exists
    try {
      const { error: checkError } = await supabaseAdmin
        .from('sessions')
        .select('id')
        .limit(1);
      
      if (!checkError) {
        console.log('Sessions table exists, checking for map_number column...');
        
        // Check if map_number column exists
        try {
          const { error: columnCheckError } = await supabaseAdmin
            .from('sessions')
            .select('map_number')
            .limit(1);
          
          if (columnCheckError && columnCheckError.message.includes('column "map_number" does not exist')) {
            console.log('Adding map_number column to sessions table...');
            
            // Add map_number column to the sessions table
            const { error: alterError } = await supabaseAdmin.rpc('execute_sql', {
              sql_query: `
                ALTER TABLE sessions ADD COLUMN IF NOT EXISTS map_number INTEGER;
              `
            });
            
            if (alterError) {
              console.error('Error adding map_number column:', alterError);
              return res.status(500).json({ 
                error: 'Failed to add map_number column to sessions table',
                details: alterError.message
              });
            }
            
            console.log('map_number column added successfully');
            return res.status(200).json({ 
              success: true,
              message: 'map_number column added to sessions table'
            });
          } else {
            console.log('map_number column already exists');
            return res.status(200).json({ 
              success: true,
              message: 'Sessions table already exists with map_number column'
            });
          }
        } catch (columnErr) {
          console.error('Error checking for map_number column:', columnErr);
        }
      } else {
        console.log('Sessions table does not exist, creating it...');
      }
    } catch (checkErr) {
      console.error('Error checking sessions table:', checkErr);
    }
    
    // Now create the sessions table
    const { error: sessionsError } = await supabaseAdmin.rpc('execute_sql', {
      sql_query: `
        CREATE TABLE IF NOT EXISTS sessions (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          code VARCHAR(6) NOT NULL UNIQUE,
          congregation_id UUID REFERENCES congregations(id),
          created_by UUID NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          is_active BOOLEAN DEFAULT TRUE,
          map_number INTEGER
        );
        
        -- Create session_participants table
        CREATE TABLE IF NOT EXISTS session_participants (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          session_id UUID REFERENCES sessions(id),
          user_id UUID NOT NULL,
          joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
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
    
    if (sessionsError) {
      console.error('Error creating sessions table:', sessionsError);
      return res.status(500).json({ 
        error: 'Failed to create sessions table',
        details: sessionsError.message
      });
    }
    
    return res.status(200).json({ 
      success: true,
      message: 'Sessions table created successfully'
    });
  } catch (err: any) {
    console.error('Exception creating sessions table:', err);
    return res.status(500).json({ 
      error: 'Exception creating sessions table',
      details: err.message
    });
  }
} 