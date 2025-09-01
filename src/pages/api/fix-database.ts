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
    const target = req.query.target as string || 'all';
    console.log(`Fix target: ${target}`);

    let result: any = {};

    switch (target) {
      case 'territory_maps':
        result = await fixTerritoryMaps(supabase, supabaseUrl, supabaseServiceRoleKey);
        break;
      case 'execute_sql':
        result = await fixExecuteSqlFunction(supabase, supabaseUrl, supabaseServiceRoleKey);
        break;
      case 'map_count':
        result = await addMapCountColumn(supabase, supabaseUrl, supabaseServiceRoleKey);
        break;
      case 'all':
        // Fix everything
        const territoryMapsResult = await fixTerritoryMaps(supabase, supabaseUrl, supabaseServiceRoleKey);
        const executeSqlResult = await fixExecuteSqlFunction(supabase, supabaseUrl, supabaseServiceRoleKey);
        const mapCountResult = await addMapCountColumn(supabase, supabaseUrl, supabaseServiceRoleKey);
        
        result = {
          success: territoryMapsResult.success && executeSqlResult.success && mapCountResult.success,
          message: 'Database schema fixed',
          details: {
            territory_maps: territoryMapsResult,
            execute_sql: executeSqlResult,
            map_count: mapCountResult
          }
        };
        break;
      default:
        return res.status(400).json({
          success: false,
          message: `Unknown fix target: ${target}`,
          details: 'Valid targets are: territory_maps, execute_sql, map_count, all'
        });
    }

    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Error fixing database schema:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fix database schema',
      details: error.message || 'Unknown error'
    });
  }
}

