import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { action } = req.body || {};
  
  // Initialize Supabase client with admin privileges
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  
  // Check if environment variables are set
  const envStatus = {
    supabaseUrl: !!supabaseUrl,
    supabaseServiceRoleKey: !!supabaseServiceRoleKey,
  };
  
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return res.status(500).json({
      success: false,
      message: 'Missing Supabase credentials',
      details: 'NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set',
      envStatus
    });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    let result: any = { envStatus };
    
    switch (action) {
      case 'check_env':
        // Already handled above
        break;
        
      case 'list_buckets':
        const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
        if (bucketsError) {
          result.error = bucketsError;
          result.success = false;
        } else {
          result.buckets = buckets;
          result.success = true;
        }
        break;
        
      case 'check_bucket':
        try {
          const { data: bucketData, error: bucketError } = await supabase.storage.getBucket('maps');
          if (bucketError) {
            result.error = bucketError;
            result.success = false;
          } else {
            result.bucket = bucketData;
            result.exists = true;
            result.success = true;
          }
        } catch (error: any) {
          result.error = error.message || String(error);
          result.exists = false;
          result.success = false;
        }
        break;
        
      case 'create_bucket':
        try {
          // First check if bucket exists
          let bucketExists = false;
          try {
            const { data: existingBucket, error: checkError } = await supabase.storage.getBucket('maps');
            if (!checkError && existingBucket) {
              bucketExists = true;
              result.bucket = existingBucket;
              result.message = 'Bucket already exists';
              result.success = true;
            }
          } catch (error) {
            // Bucket doesn't exist, continue to creation
          }
          
          if (!bucketExists) {
            // Create the bucket
            const { data: createData, error: createError } = await supabase.storage.createBucket('maps', {
              public: true,
              allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
              fileSizeLimit: 5242880 // 5MB
            });
            
            if (createError) {
              result.error = createError;
              result.success = false;
            } else {
              result.bucket = createData;
              result.message = 'Bucket created successfully';
              result.success = true;
            }
          }
        } catch (error: any) {
          result.error = error.message || String(error);
          result.success = false;
        }
        break;
        
      case 'check_rls':
        try {
          // Check RLS policies on storage.buckets table
          const { data: rlsData, error: rlsError } = await supabase.rpc('execute_sql', {
            sql_query: `
              SELECT 
                schemaname, 
                tablename, 
                policyname, 
                permissive, 
                roles, 
                cmd, 
                qual, 
                with_check
              FROM 
                pg_policies 
              WHERE 
                tablename = 'buckets' AND schemaname = 'storage'
            `
          });
          
          if (rlsError) {
            result.error = rlsError;
            result.success = false;
          } else {
            result.policies = rlsData;
            result.success = true;
          }
        } catch (error: any) {
          result.error = error.message || String(error);
          result.success = false;
        }
        break;
        
      case 'check_permissions':
        try {
          // Check if service role has necessary permissions
          const { data: permData, error: permError } = await supabase.rpc('execute_sql', {
            sql_query: `
              SELECT 
                grantee, 
                table_schema, 
                table_name, 
                privilege_type
              FROM 
                information_schema.role_table_grants 
              WHERE 
                table_name = 'buckets' AND table_schema = 'storage'
            `
          });
          
          if (permError) {
            result.error = permError;
            result.success = false;
          } else {
            result.permissions = permData;
            result.success = true;
          }
        } catch (error: any) {
          result.error = error.message || String(error);
          result.success = false;
        }
        break;
        
      default:
        result.message = 'Invalid action specified';
        result.success = false;
    }
    
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error: any) {
    console.error('Error in debug-storage API:', error);
    return res.status(500).json({
      success: false,
      message: 'Error in debug-storage API',
      error: error.message || String(error),
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
