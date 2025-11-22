/**
 * Checks for and ends any sessions that have been active for more than 24 hours
 * This function now calls the API endpoint to handle the logic securely on the server
 * @returns Promise<number> The number of sessions that were ended
 */
export const checkAndEndExpiredSessions = async (): Promise<number> => {
  try {
    console.log('Calling API to check for expired sessions...');

    const response = await fetch('/api/check-expired-sessions');
    const data = await response.json();

    if (!response.ok) {
      console.error('Error calling check-expired-sessions API:', data.error);
      return 0;
    }

    console.log('API response:', data);
    return data.endedCount || 0;
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