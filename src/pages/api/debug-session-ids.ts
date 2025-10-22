import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../supabase/config';

/**
 * API endpoint to debug session IDs
 * This will return the raw session IDs from the database for debugging
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Get all sessions
    const { data: sessions, error } = await supabase
      .from('sessions')
      .select('id, code')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ 
        error: 'Error fetching sessions',
        details: error.message
      });
    }

    // Check each session ID
    const sessionDetails = sessions?.map(session => {
      // Check if it's a valid UUID
      const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(session.id);
      
      return {
        id: session.id,
        code: session.code,
        length: session.id.length,
        isValidUuid,
        hasExtraChars: session.id.length > 36
      };
    });

    return res.status(200).json({
      sessions: sessionDetails
    });
  } catch (error) {
    console.error('Error in debug-session-ids API:', error);
    return res.status(500).json({
      error: 'Failed to debug session IDs',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
