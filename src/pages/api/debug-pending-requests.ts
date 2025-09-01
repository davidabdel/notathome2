import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../supabase/config';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Try direct query first
    const { count: directCount, error: directError } = await supabase
      .from('congregation_requests')
      .select('id', { count: 'exact' })
      .eq('status', 'pending');

    // Try getting all requests without filtering
    const { data: allRequests, error: allRequestsError } = await supabase
      .from('congregation_requests')
      .select('*');

    // Try inserting a test request directly
    const { data: insertData, error: insertError } = await supabase
      .from('congregation_requests')
      .insert([{ 
        name: 'Debug Test Congregation', 
        pin_code: '123456', 
        contact_email: 'debug@example.com',
        status: 'pending'
      }])
      .select();

    // Try a simpler query
    const { data: simpleData, error: simpleError } = await supabase
      .from('congregation_requests')
      .select('id, status');

    // Return all debug info
    return res.status(200).json({
      directCount,
      directError: directError ? {
        message: directError.message,
        details: directError.details,
        hint: directError.hint,
        code: directError.code
      } : null,
      allRequests,
      allRequestsError: allRequestsError ? {
        message: allRequestsError.message,
        details: allRequestsError.details,
        hint: allRequestsError.hint,
        code: allRequestsError.code
      } : null,
      insertData,
      insertError: insertError ? {
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code
      } : null,
      simpleData,
      simpleError: simpleError ? {
        message: simpleError.message,
        details: simpleError.details,
        hint: simpleError.hint,
        code: simpleError.code
      } : null,
      pendingRequests: allRequests?.filter(req => req.status?.toLowerCase() === 'pending') || [],
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : String(error) 
    });
  }
} 