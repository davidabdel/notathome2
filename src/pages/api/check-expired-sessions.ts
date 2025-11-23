import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../utils/adminClient';
import { endSession } from '../../utils/session';
import { sendExpiredSessionNotification } from '../../utils/email';

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

    console.log('Checking for expired sessions via API...');

    // Use admin client to bypass RLS
    const supabaseAdmin = createAdminClient();

    // Get current time
    const now = new Date();

    // Find all active sessions that have expired
    // We need to join with congregations to get the notification email
    const { data: expiredSessions, error } = await supabaseAdmin
      .from('sessions')
      .select(`
        id, 
        code, 
        created_at, 
        expires_at, 
        map_number, 
        congregation_id,
        congregations (
          name,
          notification_email
        )
      `)
      .eq('is_active', true)
      .lt('expires_at', now.toISOString());

    if (error) {
      console.error('Error fetching expired sessions:', error);
      throw error;
    }

    if (!expiredSessions || expiredSessions.length === 0) {
      console.log('No expired sessions found');
      return res.status(200).json({
        success: true,
        message: 'No expired sessions found',
        endedCount: 0
      });
    }

    console.log(`Found ${expiredSessions.length} expired sessions to end`);

    // End each expired session
    let endedCount = 0;
    for (const session of expiredSessions) {
      console.log(`Processing expired session: ${session.id} (Code: ${session.code})`);

      // Check if we need to send a notification
      // @ts-ignore - Supabase types might not be fully up to date with the join
      const rawCongregation = session.congregations;
      const congregation = Array.isArray(rawCongregation) ? rawCongregation[0] : rawCongregation;

      if (congregation && congregation.notification_email) {
        console.log(`Sending notification to ${congregation.notification_email}`);

        try {
          // Fetch addresses for this session to include in the email
          const { data: addresses, error: addrError } = await supabaseAdmin
            .from('not_at_home_addresses')
            .select('*')
            .eq('session_id', session.id)
            .order('block_number', { ascending: true });

          if (addrError) {
            console.error('Error fetching addresses for notification:', addrError);
          }

          // Send email
          await sendExpiredSessionNotification(
            congregation.notification_email,
            congregation.name || 'Unknown Congregation',
            session.code,
            session.map_number || 'N/A',
            addresses || []
          );
          console.log('Notification email sent successfully');
        } catch (emailErr) {
          console.error('Error sending notification email:', emailErr);
          // Continue with ending the session even if email fails
        }
      } else {
        console.log('No notification email configured for this congregation');
      }

      // Pass the admin client to endSession to ensure we have permissions to delete
      const success = await endSession(session.id, supabaseAdmin);
      if (success) {
        endedCount++;
        console.log(`Successfully ended session ${session.id}`);
      } else {
        console.error(`Failed to end session ${session.id}`);
      }
    }

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