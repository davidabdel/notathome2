import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../supabase/config';

/**
 * API endpoint to check if a session exists
 * This is a simple debugging tool to verify if a session exists in the database
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Allow both GET and POST requests
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get session ID from query or body
    const sessionId = req.method === 'GET' 
      ? req.query.sessionId as string
      : req.body.sessionId;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    console.log(`Checking if session exists with ID: ${sessionId}`);
    
    // Log the Supabase URL to verify we're connecting to the right database
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    console.log(`Using Supabase URL: ${supabaseUrl}`);
    
    // Check if the session ID has extra characters (longer than 36 chars)
    let normalizedSessionId = sessionId;
    const originalSessionId = sessionId;
    let wasFixed = false;
    
    if (sessionId.length > 36) {
      // Try to normalize it by taking only the first 36 characters
      normalizedSessionId = sessionId.substring(0, 36);
      wasFixed = true;
      console.log(`Session ID appears to have extra characters. Original: ${sessionId}, Normalized: ${normalizedSessionId}`);
    }
    
    // First try with the original session ID
    const { data: sessions, error: sessionError } = await supabase
      .from('sessions')
      .select('id, code, congregation_id, is_active, created_at, expires_at')
      .eq('id', originalSessionId);
      
    // If no sessions found and the ID was normalized, try with the normalized version
    let normalizedSessions = null;
    let normalizedError = null;
    
    if (wasFixed && (!sessions || sessions.length === 0)) {
      console.log(`No session found with original ID. Trying normalized ID: ${normalizedSessionId}`);
      const result = await supabase
        .from('sessions')
        .select('id, code, congregation_id, is_active, created_at, expires_at')
        .eq('id', normalizedSessionId);
        
      normalizedSessions = result.data;
      normalizedError = result.error;
    }

    if (sessionError) {
      console.error('Error checking session:', sessionError);
      return res.status(500).json({ 
        error: 'Error checking session',
        details: sessionError.message,
        code: sessionError.code,
        hint: sessionError.hint || 'Check if the sessions table exists and the ID is valid'
      });
    }
    
    // Use normalized sessions if we found them that way
    const finalSessions = normalizedSessions || sessions;
    const finalError = normalizedError || sessionError;
    
    // Check if we got any sessions
    if (!finalSessions || finalSessions.length === 0) {
      console.log('No session found with that ID');
      
      // Try to list some sessions to help with debugging
      const { data: availableSessions, error: listError } = await supabase
        .from('sessions')
        .select('id, code, created_at')
        .limit(10);
      
      // Log the available session IDs for debugging
      if (availableSessions && availableSessions.length > 0) {
        console.log('Available sessions:');
        availableSessions.forEach(s => {
          console.log(`ID: ${s.id}, Code: ${s.code}, Created: ${s.created_at}`);
        });
      }
      
      return res.status(404).json({ 
        exists: false,
        error: 'Session not found',
        details: 'The specified session ID does not exist',
        originalId: originalSessionId,
        normalizedId: wasFixed ? normalizedSessionId : undefined,
        wasNormalized: wasFixed,
        availableSessions: !listError ? availableSessions : undefined,
        listError: listError ? listError.message : undefined
      });
    }
    
    // We found at least one session
    const session = finalSessions[0];
    
    // Check if the session has a congregation
    const { data: congregation, error: congregationError } = await supabase
      .from('congregations')
      .select('id, name, notification_email')
      .eq('id', session.congregation_id)
      .single();
    
    return res.status(200).json({
      exists: true,
      session: {
        id: session.id,
        code: session.code,
        is_active: session.is_active,
        created_at: session.created_at,
        expires_at: session.expires_at
      },
      congregation: congregationError ? null : congregation,
      congregationError: congregationError ? congregationError.message : null,
      multipleResults: finalSessions.length > 1,
      originalId: originalSessionId,
      normalizedId: wasFixed ? normalizedSessionId : undefined,
      wasNormalized: wasFixed,
      idUsed: wasFixed && normalizedSessions ? normalizedSessionId : originalSessionId
    });
  } catch (error) {
    console.error('Error in check-session API:', error);
    return res.status(500).json({
      error: 'Failed to check session',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
