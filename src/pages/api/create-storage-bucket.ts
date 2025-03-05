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
    // Check if maps storage bucket exists
    console.log('Checking maps storage bucket...');
    const { data: buckets, error: bucketsError } = await supabase
      .storage
      .listBuckets();
    
    if (bucketsError) {
      console.error('Error listing storage buckets:', bucketsError);
      return res.status(500).json({
        success: false,
        message: 'Failed to list storage buckets',
        details: bucketsError.message
      });
    }
    
    const mapsBucketExists = buckets.some((bucket: any) => bucket.name === 'maps');
    
    if (mapsBucketExists) {
      console.log('Maps storage bucket already exists');
      return res.status(200).json({
        success: true,
        message: 'Maps storage bucket already exists',
        bucketName: 'maps'
      });
    }
    
    // Create maps storage bucket
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
      return res.status(500).json({
        success: false,
        message: 'Failed to create maps storage bucket',
        details: createBucketError.message
      });
    }
    
    console.log('Maps storage bucket created successfully');
    
    // Create public access policy for the bucket
    console.log('Creating public access policy for maps bucket...');
    const { error: policyError } = await supabase
      .storage
      .from('maps')
      .createSignedUrl('dummy.txt', 60);
    
    if (policyError && policyError.message !== 'The resource was not found') {
      console.error('Error creating policy for maps bucket:', policyError);
    }
    
    return res.status(200).json({
      success: true,
      message: 'Maps storage bucket created successfully',
      bucketName: 'maps'
    });
  } catch (error: any) {
    console.error('Error creating maps storage bucket:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create maps storage bucket',
      details: error.message || 'Unknown error'
    });
  }
} 