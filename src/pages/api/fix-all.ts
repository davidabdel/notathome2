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
    // Get the action from the request body
    const { action = 'fix_all' } = req.body || {};
    console.log(`Starting fix process with action: ${action}...`);
    
    let response;
    
    // Handle different actions
    switch (action) {
      case 'create_bucket':
        // Only create the storage bucket
        console.log('Creating storage bucket only...');
        const storageResult = await createStorageBucket(supabase);
        response = {
          success: storageResult.success,
          message: storageResult.success 
            ? 'Storage bucket created successfully' 
            : 'Failed to create storage bucket',
          details: storageResult
        };
        break;
        
      case 'fix_database':
        // Only fix the database schema
        console.log('Fixing database schema only...');
        const databaseResult = await fixDatabaseSchema(supabase);
        response = {
          success: databaseResult.success,
          message: databaseResult.success 
            ? 'Database schema fixed successfully' 
            : 'Failed to fix database schema',
          details: databaseResult
        };
        break;
        
      case 'fix_all':
      default:
        // Fix everything (default behavior)
        console.log('Starting comprehensive fix process...');
        
        // Step 1: Fix database schema and RLS policies
        console.log('Step 1: Fixing database schema and RLS policies...');
        const dbResult = await fixDatabaseSchema(supabase);
        
        // Step 2: Create and configure storage bucket
        console.log('Step 2: Creating and configuring storage bucket...');
        const stResult = await createStorageBucket(supabase);
        
        // Combine results
        const success = dbResult.success && stResult.success;
        
        // Generate detailed response
        response = {
          success,
          message: success 
            ? 'All issues fixed successfully' 
            : 'Some issues could not be fixed',
          details: {
            database: dbResult,
            storage: stResult
          }
        };
        break;
    }
    
    return res.status(response.success ? 200 : 500).json(response);
  } catch (error: any) {
    console.error('Error in fix-all process:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fix issues',
      details: error.message || 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

async function fixDatabaseSchema(supabase: any) {
  try {
    console.log('Fixing database schema...');
    
    // Step 1: Create execute_sql function if it doesn't exist
    const executeSqlResult = await fixExecuteSqlFunction(supabase);
    if (!executeSqlResult.success) {
      return executeSqlResult;
    }
    
    // Step 2: Fix territory_maps table and RLS policies
    const territoryMapsResult = await fixTerritoryMaps(supabase);
    if (!territoryMapsResult.success) {
      return territoryMapsResult;
    }
    
    // Step 3: Add map_count column to congregations table
    const mapCountResult = await addMapCountColumn(supabase);
    
    return {
      success: true,
      message: 'Database schema fixed successfully',
      details: {
        execute_sql: executeSqlResult,
        territory_maps: territoryMapsResult,
        map_count: mapCountResult
      }
    };
  } catch (error: any) {
    console.error('Error fixing database schema:', error);
    return {
      success: false,
      message: 'Failed to fix database schema',
      details: error.message || 'Unknown error'
    };
  }
}

async function fixExecuteSqlFunction(supabase: any) {
  try {
    console.log('Checking if execute_sql function exists...');
    
    // Try to call the function to see if it exists
    const { data: functionExists, error: functionCheckError } = await supabase.rpc('execute_sql', {
      sql_query: 'SELECT 1'
    });
    
    if (functionCheckError && functionCheckError.code === '42883') {
      console.log('execute_sql function does not exist, creating it...');
      
      // Create the execute_sql function
      const { error: createFunctionError } = await supabase.rpc('execute_sql', {
        sql_query: `
          CREATE OR REPLACE FUNCTION execute_sql(sql_query TEXT)
          RETURNS JSONB
          LANGUAGE plpgsql
          SECURITY DEFINER
          AS $$
          DECLARE
            result JSONB;
          BEGIN
            EXECUTE sql_query;
            result := '{"status": "success"}'::JSONB;
            RETURN result;
          EXCEPTION WHEN OTHERS THEN
            result := jsonb_build_object(
              'status', 'error',
              'message', SQLERRM,
              'code', SQLSTATE
            );
            RETURN result;
          END;
          $$;
          
          -- Grant execute permission to authenticated users
          GRANT EXECUTE ON FUNCTION execute_sql TO authenticated;
        `
      });
      
      if (createFunctionError) {
        console.error('Error creating execute_sql function:', createFunctionError);
        
        // Try direct SQL if RPC fails
        console.log('Trying direct SQL to create execute_sql function...');
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
                result := '{"status": "success"}'::JSONB;
                RETURN result;
              EXCEPTION WHEN OTHERS THEN
                result := jsonb_build_object(
                  'status', 'error',
                  'message', SQLERRM,
                  'code', SQLSTATE
                );
                RETURN result;
              END;
              $$;
              
              -- Grant execute permission to authenticated users
              GRANT EXECUTE ON FUNCTION execute_sql TO authenticated;
            `
          })
        });
        
        if (!directSqlResponse.ok) {
          const directSqlError = await directSqlResponse.text();
          console.error('Error creating execute_sql function with direct SQL:', directSqlError);
          return {
            success: false,
            message: 'Failed to create execute_sql function',
            details: directSqlError
          };
        }
      }
    } else if (functionCheckError) {
      console.error('Error checking if execute_sql function exists:', functionCheckError);
      return {
        success: false,
        message: 'Failed to check if execute_sql function exists',
        details: functionCheckError.message
      };
    } else {
      console.log('execute_sql function already exists');
    }
    
    return {
      success: true,
      message: 'execute_sql function is available'
    };
  } catch (error: any) {
    console.error('Error fixing execute_sql function:', error);
    return {
      success: false,
      message: 'Failed to fix execute_sql function',
      details: error.message || 'Unknown error'
    };
  }
}

async function fixTerritoryMaps(supabase: any) {
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
        return {
          success: false,
          message: 'Failed to create territory_maps table',
          details: createTableError.message
        };
      }
    } else if (tableCheckError) {
      console.error('Error checking if territory_maps table exists:', tableCheckError);
      return {
        success: false,
        message: 'Failed to check if territory_maps table exists',
        details: tableCheckError.message
      };
    } else {
      console.log('territory_maps table already exists');
    }
    
    console.log('Setting up Row Level Security for territory_maps...');
    
    // Enable RLS and create policies
    const { error: rlsError } = await supabase.rpc('execute_sql', {
      sql_query: `
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
    });
    
    if (rlsError) {
      console.error('Error setting up RLS for territory_maps:', rlsError);
      return {
        success: false,
        message: 'Failed to set up RLS for territory_maps',
        details: rlsError.message
      };
    }
    
    return {
      success: true,
      message: 'territory_maps table and RLS policies fixed successfully'
    };
  } catch (error: any) {
    console.error('Error fixing territory_maps table:', error);
    return {
      success: false,
      message: 'Failed to fix territory_maps table',
      details: error.message || 'Unknown error'
    };
  }
}

async function addMapCountColumn(supabase: any) {
  try {
    console.log('Checking if map_count column exists in congregations table...');
    
    // Check if map_count column exists
    const { error: columnCheckError } = await supabase.rpc('execute_sql', {
      sql_query: `
        SELECT map_count FROM congregations LIMIT 1;
      `
    });
    
    if (columnCheckError && columnCheckError.code === '42703') {
      console.log('map_count column does not exist, adding it...');
      
      // Add map_count column
      const { error: addColumnError } = await supabase.rpc('execute_sql', {
        sql_query: `
          ALTER TABLE congregations ADD COLUMN IF NOT EXISTS map_count INTEGER DEFAULT 0;
        `
      });
      
      if (addColumnError) {
        console.error('Error adding map_count column:', addColumnError);
        return {
          success: false,
          message: 'Failed to add map_count column',
          details: addColumnError.message
        };
      }
    } else if (columnCheckError) {
      console.error('Error checking if map_count column exists:', columnCheckError);
      return {
        success: false,
        message: 'Failed to check if map_count column exists',
        details: columnCheckError.message
      };
    } else {
      console.log('map_count column already exists');
    }
    
    // Check if contact_email column exists
    const { error: emailColumnCheckError } = await supabase.rpc('execute_sql', {
      sql_query: `
        SELECT contact_email FROM congregations LIMIT 1;
      `
    });
    
    if (emailColumnCheckError && emailColumnCheckError.code === '42703') {
      console.log('contact_email column does not exist, adding it...');
      
      // Add contact_email column
      const { error: addEmailColumnError } = await supabase.rpc('execute_sql', {
        sql_query: `
          ALTER TABLE congregations ADD COLUMN IF NOT EXISTS contact_email TEXT DEFAULT '';
        `
      });
      
      if (addEmailColumnError) {
        console.error('Error adding contact_email column:', addEmailColumnError);
        return {
          success: false,
          message: 'Failed to add contact_email column',
          details: addEmailColumnError.message
        };
      }
    } else if (emailColumnCheckError) {
      console.error('Error checking if contact_email column exists:', emailColumnCheckError);
    } else {
      console.log('contact_email column already exists');
    }
    
    return {
      success: true,
      message: 'Columns added to congregations table successfully'
    };
  } catch (error: any) {
    console.error('Error adding columns to congregations table:', error);
    return {
      success: false,
      message: 'Failed to add columns to congregations table',
      details: error.message || 'Unknown error'
    };
  }
}

async function createStorageBucket(supabase: any) {
  try {
    // Check if maps storage bucket exists
    console.log('Checking maps storage bucket...');
    const { data: buckets, error: bucketsError } = await supabase
      .storage
      .listBuckets();
    
    if (bucketsError) {
      console.error('Error listing storage buckets:', bucketsError);
      return {
        success: false,
        message: 'Failed to list storage buckets',
        details: bucketsError.message,
        code: bucketsError.code || 'unknown'
      };
    }
    
    const mapsBucket = buckets.find((bucket: any) => bucket.name === 'maps');
    
    if (mapsBucket) {
      console.log('Maps storage bucket already exists');
      
      // Check if bucket is public
      if (!mapsBucket.public) {
        console.log('Maps bucket exists but is not public, updating...');
        const { error: updateError } = await supabase
          .storage
          .updateBucket('maps', {
            public: true,
            allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
            fileSizeLimit: 5242880 // 5MB
          });
        
        if (updateError) {
          console.error('Error updating maps bucket to public:', updateError);
          return {
            success: false,
            message: 'Failed to update maps bucket to public',
            details: updateError.message,
            code: updateError.code || 'unknown'
          };
        }
        
        console.log('Maps bucket updated to public successfully');
      }
      
      return {
        success: true,
        message: 'Maps storage bucket exists and is properly configured',
        bucketName: 'maps',
        isPublic: true
      };
    }
    
    // Create maps storage bucket
    console.log('Creating maps storage bucket...');
    
    // Attempt to create the bucket
    const { data: createData, error: createBucketError } = await supabase
      .storage
      .createBucket('maps', {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        fileSizeLimit: 5242880 // 5MB
      });
    
    if (createBucketError) {
      console.error('Error creating maps storage bucket:', createBucketError);
      return {
        success: false,
        message: 'Failed to create maps storage bucket',
        details: createBucketError.message,
        code: createBucketError.code || 'unknown'
      };
    }
    
    console.log('Maps storage bucket created successfully:', createData);
    
    return {
      success: true,
      message: 'Maps storage bucket created successfully',
      bucketName: 'maps',
      isPublic: true,
      data: createData
    };
  } catch (error: any) {
    console.error('Error creating maps storage bucket:', error);
    return {
      success: false,
      message: 'Exception occurred while creating maps storage bucket',
      details: error.message || 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };
  }
} 