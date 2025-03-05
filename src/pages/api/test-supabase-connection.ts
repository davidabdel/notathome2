import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // Try to query the congregation_requests table
    const { data: requests, error: requestsError } = await supabaseAdmin
      .from('congregation_requests')
      .select('*');
    
    // Try to query the user_roles table
    const { data: roles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('*')
      .limit(5);
      
    // Try to query the congregations table
    const { data: congregations, error: congregationsError } = await supabaseAdmin
      .from('congregations')
      .select('*')
      .limit(5);

    return res.status(200).json({
      success: true,
      requests: {
        data: requests,
        count: requests?.length || 0,
        error: requestsError ? {
          message: requestsError.message,
          details: requestsError.details,
          hint: requestsError.hint
        } : null
      },
      roles: {
        data: roles,
        count: roles?.length || 0,
        error: rolesError ? {
          message: rolesError.message,
          details: rolesError.details,
          hint: rolesError.hint
        } : null
      },
      congregations: {
        data: congregations,
        count: congregations?.length || 0,
        error: congregationsError ? {
          message: congregationsError.message,
          details: congregationsError.details,
          hint: congregationsError.hint
        } : null
      },
      env: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL,
        keyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0
      }
    });
  } catch (error) {
    console.error('Error testing Supabase connection:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
} 