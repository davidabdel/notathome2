import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../supabase/config';

/**
 * API endpoint to directly check if a session exists
 * This uses multiple approaches to find a session
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

    console.log(`Checking if session exists with ID: ${sessionId}`);
    
    // Try multiple approaches to find the session
    let session = null;
    
    // 1. Try exact match
    console.log('Trying exact match...');
    const { data: exactMatch, error: exactError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId);
      
    if (exactMatch && exactMatch.length > 0) {
      console.log('Found session with exact match');
      session = exactMatch[0];
    } else {
      console.log('No exact match found');
    }
    
    // 2. If session ID is longer than 36 chars, try with first 36 chars
    if (!session && sessionId.length > 36) {
      const normalizedId = sessionId.substring(0, 36);
      console.log(`Trying with normalized ID: ${normalizedId}`);
      
      const { data: normalizedMatch, error: normalizedError } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', normalizedId);
        
      if (normalizedMatch && normalizedMatch.length > 0) {
        console.log('Found session with normalized ID');
        session = normalizedMatch[0];
      } else {
        console.log('No match with normalized ID');
      }
    }
    
    // 3. Try using a raw query with LIKE if needed
    if (!session) {
      try {
        // Use a raw SQL query to find sessions that start with the given ID
        // This is a direct approach that doesn't require special functions
        const { data, error } = await supabase.rpc('find_session_by_prefix', { 
          prefix: sessionId.substring(0, Math.min(sessionId.length, 30)) 
        });
        
        if (data && data.length > 0) {
          console.log('Found session with prefix match');
          session = data[0];
        }
      } catch (err) {
        console.log('Error in prefix match, trying direct query');
        
        // Try one more approach - get all sessions and filter
        const { data: allSessions } = await supabase
          .from('sessions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);
          
        if (allSessions && allSessions.length > 0) {
          // Try to find a session with an ID that starts with our sessionId
          const matchingSession = allSessions.find(s => 
            s.id.toString().startsWith(sessionId.substring(0, Math.min(sessionId.length, 30)))
          );
          
          if (matchingSession) {
            console.log('Found session by client-side filtering');
            session = matchingSession;
          }
        }
      }
    }
    
    // Return the result
    if (session) {
      return res.status(200).json({
        exists: true,
        session: {
          id: session.id,
          code: session.code,
          created_at: session.created_at,
          expires_at: session.expires_at,
          is_active: session.is_active
        }
      });
    } else {
      // Get some available sessions to help with debugging
      const { data: availableSessions } = await supabase
        .from('sessions')
        .select('id, code, created_at')
        .order('created_at', { ascending: false })
        .limit(5);
        
      return res.status(404).json({
        exists: false,
        message: 'Session not found with any search method',
        availableSessions: availableSessions || []
      });
    }
  } catch (error) {
    console.error('Error in direct-session-check API:', error);
    return res.status(500).json({
      error: 'Failed to check session',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
