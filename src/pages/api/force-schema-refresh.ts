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
    console.log('Force refreshing schema cache...');

    // First, let's check if the table exists
    const { data: tableExists, error: tableCheckError } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 'not_at_home_addresses')
      .eq('table_schema', 'public')
      .single();

    if (tableCheckError) {
      console.error('Error checking table existence:', tableCheckError);
      return res.status(500).json({
        success: false,
        error: 'Failed to check if table exists',
        details: tableCheckError.message
      });
    }

    if (!tableExists) {
      console.log('Table does not exist, creating it...');
      
      // SQL to create the not_at_home_addresses table
      const createTableSQL = `
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
        CREATE POLICY "Anyone can insert addresses" 
          ON not_at_home_addresses
          FOR INSERT
          WITH CHECK (true);
        
        -- Anyone can view addresses
        CREATE POLICY "Anyone can view addresses" 
          ON not_at_home_addresses
          FOR SELECT
          USING (true);
        
        -- Anyone can update addresses
        CREATE POLICY "Anyone can update addresses" 
          ON not_at_home_addresses
          FOR UPDATE
          USING (true);
        
        -- Anyone can delete addresses
        CREATE POLICY "Anyone can delete addresses" 
          ON not_at_home_addresses
          FOR DELETE
          USING (true);
      `;

      // Execute the SQL to create the table
      await supabaseAdmin.rpc('execute_sql', { sql_query: createTableSQL });
    }

    // Now let's check the columns to make sure 'address' exists
    const { data: columns, error: columnsError } = await supabaseAdmin
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'not_at_home_addresses')
      .eq('table_schema', 'public');

    if (columnsError) {
      console.error('Error checking columns:', columnsError);
      return res.status(500).json({
        success: false,
        error: 'Failed to check columns',
        details: columnsError.message
      });
    }

    console.log('Columns in not_at_home_addresses:', columns);
    
    const hasAddressColumn = columns.some(col => col.column_name === 'address');
    
    if (!hasAddressColumn) {
      console.log('Address column does not exist, adding it...');
      
      const addColumnSQL = `
        ALTER TABLE not_at_home_addresses ADD COLUMN IF NOT EXISTS address TEXT;
      `;
      
      await supabaseAdmin.rpc('execute_sql', { sql_query: addColumnSQL });
    }

    // Force refresh the schema cache
    const refreshSchemaSQL = `
      -- Refresh the schema cache
      SELECT pg_catalog.pg_reload_conf();
      
      -- Analyze the table to update statistics
      ANALYZE not_at_home_addresses;
    `;
    
    await supabaseAdmin.rpc('execute_sql', { sql_query: refreshSchemaSQL });

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
      message: 'Schema cache force refreshed successfully',
      tableExists: !!tableExists,
      columns: columns.map(col => col.column_name)
    });
  } catch (error) {
    console.error('Error force refreshing schema cache:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to force refresh schema cache',
      details: error instanceof Error ? error.message : String(error)
    });
  }
} 