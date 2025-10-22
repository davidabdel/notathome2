import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../supabase/config';

/**
 * API endpoint to debug a specific session ID
 * This will try multiple approaches to find a session
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Get session ID from query or body
    const sessionId = req.method === 'GET' 
      ? req.query.sessionId as string
      : req.body.sessionId;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    console.log(`[DEBUG] Debugging session ID: ${sessionId}`);
    
    // Log the Supabase URL
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    console.log(`[DEBUG] Using Supabase URL: ${supabaseUrl}`);
    
    // Try multiple approaches to find the session
    const results = {
      exactMatch: null as any,
      normalizedMatch: null as any,
      likeMatch: null as any,
      startsWithMatch: null as any,
      flexibleMatch: null as any,
      errors: {} as Record<string, any>,
      allSessions: [] as any[]
    };
    
    // 1. Try exact match
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId);
      
      results.exactMatch = { data, error };
      if (error) results.errors.exactMatch = error;
      console.log(`[DEBUG] Exact match results: ${data?.length || 0} sessions found`);
    } catch (err) {
      results.errors.exactMatch = err;
      console.error('[DEBUG] Error in exact match:', err);
    }
    
    // 2. Try normalized (first 36 chars)
    if (sessionId.length > 36) {
      const normalizedId = sessionId.substring(0, 36);
      try {
        const { data, error } = await supabase
          .from('sessions')
          .select('*')
          .eq('id', normalizedId);
        
        results.normalizedMatch = { data, error, normalizedId };
        if (error) results.errors.normalizedMatch = error;
        console.log(`[DEBUG] Normalized match results: ${data?.length || 0} sessions found`);
      } catch (err) {
        results.errors.normalizedMatch = err;
        console.error('[DEBUG] Error in normalized match:', err);
      }
    }
    
    // 3. Try LIKE match with cast to text
    try {
      // Use a raw query to cast UUID to text before using LIKE
      const { data, error } = await supabase
        .rpc('find_sessions_by_id_prefix_text', { id_prefix: sessionId });
      
      results.likeMatch = { data, error };
      if (error) results.errors.likeMatch = error;
      console.log(`[DEBUG] LIKE match results: ${data?.length || 0} sessions found`);
    } catch (err) {
      results.errors.likeMatch = err;
      console.error('[DEBUG] Error in LIKE match:', err);
    }
    
    // 4. Try starts_with match
    try {
      // This is a raw SQL query using starts_with
      const { data, error } = await supabase
        .rpc('find_sessions_by_id_prefix', { id_prefix: sessionId });
      
      results.startsWithMatch = { data, error };
      if (error) results.errors.startsWithMatch = error;
      console.log(`[DEBUG] starts_with match results: ${data?.length || 0} sessions found`);
    } catch (err) {
      results.errors.startsWithMatch = err;
      console.error('[DEBUG] Error in starts_with match:', err);
    }
    
    // 5. Try flexible search function
    try {
      const { data, error } = await supabase
        .rpc('find_sessions_flexible', { search_id: sessionId });
      
      results.flexibleMatch = { data, error };
      if (error) results.errors.flexibleMatch = error;
      console.log(`[DEBUG] Flexible search results: ${data?.length || 0} sessions found`);
      
      if (data && data.length > 0) {
        console.log(`[DEBUG] Match types:`, data.map((s: { match_type: string }) => s.match_type));
      }
    } catch (err) {
      results.errors.flexibleMatch = err;
      console.error('[DEBUG] Error in flexible search:', err);
    }
    
    // 5. Get all sessions for reference
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('id, code, created_at, is_active')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (!error && data) {
        results.allSessions = data;
      }
      console.log(`[DEBUG] All sessions: ${data?.length || 0} sessions found`);
      
      // Log all session IDs for debugging
      if (data && data.length > 0) {
        console.log('[DEBUG] All session IDs:');
        data.forEach(session => {
          console.log(`[DEBUG] - ${session.id} (Code: ${session.code}, Active: ${session.is_active})`);
        });
      }
    } catch (err) {
      console.error('[DEBUG] Error fetching all sessions:', err);
    }
    
    return res.status(200).json({
      sessionId,
      results
    });
  } catch (error) {
    console.error('Error in debug-session-id API:', error);
    return res.status(500).json({
      error: 'Failed to debug session ID',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
