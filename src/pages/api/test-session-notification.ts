import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../supabase/config';
import { sendSessionExpirationNotification } from '../../utils/sessionNotification';

/**
 * API endpoint to test session expiration notification
 * This endpoint allows testing the notification system without actually ending a session
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
    const { sessionId, isApproachingExpiration = false } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    console.log(`Looking for session with ID: ${sessionId}`);    
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
    
    // Try a direct approach to find the session
    console.log(`Looking for session with ID: ${sessionId}`);
    
    // First try with the original session ID
    const { data: sessions, error: sessionError } = await supabase
      .from('sessions')
      .select('id, code, congregation_id, is_active, created_at')
      .eq('id', originalSessionId);
    
    // If no sessions found and the ID was normalized, try with the normalized version
    let normalizedSessions = null;
    let methodUsed = 'exact';
    
    if (wasFixed && (!sessions || sessions.length === 0)) {
      console.log(`No session found with original ID. Trying normalized ID: ${normalizedSessionId}`);
      const { data, error } = await supabase
        .from('sessions')
        .select('id, code, congregation_id, is_active, created_at')
        .eq('id', normalizedSessionId);
        
      normalizedSessions = data;
      
      if (normalizedSessions && normalizedSessions.length > 0) {
        methodUsed = 'normalized';
      }
    }
    
    // If still no sessions found, try with all sessions and client-side filtering
    let filteredSession = null;
    
    if ((!sessions || sessions.length === 0) && (!normalizedSessions || normalizedSessions.length === 0)) {
      console.log(`No session found with exact or normalized ID. Trying to find by code.`);
      
      // Try to find by session code (if it looks like a code)
      if (sessionId.length <= 5 && /^\d+$/.test(sessionId)) {
        console.log(`Session ID looks like a code: ${sessionId}`);
        const { data: codeResults } = await supabase
          .from('sessions')
          .select('id, code, congregation_id, is_active, created_at')
          .eq('code', sessionId);
          
        if (codeResults && codeResults.length > 0) {
          filteredSession = codeResults[0];
          methodUsed = 'code';
        }
      }
      
      // If still not found, get all recent sessions and try to find a match
      if (!filteredSession) {
        console.log('Getting all recent sessions to find a match');
        const { data: allSessions } = await supabase
          .from('sessions')
          .select('id, code, congregation_id, is_active, created_at')
          .order('created_at', { ascending: false })
          .limit(10);
          
        if (allSessions && allSessions.length > 0) {
          // Log all sessions for debugging
          console.log('Available sessions:');
          allSessions.forEach(s => {
            console.log(`ID: ${s.id}, Code: ${s.code}`);
          });
          
          // Try to find a session with an ID that contains our sessionId
          filteredSession = allSessions.find(s => 
            s.id.toString().includes(sessionId.substring(0, Math.min(sessionId.length, 8)))
          );
          
          if (filteredSession) {
            methodUsed = 'substring';
          }
        }
      }
    }

    if (sessionError) {
      console.error('Error fetching session:', sessionError);
      return res.status(404).json({ 
        error: 'Error fetching session',
        details: sessionError.message,
        code: sessionError.code,
        hint: sessionError.hint || 'Check if the sessions table exists and the ID is valid'
      });
    }
    
    // Combine results from all search methods
    const finalSessions = sessions || normalizedSessions || (filteredSession ? [filteredSession] : null);
    let finalSessionId = originalSessionId;
    
    if (methodUsed === 'normalized') {
      finalSessionId = normalizedSessionId;
    } else if (methodUsed === 'code' || methodUsed === 'substring') {
      finalSessionId = filteredSession?.id || originalSessionId;
    }
    
    console.log(`Search method used: ${methodUsed}, Found sessions: ${finalSessions ? finalSessions.length : 0}`);
    
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
        error: 'Session not found',
        details: 'The specified session ID does not exist',
        originalId: originalSessionId,
        normalizedId: wasFixed ? normalizedSessionId : undefined,
        wasNormalized: wasFixed,
        searchMethods: {
          exact: { tried: true, found: sessions && sessions.length > 0 },
          normalized: { tried: wasFixed, found: normalizedSessions && normalizedSessions.length > 0 },
          code: { tried: sessionId.length <= 5, found: methodUsed === 'code' },
          substring: { tried: true, found: methodUsed === 'substring' }
        },
        availableSessions: !listError ? availableSessions : undefined,
        listError: listError ? listError.message : undefined
      });
    }
    
    if (finalSessions.length > 1) {
      console.log('Multiple sessions found with that ID (unusual):', finalSessions);
      return res.status(400).json({
        error: 'Multiple sessions found',
        details: 'Multiple sessions were found with the same ID, which should not happen',
        sessions: finalSessions.map((s: { id: string; code: string }) => ({ id: s.id, code: s.code })),
        originalId: originalSessionId,
        normalizedId: wasFixed ? normalizedSessionId : undefined,
        wasNormalized: wasFixed,
        searchMethod: methodUsed
      });
    }
    
    // We have exactly one session
    const session = finalSessions[0];
    

    // Log the session data before sending notification
    console.log('Found session:', {
      id: session.id,
      code: session.code,
      congregation_id: session.congregation_id,
      is_active: session.is_active,
      created_at: session.created_at
    });
    
    // Send the notification - use the actual session ID from the database
    // This ensures we're using the correct ID format
    const actualSessionId = session.id;
    
    console.log(`Sending ${isApproachingExpiration ? 'approaching expiration' : 'expiration'} notification for session ${actualSessionId}`);
    console.log(`Original input ID: ${sessionId}${wasFixed ? `, normalized to: ${normalizedSessionId}` : ''}`);
    
    const notificationSent = await sendSessionExpirationNotification(actualSessionId, isApproachingExpiration);

    if (notificationSent) {
      return res.status(200).json({
        success: true,
        message: `Test ${isApproachingExpiration ? 'approaching expiration' : 'expiration'} notification sent successfully`,
        sessionId: actualSessionId,
        originalSessionId: sessionId,
        wasNormalized: wasFixed,
        normalizedSessionId: wasFixed ? normalizedSessionId : undefined,
        searchMethod: methodUsed,
        searchMethods: {
          exact: { tried: true, found: sessions && sessions.length > 0 },
          normalized: { tried: wasFixed, found: normalizedSessions && normalizedSessions.length > 0 },
          code: { tried: sessionId.length <= 5, found: methodUsed === 'code' },
          substring: { tried: true, found: methodUsed === 'substring' }
        },
        sessionCode: session.code,
        notificationType: isApproachingExpiration ? 'approaching_expiration' : 'expired'
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Failed to send test notification',
        sessionId: actualSessionId,
        originalSessionId: sessionId,
        wasNormalized: wasFixed,
        normalizedSessionId: wasFixed ? normalizedSessionId : undefined,
        searchMethod: methodUsed,
        sessionCode: session.code,
        reason: 'Check server logs for details'
      });
    }
  } catch (error) {
    console.error('Error in test-session-notification API:', error);
    return res.status(500).json({
      error: 'Failed to send test notification',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
