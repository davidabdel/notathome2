import { supabase } from '../../supabase/config';
import { endSession } from './session';

/**
 * Checks for and ends any sessions that have been active for more than 24 hours
 * @returns Promise<number> The number of sessions that were ended
 */
export const checkAndEndExpiredSessions = async (): Promise<number> => {
  try {
    console.log('Checking for expired sessions...');
    
    // Get current time
    const now = new Date();
    
    // Find all active sessions that have expired
    const { data: expiredSessions, error } = await supabase
      .from('sessions')
      .select('id, code, created_at, expires_at')
      .eq('is_active', true)
      .lt('expires_at', now.toISOString());
    
    if (error) {
      console.error('Error fetching expired sessions:', error);
      return 0;
    }
    
    if (!expiredSessions || expiredSessions.length === 0) {
      console.log('No expired sessions found');
      return 0;
    }
    
    console.log(`Found ${expiredSessions.length} expired sessions to end`);
    
    // End each expired session
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