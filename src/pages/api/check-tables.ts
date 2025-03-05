import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../supabase/config';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Check if congregations table exists
    const { data: congregationsData, error: congregationsError } = await supabase
      .from('congregations')
      .select('id')
      .limit(1);

    // Check if congregation_requests table exists
    const { data: requestsData, error: requestsError } = await supabase
      .from('congregation_requests')
      .select('id')
      .limit(1);

    // Check if user_roles table exists
    const { data: rolesData, error: rolesError } = await supabase
      .from('user_roles')
      .select('id')
      .limit(1);

    return res.status(200).json({
      tables: {
        congregations: {
          exists: !congregationsError || !congregationsError.message.includes('does not exist'),
          error: congregationsError ? congregationsError.message : null
        },
        congregation_requests: {
          exists: !requestsError || !requestsError.message.includes('does not exist'),
          error: requestsError ? requestsError.message : null
        },
        user_roles: {
          exists: !rolesError || !rolesError.message.includes('does not exist'),
          error: rolesError ? rolesError.message : null
        }
      }
    });
  } catch (err) {
    console.error('Error checking tables:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'An unexpected error occurred'
    });
  }
} 