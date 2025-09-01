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
    console.log('Creating addresses table...');

    // SQL to create the table and set up RLS
    const createTableSQL = `
      -- Drop the table if it exists
      DROP TABLE IF EXISTS not_at_home_addresses;
      
      -- Create the table with the correct schema
      CREATE TABLE not_at_home_addresses (
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
      CREATE POLICY "Anyone can insert addresses" 
        ON not_at_home_addresses
        FOR INSERT
        WITH CHECK (true);
        
      CREATE POLICY "Anyone can view addresses" 
        ON not_at_home_addresses
        FOR SELECT
        USING (true);
        
      CREATE POLICY "Anyone can update addresses" 
        ON not_at_home_addresses
        FOR UPDATE
        USING (true);
        
      CREATE POLICY "Anyone can delete addresses" 
        ON not_at_home_addresses
        FOR DELETE
        USING (true);
        
      -- Refresh the schema cache
      SELECT pg_catalog.pg_reload_conf();
      
      -- Analyze the table to update statistics
      ANALYZE not_at_home_addresses;
    `;

    // Execute the SQL to create the table
    const { data, error } = await supabaseAdmin.rpc('execute_sql', { sql_query: createTableSQL });

    if (error) {
      console.error('Error creating table:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create table',
        details: error.message
      });
    }

    // Insert a test record to verify the table works
    const testInsertSQL = `
      INSERT INTO not_at_home_addresses (
        session_id, 
        block_number, 
        address
      ) VALUES (
        '00000000-0000-0000-0000-000000000000', 
        999, 
        'Test Address'
      )
      RETURNING id;
    `;

    const { data: testData, error: testError } = await supabaseAdmin.rpc('execute_sql', { sql_query: testInsertSQL });

    if (testError) {
      console.error('Error inserting test record:', testError);
      return res.status(500).json({
        success: false,
        error: 'Failed to insert test record',
        details: testError.message
      });
    }

    // Delete the test record
    const deleteTestSQL = `
      DELETE FROM not_at_home_addresses 
      WHERE session_id = '00000000-0000-0000-0000-000000000000' 
      AND block_number = 999;
    `;

    await supabaseAdmin.rpc('execute_sql', { sql_query: deleteTestSQL });

    // Check if the table exists and has the address column
    const checkTableSQL = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'not_at_home_addresses';
    `;

    const { data: checkData, error: checkError } = await supabaseAdmin.rpc('execute_sql', { sql_query: checkTableSQL });

    if (checkError) {
      console.error('Error checking table:', checkError);
      return res.status(500).json({
        success: false,
        error: 'Failed to check table',
        details: checkError.message
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Table created and verified successfully',
      columns: checkData
    });
  } catch (error) {
    console.error('Error executing SQL:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to execute SQL',
      details: error instanceof Error ? error.message : String(error)
    });
  }
} 