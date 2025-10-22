import { supabase } from '../../supabase/config';
import { endSession } from './session';
import { sendSessionExpirationNotification } from './sessionNotification';

/**
 * Checks for sessions approaching expiration (23 hours old) to send notifications
 * and ends any sessions that have been active for more than 24 hours
 * @returns Promise<number> The number of sessions that were ended
 */
export const checkAndEndExpiredSessions = async (): Promise<number> => {
  // Check if we're on the client side
  if (typeof window !== 'undefined') {
    console.error('Session expiration check is not supported on the client side');
    return 0;
  }
  try {
    // Check if we're in a development environment without Supabase credentials
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.log('Skipping expired sessions check: Supabase credentials not available');
      return 0;
    }
    
    console.log('Checking for expired sessions...');
    
    // Get current time
    const now = new Date();
    
    // Calculate the 23-hour mark for notification and 24-hour mark for expiration
    const notificationThreshold = new Date(now);
    notificationThreshold.setHours(notificationThreshold.getHours() - 23);
    
    const expirationThreshold = new Date(now);
    expirationThreshold.setHours(expirationThreshold.getHours() - 24);
    
    // Find all active sessions that have expired (more than 24 hours old)
    const { data: expiredSessions, error } = await supabase
      .from('sessions')
      .select('id, code, created_at, expires_at')
      .eq('is_active', true)
      .lt('created_at', expirationThreshold.toISOString());
    
    if (error) {
      console.error('Error fetching expired sessions:', error);
      return 0;
    }
    
    if (!expiredSessions || expiredSessions.length === 0) {
      console.log('No expired sessions found');
      return 0;
    }
    
    console.log(`Found ${expiredSessions.length} expired sessions to end`);
    
    // Check for sessions approaching expiration (23 hours old) to send notifications
    const { data: approachingExpirationSessions, error: notificationError } = await supabase
      .from('sessions')
      .select('id, code, created_at, expires_at')
      .eq('is_active', true)
      .lt('created_at', notificationThreshold.toISOString())
      .gt('created_at', expirationThreshold.toISOString());
    
    if (notificationError) {
      console.error('Error fetching sessions approaching expiration:', notificationError);
    } else if (approachingExpirationSessions && approachingExpirationSessions.length > 0) {
      console.log(`Found ${approachingExpirationSessions.length} sessions approaching expiration (23 hours old)`);  
      
      // Send notifications for sessions approaching expiration
      for (const session of approachingExpirationSessions) {
        console.log(`Sending notification for session approaching expiration: ${session.id} (Code: ${session.code}, Created: ${new Date(session.created_at).toLocaleString()}, Expires in ~1 hour)`);  
        
        try {
          await sendSessionExpirationNotification(session.id, true); // true = approaching expiration
        } catch (notifError) {
          console.error(`Error sending notification for session ${session.id}:`, notifError);
        }
      }
    } else {
      console.log('No sessions approaching expiration');
    }
    
    // End each expired session (24+ hours old)
    let endedCount = 0;
    for (const session of expiredSessions) {
      console.log(`Ending expired session: ${session.id} (Code: ${session.code}, Created: ${new Date(session.created_at).toLocaleString()}, Expired: ${new Date(session.expires_at).toLocaleString()})`);
      
      const success = await endSession(session.id);
      if (success) {
        endedCount++;
        console.log(`Successfully ended session ${session.id}`);
      } else {
        console.error(`Failed to end session ${session.id}`);
      }
    }
    
    console.log(`Ended ${endedCount} expired sessions`);
    return endedCount;
  } catch (err) {
    console.error('Error in checkAndEndExpiredSessions:', err);
    return 0;
  }
};

/**
 * Sets up a timer to periodically check for and end expired sessions
 * @param intervalMinutes How often to check for expired sessions (in minutes)
 * @returns A function to clear the interval when needed
 */
export const setupExpirationChecker = (intervalMinutes: number = 60): () => void => {
  // Check if we're on the client side
  if (typeof window !== 'undefined') {
    console.log('Session expiration checker is not supported on the client side');
    return () => {}; // Return empty cleanup function
  }
  // Check if we're in a development environment without Supabase credentials
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.log('Session expiration checker disabled: Supabase credentials not available');
    return () => {}; // Return empty cleanup function
  }
  
  console.log(`Setting up session expiration checker to run every ${intervalMinutes} minutes`);
  
  // Run immediately on startup
  checkAndEndExpiredSessions().catch(err => {
    console.error('Error in initial expiration check:', err);
  });
  
  // Then set up interval
  const intervalId = setInterval(() => {
    checkAndEndExpiredSessions().catch(err => {
      console.error('Error in scheduled expiration check:', err);
    });
  }, intervalMinutes * 60 * 1000);
  
  // Return a function to clear the interval
  return () => {
    console.log('Clearing session expiration checker interval');
    clearInterval(intervalId);
  };
}; 