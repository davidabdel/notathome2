import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with admin privileges
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!serviceRoleKey) {
  console.error('Missing environment variable: SUPABASE_SERVICE_ROLE_KEY');
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Fixing missing columns...');

    // Check if the table exists
    const checkTableSQL = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'not_at_home_addresses'
      );
    `;

    const { data: tableExists, error: tableError } = await supabaseAdmin.rpc('execute_sql', { 
      sql_query: checkTableSQL 
    });

    if (tableError) {
      console.error('Error checking table:', tableError);
      return res.status(500).json({
        success: false,
        error: 'Failed to check table',
        details: tableError.message
      });
    }

    if (!tableExists || !tableExists[0] || !tableExists[0].exists) {
      console.log('Table does not exist, creating it...');
      
      // Create the table with all required columns
      const createTableSQL = `
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
      `;

      const { data: createData, error: createError } = await supabaseAdmin.rpc('execute_sql', { 
        sql_query: createTableSQL 
      });

      if (createError) {
        console.error('Error creating table:', createError);
        return res.status(500).json({
          success: false,
          error: 'Failed to create table',
          details: createError.message
        });
      }
    }

    // Check for missing columns
    const columnsToCheck = [
      { name: 'address', type: 'TEXT' },
      { name: 'created_by', type: 'UUID REFERENCES auth.users(id)' },
      { name: 'latitude', type: 'DOUBLE PRECISION' },
      { name: 'longitude', type: 'DOUBLE PRECISION' }
    ];

    const results = [];

    for (const column of columnsToCheck) {
      // Check if the column exists
      const checkColumnSQL = `
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'not_at_home_addresses' 
          AND column_name = '${column.name}'
        );
      `;

      const { data: columnExists, error: columnError } = await supabaseAdmin.rpc('execute_sql', { 
        sql_query: checkColumnSQL 
      });

      if (columnError) {
        console.error(`Error checking column ${column.name}:`, columnError);
        continue;
      }

      if (!columnExists || !columnExists[0] || !columnExists[0].exists) {
        console.log(`Column ${column.name} does not exist, adding it...`);
        
        // Add the missing column
        const addColumnSQL = `
          ALTER TABLE not_at_home_addresses 
          ADD COLUMN IF NOT EXISTS ${column.name} ${column.type};
        `;

        const { data: addData, error: addError } = await supabaseAdmin.rpc('execute_sql', { 
          sql_query: addColumnSQL 
        });

        if (addError) {
          console.error(`Error adding column ${column.name}:`, addError);
          results.push({
            column: column.name,
            success: false,
            error: addError.message
          });
        } else {
          results.push({
            column: column.name,
            success: true
          });
        }
      } else {
        results.push({
          column: column.name,
          success: true,
          exists: true
        });
      }
    }

    // Refresh the schema cache
    const refreshSQL = `
      SELECT pg_catalog.pg_reload_conf();
      ANALYZE not_at_home_addresses;
    `;

    await supabaseAdmin.rpc('execute_sql', { sql_query: refreshSQL });

    // Get all columns for verification
    const allColumnsSQL = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'not_at_home_addresses'
      ORDER BY ordinal_position;
    `;

    const { data: allColumns, error: allColumnsError } = await supabaseAdmin.rpc('execute_sql', { 
      sql_query: allColumnsSQL 
    });

    return res.status(200).json({
      success: true,
      message: 'Missing columns fixed',
      results,
      allColumns
    });
  } catch (error) {
    console.error('Error fixing missing columns:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fix missing columns',
      details: error instanceof Error ? error.message : String(error)
    });
  }
} 