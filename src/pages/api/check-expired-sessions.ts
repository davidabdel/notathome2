import type { NextApiRequest, NextApiResponse } from 'next';
import { checkAndEndExpiredSessions } from '../../utils/sessionExpiration';
import { createAdminClient } from '../../utils/adminClient';

/**
 * API endpoint to check for and end expired sessions
 * This can be called by a cron job or manually to ensure sessions are properly ended after 24 hours
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check for API key in header for security
    const apiKey = req.headers['x-api-key'];
    const configuredApiKey = process.env.SESSION_EXPIRATION_API_KEY;
    
    // If API key is configured, require it
    if (configuredApiKey && apiKey !== configuredApiKey) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Check and end expired sessions
    const endedCount = await checkAndEndExpiredSessions();
    
    // Return success response
    return res.status(200).json({
      success: true,
      message: `Checked for expired sessions. Ended ${endedCount} sessions.`,
      endedCount
    });
  } catch (error) {
    console.error('Error in check-expired-sessions API:', error);
    return res.status(500).json({
      error: 'Failed to check for expired sessions',
      details: error instanceof Error ? error.message : String(error)
    });
  }
} 