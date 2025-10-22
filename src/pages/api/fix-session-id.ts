import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../supabase/config';

/**
 * API endpoint to fix a session ID that has extra characters
 * This will truncate the session ID to the standard 36 characters of a UUID
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    console.log(`Attempting to fix session ID: ${sessionId}`);
    
    // Check if the session ID is longer than 36 characters (standard UUID length)
    if (sessionId.length <= 36) {
      return res.status(400).json({ 
        error: 'Session ID does not need fixing',
        details: 'The session ID is already the correct length'
      });
    }

    // Truncate the session ID to 36 characters
    const fixedSessionId = sessionId.substring(0, 36);
    
    // Check if the fixed ID is a valid UUID
    const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(fixedSessionId);
    
    if (!isValidUuid) {
      return res.status(400).json({ 
        error: 'Invalid session ID',
        details: 'Even after truncating, the session ID is not a valid UUID'
      });
    }

    // First, check if the session exists with the original ID
    const { data: originalSession, error: findError } = await supabase
      .from('sessions')
      .select('id, code')
      .eq('id', sessionId);

    if (findError || !originalSession || originalSession.length === 0) {
      return res.status(404).json({ 
        error: 'Session not found',
        details: findError ? findError.message : 'No session found with that ID'
      });
    }

    // Now update the session with the fixed ID
    const { data: updatedSession, error: updateError } = await supabase
      .from('sessions')
      .update({ id: fixedSessionId })
      .eq('id', sessionId)
      .select();

    if (updateError) {
      return res.status(500).json({ 
        error: 'Failed to update session ID',
        details: updateError.message
      });
    }

    return res.status(200).json({
      success: true,
      originalId: sessionId,
      fixedId: fixedSessionId,
      session: updatedSession
    });
  } catch (error) {
    console.error('Error in fix-session-id API:', error);
    return res.status(500).json({
      error: 'Failed to fix session ID',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
