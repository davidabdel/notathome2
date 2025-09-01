import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with the service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify the user is an admin
    const { data: { session } } = await supabaseAdmin.auth.getSession();
    
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Check if user is an admin
    const { data: userRoles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id);
    
    if (rolesError) {
      console.error('Error fetching user roles:', rolesError);
      return res.status(500).json({ error: 'Failed to verify admin status' });
    }
    
    const adminRole = userRoles?.find(role => role.role === 'admin');
    
    if (!adminRole) {
      return res.status(403).json({ error: 'You do not have permission to access this resource' });
    }

    // Create the system_settings table
    const { error } = await supabaseAdmin.rpc('create_system_settings_table');

    if (error) {
      // Check if the function doesn't exist
      if (error.code === 'P0001' && error.message.includes('function "create_system_settings_table" does not exist')) {
        // Function doesn't exist, create it using SQL directly
        const createFunctionSql = `
          CREATE OR REPLACE FUNCTION create_system_settings_table()
          RETURNS void
          LANGUAGE plpgsql
          SECURITY DEFINER
          AS $$
          BEGIN
            CREATE TABLE IF NOT EXISTS system_settings (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              category TEXT NOT NULL,
              settings JSONB NOT NULL DEFAULT '{}'::jsonb,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            
            -- Create unique index on category to ensure only one record per category
            CREATE UNIQUE INDEX IF NOT EXISTS system_settings_category_idx ON system_settings (category);
            
            -- Create RLS policies
            ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
            
            -- Drop existing policies if they exist
            DROP POLICY IF EXISTS "Admins can do everything" ON system_settings;
            DROP POLICY IF EXISTS "Anyone can read settings" ON system_settings;
            
            -- Create policies
            CREATE POLICY "Admins can do everything" ON system_settings
              USING (EXISTS (
                SELECT 1 FROM user_roles
                WHERE user_roles.user_id = auth.uid()
                AND user_roles.role = 'admin'
              ))
              WITH CHECK (EXISTS (
                SELECT 1 FROM user_roles
                WHERE user_roles.user_id = auth.uid()
                AND user_roles.role = 'admin'
              ));
              
            CREATE POLICY "Anyone can read settings" ON system_settings
              FOR SELECT USING (true);
          END;
          $$;
        `;
        
        // Execute SQL to create the function
        await supabaseAdmin.rpc('exec_sql', { sql: createFunctionSql });
        
        // Try to create the table again
        const { error: retryError } = await supabaseAdmin.rpc('create_system_settings_table');
        
        if (retryError) {
          console.error('Error creating system_settings table (retry):', retryError);
          return res.status(500).json({ error: 'Failed to create system_settings table' });
        }
      } else {
        console.error('Error creating system_settings table:', error);
        return res.status(500).json({ error: 'Failed to create system_settings table' });
      }
    }

    return res.status(200).json({ 
      success: true, 
      message: 'System settings table created successfully' 
    });
  } catch (err) {
    console.error('Error creating system_settings table:', err);
    return res.status(500).json({ 
      error: err instanceof Error ? err.message : 'An unexpected error occurred' 
    });
  }
} 