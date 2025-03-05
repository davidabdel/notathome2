import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with admin privileges
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  // Log environment variables (without revealing full keys)
  console.log('Supabase URL:', supabaseUrl);
  console.log('Service Role Key exists:', !!supabaseServiceRoleKey);

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return res.status(500).json({
      success: false,
      message: 'Missing Supabase credentials',
      details: 'NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set'
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    console.log('Adding contact_email column to congregations table...');
    
    // First check if the column already exists
    try {
      const { error: checkColumnError } = await supabase.rpc('execute_sql', {
        sql_query: `
          SELECT contact_email FROM congregations LIMIT 1;
        `
      });
      
      if (!checkColumnError) {
        console.log('contact_email column already exists');
        return res.status(200).json({
          success: true,
          message: 'contact_email column already exists in congregations table'
        });
      }
    } catch (error: any) {
      console.error('Error checking contact_email column:', error);
      // Continue with adding the column
    }
    
    // Create the execute_sql function if it doesn't exist
    console.log('Creating execute_sql function if needed...');
    
    // Use direct SQL query instead of auth.admin.executeSql
    const createFunctionResponse = await fetch(`${supabaseUrl}/rest/v1/sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceRoleKey}`,
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_KEY || '',
      },
      body: JSON.stringify({
        query: `
          CREATE OR REPLACE FUNCTION execute_sql(sql_query TEXT)
          RETURNS JSONB
          LANGUAGE plpgsql
          SECURITY DEFINER
          AS $$
          DECLARE
            result JSONB;
          BEGIN
            EXECUTE sql_query;
            result := '{"success": true}'::JSONB;
            RETURN result;
          EXCEPTION WHEN OTHERS THEN
            result := jsonb_build_object(
              'success', false,
              'error', SQLERRM,
              'detail', SQLSTATE
            );
            RETURN result;
          END;
          $$;
          
          -- Grant execute permission to authenticated users
          GRANT EXECUTE ON FUNCTION execute_sql TO authenticated;
        `
      })
    });
    
    if (!createFunctionResponse.ok) {
      console.error('Error creating execute_sql function:', await createFunctionResponse.text());
      // Continue anyway, as the function might already exist
    }
    
    // Add the contact_email column to the congregations table
    console.log('Adding contact_email column...');
    const { error: addColumnError } = await supabase.rpc('execute_sql', {
      sql_query: `
        ALTER TABLE congregations ADD COLUMN IF NOT EXISTS contact_email TEXT;
      `
    });
    
    if (addColumnError) {
      console.error('Error adding contact_email column with RPC:', addColumnError);
      
      // Try direct SQL if RPC fails
      console.log('Trying direct SQL to add contact_email column...');
      const directSqlResponse = await fetch(`${supabaseUrl}/rest/v1/sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceRoleKey}`,
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_KEY || '',
        },
        body: JSON.stringify({
          query: `ALTER TABLE congregations ADD COLUMN IF NOT EXISTS contact_email TEXT;`
        })
      });
      
      if (!directSqlResponse.ok) {
        const directSqlError = await directSqlResponse.text();
        console.error('Error adding contact_email column with direct SQL:', directSqlError);
        throw new Error(`Failed to add contact_email column: ${directSqlError}`);
      }
    }
    
    // Refresh schema cache
    console.log('Refreshing schema cache...');
    const { error: refreshSchemaError } = await supabase.rpc('execute_sql', {
      sql_query: `
        SELECT pg_notify('pgrst', 'reload schema');
      `
    });
    
    if (refreshSchemaError) {
      console.error('Error refreshing schema cache:', refreshSchemaError);
      // Not critical, continue
    }
    
    return res.status(200).json({
      success: true,
      message: 'contact_email column added to congregations table successfully'
    });
  } catch (error: any) {
    console.error('Error adding contact_email column:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to add contact_email column',
      details: error.message || 'Unknown error'
    });
  }
} 