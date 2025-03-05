import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with admin privileges
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // SQL to fix RLS policies for not_at_home_addresses table
    const fixRlsPoliciesSQL = `
      -- First, ensure RLS is enabled
      ALTER TABLE not_at_home_addresses ENABLE ROW LEVEL SECURITY;

      -- Drop existing policies if they exist
      DROP POLICY IF EXISTS "Users can view addresses for sessions they created" ON not_at_home_addresses;
      DROP POLICY IF EXISTS "Users can view addresses for sessions they participate in" ON not_at_home_addresses;
      DROP POLICY IF EXISTS "Users can insert addresses for active sessions they participate in" ON not_at_home_addresses;
      DROP POLICY IF EXISTS "Users can update their own addresses" ON not_at_home_addresses;
      DROP POLICY IF EXISTS "Users can delete their own addresses" ON not_at_home_addresses;
      
      -- Create a more permissive policy for inserting addresses
      CREATE POLICY "Anyone can insert addresses" 
        ON not_at_home_addresses
        FOR INSERT
        WITH CHECK (true);
      
      -- Create a policy for viewing addresses
      CREATE POLICY "Anyone can view addresses" 
        ON not_at_home_addresses
        FOR SELECT
        USING (true);
      
      -- Create a policy for updating addresses
      CREATE POLICY "Anyone can update addresses" 
        ON not_at_home_addresses
        FOR UPDATE
        USING (true);
      
      -- Create a policy for deleting addresses
      CREATE POLICY "Anyone can delete addresses" 
        ON not_at_home_addresses
        FOR DELETE
        USING (true);
    `;

    // Execute the SQL to fix RLS policies
    await supabaseAdmin.rpc('execute_sql', { sql_query: fixRlsPoliciesSQL });

    return res.status(200).json({ 
      success: true, 
      message: 'RLS policies for not_at_home_addresses table fixed successfully' 
    });
  } catch (error) {
    console.error('Error fixing RLS policies:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to fix RLS policies',
      details: error instanceof Error ? error.message : String(error)
    });
  }
} 