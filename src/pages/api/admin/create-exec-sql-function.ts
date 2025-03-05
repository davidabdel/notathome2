import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with admin privileges
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
    // Try to execute a simple query to check if the execute_sql function exists
    try {
      await supabaseAdmin.rpc('execute_sql', { sql_query: 'SELECT 1' });
      // If we get here, the function exists
      return res.status(200).json({
        success: true,
        message: 'execute_sql function already exists'
      });
    } catch (error) {
      // Function doesn't exist, we need to create it
      console.log('execute_sql function does not exist, creating it...');
    }

    // Create the execute_sql function using raw SQL via the REST API
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
      const errorData = await response.json();
      console.error('Error creating execute_sql function via REST API:', errorData);
      
      // Try an alternative approach using a direct database connection
      // This would typically be handled by a migration script or direct database access
      // For this example, we'll simulate it with a message
      
      return res.status(500).json({
        error: 'Failed to create execute_sql function',
        details: 'Direct database access is required to create this function. Please run the following SQL in your database:',
        sql: `
          -- Create the execute_sql function
          CREATE OR REPLACE FUNCTION execute_sql(sql_query TEXT)
          RETURNS VOID AS $$
          BEGIN
            EXECUTE sql_query;
          END;
          $$ LANGUAGE plpgsql SECURITY DEFINER;
        `
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'execute_sql function created successfully'
    });
  } catch (err: any) {
    console.error('Exception creating execute_sql function:', err);
    return res.status(500).json({
      error: 'Exception creating execute_sql function',
      details: err.message
    });
  }
} 