async function fixTerritoryMaps(supabase: any, supabaseUrl: string, supabaseServiceRoleKey: string) {
  try {
    console.log('Checking if territory_maps table exists...');
    
    // Check if territory_maps table exists
    const { data: tableExists, error: tableCheckError } = await supabase
      .from('territory_maps')
      .select('id')
      .limit(1);
    
    if (tableCheckError && tableCheckError.code === '42P01') {
      console.log('territory_maps table does not exist, creating it...');
      
      // Create the territory_maps table
      const { error: createTableError } = await supabase.rpc('execute_sql', {
        sql_query: `
          CREATE TABLE IF NOT EXISTS territory_maps (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name TEXT NOT NULL,
            description TEXT DEFAULT '',
            image_url TEXT,
            congregation_id UUID NOT NULL,
            status TEXT DEFAULT 'active',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
          
          CREATE INDEX IF NOT EXISTS territory_maps_congregation_id_idx ON territory_maps(congregation_id);
        `
      });
      
      if (createTableError) {
        console.error('Error creating territory_maps table with RPC:', createTableError);
        
        // Try direct SQL if RPC fails
        console.log('Trying direct SQL to create territory_maps table...');
        const directSqlResponse = await fetch(`${supabaseUrl}/rest/v1/sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceRoleKey}`,
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_KEY || '',
          },
          body: JSON.stringify({
            query: `
              CREATE TABLE IF NOT EXISTS territory_maps (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                name TEXT NOT NULL,
                description TEXT DEFAULT '',
                image_url TEXT,
                congregation_id UUID NOT NULL,
                status TEXT DEFAULT 'active',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
              );
              
              CREATE INDEX IF NOT EXISTS territory_maps_congregation_id_idx ON territory_maps(congregation_id);
            `
          })
        });
        
        if (!directSqlResponse.ok) {
          const directSqlError = await directSqlResponse.text();
          console.error('Error creating territory_maps table with direct SQL:', directSqlError);
          throw new Error(`Failed to create territory_maps table: ${directSqlError}`);
        }
      }
    } else if (tableCheckError) {
      console.error('Error checking if territory_maps table exists:', tableCheckError);
    } else {
      console.log('territory_maps table already exists');
    }
    
    console.log('Setting up Row Level Security for territory_maps...');
    
    // Enable RLS and create policies
    const { error: rlsError } = await supabase.rpc('execute_sql', {
      sql_query: `
        -- Enable Row Level Security
        ALTER TABLE territory_maps ENABLE ROW LEVEL SECURITY;
        
        -- Create policies for congregation admins
        DO $$
        BEGIN
          -- Drop existing policies
          BEGIN
            DROP POLICY IF EXISTS congregation_admins_select ON territory_maps;
          EXCEPTION WHEN undefined_object THEN
            -- Policy doesn't exist, which is fine
          END;
          
          BEGIN
            DROP POLICY IF EXISTS congregation_admins_insert ON territory_maps;
          EXCEPTION WHEN undefined_object THEN
            -- Policy doesn't exist, which is fine
          END;
          
          BEGIN
            DROP POLICY IF EXISTS congregation_admins_update ON territory_maps;
          EXCEPTION WHEN undefined_object THEN
            -- Policy doesn't exist, which is fine
          END;
          
          BEGIN
            DROP POLICY IF EXISTS congregation_admins_delete ON territory_maps;
          EXCEPTION WHEN undefined_object THEN
            -- Policy doesn't exist, which is fine
          END;
          
          -- Create more permissive policies for testing
          -- Allow any authenticated user to select
          CREATE POLICY congregation_admins_select ON territory_maps
            FOR SELECT USING (auth.uid() IS NOT NULL);
          
          -- Allow any authenticated user to insert
          CREATE POLICY congregation_admins_insert ON territory_maps
            FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
          
          -- Allow any authenticated user to update
          CREATE POLICY congregation_admins_update ON territory_maps
            FOR UPDATE USING (auth.uid() IS NOT NULL);
          
          -- Allow any authenticated user to delete
          CREATE POLICY congregation_admins_delete ON territory_maps
            FOR DELETE USING (auth.uid() IS NOT NULL);
        END $$;
        
        -- Refresh schema cache
        SELECT pg_notify('pgrst', 'reload schema');
      `
    });
    
    if (rlsError) {
      console.error('Error setting up RLS for territory_maps:', rlsError);
      
      // Try a simpler approach if the DO blocks fail
      console.log('Trying simpler approach for RLS...');
      const { error: simpleRlsError } = await supabase.rpc('execute_sql', {
        sql_query: `
          -- Enable Row Level Security
          ALTER TABLE territory_maps ENABLE ROW LEVEL SECURITY;
          
          -- Create more permissive policies for testing
          -- Drop existing policies if they exist
          DROP POLICY IF EXISTS congregation_admins_select ON territory_maps;
          DROP POLICY IF EXISTS congregation_admins_insert ON territory_maps;
          DROP POLICY IF EXISTS congregation_admins_update ON territory_maps;
          DROP POLICY IF EXISTS congregation_admins_delete ON territory_maps;
          
          -- Create new permissive policies
          CREATE POLICY congregation_admins_select ON territory_maps
            FOR SELECT USING (auth.uid() IS NOT NULL);
          
          CREATE POLICY congregation_admins_insert ON territory_maps
            FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
          
          CREATE POLICY congregation_admins_update ON territory_maps
            FOR UPDATE USING (auth.uid() IS NOT NULL);
          
          CREATE POLICY congregation_admins_delete ON territory_maps
            FOR DELETE USING (auth.uid() IS NOT NULL);
          
          -- Refresh schema cache
          SELECT pg_notify('pgrst', 'reload schema');
        `
      });
      
      if (simpleRlsError) {
        console.error('Error with simpler RLS approach:', simpleRlsError);
        
        // Try direct SQL as a last resort
        console.log('Trying direct SQL for RLS...');
        const directRlsResponse = await fetch(`${supabaseUrl}/rest/v1/sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceRoleKey}`,
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_KEY || '',
          },
          body: JSON.stringify({
            query: `
              -- Enable Row Level Security
              ALTER TABLE territory_maps ENABLE ROW LEVEL SECURITY;
              
              -- Drop existing policies if they exist
              DROP POLICY IF EXISTS congregation_admins_select ON territory_maps;
              DROP POLICY IF EXISTS congregation_admins_insert ON territory_maps;
              DROP POLICY IF EXISTS congregation_admins_update ON territory_maps;
              DROP POLICY IF EXISTS congregation_admins_delete ON territory_maps;
              
              -- Create new permissive policies
              CREATE POLICY congregation_admins_select ON territory_maps
                FOR SELECT USING (auth.uid() IS NOT NULL);
              
              CREATE POLICY congregation_admins_insert ON territory_maps
                FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
              
              CREATE POLICY congregation_admins_update ON territory_maps
                FOR UPDATE USING (auth.uid() IS NOT NULL);
              
              CREATE POLICY congregation_admins_delete ON territory_maps
                FOR DELETE USING (auth.uid() IS NOT NULL);
              
              -- Refresh schema cache
              SELECT pg_notify('pgrst', 'reload schema');
            `
          })
        });
        
        if (!directRlsResponse.ok) {
          const directRlsError = await directRlsResponse.text();
          console.error('Error with direct SQL for RLS:', directRlsError);
          throw new Error(`Failed to set up RLS for territory_maps: ${directRlsError}`);
        }
      }
    }
    
    // Check if maps storage bucket exists and create it if not
    console.log('Checking maps storage bucket...');
    const { data: buckets, error: bucketsError } = await supabase
      .storage
      .listBuckets();
    
    if (bucketsError) {
      console.error('Error listing storage buckets:', bucketsError);
    } else {
      const mapsBucketExists = buckets.some((bucket: any) => bucket.name === 'maps');
      
      if (!mapsBucketExists) {
        console.log('Creating maps storage bucket...');
        const { error: createBucketError } = await supabase
          .storage
          .createBucket('maps', {
            public: true,
            allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
            fileSizeLimit: 10485760 // 10MB
          });
        
        if (createBucketError) {
          console.error('Error creating maps storage bucket:', createBucketError);
        } else {
          console.log('Maps storage bucket created successfully');
        }
      } else {
        console.log('Maps storage bucket already exists');
      }
    }
    
    return {
      success: true,
      message: 'Territory maps table and related objects fixed successfully'
    };
  } catch (error: any) {
    console.error('Error in fixTerritoryMaps:', error);
    return {
      success: false,
      message: 'Failed to fix territory maps',
      details: error.message || 'Unknown error'
    };
  }
}

