import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with admin privileges
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

interface TableInfo {
  exists: boolean;
  error: string | null;
}

interface CongregationTableInfo extends TableInfo {
  contact_email_column: boolean;
  map_count_column: boolean;
  columns?: string[];
}

interface SchemaInfo {
  tables: {
    territory_maps: TableInfo;
    user_roles: TableInfo;
    congregations: CongregationTableInfo;
  };
  functions: {
    execute_sql: {
      exists: boolean;
    };
  };
  storage: {
    maps_bucket: {
      exists: boolean;
    };
  };
  security: {
    rls_enabled: boolean;
    policies_exist: boolean;
  };
  environment: {
    supabase_url: boolean;
    supabase_key: boolean;
    service_role_key: boolean;
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
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
    console.log('Checking database schema...');
    
    // Initialize schema info
    const schemaInfo: SchemaInfo = {
      tables: {
        territory_maps: {
          exists: false,
          error: null
        },
        user_roles: {
          exists: false,
          error: null
        },
        congregations: {
          exists: false,
          error: null,
          contact_email_column: false,
          map_count_column: false,
          columns: []
        }
      },
      functions: {
        execute_sql: {
          exists: false
        }
      },
      storage: {
        maps_bucket: {
          exists: false
        }
      },
      security: {
        rls_enabled: false,
        policies_exist: false
      },
      environment: {
        supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabase_key: !!process.env.NEXT_PUBLIC_SUPABASE_KEY,
        service_role_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      }
    };
    
    // Check if territory_maps table exists
    try {
      const { data: territoryMapsData, error: territoryMapsError } = await supabase
        .from('territory_maps')
        .select('id')
        .limit(1);
      
      schemaInfo.tables.territory_maps.exists = !territoryMapsError;
      if (territoryMapsError) {
        schemaInfo.tables.territory_maps.error = territoryMapsError.message;
      }
    } catch (error: any) {
      console.error('Error checking territory_maps table:', error);
      schemaInfo.tables.territory_maps.error = error.message;
    }
    
    // Check if user_roles table exists
    try {
      const { data: userRolesData, error: userRolesError } = await supabase
        .from('user_roles')
        .select('id')
        .limit(1);
      
      schemaInfo.tables.user_roles.exists = !userRolesError;
      if (userRolesError) {
        schemaInfo.tables.user_roles.error = userRolesError.message;
      }
    } catch (error: any) {
      console.error('Error checking user_roles table:', error);
      schemaInfo.tables.user_roles.error = error.message;
    }
    
    // Check if congregations table exists and has contact_email and map_count columns
    try {
      const { data: congregationsData, error: congregationsError } = await supabase
        .from('congregations')
        .select('id')
        .limit(1);
      
      schemaInfo.tables.congregations.exists = !congregationsError;
      if (congregationsError) {
        schemaInfo.tables.congregations.error = congregationsError.message;
      } else {
        // Get column information for congregations table
        try {
          const { data: columnsData, error: columnsError } = await supabase.rpc('execute_sql', {
            sql_query: `
              SELECT column_name 
              FROM information_schema.columns 
              WHERE table_name = 'congregations' AND table_schema = 'public';
            `
          });
          
          if (!columnsError && columnsData) {
            // Add type checking to ensure columnsData is an array before calling map()
            if (Array.isArray(columnsData)) {
              const columnNames = columnsData.map((col: any) => col.column_name);
              schemaInfo.tables.congregations.columns = columnNames;
              schemaInfo.tables.congregations.contact_email_column = columnNames.includes('contact_email');
              schemaInfo.tables.congregations.map_count_column = columnNames.includes('map_count');
            } else {
              console.error('Error: columnsData is not an array:', columnsData);
              // Try to handle non-array data if possible
              if (columnsData && typeof columnsData === 'object') {
                schemaInfo.tables.congregations.columns = [];
                // If it's a single object result
                if (columnsData.column_name) {
                  schemaInfo.tables.congregations.columns.push(columnsData.column_name);
                  schemaInfo.tables.congregations.contact_email_column = columnsData.column_name === 'contact_email';
                  schemaInfo.tables.congregations.map_count_column = columnsData.column_name === 'map_count';
                }
              }
            }
          }
        } catch (error: any) {
          console.error('Error checking congregations columns:', error);
        }
        
        // Fallback checks if the column query fails
        if (!schemaInfo.tables.congregations.columns) {
          // Check if contact_email column exists
          try {
            const { error: contactEmailError } = await supabase.rpc('execute_sql', {
              sql_query: `
                SELECT contact_email FROM congregations LIMIT 1;
              `
            });
            
            schemaInfo.tables.congregations.contact_email_column = !contactEmailError;
          } catch (error: any) {
            console.error('Error checking contact_email column:', error);
          }
          
          // Check if map_count column exists
          try {
            const { error: mapCountError } = await supabase.rpc('execute_sql', {
              sql_query: `
                SELECT map_count FROM congregations LIMIT 1;
              `
            });
            
            schemaInfo.tables.congregations.map_count_column = !mapCountError;
          } catch (error: any) {
            console.error('Error checking map_count column:', error);
          }
        }
      }
    } catch (error: any) {
      console.error('Error checking congregations table:', error);
      schemaInfo.tables.congregations.error = error.message;
    }
    
    // Check if execute_sql function exists
    try {
      const { error: executeSqlError } = await supabase.rpc('execute_sql', {
        sql_query: 'SELECT 1;'
      });
      
      schemaInfo.functions.execute_sql.exists = !executeSqlError;
    } catch (error: any) {
      console.error('Error checking execute_sql function:', error);
    }
    
    // Check if maps storage bucket exists
    try {
      const { data: buckets, error: bucketsError } = await supabase
        .storage
        .listBuckets();
      
      if (!bucketsError && buckets) {
        schemaInfo.storage.maps_bucket.exists = buckets.some((bucket: any) => bucket.name === 'maps');
      }
    } catch (error: any) {
      console.error('Error checking maps storage bucket:', error);
    }
    
    // Check if RLS is enabled and policies exist for territory_maps
    if (schemaInfo.tables.territory_maps.exists) {
      try {
        const { data: rlsData, error: rlsError } = await supabase.rpc('execute_sql', {
          sql_query: `
            SELECT relrowsecurity FROM pg_class WHERE relname = 'territory_maps';
          `
        });
        
        if (!rlsError && rlsData && rlsData.length > 0) {
          schemaInfo.security.rls_enabled = rlsData[0].relrowsecurity;
        }
        
        const { data: policiesData, error: policiesError } = await supabase.rpc('execute_sql', {
          sql_query: `
            SELECT COUNT(*) FROM pg_policy WHERE schemaname = 'public' AND tablename = 'territory_maps';
          `
        });
        
        if (!policiesError && policiesData && policiesData.length > 0) {
          schemaInfo.security.policies_exist = parseInt(policiesData[0].count) > 0;
        }
      } catch (error: any) {
        console.error('Error checking RLS and policies:', error);
      }
    }
    
    // Identify issues that need fixing
    const issues: string[] = [];
    
    if (!schemaInfo.tables.territory_maps.exists) {
      issues.push('Territory maps table is missing');
    }
    
    if (!schemaInfo.tables.user_roles.exists) {
      issues.push('User roles table is missing');
    }
    
    if (!schemaInfo.tables.congregations.exists) {
      issues.push('Congregations table is missing');
    } else {
      if (!schemaInfo.tables.congregations.contact_email_column) {
        issues.push('Contact email column is missing in congregations table');
      }
      
      if (!schemaInfo.tables.congregations.map_count_column) {
        issues.push('Map count column is missing in congregations table');
      }
    }
    
    if (!schemaInfo.functions.execute_sql.exists) {
      issues.push('Execute SQL function is missing');
    }
    
    if (!schemaInfo.storage.maps_bucket.exists) {
      issues.push('Maps storage bucket is missing');
    }
    
    if (schemaInfo.tables.territory_maps.exists && !schemaInfo.security.rls_enabled) {
      issues.push('Row Level Security is not enabled for territory maps');
    }
    
    if (schemaInfo.tables.territory_maps.exists && !schemaInfo.security.policies_exist) {
      issues.push('Security policies are missing for territory maps');
    }
    
    if (!schemaInfo.environment.supabase_url || !schemaInfo.environment.supabase_key || !schemaInfo.environment.service_role_key) {
      issues.push('One or more environment variables are missing');
    }
    
    return res.status(200).json({
      success: true,
      schema: schemaInfo,
      issues,
      needs_fixing: issues.length > 0
    });
  } catch (error: any) {
    console.error('Error checking database schema:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to check database schema',
      details: error.message || 'Unknown error'
    });
  }
} 