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
    console.log('Fixing address column...');

    // Check if the column exists
    const checkColumnSQL = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'not_at_home_addresses' 
      AND column_name = 'address';
    `;

    const { data: checkData, error: checkError } = await supabaseAdmin.rpc('execute_sql', { 
      sql_query: checkColumnSQL 
    });

    if (checkError) {
      console.error('Error checking column:', checkError);
      return res.status(500).json({
        success: false,
        error: 'Failed to check column',
        details: checkError.message
      });
    }

    // If the column doesn't exist, add it
    if (!checkData || !checkData.length) {
      console.log('Address column not found, adding it...');
      
      const addColumnSQL = `
        ALTER TABLE not_at_home_addresses 
        ADD COLUMN IF NOT EXISTS address TEXT;
      `;

      const { data: alterData, error: alterError } = await supabaseAdmin.rpc('execute_sql', { 
        sql_query: addColumnSQL 
      });

      if (alterError) {
        console.error('Error adding column:', alterError);
        return res.status(500).json({
          success: false,
          error: 'Failed to add column',
          details: alterError.message
        });
      }

      // Refresh the schema cache
      const refreshSQL = `
        SELECT pg_catalog.pg_reload_conf();
        ANALYZE not_at_home_addresses;
      `;

      await supabaseAdmin.rpc('execute_sql', { sql_query: refreshSQL });
    } else {
      console.log('Address column already exists');
    }

    // Verify the column exists now
    const verifyColumnSQL = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'not_at_home_addresses' 
      AND column_name = 'address';
    `;

    const { data: verifyData, error: verifyError } = await supabaseAdmin.rpc('execute_sql', { 
      sql_query: verifyColumnSQL 
    });

    if (verifyError) {
      console.error('Error verifying column:', verifyError);
      return res.status(500).json({
        success: false,
        error: 'Failed to verify column',
        details: verifyError.message
      });
    }

    // Get all columns for debugging
    const allColumnsSQL = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'not_at_home_addresses';
    `;

    const { data: allColumnsData, error: allColumnsError } = await supabaseAdmin.rpc('execute_sql', { 
      sql_query: allColumnsSQL 
    });

    return res.status(200).json({
      success: true,
      message: 'Address column fixed',
      columnExists: verifyData && verifyData.length > 0,
      allColumns: allColumnsData
    });
  } catch (error) {
    console.error('Error fixing column:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fix column',
      details: error instanceof Error ? error.message : String(error)
    });
  }
} 