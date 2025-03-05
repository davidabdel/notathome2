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
    // SQL to create the not_at_home_addresses table
    const createTableSQL = `
      -- Create the not_at_home_addresses table if it doesn't exist
      CREATE TABLE IF NOT EXISTS not_at_home_addresses (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        block_number INTEGER NOT NULL,
        address TEXT,
        latitude DOUBLE PRECISION,
        longitude DOUBLE PRECISION,
        created_by UUID REFERENCES auth.users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      );

      -- Enable Row Level Security
      ALTER TABLE not_at_home_addresses ENABLE ROW LEVEL SECURITY;

      -- Create RLS policies
      -- Anyone can insert addresses
      CREATE POLICY IF NOT EXISTS "Anyone can insert addresses" 
        ON not_at_home_addresses
        FOR INSERT
        WITH CHECK (true);
      
      -- Anyone can view addresses
      CREATE POLICY IF NOT EXISTS "Anyone can view addresses" 
        ON not_at_home_addresses
        FOR SELECT
        USING (true);
      
      -- Anyone can update addresses
      CREATE POLICY IF NOT EXISTS "Anyone can update addresses" 
        ON not_at_home_addresses
        FOR UPDATE
        USING (true);
      
      -- Anyone can delete addresses
      CREATE POLICY IF NOT EXISTS "Anyone can delete addresses" 
        ON not_at_home_addresses
        FOR DELETE
        USING (true);
    `;

    // Execute the SQL to create the table
    await supabaseAdmin.rpc('execute_sql', { sql_query: createTableSQL });

    return res.status(200).json({ 
      success: true, 
      message: 'Not At Home Addresses table created successfully' 
    });
  } catch (error) {
    console.error('Error creating addresses table:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to create addresses table',
      details: error instanceof Error ? error.message : String(error)
    });
  }
} 