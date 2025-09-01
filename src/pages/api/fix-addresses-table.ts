import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

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
    console.log('Fixing addresses table...');

    // Read the SQL script
    const sqlScript = `
    -- Drop the table if it exists
    DROP TABLE IF EXISTS not_at_home_addresses;
    
    -- Create the not_at_home_addresses table
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
    -- Anyone can insert addresses
    DROP POLICY IF EXISTS "Anyone can insert addresses" ON not_at_home_addresses;
    CREATE POLICY "Anyone can insert addresses" 
      ON not_at_home_addresses
      FOR INSERT
      WITH CHECK (true);
    
    -- Anyone can view addresses
    DROP POLICY IF EXISTS "Anyone can view addresses" ON not_at_home_addresses;
    CREATE POLICY "Anyone can view addresses" 
      ON not_at_home_addresses
      FOR SELECT
      USING (true);
    
    -- Anyone can update addresses
    DROP POLICY IF EXISTS "Anyone can update addresses" ON not_at_home_addresses;
    CREATE POLICY "Anyone can update addresses" 
      ON not_at_home_addresses
      FOR UPDATE
      USING (true);
    
    -- Anyone can delete addresses
    DROP POLICY IF EXISTS "Anyone can delete addresses" ON not_at_home_addresses;
    CREATE POLICY "Anyone can delete addresses" 
      ON not_at_home_addresses
      FOR DELETE
      USING (true);
    `;

    // Execute the SQL script
    const { data, error } = await supabaseAdmin.rpc('execute_sql', { sql_query: sqlScript });

    if (error) {
      console.error('Error executing SQL script:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to execute SQL script',
        details: error.message
      });
    }

    // Refresh the schema cache
    const refreshSchemaSQL = `
      -- Refresh the schema cache
      SELECT pg_catalog.pg_reload_conf();
      
      -- Analyze the table to update statistics
      ANALYZE not_at_home_addresses;
    `;
    
    const { data: refreshData, error: refreshError } = await supabaseAdmin.rpc('execute_sql', { sql_query: refreshSchemaSQL });

    if (refreshError) {
      console.error('Error refreshing schema cache:', refreshError);
      return res.status(500).json({
        success: false,
        error: 'Failed to refresh schema cache',
        details: refreshError.message
      });
    }

    // Try to insert a test record to verify everything is working
    const { data: testInsert, error: testInsertError } = await supabaseAdmin
      .from('not_at_home_addresses')
      .insert([
        {
          session_id: req.body.sessionId || '6ca234f2-12ef-419f-b95e-59adc2cad3e0',
          block_number: 1,
          address: 'Test Address',
          latitude: 0,
          longitude: 0
        }
      ])
      .select();

    if (testInsertError) {
      console.error('Error inserting test record:', testInsertError);
      return res.status(500).json({
        success: false,
        error: 'Failed to insert test record',
        details: testInsertError.message
      });
    }

    console.log('Test record inserted successfully:', testInsert);

    // Delete the test record
    if (testInsert && testInsert.length > 0) {
      await supabaseAdmin
        .from('not_at_home_addresses')
        .delete()
        .eq('id', testInsert[0].id);
    }

    return res.status(200).json({
      success: true,
      message: 'Addresses table fixed successfully'
    });
  } catch (error) {
    console.error('Error fixing addresses table:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fix addresses table',
      details: error instanceof Error ? error.message : String(error)
    });
  }
} 