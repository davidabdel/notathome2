import { NextApiRequest, NextApiResponse } from 'next';
import { setupExpirationChecker } from '../../utils/sessionExpiration';

// This is a placeholder API route to set up the session expiration checker on the server side
// In a production environment, you would use a cron job or a scheduled task instead

let cleanupFunction: (() => void) | null = null;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action } = req.body;

    if (action === 'start') {
      // Clean up any existing checker
      if (cleanupFunction) {
        cleanupFunction();
      }

      // Set up a new checker that runs every 15 minutes
      cleanupFunction = setupExpirationChecker(15);

      return res.status(200).json({
        success: true,
        message: 'Session expiration checker started'
      });
    } else if (action === 'stop') {
      // Clean up the checker
      if (cleanupFunction) {
        cleanupFunction();
        cleanupFunction = null;
      }

      return res.status(200).json({
        success: true,
        message: 'Session expiration checker stopped'
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Use "start" or "stop".'
      });
    }
  } catch (error) {
    console.error('Error in setup-expiration-checker:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to set up session expiration checker',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
