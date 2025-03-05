import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with admin privileges
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sessionId } = req.body;

  if (!sessionId) {
    return res.status(400).json({ error: 'Session ID is required' });
  }

  try {
    // Get session data
    const { data: sessionData, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('*, congregations(id, name)')
      .eq('id', sessionId)
      .single();

    if (sessionError) {
      return res.status(500).json({ 
        error: 'Error fetching session data', 
        details: sessionError 
      });
    }

    if (!sessionData) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Get maps for this congregation
    const { data: mapsData, error: mapsError } = await supabaseAdmin
      .from('territory_maps')
      .select('*')
      .eq('congregation_id', sessionData.congregation_id);

    if (mapsError) {
      return res.status(500).json({ 
        error: 'Error fetching maps data', 
        details: mapsError 
      });
    }

    // Get files from storage
    const { data: filesData, error: filesError } = await supabaseAdmin
      .storage
      .from('maps')
      .list();

    if (filesError) {
      return res.status(500).json({ 
        error: 'Error fetching files data', 
        details: filesError 
      });
    }

    return res.status(200).json({
      success: true,
      session: sessionData,
      maps: mapsData,
      files: filesData
    });
  } catch (error) {
    console.error('Error in debug-maps:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to debug maps',
      details: error instanceof Error ? error.message : String(error)
    });
  }
} 