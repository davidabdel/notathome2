import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../supabase/config';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Create the RPC function to disable RLS for congregations
    const { error } = await supabase.rpc('exec_sql', {
      sql_query: `
        CREATE OR REPLACE FUNCTION disable_rls_for_congregations()
        RETURNS void AS $$
        BEGIN
          ALTER TABLE congregations DISABLE ROW LEVEL SECURITY;
        END;
        $$ LANGUAGE plpgsql;
      `
    });
    
    if (error) {
      console.error('Error creating RPC function:', error);
      return res.status(500).json({ error: error.message });
    }
    
    // Create the RPC function to create the disable_rls function
    const { error: createFnError } = await supabase.rpc('exec_sql', {
      sql_query: `
        CREATE OR REPLACE FUNCTION create_disable_rls_function()
        RETURNS void AS $$
        BEGIN
          CREATE OR REPLACE FUNCTION disable_rls_for_congregations()
          RETURNS void AS $func$
          BEGIN
            ALTER TABLE congregations DISABLE ROW LEVEL SECURITY;
          END;
          $func$ LANGUAGE plpgsql;
        END;
        $$ LANGUAGE plpgsql;
      `
    });
    
    if (createFnError) {
      console.error('Error creating create_disable_rls_function:', createFnError);
      return res.status(500).json({ error: createFnError.message });
    }
    
    // Create the exec_sql function if it doesn't exist
    const { error: execSqlError } = await supabase.rpc('exec_sql', {
      sql_query: `
        CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
        RETURNS void AS $$
        BEGIN
          EXECUTE sql_query;
        END;
        $$ LANGUAGE plpgsql;
      `
    });
    
    if (execSqlError) {
      // If the error is because exec_sql doesn't exist, we need to create it directly
      if (execSqlError.message.includes('function exec_sql(text) does not exist')) {
        // We can't create it through the API, so we'll return instructions
        return res.status(200).json({ 
          message: 'Please run the following SQL in the Supabase SQL Editor:',
          sql: `
            CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
            RETURNS void AS $$
            BEGIN
              EXECUTE sql_query;
            END;
            $$ LANGUAGE plpgsql;
          `
        });
      }
      
      console.error('Error creating exec_sql function:', execSqlError);
      return res.status(500).json({ error: execSqlError.message });
    }
    
    return res.status(200).json({ 
      message: 'RPC functions created successfully' 
    });
  } catch (error) {
    console.error('Error creating RPC functions:', error);
    return res.status(500).json({ error: 'Failed to create RPC functions' });
  }
} 