async function fixExecuteSqlFunction(supabase: any, supabaseUrl: string, supabaseServiceRoleKey: string) {
  try {
    console.log('Creating execute_sql function...');
    
    // Create the execute_sql function if it doesn't exist
    const directSqlResponse = await fetch(`${supabaseUrl}/rest/v1/sql`, {
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
          
          -- Refresh schema cache
          SELECT pg_notify('pgrst', 'reload schema');
        `
      })
    });
    
    if (!directSqlResponse.ok) {
      const directSqlError = await directSqlResponse.text();
      console.error('Error creating execute_sql function:', directSqlError);
      throw new Error(`Failed to create execute_sql function: ${directSqlError}`);
    }
    
    return {
      success: true,
      message: 'Execute SQL function created successfully'
    };
  } catch (error: any) {
    console.error('Error in fixExecuteSqlFunction:', error);
    return {
      success: false,
      message: 'Failed to create execute_sql function',
      details: error.message || 'Unknown error'
    };
  }
}

async function addMapCountColumn(supabase: any, supabaseUrl: string, supabaseServiceRoleKey: string) {
  try {
    console.log('Checking if map_count column exists in congregations table...');
    
    // Try to query the map_count column to see if it exists
    const { data, error } = await supabase
      .from('congregations')
      .select('map_count')
      .limit(1);
    
    if (error && error.code === '42703') {
      // Column doesn't exist, so add it
      console.log('map_count column does not exist, adding it...');
      
      // First try using the execute_sql RPC function
      const { error: rpcError } = await supabase.rpc('execute_sql', {
        sql_query: `
          ALTER TABLE congregations 
          ADD COLUMN IF NOT EXISTS map_count INTEGER DEFAULT 0;
          
          -- Refresh schema cache
          SELECT pg_notify('pgrst', 'reload schema');
        `
      });
      
      if (rpcError) {
        console.error('Error adding map_count column with RPC:', rpcError);
        
        // Try direct SQL if RPC fails
        console.log('Trying direct SQL to add map_count column...');
        const directSqlResponse = await fetch(`${supabaseUrl}/rest/v1/sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceRoleKey}`,
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_KEY || '',
          },
          body: JSON.stringify({
            query: `
              ALTER TABLE congregations 
              ADD COLUMN IF NOT EXISTS map_count INTEGER DEFAULT 0;
              
              -- Refresh schema cache
              SELECT pg_notify('pgrst', 'reload schema');
            `
          })
        });
        
        if (!directSqlResponse.ok) {
          const directSqlError = await directSqlResponse.text();
          console.error('Error adding map_count column with direct SQL:', directSqlError);
          throw new Error(`Failed to add map_count column: ${directSqlError}`);
        }
      }
      
      return {
        success: true,
        message: 'map_count column added to congregations table successfully'
      };
    } else if (error) {
      console.error('Error checking if map_count column exists:', error);
      throw new Error(`Failed to check if map_count column exists: ${error.message}`);
    } else {
      console.log('map_count column already exists in congregations table');
      return {
        success: true,
        message: 'map_count column already exists in congregations table'
      };
    }
  } catch (error: any) {
    console.error('Error in addMapCountColumn:', error);
    return {
      success: false,
      message: 'Failed to add map_count column to congregations table',
      details: error.message || 'Unknown error'
    };
  }
} 